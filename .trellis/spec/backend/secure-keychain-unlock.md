# Secure Key Storage (Tauri Keychain) + Master-Key Auto-Unlock

> Executable contract for the OS-keychain master-key storage commands
> (`src-tauri/src/commands/secure_store.rs`) and the boot-time auto-unlock that
> makes encryption work in every real **Tauri desktop runtime** (release, debug,
> and `tauri:dev`) while keeping ordinary browser/Vite preview unencrypted.
> Cross-layer: Rust IPC commands ⇄ `src/utils/crypto/*` ⇄ `src/main.ts` boot.

---

## 1. Scope / Trigger

Apply whenever you touch: the Tauri keychain commands, `ENABLE_ENCRYPTION`, the
Tauri-environment detection used by crypto, the master-key lifecycle
(`getMasterKey`/`unlockWithPassword`/`ensureMasterKeyUnlocked`), or the app boot
sequence in `main.ts`.

**Historical root problem and current regression guard:** the original
`ENABLE_ENCRYPTION = import.meta.env.PROD && HAS_TAURI_RUNTIME` contract left
`tauri:dev` and debug binaries on a plaintext-only path, while production
encrypted writes could start before a key was unlocked. The current contract is
`ENABLE_ENCRYPTION = HAS_TAURI_RUNTIME`: every real Tauri release/debug/dev
runtime unlocks and uses the OS-backed master key; ordinary browser/Vite preview
does not. `ensureMasterKeyUnlocked()` runs before store initialization, and the
actual encrypt/decrypt boundary rehydrates an expired in-memory cache from the OS
credential store without generating a replacement key. Real WebView2 E2E must
cover this contract because browser-only tests cannot prove OS keychain behavior.

---

## 2. Signatures

```rust
// src-tauri/src/commands/secure_store.rs  (keyring 3.6.3, windows-native backend)
#[tauri::command] pub async fn store_key(key_id: String, key_data: String) -> Result<(), String>
#[tauri::command] pub async fn get_key(key_id: String)                     -> Result<Option<String>, String> // NoEntry => Ok(None)
#[tauri::command] pub async fn delete_key(key_id: String)                  -> Result<(), String>              // NoEntry => Ok(())
// Entry::new("com.inkforge.keychain", &key_id) — fixed service, key_id = full TS id string.
// Registered in main.rs generate_handler![ ... secure_store::store_key, get_key, delete_key ].
```

```ts
// src/utils/crypto/key-management.ts
export async function ensureMasterKeyUnlocked(): Promise<boolean>
// src/utils/crypto/storage.ts — the 3 keychain fns invoke via @/utils/platform.tauriInvoke (NOT getTauriInvoke)
export async function saveMasterKeyToTauriKeychain(masterKeyData: string): Promise<boolean>   // -> store_key
export async function loadMasterKeyFromTauriKeychain(): Promise<string | null>                 // -> get_key
export async function deleteMasterKeyFromTauriKeychain(): Promise<boolean>                      // -> delete_key
```

---

## 3. Contracts

- **Tauri 1.x arg mapping**: JS sends camelCase (`{ keyId, keyData }`), Tauri maps
  to snake_case Rust params (`key_id`, `key_data`). Same convention as
  `focus_window(window_id)` ← `invoke('focus_window', { windowId })`. **Do not**
  rename to camelCase Rust params.
- **`get_key` MUST return `Ok(None)` (not `Err`) when the entry is absent**
  (match `keyring::Error::NoEntry`). Otherwise `loadMasterKeyFromTauriKeychain`'s
  catch turns a normal first-run into an error and the auto-unlock regenerates a
  key → **prior data becomes permanently undecryptable**.
- **`ensureMasterKeyUnlocked()` invariants:**
  1. `if (!ENABLE_ENCRYPTION) return false` — first line; ordinary browser/Vite
     preview never touches the keychain. Real Tauri release/debug/dev has
     `ENABLE_ENCRYPTION === true`.
  2. `if (getCachedKey()) return true` — idempotent.
  3. Non-Tauri → `return false` (web prod needs a password UI; out of scope here).
  4. Tauri: `loadMasterKeyFromTauriKeychain()` → if present, import a
     **non-extractable** working key + `setCachedKey`; **only if the entry is
     genuinely absent on first run**, generate → export raw →
     `saveMasterKeyToTauriKeychain` → re-import non-extractable working key +
     cache. **Generate only during first-run bootstrap.**
  5. A failed first-run `store_key` is fail-closed: do not cache or use the
     temporary generated key. Log the failure and return `false`.
- **`getMasterKey()` cache-expiry invariant:** a Tauri cache miss reloads the
  persisted key. If no persisted key exists, throw a typed failure and never
  generate a replacement; otherwise existing ciphertext could become
  undecryptable.
- **Boot wiring** (`main.ts` `initializeStores`): `await ensureMasterKeyUnlocked()`
  inside try/catch **before** `Promise.all([store.initialize() …])`, so stores load
  encrypted data with the key already unlocked. Failure must **never** block
  `app.mount('#app')`.
- **Tauri-env detection is a single source of truth**: `crypto/environment.ts`
  `isTauriEnvironment()` delegates to `@/utils/platform` `isTauriEnv()`, and
  `config.ts` `HAS_TAURI_RUNTIME` uses the **same 6-global set** as `hasTauriGlobal()`
  (`__TAURI__`, `__TAURI_INTERNALS__`, `__TAURI_INVOKE__`, `__TAURI_IPC__`,
  `__TAURI_METADATA__`, `__TAURI_POST_MESSAGE__`). **Checking only `__TAURI__` is a
  bug**: Tauri 1.4+ default `withGlobalTauri:false` does NOT inject `window.__TAURI__`
  → encryption silently disabled / keychain never reached in prod.
- **Persistence and automation isolation**: normal application runtimes use the
  `inkforge_*_v3` OS-credential namespace. A real WebDriver Tauri session uses the
  dedicated `inkforge_e2e_*_v3` namespace and must delete that credential in its
  session teardown. WebView2 profile isolation alone is insufficient because OS
  credentials survive profile resets independently of IndexedDB.

---

## 4. Validation & Error Matrix

| Condition | Result |
|-----------|--------|
| `ENABLE_ENCRYPTION` false (ordinary browser/Vite preview) | `ensureMasterKeyUnlocked` returns false immediately; no Tauri/keychain call |
| real Tauri release/debug/dev | encryption enabled; unlock runs before stores initialize |
| keychain has key | import non-extractable + cache; `return true`; **no regeneration** |
| keychain empty (first run) | generate + `store_key` + cache; `return true` |
| `store_key` returns false (save failed) | fail closed; do not cache/use the temporary key; log and `return false` |
| in-memory cache expires and persisted key exists | reload persisted key, reset cache timeout, continue |
| in-memory cache expires and persisted key is absent | throw; **never generate a replacement key** |
| WebDriver Tauri session | use `inkforge_e2e_*_v3`; teardown verifies and deletes the isolated credential |
| `get_key` returns `Err` instead of `Ok(None)` on missing entry | **BUG** — would misclassify first-run as failure → key regen → data loss |
| any Tauri-detection site checks only `__TAURI__` | **BUG** — prod desktop misdetected as web → encryption off / keychain skipped |
| decrypt with wrong key | `decryptSensitiveFields` does **not** throw — it logs `解密字段失败` and sets field to `''` (silent blanking) — so key regression shows as blanked content, not a crash |

---

## 5. Good / Base / Bad Cases

- **Good**: real Tauri release/debug/dev boot → `ensureMasterKeyUnlocked` loads the persisted key →
  `articleStore.addArticle` encrypts + persists; restart → same key loaded → prior
  articles decrypt.
- **Base**: ordinary browser/Vite preview → encryption off and no OS keychain
  access; real `tauri:dev` remains encrypted.
- **Bad**: generating a new master key on every boot (ignoring an existing keychain
  entry) → all previously-encrypted articles silently blank on next launch.
- **Bad**: accepting a temporary key after `store_key` fails, or letting E2E use
  the normal `inkforge_*` namespace, risks unreadable data or test pollution in
  the user's real credential store.

---

## 6. Tests Required

- `src/utils/crypto/__tests__/ensure-unlock.test.ts` — branches: encryption off →
  false + no keychain touch; already-cached → true; keychain-has-key → import +
  cache + true; first-run → generate+save+true; persistence failure → no cached
  temporary key; cache expiry → restore only; missing persisted key → fail closed.
  Real WebCrypto round-trip (only keychain I/O + env + `ENABLE_ENCRYPTION` mocked).
- **Rust**: `cargo build` must pass (compiles the keyring backend + 3 commands;
  verifies `NoEntry` variant + `delete_credential` method names against the pinned
  keyring version). Mock unit tests CANNOT cover the camelCase→snake_case mapping
  or the real credential-store round-trip.
- **Real-machine e2e** (the only layer that proves runtime activation): seed via
  the live Pinia `article` store in the current Tauri binary, reload through the
  production store, and verify encrypted envelope metadata without exposing key
  material. The E2E run must prove the dedicated credential existed, delete it
  through the real Tauri `delete_key` command, and emit only a redacted cleanup
  confirmation.

---

## 7. Wrong vs Correct

### Wrong
```rust
// get_key returns Err on a missing entry → first run looks like failure → key regen → data loss
pub async fn get_key(key_id: String) -> Result<String, String> {
    Entry::new("com.inkforge.keychain", &key_id).map_err(|e| e.to_string())?
        .get_password().map_err(|e| e.to_string())   // NoEntry becomes Err — WRONG
}
```
```ts
// crypto env detection checks only __TAURI__ → prod (withGlobalTauri:false) misdetected as web
export function isTauriEnvironment() { return '__TAURI__' in window } // encryption silently off
```

### Correct
```rust
pub async fn get_key(key_id: String) -> Result<Option<String>, String> {
    match Entry::new("com.inkforge.keychain", &key_id).and_then(|e| e.get_password()) {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),   // first run is not an error
        Err(e) => Err(e.to_string()),
    }
}
```
```ts
import { isTauriEnv } from '@/utils/platform'
export function isTauriEnvironment(): boolean { return isTauriEnv() } // 6-global source of truth
```

> **Gotcha**: encryption activation and OS-credential isolation are invisible to
> browser-only/unit tests. Always re-verify with a real current Tauri binary;
> release/debug/dev all encrypt, and WebDriver evidence is valid only when the
> dedicated `inkforge_e2e_*_v3` credential is removed after the session.
