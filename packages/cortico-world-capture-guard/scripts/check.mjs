import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import definition from '../src/index.js';
for(const dir of ['src','scripts','test'])for(const name of await readdir(new URL('../'+dir+'/',import.meta.url))){
 if(!/\.[cm]?js$/.test(name))continue;
 const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL('../'+dir+'/'+name,import.meta.url))],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
}
const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL('../install-local.cjs',import.meta.url))],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(pkg.cortico.api,6);assert.equal(pkg.cortico.kind,'world');assert.equal(definition.id,'capture-guard');
assert.deepEqual(JSON.parse(await readFile(new URL('../describe.json',import.meta.url),'utf8')),definition.describe);
assert.equal(pkg.repository.directory,'packages/'+pkg.name);
console.log('Capture Guard syntax and World declarations passed');
