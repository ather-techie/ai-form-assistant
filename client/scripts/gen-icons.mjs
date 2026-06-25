/**
 * gen-icons.mjs — Generates placeholder PNG icons for the extension.
 * Run once: node scripts/gen-icons.mjs
 * Uses only Node.js built-ins (no extra dependencies).
 */

import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

// Extension accent colour #6c63ff (purple)
const R = 0x6c, G = 0x63, B = 0xff;

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  // Raw scanlines (filter byte 0 + RGB per pixel)
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const base = y * (1 + size * 3);
    raw[base] = 0;
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3]     = R;
      raw[base + 1 + x * 3 + 1] = G;
      raw[base + 1 + x * 3 + 2] = B;
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len  = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t    = Buffer.from(type, 'ascii');
  const crc  = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

// CRC-32 (ISO 3309)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

mkdirSync('icons', { recursive: true });

for (const size of [16, 48, 128]) {
  const path = `icons/icon${size}.png`;
  writeFileSync(path, createPNG(size));
  console.log(`✓ ${path}`);
}
