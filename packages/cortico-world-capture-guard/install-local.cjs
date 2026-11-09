/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {writeJsonSync:atomic}=require('./src/atomic-json.cjs');
const NAME='cortico-world-capture-guard';
function install(program,bot='companion'){
  if(!program)throw Error('请提供 Coopanion 安装目录，例如：node install-local.cjs <安装目录>');
  program=path.resolve(program);
  const meta=JSON.parse(fs.readFileSync(path.join(program,'resources','app','package.json'),'utf8'));
  if(meta.name!=='coopanion'||!fs.existsSync(path.join(program,'Coopanion.exe')))throw Error('不是 Coopanion 安装目录。');
  if(!/^[a-zA-Z0-9_-]+$/.test(bot))throw Error('部署 ID 无效。');
  const ext=path.join(program,'data','extensions'),manifestFile=path.join(ext,'package.json'),configFile=path.join(program,'data','home',bot,'config.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),config=JSON.parse(fs.readFileSync(configFile,'utf8'));
  const packageMeta=JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'),'utf8'));
  const destination=path.join(ext,'local-packages',NAME+'-'+packageMeta.version),junction=path.join(ext,'node_modules',NAME);
  let previousTarget=null;
  if(fs.existsSync(junction)){
    previousTarget=fs.realpathSync(junction);
    const localRoot=path.resolve(ext,'local-packages')+path.sep;
    const owned=fs.lstatSync(junction).isSymbolicLink()&&previousTarget.toLowerCase().startsWith(localRoot.toLowerCase())&&JSON.parse(fs.readFileSync(path.join(previousTarget,'package.json'),'utf8')).name===NAME;
    if(previousTarget.toLowerCase()!==destination.toLowerCase()&&!owned)throw Error('已有同名插件不属于本地安装器，不能自动替换。');
  }
  const backup=path.join(program,'data','backups','capture-guard-world',new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(manifestFile,path.join(backup,'extensions-package.json'));fs.copyFileSync(configFile,path.join(backup,'config.json'));
  fs.mkdirSync(destination,{recursive:true});
  for(const name of ['src','package.json','describe.json','README.md','LICENSE'])fs.cpSync(path.join(__dirname,name),path.join(destination,name),{recursive:true});
  fs.mkdirSync(path.dirname(junction),{recursive:true});
  if(previousTarget&&previousTarget.toLowerCase()!==destination.toLowerCase()){
    // Remove only the validated junction, never its source directory or contents.
    fs.unlinkSync(junction);
    try{fs.symlinkSync(destination,junction,'junction');}catch(e){fs.symlinkSync(previousTarget,junction,'junction');throw e;}
  }else if(!fs.existsSync(junction))fs.symlinkSync(destination,junction,'junction');
  manifest.dependencies??={};manifest.dependencies[NAME]='link:'+destination.replaceAll('\\','/');
  // Preserve the old inclusion setting until the new Core loads, so an external
  // config watcher cannot briefly re-enable the old protection implementation.
  config.worlds??={};config.worlds['capture-guard']={includeInCapture:false,resetOnStart:true,autoReturnSeconds:0,screenshotHideSeconds:10,screenshotHotkeys:'PrintScreen,Win+Shift+S,Ctrl+Alt+A,Alt+A,Ctrl+1,F1,Alt+F1',...config.worlds['capture-guard'],enabled:true,nvidiaCompatibility:true};
  atomic(manifestFile,manifest);atomic(configFile,config);
  // Keep the local link represented in pnpm's importer without re-resolving other packages.
  const lock=path.join(ext,'pnpm-lock.yaml');
  if(fs.existsSync(lock)){
    const source=fs.readFileSync(lock,'utf8');
    fs.writeFileSync(path.join(backup,'pnpm-lock.yaml'),source);
    const spec=manifest.dependencies[NAME],entry='      '+NAME+':\n        specifier: '+JSON.stringify(spec)+'\n        version: '+JSON.stringify(spec)+'\n';
    const existing=new RegExp('^      '+NAME+':\\r?\\n(?: {8}[^\\n]*\\n)*','m');
    if(existing.test(source))fs.writeFileSync(lock,source.replace(existing,entry));
    else{
      const anchor='  .:\n    dependencies:\n';
      if(source.split(anchor).length===2){
        fs.writeFileSync(lock,source.replace(anchor,anchor+entry));
      }
    }
  }
  console.log(JSON.stringify({installed:NAME,version:packageMeta.version,location:destination,backup,next:'重启 Core 进程，然后打开 World 扩展 → 截图隐身 → 配置。'},null,2));
}
if(require.main===module)install(process.argv[2],process.argv[3]);
module.exports={install};
