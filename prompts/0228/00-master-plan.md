# InkForge Studio 0228 Master Development Plan

## Overview

InkForge Studio v5.0 is a Vue 3 + TipTap + Tauri cross-platform Markdown editor targeting WeChat, Xiaohongshu, and Zhihu platforms. This plan covers 8 major workstreams addressing bugs, feature gaps, and new capabilities.

**Design Philosophy**: Ethereal Constructivism -- "在克制中寻找张力，在留白中孕育气韵"
**Reference Prototype**: `prototype/inkforge_workstation.html`

---

## Priority Matrix

| Priority | Workstream | Spec File | Estimated Complexity |
|----------|-----------|-----------|---------------------|
| P0 | Tauri Article Creation Fix | 01-tauri-article-creation.md | Low |
| P0 | Editor Rendering Sync | 03-editor-rendering-sync.md | Medium |
| P0 | Inspector Real Implementation | 05-inspector-real-implementation.md | High |
| P1 | Homepage Enhancement + Waterfall | 02-homepage-enhancement.md | Medium |
| P1 | Platform CSS Compliance | 04-platform-css-compliance.md | Medium |
| P1 | Editor Word-Style Features | 08-editor-word-features.md | High |
| P2 | External File & Asset Loading | 06-external-file-asset-loading.md | High |
| P3 | Cloud Encryption + ReBAC | 07-cloud-encryption-rebac.md | Very High |

---

## Architecture Overview

### Current Tech Stack

```
Frontend:  Vue 3 (Composition API) + Pinia + TypeScript (strict)
Editor:    TipTap (ProseMirror) + CodeMirror 6
Database:  IndexedDB via Dexie.js
Export:    marked + juice + highlight.js + DOMPurify
Styling:   TailwindCSS + Scoped CSS
Desktop:   Tauri (Rust backend)
Validation: Zod schemas
```

### Key Directories

```
inkforge/src/
  components/
    editor/       -- EditorPanel, MarkdownEditor, MarkdownPreview, FloatingToolbar
    file/         -- FileManager (article list + creation)
    asset/        -- AssetManager
    outline/      -- OutlinePanel
    version/      -- VersionPanel
    export/       -- ExportModal
  stores/
    article.ts    -- Article CRUD (Dexie repository)
    editor.ts     -- FSM editor state (idle/loading/ready/saving/error)
    settings.ts   -- Settings with Zod validation + localStorage
    category.ts   -- Category management
    asset.ts      -- Asset management
    ai.ts         -- AI provider abstraction
    theme.ts      -- Theme management
  services/
    export/       -- wechat.ts, xiaohongshu.ts, zhihu.ts, themes.ts, utils.ts
    security/     -- HTML/CSS sanitizer, policy manager
    parser/       -- URL parser, SSRF protection
  views/
    HubView.vue          -- Homepage (Bento grid)
    WorkstationView.vue  -- Editor workspace (4-panel)
    SettingsView.vue     -- Settings
    ThemesView.vue       -- Theme browser
    PublishView.vue      -- Publish workflow
```

### Data Flow

```
Article Creation:
  FileManager → articleStore.addArticle() → Dexie → articleStore.selectArticle()
  → editorStore watches selectedArticleId → loads/creates EditedContent → EditorPanel renders

Preview Rendering:
  editorStore.currentContent.body changes → WorkstationView watch (300ms debounce)
  → convertToPlatform(markdown, platform, options) → previewHtml ref → device-frame render

Export Pipeline (per platform):
  Markdown → marked.parse() → platform converter → DOMPurify → juice (CSS inline) → post-process
```

---

## Workstream Dependencies

```
01-tauri-fix ──────────────────────────────────────┐
02-homepage ───────────────────────────────────────>├─> Integration Testing
03-editor-sync ──> 04-platform-css ──> 08-word ───>│
05-inspector ──────────────────────────────────────>│
06-external-files ─────────────────────────────────>│
07-cloud-encryption ───────────────────────────────>┘
```

---

## Key Technical Decisions

### 1. Preview Rendering Strategy (03)
- Replace 300ms setTimeout debounce with requestAnimationFrame + incremental diff
- Use SharedWorker for heavy markdown parsing to avoid main thread blocking
- Ensure left editor and right preview use exact same CSS pipeline

### 2. Platform CSS Compliance (04)
- WeChat: Most restrictive -- inline styles only, no flex/grid, table-cell layout
- Xiaohongshu: Moderate -- inline styles, no external links, emoji-heavy decoration
- Zhihu: Most permissive -- supports box-shadow, border-radius, external links
- All platforms: Use juice for CSS inlining, DOMPurify for XSS protection

### 3. Cloud Encryption (07)
- AES-256-GCM for content encryption
- Custom .inkforge binary format (header + encrypted payload)
- REST API protocol for self-hosted sync
- ReBAC using Zanzibar-style relation tuples

### 4. Editor Architecture (08)
- TipTap extensions for real-time markdown syntax rendering
- Floating toolbar with Word/Office-style formatting controls
- Typography panel with live CSS application to editor content

---

## Quality Gates

Before each workstream merge:
1. TypeScript strict mode passes (`vue-tsc --noEmit`)
2. ESLint passes (`pnpm lint`)
3. No console.* usage (use logger from @/services/error)
4. Zod validation at all data boundaries
5. No mock data -- all features use real IndexedDB data
6. Platform preview rendering matches actual platform output
7. Tauri build compiles without errors

---

## File Modification Tracking

Each spec document lists:
- Files to CREATE (new files)
- Files to MODIFY (existing files with specific changes)
- Files to DELETE (if any)
- Dependencies to ADD (npm packages)

This ensures no untracked changes across workstreams.
