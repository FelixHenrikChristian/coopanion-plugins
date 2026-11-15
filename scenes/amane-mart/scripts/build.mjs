import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/', import.meta.url);
const bundle = await build({
  absWorkingDir: fileURLToPath(source),
  entryPoints: ['main.js'],
  bundle: true,
  minify: true,
  target: 'es2022',
  format: 'iife',
  legalComments: 'inline',
  write: false
});
const script = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const template = await readFile(new URL('shell.html', source), 'utf8');
const page = template.replace('<!-- SCENE -->', () => '<script>' + script + '</script>');
await writeFile(new URL('../amane-mart.html', import.meta.url), page);
