import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const fixtureConstitution = 'NEUTRAL_CONSTITUTION_MARKER: A generated test character who describes accepted tasks accurately.';

export async function installFixtureProvider({ extensions, home }) {
  const moduleName = 'cortico-provider-coo-home-fixture';
  const directory = join(extensions, 'node_modules', moduleName);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: moduleName, version: '0.0.0', private: true,
    type: 'module', main: 'index.mjs', cortico: { kind: 'provider', api: 6 } }));
  await writeFile(join(directory, 'index.mjs'), await readFile(new URL('./provider.mjs', import.meta.url)));
  const endpoints = new Map();
  for (const [name, auth] of [['fixture-model', 'key'], ['fixture-oauth', 'oauth']]) {
    const stateDir = join(home, 'providers', name);
    await mkdir(stateDir, { recursive: true });
    const spec = { model: auth === 'key' ? 'fixture-model-v1' : 'fixture-model-v2', thinking: true,
      reasoningEffort: auth === 'key' ? 'high' : 'low', temperature: .23, maxTokens: 321 };
    await writeFile(join(stateDir, 'config.json'), JSON.stringify({ kind: 'coo-home-fixture', baseUrl: 'http://127.0.0.1/unused', spec,
      ...(auth === 'key' ? { secret: 'FIXTURE_MODEL_KEY' } : { options: { fixtureAuth: 'oauth' } }) }));
    if (auth === 'key') await writeFile(join(stateDir, '.env'), 'FIXTURE_MODEL_KEY=synthetic-test-only\n');
    else await writeFile(join(stateDir, 'session.json'), JSON.stringify({ accessToken: 'synthetic-oauth-test-only' }));
    await writeFile(join(stateDir, 'control.json'), JSON.stringify({ id: `idle-${name}`, steps: [{ text: 'Neutral fixture ready.' }] }));
    endpoints.set(name, { stateDir, spec });
  }
  return {
    moduleName,
    spec(name = 'fixture-model') { return endpoints.get(name).spec; },
    async plan(value, name = 'fixture-model') { await writeFile(join(endpoints.get(name).stateDir, 'control.json'), JSON.stringify(value)); },
    async audit(name = 'fixture-model') {
      try { return (await readFile(join(endpoints.get(name).stateDir, 'audit.jsonl'), 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line)); }
      catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    },
  };
}
