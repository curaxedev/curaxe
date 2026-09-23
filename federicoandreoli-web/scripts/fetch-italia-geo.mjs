/**
 * Downloads geographic JSON used by the profile directory search.
 * Source: https://github.com/dakk/Italia.json (italia_comuni.json).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'data')
const outFile = join(outDir, 'italia-comuni.json')
const url =
  'https://raw.githubusercontent.com/dakk/Italia.json/master/italia_comuni.json'

const res = await fetch(url)
if (!res.ok) {
  throw new Error(`Fetch failed ${res.status}: ${url}`)
}
const buf = Buffer.from(await res.arrayBuffer())
mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, buf)
console.log(`Wrote ${outFile} (${buf.length} bytes)`)
