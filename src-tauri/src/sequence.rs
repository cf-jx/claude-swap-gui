use std::collections::BTreeMap;
use std::fs;

use serde::{Deserialize, Serialize};

use crate::paths::sequence_file;

/// Mirror of the JSON written by `claude_swap.switcher.add_account`
/// (`switcher.py:680`). Field names match the on-disk JSON exactly.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SequenceFile {
    #[serde(default, rename = "activeAccountNumber")]
    pub active_account_number: Option<u32>,
    #[serde(default, rename = "lastUpdated")]
    pub last_updated: Option<String>,
    #[serde(default)]
    pub sequence: Vec<u32>,
    /// Keyed by account number as string.
    #[serde(default)]
    pub accounts: BTreeMap<String, AccountRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AccountRecord {
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub uuid: String,
    #[serde(default, rename = "organizationUuid")]
    pub organization_uuid: String,
    #[serde(default, rename = "organizationName")]
    pub organization_name: String,
    #[serde(default)]
    pub added: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum SequenceError {
    #[error("sequence.json not found (run `cswap --add-account` first)")]
    NotFound,
    #[error("read error: {0}")]
    Io(#[from] std::io::Error),
    #[error("parse error: {0}")]
    Parse(#[from] serde_json::Error),
}

/// Load ~/.claude-swap-backup/sequence.json. Returns NotFound when the file
/// does not exist (fresh install, no managed accounts).
pub fn load() -> Result<SequenceFile, SequenceError> {
    let path = sequence_file();
    if !path.exists() {
        return Err(SequenceError::NotFound);
    }
    let text = fs::read_to_string(&path)?;
    let parsed: SequenceFile = serde_json::from_str(&text)?;
    Ok(parsed)
}

/// Try to load; an empty SequenceFile is returned when the file doesn't exist.
pub fn load_or_empty() -> SequenceFile {
    match load() {
        Ok(s) => s,
        Err(SequenceError::NotFound) => SequenceFile::default(),
        Err(e) => {
            tracing::warn!("failed to load sequence.json: {e:?}");
            SequenceFile::default()
        }
    }
}
