import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from './fixtures/server.mjs';
import { verifyBrowserLife } from './fixtures/browser-life.mjs';
import { verifyLifeContract } from './fixtures/life-contract.mjs';
import { verifyBrowserGarden } from './fixtures/browser-garden.mjs';
import { verifyGardenContract } from './fixtures/garden-contract.mjs';
import { verifyBrowserAudio } from './fixtures/browser-audio.mjs';

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
  await fixture.invoke('settings', [{ autonomy: false }]);
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
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // browser-garden injects one rejected command to verify failure feedback.
    if (message.location().url === `${fixture.hostOrigin}/invoke` && message.text().includes('status of 409')) return;
    errors.push(message.text());
  });
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
    if (!report.screenshots.includes(`${name}.png`)) report.screenshots.push(`${name}.png`);
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
  if(process.argv.includes('--garden-only')){
    report.checks.garden=await verifyBrowserGarden({fixture,page,root,canvas,view,painted,shot});
  }else{
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

  await verifyBrowserLife({ fixture, page, root, canvas, view, painted, shot, markerPixels, report });

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
  report.checks.garden = await verifyBrowserGarden({ fixture, page, root, canvas, view, painted, shot });

  await root.evaluate((element) => { element.style.display = 'none'; });
  await page.waitForTimeout(150);
  const hiddenFrames = await page.evaluate(() => ({ scene: window.__homeHarness.panel.scene.getRendererInfo().frames, actor: window.__homeHarness.panel.actor.getState().frames }));
  await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(() => ({ scene: window.__homeHarness.panel.scene.getRendererInfo().frames, actor: window.__homeHarness.panel.actor.getState().frames })), hiddenFrames);
  await fixture.invoke('cancel');
  await fixture.invoke('settings', [{ autonomy: true }]);
  fixture.resetNavigationCalls();
  const background = await fixture.advance(5 * 60_000);
  assert.equal(background.life.simulation, 'background');
  assert.ok(fixture.navigationCalls().prepared > 0, 'The hidden household did not continue its rule activities');
  assert.equal(fixture.navigationCalls().detailed, 0, 'Hidden household activity performed detailed pathfinding');
  assert.deepEqual(await page.evaluate(() => ({ scene: window.__homeHarness.panel.scene.getRendererInfo().frames, actor: window.__homeHarness.panel.actor.getState().frames })), hiddenFrames);
  report.checks.background = { ruleSimulationContinues: true, ...fixture.navigationCalls(), noDrawing: true };
  await fixture.invoke('settings', [{ autonomy: false }]);
  await fixture.invoke('cancel');
  await root.evaluate((element) => { element.style.display = ''; });
  await painted(4);
  assert.ok(await page.evaluate((frames) => window.__homeHarness.panel.scene.getRendererInfo().frames > frames, hiddenFrames.scene));
  report.checks.hiddenPanel = 'Scene and role stop drawing while the mounted panel is hidden, then resume';
  report.checks.audio = await verifyBrowserAudio({ fixture, page, root });

  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(async () => { window.__lastFixtureAudio = window.__homeHarness.panel.audio; await window.__homeHarness.unmount(); });
    const disposedAudio = await page.evaluate(() => window.__lastFixtureAudio.getState());
    assert.equal(disposedAudio.disposed, true);
    assert.ok(['closed', 'absent'].includes(disposedAudio.contextState));
    assert.equal(disposedAudio.playing, 0);
    const stopped = await page.evaluate(() => ({ frames: window.__homeHarness.detachedFrames, callbacks: window.__homeHarness.metrics.frameCallbacks, messages: window.__homeHarness.metrics.messages.length }));
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => ({ frames: window.__homeHarness.detachedFrames, callbacks: window.__homeHarness.metrics.frameCallbacks, messages: window.__homeHarness.metrics.messages.length })), stopped);
    assert.deepEqual(await page.evaluate(() => ({ frames: window.__homeHarness.metrics.activeFrames, streams: window.__homeHarness.metrics.activeStreams, children: document.getElementById('mount').children.length })), { frames: 0, streams: 0, children: 0 });
    assert.equal(fixture.streamCount, 0);
    if (cycle < 2) { await page.evaluate(() => window.__homeHarness.mount()); await ready(); }
  }
  report.checks.lifecycle = 'Three mounts/unmounts; frame and stream resources stopped';
  report.checks.lifeContract = await verifyLifeContract(fixture);
  // The UI has already planted and harvested. Initial-state assertions need a
  // separate new household, not the mutated save from the browser exercise.
  const freshGarden=await startFixtureServer({bundlePath:join(packageRoot,'web/panel.js'),stylePath:join(packageRoot,'src/panel.css')});
  try{report.checks.gardenContract=await verifyGardenContract(freshGarden);}finally{await freshGarden.dispose();}
  }
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
