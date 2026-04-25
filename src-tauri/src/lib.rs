use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, WindowEvent};

mod claude_config;
mod commands;
mod credentials;
mod lock;
mod paths;
mod sequence;
mod settings;
mod switcher;
mod token_stats;
mod tray;
mod types;
mod usage;

/// True when the window was opened as a tray popup (auto-hide on focus loss).
/// False when it's the main launch / "show window" mode (stays put).
pub static POPUP_MODE: AtomicBool = AtomicBool::new(false);

pub fn set_popup_mode(on: bool) {
    POPUP_MODE.store(on, Ordering::Relaxed);
}
pub fn is_popup_mode() -> bool {
    POPUP_MODE.load(Ordering::Relaxed)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,claude_swap_gui_lib=debug".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tray::build(app.handle())?;
            if let Some(w) = app.get_webview_window("main") {
                set_popup_mode(false);
                let _ = w.center();
                let _ = w.show();
                let _ = w.set_focus();

                let win = w.clone();
                w.on_window_event(move |event| match event {
                    WindowEvent::Focused(false) => {
                        if is_popup_mode() {
                            let _ = win.hide();
                        }
                    }
                    WindowEvent::Moved(_) => {
                        // User dragged the window — promote to persistent mode.
                        set_popup_mode(false);
                    }
                    _ => {}
                });
            }

            // Apply saved hotkey on startup (ignore errors — user can re-bind in UI).
            if let Ok(saved) = commands::get_settings(app.handle().clone()) {
                let _ = commands::apply_hotkey(app.handle(), &saved.hotkey);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_accounts,
            commands::refresh_usage,
            commands::switch_next,
            commands::switch_to,
            commands::add_current_account,
            commands::remove_account,
            commands::backup_accounts,
            commands::get_settings,
            commands::set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application");
}
