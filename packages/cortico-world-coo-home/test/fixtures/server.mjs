import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { CooHomeWorld } from '../../src/index.js';
import { neutralWave, neutralAudioProfile, neutralSpeechUnits } from './audio.mjs';

const fixtureRoot = new URL('./', import.meta.url);
const readFixture = (name) => readFile(new URL(name, fixtureRoot));
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>html,body{margin:0;width:100%;height:100%;background:#080d18;color:#eee}#mount{width:100%;height:100vh;overflow:hidden}</style></head><body><main id="mount"></main><script type="module" src="/harness.js"></script></body></html>`;
const figurePage = '<!doctype html><html><head><meta charset="utf-8"><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}</style></head><body><div id="root"></div><script type="module" src="/figure-frame.js"></script></body></html>';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

export async function startFixtureServer({ bundlePath, stylePath, initialSave = null, initialTime = null, prepare = null, worldOptions = {}, worldHost = {} }) {
  const requests = [];
  const streams = new Set();
  const streamReceivers = new Map();
  const mutations = [];
  let currentPack = 'fixture-round';
  let currentScheme = 'plain';
  let petOrigin;
  let hostOrigin;
  let disconnected = false;
  let audioRevision = 0;
  let audioSettings = {};
  let world;
  let appearanceChanged = () => {};
  let offset = Number.isFinite(initialTime) ? initialTime - Date.now() : 0;
  const navigationCalls = { detailed: 0, prepared: 0 };
  const temporary = await mkdtemp(join(tmpdir(), 'coo-home-browser-'));
  const clock = () => Date.now() + offset;
  async function removeTemporary() {
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(basename(temporary).startsWith('coo-home-browser-'));
    await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  if (initialSave) {
    await mkdir(join(temporary, 'coo-home'), { recursive: true });
    await writeFile(join(temporary, 'coo-home/state.json'), JSON.stringify(initialSave));
  }
  await prepare?.({ directory: temporary });
  const reply = (response, code, body, type = 'application/json') => {
    response.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    response.end(type === 'application/json' ? JSON.stringify(body) : body);
  };
  const appearance = () => disconnected
    ? { connected: false, descriptor: null, message: 'Fixture service disconnected' }
    : {
      connected: true,
      audio: neutralAudioProfile(`neutral-${currentPack}-${currentScheme}-${audioRevision}`, audioSettings),
      descriptor: {
        key: `${currentPack}:${currentScheme}`, frameUrl: `${petOrigin}/figure-frame?pack=${currentPack}`,
        entry: `${petOrigin}/fixture-entry.js`, exportName: 'createFigure', baseUrl: `${petOrigin}/`,
        model: null, scheme: currentScheme, skin: { figure: currentPack, scheme: currentScheme },
        words: ['stand', 'walk', 'sit', ...(currentPack === 'fixture-rest' ? ['sleep'] : [])], can: { walk: true },
      },
    };
  const snapshot = () => world.status();
  async function startWorld() {
    world = new CooHomeWorld({ botDir: temporary, dataDir: temporary }, {
      ...worldOptions,
      clock,
      bridgeFactory({ onChange }) {
        appearanceChanged = onChange;
        const valid = args => { if (args?.key !== appearance().audio?.key) throw Error('Stale neutral audio profile'); };
        const binary = () => ({ $binary: { mime: 'audio/wav', base64: neutralWave().toString('base64') } });
        return {
          snapshot: appearance, async start() { onChange(); }, async stop() {},
          async speechUnits(args) { valid(args); return neutralSpeechUnits(args.text); },
          async speechBank(args) { valid(args); return args.part === 'manifest' ? { hz: 400, units: { a: [0, .08] } } : binary(); },
          async soundAsset(args) { valid(args); if (args.name !== 'neutral-tone.wav') throw Error('Unknown neutral sound'); return binary(); },
        };
      },
    });
    await world.start(worldHost);
    for (const [method, counter] of [['route', 'detailed'], ['preparedRoute', 'prepared']]) {
      const original = world.life.navigation[method];
      if (typeof original !== 'function') throw new Error(`Missing real navigation method: ${method}`);
      world.life.navigation[method] = function (...args) {
        navigationCalls[counter]++;
        return original.apply(this, args);
      };
    }
  }

  const pet = createServer(async (request, response) => {
    const url = new URL(request.url, petOrigin || 'http://127.0.0.1');
    requests.push({ surface: 'pet', method: request.method, path: url.pathname, query: url.search });
    try {
      if (request.method !== 'GET') {
        mutations.push({ method: request.method, path: url.pathname });
        return reply(response, 405, { error: 'Fixture pet service is read-only' });
      }
      if (url.pathname === '/figure-frame') {
        response.setHeader('content-security-policy', `sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors ${hostOrigin}`);
        return reply(response, 200, figurePage, 'text/html; charset=utf-8');
      }
      if (url.pathname === '/figure-frame.js') return reply(response, 200, await readFixture('figure-frame.js'), 'text/javascript; charset=utf-8');
      if (url.pathname === '/fixture-entry.js') return reply(response, 200, 'export function createFigure(){}', 'text/javascript; charset=utf-8');
      if (url.pathname === '/api/state') return reply(response, 200, { skin: { figure: currentPack, scheme: currentScheme } });
      if (url.pathname === '/api/figures') return reply(response, 200, { figures: [] });
      return reply(response, 404, { error: 'Unknown fixture route' });
    } catch (error) { reply(response, 500, { error: error.message }); }
  });
  petOrigin = await listen(pet);
  const host = createServer(async (request, response) => {
    const url = new URL(request.url, hostOrigin || 'http://127.0.0.1');
    requests.push({ surface: 'host', method: request.method, path: url.pathname, query: url.search });
    try {
      if (url.pathname === '/') return reply(response, 200, page, 'text/html; charset=utf-8');
      if (url.pathname === '/bundle.js') return reply(response, 200, await readFile(bundlePath), 'text/javascript; charset=utf-8');
      if (url.pathname === '/style.css') return reply(response, 200, await readFile(stylePath), 'text/css; charset=utf-8');
      if (url.pathname === '/harness.js') return reply(response, 200, await readFixture('harness.js'), 'text/javascript; charset=utf-8');
      if (url.pathname === '/fixture-config') return reply(response, 200, { petOrigin });
      if (url.pathname === '/events') {
        const panelId = url.searchParams.get('panel') || 'home';
        if (!['home', 'settings', 'environment'].includes(panelId)) throw new Error('Unknown fixture panel');
        response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        streams.add(response);
        const callbacks = new Set();
        const messages = new Set();
        const streamId = url.searchParams.get('id');
        if (!streamId || streamId.length > 80) throw new Error('Fixture stream needs an ID');
        streamReceivers.set(streamId, messages);
        let open = true;
        const close = () => {
          if (!open) return;
          open = false;
          streams.delete(response);
          if (streamReceivers.get(streamId) === messages) streamReceivers.delete(streamId);
          for (const callback of callbacks) callback();
          callbacks.clear();
          response.end();
        };
        world.webUi('en').stream(panelId, {
          get open() { return open; },
          send(text) { if (open) response.write(`data: ${text}\n\n`); },
          close,
          onClose(callback) { callbacks.add(callback); },
          onMessage(callback) { messages.add(callback); return () => messages.delete(callback); },
        });
        request.on('close', close);
        return;
      }
      if (url.pathname === '/invoke' && request.method === 'POST') {
        let body = '';
        for await (const part of request) { body += part; if (body.length > 64000) throw new Error('Fixture request too large'); }
        const value = JSON.parse(body);
        const result = await world.webUi('en').invoke(value.panelId || 'home', value.method, value.args || []);
        if (result?.$binary) return reply(response, 200, Buffer.from(result.$binary.base64, 'base64'), result.$binary.mime);
        return reply(response, 200, result);
      }
      if (url.pathname === '/stream-input' && request.method === 'POST') {
        let body = '';
        for await (const part of request) { body += part; if (body.length > 8192) throw new Error('Fixture stream input too large'); }
        for (const callback of streamReceivers.get(url.searchParams.get('id')) || []) callback(body);
        return reply(response, 200, { ok: true });
      }
      if (url.pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
      return reply(response, 404, { error: 'Unknown fixture route' });
    } catch (error) { reply(response, 500, { error: error.message }); }
  });
  hostOrigin = await listen(host);
  try { await startWorld(); }
  catch (error) {
    await world?.stop();
    await Promise.all([close(host), close(pet)]);
    await removeTemporary();
    throw error;
  }
  return {
    hostOrigin, petOrigin, requests, mutations,
    snapshot,
    async invoke(method, args = [], panelId = 'home') { return world.webUi('en').invoke(panelId, method, args); },
    async advanceTo(timestamp) {
      if (!Number.isFinite(timestamp) || timestamp < clock()) throw new Error('Fixture clock must move forward');
      offset += timestamp - clock();
      await world.tick();
      return snapshot();
    },
    async advance(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error('Invalid fixture elapsed time');
      offset += milliseconds;
      await world.tick();
      return snapshot();
    },
    async restart(offlineMilliseconds = 0) {
      if (!Number.isFinite(offlineMilliseconds) || offlineMilliseconds < 0) throw new Error('Invalid fixture offline time');
      await world.stop();
      offset += offlineMilliseconds;
      await startWorld();
      return snapshot();
    },
    catalog() { return structuredClone(world.life.catalog); },
    navigationCalls() { return { ...navigationCalls }; },
    resetNavigationCalls() { navigationCalls.detailed = 0; navigationCalls.prepared = 0; },
    async readSave() { return JSON.parse(await readFile(join(temporary, 'coo-home/state.json'), 'utf8')); },
    setAppearance(pack, scheme = 'plain') {
      if (!['fixture-round', 'fixture-kite', 'fixture-rest'].includes(pack) || !['plain', 'stripe'].includes(scheme)) throw new Error('Unknown neutral fixture');
      currentPack = pack; currentScheme = scheme; disconnected = false; appearanceChanged();
    },
    setAudio(settings) { audioSettings = structuredClone(settings); audioRevision++; appearanceChanged(); },
    disconnect() { disconnected = true; appearanceChanged(); },
    reconnect() { disconnected = false; appearanceChanged(); },
    get streamCount() { return streams.size; },
    async dispose() {
      await world.stop();
      for (const response of streams) response.end();
      streams.clear();
      await Promise.all([close(host), close(pet)]);
      await removeTemporary();
    },
  };
}
