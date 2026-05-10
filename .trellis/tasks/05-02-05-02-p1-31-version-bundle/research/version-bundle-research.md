# Version Bundle Research Notes

## External verification

- Grok Search checked current Dexie guidance: use explicit `db.transaction('rw', table, async () => { ... })` for atomic updates; for embedded arrays, fetch the row, modify or replace the array in memory, and `put` or `update` the whole array. Caught errors inside a transaction must be rethrown to abort.
- Context7 Dexie docs confirmed transaction rollback behavior and the rule that handled errors inside a transaction will not abort unless rethrown.
- Grok Search and Context7 Pinia docs confirmed service-backed stores should expose real `state/loading/error`, computed getters, and async actions that call the service/repository instead of seeding UI-only rows.
- DeepWiki and Exa MCP calls were attempted for cross-checking but returned `Transport closed` in this environment.

## Local implementation decision

- The current Workstation version path stores snapshots in `contents.versions`, while older `documents/versions` helpers still exist. This task will not normalize versions into a new table because that would be a large migration and would risk deleting or bypassing existing behavior.
- VersionBundle baseline will wrap embedded versions behind a repository so future migration to a normalized table can preserve the same service/store contract.
- Restore must be proposal-first. The repository may build diff/proposed content, but it must not overwrite `contents.body` unless a separate explicit commit action is called.
- Milestones must be treated as immutable retention anchors. Delete and cleanup fail closed for milestones.
