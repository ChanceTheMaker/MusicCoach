// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareFm1,installFm1} from './fm1-install.js';
const release=JSON.parse(await readFile(new URL('../musiccoach-firmware/candidate.json',import.meta.url)));
const bytes=new Uint8Array(await readFile(new URL('../musiccoach-firmware/'+release.file,import.meta.url)));
const pkg=await prepareFm1(bytes,release);
await assert.rejects(prepareFm1(bytes.slice(1),release),/checksum/);
const corrupt=bytes.slice();corrupt[5000]^=1;await assert.rejects(prepareFm1(corrupt,release),/checksum/);
await assert.rejects(installFm1({},{}),/verified/);
let model,phase,sends,writes,stages,fail,returned,accept;
const device=m=>({id:{model:m,text:m==="FM-1"&&phase==='return'?returned:m+'_998'},name:'Doom FM-1',link:{send(){sends++;return true;},async close(){}}});
class Fake {
  async findAny(filter){return filter(device(model).id)?device(model):null;}
  async waitForAny(filter){const m=phase==='return'?'FM-1':model==='Doom-FM-1'?'ota-Doom-FM-1':'ota-FM-1';assert.ok(filter(device(m).id));return device(m);}
  async serve(link,image,finish){assert.deepEqual(image,pkg.image);assert.equal(finish,0xe0000000);stages++;return {finished:true};}
  async write(dev,image){assert.deepEqual(image,pkg.image);writes++;phase='return';return {finished:!fail};}
}
async function run(m,options={}){model=m;phase='start';sends=writes=stages=0;fail=options.fail;returned=options.returned||pkg.product;accept=options.accept!==false;return installFm1({},pkg,()=>{},{Transport:Fake,confirmGeneric:()=>accept});}
for(const m of ['Doom-FM-1','ota-Doom-FM-1','FM-1','ota-FM-1']){assert.equal(await run(m),pkg.product);assert.equal(writes,1);assert.equal(stages,m==='FM-1'?1:0);assert.equal(sends,m.startsWith('ota-')?0:1);console.log('PASS install/resume and verified restart:',m);}
await assert.rejects(run('SMK-37'),/No updater/);assert.equal(writes+sends,0);
await assert.rejects(run('ota-FM-1',{accept:false}),/cancelled/);assert.equal(writes+sends,0);
await assert.rejects(run('Doom-FM-1',{fail:true}),/interrupted/);assert.equal(writes,1);
await assert.rejects(run('Doom-FM-1',{returned:'FM-1_998'}),/Unexpected firmware/);
console.log('PASS corruption, wrong board, generic-loader cancellation, interrupted transfer, wrong return identity');
