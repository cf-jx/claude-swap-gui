use serde::Serialize;

use crate::token_stats::TokenTotals;
use crate::usage::UsageState;

#[derive(Debug, Clone, Serialize)]
pub struct AccountDto {
    pub slot: u32,
    pub email: String,
    pub organization_name: String,
    pub organization_uuid: String,
    pub is_active: bool,
    pub usage: UsageState,
}

#[derive(Debug, Clone, Serialize)]
pub struct AccountsSnapshot {
    pub accounts: Vec<AccountDto>,
    pub active_email: Option<String>,
    pub active_slot: Option<u32>,
    pub token_totals: TokenTotals,
    /// True when no sequence.json was found (no managed accounts yet).
    pub empty: bool,
    /// True when we detected no active Claude Code login.
    pub no_active_login: bool,
}
