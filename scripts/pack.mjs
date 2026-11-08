import {mkdir,readdir,readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=join(root,'dist');
await mkdir(dist,{recursive:true});
const npm=process.env.npm_execpath??join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
for(const entry of await readdir(join(root,'packages'),{withFileTypes:true})){
 if(!entry.isDirectory())continue;
 const dir=join(root,'packages',entry.name),pkg=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));
 const result=spawnSync(process.execPath,[npm,'pack','--ignore-scripts','--json','--pack-destination',dist,'--cache',join(root,'scratch','npm-cache')],{cwd:dir,encoding:'utf8'});
 if(result.status!==0)throw Error(result.stderr||'npm pack failed');
 const packed=JSON.parse(result.stdout)[0];
 console.log(JSON.stringify({name:pkg.name,version:pkg.version,artifact:packed.filename,files:packed.files.length}));
}
