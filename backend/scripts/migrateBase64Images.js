/**
 * One-off migration: move base64 data-URI images out of MongoDB and into
 * Cloudinary, replacing each field with the returned CDN URL.
 *
 * Why: images were being stored inline as `data:image/...;base64,...` strings
 * on the documents that referenced them. One trip record reached 1.8 MB, and
 * GET /trips?limit=100 returned 18.2 MB in 28 seconds for ten trips — 99.9% of
 * it image bytes.
 *
 * Usage:
 *   node scripts/migrateBase64Images.js --dry     # report only, no writes
 *   node scripts/migrateBase64Images.js           # perform the migration
 *
 * Safe to re-run: fields already holding an http(s) URL are skipped, so an
 * interrupted run resumes cleanly.
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import { env } from '../src/config/env.js';
import Trip from '../src/models/Trip.js';
import Trek from '../src/models/Trek.js';
import User from '../src/models/User.js';

const DRY = process.argv.includes('--dry');

// Inline SVG placeholders (`data:image/svg+xml;utf8,<svg…>`) are a few hundred
// bytes each and are a legitimate use of a data URI — they are not what bloated
// the documents, and Cloudinary rejects raw non-base64 SVG anyway. Skip them.
const isBase64Image = (v) =>
  typeof v === 'string' && v.startsWith('data:image/') && !v.startsWith('data:image/svg+xml');
const bytes = (v) => (typeof v === 'string' ? Buffer.byteLength(v, 'utf8') : 0);
const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;

// Which string / string[] fields on each collection can hold an image.
const TARGETS = [
  { model: Trip, name: 'Trip', single: ['coverImage'], many: ['galleryImages'], folder: 'find-your-trek/trips' },
  { model: Trek, name: 'Trek', single: ['coverImage'], many: ['galleryImages'], folder: 'find-your-trek/treks' },
  { model: User, name: 'User', single: ['avatar'], many: [], folder: 'find-your-trek/avatars' },
];

let uploaded = 0;
let failed = 0;
let bytesFreed = 0;

async function uploadToCloudinary(dataUri, folder) {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}` + env.cloudinaryApiSecret)
    .digest('hex');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: dataUri,
      folder,
      api_key: env.cloudinaryApiKey,
      timestamp,
      signature,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || `HTTP ${res.status}`);
  return json.secure_url;
}

// Uploads one data URI and returns the CDN URL, or null if it could not be
// migrated — in which case the original value is left untouched.
async function convert(value, folder, label) {
  if (!isBase64Image(value)) return null;
  const size = bytes(value);

  if (DRY) {
    console.log(`  would upload ${label} (${mb(size)})`);
    uploaded += 1;
    bytesFreed += size;
    return null;
  }

  try {
    const url = await uploadToCloudinary(value, folder);
    uploaded += 1;
    bytesFreed += size;
    console.log(`  ✓ ${label} ${mb(size)} → ${url}`);
    return url;
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${label} failed: ${err.message}`);
    return null;
  }
}

async function run() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    console.error('Cloudinary credentials missing. Set them in backend/.env before running.');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);
  console.log(`Connected to ${env.mongoUri.replace(/\/\/[^@]+@/, '//***@')}`);
  console.log(DRY ? '\nDRY RUN — no writes will be made.\n' : '\nMigrating…\n');

  for (const { model, name, single, many, folder } of TARGETS) {
    const docs = await model.find({});
    console.log(`${name}: ${docs.length} document(s)`);

    for (const doc of docs) {
      let dirty = false;

      for (const field of single) {
        const url = await convert(doc[field], folder, `${name}/${doc._id}.${field}`);
        if (url) { doc[field] = url; dirty = true; }
      }

      for (const field of many) {
        const arr = doc[field];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const next = [...arr];
        for (let i = 0; i < next.length; i += 1) {
          const url = await convert(next[i], folder, `${name}/${doc._id}.${field}[${i}]`);
          if (url) { next[i] = url; dirty = true; }
        }
        if (dirty) doc[field] = next;
      }

      if (dirty && !DRY) await doc.save();
    }
  }

  console.log('\n─────────────────────────────');
  console.log(`${DRY ? 'Would migrate' : 'Migrated'}: ${uploaded} image(s)`);
  if (failed) console.log(`Failed:   ${failed} (left as base64 — re-run to retry)`);
  console.log(`Document weight removed: ${mb(bytesFreed)}`);
  console.log('─────────────────────────────');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
