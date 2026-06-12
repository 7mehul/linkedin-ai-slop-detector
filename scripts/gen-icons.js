// SlopShield icon generator — zero dependencies, hand-assembled PNGs.
// Motif: a paper-colored rounded square wearing three black censor bars.
// The PNGs are committed; users never need to run this. `npm run icons`.
'use strict';

const { deflateSync, crc32 } = require('node:zlib');
const { writeFileSync } = require('node:fs');
const path = require('node:path');

// Build an RGBA PNG from a per-pixel callback: (x, y) => [r, g, b, a].
function buildPng(size, pixelAt) {
  const stride = 1 + size * 4; // leading filter byte per scanline
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const o = y * stride + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PAPER = [236, 233, 226];
const INK = [10, 10, 10];

function iconPixels(size) {
  const r = size * 0.22; // corner radius
  // Three censor bars: [y-center %, x-start %, width %]
  const bars = [
    [0.32, 0.18, 0.62],
    [0.5, 0.18, 0.46],
    [0.68, 0.18, 0.56],
  ];
  const barH = Math.max(2, Math.round(size * 0.115));

  return (x, y) => {
    // Rounded-rect clip.
    const cx = Math.max(r - x, x - (size - 1 - r), 0);
    const cy = Math.max(r - y, y - (size - 1 - r), 0);
    if (cx * cx + cy * cy > r * r) return [0, 0, 0, 0];

    for (const [yc, xs, w] of bars) {
      const top = Math.round(yc * size - barH / 2);
      if (y >= top && y < top + barH && x >= Math.round(xs * size) && x < Math.round((xs + w) * size)) {
        return [...INK, 255];
      }
    }
    return [...PAPER, 255];
  };
}

for (const size of [16, 48, 128]) {
  const file = path.join(__dirname, '..', 'icons', `icon${size}.png`);
  writeFileSync(file, buildPng(size, iconPixels(size)));
  console.log(`wrote ${file}`);
}
