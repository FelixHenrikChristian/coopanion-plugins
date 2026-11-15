import assert from 'node:assert/strict';

export async function verifyBrowserGarden({ fixture, page, root, canvas, view, painted, shot, messagesOnly = false }) {
  const id = 'plot-1';
  const states = [];
  await fixture.invoke('settings', [{ autonomy: false }]);
  await fixture.invoke('cancel');
  await view('open');
  await page.evaluate(id => {
    const scene = window.__homeHarness.panel.scene, p = scene.getItem(id).anchor;
    scene.setCameraPose({ eye: [p[0] + 3.4, p[1] + 5, p[2] + 4], target: p });
  }, id);
  await painted(8);

  async function sync(state) {
    await page.waitForFunction(({ revision, now }) => {
      const life = window.__homeHarness.panel.getLifeState();
      return life?.revision >= revision && life.now >= now;
    }, { revision: state.life.revision, now: state.life.now });
    await painted(5);
    return state;
  }
  async function select() {
    const point = await page.evaluate(id => {
      const scene = window.__homeHarness.panel.scene, p = scene.project(scene.getItem(id).anchor);
      for (const dx of [0, -10, 10, -25, 25, -45, 45]) for (const dy of [0, 10, -10, 25, -25, 45, -45]) {
        const x = p.x + dx, y = p.y + dy;
        if (scene.pickSurface(x, y)?.itemId === id) return { x, y };
      }
      return null;
    }, id);
    assert.ok(point, 'The plot must remain clickable after harvesting');
    await canvas.click({ position: point });
    await root.getByTestId('home-plot-details').waitFor({ state: 'visible' });
  }
  async function metrics() {
    return page.evaluate(id => {
      const scene = window.__homeHarness.panel.scene;
      const supports = [], plants = [], seeds = [];
      scene.getObject(id).traverse(part => {
        const role = part.userData.cropRole;
        if (role === 'supports') supports.push({ uuid: part.uuid, visible: part.visible, matrix: Array.from(part.matrix.elements), instances: Array.from(part.instanceMatrix?.array || []) });
        if (role === 'plants') plants.push({ uuid: part.uuid, visible: part.visible, fruit: !!part.userData.cropFruit, instances: Array.from(part.instanceMatrix.array) });
        if (role === 'seed') seeds.push({ visible: part.visible, count: part.count });
      });
      return { supports, plants, seeds, state: scene.getPlotVisuals().plots.find(plot => plot.id === id) };
    }, id);
  }
  const initial = await metrics();
  assert.equal(initial.state.stage, 'ripe');
  assert.ok(initial.supports.length > 0, 'The tomato plot needs its permanent support frame');
  async function record(stage) {
    const state = fixture.snapshot();
    await sync(state);
    await select();
    const detail = root.getByTestId('home-plot-details');
    assert.equal(await detail.getAttribute('data-plot-id'), id);
    assert.equal(await detail.getAttribute('data-stage'), stage);
    const plot = state.life.garden.plots.find(plot => plot.id === id);
    assert.ok(Math.abs(Number(await detail.getAttribute('data-growth')) - plot.growth) < .01);
    const current = await metrics();
    assert.equal(current.state.stage, stage);
    assert.ok(Math.abs(current.state.growth - plot.growth) <= .0051);
    assert.deepEqual(current.supports, initial.supports, 'The permanent trellis shrank or changed with its crop');
    if (stage === 'empty') assert.ok(current.plants.every(mesh => !mesh.visible) && current.seeds.every(mesh => !mesh.visible));
    if (stage === 'seeded') assert.ok(current.plants.every(mesh => !mesh.visible) && current.seeds.some(mesh => mesh.visible));
    if (['seedling', 'growing', 'ripe'].includes(stage)) assert.ok(current.plants.some(mesh => mesh.visible));
    if (stage === 'seedling') assert.ok(current.plants.filter(mesh => mesh.fruit).every(mesh => !mesh.visible));
    if (stage === 'ripe') assert.deepEqual(current.plants, initial.plants, 'The mature crop did not regain its approved geometry');
    for (const canonical of ['sow', 'water', 'harvest']) {
      const button = root.locator(`[data-testid="home-action"][data-item-id="${id}"][data-canonical="${canonical}"]`);
      assert.equal(await button.isDisabled(), !plot.actions[canonical], `Menu availability is stale for ${canonical}`);
    }
    states.push(structuredClone(state.life.garden));
    await shot(`garden-${stage}`);
    return current;
  }
  async function act(canonical) {
    await select();
    const before = fixture.snapshot().life.garden.plots.find(plot => plot.id === id).stage;
    await root.locator(`[data-testid="home-action"][data-item-id="${id}"][data-canonical="${canonical}"]`).click();
    await page.waitForFunction(id => window.__homeHarness.panel.getLifeState()?.current?.itemId === id, id);
    const state = fixture.snapshot(), task = state.life.current;
    assert.equal(state.life.garden.plots.find(plot => plot.id === id).stage, before);
    await sync(await fixture.advanceTo(task.endsAt + 10));
  }

  await record('ripe');
  // Checking "enqueue" with no current manual task still starts a task now.
  await root.getByTestId('home-enqueue').check();
  await root.locator(`[data-testid="home-action"][data-item-id="${id}"][data-canonical="harvest"]`).click();
  await page.waitForFunction(id => window.__homeHarness.panel.getLifeState()?.current?.itemId === id, id);
  await page.waitForFunction(() => document.querySelector('.coo-home-item')?.textContent === '已收到，准备过去。');
  assert.equal(fixture.snapshot().life.queue.length, 0);
  await select();
  const futureSow = root.locator(`[data-testid="home-action"][data-item-id="${id}"][data-canonical="sow"]`);
  assert.equal(await futureSow.isDisabled(), false, 'A future sowing task could not be queued behind harvesting');
  await futureSow.click();
  await page.waitForFunction(() => window.__homeHarness.panel.getLifeState().queue.length === 1);
  await page.waitForFunction(() => document.querySelector('.coo-home-item')?.textContent === '已加入待办队列。');
  await sync(await fixture.invoke('cancel'));
  await select();
  await root.getByTestId('home-enqueue').uncheck();
  assert.equal(await futureSow.isDisabled(), true);
  // A transport conflict exercises the real panel's failure branch; no mock
  // activity result or garden state is manufactured by this rejected request.
  await page.route('**/invoke', route => {
    const request = route.request().postDataJSON();
    assert.equal(request.method, 'command');
    assert.equal(request.args[0].itemId, id);
    return route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"Synthetic request conflict"}' });
  }, { times: 1 });
  await root.locator(`[data-testid="home-action"][data-item-id="${id}"][data-canonical="harvest"]`).click();
  await page.waitForFunction(() => document.querySelector('.coo-home-item')?.textContent === '菜畦状态或任务已变化，请查看当前进度后重试。');
  assert.equal(fixture.snapshot().life.current, null);
  assert.equal(fixture.snapshot().life.garden.plots.find(plot => plot.id === id).stage, 'ripe');
  const messages = { futureStageQueued: true, noActiveTaskNotMisreportedAsQueued: true, failedRequestNotReportedComplete: true };
  if (messagesOnly) return messages;
  await act('harvest');
  await record('empty');
  await act('sow');
  await record('seeded');
  await act('water');
  const seedling = await record('seedling');
  const live = fixture.snapshot().life.garden.plots.find(plot => plot.id === id);
  await sync(await fixture.advanceTo(live.growthStartedAt + live.durationMs * .60));
  const growing = await record('growing');
  assert.notDeepEqual(growing.plants, seedling.plants, 'Seedlings and growing plants looked identical');
  await sync(await fixture.advanceTo(live.readyAt + 10));
  await record('ripe');

  // Exercise the same real snapshots repeatedly through the scene API. This
  // stress check does not advance or invent household simulation outcomes.
  await fixture.invoke('pause');
  const resourceResult = await page.evaluate(async states => {
    const scene = window.__homeHarness.panel.scene;
    const step = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const state of states) { scene.setPlotVisuals(state); await step(); }
    const before = scene.getRendererInfo();
    for (let cycle = 0; cycle < 12; cycle++) for (const state of states) { scene.setPlotVisuals(state); await step(); }
    const after = scene.getRendererInfo();
    scene.setPlotVisuals(window.__homeHarness.panel.getLifeState().garden);
    return { before, after };
  }, states);
  for (const key of ['geometries', 'textures', 'programs']) assert.equal(resourceResult.after[key], resourceResult.before[key], `Crop cycles leaked renderer ${key}`);
  await fixture.invoke('resume');
  return { stages: ['ripe', 'empty', 'seeded', 'seedling', 'growing', 'ripe'], messages, permanentSupportsUnchanged: true, matureGeometryRestored: true, uiAvailabilityMatchesStages: true, repeatedCycles: 12, resources: { geometries: resourceResult.after.geometries, textures: resourceResult.after.textures, programs: resourceResult.after.programs } };
}
