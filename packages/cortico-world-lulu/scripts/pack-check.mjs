import {spawnSync} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),cache=join(root,'scratch/npm-cache');await mkdir(cache,{recursive:true});
const npm=process.env.npm_execpath??join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const result=spawnSync(process.execPath,[npm,'pack','--dry-run','--ignore-scripts','--json','--cache',cache],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
const manifest=JSON.parse(result.stdout)[0];
for(const file of manifest.files){assert(/^(src|web)\//.test(file.path)||['assets/icon.svg','README.md','CHANGELOG.md','LICENSE','package.json','describe.json'].includes(file.path),file.path);const content=await readFile(join(root,file.path),'utf8');assert(!/-----BEGIN .*PRIVATE KEY-----|\bgithub_pat_|\bgh[pousr]_[a-zA-Z0-9]{25,}|[A-Z]:[\\/]Users[\\/]|codex-clipboard-/i.test(content),file.path);}
assert(manifest.unpackedSize<1024*1024);console.log(JSON.stringify({files:manifest.files.map(f=>f.path),packedBytes:manifest.size,unpackedBytes:manifest.unpackedSize},null,2));
