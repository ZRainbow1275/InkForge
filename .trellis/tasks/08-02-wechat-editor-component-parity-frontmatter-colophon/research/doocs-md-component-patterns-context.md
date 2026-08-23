# Context: doocs/md component patterns

Full evidence: `research/doocs-md-component-patterns.md`.

Pinned official source:

- Repository: `https://github.com/doocs/md`
- Commit: `e50183350afd48162641420d671050bbd882d668`
- Reviewed on: 2026-08-02

Implementation-relevant facts:

1. doocs/md stores component instances as PascalCase JSX in canonical Markdown and stores component definitions separately as declarative registry data.
2. One definition supplies typed props, prop-fill UI, live preview and stable JSX snippet; built-in and user definitions are passed to one renderer.
3. Toolbar and slash-command entry points open the same component dialog and call the existing editor cursor insertion API; they do not maintain a second article model.
4. Current official built-ins are `MpProfile`, `QRCodeBlock`, `AuthorBlock`, `TipBlock`, `TableBlock`, `InfoGrid`, and `BadgeGroup`. The pinned source has no `SongBlock` or audio player.
5. doocs source editing remains CodeMirror JSX; it does not provide InkForge's existing selected-atom property round-trip. InkForge must retain TipTap selection/edit/delete/range replacement.
6. `ComponentPropFill` uses the same props for sanitized live preview and canonical snippet. This supports InkForge reusing its existing validated renderer inside an editor-only NodeView body rather than writing a second card template.
7. doocs required-field checks are mainly dialog-side; its core renderer and JSON import are less strict than InkForge's current Zod/URL/version/unknown-prop boundary. InkForge must not weaken validation.
8. doocs `MpProfile` can emit `mp-common-profile` and registers a browser Web Component lookalike. Neither sanitizer retention nor local lookalike proves current WeChat ordinary-paste/native acceptance.
9. QR rendering in doocs uses a third-party QR service. InkForge must retain real user-provided HTTPS QR images and must not transmit target URLs to that service.
10. Reusable ideas are single registry, canonical JSX, schema-driven fields, same-source preview, explicit unknown component error, and platform-safe fallback.
11. Forbidden reuse includes doocs templates, CSS/classes, logos, sample accounts/IDs, sample people, QR service, protected visual assets, and any assumption of native WeChat success.
12. Full official file/line links, caveats and InkForge source cross-checks remain in the full research file; this compact file exists only to stay below Trellis context injection limits.
