use std::path::PathBuf;

/// Base backup dir used by claude-swap: ~/.claude-swap-backup
pub fn backup_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".claude-swap-backup")
}

pub fn sequence_file() -> PathBuf {
    backup_dir().join("sequence.json")
}

pub fn configs_dir() -> PathBuf {
    backup_dir().join("configs")
}

pub fn credentials_dir() -> PathBuf {
    backup_dir().join("credentials")
}

/// Global Claude Code config (mirrors claude_swap.paths.get_global_config_path).
/// On all supported platforms this is ~/.claude.json.
pub fn claude_config() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".claude.json")
}

/// Active-account credentials file on Linux/Windows. macOS uses keychain.
pub fn active_credentials_file() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".claude")
        .join(".credentials.json")
}

/// Claude Code project session logs live under ~/.claude/projects.
pub fn claude_projects_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".claude")
        .join("projects")
}
