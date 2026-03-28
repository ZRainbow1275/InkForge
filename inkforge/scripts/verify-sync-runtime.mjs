import assert from 'node:assert/strict'
import { createResolvedRemoteManifestEntry } from '../src/services/sync/adapters/shared.ts'
import { validateFormat, serializeDocument, deserializeDocument } from '../src/services/sync/format.ts'
import { deriveKeyFromPassword, generateSalt } from '../src/services/sync/key-derivation.ts'

const DOCUMENT_ID = '11111111-1111-4111-8111-111111111111'
const PASSWORD = 'inkforge-sync-runtime-check'

async function verifyEncryptionRoundTrip() {
  const passwordSalt = generateSalt()
  const masterKey = await deriveKeyFromPassword(PASSWORD, passwordSalt)
  const wrongKey = await deriveKeyFromPassword(`${PASSWORD}-wrong`, passwordSalt)

  const input = {
    title: 'Sync Runtime Verification',
    body: '# Runtime Check\n\nThe quick red fox jumps over the lazy dog.',
    tags: ['sync', 'runtime'],
    category: 'verification',
    documentId: DOCUMENT_ID,
  }

  const encrypted = await serializeDocument(input, masterKey)
  const validation = validateFormat(encrypted)
  assert.equal(validation.valid, true, `Expected .inkforge payload to be valid, got: ${validation.error ?? 'unknown error'}`)

  const { metadata, body } = await deserializeDocument(encrypted, masterKey)
  assert.equal(body, input.body)
  assert.equal(metadata.title, input.title)
  assert.equal(metadata.documentId, input.documentId)
  assert.equal(metadata.category, input.category)
  assert.deepEqual(metadata.tags, input.tags)

  let rejectedByWrongKey = false
  try {
    await deserializeDocument(encrypted, wrongKey)
  } catch {
    rejectedByWrongKey = true
  }

  assert.equal(rejectedByWrongKey, true, 'Decrypting with a wrong key should fail')

  return {
    validFormat: validation.valid,
    encryptedBytes: encrypted.byteLength,
    rejectedByWrongKey,
  }
}

function verifyResolvedManifestEntries() {
  const currentRemoteEntry = {
    documentId: DOCUMENT_ID,
    remoteVersion: 4,
    checksum: 'remote-checksum',
    updatedAt: '2026-03-24T12:00:00.000Z',
    size: 12,
    deleted: false,
    title: 'Remote Snapshot',
    categoryId: 'sync',
  }

  const localWinsEntry = createResolvedRemoteManifestEntry({
    documentId: DOCUMENT_ID,
    strategy: 'local-wins',
    localVersion: 6,
    remoteVersion: 4,
    localChecksum: 'local-checksum',
    remoteChecksum: 'remote-checksum',
    resolvedVersion: 6,
    resolvedChecksum: 'local-checksum',
    updatedAt: '2026-03-24T12:30:00.000Z',
    title: 'Local Snapshot',
    categoryId: 'sync',
    deleted: false,
    data: new TextEncoder().encode('local payload').buffer,
  }, currentRemoteEntry)

  assert.equal(localWinsEntry.remoteVersion, 6)
  assert.equal(localWinsEntry.checksum, 'local-checksum')
  assert.equal(localWinsEntry.size, 13)
  assert.equal(localWinsEntry.deleted, false)
  assert.equal(localWinsEntry.title, 'Local Snapshot')
  assert.equal(localWinsEntry.resolution?.strategy, 'local-wins')
  assert.equal(localWinsEntry.resolution?.state, 'resolved')
  assert.equal(localWinsEntry.resolution?.resolvedVersion, 6)

  const remoteWinsEntry = createResolvedRemoteManifestEntry({
    documentId: DOCUMENT_ID,
    strategy: 'remote-wins',
    localVersion: 6,
    remoteVersion: 4,
    localChecksum: 'local-checksum',
    remoteChecksum: 'remote-checksum',
    resolvedVersion: 4,
    resolvedChecksum: 'remote-checksum',
    updatedAt: '2026-03-24T12:30:00.000Z',
    title: 'Local Snapshot',
    categoryId: 'sync',
    deleted: false,
  }, currentRemoteEntry)

  assert.equal(remoteWinsEntry.remoteVersion, currentRemoteEntry.remoteVersion)
  assert.equal(remoteWinsEntry.checksum, currentRemoteEntry.checksum)
  assert.equal(remoteWinsEntry.title, currentRemoteEntry.title)
  assert.equal(remoteWinsEntry.resolution?.strategy, 'remote-wins')
  assert.equal(remoteWinsEntry.resolution?.state, 'resolved')
  assert.equal(remoteWinsEntry.resolution?.resolvedChecksum, 'remote-checksum')

  const manualEntry = createResolvedRemoteManifestEntry({
    documentId: DOCUMENT_ID,
    strategy: 'manual',
    localVersion: 6,
    remoteVersion: 4,
    localChecksum: 'local-checksum',
    remoteChecksum: 'remote-checksum',
    resolvedVersion: 6,
    resolvedChecksum: 'local-checksum',
    updatedAt: '2026-03-24T12:30:00.000Z',
    title: 'Manual Snapshot',
    categoryId: 'sync',
    deleted: false,
  }, currentRemoteEntry)

  assert.equal(manualEntry.remoteVersion, currentRemoteEntry.remoteVersion)
  assert.equal(manualEntry.resolution?.strategy, 'manual')
  assert.equal(manualEntry.resolution?.state, 'pending')

  return {
    localWinsRemoteVersion: localWinsEntry.remoteVersion,
    remoteWinsRemoteVersion: remoteWinsEntry.remoteVersion,
    manualState: manualEntry.resolution?.state,
  }
}

async function main() {
  const encryption = await verifyEncryptionRoundTrip()
  const manifestResolution = verifyResolvedManifestEntries()

  console.log(JSON.stringify({
    ok: true,
    encryption,
    manifestResolution,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
