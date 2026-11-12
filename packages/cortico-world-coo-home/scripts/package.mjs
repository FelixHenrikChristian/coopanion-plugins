import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import world from '../world.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await fs.readFile(join(root, 'package.json'), 'utf8'));
const file = join(root, pkg.cortico.describe);
const mode = process.argv[2];
if (mode === 'describe') {
  await fs.writeFile(file, JSON.stringify(world.describe, null, 2) + '\n');
} else if (mode === 'check') {
  assert.equal(pkg.cortico.api, 6);
  assert.equal(pkg.cortico.kind, 'world');
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), world.describe);
  await Promise.all(
    [
      pkg.main,
      pkg.cortico.webUiClient,
      pkg.cortico.webUiStyle,
      'src/layout.js',
      'THIRD_PARTY.md',
      'LICENSE',
    ].map((p) => fs.access(join(root, p))),
  );
  const client = (
    await import(new URL('../' + pkg.cortico.webUiClient, import.meta.url))
  ).default;
  assert.deepEqual(Object.keys(client.panels).sort(), ['room']);
  console.log('Manifest, panels, description and assets OK.');
} else if (mode === 'pack') {
  const npm =
    process.env.npm_execpath ??
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const [archive] = JSON.parse(
    execFileSync(
      process.execPath,
      [npm, 'pack', '--dry-run', '--json', '--ignore-scripts'],
      { cwd: root, encoding: 'utf8' },
    ),
  );
  const names = archive.files.map((f) => f.path);
  for (const f of [
    pkg.cortico.webUiClient,
    pkg.cortico.webUiStyle,
    'world.js',
    'src/life.js',
    'src/scene.js',
    'src/layout.js',
    'THIRD_PARTY.md',
    'LICENSE',
    'describe.json',
  ])
    assert.ok(names.includes(f), f);
  assert.ok(
    !names.some((n) => /node_modules|\.env|\.local\.json|^work\//.test(n)),
  );
  console.log('Archive OK:', names.length, 'files.');
} else throw Error('Use describe, check, or pack.');
