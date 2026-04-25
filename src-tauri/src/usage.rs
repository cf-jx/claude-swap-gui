//! Anthropic usage API client.
//!
//! Rust port of `claude_swap.oauth` — same endpoints, same headers, same
//! refresh behaviour. The CLI stays the source of truth for on-disk state;
//! here we only read credentials and call the usage endpoint.

use chrono::{DateTime, Local, Utc};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;

use crate::credentials;

const USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";
const TOKEN_URL: &str = "https://platform.claude.com/v1/oauth/token";
const OAUTH_BETA_HEADER: &str = "oauth-2025-04-20";
const OAUTH_CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const EXPIRY_BUFFER_MS: i64 = 5 * 60 * 1000;
const USAGE_CACHE_TTL: Duration = Duration::from_secs(90);
const USER_AGENT: &str = "claude-swap-gui/0.1";

static USAGE_CACHE: Lazy<Mutex<HashMap<String, CachedUsage>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone)]
struct CachedUsage {
    state: UsageState,
    fetched_at: Instant,
}

#[derive(Debug, Clone, Serialize)]
pub struct Bucket {
    pub key: String,
    pub label: String,
    pub pct: f32,
    pub countdown: String,
    pub clock: String,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct Usage {
    pub buckets: Vec<Bucket>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum UsageState {
    Ok(Usage),
    NoCredentials,
    Unavailable { message: String },
}

#[derive(Debug, Deserialize)]
struct OauthPayload {
    #[serde(rename = "accessToken")]
    access_token: Option<String>,
    #[serde(rename = "refreshToken")]
    refresh_token: Option<String>,
    #[serde(rename = "expiresAt")]
    expires_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct CredsEnvelope {
    #[serde(rename = "claudeAiOauth")]
    claude_ai_oauth: Option<OauthPayload>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: i64,
    refresh_token: Option<String>,
    scope: Option<String>,
}

fn parse_oauth(creds: &str) -> Option<OauthPayload> {
    let envelope: CredsEnvelope = serde_json::from_str(creds).ok()?;
    envelope.claude_ai_oauth
}

fn is_expired(expires_at: Option<i64>) -> bool {
    let Some(exp) = expires_at else { return false };
    let now_ms = Utc::now().timestamp_millis();
    now_ms + EXPIRY_BUFFER_MS >= exp
}

fn format_reset(resets_at: &str) -> Option<(String, String)> {
    let reset_utc: DateTime<Utc> = resets_at.parse().ok()?;
    let now = Utc::now();
    let remaining = reset_utc - now;
    let total_seconds = remaining.num_seconds().max(0);
    let days = total_seconds / 86400;
    let hours = (total_seconds % 86400) / 3600;
    let minutes = (total_seconds % 3600) / 60;

    let countdown = if days > 0 {
        format!("{days}d {hours}h")
    } else if hours > 0 {
        format!("{hours}h {minutes}m")
    } else {
        format!("{minutes}m")
    };

    let reset_local: DateTime<Local> = reset_utc.into();
    let now_local: DateTime<Local> = now.into();
    let clock = if reset_local.date_naive() == now_local.date_naive() {
        reset_local.format("%H:%M").to_string()
    } else {
        reset_local.format("%b %-d %H:%M").to_string()
    };

    Some((countdown, clock))
}

/// Catch-all parser: any top-level field shaped like `{utilization, resets_at?}`
/// is treated as a usage bucket. We then apply a display whitelist that mirrors
/// the official `/usage` slash command — only buckets a user can interpret are
/// surfaced. Unknown internal codenames (e.g. `seven_day_omelette`) are hidden
/// since their quota already counts toward the `seven_day` total.
fn build_result(raw: serde_json::Value) -> Usage {
    let Some(map) = raw.as_object() else {
        return Usage::default();
    };
    let mut buckets: Vec<Bucket> = map
        .iter()
        .filter_map(|(key, value)| {
            let label = display_label(key)?;
            let utilization = value.get("utilization")?.as_f64()? as f32;
            let resets_at = value
                .get("resets_at")
                .and_then(|v| v.as_str())
                .map(str::to_owned);
            let (countdown, clock) = resets_at
                .as_deref()
                .and_then(format_reset)
                .unwrap_or_else(|| (String::new(), String::new()));
            Some(Bucket {
                key: key.clone(),
                label,
                pct: utilization,
                countdown,
                clock,
            })
        })
        .collect();

    buckets.sort_by(|a, b| bucket_rank(&a.key).cmp(&bucket_rank(&b.key)));
    Usage { buckets }
}

/// Sort key: 5h before 7d, base form before model-suffixed variants, then alpha.
fn bucket_rank(key: &str) -> (u8, usize, &str) {
    let prefix = if key.starts_with("five_hour") {
        0
    } else if key.starts_with("seven_day") {
        1
    } else {
        2
    };
    (prefix, key.len(), key)
}

/// Return the user-facing label for a bucket key, or `None` to hide it.
///
/// The whitelist mirrors Anthropic's official `/usage` view: session, weekly
/// (all models), and per-public-model weekly buckets (Sonnet / Opus / Haiku).
/// Internal codenames (omelette, sushi, …) are hidden — they roll up into
/// `seven_day` and surfacing them only confuses users.
fn display_label(key: &str) -> Option<String> {
    match key {
        "five_hour" => Some("5h".into()),
        "seven_day" => Some("7d".into()),
        _ => {
            if let Some(model) = key.strip_prefix("seven_day_") {
                pretty_model(model).map(|m| format!("7d · {m}"))
            } else if let Some(model) = key.strip_prefix("five_hour_") {
                pretty_model(model).map(|m| format!("5h · {m}"))
            } else {
                None
            }
        }
    }
}

/// Normalize a model suffix — only public model names pass through.
fn pretty_model(model: &str) -> Option<String> {
    match model {
        "sonnet" => Some("Sonnet".into()),
        "opus" => Some("Opus".into()),
        "haiku" => Some("Haiku".into()),
        _ => None,
    }
}

async fn request_usage(
    client: &reqwest::Client,
    access_token: &str,
) -> anyhow::Result<serde_json::Value> {
    let resp = client
        .get(USAGE_URL)
        .bearer_auth(access_token)
        .header("anthropic-beta", OAUTH_BETA_HEADER)
        .header("User-Agent", USER_AGENT)
        .send()
        .await?
        .error_for_status()?;
    Ok(resp.json().await?)
}

async fn refresh_token(client: &reqwest::Client, refresh: &str) -> anyhow::Result<TokenResponse> {
    let body = serde_json::json!({
        "grant_type": "refresh_token",
        "refresh_token": refresh,
        "client_id": OAUTH_CLIENT_ID,
    });
    let resp = client
        .post(TOKEN_URL)
        .header("User-Agent", USER_AGENT)
        .json(&body)
        .send()
        .await?
        .error_for_status()?;
    Ok(resp.json().await?)
}

/// Splice a refreshed access token back into a credentials JSON blob, so we
/// can persist the same shape claude-swap expects to read.
fn splice_refreshed(creds: &str, token: &TokenResponse) -> Option<String> {
    let mut value: serde_json::Value = serde_json::from_str(creds).ok()?;
    let oauth = value.get_mut("claudeAiOauth")?.as_object_mut()?;
    let now_ms = Utc::now().timestamp_millis();
    oauth.insert("accessToken".into(), token.access_token.clone().into());
    oauth.insert(
        "expiresAt".into(),
        (now_ms + token.expires_in * 1000).into(),
    );
    if let Some(r) = &token.refresh_token {
        oauth.insert("refreshToken".into(), r.clone().into());
    }
    if let Some(scope) = &token.scope {
        let parts: Vec<serde_json::Value> = scope
            .split_whitespace()
            .map(|s| s.to_string().into())
            .collect();
        oauth.insert("scopes".into(), serde_json::Value::Array(parts));
    }
    serde_json::to_string(&value).ok()
}

pub async fn fetch_for_account(
    account_num: &str,
    email: &str,
    credentials_json: &str,
    is_active: bool,
    force_refresh: bool,
) -> UsageState {
    let cache_key = format!("{account_num}:{email}");
    if !force_refresh {
        if let Some(cached) = cached_usage(&cache_key).await {
            return cached;
        }
    }

    let Some(mut oauth) = parse_oauth(credentials_json) else {
        return UsageState::NoCredentials;
    };
    if oauth.access_token.is_none() {
        return UsageState::NoCredentials;
    }
    let mut working_creds = credentials_json.to_string();

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return UsageState::Unavailable {
                message: format!("http client: {e}"),
            };
        }
    };

    // Mirror oauth.py:211 — only refresh non-active expired tokens proactively.
    if !is_active && oauth.refresh_token.is_some() && is_expired(oauth.expires_at) {
        if let Some(refresh) = oauth.refresh_token.as_deref() {
            match refresh_token(&client, refresh).await {
                Ok(new_token) => {
                    if let Some(spliced) = splice_refreshed(&working_creds, &new_token) {
                        working_creds = spliced;
                        if let Err(e) =
                            credentials::write_account(account_num, email, &working_creds)
                        {
                            tracing::warn!("failed to persist refreshed token: {e:?}");
                        }
                        oauth = parse_oauth(&working_creds).unwrap_or(oauth);
                    }
                }
                Err(e) => tracing::debug!("proactive refresh failed: {e:?}"),
            }
        }
    }

    let access = match oauth.access_token.as_deref() {
        Some(a) => a,
        None => return UsageState::NoCredentials,
    };

    match request_usage(&client, access).await {
        Ok(api) => {
            let state = UsageState::Ok(build_result(api));
            remember_usage(cache_key, state.clone()).await;
            state
        }
        Err(err) => {
            let is_401 = err
                .downcast_ref::<reqwest::Error>()
                .and_then(|e| e.status())
                .map(|s| s.as_u16() == 401)
                .unwrap_or(false);

            if is_401 && !is_active {
                if let Some(refresh) = oauth.refresh_token.as_deref() {
                    if let Ok(new_token) = refresh_token(&client, refresh).await {
                        if let Some(spliced) = splice_refreshed(&working_creds, &new_token) {
                            if let Err(e) = credentials::write_account(account_num, email, &spliced)
                            {
                                tracing::warn!("failed to persist refreshed token: {e:?}");
                            }
                            if let Ok(api) = request_usage(&client, &new_token.access_token).await {
                                let state = UsageState::Ok(build_result(api));
                                remember_usage(cache_key, state.clone()).await;
                                return state;
                            }
                        }
                    }
                }
            }

            if let Some(cached) = cached_usage_allow_stale(&cache_key).await {
                return cached;
            }

            UsageState::Unavailable {
                message: err.to_string(),
            }
        }
    }
}

async fn cached_usage(cache_key: &str) -> Option<UsageState> {
    let cache = USAGE_CACHE.lock().await;
    let cached = cache.get(cache_key)?;
    if cached.fetched_at.elapsed() <= USAGE_CACHE_TTL {
        Some(cached.state.clone())
    } else {
        None
    }
}

async fn cached_usage_allow_stale(cache_key: &str) -> Option<UsageState> {
    let cache = USAGE_CACHE.lock().await;
    cache.get(cache_key).map(|cached| cached.state.clone())
}

async fn remember_usage(cache_key: String, state: UsageState) {
    let mut cache = USAGE_CACHE.lock().await;
    cache.insert(
        cache_key,
        CachedUsage {
            state,
            fetched_at: Instant::now(),
        },
    );
}
