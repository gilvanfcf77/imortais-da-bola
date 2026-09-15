// Drives the running Next.js app with Playwright through one representative
// user flow — home -> pick a club -> build a squad -> start the cup -> play
// a match — screenshotting each step and checking for horizontal overflow
// and console errors. See SKILL.md in this same directory for how to run
// this (dev server must already be up first).
//
// Usage: node .claude/skills/run-imortais-da-bola/driver.mjs [mobile|desktop]
//   BASE_URL env var overrides the default http://localhost:3000.
//
// Exits 1 if any step overflowed horizontally or logged a console error —
// safe to use as an automated smoke check, not just for screenshots.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = join(HERE, 'screenshots');
mkdirSync(SHOT_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  // iPhone SE-sized — this is the viewport that originally caught the
  // fixed-sidebar layouts in SquadScreen/MatchScreen overflowing (see
  // DECISOES.md decision 21). Use this whenever verifying a layout/CSS
  // change, not just `desktop`.
  mobile: { width: 375, height: 667 },
};
const viewportName = process.argv[2] === 'mobile' ? 'mobile' : 'desktop';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORTS[viewportName] });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

const results = [];

async function step(label, action) {
  await action();
  const [scrollWidth, clientWidth] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  const overflow = scrollWidth > clientWidth;
  const shotPath = join(SHOT_DIR, `${results.length + 1}-${label}.png`);
  await page.screenshot({ path: shotPath });
  results.push({ label, overflow, scrollWidth, clientWidth, shotPath });
  const status = overflow ? 'OVERFLOW' : 'ok';
  console.log(`[${label}] ${status} (scrollWidth=${scrollWidth} clientWidth=${clientWidth}) -> ${shotPath}`);
}

await step('home', async () => {
  await page.goto(BASE_URL);
  await page.waitForSelector('text=Iniciar Copa');
});

await step('clubs', async () => {
  await page.click('text=Iniciar Copa');
  await page.waitForSelector('text=Escolha seu clube');
});

await step('squad-empty', async () => {
  // Any club works for a smoke run — Corinthians is always present.
  await page.click('button:has-text("Corinthians")');
  await page.waitForSelector('text=Formação');
});

await step('squad-complete', async () => {
  await page.click('text=Completar aleatoriamente');
  await page.waitForSelector('text=Iniciar Copa', { timeout: 15000 });
});

await step('cup-screen', async () => {
  await page.click('text=Iniciar Copa');
  await page.waitForSelector('button:has-text("Jogar a")', { timeout: 20000 });
});

await step('match-start', async () => {
  await page.click('button:has-text("Jogar a")');
  await page.waitForSelector('text=Velocidade', { timeout: 20000 });
});

await step('match-progress', async () => {
  // Let the timed event reveal (see MatchScreen.jsx's scheduling effect)
  // populate a few lines of the log before the final screenshot.
  await page.waitForTimeout(8000);
});

await browser.close();

console.log('');
console.log(`Viewport: ${viewportName} (${VIEWPORTS[viewportName].width}x${VIEWPORTS[viewportName].height})`);
console.log(`Screenshots: ${SHOT_DIR}`);
console.log(`Console errors: ${consoleErrors.length ? consoleErrors.join(' | ') : 'none'}`);

const overflowed = results.filter((r) => r.overflow);
if (overflowed.length > 0) {
  console.log(`FAIL: horizontal overflow at: ${overflowed.map((r) => r.label).join(', ')}`);
}
if (overflowed.length > 0 || consoleErrors.length > 0) {
  process.exit(1);
}
console.log('OK: no overflow, no console errors.');
