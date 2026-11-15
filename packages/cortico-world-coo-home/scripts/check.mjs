import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import definition from '../src/index.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const manifest=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
assert.equal(manifest.name,'cortico-world-coo-home');assert.equal(manifest.cortico.api,6);assert.equal(manifest.cortico.kind,'world');
assert.equal(definition.id,'coo-home');assert.equal(manifest.private,true);assert.ok(!manifest.dependencies);
assert.deepEqual(JSON.parse(await readFile(join(root,'describe.json'),'utf8')),definition.describe);
for(const folder of ['src','scripts','test']){
  for(const file of await readdir(join(root,folder)))if(/\.(?:m?js)$/.test(file))execFileSync(process.execPath,['--check',join(root,folder,file)],{stdio:'pipe'});
}
for(const path of ['data/home-layout.json','data/navigation-query.js','web/panel.js','web/panel.css','README.md','CHANGELOG.md','LICENSE','THIRD_PARTY.md'])assert.ok((await stat(join(root,path))).size>0,`Missing ${path}`);
const {getNavigationData}=await import('../../../scenes/amane-mart/src/navigation-data.js');
assert.deepEqual(JSON.parse(await readFile(join(root,'data/home-layout.json'),'utf8')),getNavigationData(),'Rebuild the exported home layout');
assert.equal(await readFile(join(root,'data/navigation-query.js'),'utf8'),await readFile(join(root,'../../scenes/amane-mart/src/navigation-query.js'),'utf8'),'Rebuild the shared geometry queries');
execFileSync(process.execPath,['--check',join(root,'web/panel.js')],{stdio:'pipe'});
console.log('Home World manifest, sources and build checked.');
