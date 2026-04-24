//! Tray icon + popup-window behaviour.
//!
//! Left-click the tray icon to toggle the main window; right-click opens a
//! quick-action menu. The window hides automatically on focus loss so it
//! behaves like a Raycast-style launcher.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalPosition, Manager, PhysicalPosition, WebviewWindow,
};

use crate::{set_popup_mode, switcher};

const WINDOW_LABEL: &str = "main";
const WINDOW_WIDTH: f64 = 360.0;
const WINDOW_HEIGHT: f64 = 480.0;

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let switch = MenuItem::with_id(app, "switch_next", "切到下一个账户", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "打开窗口", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&show, &switch, &sep, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().cloned().unwrap())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Claude Swap")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "show" => {
                if let Some(w) = app.get_webview_window(WINDOW_LABEL) {
                    // Menu "show window" = persistent mode, center it.
                    set_popup_mode(false);
                    let _ = w.center();
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "switch_next" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let res = tokio::task::spawn_blocking(switcher::switch_next).await;
                    if let Some(w) = app.get_webview_window(WINDOW_LABEL) {
                        let payload = match res {
                            Ok(Ok(email)) => serde_json::json!({
                                "ok": true,
                                "action": "switch_next",
                                "email": email,
                            }),
                            Ok(Err(e)) => serde_json::json!({
                                "ok": false,
                                "action": "switch_next",
                                "error": e.to_string(),
                            }),
                            Err(e) => serde_json::json!({
                                "ok": false,
                                "action": "switch_next",
                                "error": e.to_string(),
                            }),
                        };
                        let _ = w.emit("cswap://action-result", payload);
                    }
                });
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                position,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window(WINDOW_LABEL) {
                    let visible = w.is_visible().unwrap_or(false);
                    if visible {
                        let _ = w.hide();
                    } else {
                        show_near_tray(&w, Some(position));
                    }
                }
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

/// Position the window near the tray icon, clamping to the current monitor.
/// Marks the window as popup mode (auto-hide on focus loss).
fn show_near_tray(window: &WebviewWindow, tray_pos: Option<PhysicalPosition<f64>>) {
    set_popup_mode(true);
    let monitor = window.current_monitor().ok().flatten();
    let scale = monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);

    if let Some(pos) = tray_pos {
        let monitor_size = monitor.as_ref().map(|m| m.size()).cloned();
        let mon_pos = monitor.as_ref().map(|m| m.position()).cloned();

        let logical_x = pos.x / scale;
        let logical_y = pos.y / scale;

        // Place window centred above/below the tray click, offset slightly.
        let mut x = logical_x - WINDOW_WIDTH / 2.0;
        let mut y = if logical_y > 400.0 {
            logical_y - WINDOW_HEIGHT - 8.0
        } else {
            logical_y + 8.0
        };

        if let (Some(size), Some(mon_pos)) = (monitor_size, mon_pos) {
            let mon_left = mon_pos.x as f64 / scale;
            let mon_top = mon_pos.y as f64 / scale;
            let mon_right = mon_left + size.width as f64 / scale;
            let mon_bottom = mon_top + size.height as f64 / scale;
            let margin = 8.0;
            x = x.clamp(mon_left + margin, mon_right - WINDOW_WIDTH - margin);
            y = y.clamp(mon_top + margin, mon_bottom - WINDOW_HEIGHT - margin);
        }

        let _ = window.set_position(LogicalPosition::new(x, y));
    }

    let _ = window.show();
    let _ = window.set_focus();
}
