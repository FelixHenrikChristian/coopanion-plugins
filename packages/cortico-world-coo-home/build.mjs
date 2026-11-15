import {build} from 'esbuild';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {getNavigationData} from '../../scenes/amane-mart/src/navigation-data.js';

const root=fileURLToPath(new URL('.',import.meta.url));
await mkdir(join(root,'web'),{recursive:true});
await mkdir(join(root,'data'),{recursive:true});
await writeFile(join(root,'data/home-layout.json'),JSON.stringify(getNavigationData())+'\n');
await copyFile(join(root,'../../scenes/amane-mart/src/navigation-query.js'),join(root,'data/navigation-query.js'));
await build({
  stdin:{contents:"import {mount} from './src/panel.js'; export default {panels:{home:{mount}}};",resolveDir:root,sourcefile:'world-panel.js',loader:'js'},
  outfile:join(root,'web/panel.js'),bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:false,legalComments:'inline',
});
await copyFile(join(root,'src/panel.css'),join(root,'web/panel.css'));
console.log('Home World panel built.');
