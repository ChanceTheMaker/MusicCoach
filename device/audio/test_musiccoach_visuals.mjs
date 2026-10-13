// Offline tests of the real WASM synth, pad routing, renderer and mode controls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bytes=readFileSync(new URL('./smk-engine.wasm',import.meta.url));
async function runtime(){
 const {instance:{exports:e}}=await WebAssembly.instantiate(bytes);e.synth_init();
 const advance=ms=>{for(let i=0;i<Math.ceil(ms*44100/32000);i++)e.synth_render();};
 const p=()=>Array.from(new Uint32Array(e.memory.buffer,e.coach_performance(),32));
 const command=(k,v=0)=>{e.coach_command(k,v);advance(2);};
 const screen=()=>Buffer.from(new Uint8Array(e.memory.buffer,e.fw_screen(),240*240*2));
 command(12,2);advance(2000);return {e,advance,p,command,screen};
}
const {e,advance,p,command}=await runtime();
command(26,-3);assert.equal(p()[28],8,'dial wraps backward to last scene');
command(26,1);assert.equal(p()[28],0,'dial wraps forward to Coach');
command(26,1);command(0);assert.equal(p()[3],1,'Jam groove starts');
command(26,5);assert.equal(p()[3],1,'browsing into scenes keeps groove playing');
assert.equal(p()[27],4);command(25,-12);assert.equal(p()[27],6);
command(26,1);assert.equal(p()[0],0);assert.equal(p()[3],0,'Coach stops groove');
command(12,2);command(25,1-p()[27]);
const lesson=new Uint32Array(e.memory.buffer,e.coach_status(),16)[1];
e.fw_event(1,2,1);advance(2);assert.equal(p()[27],2,'physical K3 selects scene');
assert.equal(new Uint32Array(e.memory.buffer,e.coach_status(),16)[1],lesson,'K3 keeps lesson in visualizer');
advance(17000);assert.equal(p()[27],2,'manual scene stays selected');
e.fw_event(2,12,110);advance(3);assert(p()[29]>180,'physical piano attack');
e.fw_event(2,12,0);advance(800);assert.equal(p()[29],0,'release does not retrigger');
e.synth_midi(144,72,40);advance(3);const soft=p()[29];assert(soft>0&&soft<90);
e.synth_midi(128,72,0);advance(800);
e.synth_midi(144,72,120);advance(3);assert(p()[29]>soft*2,'velocity scales response');
e.fw_release();advance(800);assert.equal(p()[30],0);
e.fw_event(3,0,120);advance(3);assert(p()[30]>200,'kick drives independent drum pulse');
assert.equal(p()[29],0,'pad is not a piano attack');
e.fw_event(3,0,0);advance(800);assert.equal(p()[30],0);
command(0);advance(500);assert(p()[29]>0,'sequenced piano drives visuals');
command(0);e.fw_release();advance(1000);
// Equal clocks and scenes: only the played input differs, not animation time.
for(let scene=1;scene<=6;scene++){
 const quiet=await runtime(),keys=await runtime(),drums=await runtime();
 for(const r of [quiet,keys,drums])r.command(25,scene);
 keys.e.synth_midi(144,64,115);drums.e.fw_event(3,1,115);
 for(const r of [quiet,keys,drums])r.advance(80);
 assert.notDeepEqual(keys.screen(),quiet.screen(),`scene ${scene} visibly responds to keys`);
 assert.notDeepEqual(drums.screen(),quiet.screen(),`scene ${scene} visibly responds to drums`);
}
console.log('Reactive visuals: six scenes, piano/MIDI/drums/sequencer, velocity, decay, mode dial and K3 pass.');
// The LCD ring must contain the touched pad's actual LED hue (normalized for
// screen visibility). Each pad retains its color while the idle palette moves.
const colors=await runtime();colors.command(25,6);
const led=()=>Array.from(new Uint32Array(colors.e.memory.buffer,colors.e.coach_lights(),43)).slice(0,16);
const rgb565=rgb=>{const r=rgb>>>16,g=(rgb>>>8)&255,b=rgb&255,m=Math.max(r,g,b);return ((Math.floor(r*255/m)>>3)<<11)|((Math.floor(g*255/m)>>2)<<5)|(Math.floor(b*255/m)>>3);};
for(let pad=0;pad<16;pad++){
 colors.e.fw_event(3,pad,115);colors.advance(2);const heldColor=led()[pad];assert(heldColor);
 colors.advance(90);assert.equal(led()[pad],heldColor,'held pad hue stays at attack color');
 const pixels=colors.screen(),want=rgb565(heldColor),x=18+(pad%8)*29,y=28+62+Math.floor(pad/8)*58;
 let matching=0;
 for(let py=y-30;py<=y+30;py++)for(let px=Math.max(0,x-30);px<=Math.min(239,x+30);px++)if(pixels.readUInt16BE((py*240+px)*2)===want)matching++;
 assert(matching>=8,`pad ${pad+1} burst uses its LED hue`);
 colors.e.fw_event(3,pad,0);colors.advance(800);
}
colors.e.fw_event(3,0,110);colors.e.fw_event(3,4,110);colors.advance(2);
const chordColors=led();assert.notEqual(chordColors[0],chordColors[4]);colors.advance(300);
assert.equal(led()[0],chordColors[0]);assert.equal(led()[4],chordColors[4]);
console.log('Pad colors: all 16 LCD bursts match their LED hue; simultaneous held pads retain independent colors.');
