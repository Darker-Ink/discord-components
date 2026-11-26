// Generates the images, GIF and video the attachment fixtures and stories use, into
// packages/playground/public/messages/attachments. Run once; the output is committed.
//
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/fixtures/attachments/generate-media.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const OUT = path.resolve('packages/playground/public/messages/attachments');
fs.mkdirSync(OUT, { recursive: true });

// name, width, height, two gradient colours
const IMAGES = [
  ['photo-1', 1600, 900, '#5865f2', '#eb459e'],
  ['photo-2', 900, 1200, '#57f287', '#1e6b3a'],
  ['photo-3', 1000, 1000, '#fee75c', '#f47b67'],
  ['photo-4', 1920, 1080, '#3ba55c', '#0a3d62'],
  ['photo-5', 800, 1400, '#ed4245', '#4e1c1c'],
  ['photo-6', 1200, 800, '#00a8fc', '#1b2838'],
  ['photo-7', 1024, 1024, '#9b84ec', '#2e1065'],
  ['photo-8', 2000, 600, '#f0b232', '#7c2d12'],
  ['photo-9', 700, 1000, '#23a559', '#e3e5e8'],
  ['photo-10', 1280, 960, '#e91e63', '#311b92'],
  ['tiny', 64, 32, '#80848e', '#313338'],
  ['video-1-poster', 1280, 720, '#111214', '#5865f2'],
  ['video-2-poster', 720, 1280, '#111214', '#23a559'],
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();

const draw = async (width, height, from, to, label, type = 'image/png') =>
  page.evaluate(
    async ([width, height, from, to, label, type]) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, from);
      gradient.addColorStop(1, to);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${Math.round(Math.min(width, height) / 3)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2, height / 2);
      ctx.font = `${Math.max(10, Math.round(Math.min(width, height) / 14))}px sans-serif`;
      ctx.fillText(`${width}×${height}`, width / 2, height - Math.min(width, height) / 10);
      return canvas.toDataURL(type, 0.85);
    },
    [width, height, from, to, label, type],
  );

for (const [name, width, height, from, to] of IMAGES) {
  const label = name.startsWith('photo-') ? name.slice(6) : name.startsWith('video') ? '▶' : '';
  const dataUrl = await draw(width, height, from, to, label, 'image/jpeg');
  fs.writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

// Two short WebM clips recorded from an animated canvas.
for (const [name, width, height, color] of [
  ['video-1', 640, 360, '#5865f2'],
  ['video-2', 360, 640, '#23a559'],
]) {
  const base64 = await page.evaluate(
    async ([width, height, color]) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((resolve) => (recorder.onstop = resolve));
      recorder.start();
      const start = performance.now();
      await new Promise((resolve) => {
        const frame = () => {
          const t = (performance.now() - start) / 2000;
          ctx.fillStyle = '#111214';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = color;
          const size = Math.min(width, height) / 4;
          ctx.fillRect((width - size) * t, (height - size) / 2, size, size);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        };
        frame();
      });
      recorder.stop();
      await done;
      const buffer = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer();
      let binary = '';
      for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    [width, height, color],
  );
  fs.writeFileSync(path.join(OUT, `${name}.webm`), Buffer.from(base64, 'base64'));
}

// An animated GIF: 4 frames of a moving square, encoded with uncompressed LZW (clear code every 254 pixels).
const gif = (() => {
  const width = 320;
  const height = 240;
  const palette = [
    [0x11, 0x12, 0x14],
    [0x58, 0x65, 0xf2],
    [0xeb, 0x45, 0x9e],
    [0xff, 0xff, 0xff],
  ];
  const bytes = [];
  const push = (...values) => bytes.push(...values);
  const word = (value) => push(value & 255, (value >> 8) & 255);
  push(...Buffer.from('GIF89a'));
  word(width);
  word(height);
  push(0xf1, 0, 0); // global colour table, 4 entries
  for (let i = 0; i < 4; i++) push(...(palette[i] ?? [0, 0, 0]));
  push(0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0); // loop forever
  for (let frame = 0; frame < 4; frame++) {
    // The first frame holds for 8s so screenshots taken right after load are deterministic, then 500ms per frame.
    const delay = frame === 0 ? 800 : 50;
    push(0x21, 0xf9, 4, 0, delay & 255, delay >> 8, 0, 0);
    push(0x2c);
    word(0);
    word(0);
    word(width);
    word(height);
    push(0);
    const minCodeSize = 8;
    push(minCodeSize);
    const clear = 1 << minCodeSize;
    const codes = [];
    let count = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (count % 254 === 0) codes.push(clear);
        const inSquare = x >= 40 + frame * 60 && x < 100 + frame * 60 && y >= 90 && y < 150;
        codes.push(inSquare ? (frame % 2 ? 2 : 1) : 0);
        count++;
      }
    codes.push(clear + 1);
    const data = [];
    let buffer = 0;
    let bits = 0;
    for (const code of codes) {
      buffer |= code << bits;
      bits += 9;
      while (bits >= 8) {
        data.push(buffer & 255);
        buffer >>= 8;
        bits -= 8;
      }
    }
    if (bits > 0) data.push(buffer & 255);
    for (let i = 0; i < data.length; i += 255) {
      const block = data.slice(i, i + 255);
      push(block.length, ...block);
    }
    push(0);
  }
  push(0x3b);
  return Buffer.from(bytes);
})();
fs.writeFileSync(path.join(OUT, 'animated.gif'), gif);

await browser.close();
console.log(`wrote ${fs.readdirSync(OUT).length} files to ${OUT}`);
