# Profile Isolation Research Notes

## Dexie / IndexedDB

- Grok search and Context7 Dexie docs confirm that Dexie supports dynamic database instances with `new Dexie(name)`, versioned schemas via `version().stores()`, explicit `open()`, `close()`, static/instance `delete()`, and database listing via `Dexie.getDatabaseNames()` where supported.
- For InkForge, the safe pattern is a `ProfileDatabase` class per namespace plus a manager cache. Close unused database instances to reduce upgrade blocking and avoid holding many profile databases open.
- Dynamic mode is useful for introspection, but product-owned profile databases should use explicit versioned schemas.

Sources:
- https://dexie.org/docs/Dexie/Dexie.getDatabaseNames/
- https://dexie.org/docs/Dexie/Dexie.open/
- https://dexie.org/docs/Dexie/Dexie.close/
- https://dexie.org/docs/Dexie/Dexie.delete/

## Tauri Boundary

- Context7 Tauri docs confirm directory selection is a native dialog plugin operation (`open({ directory: true })`) and window-specific capabilities can be scoped by window labels.
- Tauri can create multiple `WebviewWindow` instances in Rust, but the current browser/Vite runtime cannot honestly claim that native bridge exists.
- Therefore the baseline must expose unavailable native boundaries in UI and service results instead of faking a file root or multi-window success.

Sources:
- https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/plugin/dialog.mdx
- https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/learn/Security/capabilities-for-windows-and-platforms.mdx

## Product Design Implication

- Treat data as three scopes: device/global registry, profile-scoped database namespace, and shared cross-profile configuration area.
- Keep existing global article storage stable until a migration spec can safely define backup, migration, rollback, and cross-profile article ownership semantics.
- For this baseline, prove hard isolation with dedicated per-profile metadata databases and registry lifecycle, not by moving user content prematurely.
