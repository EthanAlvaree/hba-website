// One-off: convert image-originals/pci/**/*.{jpg,jpeg,png} →
// public/images/pci/**/*.webp. Idempotent — skips files that already
// have a webp sibling at the target. Photos are lossy q80, max width
// 2000px; PNGs are lossless (preserves transparency).
//
// Run: node scripts/convert-pci-originals.mjs

import sharp from "sharp"
import { readdir, mkdir, stat } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join, relative, dirname, extname } from "node:path"

const SRC_ROOT = "image-originals/pci"
const DST_ROOT = "public/images/pci"
const PHOTO_EXTS = new Set([".jpg", ".jpeg"])
const PNG_EXTS = new Set([".png"])
const MAX_WIDTH = 2000

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === "ENOENT") return
    throw err
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

async function convertOne(srcPath) {
  const ext = extname(srcPath).toLowerCase()
  const isPhoto = PHOTO_EXTS.has(ext)
  const isPng = PNG_EXTS.has(ext)
  if (!isPhoto && !isPng) return { status: "skip-unsupported", srcPath }

  const rel = relative(SRC_ROOT, srcPath)
  const webpRel = rel.replace(/\.(jpg|jpeg|png)$/i, ".webp")
  const dstPath = join(DST_ROOT, webpRel)

  if (existsSync(dstPath)) return { status: "exists", srcPath }

  await mkdir(dirname(dstPath), { recursive: true })

  let pipeline = sharp(srcPath)
  const meta = await pipeline.metadata()
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
  }

  if (isPhoto) pipeline = pipeline.webp({ quality: 80 })
  else pipeline = pipeline.webp({ lossless: true })

  await pipeline.toFile(dstPath)
  const after = await stat(dstPath)
  return { status: "converted", srcPath, dstPath, bytes: after.size }
}

const results = { converted: [], exists: [], skipped: [] }
for await (const f of walk(SRC_ROOT)) {
  const r = await convertOne(f)
  if (r.status === "converted") results.converted.push(r)
  else if (r.status === "exists") results.exists.push(r)
  else results.skipped.push(r)
}

console.log(`✓ converted: ${results.converted.length}`)
for (const r of results.converted) {
  const kb = (r.bytes / 1024).toFixed(0)
  console.log(`  ${r.dstPath}  (${kb} KB)`)
}
console.log(`= already exists (skipped): ${results.exists.length}`)
console.log(`~ unsupported: ${results.skipped.length}`)
