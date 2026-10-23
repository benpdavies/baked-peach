#!/usr/bin/env node
// Imports photos into the site: reads the EXIF capture date, scales each photo
// down to a MAX_EDGE master as a high-quality JPEG (converting HEIC, which
// Photos.app exports by default and Astro's image pipeline can't decode), and
// writes the matching src/content/photos/<slug>.md entry. Full-size camera
// files stay in Photos.app (or the source folder) — they're too big to keep in git.
//
// Usage:
//   npm run add-photos                  select photos in Photos.app first, then run this
//   npm run add-photos -- <folder>      import already-exported images from a folder instead
//   npm run add-photos -- --location "Watamu, Kenya"   also set the location on every photo imported
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'src/assets/photos');
const CONTENT_DIR = path.join(ROOT, 'src/content/photos');
const APPLESCRIPT = path.join(__dirname, 'export-selection.applescript');

const IMAGE_EXTENSIONS = new Set(['.heic', '.heif', '.jpg', '.jpeg', '.png', '.tif', '.tiff']);

// Longest edge of the master committed to git. The site serves at most 2560px
// (lightbox), so this leaves headroom for larger sizes later without storing
// the camera's full 16MP+ file.
const MAX_EDGE = 3840;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

async function existingSlugs() {
  const slugs = new Set();
  for (const dir of [ASSETS_DIR, CONTENT_DIR]) {
    for (const entry of await readdir(dir).catch(() => [])) {
      slugs.add(path.basename(entry, path.extname(entry)));
    }
  }
  return slugs;
}

// Local wall-clock time as `YYYY-MM-DDTHH:MM:SS`, so the camera's own time is
// kept as-is (no timezone shift).
function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function getCaptureDate(filePath) {
  try {
    // Read into a buffer rather than handing exifr the path directly — its
    // built-in chunked file reader is broken on current Node (throws
    // ERR_INVALID_ARG_TYPE from fs/promises), which silently fell back to
    // file mtime (i.e. "today") for every photo.
    const buffer = await readFile(filePath);
    const tags = await exifr.parse(buffer, ['DateTimeOriginal', 'CreateDate']);
    const date = tags?.DateTimeOriginal ?? tags?.CreateDate;
    if (date instanceof Date && !Number.isNaN(date.valueOf())) return { date, fromExif: true };
  } catch {
    // Fall through to file mtime below — not every image has EXIF.
  }
  return { date: (await stat(filePath)).mtime, fromExif: false };
}

// Writes `file` to `destImage` as a JPEG no larger than MAX_EDGE, keeping EXIF
// and the colour profile. JPEGs already within MAX_EDGE are copied untouched to
// avoid a needless re-encode.
async function writeMaster(file, destImage, scratchDir) {
  const ext = path.extname(file).toLowerCase();
  let source = file;
  if (ext === '.heic' || ext === '.heif') {
    // sharp's prebuilt binaries can't decode HEIC; sips converts it losslessly to TIFF first.
    source = path.join(scratchDir, `${path.basename(file, ext)}.tiff`);
    execFileSync('sips', ['-s', 'format', 'tiff', file, '--out', source], { stdio: 'ignore' });
  }
  const { width, height, orientation } = await sharp(source).metadata();
  const isJpeg = ext === '.jpg' || ext === '.jpeg';
  if (isJpeg && Math.max(width, height) <= MAX_EDGE && (orientation ?? 1) === 1) {
    await copyFile(source, destImage);
  } else {
    await sharp(source)
      .rotate() // apply the EXIF orientation to the pixels
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .keepExif()
      .keepIccProfile()
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(destImage);
  }
  if (source !== file) await rm(source, { force: true });
}

async function exportSelectionFromPhotos(destDir) {
  console.log('Exporting the current selection from Photos.app…');
  try {
    execFileSync('osascript', [APPLESCRIPT, destDir], { stdio: 'inherit' });
  } catch {
    throw new Error(
      'Could not export from Photos.app. Make sure Photos is open with photos selected, and that ' +
        'your terminal is allowed to control Photos (System Settings → Privacy & Security → Automation).'
    );
  }
}

async function main() {
  await mkdir(ASSETS_DIR, { recursive: true });
  await mkdir(CONTENT_DIR, { recursive: true });

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { location: { type: 'string', short: 'l' } },
  });
  const location = values.location?.trim();
  let sourceDir = positionals[0] ? path.resolve(positionals[0]) : null;
  let tempDir = null;

  if (!sourceDir) {
    tempDir = await mkdtemp(path.join(tmpdir(), 'baked-peach-photos-'));
    await exportSelectionFromPhotos(tempDir);
    sourceDir = tempDir;
  }

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(sourceDir, entry.name));

  if (files.length === 0) {
    console.log('No images found to import.');
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
    return;
  }

  const slugs = await existingSlugs();
  const scratchDir = await mkdtemp(path.join(tmpdir(), 'baked-peach-convert-'));
  const added = [];

  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const slugBase = slugify(base) || 'photo';
    let slug = slugBase;
    let n = 2;
    while (slugs.has(slug)) slug = `${slugBase}-${n++}`;
    slugs.add(slug);

    const ext = path.extname(file).toLowerCase();
    const destExt = ext === '.jpeg' ? ext : '.jpg';
    const destImage = path.join(ASSETS_DIR, `${slug}${destExt}`);

    const { date, fromExif } = await getCaptureDate(file);
    const dateString = formatDate(date);

    await writeMaster(file, destImage, scratchDir);

    const frontmatter = [
      '---',
      `title: ${titleCase(slug)}`,
      `date: ${dateString}`,
      // JSON strings are valid YAML, so this quotes commas and colons safely.
      ...(location ? [`location: ${JSON.stringify(location)}`] : []),
      `image: ../../assets/photos/${slug}${destExt}`,
      '---',
      '',
    ].join('\n');
    await writeFile(path.join(CONTENT_DIR, `${slug}.md`), frontmatter);

    added.push({ slug, dateString, fromExif });
  }

  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  await rm(scratchDir, { recursive: true, force: true });

  // The site orders photos newest first by date — match that here.
  added.sort((a, b) => b.dateString.localeCompare(a.dateString));
  console.log(`\nAdded ${added.length} photo${added.length === 1 ? '' : 's'}:\n`);
  for (const { slug, dateString, fromExif } of added) {
    console.log(`  src/content/photos/${slug}.md  (${dateString}${fromExif ? '' : ' — no EXIF date, used file time'})`);
  }
  console.log(
    '\nTitles were guessed from the original filenames, and the date comes from EXIF (or file mtime if missing) — ' +
      "edit `date` in the .md file if the camera's clock was wrong, and edit each .md file for a real title/description." +
      (location ? '' : ' Pass --location "Place, Country" to set where they were taken.')
  );
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
