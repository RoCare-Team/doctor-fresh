/**
 * Crops the empty white margin off /public/images/logo.png and writes
 * /public/images/logo-trimmed.png.
 *
 * The supplied artwork only fills ~45% of its canvas height, so rendering it at
 * a given height made the brand mark look about half the size it should be.
 * Trimming lets the header size the mark itself. The original file is left
 * untouched. Pure node (zlib) — no image dependency.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = path.join(__dirname, '..', 'public', 'images', 'logo.png');
const OUT = path.join(__dirname, '..', 'public', 'images', 'logo-trimmed.png');
const PAD = 10; // breathing room kept around the mark
const WHITE = 235; // anything lighter counts as background

/* ------------------------------------------------------------------ decode */
function decode(buf) {
  let pos = 8;
  const idat = [];
  let w = 0, h = 0, bitDepth = 0, colorType = 0;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    pos += 12 + len;
  }

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels || bitDepth !== 8) throw new Error(`unsupported PNG: type ${colorType}, depth ${bitDepth}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const pixels = Buffer.alloc(h * stride);

  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }

  return { w, h, channels, pixels, stride };
}

/* ------------------------------------------------------------------ encode */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encode(w, h, channels, pixels) {
  const colorType = channels === 3 ? 2 : channels === 4 ? 6 : 0;
  const stride = w * channels;
  const rows = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    rows[y * (stride + 1)] = 0; // no filter
    pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------- run */
const src = decode(fs.readFileSync(SRC));
const { w, h, channels, pixels, stride } = src;

let minX = w, minY = h, maxX = -1, maxY = -1;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const o = y * stride + x * channels;
    if (pixels[o] < WHITE || pixels[o + 1] < WHITE || pixels[o + 2] < WHITE) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

minX = Math.max(0, minX - PAD);
minY = Math.max(0, minY - PAD);
maxX = Math.min(w - 1, maxX + PAD);
maxY = Math.min(h - 1, maxY + PAD);

const cw = maxX - minX + 1;
const chh = maxY - minY + 1;
const cropped = Buffer.alloc(chh * cw * channels);
for (let y = 0; y < chh; y++) {
  pixels.copy(
    cropped,
    y * cw * channels,
    (minY + y) * stride + minX * channels,
    (minY + y) * stride + (minX + cw) * channels,
  );
}

fs.writeFileSync(OUT, encode(cw, chh, channels, cropped));

console.log('  source :', `${w}x${h}`, `${(fs.statSync(SRC).size / 1024).toFixed(0)}KB`);
console.log('  trimmed:', `${cw}x${chh}`, `${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`, `ratio ${(cw / chh).toFixed(2)}`);
console.log('  written:', path.relative(path.join(__dirname, '..'), OUT));
