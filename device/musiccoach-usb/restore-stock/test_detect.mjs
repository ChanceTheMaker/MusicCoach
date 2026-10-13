// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {detectDevice,describeDevice,requestMidi} from './detect.js';
import {pack7} from './transport.js?v=progress1';
const query=[0xf0,0,0x32,0x45,0,0,0,0x40,0x7f,0xf7];
class Port extends EventTarget{
 constructor(name,type){super();Object.assign(this,{name,type,state:'connected',connection:'closed',sends:[]});}
 async open(){this.connection='open';return this;}
 async close(){this.connection='closed';return this;}
 send(bytes){assert.deepEqual([...bytes],query,'Detection must send identity queries only');this.sends.push(bytes);this.respond?.();}
 receive(text){const data=new Uint8Array(34);data.set([0,0x59,0x11]);data.set(new TextEncoder().encode(text),6);const ev=new Event('midimessage');ev.data=[0xf0,...pack7(data),0xf7];this.dispatchEvent(ev);}
}
const input=new Port('MusicCoach input','input'),output=new Port('Different USB output','output');
const access={inputs:new Map([['i',input]]),outputs:new Map([['o',output]])};
for(const [identity,family,model] of [
 ['FM-1_902','fm1','FM-1'],['ota-FM-1_902','fm1','FM-1'],['Doom-FM-1_008','fm1','FM-1'],
 ['SMK-37_946','smk',null],['ota-SMK-37_946','smk',null],['Doom-SMK-37_008','smk',null],
 ['SMK-37 Pro_016','smk','SMK-37 Pro'],['SMK-37 Elite_016','smk','SMK-37 Elite'],
 ['Unrecognized_123',null,null]
]){
 output.respond=()=>input.receive(identity);
 assert.deepEqual(await detectDevice(access,()=>{},{probeMs:1}),{identity,family,model});
 assert.equal(input.connection,'closed');assert.equal(output.connection,'closed');assert.equal(input.onmidimessage,null);
}
// A port label must never convert a generic firmware identity into a Pro/Elite guess.
input.name='SMK-37 Pro';output.respond=()=>input.receive('SMK-37_946');
assert.equal((await detectDevice(access,()=>{},{probeMs:1})).model,null);
output.respond=()=>{};await assert.rejects(detectDevice(access,()=>{},{probeMs:1}),/No USB updater replied/);
assert.equal(input.connection,'closed');assert.equal(output.connection,'closed');
await assert.rejects(detectDevice({inputs:new Map(),outputs:new Map()}),/No USB updater replied/);
const second=new Port('Other input','input');access.inputs.set('i2',second);
output.respond=()=>{input.receive('FM-1_902');second.receive('SMK-37_946');};
await assert.rejects(detectDevice(access,()=>{},{probeMs:1}),/More than one/);
for(const p of [input,output,second])assert.equal(p.connection,'closed');
assert.equal(await requestMidi(async options=>{assert.deepEqual(options,{sysex:true});return access;}),access);
await assert.rejects(requestMidi(async()=>{throw Error('Permission denied');}),/Permission denied/);
assert.equal(describeDevice({model:'ota-Doom-SMK-37',text:'ota-Doom-SMK-37_008'}).model,null);
console.log('PASS read-only detection, model classification, mismatched port names, no-device errors, ambiguity rejection, MIDI permissions and port cleanup');
