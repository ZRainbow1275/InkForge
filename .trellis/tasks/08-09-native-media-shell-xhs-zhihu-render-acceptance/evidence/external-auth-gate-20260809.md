# External Authentication Gate — 2026-08-09

## Observed state

- The dedicated task browser session was recovered and retained without switching profile.
- The Xiaohongshu creator surface redirected to its login surface.
- The Zhihu writing surface redirected to its sign-in surface.
- The WeChat Official Accounts surface showed its account-login surface.

The prior authenticated sessions had expired. No account identifier, QR image, cookie, token, browser
profile path, private draft, platform DOM dump, or screenshot is stored in repository evidence.

## Safety boundary

- No platform field was edited.
- No text or image was pasted or uploaded.
- No draft was saved or deleted.
- No phone preview, sync, schedule, group send, or publish control was used.
- `published=false` remains independent from local artifact readiness.

## Required next action

After the user signs in within the existing dedicated browser session:

1. WeChat: use the final release handoff to insert a real song and real official-account profile/media,
   read visible identity/order from the target article body, then discard the disposable content.
2. Xiaohongshu: upload the exact six-page raster pack and paste the exact plain-text artifact through
   visible creator controls; read order/crop/leakage and stop before publish.
3. Zhihu: import/paste the exact clean Markdown and upload the exact image fallback through visible
   editor controls; read semantic blocks/image metadata and stop before publish.

Until those actions complete, all three editor rows remain `blocked`, not
`platform-editor-rendered`.
