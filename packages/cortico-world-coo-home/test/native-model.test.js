import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {HomeChat} from '../src/chat.js';

test('chat receipt IDs never become Responses resource IDs, including saved history',async()=>{
  const previous={id:'chat-1',userText:'Neutral saved question.',assistantText:'Neutral saved answer.',at:0,status:'done',records:[],error:null};
  let saved={version:1,revision:1,counter:1,turns:[previous],clients:[]},outbound;
  const store={async load(normalize){return normalize(structuredClone(saved));},async save(value){saved=structuredClone(value);},async flush(){}};
  const model={async run({records}){outbound=records;return{records:[],text:'Neutral reply.'};}};
  const chat=new HomeChat({store,model});await chat.start();
  await chat.send({text:'Neutral new question.',clientId:'receipt-fixture'});
  await Promise.all([...chat.pending]);
  assert.equal(chat.snapshot().job.status,'done');
  assert.equal(outbound.length,2);
  assert.ok(outbound.every(row=>row.item.role==='user'&&row.item.id===undefined));
  assert.deepEqual(outbound.map(row=>row.item.content[0].text),['Neutral saved question.','Neutral new question.']);
  assert.equal(saved.turns[0].id,'chat-1');assert.equal(saved.turns[1].id,'chat-2');
  assert.equal(saved.clients[0].clientId,'receipt-fixture');
  await chat.stop();
});

test('installed official Responses adapter passes strict loopback chat and tool replay',{
  skip:!process.env.COOPANION_APP_ROOT&&'Set COOPANION_APP_ROOT for the isolated official SDK transport test',timeout:20_000,
},async()=>{
  const run=promisify(execFile),fixture=fileURLToPath(new URL('./fixtures/native-model.mjs',import.meta.url));
  const {stdout}=await run(process.execPath,['--import','tsx',fixture],{
    cwd:process.env.COOPANION_APP_ROOT,env:process.env,timeout:15_000,windowsHide:true,maxBuffer:128*1024,
  });
  const result=JSON.parse(stdout.trim());
  assert.equal(result.legacyRejection,'HTTP 400');assert.equal(result.homeChat,'passed');
  assert.equal(result.toolFollowup,'passed');assert.equal(result.savedHistoryReplay,'passed');assert.equal(result.externalRequests,0);
});
