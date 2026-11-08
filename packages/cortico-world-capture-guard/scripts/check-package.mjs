import {spawnSync} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),cache=join(root,'scratch','npm-cache');await mkdir(cache,{recursive:true});
const npm=process.env.npm_execpath??join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
const result=spawnSync(process.execPath,[npm,'pack','--dry-run','--ignore-scripts','--json','--cache',cache],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
const packed=JSON.parse(result.stdout)[0];
const allowed=name=>name.startsWith('src/')||['package.json','LICENSE','describe.json','README.md','README.en.md','CHANGELOG.md','install-local.cjs','install-local.cmd'].includes(name);
const secrets=[/-----BEGIN [A-Z ]*PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{25,}\b/,/\bgithub_pat_[A-Za-z0-9_]{25,}\b/,/\b[A-Z]:[\\/]Users[\\/][^\s"']+/i,/codex-clipboard-[a-f0-9-]+/i];
for(const f of packed.files){
 assert(allowed(f.path),'Unexpected package file: '+f.path);
 const content=await readFile(join(root,f.path),'utf8');for(const pattern of secrets)assert(!pattern.test(content),'Possible private content: '+f.path);
}
assert(packed.unpackedSize<250000,'Unexpected runtime or generated data in package');
console.log(JSON.stringify({package:packed.name,version:packed.version,files:packed.files.length,bytes:packed.size,archiveAllowlistPassed:true}));
