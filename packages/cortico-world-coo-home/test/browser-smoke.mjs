import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from './fixtures/server.mjs';

// Supply Playwright/browser locations through the environment when not installed
// locally. No development-machine paths or user figure names belong in this file.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.COO_HOME_PLAYWRIGHT_MODULE || 'playwright');
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageRoot, '../..');
const output = resolve(process.env.COO_HOME_ARTIFACTS || join(repositoryRoot, 'scratch/coo-home-browser'));
await mkdir(output, { recursive: true });
const fixture = await startFixtureServer({
  bundlePath: join(packageRoot, 'web/panel.js'),
  stylePath: join(packageRoot, 'src/panel.css'),
});
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.COO_HOME_BROWSER ? { executablePath: process.env.COO_HOME_BROWSER } : {}),
    args: process.argv.includes('--software') ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : [],
  });
} catch (error) { await fixture.dispose(); throw error; }
const errors = [];
const rejected = [];
const report = { fixture: 'synthetic Figure API 2 only', checks: {}, screenshots: [] };

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const allowed = new Set([fixture.hostOrigin, fixture.petOrigin]);
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && !allowed.has(url.origin)) {
      rejected.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(fixture.hostOrigin, { waitUntil: 'load' });
  const root = page.locator('[data-testid="coo-home-root"]');
  const canvas = root.locator('canvas').first();
  const toggle = root.locator('.house-toggle');

  async function ready() {
    await page.waitForFunction(() => {
      const h = window.__homeHarness;
      return h?.panel?.actor?.getState().ready === true && document.querySelector('[data-testid="coo-home-root"] canvas')?.dataset.assembled === 'true';
    }, undefined, { timeout: 150000 });
  }

  async function painted(frames = 3) {
    const before = Number(await canvas.getAttribute('data-frames'));
    await page.waitForFunction(({ before, frames }) => Number(document.querySelector('[data-testid="coo-home-root"] canvas')?.dataset.frames) >= before + frames, { before, frames }, { timeout: 90000 });
  }

  async function view(mode) {
    await page.evaluate((value) => window.__homeHarness.panel.scene.setView(value), mode);
    await page.waitForFunction((value) => window.__homeHarness.panel.scene.getView() === value, mode);
    await painted(4);
    assert.equal(await toggle.getAttribute('data-mode'), mode);
  }

  async function shot(name) {
    const path = join(output, `${name}.png`);
    const bytes = await root.screenshot({ path, timeout: 90000 });
    report.screenshots.push(`${name}.png`);
    return bytes;
  }

  async function markerPixels(bytes) {
    return page.evaluate(async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
      const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0); image.close();
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i] - 239) < 12 && Math.abs(data[i + 1] - 59) < 12 && Math.abs(data[i + 2] - 157) < 12 && data[i + 3] > 240) count++;
      }
      return count;
    }, bytes.toString('base64'));
  }

  await ready();
  const initial = await page.evaluate(() => ({
    count: window.__homeHarness.panel.scene.listItems().length,
    ids: window.__homeHarness.panel.scene.listItems().map((item) => item.id),
    state: window.__homeHarness.panel.actor.getState(),
    original: window.__homeHarness.metrics.original,
  }));
  assert.equal(initial.count, 40);
  assert.equal(new Set(initial.ids).size, 40);
  assert.equal(await root.getAttribute('data-item-count'), '40');
  assert.ok(initial.original.some((message) => message.t === 'init'));
  assert.ok(await page.evaluate(() => window.__homeHarness.metrics.messages.some((message) => message.t === 'set' && message.roam === 'off')));
  assert.ok(!initial.original.some((message) => message.t === 'set'));
  report.checks.catalog = 40;

  for (const mode of ['exterior', 'walls', 'cutaway', 'open']) {
    await view(mode);
    const counts = await toggle.evaluate((button) => ({
      walls: Number(button.dataset.wallCount), roofs: Number(button.dataset.roofCount),
      visibleWalls: Number(button.dataset.visibleWalls), visibleRoofs: Number(button.dataset.visibleRoofs),
    }));
    assert.ok(counts.walls > 0 && counts.roofs > 0);
    assert.equal(counts.visibleRoofs, mode === 'exterior' ? counts.roofs : 0);
    if (mode === 'open') assert.equal(counts.visibleWalls, 0);
    else if (mode === 'cutaway') assert.ok(counts.visibleWalls > 0 && counts.visibleWalls < counts.walls);
    else assert.equal(counts.visibleWalls, counts.walls);
    report.checks[mode] = counts;
    await shot(mode);
  }

  // An opaque roof must hide a projected role. The same role must become
  // visible when that roof is removed; checking a CSS mask alone is not enough.
  await view('exterior');
  await page.evaluate(() => window.__homeHarness.panel.actor.setPlacement({ position: [4.10, .16, 7.05], height: 1.25, word: 'stand', facing: 1 }));
  await painted(8);
  const outside = await markerPixels(await shot('role-outdoors'));
  assert.ok(outside > 20, `The neutral role was not visible outdoors (${outside} marker pixels)`);
  await page.evaluate(() => window.__homeHarness.panel.actor.setPlacement({ position: [-3, .41, 12], height: 1.25, word: 'stand', facing: 1 }));
  await painted(8);
  const hidden = await markerPixels(await shot('role-under-roof'));
  assert.ok(hidden < Math.max(6, outside * .08), `The role leaked through the opaque roof (${hidden} marker pixels)`);
  await view('cutaway');
  await painted(8);
  const revealed = await markerPixels(await shot('role-cutaway'));
  assert.ok(revealed > 20, `The role did not reappear after removing the roof (${revealed} marker pixels)`);
  report.checks.occlusion = { outside, hidden, revealed };

  // This is a local observation, not a promise about another computer's GPU.
  // The upper bound prevents an uncapped scene loop on high-refresh displays.
  const perfStart = await page.evaluate(() => ({
    time: performance.now(), info: window.__homeHarness.panel.scene.getRendererInfo(),
    actorFrames: window.__homeHarness.panel.actor.getState().frames,
  }));
  await page.waitForTimeout(5000);
  const perfEnd = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="coo-home-root"] canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      time: performance.now(), info: window.__homeHarness.panel.scene.getRendererInfo(),
      actorFrames: window.__homeHarness.panel.actor.getState().frames,
      gpu: extension ? { vendor: gl.getParameter(extension.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) } : null,
    };
  });
  const seconds = (perfEnd.time - perfStart.time) / 1000;
  const frames = perfEnd.info.frames - perfStart.info.frames;
  const fps = frames / seconds;
  assert.ok(frames > 0 && fps <= 62, `Scene frame budget exceeded (${fps.toFixed(2)} FPS)`);
  report.checks.frameBudget = { seconds, frames, fps };
  await writeFile(join(output, 'performance.json'), JSON.stringify({
    kind: process.argv.includes('--software') ? 'Software Chrome fixture' : 'Native Chrome fixture',
    seconds, frames, fps, actorFrames: perfEnd.actorFrames - perfStart.actorFrames,
    begin: perfStart.info, end: perfEnd.info, gpu: perfEnd.gpu,
    caveat: 'One local stable-camera sample with a synthetic standing figure; not a target-device performance guarantee.',
  }, null, 2) + '\n');

  const savedCamera = await page.evaluate(() => window.__homeHarness.panel.scene.getCameraPose());
  await view('open');
  await page.evaluate(() => {
    const { scene, actor } = window.__homeHarness.panel;
    scene.setCameraPose({ eye: [-.2, 2, 14.8], target: [-5.31, 1.1, 14.8] });
    actor.setPlacement({ position: [-4.7, .41, 14.8], height: 1.25, word: 'stand', facing: 1 });
  });
  await painted(8);
  const inFront = await markerPixels(await shot('role-before-cabinet'));
  assert.ok(inFront > 100, `The close-up role was not visible before the cabinet (${inFront} marker pixels)`);
  await page.evaluate(() => window.__homeHarness.panel.actor.setPlacement({ position: [-5.9, .41, 14.8], height: 1.25, word: 'stand', facing: 1 }));
  await painted(8);
  const behind = await markerPixels(await shot('role-behind-cabinet'));
  assert.ok(behind < Math.max(6, inFront * .05), `The role leaked through the cabinet (${behind} marker pixels)`);
  report.checks.furnitureOcclusion = { inFront, behind };
  await view('cutaway');
  await page.evaluate((pose) => window.__homeHarness.panel.scene.setCameraPose(pose), savedCamera);

  await page.evaluate(() => window.__homeHarness.panel.actor.setPlacement({ position: [-3, .41, 12], height: 1.25, word: 'sit', facing: -1 }));
  await page.waitForFunction(() => window.__homeHarness.metrics.messages.some((message) => message.t === 'do' && message.word === 'sit'));
  const beforeSwitch = await page.evaluate(() => window.__homeHarness.panel.actor.getState().placement);
  const previousFrame = await root.locator('iframe[data-testid="home-figure"]').getAttribute('src');
  fixture.setAppearance('fixture-kite', 'stripe');
  await page.waitForFunction(() => window.__homeHarness.metrics.messages.some((message) => message.t === 'init' && message.pack === 'fixture-kite' && message.scheme === 'stripe'));
  await ready();
  assert.notEqual(await root.locator('iframe[data-testid="home-figure"]').getAttribute('src'), previousFrame);
  assert.deepEqual(await page.evaluate(() => window.__homeHarness.panel.actor.getState().placement), beforeSwitch);
  assert.equal(await root.locator('iframe[data-testid="home-figure"]').count(), 1);
  await shot('role-switched');

  fixture.setAppearance('fixture-round', 'plain');
  fixture.setAppearance('fixture-kite', 'plain');
  fixture.setAppearance('fixture-round', 'stripe');
  await page.waitForFunction(() => {
    const iframe = document.querySelector('[data-testid="home-figure"]');
    return iframe?.src.includes('fixture-round') && window.__homeHarness.panel.actor.getState().ready && window.__homeHarness.metrics.messages.some((message) => message.t === 'init' && message.pack === 'fixture-round' && message.scheme === 'stripe');
  });
  assert.equal(await root.locator('iframe[data-testid="home-figure"]').count(), 1);
  assert.deepEqual(await page.evaluate(() => window.__homeHarness.metrics.original), initial.original);
  report.checks.switching = 'Appearance and scheme change; position preserved; original fixture unchanged';

  await root.evaluate((element) => { element.style.display = 'none'; });
  await page.waitForTimeout(150);
  const hiddenFrames = await page.evaluate(() => ({ scene: window.__homeHarness.panel.scene.getRendererInfo().frames, actor: window.__homeHarness.panel.actor.getState().frames }));
  await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(() => ({ scene: window.__homeHarness.panel.scene.getRendererInfo().frames, actor: window.__homeHarness.panel.actor.getState().frames })), hiddenFrames);
  await root.evaluate((element) => { element.style.display = ''; });
  await painted(4);
  assert.ok(await page.evaluate((frames) => window.__homeHarness.panel.scene.getRendererInfo().frames > frames, hiddenFrames.scene));
  report.checks.hiddenPanel = 'Scene and role stop drawing while the mounted panel is hidden, then resume';

  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(() => window.__homeHarness.unmount());
    const stopped = await page.evaluate(() => ({ frames: window.__homeHarness.detachedFrames, callbacks: window.__homeHarness.metrics.frameCallbacks, messages: window.__homeHarness.metrics.messages.length }));
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => ({ frames: window.__homeHarness.detachedFrames, callbacks: window.__homeHarness.metrics.frameCallbacks, messages: window.__homeHarness.metrics.messages.length })), stopped);
    assert.deepEqual(await page.evaluate(() => ({ frames: window.__homeHarness.metrics.activeFrames, streams: window.__homeHarness.metrics.activeStreams, children: document.getElementById('mount').children.length })), { frames: 0, streams: 0, children: 0 });
    assert.equal(fixture.streamCount, 0);
    if (cycle < 2) { await page.evaluate(() => window.__homeHarness.mount()); await ready(); }
  }
  report.checks.lifecycle = 'Three mounts/unmounts; frame and stream resources stopped';
  assert.deepEqual(fixture.mutations, []);
  assert.ok(fixture.requests.every((request) => !/\/api\/(?:skin|prefs)$/.test(request.path) && !request.query.includes('role=pet')));
  assert.deepEqual(rejected, []);
  assert.deepEqual(errors, []);
  report.checks.isolation = 'Only loopback fixture traffic; no original-pet control endpoint';
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failure = error.message;
  report.errors = errors;
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
  await fixture.dispose();
}
