//! Native account switch / add / remove, mirroring
//! `claude_swap.switcher` without shelling out to the CLI.
//!
//! Disk contract (sequence.json, keyring service names, file paths) is
//! byte-compatible with claude-swap so both tools operate on the same data.

use std::fs;
use std::path::Path;
use std::time::Duration;

use chrono::{Local, SecondsFormat, Utc};
use serde::Serialize;
use serde_json::Value;

use crate::credentials::{
    atomic_write, delete_account, delete_account_config, discover_account_usernames,
    parse_account_keyring_username, read_account, read_account_config, read_active, write_account,
    write_account_config, write_active,
};
use crate::lock::FileLock;
use crate::paths::{backup_dir, claude_config, sequence_file};
use crate::sequence::{self, AccountRecord, SequenceFile};

const LOCK_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Serialize)]
pub struct BackupSummary {
    pub path: String,
    pub accounts: usize,
    pub credentials: usize,
    pub configs: usize,
    pub missing_credentials: usize,
    pub missing_configs: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case", tag = "status")]
pub enum AddOutcome {
    Added { slot: u32, email: String },
    Refreshed { slot: u32, email: String },
}

#[derive(Debug, thiserror::Error)]
pub enum SwitchError {
    #[error("{0}")]
    Msg(String),
    #[error("no managed accounts yet")]
    NoAccounts,
    #[error("account {slot} does not exist")]
    AccountNotFound { slot: String },
    #[error("no active Claude Code login detected")]
    NoActiveLogin,
    #[error("slot {slot} already occupied by {email}")]
    SlotOccupied { slot: u32, email: String },
    #[error("account {email} already managed in slot {slot}")]
    AccountAlreadyExists { slot: String, email: String },
    #[error("lock: {0}")]
    Lock(#[from] crate::lock::LockError),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("other: {0}")]
    Other(#[from] anyhow::Error),
}

fn timestamp() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn lock_path() -> std::path::PathBuf {
    backup_dir().join(".lock")
}

fn ensure_backup_dirs() -> std::io::Result<()> {
    fs::create_dir_all(backup_dir())?;
    fs::create_dir_all(crate::paths::configs_dir())?;
    fs::create_dir_all(crate::paths::credentials_dir())?;
    Ok(())
}

fn read_claude_config() -> Result<Value, SwitchError> {
    let path = claude_config();
    if !path.exists() {
        return Err(SwitchError::NoActiveLogin);
    }
    let text = fs::read_to_string(&path)?;
    let value: Value = serde_json::from_str(&text)?;
    Ok(value)
}

fn write_claude_config(value: &Value) -> Result<(), SwitchError> {
    let path = claude_config();
    let text = serde_json::to_string_pretty(value)?;
    atomic_write(&path, text.as_bytes())?;
    Ok(())
}

fn write_sequence(seq: &SequenceFile) -> Result<(), SwitchError> {
    let text = serde_json::to_string_pretty(seq)?;
    atomic_write(&sequence_file(), text.as_bytes())?;
    Ok(())
}

fn parse_oauth_metadata(config_text: &str) -> (String, String, String) {
    let value: Value = serde_json::from_str(config_text).unwrap_or(Value::Null);
    let oauth = value.get("oauthAccount").and_then(|v| v.as_object());
    let account_uuid = oauth
        .and_then(|o| o.get("accountUuid"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let organization_uuid = oauth
        .and_then(|o| o.get("organizationUuid"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let organization_name = oauth
        .and_then(|o| o.get("organizationName"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    (account_uuid, organization_uuid, organization_name)
}

fn load_sequence_or_empty() -> SequenceFile {
    sequence::load_or_empty()
}

pub fn import_stored_accounts() -> Result<usize, SwitchError> {
    ensure_backup_dirs()?;
    let _lock = FileLock::acquire(&lock_path(), LOCK_TIMEOUT)?;

    let mut seq = load_sequence_or_empty();
    let active = current_identity();
    let active_config = fs::read_to_string(claude_config()).ok();
    let mut imported = 0usize;

    for username in discover_account_usernames() {
        let Some((slot_num, email)) = parse_account_keyring_username(&username) else {
            continue;
        };
        let key = slot_num.to_string();
        if seq.accounts.contains_key(&key) {
            continue;
        }

        let config_text = read_account_config(&key, &email).or_else(|| {
            let (active_email, _) = active.as_ref()?;
            if active_email == &email {
                active_config.clone()
            } else {
                None
            }
        });
        let (account_uuid, organization_uuid, organization_name) = config_text
            .as_deref()
            .map(parse_oauth_metadata)
            .unwrap_or_default();

        seq.accounts.insert(
            key,
            AccountRecord {
                email,
                uuid: account_uuid,
                organization_uuid,
                organization_name,
                added: Some(timestamp()),
            },
        );
        if !seq.sequence.contains(&slot_num) {
            seq.sequence.push(slot_num);
            seq.sequence.sort();
        }
        imported += 1;
    }

    if let Some((active_email, active_org_uuid)) = active {
        if let Some(slot) = find_slot_by_identity(&seq, &active_email, &active_org_uuid) {
            seq.active_account_number = slot.parse().ok();
        }
    }

    if imported > 0 {
        seq.last_updated = Some(timestamp());
        write_sequence(&seq)?;
    }
    Ok(imported)
}

pub fn backup_accounts(destination_dir: &str) -> Result<BackupSummary, SwitchError> {
    let destination_dir = destination_dir.trim();
    if destination_dir.is_empty() {
        return Err(SwitchError::Msg("backup destination is empty".into()));
    }

    let _ = import_stored_accounts();
    let seq = sequence::load().map_err(|e| match e {
        sequence::SequenceError::NotFound => SwitchError::NoAccounts,
        other => SwitchError::Msg(other.to_string()),
    })?;
    let active = current_identity();
    let active_config = fs::read_to_string(claude_config()).ok();

    let backup_root = std::path::PathBuf::from(destination_dir).join(format!(
        "claude-swap-backup-{}",
        Local::now().format("%Y%m%d-%H%M%S")
    ));
    let credentials_root = backup_root.join("credentials");
    let configs_root = backup_root.join("configs");
    fs::create_dir_all(&credentials_root)?;
    fs::create_dir_all(&configs_root)?;

    let sequence_text = serde_json::to_string_pretty(&seq)?;
    atomic_write(&backup_root.join("sequence.json"), sequence_text.as_bytes())?;

    let mut summary = BackupSummary {
        path: backup_root.to_string_lossy().to_string(),
        accounts: seq.accounts.len(),
        credentials: 0,
        configs: 0,
        missing_credentials: 0,
        missing_configs: 0,
    };

    for (slot, record) in &seq.accounts {
        let is_active = active
            .as_ref()
            .map(|(email, org)| email == &record.email && org == &record.organization_uuid)
            .unwrap_or(false);
        let credentials = if is_active {
            read_active()
        } else {
            read_account(slot, &record.email)
        };
        if let Some(credentials) = credentials {
            let path = credentials_root.join(format!(".creds-{slot}-{}.json", record.email));
            atomic_write(&path, credentials.as_bytes())?;
            summary.credentials += 1;
        } else {
            summary.missing_credentials += 1;
        }

        let config = read_account_config(slot, &record.email).or_else(|| {
            if is_active {
                active_config.clone()
            } else {
                None
            }
        });
        if let Some(config) = config {
            let path = configs_root.join(format!(".claude-config-{slot}-{}.json", record.email));
            atomic_write(&path, config.as_bytes())?;
            summary.configs += 1;
        } else {
            summary.missing_configs += 1;
        }
    }

    Ok(summary)
}

/// Current (email, organization_uuid) from ~/.claude.json.
fn current_identity() -> Option<(String, String)> {
    let v = read_claude_config().ok()?;
    let oauth = v.get("oauthAccount")?.as_object()?;
    let email = oauth.get("emailAddress")?.as_str()?.to_string();
    if email.is_empty() {
        return None;
    }
    let org = oauth
        .get("organizationUuid")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    Some((email, org))
}

fn find_slot_by_identity(seq: &SequenceFile, email: &str, org_uuid: &str) -> Option<String> {
    seq.accounts
        .iter()
        .find(|(_, rec)| rec.email == email && rec.organization_uuid == org_uuid)
        .map(|(k, _)| k.clone())
}

fn next_slot(seq: &SequenceFile) -> u32 {
    seq.accounts
        .keys()
        .filter_map(|k| k.parse::<u32>().ok())
        .max()
        .map(|m| m + 1)
        .unwrap_or(1)
}

/// Switch to a target slot.
///
/// Mirrors `claude_swap.switcher._perform_switch` — takes a file lock,
/// snapshots the active creds+config, applies the target, and rolls back on
/// any failure.
pub fn switch_to(target: &str) -> Result<String, SwitchError> {
    ensure_backup_dirs()?;
    let _lock = FileLock::acquire(&lock_path(), LOCK_TIMEOUT)?;

    let mut seq = sequence::load().map_err(|e| match e {
        sequence::SequenceError::NotFound => SwitchError::NoAccounts,
        other => SwitchError::Msg(other.to_string()),
    })?;

    if !seq.accounts.contains_key(target) {
        return Err(SwitchError::AccountNotFound {
            slot: target.to_string(),
        });
    }
    let target_record = seq.accounts[target].clone();
    let target_email = target_record.email.clone();

    let (current_email, current_org_uuid) = current_identity().ok_or(SwitchError::NoActiveLogin)?;
    let current_slot = find_slot_by_identity(&seq, &current_email, &current_org_uuid)
        .unwrap_or_else(|| {
            // current login not yet managed — fabricate a ghost slot so backup
            // goes nowhere and we just overwrite.
            String::new()
        });

    // Snapshot originals for rollback.
    let original_creds = read_active()
        .ok_or_else(|| SwitchError::Msg("failed to read active credentials".into()))?;
    let original_config_text = fs::read_to_string(claude_config())?;
    let original_seq_text = fs::read_to_string(sequence_file()).ok();

    let rollback = |creds: &str, config_text: &str, seq_text: &Option<String>| {
        let _ = write_active(creds);
        let _ = atomic_write(&claude_config(), config_text.as_bytes());
        if let Some(t) = seq_text.as_ref() {
            let _ = atomic_write(&sequence_file(), t.as_bytes());
        }
    };

    // Step 1 — back up the currently-active account (if it has a managed slot).
    if !current_slot.is_empty() {
        if let Err(e) = write_account(&current_slot, &current_email, &original_creds) {
            return Err(SwitchError::Msg(format!("backup creds failed: {e}")));
        }
        if let Err(e) = write_account_config(&current_slot, &current_email, &original_config_text) {
            return Err(SwitchError::Msg(format!("backup config failed: {e}")));
        }
    }

    // Step 2 — retrieve target.
    let target_creds = match read_account(target, &target_email) {
        Some(c) if !c.is_empty() => c,
        _ => {
            return Err(SwitchError::Msg(format!(
                "missing backup credentials for account {target}"
            )));
        }
    };
    let target_config_text = match read_account_config(target, &target_email) {
        Some(c) if !c.is_empty() => c,
        _ => {
            return Err(SwitchError::Msg(format!(
                "missing backup config for account {target}"
            )));
        }
    };
    let target_config_value: Value = serde_json::from_str(&target_config_text)?;
    let target_oauth = target_config_value
        .get("oauthAccount")
        .cloned()
        .ok_or_else(|| SwitchError::Msg("target config has no oauthAccount".into()))?;

    // Step 3 — write target creds to the active location.
    if let Err(e) = write_active(&target_creds) {
        rollback(&original_creds, &original_config_text, &original_seq_text);
        return Err(SwitchError::Msg(format!("activate creds failed: {e}")));
    }

    // Step 4 — splice target oauthAccount into the live config (keep all other
    // fields from the current config so nothing else in ~/.claude.json is lost).
    let mut live_config: Value = serde_json::from_str(&original_config_text)?;
    if let Some(obj) = live_config.as_object_mut() {
        obj.insert("oauthAccount".into(), target_oauth);
    }
    if let Err(e) = write_claude_config(&live_config) {
        rollback(&original_creds, &original_config_text, &original_seq_text);
        return Err(SwitchError::Msg(format!("write config failed: {e}")));
    }

    // Step 5 — update sequence.json.
    let target_num: u32 = target.parse().unwrap_or(0);
    seq.active_account_number = Some(target_num);
    seq.last_updated = Some(timestamp());
    if !seq.sequence.contains(&target_num) && target_num > 0 {
        seq.sequence.push(target_num);
        seq.sequence.sort();
    }
    if let Err(e) = write_sequence(&seq) {
        rollback(&original_creds, &original_config_text, &original_seq_text);
        return Err(SwitchError::Msg(format!("write sequence failed: {e}")));
    }

    Ok(target_email)
}

/// Rotate to the next account in the sequence. Returns the email switched to.
pub fn switch_next() -> Result<String, SwitchError> {
    let seq = load_sequence_or_empty();
    if seq.accounts.is_empty() {
        return Err(SwitchError::NoAccounts);
    }
    let ordered = if seq.sequence.is_empty() {
        let mut v: Vec<u32> = seq.accounts.keys().filter_map(|k| k.parse().ok()).collect();
        v.sort();
        v
    } else {
        seq.sequence.clone()
    };
    if ordered.len() < 2 {
        return Err(SwitchError::Msg(
            "only one account managed; add more to rotate".into(),
        ));
    }
    let active = seq.active_account_number.unwrap_or(ordered[0]);
    let idx = ordered.iter().position(|n| *n == active).unwrap_or(0);
    let next = ordered[(idx + 1) % ordered.len()];
    switch_to(&next.to_string())
}

/// Add the currently-active Claude Code account to managed accounts.
/// Returns the slot assigned. If the identity is already managed we refresh
/// its stored credentials in place (matches `claude_swap.switcher.add_account`
/// behaviour at `switcher.py:544`).
pub fn add_current() -> Result<AddOutcome, SwitchError> {
    ensure_backup_dirs()?;
    let _lock = FileLock::acquire(&lock_path(), LOCK_TIMEOUT)?;

    let (email, org_uuid) = current_identity().ok_or(SwitchError::NoActiveLogin)?;

    let creds = read_active()
        .ok_or_else(|| SwitchError::Msg("failed to read active credentials".into()))?;
    let config_text = fs::read_to_string(claude_config())?;
    let config_value: Value = serde_json::from_str(&config_text)?;
    let oauth = config_value
        .get("oauthAccount")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();
    let organization_name = oauth
        .get("organizationName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let account_uuid = oauth
        .get("accountUuid")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut seq = load_sequence_or_empty();

    // If the tracked active account differs from the current login, the user
    // ran `claude login` externally.  The old account's latest credentials in
    // ~/.claude/.credentials.json have already been overwritten — the keyring
    // backup may hold a stale (consumed) refresh token.
    if let Some(tracked_num) = seq.active_account_number {
        let tracked_key = tracked_num.to_string();
        if let Some(tracked_record) = seq.accounts.get(&tracked_key) {
            if tracked_record.email != email || tracked_record.organization_uuid != org_uuid {
                tracing::warn!(
                    "active identity changed from {} (slot {}) to {}; \
                     slot {} credentials may be stale — re-login recommended",
                    tracked_record.email,
                    tracked_key,
                    email,
                    tracked_key,
                );
            }
        }
    }

    // Existing identity → refresh in place.
    if let Some(slot) = find_slot_by_identity(&seq, &email, &org_uuid) {
        write_account(&slot, &email, &creds).map_err(SwitchError::Other)?;
        write_account_config(&slot, &email, &config_text).map_err(SwitchError::Other)?;
        let slot_num: u32 = slot.parse().unwrap_or(0);
        seq.active_account_number = Some(slot_num);
        seq.last_updated = Some(timestamp());
        write_sequence(&seq)?;
        return Ok(AddOutcome::Refreshed {
            slot: slot_num,
            email,
        });
    }

    // Fresh add.
    let slot_num = next_slot(&seq);
    let key = slot_num.to_string();
    write_account(&key, &email, &creds).map_err(SwitchError::Other)?;
    write_account_config(&key, &email, &config_text).map_err(SwitchError::Other)?;

    let record = AccountRecord {
        email: email.clone(),
        uuid: account_uuid,
        organization_uuid: org_uuid,
        organization_name,
        added: Some(timestamp()),
    };
    seq.accounts.insert(key, record);
    if !seq.sequence.contains(&slot_num) {
        seq.sequence.push(slot_num);
        seq.sequence.sort();
    }
    seq.active_account_number = Some(slot_num);
    seq.last_updated = Some(timestamp());
    write_sequence(&seq)?;
    Ok(AddOutcome::Added {
        slot: slot_num,
        email,
    })
}

/// Remove the account at `slot` from managed storage.
pub fn remove(slot: &str) -> Result<(), SwitchError> {
    ensure_backup_dirs()?;
    let _lock = FileLock::acquire(&lock_path(), LOCK_TIMEOUT)?;

    let mut seq = sequence::load().map_err(|e| match e {
        sequence::SequenceError::NotFound => SwitchError::NoAccounts,
        other => SwitchError::Msg(other.to_string()),
    })?;
    let record = seq
        .accounts
        .get(slot)
        .cloned()
        .ok_or_else(|| SwitchError::AccountNotFound {
            slot: slot.to_string(),
        })?;

    let _ = delete_account(slot, &record.email);
    let _ = delete_account_config(slot, &record.email);

    seq.accounts.remove(slot);
    let slot_num: u32 = slot.parse().unwrap_or(0);
    seq.sequence.retain(|n| *n != slot_num);
    if seq.active_account_number == Some(slot_num) {
        seq.active_account_number = None;
    }
    seq.last_updated = Some(timestamp());
    write_sequence(&seq)?;
    Ok(())
}

/// Sync the active account's credentials to the keyring backup.
///
/// Claude Code silently refreshes OAuth tokens while an account is active,
/// writing new tokens to `~/.claude/.credentials.json`. The keyring backup
/// is NOT updated during these refreshes, so a subsequent `claude login`
/// (which overwrites the active file) can leave the keyring with a stale,
/// already-consumed refresh token.
///
/// Call this periodically (e.g. when the GUI refreshes the account list) to
/// keep the keyring backup in sync with the active file.
pub fn sync_active_credentials() {
    let seq = match sequence::load() {
        Ok(s) => s,
        Err(_) => return,
    };
    let (email, org_uuid) = match current_identity() {
        Some(id) => id,
        None => return,
    };
    let slot = match find_slot_by_identity(&seq, &email, &org_uuid) {
        Some(s) => s,
        None => return,
    };
    if seq.active_account_number.map(|n| n.to_string()).as_deref() != Some(slot.as_str()) {
        return;
    }
    let creds = match read_active() {
        Some(c) if !c.is_empty() => c,
        _ => return,
    };
    let _ = write_account(&slot, &email, &creds);
    let config_text = std::fs::read_to_string(claude_config()).ok();
    if let Some(cfg) = config_text {
        let _ = write_account_config(&slot, &email, &cfg);
    }
}

/// Utility for commands: resolve "1" or "email@x" to a slot key.
pub fn resolve_identifier(seq: &SequenceFile, identifier: &str) -> Option<String> {
    if identifier.chars().all(|c| c.is_ascii_digit()) {
        if seq.accounts.contains_key(identifier) {
            return Some(identifier.to_string());
        }
        return None;
    }
    seq.accounts
        .iter()
        .find(|(_, rec)| rec.email == identifier)
        .map(|(k, _)| k.clone())
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportSummary {
    pub imported: usize,
    pub refreshed: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

pub fn import_backup(source_dir: &str) -> Result<ImportSummary, SwitchError> {
    ensure_backup_dirs()?;
    let _lock = FileLock::acquire(&lock_path(), LOCK_TIMEOUT)?;

    let backup_path = Path::new(source_dir);
    let backup_seq_text = fs::read_to_string(backup_path.join("sequence.json"))?;
    let backup_seq: SequenceFile = serde_json::from_str(&backup_seq_text)?;

    let mut seq = load_sequence_or_empty();
    let mut summary = ImportSummary {
        imported: 0,
        refreshed: 0,
        skipped: 0,
        errors: Vec::new(),
    };

    for (slot, record) in &backup_seq.accounts {
        let creds_filename = format!(".creds-{}-{}.json", slot, record.email);
        let creds_path = backup_path.join("credentials").join(&creds_filename);

        let creds = match fs::read_to_string(&creds_path) {
            Ok(c) if !c.is_empty() => c,
            Ok(_) => {
                summary.skipped += 1;
                summary.errors.push(format!(
                    "slot {slot} ({}): credentials file is empty",
                    record.email
                ));
                continue;
            }
            Err(e) => {
                summary.skipped += 1;
                summary.errors.push(format!(
                    "slot {slot} ({}): missing credentials — {e}",
                    record.email
                ));
                continue;
            }
        };

        let config_filename = format!(".claude-config-{}-{}.json", slot, record.email);
        let config_path = backup_path.join("configs").join(&config_filename);
        let config = fs::read_to_string(&config_path).unwrap_or_default();

        // Check if this account already exists in our sequence.
        if let Some(existing_slot) = find_slot_by_identity(&seq, &record.email, &record.organization_uuid) {
            // Refresh credentials in place.
            if let Err(e) = write_account(&existing_slot, &record.email, &creds) {
                summary.errors.push(format!(
                    "slot {slot} ({}): failed to write credentials — {e}",
                    record.email
                ));
                continue;
            }
            if !config.is_empty() {
                if let Err(e) = write_account_config(&existing_slot, &record.email, &config) {
                    summary.errors.push(format!(
                        "slot {slot} ({}): failed to write config — {e}",
                        record.email
                    ));
                }
            }
            summary.refreshed += 1;
        } else {
            // New account — assign next slot.
            let new_slot_num = next_slot(&seq);
            let new_key = new_slot_num.to_string();

            if let Err(e) = write_account(&new_key, &record.email, &creds) {
                summary.errors.push(format!(
                    "slot {slot} ({}): failed to write credentials — {e}",
                    record.email
                ));
                continue;
            }
            if !config.is_empty() {
                if let Err(e) = write_account_config(&new_key, &record.email, &config) {
                    summary.errors.push(format!(
                        "slot {slot} ({}): failed to write config — {e}",
                        record.email
                    ));
                }
            }

            seq.accounts.insert(
                new_key,
                AccountRecord {
                    email: record.email.clone(),
                    uuid: record.uuid.clone(),
                    organization_uuid: record.organization_uuid.clone(),
                    organization_name: record.organization_name.clone(),
                    added: Some(timestamp()),
                },
            );
            if !seq.sequence.contains(&new_slot_num) {
                seq.sequence.push(new_slot_num);
                seq.sequence.sort();
            }
            summary.imported += 1;
        }
    }

    seq.last_updated = Some(timestamp());
    write_sequence(&seq)?;

    Ok(summary)
}

// Convenience: force path import used above when PathBuf isn't otherwise used.
#[allow(dead_code)]
fn _ensure_path_import(_: &Path) {}
