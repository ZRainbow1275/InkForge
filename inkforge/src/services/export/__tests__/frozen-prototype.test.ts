/**
 * @vitest-environment happy-dom
 *
 * Regression: Tauri freezePrototype ↔ juice/cheerio compatibility.
 *
 * Background
 * ----------
 * Tauri 1.x's `freezePrototype: true` injects `Object.freeze(Object.prototype)`
 * at document-start before any application JavaScript runs (see
 * `.trellis/tasks/05-26-fix-tauri-freezeprototype-breaks-juice-cheerio-runtime/research/tauri-freezeprototype-semantics.md`).
 * `cheerio@1.0.0` (pulled in by `juice`) crashes on its own module init because
 * `dist/browser/cheerio.js:57` does
 *
 *     Object.assign(Cheerio.prototype, Attributes, Traversing, Manipulation, Css, Forms, Extract)
 *
 * where `Manipulation` exports a function named `toString`. With a frozen
 * `Object.prototype`, the strict-mode `[[Set]]` walks the prototype chain,
 * finds the non-writable ancestor descriptor, and throws
 * `TypeError: Cannot assign to read only property 'toString'`. Every static
 * import of `@/services/export` therefore detonates the trap.
 *
 * Fix (PR1): `tauri.conf.json` `security.freezePrototype` is set to `false`,
 * which matches the Tauri 1.0.0-rc.3 default since Feb 2022. The webview no
 * longer injects the freeze script, so the cheerio module evaluation completes
 * normally and every subsequent `juice(...)` call (which calls `cheerio.load`
 * internally) is safe.
 *
 * What this test guarantees
 * -------------------------
 * After PR1, production Tauri webviews never freeze `Object.prototype` at all.
 * The remaining hazard surface is therefore *runtime* — every per-call
 * `cheerio.load(...)` invocation inside `juice(...)` re-runs prototype-touching
 * code on each export. This test simulates the worst credible production
 * scenario: barrel loaded normally (mirroring Approach A's runtime state),
 * primordials frozen by some later actor, then `convertToWechat /
 * convertToXiaohongshu / convertToZhihu` invoked. We assert none of those calls
 * throw, which would be the regression shape if a future dependency upgrade
 * (cheerio, juice, mermaid sub-tree) re-introduced the inherited `toString`
 * write pattern in the *call path* rather than the module-init path.
 *
 * The two `describe` blocks differ only in scope:
 *   - PRIMARY: freezes `Object.prototype` only (Tauri 1.x shape).
 *   - DEFENSE-IN-DEPTH: also freezes `Array.prototype` + `Function.prototype`
 *     (NOT what Tauri does today — guards against future widened freezes and
 *     against mermaid sub-deps that mutate `Function`-instance toString).
 *
 * Top-level imports are intentionally restricted to vitest helpers and types.
 * The export barrel is loaded via dynamic `import()` inside `beforeAll` so the
 * freeze gate is applied between module load and the first runtime call.
 */

import { beforeAll, describe, expect, it } from 'vitest'
// Vite's `?raw` query loads the file contents as a string at test time. This
// avoids pulling `@types/node` into the project's strict frontend tsconfig
// just so the config guard below can read `tauri.conf.json` from disk.
import tauriConfRaw from '../../../../src-tauri/tauri.conf.json?raw'
import type {
  ExportPreset,
  Platform,
} from '../types'

// ─── Fixtures (typed) ────────────────────────────────────────────────

interface FrozenPrototypeFixture {
  readonly id: 'minimal' | 'rich'
  readonly markdown: string
}

const MINIMAL_FIXTURE: FrozenPrototypeFixture = {
  id: 'minimal',
  markdown: '# hello\n\nworld',
}

// Rich fixture exercises three rendering paths that historically pull deeper
// into juice/cheerio internals: tables, fenced code blocks, and inline math.
const RICH_FIXTURE: FrozenPrototypeFixture = {
  id: 'rich',
  markdown: [
    '# Frozen Prototype Regression',
    '',
    '正文段落用于触发 marked + dompurify + juice 链路。',
    '',
    '## 表格',
    '',
    '| 平台 | 原生格式 | 状态 |',
    '| --- | --- | --- |',
    '| 微信 | HTML | 已支持 |',
    '| 小红书 | 文本 | 已支持 |',
    '| 知乎 | Markdown | 已支持 |',
    '',
    '## 代码块',
    '',
    '```ts',
    'const frozen = Object.isFrozen(Object.prototype)',
    'export function isSafe(): boolean { return frozen }',
    '```',
    '',
    '## 行内公式',
    '',
    '当 $x$ 等于 1 时，$x^2$ 仍然等于 1。',
    '',
  ].join('\n'),
}

const FIXTURES: ReadonlyArray<FrozenPrototypeFixture> = [MINIMAL_FIXTURE, RICH_FIXTURE]

// ─── Typed barrel surface ────────────────────────────────────────────

interface ExportBarrel {
  convertToWechat: (
    html: string,
    preset: ExportPreset,
    options?: Record<string, unknown>,
  ) => string
  convertToXiaohongshu: (html: string, presetId?: string) => string
  convertToZhihu: (html: string, presetId?: string) => string
  getDefaultPreset: () => ExportPreset
}

interface PlatformProbe {
  readonly platform: Platform
  readonly run: (html: string, barrel: ExportBarrel) => string
}

const PLATFORM_PROBES: ReadonlyArray<PlatformProbe> = [
  {
    platform: 'wechat',
    run: (html, barrel) => barrel.convertToWechat(html, barrel.getDefaultPreset()),
  },
  {
    platform: 'xiaohongshu',
    run: (html, barrel) => barrel.convertToXiaohongshu(html),
  },
  {
    platform: 'zhihu',
    run: (html, barrel) => barrel.convertToZhihu(html),
  },
]

async function loadExportBarrel(): Promise<ExportBarrel> {
  const mod = await import('@/services/export')
  return {
    convertToWechat: mod.convertToWechat,
    convertToXiaohongshu: mod.convertToXiaohongshu,
    convertToZhihu: mod.convertToZhihu,
    getDefaultPreset: mod.getDefaultPreset,
  }
}

async function markdownToHtml(markdown: string): Promise<string> {
  const { marked } = await import('marked')
  marked.use({ breaks: true, gfm: true })
  const result = await marked.parse(markdown)
  return typeof result === 'string' ? result : String(result)
}

// ─── Config-level regression guard ──────────────────────────────────
//
// Without this gate, a future contributor can flip
// `tauri.conf.json:security.freezePrototype` back to `true` and reintroduce
// the P0 webview crash silently — none of the runtime tests below would catch
// it because vitest does not load the Tauri injection script. This test reads
// the real config file from disk and asserts the production value.

describe('frozen-prototype regression (config guard: tauri.conf.json)', () => {
  it('tauri.conf.json security.freezePrototype must be false (P0 regression guard)', () => {
    const cfg = JSON.parse(tauriConfRaw) as {
      tauri?: { security?: { freezePrototype?: boolean } }
    }
    expect(cfg.tauri?.security?.freezePrototype).toBe(false)
  })

  it('keeps Tauri script CSP hardening while allowing sanitized runtime preview styles', () => {
    const cfg = JSON.parse(tauriConfRaw) as {
      tauri?: {
        security?: {
          csp?: string
          dangerousDisableAssetCspModification?: boolean | string[]
        }
      }
    }
    const security = cfg.tauri?.security

    expect(security?.dangerousDisableAssetCspModification).toEqual(['style-src'])
    expect(security?.csp).toMatch(/\bscript-src\s+'self'\s*;/)
    expect(security?.csp).not.toMatch(/\bscript-src\b[^;]*'unsafe-(?:inline|eval)'/)
    expect(security?.csp).toMatch(/\bstyle-src\b[^;]*'unsafe-inline'/)
  })
})

// ─── PRIMARY: Object.prototype frozen at runtime (real Tauri shape) ──

describe('frozen-prototype regression (PRIMARY: Object.prototype frozen at runtime)', () => {
  let barrel: ExportBarrel

  beforeAll(async () => {
    // Step 1: Load the barrel against writable prototypes — mirrors the
    // post-PR1 production state where `freezePrototype: false` means Tauri
    // never injects the freeze script, so cheerio's module-init `Object.assign`
    // completes normally.
    barrel = await loadExportBarrel()

    // Step 2: Freeze Object.prototype AFTER module init. This isolates the
    // per-call hazard (`juice(...)` → `cheerio.load(...)` running on every
    // export) from the module-init hazard. If a future dependency starts
    // writing `toString` on a per-call basis, this gate will trip.
    if (!Object.isFrozen(Object.prototype)) {
      Object.freeze(Object.prototype)
    }
  })

  it('Object.prototype is frozen before any convert() call', () => {
    expect(Object.isFrozen(Object.prototype)).toBe(true)
  })

  it('export barrel resolved without throwing during module init', () => {
    expect(barrel).toBeTruthy()
    expect(typeof barrel.convertToWechat).toBe('function')
    expect(typeof barrel.convertToXiaohongshu).toBe('function')
    expect(typeof barrel.convertToZhihu).toBe('function')
  })

  for (const fixture of FIXTURES) {
    for (const probe of PLATFORM_PROBES) {
      it(`${probe.platform} convert does not throw on ${fixture.id} fixture`, async () => {
        const html = await markdownToHtml(fixture.markdown)

        let output = ''
        expect(() => {
          output = probe.run(html, barrel)
        }).not.toThrow()

        // Real export functions return a non-trivial HTML string; never the
        // empty fallback that would indicate a silent failure inside juice.
        expect(typeof output).toBe('string')
        expect(output.length).toBeGreaterThan(0)
      })
    }
  }
})

// ─── DEFENSE-IN-DEPTH: also freeze Array + Function prototypes ───────
//
// NOTE: this is NOT what Tauri 1.x does today. Tauri freezes only
// `Object.prototype`. We freeze `Array.prototype` and `Function.prototype`
// here as a forward-looking guard against future dependencies (notably the
// mermaid sub-tree: lodash-es / dayjs / d3 / cytoscape) that write `toString`
// onto Function instances and would trip the same chain rule if a future
// hardening pass widens the freeze. If this block starts failing while the
// PRIMARY block passes, treat that as advance warning, not as a Tauri-shaped
// regression.

describe('frozen-prototype regression (defense-in-depth: Object + Array + Function frozen at runtime)', () => {
  let barrel: ExportBarrel

  beforeAll(async () => {
    barrel = await loadExportBarrel()
    if (!Object.isFrozen(Object.prototype)) {
      Object.freeze(Object.prototype)
    }
    if (!Object.isFrozen(Array.prototype)) {
      Object.freeze(Array.prototype)
    }
    if (!Object.isFrozen(Function.prototype)) {
      Object.freeze(Function.prototype)
    }
  })

  it('all three primordial prototypes are frozen', () => {
    expect(Object.isFrozen(Object.prototype)).toBe(true)
    expect(Object.isFrozen(Array.prototype)).toBe(true)
    expect(Object.isFrozen(Function.prototype)).toBe(true)
  })

  for (const fixture of FIXTURES) {
    for (const probe of PLATFORM_PROBES) {
      it(`${probe.platform} convert still succeeds on ${fixture.id} fixture`, async () => {
        const html = await markdownToHtml(fixture.markdown)

        let output = ''
        expect(() => {
          output = probe.run(html, barrel)
        }).not.toThrow()

        expect(typeof output).toBe('string')
        expect(output.length).toBeGreaterThan(0)
      })
    }
  }
})
