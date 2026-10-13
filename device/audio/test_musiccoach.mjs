import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const {instance:{exports:e}}=await WebAssembly.instantiate(readFileSync(new URL('./smk-engine.wasm',import.meta.url)));
e.synth_init();
const state=()=>Array.from(new Uint32Array(e.memory.buffer,e.coach_status(),16));
function advance(ms){let peak=0;for(let b=0;b<Math.ceil(ms*44100/32000);b++){const p=e.synth_render();for(const v of new Int32Array(e.memory.buffer,p,64))peak=Math.max(peak,Math.abs(v));}return peak;}
const command=(kind,value=0)=>{e.coach_command(kind,value);advance(2);};
function picture(name){const pixels=new Uint16Array(e.memory.buffer,e.fw_screen(),240*240),rgb=Buffer.alloc(pixels.length*3);for(let i=0;i<pixels.length;i++){const p=((pixels[i]&255)<<8)|(pixels[i]>>8);rgb[i*3]=((p>>11)&31)*255/31;rgb[i*3+1]=((p>>5)&63)*255/63;rgb[i*3+2]=(p&31)*255/31;}mkdirSync('build/coach-preview',{recursive:true});writeFileSync('build/coach-preview/'+name+'.ppm',Buffer.concat([Buffer.from('P6\n240 240\n255\n'),rgb]));}
advance(50);assert.equal(state()[0],0);picture('home');
command(0);assert(advance(180)>100,'count-in produces audible metronome');assert(state()[11]<4000,'count-in precedes notes');command(1);advance(400);
e.fw_event(2,12,100);assert(advance(200)>100,'physical SMK key produces piano audio');e.fw_event(2,12,0);advance(300);
command(7);command(0);advance(850);picture('learn');assert.equal(state()[6],0);e.fw_event(2,12,100);advance(2);assert.equal(state()[8],1,'physical SMK key scores');e.fw_event(2,12,0);
command(1);command(2,2);command(0);advance(1000);e.synth_midi(144,60,100);e.synth_midi(144,64,100);advance(2);assert.equal(state()[8],0);e.synth_midi(144,67,100);advance(2);assert.equal(state()[8],1,'all chord notes required');e.fw_release();
command(1);command(3,2);command(0);assert(advance(2000)>100,'demo produces piano audio');assert.equal(state()[8],0,'demo cannot award progress');picture('demo');
command(1);assert.equal(state()[3],0);advance(1000);assert.equal(state()[0],0);
e.fw_event(1,0,-1);advance(2);assert.equal((state()[15]>>8)&255,63,'K1 volume');command(10,1);
for(let sound=1;sound<=6;sound++){
 e.fw_event(1,1,1);advance(100);assert.equal(state()[15]&255,sound%6,'K2 sound');
 e.synth_midi(144,60,100);assert(advance(250)>100,'selected sound produces audio');e.fw_release();advance(300);
}
const lesson=state()[1];e.fw_event(1,2,1);advance(2);assert.equal(state()[1],(lesson+1)%87,'K3 song');
e.fw_event(1,3,1);advance(2);assert.equal(state()[11],5000,'K4 shuttle moves a beat');assert.equal(state()[3],0,'shuttle keeps paused');
command(11,0);assert.equal(state()[15]>>16,0);picture('fm1-27-keys');
command(2,4-state()[1]);command(3,-state()[2]);command(0);advance(2000);picture('fm1-sharps');
command(11,1);picture('smk37-37-keys');command(1);
console.log('Native MusicCoach: audio, grading, all six sounds, K1-K4 controls and both keyboard layouts pass');

const perf=()=>Array.from(new Uint32Array(e.memory.buffer,e.coach_performance(),32));
command(12,1);assert.equal(perf()[0],1);command(0);assert.equal(perf()[3],1);assert(advance(1500)>100);picture('jam');command(12,1);picture('psychedelic');command(12,1);assert.equal(perf()[3],0);
command(13,-perf()[1]);const drive=perf()[6];command(15,1);assert.equal(perf()[6],drive+1);command(15,-1);
for(let bank=0;bank<2;bank++){
 if(perf()[2]!==bank)command(14);
 for(let pad=0;pad<16;pad++){e.fw_release();advance(500);e.fw_event(3,pad,100);assert(advance(100)>50,`bank ${bank} pad ${pad} audible`);e.fw_event(3,pad,0);}
}
e.fw_release();command(2,47-state()[1]);command(3,-state()[2]);command(0);advance(1000);e.fw_event(3,0,100);advance(5);assert.equal(state()[8],1,'pad trainer grades kick');picture('drum-trainer');e.fw_event(3,0,0);
command(1);command(3,2);command(0);assert(advance(1200)>50,'drum demo sounds');assert.equal(state()[8],0);command(1);
command(2,83-state()[1]);command(3,-state()[2]);command(0);advance(500);picture('sequencer-trainer');
for(let lane=0;lane<4;lane++){command(23,lane-perf()[14]);const mask=perf()[20+lane];for(let pad=0;pad<16;pad++)if(mask&(1<<pad)){e.fw_event(3,pad,100);advance(2);e.fw_event(3,pad,0);}}
assert.equal(state()[0],2,'all sequence lanes complete');assert.equal(state()[14],3);assert.equal(perf()[3],0);
command(19);picture('settings');command(20,1);picture('settings-light');command(20,1);picture('settings-contrast');command(20,1);command(19);
command(2,-state()[1]);command(3,-state()[2]);command(0);advance(2000);picture('finger-colors');command(1);
console.log('Extended MusicCoach: 32 samples, three views, FX, drum grading/demo, sequencer completion, and display surfaces pass');
