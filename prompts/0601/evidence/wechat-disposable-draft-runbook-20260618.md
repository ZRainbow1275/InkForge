# WeChat Disposable Draft Runbook - 2026-06-18

## Scope

This runbook defines the only acceptable path for live WeChat mutation proof under task
`06-01-multiplatform-render-svg`.

It is a pre-mutation safety contract, not a completed proof artifact.

## Preconditions

- CloakBrowser must be on an authenticated WeChat backend/editor session.
- The current PC editor DOM must be readable through non-sensitive selector checks.
- The visible OS foreground tab and the CloakBrowser-bound DOM target must be proven to be the same
  WeChat editor before any OS Ctrl+V proof attempt. If multiple WeChat editor tabs are open, close
  or navigate away from non-target disposable tabs before sending keyboard input.
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
   - zero mojibake/replacement-character damage in the pasted body;
   - proof that the readback editor title/body belong to the same visible foreground tab that
     received OS Ctrl+V;
   - no unsafe sensitive artifact capture.
5. Abort without claiming ordinary paste if the editor receives plain text only, no paste/input event
   is observed, the page loses focus, the OS foreground tab does not match the DOM readback target,
   the body contains mojibake/replacement-character damage, or the keyboard path reports only
   generic keydown events.

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
- The visible OS foreground tab and the CloakBrowser DOM target diverge.
- The editor body receives mojibake-damaged or duplicated rich content.
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
- Live WeChat Kiln ordinary OS Ctrl+V is currently negative in
  `wechat-kiln-ordinary-ctrlv-plain-text-cleanup-20260618.txt`: the exact `flagship-kiln.html`
  CF_HTML artifact reached authenticated type=10/type=77 WeChat PC editors, but readback degraded
  to plain text with `svgCount=0` and `dataInkSvgCount=0`; all current-run failed drafts were
  cleaned up and therefore this must not set `ordinaryClipboardPasteVerified:true`.
- Kiln paste-safe candidate evidence is local-only in
  `wechat-kiln-paste-safe-candidate-local-probe-20260618.txt`: `flagship-kiln-paste-safe.html`
  preserved `svgCount=35`, `dataInkSvgCount=3`, and `dataInkBlockCount=23` in a controlled
  CloakBrowser contenteditable through Windows CF_HTML plus `keybd_event`, while the authenticated
  WeChat draftbox no-mutation check stayed at `Article 5` with zero candidate/current-run markers.
  This candidate must still follow this runbook from disposable draft creation through cleanup
  before any WeChat ordinary paste, phone, sync, schedule, or publish claim is made.
- A later WeChat attempt for the same Kiln paste-safe candidate is negative and cleaned up in
  `wechat-kiln-paste-safe-wechat-ctrlv-tab-mismatch-cleanup-20260618.txt`: the intended editor DOM
  target stayed unchanged, a different visible WeChat editor tab received mojibake-damaged
  InkForge content, the current-run empty-title residue was deleted with `ret=0`, and post-delete
  checks found zero deterministic-title, deleted-candidate, or recent InkForge-like residue
  matches. This does not satisfy ordinary paste or safe disposable draft proof.
- A stricter same-tab retry is negative in
  `wechat-kiln-paste-safe-wechat-ctrlv-single-tab-nopaste-20260618.txt`: the WeChat editor tab was
  visible, page/body focus was verified, CloakBrowser body click succeeded, and `keybd_event`
  `-NoClick` sent Ctrl+V without moving focus, but the body remained the placeholder. This confirms
  that foreground-window and key event counts are not proof without paste/input or body DOM change.
- That Amber proof satisfies the runbook's PC paste and cleanup path for the exact Amber artifact
  only. It still does not prove phone preview, mobile Dark Mode, mobile SMIL/click behavior, cover
  thumbnail acceptance, credentialed sync, scheduled send, or publish success.
