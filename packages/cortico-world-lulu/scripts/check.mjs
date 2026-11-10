import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import definition from '../src/index.js';
import {DESCRIBE,PROFILE,SCHEMES} from '../src/catalog.js';
for(const folder of ['src','web','figure','scripts','test'])for(const entry of await readdir(new URL('../'+folder+'/',import.meta.url))){if(!/\.[cm]?js$/.test(entry))continue;const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL('../'+folder+'/'+entry,import.meta.url))],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
assert.equal(definition.id,'lulu');assert.deepEqual(JSON.parse(await readFile(new URL('../describe.json',import.meta.url),'utf8')),DESCRIBE);
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert(pkg.keywords?.includes('cortico-world'));
assert.deepEqual(new Set(PROFILE.outfits.flatMap(o=>o.variants.map(v=>v.scheme))),new Set(Object.keys(SCHEMES)));
console.log('Lulu syntax, declarations and wardrobe mapping passed');
