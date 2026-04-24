use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt as _;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::claude_config;
use crate::credentials;
use crate::sequence::{self, SequenceError};
use crate::settings::Settings;
use crate::switcher;
use crate::token_stats;
use crate::types::{AccountDto, AccountsSnapshot};
use crate::usage::{self, UsageState};

#[tauri::command]
pub async fn list_accounts() -> Result<AccountsSnapshot, String> {
    let active = claude_config::active_identity();
    let no_active_login = active.is_none();
    let token_totals = token_stats::collect_token_totals();

    let seq = match sequence::load() {
        Ok(s) => s,
        Err(SequenceError::NotFound) => {
            return Ok(AccountsSnapshot {
                accounts: vec![],
                active_email: active.as_ref().map(|a| a.email_address.clone()),
                active_slot: None,
                token_totals,
                empty: true,
                no_active_login,
            });
        }
        Err(e) => return Err(e.to_string()),
    };

    let active_email = active.as_ref().map(|a| a.email_address.clone());
    let active_org_uuid = active
        .as_ref()
        .map(|a| a.organization_uuid.clone())
        .unwrap_or_default();

    let mut entries: Vec<(u32, String, String, String, bool)> =
        Vec::with_capacity(seq.accounts.len());
    let order: Vec<u32> = if seq.sequence.is_empty() {
        seq.accounts.keys().filter_map(|k| k.parse().ok()).collect()
    } else {
        seq.sequence.clone()
    };
    for slot in order {
        let key = slot.to_string();
        let Some(record) = seq.accounts.get(&key) else {
            continue;
        };
        let is_active = active_email.as_deref() == Some(record.email.as_str())
            && record.organization_uuid == active_org_uuid;
        entries.push((
            slot,
            record.email.clone(),
            record.organization_name.clone(),
            record.organization_uuid.clone(),
            is_active,
        ));
    }

    let mut by_slot = std::collections::HashMap::new();
    for (idx, (slot, email, _, _, is_active)) in entries.iter().enumerate() {
        if idx > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(700)).await;
        }

        let creds = if *is_active {
            credentials::read_active().unwrap_or_default()
        } else {
            credentials::read_account(&slot.to_string(), email).unwrap_or_default()
        };
        let usage_state = if creds.is_empty() {
            UsageState::NoCredentials
        } else {
            usage::fetch_for_account(&slot.to_string(), email, &creds, *is_active, false).await
        };
        by_slot.insert(*slot, usage_state);
    }

    let mut active_slot = None;
    let accounts: Vec<AccountDto> = entries
        .into_iter()
        .map(|(slot, email, org_name, org_uuid, is_active)| {
            if is_active {
                active_slot = Some(slot);
            }
            AccountDto {
                slot,
                email,
                organization_name: org_name,
                organization_uuid: org_uuid,
                is_active,
                usage: by_slot.remove(&slot).unwrap_or(UsageState::NoCredentials),
            }
        })
        .collect();

    Ok(AccountsSnapshot {
        accounts,
        active_email,
        active_slot,
        token_totals,
        empty: false,
        no_active_login,
    })
}

/// Refresh usage for a single account (used by the per-card refresh button).
#[tauri::command]
pub async fn refresh_usage(slot: u32) -> Result<UsageState, String> {
    let seq = sequence::load_or_empty();
    let key = slot.to_string();
    let record = seq
        .accounts
        .get(&key)
        .ok_or_else(|| format!("account {slot} not found"))?;
    let email = record.email.clone();
    let is_active = claude_config::active_identity()
        .map(|id| id.email_address == email && id.organization_uuid == record.organization_uuid)
        .unwrap_or(false);

    let creds = if is_active {
        credentials::read_active().unwrap_or_default()
    } else {
        credentials::read_account(&key, &email).unwrap_or_default()
    };
    if creds.is_empty() {
        return Ok(UsageState::NoCredentials);
    }
    Ok(usage::fetch_for_account(&key, &email, &creds, is_active, true).await)
}

#[tauri::command]
pub async fn switch_next() -> Result<String, String> {
    tokio::task::spawn_blocking(switcher::switch_next)
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn switch_to(identifier: String) -> Result<String, String> {
    let seq = sequence::load_or_empty();
    let slot = switcher::resolve_identifier(&seq, &identifier)
        .ok_or_else(|| format!("no account matches identifier '{identifier}'"))?;
    tokio::task::spawn_blocking(move || switcher::switch_to(&slot))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_current_account() -> Result<u32, String> {
    tokio::task::spawn_blocking(switcher::add_current)
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_account(identifier: String) -> Result<(), String> {
    let seq = sequence::load_or_empty();
    let slot = switcher::resolve_identifier(&seq, &identifier)
        .ok_or_else(|| format!("no account matches identifier '{identifier}'"))?;
    tokio::task::spawn_blocking(move || switcher::remove(&slot))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    use tauri_plugin_store::StoreExt as _;
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    let value = store.get("settings");
    let parsed: Option<Settings> = value.and_then(|v| serde_json::from_value(v.clone()).ok());
    Ok(parsed.unwrap_or_default())
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    use tauri_plugin_store::StoreExt as _;
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    let value = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    store.set("settings", value);
    store.save().map_err(|e| e.to_string())?;

    // Apply autostart immediately.
    let manager = app.autolaunch();
    let currently = manager.is_enabled().unwrap_or(false);
    if settings.autostart && !currently {
        let _ = manager.enable();
    } else if !settings.autostart && currently {
        let _ = manager.disable();
    }

    // Re-register hotkey.
    apply_hotkey(&app, &settings.hotkey).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn apply_hotkey(app: &AppHandle, spec: &str) -> anyhow::Result<()> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    if spec.trim().is_empty() {
        return Ok(());
    }
    let shortcut: Shortcut = spec.parse()?;
    let app_handle = app.clone();
    gs.on_shortcut(shortcut, move |_app, _sc, _evt| {
        let app_handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let result = tokio::task::spawn_blocking(switcher::switch_next).await;
            match result {
                Ok(Ok(email)) => {
                    if let Some(w) = app_handle.get_webview_window("main") {
                        use tauri::Emitter as _;
                        let _ = w.emit(
                            "cswap://action-result",
                            serde_json::json!({
                                "ok": true,
                                "action": "switch_next",
                                "email": email,
                            }),
                        );
                    }
                }
                Ok(Err(e)) => tracing::warn!("hotkey switch_next failed: {e:?}"),
                Err(e) => tracing::warn!("hotkey join error: {e:?}"),
            }
        });
    })?;
    Ok(())
}
