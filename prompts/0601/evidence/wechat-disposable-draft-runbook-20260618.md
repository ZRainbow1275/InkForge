# WeChat Disposable Draft Runbook - 2026-06-18

## Scope

This runbook defines the only acceptable path for live WeChat mutation proof under task
`06-01-multiplatform-render-svg`.

It is a pre-mutation safety contract, not a completed proof artifact.

## Preconditions

- CloakBrowser must be on an authenticated WeChat backend/editor session.
- The current PC editor DOM must be readable through non-sensitive selector checks.
- The target InkForge artifact must be named before the run, for example one of:
  `flagship-amber`, `flagship-kiln`, or `flagship-tempera`.
- The operator must decide whether the proof target is ordinary OS Ctrl+V, phone preview, Dark Mode,
  cover thumbnail, or cleanup only.
- No existing live draft may be used for paste or phone proof.
- The draftbox delete action and confirmation/cancel controls must be distinguishable before any
  disposable draft is created.

## Redaction Boundary

- Do not record account identifiers, private draft titles, private draft body text, runtime URL
  parameter values, full HTML dumps, account images, or local browser runtime paths.
- Evidence may record selector names, counts, redacted artifact ids, sanitized path names, and
  boolean gate outcomes.
- The disposable draft title may be recorded only if it is created solely for this proof and contains
  no private information.

## Create Phase

1. Open WeChat backend home through CloakBrowser.
2. Open the draftbox list and record a redacted baseline:
   - visible draft card count;
   - delete/edit/publish control taxonomy;
   - no login/re-login/expired-session wall.
3. Create a new article draft only through the visible WeChat creation path.
4. Give the disposable draft a deterministic title:
   `InkForge disposable proof YYYYMMDD-HHMM`.
5. Confirm the PC editor DOM is present:
   - `#js_appmsg_editor`;
   - `#editor_pannel`;
   - `#js_ueditor`;
   - `#js_editor`;
   - `.edui-editor`;
   - `.ProseMirror`;
   - toolbar shell.

## Paste Phase

Only run this phase after a reliable non-Playwright ordinary keyboard path is proven.

1. Set the Windows CF_HTML clipboard payload from the exact named InkForge artifact.
2. Focus the WeChat body editor through a visible user-action path.
3. Send ordinary OS Ctrl+V, not a synthetic ClipboardEvent/DataTransfer dispatch.
4. Read back the editor DOM and record:
   - `ordinaryClipboardPasteVerified:true` only if a real paste/input event occurred through the
     ordinary OS channel;
   - exact artifact fingerprint;
   - `data-ink-svg` count;
   - inline `svg` count;
   - absence of authoring-tool residues;
   - no unsafe sensitive artifact capture.
5. Abort without claiming ordinary paste if the editor receives plain text only, no paste/input event
   is observed, the page loses focus, or the keyboard path reports only generic keydown events.

## Phone / Preview Phase

Only run this phase after paste readback and disposable cleanup controls are ready.

1. Use the WeChat preview action on the disposable draft.
2. Phone-side evidence must be collected from the actual WeChat preview, not from PC editor DOM.
3. Record separate results for:
   - phone content readback;
   - mobile Dark Mode;
   - mobile SMIL/click interaction;
   - cover thumbnail / preview-entry acceptance.
4. Abort without claiming phone proof if the phone preview cannot be opened or the evidence cannot
   be redacted safely.

## Cleanup Phase

1. Return to the draftbox list.
2. Locate the deterministic disposable draft title.
3. Use the delete action for that disposable draft only.
4. Confirm deletion through the WeChat confirmation dialog.
5. Re-read the draftbox list and prove the disposable title is absent.
6. Set `disposableDraft:true` only for artifacts bound to the created proof draft.
7. Set `cleanupPathVerified:true` only after the delete confirmation and post-cleanup absence
   readback both succeed.

## Abort Conditions

- The authenticated editor session becomes a login, re-login, expired-session, blocked, or generic
  shell page.
- Delete/edit/publish controls cannot be distinguished.
- The selected action could target an existing private draft.
- The keyboard path is not ordinary OS Ctrl+V.
- The platform shows any publish/sync/schedule flow instead of draft-only editing.
- Any evidence capture would include private account material.

## Manifest Mapping

- `authenticated-editor-url` requires `authenticatedSessionVerified:true`.
- `pc-editor-dom-readback` requires both `authenticatedSessionVerified:true` and
  `platformEditorDomVerified:true`.
- `pc-editor-paste-event` requires `ordinaryClipboardPasteVerified:true`.
- `safe-disposable-draft` requires `disposableDraft:true` and `cleanupPathVerified:true`.
- Phone preview, Dark Mode, cover, sync, schedule, and publish proof remain separate rows and must
  not be inferred from PC editor DOM or local browser evidence.

## Current Status

- Current editor DOM reachability is refreshed in
  `wechat-editor-dom-current-readonly-20260618.txt`.
- Current local ordinary keyboard paste tooling is refreshed in
  `cloakbrowser-os-ctrlv-richhtml-local-probe-20260618.txt`: `keybd_event` plus calibrated OS
  click can produce trusted local Ctrl+V, and the CF_HTML helper can feed a real flagship HTML/SVG
  payload into a controlled local contenteditable.
- Live WeChat Amber proof is refreshed in
  `wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt`: the exact `flagship-amber.html`
  CF_HTML artifact was inserted into an authenticated WeChat PC editor by ordinary OS Ctrl+V, read
  back with `svgCount=35` and `dataInkSvgCount=3`, then cleaned up through a deterministic
  disposable draft deletion and post-reload absence readback.
- That Amber proof satisfies the runbook's PC paste and cleanup path for the exact Amber artifact
  only. It still does not prove phone preview, mobile Dark Mode, mobile SMIL/click behavior, cover
  thumbnail acceptance, credentialed sync, scheduled send, or publish success.
