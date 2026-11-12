import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
await build({
  absWorkingDir: fileURLToPath(new URL('./', import.meta.url)),
  entryPoints: ['src/panel.js'],
  outfile: 'web/panel.js',
  format: 'esm',
  loader: { '.webp': 'dataurl' },
  bundle: true,
  minify: true,
  target: 'es2020',
  legalComments: 'eof',
});
