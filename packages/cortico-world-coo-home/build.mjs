import {build} from 'esbuild';
import {copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('.',import.meta.url));
await mkdir(join(root,'web'),{recursive:true});
await build({
  stdin:{contents:"import {mount} from './src/panel.js'; export default {panels:{home:{mount}}};",resolveDir:root,sourcefile:'world-panel.js',loader:'js'},
  outfile:join(root,'web/panel.js'),bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:false,legalComments:'inline',
});
await copyFile(join(root,'src/panel.css'),join(root,'web/panel.css'));
console.log('Home World panel built.');
