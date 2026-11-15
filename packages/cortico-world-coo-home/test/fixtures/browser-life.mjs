import assert from 'node:assert/strict';
import { getNavigationData } from '../../../../scenes/amane-mart/src/navigation-data.js';
import { createNavigationQuery } from '../../../../scenes/amane-mart/src/navigation-query.js';

export async function verifyBrowserLife({ fixture, page, root, canvas, view, painted, shot, markerPixels, report }) {
  const geometry = createNavigationQuery(getNavigationData());
  async function sync(state) {
    await page.waitForFunction(({ revision, now }) => {
      const life = window.__homeHarness.panel.getLifeState();
      return life?.revision >= revision && life.now >= now;
    }, { revision: state.life.revision, now: state.life.now });
    await painted(4);
    return state;
  }
  async function invoke(method, args = []) {
    try { return await sync(await fixture.invoke(method, args)); }
    catch (error) { throw new Error(`Fixture ${method} ${JSON.stringify(args)} failed: ${error.message}`, { cause: error }); }
  }
  async function until(time) {
    return sync(time > fixture.snapshot().life.now + 100 ? await fixture.advanceTo(time + 5) : await fixture.advance(105));
  }
  async function walk(position) {
    const state = await invoke('walk', [{ position }]);
    await until(state.life.current.endsAt);
  }
  async function visiblePixels(name, predicate) {
    let count = 0;
    const deadline = Date.now() + 5000;
    do {
      await painted(6);
      count = await markerPixels(await shot(name));
      if (predicate(count)) return count;
    } while (Date.now() < deadline);
    return count;
  }
  async function clickItem(itemId, actionId) {
    await view('open');
    await page.evaluate(id => {
      const scene = window.__homeHarness.panel.scene;
      const p = scene.getItem(id).anchor;
      scene.setCameraPose({ eye: [p[0] + 2, p[1] + 5, p[2] + 3], target: p });
    }, itemId);
    await painted(6);
    const point = await page.evaluate(id => {
      const scene = window.__homeHarness.panel.scene;
      const center = scene.project(scene.getItem(id).anchor);
      const offsets = [0, -8, 8, -16, 16, -28, 28, -44, 44];
      for (const dx of offsets) for (const dy of offsets) {
        const x = center.x + dx, y = center.y + dy;
        if (scene.pickSurface(x, y)?.itemId === id) return { x, y };
      }
      return null;
    }, itemId);
    assert.ok(point, `No visible click target found for ${itemId}`);
    const previous = fixture.snapshot().life.current?.id;
    await canvas.click({ position: point });
    const button = root.locator(`[data-testid="home-action"][data-item-id="${itemId}"][data-action-id="${actionId}"]`);
    await button.waitFor({ state: 'visible' });
    assert.equal(fixture.snapshot().life.current?.id, previous, 'Opening a menu must not begin an action');
    await button.click();
    await page.waitForFunction(({ itemId, actionId }) => {
      const current = window.__homeHarness.panel.getLifeState()?.current;
      return current?.itemId === itemId && current.actionId === actionId;
    }, { itemId, actionId });
    return fixture.snapshot();
  }

  await invoke('settings', [{ autonomy: false }]);
  await view('open');
  const initialGeometry = await page.evaluate(() => window.__homeHarness.panel.scene.getNavigationData());
  for (const mode of ['exterior', 'walls', 'cutaway', 'open']) {
    await view(mode);
    assert.deepEqual(await page.evaluate(() => window.__homeHarness.panel.scene.getNavigationData()), initialGeometry, 'Cutaway changed navigation geometry');
  }

  const walkTarget = [-6, .41, 11.9];
  assert.ok(geometry.locate(walkTarget));
  const ground = await page.evaluate(position => {
    const scene = window.__homeHarness.panel.scene;
    scene.setCameraPose({ eye: [-2, 12, 18], target: [-3, .4, 12] });
    return scene.project(position);
  }, walkTarget);
  await painted(5);
  await canvas.click({ position: { x: ground.x, y: ground.y } });
  await page.waitForFunction(() => window.__homeHarness.panel.getLifeState()?.current?.actionId === 'walk');
  const walkTask = fixture.snapshot().life.current;
  assert.equal(walkTask.phase, 'walking');
  const samples = await page.evaluate(async () => {
    const points = [], start = performance.now();
    while (performance.now() - start < 2200) {
      const panel = window.__homeHarness.panel;
      points.push(panel.actor.getState().placement.position);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const layouts = window.__homeHarness.metrics.roleFrames.filter(frame => frame.at >= start).map(frame => frame.layout);
    return { points, layouts };
  });
  assert.ok(Math.hypot(samples.points.at(-1)[0] - samples.points[0][0], samples.points.at(-1)[2] - samples.points[0][2]) > .4, 'World position did not advance along the path');
  for (let i = 1; i < samples.points.length; i++) assert.ok(geometry.segmentWalkable(samples.points[i - 1], samples.points[i]), 'Rendered movement crossed a wall');
  assert.ok(samples.layouts.some(layout => layout.moving), 'The Figure API body never entered a walking state');
  assert.ok(Math.max(...samples.layouts.map(layout => layout.x)) - Math.min(...samples.layouts.map(layout => layout.x)) > 20, 'Native walking did not advance the body within its sandbox');
  const strides = new Set();
  for (let i = 0; i < 4; i++) {
    strides.add(await page.frameLocator('[data-testid="home-figure"]').locator('#root').getAttribute('data-stride'));
    await page.waitForTimeout(90);
  }
  assert.ok(strides.size > 1, 'Walking legs did not animate');
  await root.getByTestId('home-pause').click();
  await page.waitForFunction(() => window.__homeHarness.panel.getLifeState().paused);
  await painted(4);
  const frozen = await page.evaluate(() => window.__homeHarness.panel.actor.getState().placement.position);
  await page.waitForTimeout(1250);
  assert.deepEqual(await page.evaluate(() => window.__homeHarness.panel.actor.getState().placement.position), frozen);
  await root.getByTestId('home-pause').click();
  await page.waitForFunction(() => !window.__homeHarness.panel.getLifeState().paused);
  await until(fixture.snapshot().life.current.endsAt);
  report.checks.walking = { samples: samples.points.length, nativeBodyMoves: true, animatedStride: true, pausedAndResumed: true };

  await walk([5, .18, 7.05]);
  await view('exterior');
  const outside = await visiblePixels('role-outdoors', count => count > 20);
  assert.ok(outside > 20);
  await walk([-3, .41, 12]);
  const hidden = await visiblePixels('role-under-roof', count => count < Math.max(6, outside * .08));
  assert.ok(hidden < Math.max(6, outside * .08), 'The role leaked through the opaque roof');
  await view('cutaway');
  const revealed = await visiblePixels('role-cutaway', count => count > 20);
  assert.ok(revealed > 20, 'The role was not revealed in cutaway');
  report.checks.occlusion = { outside, hidden, revealed };

  const sleep = await clickItem('bedroom.bed', 'sleep');
  await until(sleep.life.current.arrivalAt);
  const resting = await page.evaluate(() => ({ life: window.__homeHarness.panel.getLifeState(), actor: window.__homeHarness.panel.actor.getState() }));
  assert.equal(resting.life.current.phase, 'acting');
  assert.equal(resting.actor.word, 'stand', 'The fixture has no sleeping animation');
  assert.ok(geometry.locate(resting.actor.placement.position), 'Missing sleep pose must fall back to a safe bedside position');
  await shot('bedside-fallback');
  await root.getByTestId('home-cancel').click();
  await page.waitForFunction(() => !window.__homeHarness.panel.getLifeState().current);

  for (const itemId of ['living.tv', 'study.laptop', 'bedroom.bedside']) {
    const before = await page.evaluate(id => window.__homeHarness.panel.scene.getFurnitureVisuals()[id].power, itemId);
    const state = itemId === 'living.tv' ? await clickItem(itemId, 'toggle') : await invoke('command', [{ itemId, actionId: 'toggle' }]);
    assert.equal(await page.evaluate(id => window.__homeHarness.panel.scene.getFurnitureVisuals()[id].power, itemId), before, 'An accepted toggle changed the appliance before the actor used it');
    await until(state.life.current.endsAt);
    assert.equal(await page.evaluate(id => window.__homeHarness.panel.scene.getFurnitureVisuals()[id].power, itemId), !before);
  }
  const washer = await invoke('command', [{ itemId: 'genkan.washer', actionId: 'laundry' }]);
  await until(washer.life.current.arrivalAt);
  assert.equal(await page.evaluate(() => window.__homeHarness.panel.scene.getFurnitureVisuals()['genkan.washer'].running), true);
  await until(washer.life.current.endsAt);
  assert.equal(await page.evaluate(() => window.__homeHarness.panel.scene.getFurnitureVisuals()['genkan.washer'].running), false);
  report.checks.appliances = 'Three power switches change only after use; washer runs only during the activity';

  const seating = {};
  for (const [itemId, actionId] of [['study.desk', 'desk'], ['dining.dining', 'sit'], ['bathroom.toilet', 'toilet'], ['engawa.chair', 'sit']]) {
    const state = await clickItem(itemId, actionId);
    await until(state.life.current.arrivalAt);
    assert.equal(await page.evaluate(() => window.__homeHarness.panel.actor.getState().word), 'sit');
    const pixels = await visiblePixels(`seat-${itemId.replace('.', '-')}`, count => count > 20);
    assert.ok(pixels > 20, `The seated role was entirely hidden at ${itemId}`);
    seating[itemId] = pixels;
  }

  const sit = await clickItem('living.sofa', 'sit');
  await until(sit.life.current.arrivalAt);
  assert.equal(await page.evaluate(() => window.__homeHarness.panel.actor.getState().word), 'sit');
  await page.waitForFunction(() => window.__homeHarness.metrics.roleFrames.at(-1)?.layout.mode === 'sit');
  const seatedPixels = await visiblePixels('sofa-seated', count => count > 20);
  assert.ok(seatedPixels > 20, 'The seated role was entirely hidden by its supporting furniture');
  seating['living.sofa'] = seatedPixels;
  report.checks.seatedVisibility = seating;
  report.checks.furnitureActions = 'Real menu selection, bedside fallback and supported seated pose';
}
