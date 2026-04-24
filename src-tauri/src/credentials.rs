use std::fs;
use std::path::PathBuf;

#[cfg(target_os = "linux")]
use base64::Engine;

use crate::paths::{active_credentials_file, configs_dir, credentials_dir};

const KEYRING_SERVICE: &str = "claude-code";
const ACTIVE_KEYCHAIN_SERVICE: &str = "Claude Code-credentials";

/// Read the active account's credentials JSON.
///
/// Mirrors `claude_swap.switcher._read_credentials`:
/// - macOS: Keychain `Claude Code-credentials`
/// - Windows/Linux/WSL: file `~/.claude/.credentials.json`
pub fn read_active() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let entry = keyring::Entry::new(ACTIVE_KEYCHAIN_SERVICE, &whoami_user()).ok()?;
        return entry.get_password().ok();
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = ACTIVE_KEYCHAIN_SERVICE;
        let path = active_credentials_file();
        fs::read_to_string(&path).ok()
    }
}

/// Write credentials to the *active* Claude Code location.
///
/// Mirrors `claude_swap.switcher._write_credentials`.
pub fn write_active(credentials: &str) -> anyhow::Result<()> {
    #[cfg(target_os = "macos")]
    {
        let entry = keyring::Entry::new(ACTIVE_KEYCHAIN_SERVICE, &whoami_user())?;
        entry.set_password(credentials)?;
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = ACTIVE_KEYCHAIN_SERVICE;
        let path = active_credentials_file();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        atomic_write(&path, credentials.as_bytes())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&path)?.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&path, perms)?;
        }
        Ok(())
    }
}

/// Read the backup credentials for a given account slot.
///
/// Mirrors `claude_swap.switcher._read_account_credentials`:
/// - macOS/Windows: keyring service `claude-code`, user `account-{N}-{email}`
/// - Linux: file `~/.claude-swap-backup/credentials/.creds-{N}-{email}.enc`
///   (base64-encoded JSON)
pub fn read_account(account_num: &str, email: &str) -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        let path = credentials_dir().join(format!(".creds-{account_num}-{email}.enc"));
        let encoded = fs::read_to_string(&path).ok()?;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(encoded.trim())
            .ok()?;
        return String::from_utf8(decoded).ok();
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = credentials_dir;
        let username = format!("account-{account_num}-{email}");
        let entry = keyring::Entry::new(KEYRING_SERVICE, &username).ok()?;
        entry.get_password().ok()
    }
}

/// Write credentials to the backup for an account slot. Used both when adding
/// a new account and when persisting refreshed oauth tokens.
pub fn write_account(account_num: &str, email: &str, credentials: &str) -> anyhow::Result<()> {
    #[cfg(target_os = "linux")]
    {
        let dir = credentials_dir();
        fs::create_dir_all(&dir)?;
        let path = dir.join(format!(".creds-{account_num}-{email}.enc"));
        let encoded = base64::engine::general_purpose::STANDARD.encode(credentials.as_bytes());
        fs::write(&path, encoded)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&path)?.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&path, perms)?;
        }
        return Ok(());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let username = format!("account-{account_num}-{email}");
        let entry = keyring::Entry::new(KEYRING_SERVICE, &username)?;
        entry.set_password(credentials)?;
        Ok(())
    }
}

/// Delete the backup credentials for an account slot.
pub fn delete_account(account_num: &str, email: &str) -> anyhow::Result<()> {
    #[cfg(target_os = "linux")]
    {
        let path = credentials_dir().join(format!(".creds-{account_num}-{email}.enc"));
        if path.exists() {
            fs::remove_file(&path)?;
        }
        return Ok(());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let username = format!("account-{account_num}-{email}");
        match keyring::Entry::new(KEYRING_SERVICE, &username) {
            Ok(entry) => {
                let _ = entry.delete_credential();
            }
            Err(_) => {}
        }
        Ok(())
    }
}

fn config_backup_path(account_num: &str, email: &str) -> PathBuf {
    configs_dir().join(format!(".claude-config-{account_num}-{email}.json"))
}

pub fn read_account_config(account_num: &str, email: &str) -> Option<String> {
    fs::read_to_string(config_backup_path(account_num, email)).ok()
}

pub fn write_account_config(account_num: &str, email: &str, config: &str) -> anyhow::Result<()> {
    let dir = configs_dir();
    fs::create_dir_all(&dir)?;
    let path = config_backup_path(account_num, email);
    atomic_write(&path, config.as_bytes())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&path)?.permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&path, perms)?;
    }
    Ok(())
}

pub fn delete_account_config(account_num: &str, email: &str) -> anyhow::Result<()> {
    let path = config_backup_path(account_num, email);
    if path.exists() {
        fs::remove_file(&path)?;
    }
    Ok(())
}

/// Atomic write via tempfile + rename. Matches the pattern in
/// `claude_swap.switcher._write_credentials` / `_write_json`.
pub fn atomic_write(path: &std::path::Path, bytes: &[u8]) -> std::io::Result<()> {
    let parent = path
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."));
    fs::create_dir_all(parent)?;
    let tmp = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("tmp"),
        std::process::id(),
    ));
    fs::write(&tmp, bytes)?;
    fs::rename(&tmp, path)?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn whoami_user() -> String {
    std::env::var("USER").unwrap_or_else(|_| "user".to_string())
}
