import { createServer } from 'node:http'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const REMOTE_MANIFEST_VERSION = 1
const DEFAULT_PORT = 3301
const DEFAULT_TOKEN = 'inkforge-local-sync-token'
const ALLOWED_METHODS = 'GET,POST,OPTIONS'
const ALLOWED_HEADERS = 'Authorization,Content-Type'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')
const configuredDataRoot = process.env.INKFORGE_REST_SYNC_DATA_ROOT?.trim()
const dataRoot = configuredDataRoot
  ? path.resolve(repoRoot, configuredDataRoot)
  : path.resolve(repoRoot, 'server', 'data', 'rest-sync-target')
const manifestPath = path.join(dataRoot, 'manifest.json')
const documentsRoot = path.join(dataRoot, 'documents')

const remoteConflictResolutionSchema = z.object({
  strategy: z.enum(['local-wins', 'remote-wins', 'manual']),
  state: z.enum(['resolved', 'pending']).default('resolved'),
  resolvedAt: z.string().min(1),
  localVersion: z.number().int().min(0),
  remoteVersion: z.number().int().min(0),
  localChecksum: z.string().min(1),
  remoteChecksum: z.string().min(1),
  resolvedVersion: z.number().int().min(0),
  resolvedChecksum: z.string().min(1),
})

const remoteManifestEntrySchema = z.object({
  documentId: z.string().min(1),
  remoteVersion: z.number().int().min(0),
  checksum: z.string().min(1),
  updatedAt: z.string().min(1),
  size: z.number().int().min(0),
  deleted: z.boolean().default(false),
  categoryId: z.string().nullable().optional(),
  title: z.string().optional(),
  resolution: remoteConflictResolutionSchema.optional(),
})

const manifestSchema = z.object({
  version: z.literal(REMOTE_MANIFEST_VERSION),
  updatedAt: z.string().min(1),
  documents: z.record(z.string(), remoteManifestEntrySchema),
})

const pushUpsertSchema = z.object({
  action: z.literal('upsert'),
  documentId: z.string().min(1),
  remoteVersion: z.number().int().min(0),
  checksum: z.string().min(1),
  updatedAt: z.string().min(1),
  title: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  encoding: z.literal('base64'),
  data: z.string().min(1),
})

const pushDeleteSchema = z.object({
  action: z.literal('delete'),
  documentId: z.string().min(1),
  remoteVersion: z.number().int().min(0),
  checksum: z.string().min(1),
  updatedAt: z.string().min(1),
  title: z.string().optional(),
  categoryId: z.string().nullable().optional(),
})

const pushSchema = z.discriminatedUnion('action', [pushUpsertSchema, pushDeleteSchema])

const resolveSchema = z.object({
  documentId: z.string().min(1),
  strategy: z.enum(['local-wins', 'remote-wins', 'manual']),
  localVersion: z.number().int().min(0),
  remoteVersion: z.number().int().min(0),
  localChecksum: z.string().min(1),
  remoteChecksum: z.string().min(1),
  resolvedVersion: z.number().int().min(0),
  resolvedChecksum: z.string().min(1),
  updatedAt: z.string().min(1),
  title: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  deleted: z.boolean().optional(),
  encoding: z.literal('base64').optional(),
  data: z.string().optional(),
})

function nowIso() {
  return new Date().toISOString()
}

function createEmptyManifest() {
  return {
    version: REMOTE_MANIFEST_VERSION,
    updatedAt: nowIso(),
    documents: {},
  }
}

function buildDocumentPath(documentId) {
  return path.join(documentsRoot, `${encodeURIComponent(documentId)}.inkforge`)
}

function createEntry(input) {
  return remoteManifestEntrySchema.parse({
    documentId: input.documentId,
    remoteVersion: input.remoteVersion,
    checksum: input.checksum,
    updatedAt: input.updatedAt,
    size: input.size,
    deleted: input.deleted ?? false,
    categoryId: input.categoryId ?? null,
    title: input.title,
    resolution: input.resolution,
  })
}

function log(level, message, context = {}) {
  const payload = {
    time: nowIso(),
    level,
    message,
    ...context,
  }
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

async function ensureStorage() {
  await mkdir(documentsRoot, { recursive: true })
  try {
    await stat(manifestPath)
  } catch {
    await writeFile(manifestPath, JSON.stringify(createEmptyManifest(), null, 2), 'utf8')
  }
}

async function readManifest() {
  await ensureStorage()
  const raw = await readFile(manifestPath, 'utf8')
  return manifestSchema.parse(JSON.parse(raw))
}

async function writeManifest(manifest) {
  const nextManifest = manifestSchema.parse({
    ...manifest,
    updatedAt: nowIso(),
  })
  await writeFile(manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
  return nextManifest
}

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin
  response.setHeader('Access-Control-Allow-Origin', origin ?? '*')
  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
  response.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
}

function sendJson(request, response, statusCode, payload) {
  setCorsHeaders(request, response)
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function sendNoContent(request, response) {
  setCorsHeaders(request, response)
  response.writeHead(204)
  response.end()
}

function sendError(request, response, statusCode, message) {
  sendJson(request, response, statusCode, { error: message })
}

function isAuthorized(request, expectedToken) {
  return request.headers.authorization === `Bearer ${expectedToken}`
}

async function handlePull(request, response, url) {
  const manifest = await readManifest()
  const documentId = url.searchParams.get('documentId')

  if (!documentId) {
    const documents = Object.values(manifest.documents).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    return sendJson(request, response, 200, { documents })
  }

  const entry = manifest.documents[documentId]
  if (!entry || entry.deleted) {
    return sendError(request, response, 404, 'document not found')
  }

  const filePath = buildDocumentPath(documentId)
  const buffer = await readFile(filePath)
  return sendJson(request, response, 200, { data: buffer.toString('base64') })
}

async function handlePush(request, response) {
  const payload = pushSchema.parse(JSON.parse((await readBody(request)).toString('utf8') || '{}'))
  const manifest = await readManifest()

  if (payload.action === 'delete') {
    await rm(buildDocumentPath(payload.documentId), { force: true })
    const entry = createEntry({
      documentId: payload.documentId,
      remoteVersion: payload.remoteVersion,
      checksum: payload.checksum,
      updatedAt: payload.updatedAt,
      size: 0,
      deleted: true,
      title: payload.title,
      categoryId: payload.categoryId ?? null,
    })
    manifest.documents[payload.documentId] = entry
    await writeManifest(manifest)
    log('info', 'document deleted', { documentId: payload.documentId, remoteVersion: payload.remoteVersion })
    return sendJson(request, response, 200, { document: entry })
  }

  const buffer = Buffer.from(payload.data, 'base64')
  await writeFile(buildDocumentPath(payload.documentId), buffer)
  const entry = createEntry({
    documentId: payload.documentId,
    remoteVersion: payload.remoteVersion,
    checksum: payload.checksum,
    updatedAt: payload.updatedAt,
    size: buffer.byteLength,
    deleted: false,
    title: payload.title,
    categoryId: payload.categoryId ?? null,
  })
  manifest.documents[payload.documentId] = entry
  await writeManifest(manifest)
  log('info', 'document upserted', { documentId: payload.documentId, remoteVersion: payload.remoteVersion, size: buffer.byteLength })
  return sendJson(request, response, 200, { document: entry })
}

async function handleResolve(request, response) {
  const payload = resolveSchema.parse(JSON.parse((await readBody(request)).toString('utf8') || '{}'))
  const manifest = await readManifest()
  const existing = manifest.documents[payload.documentId]

  if (payload.strategy === 'remote-wins') {
    if (!existing) {
      return sendError(request, response, 404, 'remote document not found')
    }
    return sendJson(request, response, 200, { document: existing })
  }

  const deleted = payload.deleted ?? false
  if (deleted) {
    await rm(buildDocumentPath(payload.documentId), { force: true })
  } else if (payload.data) {
    await writeFile(buildDocumentPath(payload.documentId), Buffer.from(payload.data, 'base64'))
  }

  const nextEntry = createEntry({
    documentId: payload.documentId,
    remoteVersion: payload.resolvedVersion,
    checksum: payload.resolvedChecksum,
    updatedAt: payload.updatedAt,
    size: deleted ? 0 : payload.data ? Buffer.from(payload.data, 'base64').byteLength : existing?.size ?? 0,
    deleted,
    title: payload.title ?? existing?.title,
    categoryId: payload.categoryId ?? existing?.categoryId ?? null,
    resolution: {
      strategy: payload.strategy,
      state: payload.strategy === 'manual' ? 'pending' : 'resolved',
      resolvedAt: nowIso(),
      localVersion: payload.localVersion,
      remoteVersion: payload.remoteVersion,
      localChecksum: payload.localChecksum,
      remoteChecksum: payload.remoteChecksum,
      resolvedVersion: payload.resolvedVersion,
      resolvedChecksum: payload.resolvedChecksum,
    },
  })

  manifest.documents[payload.documentId] = nextEntry
  await writeManifest(manifest)
  log('info', 'conflict resolved', { documentId: payload.documentId, strategy: payload.strategy, remoteVersion: payload.resolvedVersion })
  return sendJson(request, response, 200, { document: nextEntry })
}

async function requestHandler(request, response) {
  try {
    if (!request.url || !request.method) {
      return sendError(request, response, 400, 'invalid request')
    }

    if (request.method === 'OPTIONS') {
      return sendNoContent(request, response)
    }

    const port = Number.parseInt(process.env.INKFORGE_REST_SYNC_PORT ?? `${DEFAULT_PORT}`, 10)
    const baseUrl = `http://127.0.0.1:${port}`
    const url = new URL(request.url, baseUrl)

    if (!isAuthorized(request, process.env.INKFORGE_REST_SYNC_TOKEN ?? DEFAULT_TOKEN)) {
      return sendError(request, response, 401, 'unauthorized')
    }

    if (request.method === 'GET' && url.pathname === '/pull') {
      return await handlePull(request, response, url)
    }

    if (request.method === 'POST' && url.pathname === '/push') {
      return await handlePush(request, response)
    }

    if (request.method === 'POST' && url.pathname === '/resolve') {
      return await handleResolve(request, response)
    }

    if (request.method === 'GET' && url.pathname === '/status') {
      const manifest = await readManifest()
      return sendJson(request, response, 200, {
        ok: true,
        manifestVersion: manifest.version,
        documentCount: Object.keys(manifest.documents).length,
      })
    }

    return sendError(request, response, 404, 'not found')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendJson(request, response, 400, {
        error: 'validation failed',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const message = error instanceof Error ? error.message : 'internal server error'
    log('error', 'request failed', { message })
    return sendError(request, response, 500, message)
  }
}

async function main() {
  await ensureStorage()

  const port = Number.parseInt(process.env.INKFORGE_REST_SYNC_PORT ?? `${DEFAULT_PORT}`, 10)
  const token = process.env.INKFORGE_REST_SYNC_TOKEN ?? DEFAULT_TOKEN

  const server = createServer((request, response) => {
    void requestHandler(request, response)
  })

  server.listen(port, '127.0.0.1', () => {
    log('info', 'rest sync target ready', {
      port,
      url: `http://127.0.0.1:${port}`,
      tokenHint: `${token.slice(0, 4)}...${token.slice(-4)}`,
      dataRoot,
    })
  })
}

void main()
