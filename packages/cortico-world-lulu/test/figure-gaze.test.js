import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createLuluBody} from '../figure/figure.js';

test('persistent thinking keeps a forward gaze in every outfit and posture while blinking and gestures still win',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lulu-gaze-'));
  const previous=globalThis.document;
  let drawn;
  globalThis.document={createElementNS:()=>({setAttribute(){},append(){}}),createElement:()=>({style:{},getContext:()=>({clearRect(){},drawImage(image){drawn=image;}})})};
  try{
    const data=Object.fromEntries(['bag','plain','sleep','dino'].map(id=>[id,{
      expressions:Object.fromEntries(['neutral','thinking','happy','blink'].map(word=>[word,`${id}/stand/${word}`])),
      seatedExpressions:Object.fromEntries(['neutral','thinking','happy','blink','sleep'].map(word=>[word,`${id}/sit/${word}`])),
      clips:{sit:{frames:[`${id}/lower`,`${id}/hold`,`${id}/rise`],fps:24,hold:1,riseStart:2},wave:{frames:[`${id}/wave`],fps:24}},
    }]));
    await writeFile(join(dir,'data.js'),'export const data='+JSON.stringify(data));
    const base=pathToFileURL(dir+'/');
    for(const id of Object.keys(data)){
      let renderer,mode='idle',face='thinking',blink=0,t=0;
      const group={append(){}};
      const kit={createBody(_host,{figure}){renderer=figure;return{
        do(word){if(word==='sit'||word==='sleep')mode=word;else if(word==='stand')mode='idle';else face=word;return true;},
        step(dt){t+=dt;renderer.draw(group,{}, {face,blink,mode,t,sit:mode==='sit'||mode==='sleep'?1:0,modeT:t});},
        layout:()=>({mode}),set(){},walk(){},stopWalk(){},dispose(){},
      };}};
      const body=await createLuluBody(base,{scheme:id,kit,host:{emit(){}},loadImage:async url=>decodeURIComponent(url.pathname).slice(decodeURIComponent(base.pathname).length)});
      const assertImage=(expected)=>assert.equal(drawn,`${id}/${expected}`);
      body.step(.1);assertImage('stand/neutral');
      for(let i=0;i<100;i++)body.step(.1);
      assertImage('stand/neutral');
      blink=1;body.step(.1);assertImage('stand/blink');blink=0;
      body.do('sit');body.step(.1);assertImage('sit/neutral');
      blink=1;body.step(.1);assertImage('sit/blink');blink=0;
      body.do('happy');body.step(.1);assertImage('sit/happy');
      face='thinking';body.do('stand');for(let i=0;i<5;i++)body.step(.1);assertImage('stand/neutral');
      body.do('sleep');body.step(.1);assertImage('sit/sleep');
      body.do('stand');for(let i=0;i<5;i++)body.step(.1);
      assert.equal(body.do('wave'),true);await new Promise(resolve=>setTimeout(resolve,0));body.step(.01);
      assert.equal(drawn,`${id}/wave`);
      body.dispose();
    }
  }finally{globalThis.document=previous;await rm(dir,{recursive:true,force:true});}
});
