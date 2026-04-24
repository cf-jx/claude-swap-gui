//! Local Claude Code session token totals.
//!
//! This mirrors the lightweight cc-switch approach: scan
//! `~/.claude/projects/*/*.jsonl`, read assistant message usage, deduplicate by
//! message id, then aggregate token counters.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    fs,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
};

use crate::paths;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TokenTotals {
    pub total_tokens: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_creation_tokens: u64,
    pub message_count: u64,
    pub files_scanned: u64,
    pub total_cost_usd: f64,
}

#[derive(Debug, Clone)]
struct AssistantUsage {
    input_tokens: u64,
    output_tokens: u64,
    cache_read_tokens: u64,
    cache_creation_tokens: u64,
    has_stop_reason: bool,
    model: Option<String>,
}

#[derive(Debug, Clone, Copy)]
struct ModelPricing {
    input_per_mtok: f64,
    output_per_mtok: f64,
    cache_read_per_mtok: f64,
    cache_write_per_mtok: f64,
}

fn pricing_for(model: Option<&str>) -> ModelPricing {
    let m = model.unwrap_or("").to_ascii_lowercase();
    if m.contains("opus") {
        ModelPricing {
            input_per_mtok: 15.0,
            output_per_mtok: 75.0,
            cache_read_per_mtok: 1.50,
            cache_write_per_mtok: 18.75,
        }
    } else if m.contains("haiku") {
        if m.contains("3-haiku") && !m.contains("3-5") && !m.contains("3.5") {
            ModelPricing {
                input_per_mtok: 0.25,
                output_per_mtok: 1.25,
                cache_read_per_mtok: 0.03,
                cache_write_per_mtok: 0.30,
            }
        } else {
            ModelPricing {
                input_per_mtok: 0.80,
                output_per_mtok: 4.0,
                cache_read_per_mtok: 0.08,
                cache_write_per_mtok: 1.0,
            }
        }
    } else {
        ModelPricing {
            input_per_mtok: 3.0,
            output_per_mtok: 15.0,
            cache_read_per_mtok: 0.30,
            cache_write_per_mtok: 3.75,
        }
    }
}

pub fn collect_token_totals() -> TokenTotals {
    collect_token_totals_from_dir(&paths::claude_projects_dir())
}

fn collect_token_totals_from_dir(projects_dir: &Path) -> TokenTotals {
    let mut totals = TokenTotals::default();
    let mut by_message_id: HashMap<String, AssistantUsage> = HashMap::new();

    for file_path in collect_jsonl_files(projects_dir) {
        totals.files_scanned += 1;
        if let Ok(file) = fs::File::open(&file_path) {
            let reader = BufReader::new(file);
            for line in reader.lines().map_while(Result::ok) {
                if let Some((message_id, usage)) = parse_assistant_usage(&line) {
                    let should_replace = match by_message_id.get(&message_id) {
                        None => true,
                        Some(existing) => {
                            (usage.has_stop_reason && !existing.has_stop_reason)
                                || (usage.has_stop_reason == existing.has_stop_reason
                                    && usage.output_tokens > existing.output_tokens)
                        }
                    };
                    if should_replace {
                        by_message_id.insert(message_id, usage);
                    }
                }
            }
        }
    }

    for usage in by_message_id.values() {
        if !usage.has_stop_reason || usage.output_tokens == 0 {
            continue;
        }
        totals.message_count += 1;
        totals.input_tokens += usage.input_tokens;
        totals.output_tokens += usage.output_tokens;
        totals.cache_read_tokens += usage.cache_read_tokens;
        totals.cache_creation_tokens += usage.cache_creation_tokens;

        let p = pricing_for(usage.model.as_deref());
        totals.total_cost_usd += (usage.input_tokens as f64) * p.input_per_mtok / 1_000_000.0
            + (usage.output_tokens as f64) * p.output_per_mtok / 1_000_000.0
            + (usage.cache_read_tokens as f64) * p.cache_read_per_mtok / 1_000_000.0
            + (usage.cache_creation_tokens as f64) * p.cache_write_per_mtok / 1_000_000.0;
    }

    totals.total_tokens = totals.input_tokens
        + totals.output_tokens
        + totals.cache_read_tokens
        + totals.cache_creation_tokens;
    totals
}

fn collect_jsonl_files(projects_dir: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let Ok(entries) = fs::read_dir(projects_dir) else {
        return files;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if let Ok(sub_entries) = fs::read_dir(path) {
            for sub_entry in sub_entries.flatten() {
                let sub_path = sub_entry.path();
                if sub_path.extension().and_then(|ext| ext.to_str()) == Some("jsonl") {
                    files.push(sub_path);
                }
            }
        }
    }

    files
}

fn parse_assistant_usage(line: &str) -> Option<(String, AssistantUsage)> {
    let value: Value = serde_json::from_str(line).ok()?;
    if value.get("type").and_then(|v| v.as_str()) != Some("assistant") {
        return None;
    }

    let message = value.get("message")?;
    let message_id = message.get("id")?.as_str()?.to_string();
    let usage = message.get("usage")?;

    Some((
        message_id,
        AssistantUsage {
            input_tokens: usage
                .get("input_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
            output_tokens: usage
                .get("output_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
            cache_read_tokens: usage
                .get("cache_read_input_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
            cache_creation_tokens: usage
                .get("cache_creation_input_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
            has_stop_reason: message.get("stop_reason").and_then(|v| v.as_str()).is_some(),
            model: message
                .get("model")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        },
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_assistant_usage_line() {
        let line = r#"{"type":"assistant","message":{"id":"msg_1","model":"claude-sonnet-4-6","usage":{"input_tokens":10,"output_tokens":20,"cache_read_input_tokens":30,"cache_creation_input_tokens":40},"stop_reason":"end_turn"}}"#;
        let (_, usage) = parse_assistant_usage(line).unwrap();
        assert_eq!(usage.input_tokens, 10);
        assert_eq!(usage.output_tokens, 20);
        assert_eq!(usage.cache_read_tokens, 30);
        assert_eq!(usage.cache_creation_tokens, 40);
        assert!(usage.has_stop_reason);
        assert_eq!(usage.model.as_deref(), Some("claude-sonnet-4-6"));
    }

    #[test]
    fn pricing_picks_opus_sonnet_haiku() {
        assert_eq!(pricing_for(Some("claude-opus-4-7")).input_per_mtok, 15.0);
        assert_eq!(pricing_for(Some("claude-sonnet-4-6")).input_per_mtok, 3.0);
        assert_eq!(pricing_for(Some("claude-haiku-4-5-20251001")).input_per_mtok, 0.80);
        assert_eq!(pricing_for(Some("claude-3-haiku-20240307")).input_per_mtok, 0.25);
        assert_eq!(pricing_for(None).input_per_mtok, 3.0);
    }

    #[test]
    fn ignores_non_assistant_lines() {
        let line = r#"{"type":"user","message":{"id":"msg_1"}}"#;
        assert!(parse_assistant_usage(line).is_none());
    }
}
