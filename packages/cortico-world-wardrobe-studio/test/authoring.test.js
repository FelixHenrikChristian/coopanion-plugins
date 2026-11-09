import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {authoringGuide} from '../src/guide.js';

test('both bundled matte guides expose the topology-first recipe without runtime execution',async()=>{
 for(const language of ['en','zh']){
  const text=authoringGuide('matte',language)[0].text;
  assert(text.includes('matte_connected_white.py'));
  assert(text.includes('--protect'));
  assert(text.includes('--background'));
  assert(text.includes('235'));
 }
 const english=authoringGuide('matte','en')[0].text;
 assert(english.includes('not a temporal-consistency guarantee'));
 assert(english.includes('No universal warning threshold'));
 const runtime=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
 assert(!runtime.includes('matte_connected_white'));
});

test('runtime guidance covers measured scale, breathing and source-owned expression bases',()=>{
 const english=authoringGuide('runtime','en')[0].text;
 assert(english.includes('visible height'));
 assert(english.includes('breathing'));
 assert(english.includes('source hash'));
 assert(english.includes('dirty alpha'));
 const chinese=authoringGuide('runtime','zh')[0].text;
 assert(chinese.includes('脚底基线'));
 assert(chinese.includes('旧脏边'));
});
