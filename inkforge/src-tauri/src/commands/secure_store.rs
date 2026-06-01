//! OS keychain backed secure key storage commands.
//!
//! The renderer's crypto layer (`src/utils/crypto/storage.ts`) persists the
//! AES master key in the platform credential store so prod desktop builds can
//! auto-unlock at startup without a password prompt. These commands are the
//! Rust side of `invoke('store_key' | 'get_key' | 'delete_key')`.
//!
//! Backends (via the `keyring` crate):
//! - Windows  -> Windows Credential Manager (`windows-native`)
//! - macOS    -> Keychain (`apple-native`)
//! - Linux    -> Secret Service (`sync-secret-service`)
//!
//! Tauri 1.x maps the JS camelCase args (`keyId` / `keyData`) onto the Rust
//! snake_case parameters (`key_id` / `key_data`) automatically, matching the
//! existing ollama / wechat command convention.

use keyring::{Entry, Error as KeyringError};

/// Service name shared by every InkForge credential entry. The caller-supplied
/// `key_id` is used as the username component, so the TS layer fully controls
/// the logical key identity.
const KEYCHAIN_SERVICE: &str = "com.inkforge.keychain";

/// Build a keyring entry for the given logical key id.
fn keychain_entry(key_id: &str) -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, key_id).map_err(|error| error.to_string())
}

/// Store (or overwrite) a secret in the OS credential store.
#[tauri::command]
pub async fn store_key(key_id: String, key_data: String) -> Result<(), String> {
    let entry = keychain_entry(&key_id)?;
    entry
        .set_password(&key_data)
        .map_err(|error| error.to_string())
}

/// Read a secret from the OS credential store.
///
/// A missing entry is a normal, expected state (first run), so it resolves to
/// `Ok(None)` rather than an error. All other failures propagate as `Err`.
#[tauri::command]
pub async fn get_key(key_id: String) -> Result<Option<String>, String> {
    let entry = keychain_entry(&key_id)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

/// Delete a secret from the OS credential store.
///
/// Deleting a non-existent entry is treated as success so the operation is
/// idempotent.
#[tauri::command]
pub async fn delete_key(key_id: String) -> Result<(), String> {
    let entry = keychain_entry(&key_id)?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}
