const SEMVER_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/

export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '')
}

export function parseSemver(version: string): [number, number, number] | null {
  const match = SEMVER_PATTERN.exec(version.trim())
  if (!match) {
    return null
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a)
  const parsedB = parseSemver(b)

  if (!parsedA || !parsedB) {
    return normalizeVersion(a).localeCompare(normalizeVersion(b), undefined, { numeric: true, sensitivity: 'base' })
  }

  for (let index = 0; index < 3; index += 1) {
    const diff = parsedA[index] - parsedB[index]
    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

export function isVersionGreaterThan(candidate: string, current: string): boolean {
  return compareSemver(candidate, current) > 0
}

export function releaseUrlForVersion(baseUrl: string, version: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedVersion = version.trim().startsWith('v') ? version.trim() : `v${version.trim()}`
  return `${normalizedBase}/tag/${encodeURIComponent(normalizedVersion)}`
}
