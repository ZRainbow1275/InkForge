# External Research Notes

## Dexie

- Grok Search session `7a3cadb5442f` and Context7 `/websites/dexie` docs confirm that schema changes require a new `db.version(n).stores(...)` declaration.
- Compound indexes use `[fieldA+fieldB]`; multi-table atomic writes should use `db.transaction('rw', tableA, tableB, async () => { ... })`.
- For complex many-to-many tagging, a junction table is the safer model than only a multi-entry `*tags` array because it supports merge, doc-count repair, uniqueness checks, and relation cleanup.

## Pinia / Vue

- Grok Search session `abac3fc21f8f` and Context7 `/websites/pinia_vuejs` docs confirm that asynchronous persistence work belongs in Pinia actions, while state/getters expose reactive UI data.
- The DB/repository should remain the source of truth; the Pinia store is a cache hydrated from repository calls.
- Components should call store actions and render action results/errors. They should not write directly to Dexie.

## Project Tooling Reality

- `gitnexus__list_repos`, `abcoder__list_repos`, and `serena__activate_project` returned `Transport closed` at task start.
- Impact analysis cannot be honestly reported as successful until those MCP transports recover.
- Compensation plan: keep edits narrow, follow existing repository/store patterns, run targeted and full test gates, run build, and perform browser smoke against real IndexedDB data.
## Runtime Follow-up

- Browser smoke found a real Dexie `ConstraintError` caused by duplicate `docId` and `tagId` index names in the v19 `docTags` store declaration. The fix keeps `docId` and `tagId` once and preserves compound lookup indexes.
- Browser smoke also found that the tag input collapsed to zero width inside the default 260px Workstation manager panel. The fix makes the input row narrow-container-first so the text field remains usable without widening the whole manager panel.
- After the fixes, a fresh navigation produced no console errors matching Playwright's error log filter.
