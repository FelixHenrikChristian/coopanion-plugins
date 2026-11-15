import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const npm=process.env.npm_execpath??join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const output=execFileSync(process.execPath,[npm,'pack','--dry-run','--ignore-scripts','--json'],{cwd:root,encoding:'utf8'});
const [archive]=JSON.parse(output);
const allowed=new Set(['package.json','src/index.js','src/appearance.js','src/navigation.js','src/life.js','src/storage.js','data/home-layout.json','data/navigation-query.js','web/panel.js','web/panel.css','describe.json','README.md','CHANGELOG.md','LICENSE','THIRD_PARTY.md']);
assert.equal(archive.files.length,allowed.size,'Unexpected files in archive');
for(const file of archive.files){
  assert.ok(allowed.delete(file.path),`Unexpected package file: ${file.path}`);
  const text=await readFile(join(root,file.path),'utf8');
  assert.ok(!/(?:[A-Z]:[\\/](?:Users|Gaming)[\\/]|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|ghp)_[A-Za-z0-9]{20,})/.test(text),`Private deployment data in ${file.path}`);
}
assert.equal(allowed.size,0);assert.ok(archive.unpackedSize<8*1024*1024,'Unexpected large assets in package');
console.log(`Home World archive checked: ${archive.files.length} public files, ${archive.unpackedSize} bytes.`);
