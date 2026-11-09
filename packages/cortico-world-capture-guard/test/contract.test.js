import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import definition,{CaptureGuardWorld} from '../src/index.js';
import keys from '../src/screenshot-keys.cjs';

async function eventually(check,message){
 const until=Date.now()+5000;
 while(Date.now()<until){if(await check())return;await new Promise(r=>setTimeout(r,20));}
 assert.fail(message);
}

test('only exact configured screenshot chords match',()=>{
 const chord=keys.parseHotkeys('Ctrl+Alt+A')[0];
 assert(keys.matches(chord,new Set([0xa2,0xa4])));
 assert(!keys.matches(chord,new Set([0xa2,0xa4,0xa0])));
 assert(!keys.matches(chord,new Set([0xa2])));
 assert.equal(keys.parseHotkeys('Win+Shift+S')[0].vk,0x53);
 assert.equal(keys.parseHotkeys().length,7);
 for(const invalid of ['','Ctrl','Ctrl+BadKey','Ctrl+A+B'])assert.throws(()=>keys.parseHotkeys(invalid));
});

test('disabled construction leaves the host untouched and exposes settings only in this plugin',()=>{
 const before=process.env.CORTICO_DESKTOP_PET_HOST,cfg=definition.defaults();
 const world=definition.create({cfg});
 assert.equal(process.env.CORTICO_DESKTOP_PET_HOST,before);
 assert.equal(cfg.enabled,false);assert.equal(cfg.includeInCapture,false);assert.equal(cfg.nvidiaCompatibility,true);
 assert.deepEqual(world.tools(),[]);assert.equal(world.envPromptVars(),null);
 const ui=world.webUi('en');assert.equal(ui.panels,undefined);assert.equal(ui.config[0].owner,'world:capture-guard');
 assert(Object.keys(ui.config[0].schema.properties).every(name=>name.startsWith('worlds.capture-guard.')));
});

test('isolated lifecycle keeps compatibility on, updates live config and restores the previous command',async t=>{
 const prefix=join(tmpdir(),'capture-guard-test-'),dir=await mkdtemp(prefix),before=process.env.CORTICO_DESKTOP_PET_HOST;
 const cfg={...definition.defaults(),includeInCapture:true,autoReturnSeconds:0},ctx={cfg,persist:p=>Object.assign(cfg,p)};
 const world=new CaptureGuardWorld(ctx);
 world.runtime={control:join(dir,'control.json'),status:join(dir,'status.json'),command:'capture-guard-test-command',original:before};
 t.after(async()=>{await world.stop();assert(resolve(dir).startsWith(resolve(prefix)));await rm(dir,{recursive:true,force:true});});
 await world.start({log:{warn:()=>{}}});
 const read=async()=>JSON.parse(await readFile(world.runtime.control,'utf8'));
 assert.equal(cfg.includeInCapture,false);assert.equal((await read()).nvidiaCompatibility,true);
 cfg.includeInCapture=true;
 await eventually(async()=>(await read()).include===true,'The live inclusion setting was not synchronized');
 cfg.autoReturnSeconds=1;
 await eventually(async()=>cfg.includeInCapture===false&&(await read()).include===false,'The inclusion lease did not expire and synchronize');
 await writeFile(world.runtime.status,JSON.stringify({pid:2147483647,running:true,session:world.session,enabled:true,affinity:0}));
 await world.stop();assert.equal(world.shutdownVerification()[0].status,'verified-ended');assert.equal(process.env.CORTICO_DESKTOP_PET_HOST,before);
});
