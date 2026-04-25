use std::fs;
use std::path::{Path, PathBuf};

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
/// - Windows: Python keyring targets `claude-code` / `account-{N}-{email}@claude-code`
/// - macOS: keyring service `claude-code`, user `account-{N}-{email}`
/// - Linux: file `~/.claude-swap-backup/credentials/.creds-{N}-{email}.enc`
///   (base64-encoded JSON)
///
/// Older GUI builds used Rust keyring's default Windows target
/// `account-{N}-{email}.claude-code`; migrated installs can also have
/// file-backed credentials, so both remain read fallbacks.
pub fn read_account(account_num: &str, email: &str) -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        return read_account_file_backup(account_num, email);
    }

    #[cfg(target_os = "windows")]
    {
        let username = account_keyring_username(account_num, email);
        return read_windows_python_keyring(&username)
            .or_else(|| read_rust_keyring(&username))
            .or_else(|| read_account_file_backup(account_num, email));
    }

    #[cfg(all(not(target_os = "linux"), not(target_os = "windows")))]
    {
        let username = account_keyring_username(account_num, email);
        return read_rust_keyring(&username)
            .or_else(|| read_account_file_backup(account_num, email));
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

    #[cfg(target_os = "windows")]
    {
        let username = account_keyring_username(account_num, email);
        write_windows_python_keyring(&username, credentials)?;
        Ok(())
    }

    #[cfg(all(not(target_os = "linux"), not(target_os = "windows")))]
    {
        let username = account_keyring_username(account_num, email);
        let entry = keyring::Entry::new(KEYRING_SERVICE, &username)?;
        entry.set_password(credentials)?;
        Ok(())
    }
}

/// Delete the backup credentials for an account slot.
pub fn delete_account(account_num: &str, email: &str) -> anyhow::Result<()> {
    #[cfg(target_os = "linux")]
    {
        delete_account_file_backup(account_num, email)?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        let username = account_keyring_username(account_num, email);
        delete_windows_python_keyring(&username);
        delete_rust_keyring(&username);
        delete_account_file_backup(account_num, email)?;
        Ok(())
    }

    #[cfg(all(not(target_os = "linux"), not(target_os = "windows")))]
    {
        let username = account_keyring_username(account_num, email);
        delete_rust_keyring(&username);
        delete_account_file_backup(account_num, email)?;
        Ok(())
    }
}

fn account_keyring_username(account_num: &str, email: &str) -> String {
    format!("account-{account_num}-{email}")
}

#[cfg(target_os = "windows")]
pub fn discover_account_usernames() -> Vec<String> {
    discover_windows_account_usernames()
}

#[cfg(not(target_os = "windows"))]
pub fn discover_account_usernames() -> Vec<String> {
    Vec::new()
}

#[cfg(not(target_os = "linux"))]
fn read_rust_keyring(username: &str) -> Option<String> {
    let credentials = keyring::Entry::new(KEYRING_SERVICE, username)
        .ok()
        .and_then(|entry| entry.get_password().ok())?;
    if credentials.is_empty() {
        None
    } else {
        Some(credentials)
    }
}

#[cfg(not(target_os = "linux"))]
fn delete_rust_keyring(username: &str) {
    if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, username) {
        let _ = entry.delete_credential();
    }
}

#[cfg(target_os = "windows")]
fn windows_compound_keyring_target(username: &str) -> String {
    format!("{username}@{KEYRING_SERVICE}")
}

#[cfg(target_os = "windows")]
fn read_windows_target(target: &str, username: &str) -> Option<(String, String)> {
    let entry = keyring::Entry::new_with_target(target, KEYRING_SERVICE, username).ok()?;
    let attrs = entry.get_attributes().ok()?;
    let stored_username = attrs.get("username")?.to_string();
    let credentials = entry.get_password().ok()?;
    if credentials.is_empty() {
        None
    } else {
        Some((stored_username, credentials))
    }
}

#[cfg(target_os = "windows")]
fn read_windows_python_keyring(username: &str) -> Option<String> {
    if let Some((stored_username, credentials)) = read_windows_target(KEYRING_SERVICE, username) {
        if stored_username == username {
            return Some(credentials);
        }
    }
    read_windows_target(&windows_compound_keyring_target(username), username)
        .map(|(_, credentials)| credentials)
}

#[cfg(target_os = "windows")]
fn write_windows_python_keyring(username: &str, credentials: &str) -> anyhow::Result<()> {
    if let Some((existing_username, existing_credentials)) =
        read_windows_target(KEYRING_SERVICE, username)
    {
        if existing_username != username {
            let existing_target = windows_compound_keyring_target(&existing_username);
            let existing_entry = keyring::Entry::new_with_target(
                &existing_target,
                KEYRING_SERVICE,
                &existing_username,
            )?;
            existing_entry.set_password(&existing_credentials)?;
        }
    }

    let entry = keyring::Entry::new_with_target(KEYRING_SERVICE, KEYRING_SERVICE, username)?;
    entry.set_password(credentials)?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn delete_windows_python_keyring(username: &str) {
    if let Some((stored_username, _)) = read_windows_target(KEYRING_SERVICE, username) {
        if stored_username == username {
            if let Ok(entry) =
                keyring::Entry::new_with_target(KEYRING_SERVICE, KEYRING_SERVICE, username)
            {
                let _ = entry.delete_credential();
            }
        }
    }

    let compound_target = windows_compound_keyring_target(username);
    if let Ok(entry) = keyring::Entry::new_with_target(&compound_target, KEYRING_SERVICE, username)
    {
        let _ = entry.delete_credential();
    }
}

#[cfg(target_os = "windows")]
fn discover_windows_account_usernames() -> Vec<String> {
    use std::collections::BTreeSet;
    use std::ptr;
    use windows_sys::Win32::Security::Credentials::{CredEnumerateW, CredFree, CREDENTIALW};

    let mut count = 0u32;
    let mut credentials: *mut *mut CREDENTIALW = ptr::null_mut();
    let ok = unsafe { CredEnumerateW(ptr::null(), 0, &mut count, &mut credentials) };
    if ok == 0 || credentials.is_null() {
        return Vec::new();
    }

    let mut usernames = BTreeSet::new();
    let entries = unsafe { std::slice::from_raw_parts(credentials, count as usize) };
    for credential in entries {
        if credential.is_null() {
            continue;
        }
        let credential = unsafe { &**credential };
        let target = windows_wide_ptr_to_string(credential.TargetName);
        let username = windows_wide_ptr_to_string(credential.UserName);
        if target == KEYRING_SERVICE {
            if is_account_keyring_username(&username) {
                usernames.insert(username);
            }
        } else if let Some(account) = target.strip_suffix(&format!("@{KEYRING_SERVICE}")) {
            if is_account_keyring_username(account) {
                usernames.insert(account.to_string());
            }
        } else if let Some(account) = target.strip_suffix(&format!(".{KEYRING_SERVICE}")) {
            if is_account_keyring_username(account) {
                usernames.insert(account.to_string());
            }
        }
    }

    unsafe { CredFree(credentials.cast()) };
    usernames.into_iter().collect()
}

#[cfg(target_os = "windows")]
fn windows_wide_ptr_to_string(ptr: *const u16) -> String {
    if ptr.is_null() {
        return String::new();
    }
    let len = unsafe {
        let mut len = 0usize;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        len
    };
    let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
    String::from_utf16_lossy(slice)
}

fn is_account_keyring_username(username: &str) -> bool {
    parse_account_keyring_username(username).is_some()
}

pub fn parse_account_keyring_username(username: &str) -> Option<(u32, String)> {
    let rest = username.strip_prefix("account-")?;
    let (slot, email) = rest.split_once('-')?;
    let slot = slot.parse().ok()?;
    if email.is_empty() {
        return None;
    }
    Some((slot, email.to_string()))
}

fn account_file_backup_path(account_num: &str, email: &str) -> PathBuf {
    credentials_dir().join(format!(".creds-{account_num}-{email}.enc"))
}

fn read_account_file_backup(account_num: &str, email: &str) -> Option<String> {
    read_account_file_backup_from_path(&account_file_backup_path(account_num, email))
}

fn read_account_file_backup_from_path(path: &Path) -> Option<String> {
    let encoded = fs::read_to_string(path).ok()?;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(encoded.trim())
        .ok()?;
    String::from_utf8(decoded).ok()
}

fn delete_account_file_backup(account_num: &str, email: &str) -> anyhow::Result<()> {
    let path = account_file_backup_path(account_num, email);
    if path.exists() {
        fs::remove_file(&path)?;
    }
    Ok(())
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
    let parent = path.parent().unwrap_or_else(|| std::path::Path::new("."));
    fs::create_dir_all(parent)?;
    let tmp = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name().and_then(|s| s.to_str()).unwrap_or("tmp"),
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn reads_base64_file_backup_credentials() {
        let dir = std::env::temp_dir().join(format!(
            "claude-swap-gui-credentials-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join(".creds-1-user@example.com.enc");
        let credentials = r#"{"claudeAiOauth":{"accessToken":"token"}}"#;
        let encoded = base64::engine::general_purpose::STANDARD.encode(credentials.as_bytes());
        fs::write(&path, format!("{encoded}\n")).unwrap();

        assert_eq!(
            read_account_file_backup_from_path(&path).as_deref(),
            Some(credentials)
        );

        let _ = fs::remove_file(&path);
        let _ = fs::remove_dir(&dir);
    }

    #[test]
    fn builds_account_keyring_username() {
        assert_eq!(
            account_keyring_username("2", "user@example.com"),
            "account-2-user@example.com"
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn builds_python_windows_compound_target() {
        assert_eq!(
            windows_compound_keyring_target("account-2-user@example.com"),
            "account-2-user@example.com@claude-code"
        );
    }
}
