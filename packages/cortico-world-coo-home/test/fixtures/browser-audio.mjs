import assert from 'node:assert/strict';

export async function verifyBrowserAudio({ fixture, page, root }) {
  const state = () => page.evaluate(() => window.__homeHarness.panel.audio.getState());
  const speak = id => page.evaluate(id => { void window.__homeHarness.panel.audio.speak('中性合成音节'.repeat(30), { utteranceId: id }); }, id);
  const speaking = () => page.waitForFunction(() => window.__homeHarness.panel.audio.getState().playing > 0);
  await root.getByTestId('home-chat-toggle').click();
  assert.equal((await state()).unlocked, true);
  await speak('neutral-audio-start'); await speaking();
  const initial = await state(), figure = await root.getByTestId('home-figure').getAttribute('data-generation');
  assert.equal(initial.contextCount, 1);
  fixture.setAudio({ enabled: false });
  await page.waitForFunction(generation => { const s = window.__homeHarness.panel.audio.getState(); return s.generation > generation && s.playing === 0; }, initial.generation);
  assert.equal(await root.getByTestId('home-figure').getAttribute('data-generation'), figure, 'Changing audio preferences recreated the selected figure');
  const muted = await state(); await speak('neutral-muted');
  assert.equal((await state()).spokenCount, muted.spokenCount);
  fixture.setAudio({ volume: 20 });
  await page.waitForFunction(generation => window.__homeHarness.panel.audio.getState().generation > generation, muted.generation);
  await speak('neutral-audio-resume'); await speaking();
  await root.evaluate(element => { element.style.display = 'none'; });
  await page.waitForFunction(() => { const s = window.__homeHarness.panel.audio.getState(); return !s.shown && s.playing === 0 && s.contextState === 'suspended'; });
  const hidden = await state(); await speak('neutral-hidden');
  assert.equal((await state()).spokenCount, hidden.spokenCount, 'Hidden content started speech');
  await root.evaluate(element => { element.style.display = ''; });
  await page.waitForFunction(() => window.__homeHarness.panel.audio.getState().shown);
  await speak('neutral-before-role-change'); await speaking();
  const beforeSwitch = await state();
  fixture.setAppearance('fixture-kite', 'plain');
  await page.waitForFunction(generation => { const s = window.__homeHarness.panel.audio.getState(); return s.generation > generation && s.playing === 0; }, beforeSwitch.generation);
  await page.waitForFunction(() => window.__homeHarness.panel.actor.getState().ready);
  assert.equal((await state()).contextCount, 1, 'A preference change leaked an AudioContext');
  await root.getByTestId('home-chat-close').click();

  const second = await page.context().newPage();
  try {
    await second.goto(fixture.hostOrigin);
    await second.waitForFunction(() => window.__homeHarness?.panel?.actor?.getState().ready, undefined, { timeout: 90000 });
    await second.getByTestId('home-chat-toggle').click();
    await second.evaluate(() => { void window.__homeHarness.panel.audio.speak('第二个中性音节测试', { utteranceId: 'second-panel' }); });
    await second.waitForFunction(() => window.__homeHarness.panel.audio.getState().playing > 0);
    const secondState = await second.evaluate(() => window.__homeHarness.panel.audio.getState());
    assert.equal(secondState.contextCount, 1);
    assert.equal((await state()).playing, 0, 'Another panel reused this panel audio sources');
    await second.evaluate(async () => { window.__lastFixtureAudio = window.__homeHarness.panel.audio; await window.__homeHarness.unmount(); });
    const disposed = await second.evaluate(() => window.__lastFixtureAudio.getState());
    assert.equal(disposed.disposed, true); assert.equal(disposed.contextState, 'closed'); assert.equal(disposed.playing, 0);
    assert.equal(disposed.cacheEntries, 0);
    assert.equal(await second.locator('iframe[data-testid="home-figure"]').count(), 0);
    assert.equal((await state()).disposed, false, 'Unmounting one panel disposed another panel audio');
  } finally { await second.close(); }
  return { source: 'Generated neutral PCM only', preferences: 'Mute and volume update without replacing the figure',
    hidden: 'Sources stop and context suspends; hidden speech is ignored', switching: 'Old character audio stopped with one context per panel',
    instances: 'Two independent panels; closing one releases its sources, context and caches' };
}
