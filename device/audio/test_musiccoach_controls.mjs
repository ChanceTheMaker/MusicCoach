// Real SMK adapter: queued physical presses, matching indicators and isolated RGB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {instance:{exports:e}}=await WebAssembly.instantiate(readFileSync(new URL('./smk-engine.wasm',import.meta.url)));
e.synth_init();
const advance=ms=>{for(let i=0;i<Math.ceil(ms*44100/32000);i++)e.synth_render();};
const p=()=>Array.from(new Uint32Array(e.memory.buffer,e.coach_performance(),32));
const status=()=>Array.from(new Uint32Array(e.memory.buffer,e.coach_status(),16));
const indicators=()=>new Uint32Array(e.memory.buffer,e.fw_status(),16)[0];
const lights=()=>Array.from(new Uint32Array(e.memory.buffer,e.coach_lights(),43)).slice(0,16);
const edge=(id,down)=>e.fw_event(0,id,down);
const tap=id=>{edge(id,1);edge(id,0);};
const command=(k,v=0)=>{e.coach_command(k,v);advance(2);};
advance(2500);
// The old delta mapping combined these into the wrong page before a render.
for(const page of [0,1,2,3,4,5,6]){
 command(27,page);tap(8);tap(9);advance(2);
 assert.equal(p()[1],4,'last press selects Chord absolutely');
 assert(indicators()&(1<<9));assert(!(indicators()&(1<<8)));
 tap(8);tap(8);advance(2);assert.equal(p()[1],3,'repeated Scale stays on Scale');
 assert(indicators()&(1<<8));assert(!(indicators()&(1<<9)));
}
edge(10,1);advance(2);const view=p()[0];
for(let i=0;i<8;i++){edge(10,1);advance(100);}
assert.equal(p()[0],view,'holding Globe changes mode once');edge(10,0);
assert(indicators()&(1<<10));
tap(10);advance(2);assert.equal(p()[0],(view+1)%3);
tap(12);advance(2);assert.equal(p()[0],0,'Patch goes home to Coach');assert.equal(status()[0],0);
// Settings and a shortcut in the same batch must be evaluated in order.
const oldPage=p()[1];tap(11);tap(9);tap(10);advance(2);
assert.equal(p()[10],0,'Globe exits Settings');assert.equal(p()[1],oldPage,'Settings ignores hidden performance edits');assert.equal(p()[0],0);
tap(11);advance(2);assert.equal(indicators(),1<<11);
tap(12);advance(2);tap(14);advance(2);assert.equal(p()[1],0,'FX always selects FX');
tap(14);advance(2);assert.equal(p()[1],0);
// No inherited record/patch page lights can leak into the MusicCoach panel.
tap(16);advance(2);assert(indicators()&(1<<16));assert(!(indicators()&(1<<17)));
tap(16);advance(2);assert(!(indicators()&(1<<16)));
// Coach and Jam: each pad's blue pulse is independent, no idle neighbor lights.
for(const view of [0,1]){
 command(12,view-p()[0]);advance(250);
 for(let pad=0;pad<16;pad++){
  e.fw_event(3,pad,100);advance(2);
  const rgb=lights();assert.equal(rgb[pad],p()[13]);
  assert(rgb.every((v,k)=>k===pad||v===0),'only tapped pad lights');
  e.fw_event(3,pad,0);advance(220);assert(lights().every(v=>v===0),'released pad fades to black');
 }
}
// Optional psychedelic background is explicitly disabled by Light Show off.
command(12,2-p()[0]);command(21);advance(220);assert(lights().every(v=>v===0));
e.fw_event(3,0,100);e.fw_event(3,15,100);advance(2);
assert.deepEqual(lights().filter(Boolean),[p()[13],p()[13]],'two blue hits, no green channels');
e.fw_release();advance(220);assert(lights().every(v=>v===0));
console.log('MusicCoach controls: ordered Scale/Chord/Globe, holds, settings isolation, matching indicators, all 16 pad lights pass.');
