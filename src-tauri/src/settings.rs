use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub autostart: bool,
    pub hotkey: String,
    pub poll_seconds: u32,
    pub theme: Theme,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            autostart: false,
            hotkey: "CmdOrCtrl+Shift+Backslash".to_string(),
            poll_seconds: 300,
            theme: Theme::System,
        }
    }
}
