/**
 * 小红书平台合规规则 (Xiaohongshu Platform Compliance Rules)
 *
 * Pure functions that post-process XHS plain-text engine output to better
 * align with platform conventions:
 *  - Title (≤20 chars) extracted from first line
 *  - Paragraph tightening (default ≤3 lines per paragraph)
 *  - Hashtag composition with hot/niche mix
 *  - Image placeholders with ratio + size hints
 *
 * No DOM. No Markdown parsing. Strings only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SplitTitleAndBodyOptions {
  titleMaxLen?: number
  defaultTitle?: string
}

export interface SplitTitleAndBodyResult {
  title: string
  body: string
  /** number of characters that were chopped off the title and prepended back into body */
  droppedFromTitle: number
}

export interface TightenParagraphsOptions {
  maxLines?: number
}

export interface AppendHashtagsOptions {
  /** When provided, tags already present (case-insensitive) in this set are skipped. */
  dedupAgainst?: Set<string>
  /** Separator between hashtags. Defaults to a single space. */
  separator?: string
}

export interface HashtagCandidate {
  tag: string
  /** 0..1 popularity score */
  popularity: number
}

export interface ComposeHashtagMixOptions {
  /** Number of "hot" tags (popularity ≥ 0.7). Default 2. */
  hot?: number
  /** Number of "niche" tags (popularity < 0.3). Default 2. */
  niche?: number
}

export interface ImagePlaceholderOptions {
  ratio?: '3:4' | '1:1' | '4:3'
  size?: '1080x1440' | '1080x1080' | '1440x1080'
  /** Optional 1-based image index */
  index?: number
}

export interface XhsRuleOptions {
  /** Title settings; pass `false` to skip splitting. */
  title?: SplitTitleAndBodyOptions | false
  /** Paragraph tighten settings; pass `false` to skip. */
  tighten?: TightenParagraphsOptions | false
  /** Hashtag mix configuration. When omitted, defaults are used. */
  hashtagMix?: ComposeHashtagMixOptions
  /** Pre-computed candidate set for composing the hashtag mix. */
  hashtagCandidates?: HashtagCandidate[]
  /** When true, append the composed hashtag block to the body. Default true. */
  appendHashtags?: boolean
  /** Override hashtag append separator. */
  hashtagSeparator?: string
  /** Image placeholders to substitute for `[配图] 见…` lead patterns from the text engine. */
  imagePlaceholders?: ImagePlaceholderOptions[]
}

export interface XhsTextRulesInput {
  text: string
  suggestedTags: string[]
  paragraphs: number
}

export interface XhsTextRulesResult {
  text: string
  title: string
  body: string
  hashtags: string[]
  imageHints: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. splitTitleAndBody
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the first line as title (≤ titleMaxLen, default 20).
 * If the first non-empty line is longer than the limit, attempt to split
 * at the last whitespace position ≤ limit; otherwise hard-cut at limit.
 * The leftover portion is prepended back into the body lead.
 */
export function splitTitleAndBody(
  text: string,
  opts: SplitTitleAndBodyOptions = {}
): SplitTitleAndBodyResult {
  const titleMaxLen = opts.titleMaxLen ?? 20
  const defaultTitle = opts.defaultTitle ?? ''

  if (!text) {
    return { title: defaultTitle, body: '', droppedFromTitle: 0 }
  }

  const lines = text.split('\n')

  // Find the first non-empty line as candidate title.
  let firstIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      firstIdx = i
      break
    }
  }

  if (firstIdx === -1) {
    return { title: defaultTitle, body: '', droppedFromTitle: 0 }
  }

  const candidate = lines[firstIdx].trim()
  const restLines = lines.slice(firstIdx + 1)

  if (candidate.length <= titleMaxLen) {
    const body = restLines.join('\n').replace(/^\n+/, '')
    return { title: candidate, body, droppedFromTitle: 0 }
  }

  // Need to split.
  const window = candidate.slice(0, titleMaxLen)
  const wsMatch = window.match(/\s[^\s]*$/)
  // Whitespace position: index of the whitespace itself.
  let cutAt = -1
  if (wsMatch && wsMatch.index !== undefined && wsMatch.index > 0) {
    cutAt = wsMatch.index
  }

  let title: string
  let leftover: string
  if (cutAt > 0) {
    title = candidate.slice(0, cutAt).trimEnd()
    leftover = candidate.slice(cutAt).trimStart()
  } else {
    title = candidate.slice(0, titleMaxLen)
    leftover = candidate.slice(titleMaxLen)
  }

  const droppedFromTitle = candidate.length - title.length

  // Prepend leftover into body lead.
  const restJoined = restLines.join('\n').replace(/^\n+/, '')
  let body: string
  if (leftover && restJoined) {
    body = leftover + '\n' + restJoined
  } else if (leftover) {
    body = leftover
  } else {
    body = restJoined
  }

  return { title, body, droppedFromTitle }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. tightenParagraphs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-wrap paragraphs so that each paragraph contains at most `maxLines` lines
 * (default 3). Paragraphs are split by blank lines. Markdown-converted ordered
 * list runs (lines starting with "1.", "2.", "①", "02." …) are kept intact.
 */
export function tightenParagraphs(
  text: string,
  opts: TightenParagraphsOptions = {}
): string {
  const maxLines = opts.maxLines ?? 3
  if (!text) return ''
  if (maxLines <= 0) return text

  // Normalize line endings, but preserve consecutive blank lines for paragraph boundaries.
  const normalized = text.replace(/\r\n/g, '\n')

  // Split into paragraphs preserving original blank-line separators.
  const paragraphs = normalized.split(/\n\s*\n/)
  const out: string[] = []

  for (const para of paragraphs) {
    const stripped = para.replace(/^\n+|\n+$/g, '')
    if (!stripped) {
      continue
    }
    const lines = stripped.split('\n')

    if (isOrderedListBlock(lines) || lines.length <= maxLines) {
      out.push(stripped)
      continue
    }

    for (let i = 0; i < lines.length; i += maxLines) {
      const chunk = lines.slice(i, i + maxLines).join('\n')
      if (chunk.trim()) {
        out.push(chunk)
      }
    }
  }

  return out.join('\n\n')
}

const ORDERED_MARKER_RE =
  /^\s*(?:[0-9]{1,3}[.)]|[①-⑳]|[㈠-㈩]|[一二三四五六七八九十]+[、.])\s+/

function isOrderedListBlock(lines: string[]): boolean {
  if (lines.length < 2) return false
  let matches = 0
  for (const line of lines) {
    if (ORDERED_MARKER_RE.test(line)) matches++
  }
  // Treat as ordered list when ≥ half of the lines are ordered markers.
  return matches >= Math.ceil(lines.length / 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. appendHashtagsToBody
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append normalized hashtags (`#xxx`) to the bottom of body.
 * Hashtags must be pre-normalized (caller responsibility).
 * Empty hashtag lists short-circuit (text returned unchanged).
 * Dedupe against `dedupAgainst` (case-insensitive) + tags already present in text.
 */
export function appendHashtagsToBody(
  text: string,
  hashtags: string[],
  opts: AppendHashtagsOptions = {}
): string {
  if (!hashtags || hashtags.length === 0) {
    return text ?? ''
  }
  const separator = opts.separator ?? ' '
  const seen = new Set<string>()

  if (opts.dedupAgainst) {
    for (const t of opts.dedupAgainst) {
      seen.add(t.toLowerCase())
    }
  }

  // Detect hashtags already present in text (#word_or_chinese …).
  const inlineRe = /#[^\s#]+/g
  const inText = text ? text.match(inlineRe) : null
  if (inText) {
    for (const t of inText) seen.add(t.toLowerCase())
  }

  const finalTags: string[] = []
  for (const raw of hashtags) {
    if (!raw) continue
    const tag = raw.startsWith('#') ? raw : `#${raw}`
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    finalTags.push(tag)
  }

  if (finalTags.length === 0) {
    return text ?? ''
  }

  const block = finalTags.join(separator)
  const base = (text ?? '').replace(/\s+$/g, '')
  if (!base) return block
  return `${base}\n\n${block}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. composeHashtagMix
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick `hot` (default 2) tags with popularity ≥ 0.7 and `niche` (default 2)
 * tags with popularity < 0.3. Returned items are normalized `#xxx` strings,
 * deduped, length ≤ hot + niche.
 */
export function composeHashtagMix(
  candidates: HashtagCandidate[],
  opts: ComposeHashtagMixOptions = {}
): string[] {
  const hot = opts.hot ?? 2
  const niche = opts.niche ?? 2
  if (!candidates || candidates.length === 0) return []

  const hotPool = candidates
    .filter(c => c.popularity >= 0.7)
    .sort((a, b) => b.popularity - a.popularity)
  const nichePool = candidates
    .filter(c => c.popularity < 0.3)
    .sort((a, b) => a.popularity - b.popularity)

  const picked: string[] = []
  const seen = new Set<string>()

  const pushTag = (raw: string): boolean => {
    if (!raw) return false
    const trimmed = raw.trim()
    if (!trimmed) return false
    const tag = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    const key = tag.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    picked.push(tag)
    return true
  }

  let hotAdded = 0
  for (const c of hotPool) {
    if (hotAdded >= hot) break
    if (pushTag(c.tag)) hotAdded++
  }

  let nicheAdded = 0
  for (const c of nichePool) {
    if (nicheAdded >= niche) break
    if (pushTag(c.tag)) nicheAdded++
  }

  return picked.slice(0, hot + niche)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. buildImagePlaceholder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a single image placeholder line, e.g.:
 *   `[配图1: 架构图（3:4 @ 1080x1440 推荐）`
 *
 * Used to replace `[配图] 见…` lines emitted by xiaohongshu-text engine.
 */
export function buildImagePlaceholder(
  altText: string,
  opts: ImagePlaceholderOptions = {}
): string {
  const ratio = opts.ratio ?? '3:4'
  const size = opts.size ?? defaultSizeForRatio(ratio)
  const indexLabel = opts.index !== undefined ? String(opts.index) : ''
  const safeAlt = (altText ?? '').trim() || '配图'
  return `[配图${indexLabel}: ${safeAlt}（${ratio} @ ${size} 推荐）`
}

function defaultSizeForRatio(
  ratio: '3:4' | '1:1' | '4:3'
): '1080x1440' | '1080x1080' | '1440x1080' {
  switch (ratio) {
    case '3:4':
      return '1080x1440'
    case '1:1':
      return '1080x1080'
    case '4:3':
      return '1440x1080'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. xhsTextRulesTransform — orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply XHS rules in canonical order on a text-engine artifact.
 *
 * Pipeline:
 *   1. Replace `[配图] 见…` lines with image placeholders
 *   2. Tighten paragraphs to ≤ maxLines lines
 *   3. Split title and body
 *   4. Compose hashtag mix (when candidates given) or use suggestedTags
 *   5. Append hashtags to body
 */
export function xhsTextRulesTransform(
  textArtifact: XhsTextRulesInput,
  options: XhsRuleOptions = {}
): XhsTextRulesResult {
  const sourceText = textArtifact?.text ?? ''
  const imageHints: string[] = []

  // Step 1: image placeholder substitution
  let working = sourceText
  if (options.imagePlaceholders && options.imagePlaceholders.length > 0) {
    const queue = [...options.imagePlaceholders]
    let counter = 1
    working = working.replace(
      /^\[(?:配图|图片|示意图)\][ \t]*见?[ \t]*([^\n]*)$/gm,
      (_match, alt: string) => {
        const altText = alt.trim() || `图${counter}`
        const opts = queue.shift() ?? {}
        const placeholder = buildImagePlaceholder(altText, {
          ratio: opts.ratio ?? '3:4',
          size: opts.size,
          index: opts.index ?? counter,
        })
        imageHints.push(placeholder)
        counter++
        return placeholder
      }
    )
  }

  // Step 2: tighten paragraphs
  if (options.tighten !== false) {
    working = tightenParagraphs(working, options.tighten ?? {})
  }

  // Step 3: split title and body
  let title = ''
  let body = working
  if (options.title !== false) {
    const splitOpts = options.title ?? {}
    const split = splitTitleAndBody(working, splitOpts)
    title = split.title
    body = split.body
  }

  // Step 4: compose hashtags
  let hashtags: string[] = []
  if (options.hashtagCandidates && options.hashtagCandidates.length > 0) {
    hashtags = composeHashtagMix(options.hashtagCandidates, options.hashtagMix)
  } else if (textArtifact.suggestedTags && textArtifact.suggestedTags.length > 0) {
    const seen = new Set<string>()
    for (const raw of textArtifact.suggestedTags) {
      if (!raw) continue
      const tag = raw.startsWith('#') ? raw : `#${raw}`
      const key = tag.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        hashtags.push(tag)
      }
    }
  }

  // Step 5: append hashtags to body
  const append = options.appendHashtags ?? true
  if (append && hashtags.length > 0) {
    body = appendHashtagsToBody(body, hashtags, {
      separator: options.hashtagSeparator,
    })
  }

  // Compose final text: title + blank line + body
  const finalText = title && body ? `${title}\n\n${body}` : title || body

  return {
    text: finalText,
    title,
    body,
    hashtags,
    imageHints,
  }
}
