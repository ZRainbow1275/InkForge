type SourceMapPosition = {
  source: string | null
  line: number | null
  column: number | null
  name: string | null
}

type SourceMapJson = {
  version: number
  sources: string[]
  names: string[]
  mappings: string
  file?: string
  sourcesContent?: string[]
}

export const sep = '/'
export const delimiter = ':'

export function isAbsolute(value: string): boolean {
  return /^(?:[a-z]+:)?\//i.test(value)
}

export function normalize(value: string): string {
  return value.replace(/\\+/g, '/').replace(/\/+/g, '/')
}

export function join(...parts: string[]): string {
  return normalize(parts.filter(Boolean).join('/'))
}

export function resolve(...parts: string[]): string {
  const joined = join(...parts)
  return isAbsolute(joined) ? joined : `/${joined}`
}

export function dirname(value: string): string {
  const normalized = normalize(value)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '/' : normalized.slice(0, index)
}

export function relative(from: string, to: string): string {
  const fromParts = normalize(from).split('/').filter(Boolean)
  const toParts = normalize(to).split('/').filter(Boolean)

  while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
    fromParts.shift()
    toParts.shift()
  }

  return [...fromParts.map(() => '..'), ...toParts].join('/') || ''
}

export function existsSync(): boolean {
  return false
}

export function readFileSync(): string {
  return ''
}

export function fileURLToPath(value: string | URL): string {
  const url = value instanceof URL ? value : new URL(String(value))
  return decodeURIComponent(url.pathname)
}

export function pathToFileURL(value: string): URL {
  const normalized = normalize(value).replace(/^\/+/, '')
  return new URL(`file:///${encodeURI(normalized)}`)
}

export class SourceMapConsumer {
  static async with<T>(_rawSourceMap: unknown, _sourceMapUrl: unknown, callback: (consumer: SourceMapConsumer) => T | Promise<T>): Promise<T> {
    const consumer = new SourceMapConsumer()
    return callback(consumer)
  }

  originalPositionFor(): SourceMapPosition {
    return { source: null, line: null, column: null, name: null }
  }

  generatedPositionFor(): { line: null; column: null; lastColumn: null } {
    return { line: null, column: null, lastColumn: null }
  }

  eachMapping(): void {
    // Source maps are not used by Inkforge browser runtime sanitizers.
  }

  destroy(): void {
    // Compatibility no-op for source-map-js consumers.
  }
}

export class SourceMapGenerator {
  private readonly map: SourceMapJson = {
    version: 3,
    sources: [],
    names: [],
    mappings: '',
  }

  addMapping(): void {
    // Browser runtime does not emit source maps.
  }

  setSourceContent(source: string, content: string): void {
    this.map.sources.push(source)
    this.map.sourcesContent = [...(this.map.sourcesContent ?? []), content]
  }

  toJSON(): SourceMapJson {
    return this.map
  }

  toString(): string {
    return JSON.stringify(this.toJSON())
  }
}

export class SourceNode {
  toString(): string {
    return ''
  }

  toStringWithSourceMap(): { code: string; map: SourceMapGenerator } {
    return { code: '', map: new SourceMapGenerator() }
  }
}

export default {
  sep,
  delimiter,
  isAbsolute,
  normalize,
  join,
  resolve,
  dirname,
  relative,
  existsSync,
  readFileSync,
  fileURLToPath,
  pathToFileURL,
  SourceMapConsumer,
  SourceMapGenerator,
  SourceNode,
}
