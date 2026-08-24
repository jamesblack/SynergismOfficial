// @ts-check

// Assembles the deployable web root into `public/`.
//
// index.html lives at the repository root and references ./dist/out.js, Pictures/,
// translations/ and Synergism.css relative to itself, so the document root is the
// repository root. Serving the repository directly would expose src/, node_modules/,
// electron/ and friends, so the files that belong on the web are copied into a
// dedicated directory instead. Mirrors the "Prepare for deploy" step of
// .github/workflows/deploy-ghpages.yml.

import { cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public')

// dist/ is copied file by file so that only the bundle reaches the web root, and
// never anything else a local build happens to leave in the directory.
const entries = [
  'dist/out.js',
  'Pictures',
  'translations',
  'index.html',
  'Synergism.css',
  'favicon.ico'
]

const missing = (await Promise.all(entries.map(async (entry) => await exists(path.join(root, entry)) ? null : entry)))
  .filter((entry) => entry !== null)

if (missing.length > 0) {
  throw new Error(
    `Cannot assemble ${outDir}: ${missing.join(', ')} does not exist. Run \`npm run build:esbuild\` first.`
  )
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

await Promise.all(entries.map(async (entry) => {
  const destination = path.join(outDir, entry)

  await mkdir(path.dirname(destination), { recursive: true })
  await cp(path.join(root, entry), destination, { recursive: true })
  console.log('\x1b[32m%s\x1b[0m', `copied ${entry}`)
}))

console.log(`\nWeb root assembled at ${outDir}`)

/** @param {string} target */
async function exists (target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}
