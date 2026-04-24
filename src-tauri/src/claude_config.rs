use std::fs;

use serde::Deserialize;

use crate::paths::claude_config;

#[derive(Debug, Deserialize, Default)]
pub struct OauthAccount {
    #[serde(default, rename = "emailAddress")]
    pub email_address: String,
    #[serde(default, rename = "organizationUuid")]
    pub organization_uuid: String,
    #[serde(default, rename = "organizationName")]
    pub organization_name: String,
    #[serde(default, rename = "accountUuid")]
    pub account_uuid: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct ClaudeConfig {
    #[serde(default, rename = "oauthAccount")]
    pub oauth_account: OauthAccount,
}

/// Read ~/.claude.json. Returns None if the file is missing or has no
/// usable oauthAccount (user not logged in).
pub fn active_identity() -> Option<OauthAccount> {
    let path = claude_config();
    let text = fs::read_to_string(&path).ok()?;
    let parsed: ClaudeConfig = serde_json::from_str(&text).ok()?;
    if parsed.oauth_account.email_address.is_empty() {
        return None;
    }
    Some(parsed.oauth_account)
}
