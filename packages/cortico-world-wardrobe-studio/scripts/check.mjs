import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import definition from '../src/index.js';
import {DESCRIBE} from '../src/tools.js';
import assert from 'node:assert/strict';
for(const dir of ['src','web','scripts','test'])for(const entry of await readdir(new URL('../'+dir+'/',import.meta.url))){
 if(!/\.[cm]?js$/.test(entry))continue;
 const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL('../'+dir+'/'+entry,import.meta.url))],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
}
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const describe=JSON.parse(await readFile(new URL('../describe.json',import.meta.url),'utf8'));
assert.deepEqual(describe,DESCRIBE);assert.equal(pkg.cortico.api,6);assert.equal(pkg.cortico.kind,'world');
assert(pkg.keywords.includes('cortico-world'));assert.equal(definition.id,'wardrobe-studio');
console.log('Syntax and extension declarations passed');
