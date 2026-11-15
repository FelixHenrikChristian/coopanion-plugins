import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

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

export async function startFixtureServer({ bundlePath, stylePath }) {
  const requests = [];
  const streams = new Set();
  const mutations = [];
  let currentPack = 'fixture-round';
  let currentScheme = 'plain';
  let petOrigin;
  let hostOrigin;
  let disconnected = false;
  const reply = (response, code, body, type = 'application/json') => {
    response.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    response.end(type === 'application/json' ? JSON.stringify(body) : body);
  };
  const appearance = () => disconnected
    ? { connected: false, descriptor: null, message: 'Fixture service disconnected' }
    : {
      connected: true,
      descriptor: {
        key: `${currentPack}:${currentScheme}`, frameUrl: `${petOrigin}/figure-frame?pack=${currentPack}`,
        entry: `${petOrigin}/fixture-entry.js`, exportName: 'createFigure', baseUrl: `${petOrigin}/`,
        model: null, scheme: currentScheme, skin: { figure: currentPack, scheme: currentScheme },
        words: ['stand', 'walk', 'sit'], can: { walk: true },
      },
    };
  const snapshot = () => ({ phase: 'foundation', appearance: appearance() });
  const publish = () => { for (const response of streams) response.write(`data: ${JSON.stringify(snapshot())}\n\n`); };

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
        response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        streams.add(response);
        response.write(`data: ${JSON.stringify(snapshot())}\n\n`);
        request.on('close', () => streams.delete(response));
        return;
      }
      if (url.pathname === '/invoke' && request.method === 'POST') {
        let body = '';
        for await (const part of request) { body += part; if (body.length > 8192) throw new Error('Fixture request too large'); }
        const value = JSON.parse(body);
        if (value.method !== 'status') return reply(response, 400, { error: `Unsupported fixture invoke: ${value.method}` });
        return reply(response, 200, snapshot());
      }
      if (url.pathname === '/stream-input' && request.method === 'POST') return reply(response, 200, { ok: true });
      if (url.pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
      return reply(response, 404, { error: 'Unknown fixture route' });
    } catch (error) { reply(response, 500, { error: error.message }); }
  });
  hostOrigin = await listen(host);
  return {
    hostOrigin, petOrigin, requests, mutations,
    setAppearance(pack, scheme = 'plain') {
      if (!['fixture-round', 'fixture-kite'].includes(pack) || !['plain', 'stripe'].includes(scheme)) throw new Error('Unknown neutral fixture');
      currentPack = pack; currentScheme = scheme; disconnected = false; publish();
    },
    disconnect() { disconnected = true; publish(); },
    reconnect() { disconnected = false; publish(); },
    get streamCount() { return streams.size; },
    async dispose() { for (const response of streams) response.end(); streams.clear(); await Promise.all([close(host), close(pet)]); },
  };
}
