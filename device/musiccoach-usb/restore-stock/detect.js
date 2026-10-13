// SPDX-License-Identifier: GPL-3.0-only
import {Updater} from './transport.js?v=progress1';

// Custom SMK firmware reports a generic identity: never infer Pro/Elite from
// the MIDI port label. Detection sends identity queries only, then releases ports.
export function describeDevice(id){
  const model=id.model.replace(/^ota-/,'');
  if(['FM-1','Doom-FM-1'].includes(model))return {family:'fm1',model:'FM-1',identity:id.text};
  if(['SMK-37 Pro','SMK-37 Elite'].includes(model))return {family:'smk',model,identity:id.text};
  if(['SMK-37','Doom-SMK-37'].includes(model))return {family:'smk',model:null,identity:id.text};
  return {family:null,model:null,identity:id.text};
}

export async function detectDevice(access,log=()=>{},options={}){
  const up=new Updater(access,log);
  const dev=await up.findAny(()=>true,options);
  if(!dev)throw Error('No USB updater replied. Check the MIDI ports in the log, connect the instrument directly by USB, and close other MIDI apps or installer tabs before retrying.');
  try{return describeDevice(dev.id);}finally{await dev.link.close();}
}

export async function requestMidi(request){
  let timer;
  try{return await Promise.race([
    request({sysex:true}),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('MIDI permission is still pending. Allow MIDI/SysEx for this page in Chrome or Edge, then press Detect device again.')),30000);})
  ]);}finally{clearTimeout(timer);}
}
