// SPDX-License-Identifier: GPL-3.0-only
// MusicCoach handoff, adapted from the Doom/Felucca USB updater.
import {Updater} from './fm1ota.js?v=progress1';
import {Package,productOf,logicalImage,sha256hex} from './fm1pkg.js';
import {reportProgress} from './update-progress.js?v=progress1';
const prepared=new WeakSet();
const START=[0xf0,0x22,0x24,0x35,0x7f,0xf7];
export async function prepareFm1(bytes,release){
  if(release?.board!=='FM-1'||!/^FM-1_9\d\d$/.test(release.product)||bytes.length!==release.bytes||await sha256hex(bytes)!==release.sha256)
    throw Error('MusicCoach package size or checksum failed. Nothing can be installed.');
  const parsed=new Package(bytes);
  if(productOf(bytes)!==release.product||parsed.appBase!==0x4000||parsed.appOff!==0x4120||parsed.flashSize!==0x93000)
    throw Error('MusicCoach FM-1 package identity or layout failed.');
  const pkg=Object.freeze({product:release.product,version:release.version,image:logicalImage(bytes)});
  prepared.add(pkg);return pkg;
}
export async function installFm1(access,pkg,log=()=>{},{confirmGeneric,Transport=Updater}={}){
  if(!prepared.has(pkg))throw Error('Prepare a verified MusicCoach package first.');
  const image=pkg.image.slice();
  const up=new Transport(access,log,/fm-1|musiccoach|doom|felucca|sloop|melodee|ota|composite|sinco|usb-midi/i);
  let link;
  try{
    let dev=await up.findAny(id=>['FM-1','ota-FM-1','Doom-FM-1','ota-Doom-FM-1'].includes(id.model));
    if(!dev)throw Error('No updater-enabled FM-1 found. Connect only your FM-1 and close other MIDI apps. Doom Test06 and earlier require recovery-adapter installation.');
    link=dev.link;
    log('Connected: '+dev.id.text+' on '+dev.name);
    if(dev.id.model==='ota-FM-1'&&(!confirmGeneric||!await confirmGeneric(dev.id.text)))throw Error('Model confirmation cancelled. No programming started.');
    if(dev.id.model==='Doom-FM-1'){
      log('Entering the Doom FM-1 RAM updater. No flash has been written.');
      if(!link.send(START))throw Error('FM-1 disconnected before handoff.');
      await link.close();link=null;
      dev=await up.waitForAny(id=>id.model==='ota-Doom-FM-1',30000);
      if(!dev)throw Error('Doom loader did not appear. Keep power connected and use Install / resume again.');
      link=dev.link;
    }
    if(dev.id.model==='FM-1'){
      log('Preparing the FM-1 update loader. Keep power and USB connected.');
      reportProgress({phase:'loader'});
      if(!link.send(START))throw Error('FM-1 disconnected before loader preparation.');
      const first=await up.serve(link,image,0xe0000000,15000);
      await link.close();link=null;
      if(!first.finished)throw Error('Loader preparation stopped. Save the log and inspect the device before retrying.');
      dev=await up.waitForAny(id=>id.model==='ota-FM-1',30000);
      if(!dev)throw Error('FM-1 loader has not replied. Keep power connected and use Install / resume again.');
      link=dev.link;
    }
    log('Installing '+pkg.version+'. Keep power and USB connected.');
    const result=await up.write(dev,image,()=>{});
    await link.close();link=null;
    if(!result.finished)throw Error('Transfer interrupted. Keep power connected, save the log, then use Install / resume. No automatic write retry was attempted.');
    reportProgress({phase:'reboot'});
    log('Transfer complete. Waiting for MusicCoach to restart...');
    const back=await up.waitForAny(id=>id.model==='FM-1',40000);
    if(!back)throw Error('Transfer completed, but MusicCoach restart was not confirmed. Save the log and check the device.');
    link=back.link;
    if(back.id.text!==pkg.product)throw Error('Unexpected firmware after restart: '+back.id.text+'; expected '+pkg.product+'.');
    log('MusicCoach installed. USB restart verified: '+back.id.text+'.');
    return back.id.text;
  }finally{await link?.close();}
}
