import {
  buildThemeContext,
  checkWechatSafe,
  SVG_MODULES,
} from './svg-modules'
import type { SvgModuleFamily } from './svg-modules'

export type ApplicationSvgGalleryStatus =
  | 'application-gallery-ready'
  | 'application-gallery-blocked'

export type ApplicationSvgGalleryPersona = (typeof APPLICATION_SVG_GALLERY_PERSONAS)[number]

export const APPLICATION_SVG_GALLERY_PERSONAS = [
  'academic',
  'business',
  'lifestyle',
  'creative',
] as const

export const APPLICATION_SVG_GALLERY_PERSONA_COLORS = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
} as const satisfies Record<ApplicationSvgGalleryPersona, string>

export interface ApplicationSvgGalleryIssue {
  moduleId: string
  family: SvgModuleFamily
  persona: ApplicationSvgGalleryPersona
  issue: string
}

export interface ApplicationSvgGalleryTile {
  moduleId: string
  family: SvgModuleFamily
  description: string
  persona: ApplicationSvgGalleryPersona
  html: string
}

export interface ApplicationSvgGallerySummary {
  svgModuleCount: number
  svgFamilyCount: number
  personaCount: number
  renderedModulePersonaPairs: number
  wechatSafeViolationCount: number
  moduleSentinelFailureCount: number
}

export interface ApplicationSvgGallerySnapshot {
  notProof: true
  scope: 'application-gallery'
  status: ApplicationSvgGalleryStatus
  summary: ApplicationSvgGallerySummary
  issues: readonly ApplicationSvgGalleryIssue[]
  tiles: readonly ApplicationSvgGalleryTile[]
}

export interface ApplicationSvgGalleryReport {
  notProof: true
  scope: 'application-gallery'
  status: ApplicationSvgGalleryStatus
  outputPath: string
  summary: ApplicationSvgGallerySummary
  issues: readonly ApplicationSvgGalleryIssue[]
}

export function escapeApplicationSvgGalleryHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getApplicationSvgGallerySentinelIssues(
  html: string,
  moduleId: string,
): readonly string[] {
  const issues: string[] = []
  if (!html.includes(`data-ink-svg="${moduleId}"`)) {
    issues.push('missing-data-ink-svg-sentinel')
  }
  if (!/<svg\b/i.test(html)) {
    issues.push('missing-inline-svg')
  }
  if (!/viewBox=/i.test(html)) {
    issues.push('missing-viewBox')
  }
  if (!html.includes('width="100%"')) {
    issues.push('missing-responsive-width')
  }

  return issues
}

export function isApplicationSvgGallerySentinelIssue(issue: string): boolean {
  return issue === 'missing-data-ink-svg-sentinel' ||
    issue === 'missing-inline-svg' ||
    issue === 'missing-viewBox' ||
    issue === 'missing-responsive-width'
}

function createSummary(issues: readonly ApplicationSvgGalleryIssue[]): ApplicationSvgGallerySummary {
  const moduleSentinelFailureCount = issues.filter(issue =>
    isApplicationSvgGallerySentinelIssue(issue.issue)
  ).length

  return {
    svgModuleCount: SVG_MODULES.length,
    svgFamilyCount: new Set(SVG_MODULES.map(module => module.family)).size,
    personaCount: APPLICATION_SVG_GALLERY_PERSONAS.length,
    renderedModulePersonaPairs: SVG_MODULES.length * APPLICATION_SVG_GALLERY_PERSONAS.length,
    wechatSafeViolationCount: issues.length - moduleSentinelFailureCount,
    moduleSentinelFailureCount,
  }
}

export function createApplicationSvgGallerySnapshot(): ApplicationSvgGallerySnapshot {
  const tiles: ApplicationSvgGalleryTile[] = []
  const issues: ApplicationSvgGalleryIssue[] = []

  for (const module of SVG_MODULES) {
    for (const persona of APPLICATION_SVG_GALLERY_PERSONAS) {
      try {
        const theme = buildThemeContext({
          primaryColor: APPLICATION_SVG_GALLERY_PERSONA_COLORS[persona],
          persona,
          target: 'wechat',
        })
        const html = module.render({
          theme,
          text: 'InkForge application SVG gallery',
          subtitle: `${module.family} module visual proof`,
          index: 2,
          items: [
            { title: 'Design rule', body: 'WeChat-safe inline SVG subset' },
            { title: 'Application state', body: 'Local renderer output' },
          ],
        })

        tiles.push({
          moduleId: module.id,
          family: module.family,
          description: module.description,
          persona,
          html,
        })

        for (const violation of checkWechatSafe(html)) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue: violation.rule,
          })
        }

        for (const issue of getApplicationSvgGallerySentinelIssues(html, module.id)) {
          issues.push({
            moduleId: module.id,
            family: module.family,
            persona,
            issue,
          })
        }
      } catch (error) {
        issues.push({
          moduleId: module.id,
          family: module.family,
          persona,
          issue: error instanceof Error ? `render-error:${error.message}` : `render-error:${String(error)}`,
        })
      }
    }
  }

  const summary = createSummary(issues)

  return {
    notProof: true,
    scope: 'application-gallery',
    status: issues.length === 0 ? 'application-gallery-ready' : 'application-gallery-blocked',
    summary,
    issues,
    tiles,
  }
}

export function createApplicationSvgGalleryReport(
  snapshot: ApplicationSvgGallerySnapshot,
  outputPath: string,
): ApplicationSvgGalleryReport {
  return {
    notProof: true,
    scope: snapshot.scope,
    status: snapshot.status,
    outputPath,
    summary: snapshot.summary,
    issues: snapshot.issues,
  }
}

export function renderApplicationSvgGalleryHtml(
  snapshot: ApplicationSvgGallerySnapshot,
  options?: { generatedAt?: string },
): string {
  const generatedAt = options?.generatedAt ?? new Date().toISOString()
  const tileMarkup = snapshot.tiles.map(tile => [
    '<article class="gallery-tile">',
    '  <header>',
    `    <p class="eyebrow">${escapeApplicationSvgGalleryHtml(tile.family)} / ${escapeApplicationSvgGalleryHtml(tile.persona)}</p>`,
    `    <h2>${escapeApplicationSvgGalleryHtml(tile.moduleId)}</h2>`,
    `    <p>${escapeApplicationSvgGalleryHtml(tile.description)}</p>`,
    '  </header>',
    '  <div class="wechat-frame">',
    tile.html,
    '  </div>',
    '</article>',
  ].join('\n')).join('\n')

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>InkForge Application SVG Gallery</title>',
    '  <style>',
    '    body { margin: 0; background: #f4efe7; color: #2f2a24; font-family: Georgia, "Times New Roman", serif; }',
    '    main { max-width: 1180px; margin: 0 auto; padding: 36px 20px 64px; }',
    '    .summary { background: #fffaf2; border: 1px solid rgba(90,74,60,.18); border-radius: 20px; padding: 24px; box-shadow: 0 18px 45px rgba(47,42,36,.08); }',
    '    .summary h1 { margin: 0 0 12px; font-size: 30px; letter-spacing: -.02em; }',
    '    .summary p { margin: 8px 0; line-height: 1.7; }',
    '    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 20px; }',
    '    .metric { background: #ffffff; border: 1px solid rgba(90,74,60,.12); border-radius: 14px; padding: 14px; }',
    '    .metric b { display: block; font-size: 24px; color: #5a4a3c; }',
    '    .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 28px; }',
    '    .gallery-tile { background: #fffdf8; border: 1px solid rgba(90,74,60,.16); border-radius: 18px; padding: 18px; box-shadow: 0 12px 30px rgba(47,42,36,.07); }',
    '    .gallery-tile h2 { margin: 4px 0 8px; font-size: 18px; }',
    '    .gallery-tile p { margin: 0; color: rgba(47,42,36,.72); line-height: 1.55; }',
    '    .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; color: #8a6a42 !important; }',
    '    .wechat-frame { width: min(100%, 375px); min-height: 120px; margin: 18px auto 0; padding: 16px; background: #ffffff; border-radius: 14px; border: 1px solid rgba(47,42,36,.10); overflow: hidden; }',
    '    .boundary { margin-top: 24px; font-size: 13px; color: rgba(47,42,36,.72); }',
    '  </style>',
    '</head>',
    '<body>',
    '<main>',
    '  <section class="summary">',
    '    <h1>InkForge Application SVG Gallery</h1>',
    `    <p>Generated at ${escapeApplicationSvgGalleryHtml(generatedAt)} from the live local SVG module registry. This artifact is visual evidence for local application rendering only.</p>`,
    '    <p>It is not WeChat phone preview, account sync, scheduled send, platform preview, public rendering, or publish proof.</p>',
    '    <div class="metrics">',
    `      <div class="metric"><b>${snapshot.summary.svgModuleCount}</b><span>SVG modules</span></div>`,
    `      <div class="metric"><b>${snapshot.summary.svgFamilyCount}</b><span>families</span></div>`,
    `      <div class="metric"><b>${snapshot.summary.personaCount}</b><span>personas</span></div>`,
    `      <div class="metric"><b>${snapshot.summary.renderedModulePersonaPairs}</b><span>rendered pairs</span></div>`,
    `      <div class="metric"><b>${snapshot.summary.wechatSafeViolationCount}</b><span>WeChat-safe violations</span></div>`,
    `      <div class="metric"><b>${snapshot.summary.moduleSentinelFailureCount}</b><span>sentinel failures</span></div>`,
    '    </div>',
    '  </section>',
    '  <section class="gallery">',
    tileMarkup,
    '  </section>',
    '  <p class="boundary">Boundary: local gallery artifact only; XHS/Zhihu publish-side automation remains manually deferred for this round.</p>',
    '</main>',
    '</body>',
    '</html>',
  ].join('\n')
}

export function formatApplicationSvgGalleryReportText(report: ApplicationSvgGalleryReport): string {
  return [
    'InkForge application SVG gallery',
    `status: ${report.status}`,
    `outputPath: ${report.outputPath}`,
    `svgModuleCount: ${report.summary.svgModuleCount}`,
    `svgFamilyCount: ${report.summary.svgFamilyCount}`,
    `personaCount: ${report.summary.personaCount}`,
    `renderedModulePersonaPairs: ${report.summary.renderedModulePersonaPairs}`,
    `wechatSafeViolationCount: ${report.summary.wechatSafeViolationCount}`,
    `moduleSentinelFailureCount: ${report.summary.moduleSentinelFailureCount}`,
    `issues: ${report.issues.length}`,
    '',
    'boundary:',
    '- This is local application visual evidence only.',
    '- It does not prove WeChat phone preview, account sync, scheduled send, public rendering, or publish success.',
    '- XHS/Zhihu publish-side automation remains manually deferred for this round.',
  ].join('\n')
}
