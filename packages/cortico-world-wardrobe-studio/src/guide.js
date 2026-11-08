import {readFile} from 'node:fs/promises';
// Only fixed, bundled documentation is read. No deployment files or user paths.
const document=async name=>readFile(new URL('../docs/'+name,import.meta.url),'utf8');
function stages(markdown){
 const result={};for(const match of markdown.matchAll(/^## \[([a-z]+)\] (.+)\r?\n([\s\S]*?)(?=^## \[|$(?![\s\S]))/gm))result[match[1]]={title:match[2],text:match[3].trim()};return result;
}
const [en,zh,profileEn,profileZh,troubleEn,troubleZh]=await Promise.all([
 document('agent-workflow.md'),document('agent-workflow.zh.md'),document('profile-format.md'),document('profile-format.zh.md'),document('troubleshooting.md'),document('troubleshooting.zh.md')
]);
const english=stages(en),chinese=stages(zh);
export const GUIDE=Object.fromEntries(Object.entries(english).map(([id,v])=>[id,{en:v.text,zh:chinese[id].text,titleEn:v.title,titleZh:chinese[id].title}]));
GUIDE.profile={en:profileEn,zh:profileZh,titleEn:'Wardrobe JSON: format and import',titleZh:'衣橱 JSON：完整格式与导入'};
GUIDE.troubleshooting={en:troubleEn,zh:troubleZh,titleEn:'Troubleshooting and upgrades',titleZh:'故障排查与升级'};
export function authoringGuide(stage='all',language='zh'){
 const zh=language==='zh',ids=stage==='all'?Object.keys(GUIDE):[stage];
 return ids.map(id=>{if(!Object.hasOwn(GUIDE,id))throw Error('Unknown authoring stage');const item=GUIDE[id];return{stage:id,title:item[zh?'titleZh':'titleEn'],text:item[zh?'zh':'en']};});
}
