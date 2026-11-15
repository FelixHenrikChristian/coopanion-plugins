import {readFile,writeFile} from 'node:fs/promises';
const previews={};
for(const id of ['bag','plain','sleep','dino']){
 const image=await readFile(new URL('../assets/lulu/'+id+'.webp',import.meta.url));
 previews[id]='data:image/webp;base64,'+image.toString('base64');
}
const file=new URL('../web/client.js',import.meta.url),client=await readFile(file,'utf8');
if(!/^const previews=.*;$/m.test(client))throw Error('Missing bundled preview declaration');
await writeFile(file,client.replace(/^const previews=.*;$/m,()=>`const previews=Object.freeze(${JSON.stringify(previews)});`));
console.log('Bundled four static previews into the standalone WebUI entrypoint.');
