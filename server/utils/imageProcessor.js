/**
 * utils/imageProcessor.js
 * ─────────────────────────────────────────────────────────────
 * Processes uploaded images using sharp:
 *  - Converts to WebP format (smaller, faster)
 *  - Creates thumbnail (200×200) and medium (600×600) variants
 *  - Deletes the raw uploaded file after processing
 *
 * Usage (in upload route handler):
 *   const processed = await processImage(req.file);
 *   // processed.webp   → main image path  (/uploads/processed/img_xxx.webp)
 *   // processed.thumb  → thumbnail path   (/uploads/processed/img_xxx_thumb.webp)
 *   // processed.medium → medium path      (/uploads/processed/img_xxx_medium.webp)
 */

const sharp = require("sharp");
const path  = require("path");
const fs    = require("fs");

const UPLOADS_DIR   = path.join(__dirname, "..", "uploads");
const PROCESSED_DIR = path.join(UPLOADS_DIR, "processed");

// Ensure the processed sub-folder exists
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

/**
 * Process a multer file object into optimised WebP variants.
 * @param {Express.Multer.File} file – the raw multer file
 * @returns {Promise<{webp: string, thumb: string, medium: string}>}
 */
async function processImage(file) {
  const basename = path.parse(file.filename).name; // e.g. img_uuid
  const srcPath  = file.path;                      // absolute path from multer

  const names = {
    webp:   `${basename}.webp`,
    thumb:  `${basename}_thumb.webp`,
    medium: `${basename}_medium.webp`,
  };

  const paths = {
    webp:   path.join(PROCESSED_DIR, names.webp),
    thumb:  path.join(PROCESSED_DIR, names.thumb),
    medium: path.join(PROCESSED_DIR, names.medium),
  };

  // ── Main image (max 1200px wide, quality 82) ──────────────────────────────
  await sharp(srcPath)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(paths.webp);

  // ── Medium (600px wide, quality 80) ──────────────────────────────────────
  await sharp(srcPath)
    .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(paths.medium);

  // ── Thumbnail (200×200, cropped to fill) ─────────────────────────────────
  await sharp(srcPath)
    .resize({ width: 200, height: 200, fit: "cover" })
    .webp({ quality: 75 })
    .toFile(paths.thumb);

  // Remove the original raw upload to save disk space
  fs.unlink(srcPath, (err) => {
    if (err) console.error("[ImageProcessor] Could not delete raw file:", err.message);
  });

  // Return URL-friendly paths (relative to /uploads)
  return {
    webp:   `/uploads/processed/${names.webp}`,
    thumb:  `/uploads/processed/${names.thumb}`,
    medium: `/uploads/processed/${names.medium}`,
  };
}

module.exports = { processImage };
