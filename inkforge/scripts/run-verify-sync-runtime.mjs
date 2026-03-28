import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

async function main() {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'inkforge-sync-verify-'))
  const outfile = path.join(tempDirectory, 'verify-sync-runtime.bundle.mjs')

  try {
    await build({
      entryPoints: [path.join(projectRoot, 'scripts', 'verify-sync-runtime.mjs')],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: ['node22'],
      tsconfig: path.join(projectRoot, 'tsconfig.json'),
      sourcemap: false,
      logLevel: 'silent',
      define: {
        'import.meta.env.DEV': 'false',
        'import.meta.env.PROD': 'true',
        'import.meta.env.MODE': '"production"',
      },
    })

    await import(pathToFileURL(outfile).href)
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
