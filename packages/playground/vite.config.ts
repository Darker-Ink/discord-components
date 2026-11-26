import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const PUBLIC_DIR = path.resolve(import.meta.dirname, 'public');
const VIDEO_RE = /\.(mp4|webm|mov)$/i;

// Discord's media proxy serves a video's first frame when asked for an image format (`?format=webp`), which
// is how the client gets video posters from `proxy_url`. The sample media emulate it with `<name>-poster.*`.
const mediaProxyPosters = (): Plugin => ({
  name: 'media-proxy-posters',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (VIDEO_RE.test(url.pathname) && url.searchParams.has('format')) {
        const base = url.pathname.replace(VIDEO_RE, '-poster');
        const poster = ['.jpg', '.png'].map((ext) => base + ext).find((p) => fs.existsSync(path.join(PUBLIC_DIR, p)));
        if (poster != null) req.url = poster;
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), mediaProxyPosters()],
});
