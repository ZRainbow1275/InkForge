# Secure Key Storage (Tauri Keychain) + Master-Key Auto-Unlock

> Executable contract for the OS-keychain master-key storage commands
> (`src-tauri/src/commands/secure_store.rs`) and the boot-time auto-unlock that
> makes encryption actually work in a **production Tauri desktop build**.
> Cross-layer: Rust IPC commands ⇄ `src/utils/crypto/*` ⇄ `src/main.ts` boot.

---

## 1. Scope / Trigger

Apply whenever you touch: the Tauri keychain commands, `ENABLE_ENCRYPTION`, the
Tauri-environment detection used by crypto, the master-key lifecycle
(`getMasterKey`/`unlockWithPassword`/`ensureMasterKeyUnlocked`), or the app boot
sequence in `main.ts`.

**Root problem this fixed (regression guard):** `ENABLE_ENCRYPTION =
import.meta.env.PROD && HAS_TAURI_RUNTIME`. In a prod-frontend Tauri build
encryption is ON, but **nothing in the app ever unlocked the master key** — no
code path called `unlockWithPassword`. So `getMasterKey()` threw
「主密钥未解锁」 → `encryptSensitiveFields` threw → `repository.create` rethrew
`创建${table}失败` → **every encrypted write (article/content create) failed in a
production desktop build**. It was never seen in daily use because `tauri:dev`
runs with `import.meta.env.PROD === false` (encryption OFF). Proven via real
WebView2 e2e: pre-fix seeding failed; post-fix it succeeds.

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
  1. `if (!ENABLE_ENCRYPTION) return false` — first line; DEV/web never touch keychain.
  2. `if (getCachedKey()) return true` — idempotent.
  3. Non-Tauri → `return false` (web prod needs a password UI; out of scope here).
  4. Tauri: `loadMasterKeyFromTauriKeychain()` → if present, import
     **non-extractable** working key + `setCachedKey`; **only if absent**,
     `generateMasterKey` → export raw → `saveMasterKeyToTauriKeychain` → re-import
     non-extractable working key + cache. **Generate ONLY when keychain is empty.**
  5. Whole Tauri branch wrapped in try/catch → log + `return false`; **never throw**.
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
- **Persistence**: the key lives in the **OS credential store** (Windows Credential
  Manager `LegacyGeneric:target=com.inkforge.keychain:inkforge_master_key_v3.com.inkforge.keychain`),
  which survives app restart **and** WebView2-profile resets — independent of IndexedDB.

---

## 4. Validation & Error Matrix

| Condition | Result |
|-----------|--------|
| `ENABLE_ENCRYPTION` false (dev/web) | `ensureMasterKeyUnlocked` returns false immediately; no Tauri/keychain call |
| keychain has key | import non-extractable + cache; `return true`; **no regeneration** |
| keychain empty (first run) | generate + `store_key` + cache; `return true` |
| `store_key` returns false (save failed) | warn, still cache for this session, `return true` (no boot block) |
| `get_key` returns `Err` instead of `Ok(None)` on missing entry | **BUG** — would misclassify first-run as failure → key regen → data loss |
| any Tauri-detection site checks only `__TAURI__` | **BUG** — prod desktop misdetected as web → encryption off / keychain skipped |
| decrypt with wrong key | `decryptSensitiveFields` does **not** throw — it logs `解密字段失败` and sets field to `''` (silent blanking) — so key regression shows as blanked content, not a crash |

---

## 5. Good / Base / Bad Cases

- **Good**: prod Tauri boot → `ensureMasterKeyUnlocked` loads the persisted key →
  `articleStore.addArticle` encrypts + persists; restart → same key loaded → prior
  articles decrypt.
- **Base**: dev (`tauri:dev`, PROD=false) → encryption off → writes are plaintext,
  `ensureMasterKeyUnlocked` is a no-op.
- **Bad**: generating a new master key on every boot (ignoring an existing keychain
  entry) → all previously-encrypted articles silently blank on next launch.

---

## 6. Tests Required

- `src/utils/crypto/__tests__/ensure-unlock.test.ts` — branches: encryption off →
  false + no keychain touch; already-cached → true; keychain-has-key → import +
  cache + true; first-run → generate+save+true; keychain throws → false (no throw).
  Real WebCrypto round-trip (only keychain I/O + env + `ENABLE_ENCRYPTION` mocked).
- **Rust**: `cargo build` must pass (compiles the keyring backend + 3 commands;
  verifies `NoEntry` variant + `delete_credential` method names against the pinned
  keyring version). Mock unit tests CANNOT cover the camelCase→snake_case mapping
  or the real credential-store round-trip.
- **Real-machine e2e** (the only layer that proves runtime activation): seed via the
  live Pinia `article` store in a **prod** binary; pre-fix it fails with
  `创建articles失败`, post-fix `addArticle` succeeds. Persistence proof = the
  Credential Manager entry exists across launches (`cmdkey /list`).

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

> **Gotcha**: encryption activation is invisible to mock unit tests (they stub the
> keychain + `ENABLE_ENCRYPTION`). Always re-verify with a **prod** Tauri binary —
> `tauri:dev` has `PROD=false` so encryption is OFF and the whole path is bypassed.
