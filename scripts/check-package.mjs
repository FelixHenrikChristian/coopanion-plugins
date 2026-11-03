import {spawnSync} from 'node:child_process';
import {readFile,mkdir,stat} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),cache=join(root,'scratch','npm-cache');await mkdir(cache,{recursive:true});
const npmCli=process.env.npm_execpath??join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
const result=spawnSync(process.execPath,[npmCli,'pack','--dry-run','--ignore-scripts','--json','--cache',cache],{cwd:root,encoding:'utf8'});
assert.equal(result.status,0,result.stderr);const manifest=JSON.parse(result.stdout)[0];
const allowed=name=>/^(src|web|docs|examples)\//.test(name)||['package.json','assets/icon.svg','assets/wardrobe.png','describe.json','README.md','README_zh.md','README.en.md','CHANGELOG.md','LICENSE'].includes(name);
const secrets=[/-----BEGIN [A-Z ]*PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{25,}\b/,/\bgithub_pat_[A-Za-z0-9_]{25,}\b/,/\b[A-Z]:[\\/]Users[\\/][^\s"']+/i,/codex-clipboard-[a-f0-9-]+/i];
for(const f of manifest.files){
 assert(allowed(f.path),`Unexpected packaged file: ${f.path}`);
 assert(!f.path.split('/').some(p=>['private','local-data','node_modules','.git','scratch'].includes(p)),f.path);
 if(/\.(?:js|mjs|json|md|css|svg)$/.test(f.path)){
  const content=await readFile(join(root,f.path),'utf8');for(const pattern of secrets)assert(!pattern.test(content),`Review possible private content: ${f.path}`);
 }
}
assert(manifest.unpackedSize<2*1024*1024,'Unexpected package size; inspect media and caches');
const screenshot=await stat(join(root,'assets/wardrobe.png'));assert(screenshot.size<2*1024*1024);
console.log(JSON.stringify({status:'ALLOWLIST_AND_PATTERN_CHECK_PASS',files:manifest.files.map(f=>f.path),packedBytes:manifest.size,unpackedBytes:manifest.unpackedSize,manualContentReviewStillRequired:true},null,2));
