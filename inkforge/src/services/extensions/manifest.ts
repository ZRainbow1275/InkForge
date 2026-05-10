import { z } from 'zod'
import {
  extensionManifestSchema,
  normalizeExtensionOrigin,
  type ExtensionManifest,
  type ExtensionPermission,
} from './types'

export class ExtensionManifestError extends Error {
  readonly issues: z.ZodIssue[]

  constructor(issues: z.ZodIssue[]) {
    super(issues[0]?.message ?? 'Invalid extension manifest')
    this.name = 'ExtensionManifestError'
    this.issues = issues
  }
}

export function parseExtensionManifest(input: unknown): ExtensionManifest {
  const result = extensionManifestSchema.safeParse(input)
  if (!result.success) {
    throw new ExtensionManifestError(result.error.issues)
  }

  return {
    ...result.data,
    permissions: uniqueValues(result.data.permissions),
    commandPermissions: uniqueValues(result.data.commandPermissions),
    configDefaults: cloneStorageValue(result.data.configDefaults),
    networkPolicy: result.data.networkPolicy
      ? {
          allowedOrigins: uniqueValues(
            result.data.networkPolicy.allowedOrigins
              .map(origin => normalizeExtensionOrigin(origin))
              .filter((origin): origin is string => origin !== null),
          ),
        }
      : undefined,
  }
}

export function assertGrantedPermissions(
  declaredPermissions: readonly ExtensionPermission[],
  grantedPermissions: readonly ExtensionPermission[],
): void {
  const declared = new Set(declaredPermissions)
  const missing = grantedPermissions.find(permission => !declared.has(permission))
  if (missing) {
    throw new Error(`Granted permission ${missing} is not declared by the extension manifest`)
  }
}

function uniqueValues<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

function cloneStorageValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}
