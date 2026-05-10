# Split View Research Notes

## Grok Search 2026-05-02

Queries:

- `Current best practices for accessible resizable split pane web editor UX with persisted ratios, min pane widths, keyboard resizing, and responsive disablement.`
- `Current best practices for markdown editor preview synchronized scrolling, anchor mapping, debounce, scroll loop prevention, and user opt out.`

Findings:

- Use ratios or grid/flex fractions rather than absolute pixels so split layout survives resize.
- Separator should follow WAI-ARIA Window Splitter practices: focusable `role="separator"`, `aria-orientation="vertical"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-controls`, and keyboard arrow adjustment.
- Enforce minimum widths and clamp ratios. Use a wider hit target than the visible divider.
- Save on resize end or debounce; keep persisted payload minimal and local.
- Responsive fallback should disable or collapse split panes on narrow containers rather than forcing unusable columns.
- Sync-scroll should start with a loop-prevention flag and throttled/RAF handlers. Percentage mapping is acceptable as a baseline fallback; precise row/block anchors are the next phase.
- User must be able to opt out of sync-scroll because rendered markdown can diverge from source height for images, tables, headings, and long code blocks.

Implementation Decision:

- Baseline will add Workstation-native split preview and persist split fields in the existing `layoutStates` record, not introduce a second database table.
- Baseline sync-scroll will be percentage-based with `isSyncingSplitScroll` guard and a visible toggle; Spec 39 can later replace it with anchor maps.
- `Ctrl+Shift+E` will be assigned to SplitView per Spec 35. The existing sidebar feature remains and moves to a non-conflicting default fallback if needed.