// Scans src/data/clubs/ for club subfolders and, within each, its era JSON
// files. This is CLAUDE.md's "clube é dado, não código" rule enforced
// structurally, not just by convention: adding a club or a new era means
// adding a folder/file, never editing a list anywhere — before this,
// src/data/clubs/index.js (and a second, easy-to-forget copy in
// viewer.html) needed a manual entry per club, which is exactly how the
// São Paulo folder once went missing from the viewer's own list.
//
// Filenames are sorted so a multi-era club's files come back in
// chronological order — era files are always named `<year>.json`, so a
// plain string sort already sorts them by year (works up to year 9999).
//
// Shared by src/data/clubs/index.js (the real game, calling this directly
// via Node's fs) and scripts/serve-viewer.js (which exposes the same list
// over HTTP for viewer.html's browser-side loader, since a browser can't
// list a directory itself — see the comment there).
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export function discoverClubs(clubsDir) {
  return readdirSync(clubsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((slug) => ({
      slug,
      files: readdirSync(join(clubsDir, slug))
        .filter((file) => file.endsWith('.json'))
        .sort(),
    }));
}
