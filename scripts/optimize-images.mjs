// Convert public/images/**/*.{jpg,jpeg,png} to .webp and move the
// originals to image-originals/ at the repo root. Idempotent: files
// that already have a .webp sibling are skipped.
//
// Usage: node scripts/optimize-images.mjs
//
// Settings:
//   - photos (jpg/jpeg): WebP quality 80, max width 2400px (no upscaling)
//   - PNGs:               lossless WebP (preserves transparency for logos)
//   - skips public/images/_unsorted/ (gitignored local scratch)

import sharp from 'sharp';
import { readdir, mkdir, rename, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';

const SRC_ROOT = 'public/images';
const ORIGINALS_ROOT = 'image-originals';
const SKIP_DIRS = new Set(['_unsorted']);
const PHOTO_EXTS = new Set(['.jpg', '.jpeg']);
const PNG_EXTS = new Set(['.png']);
const MAX_WIDTH = 2400;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function webpPathFor(srcPath) {
  return srcPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

async function convertOne(srcPath) {
  const ext = extname(srcPath).toLowerCase();
  const isPhoto = PHOTO_EXTS.has(ext);
  const isPng = PNG_EXTS.has(ext);
  if (!isPhoto && !isPng) return { status: 'unsupported', srcPath };

  const webpPath = webpPathFor(srcPath);
  if (existsSync(webpPath)) return { status: 'skipped', srcPath };

  const rel = relative(SRC_ROOT, srcPath);
  const originalDest = join(ORIGINALS_ROOT, rel);

  await mkdir(dirname(originalDest), { recursive: true });
  await mkdir(dirname(webpPath), { recursive: true });

  const image = sharp(srcPath, { failOn: 'none' });
  const meta = await image.metadata();

  let pipeline = image.rotate(); // honor EXIF orientation, then strip
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  pipeline = isPhoto
    ? pipeline.webp({ quality: 80, effort: 5 })
    : pipeline.webp({ lossless: true, effort: 6 });

  await pipeline.toFile(webpPath);
  await rename(srcPath, originalDest);

  const [origStat, newStat] = await Promise.all([stat(originalDest), stat(webpPath)]);
  return {
    status: 'done',
    srcPath,
    webpPath,
    origSize: origStat.size,
    newSize: newStat.size,
  };
}

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + 'MB';
}

async function main() {
  const results = [];
  for await (const file of walk(SRC_ROOT)) {
    const ext = extname(file).toLowerCase();
    if (!PHOTO_EXTS.has(ext) && !PNG_EXTS.has(ext)) continue;
    try {
      const r = await convertOne(file);
      results.push(r);
    } catch (err) {
      console.error(`ERROR processing ${file}:`, err.message);
      results.push({ status: 'error', srcPath: file, error: err.message });
    }
  }

  let origTotal = 0;
  let newTotal = 0;
  let done = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of results) {
    if (r.status === 'done') {
      origTotal += r.origSize;
      newTotal += r.newSize;
      done++;
      const ratio = ((1 - r.newSize / r.origSize) * 100).toFixed(0);
      console.log(
        `  ${relative(SRC_ROOT, r.srcPath).padEnd(48)}  ${fmtMB(r.origSize).padStart(8)} -> ${fmtMB(r.newSize).padStart(8)}  (-${ratio}%)`,
      );
    } else if (r.status === 'skipped') {
      skipped++;
    } else if (r.status === 'error') {
      errors++;
    }
  }

  console.log('');
  console.log(`Converted: ${done}, skipped: ${skipped}, errors: ${errors}`);
  if (done > 0) {
    const ratio = ((1 - newTotal / origTotal) * 100).toFixed(1);
    console.log(`Total:     ${fmtMB(origTotal)} -> ${fmtMB(newTotal)}  (-${ratio}%)`);
  }
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
