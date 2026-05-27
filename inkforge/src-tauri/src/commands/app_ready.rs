//! IPC handshake: frontend signals it has mounted and is ready to be shown.
//!
//! The Rust setup hook spawns a 3-second timeout task that closes the splash
//! and shows the main window if the frontend never reports ready (crash, hang,
//! infinite loop). This command short-circuits that timeout by notifying the
//! shared `SplashReadySignal` and performing the same transition immediately.

use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::Notify;

use crate::splash;

/// Shared notifier stored in Tauri state. The timeout task waits on this
/// notifier; `app_ready` triggers it to cancel the fallback transition.
pub struct SplashReadySignal {
    pub notify: Arc<Notify>,
}

impl SplashReadySignal {
    pub fn new() -> Self {
        Self {
            notify: Arc::new(Notify::new()),
        }
    }

    pub fn handle(&self) -> Arc<Notify> {
        Arc::clone(&self.notify)
    }
}

impl Default for SplashReadySignal {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub async fn app_ready(app: AppHandle) -> Result<(), String> {
    if let Some(signal) = app.try_state::<SplashReadySignal>() {
        signal.notify.notify_waiters();
    }

    splash::close_splash_and_show_main(&app);
    Ok(())
}
