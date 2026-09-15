// Zero-dependency static file server for viewer.html. Needed because
// browsers block ES module imports loaded straight from file:// (CORS), so
// the project root has to be served over http:// for the relative imports
// to src/engine and src/data to resolve.
//
// Also serves /api/clubs-manifest: a browser can't list a directory itself,
// so viewer.html can't discover which club folders/era files exist the way
// src/data/clubs/index.js does on the Node side. This endpoint runs the
// exact same discoverClubs() scan and hands the result back as JSON, so the
// two loaders share one source of truth instead of viewer.html keeping its
// own hardcoded copy of the club list (see discover.js's own comment for
// why that used to be a real bug — the São Paulo folder once went missing
// from just this list).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverClubs } from '../src/data/clubs/discover.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLUBS_DIR = join(ROOT, 'src', 'data', 'clubs');
const PORT = process.env.PORT ? Number(process.env.PORT) : 5500;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const urlPath = req.url === '/' ? '/viewer.html' : req.url.split('?')[0];

  if (urlPath === '/api/clubs-manifest') {
    res.writeHead(200, { 'Content-Type': MIME['.json'] });
    res.end(JSON.stringify(discoverClubs(CLUBS_DIR)));
    return;
  }

  const filePath = normalize(join(ROOT, decodeURIComponent(urlPath)));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Visualizador em http://localhost:${PORT}`);
});
