/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const {app}=require('electron');
const arg=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const descriptor=JSON.parse(fs.readFileSync(arg('capture-host'),'utf8'));
app.setName('Coopanion');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
fs.mkdirSync(descriptor.profile,{recursive:true});
app.setPath('userData',descriptor.profile);
let attached=false;
app.on('browser-window-created',(_event,win)=>{
  if(attached)return;
  attached=true;
  require('./host-bridge.cjs').attach(win,descriptor,createRequire(descriptor.hostFile)('koffi'));
});
const {runPetHost}=require(descriptor.hostFile);
runPetHost({url:arg('pet-url'),parentPid:Number(arg('parent-pid'))||0,tray:false});
