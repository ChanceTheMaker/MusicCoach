// SPDX-License-Identifier: GPL-3.0-only
import {prepareFm1,installFm1} from './musiccoach-usb/fm1-install.js';
import {buildSmkPublicPackage} from './musiccoach-usb/smk37-package.js';
import {parsePackage,installStockSmk} from './musiccoach-usb/smk37-update.js?v=progress1';
import {STOCK_SOURCES} from './musiccoach-usb/smk37-stock.js';
import {createProgress} from './musiccoach-usb/update-progress.js?v=progress1';
const $=id=>document.getElementById(id),progress=createProgress($('status'));
let pkg=null,busy=false,loading=false,selectedModel='FM-1';
const models={fm1:'FM-1',pro:'SMK-37 Pro',elite:'SMK-37 Elite'};
const log=text=>{$('status').textContent=text;$('log').textContent+=text+'\n';};
function sync(){
  const fm1=$('device').value==='fm1';$('manual-file').hidden=fm1;
  $('build').options[0].disabled=!fm1;$('build').options[2].disabled=fm1;
  $('install').disabled=busy||loading||!pkg||!$('ack').checked||!navigator.requestMIDIAccess;
  for(const id of ['device','build','ack','retry','stock-file'])$(id).disabled=busy||loading;
}
async function bytes(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Download unavailable: '+url);return new Uint8Array(await r.arrayBuffer());}
async function prepare(){
  if(busy||loading)return;loading=true;pkg=null;$('ack').checked=false;sync();progress.start('prepare');
  selectedModel=models[$('device').value];
  log('Checking MusicCoach firmware for '+selectedModel+'...');
  $('build-detail').textContent='Preparing and checking the selected package...';
  try{
    const fm1=selectedModel==='FM-1',controls=$('build').value==='controls',dual=$('build').value!=='single';
    const name=fm1?(dual?'fm1-dual.json':'candidate.json'):controls?'smk-pad-colors.json':'smk-dual.json';
    const release=JSON.parse(new TextDecoder().decode(await bytes('musiccoach-firmware/'+name)));
    const expected=fm1?(dual?'musiccoach-fm1-0.3-dc1.fwsc':'musiccoach-fm1-0.2.fwsc'):controls?'musiccoach-smk-0.6-pad-colors-app.bin':'musiccoach-smk-0.3-dc1-app.bin';
    if(release.file!==expected)throw Error('Unexpected MusicCoach candidate file.');
    const data=await bytes('musiccoach-firmware/'+expected);
    if(fm1)pkg=await prepareFm1(data,release);
    else{
      log('Preparing MusicCoach for '+selectedModel+' from verified official firmware...');
      const file=$('stock-file').files[0];
      if(file&&file.size>32*1024*1024)throw Error('Select the official 016 .fwsc file, not an archive.');
      const stock=file?new Uint8Array(await file.arrayBuffer()):await bytes(STOCK_SOURCES[selectedModel]);
      const result=await buildSmkPublicPackage(stock,data,release);
      if(result.stockModel!==selectedModel)throw Error('The official file belongs to '+result.stockModel+'. Select that exact physical device.');
      await parsePackage(result.bytes,result.sha);pkg=result;
    }
    $('build-title').textContent=release.version;
    $('build-detail').textContent=selectedModel+' · '+Math.round(release.bytes/1024)+' KiB · checksum verified';
    $('core-detail').textContent=controls?'SMK pad-color test: psychedelic bursts match the touched pad color. Includes the button fixes, blue hit feedback in Coach/Jam, LED transfer ending, six scenes and dual-core. Hardware color matching and the reported stray green flash still need testing.':dual?'Dual-core candidate: piano, flute and sax sample voices share two cores. Other engines stay serial. A failed worker falls back safely; the screen shows DUAL or SAFE.':'Single-core candidate. USB install and restart verified on FM-1; owner confirmed screen and key sound. Other controls still need testing. Choose 0.3 dc1 to test dual-core.';
    $('source').href='musiccoach-firmware/'+(controls?'musiccoach-0.6-pad-colors-source.zip':dual?'musiccoach-0.3-dc1-source.zip':'musiccoach-0.2-source.zip');
    progress.ready();log('MusicCoach '+selectedModel+' package verified. Confirm the test-build notice, then Install / resume.');
  }catch(e){pkg=null;progress.fail();log(e.message);if(selectedModel!=='FM-1')$('manual-file').open=true;}
  finally{loading=false;sync();if(!navigator.requestMIDIAccess)log('USB installation requires desktop Chrome or Edge.');}
}
$('device').onchange=()=>{if($('device').value!=='fm1'&&$('build').value==='single')$('build').value='dual';if($('device').value==='fm1'&&$('build').value==='controls')$('build').value='single';$('stock-file').value='';prepare();};
$('build').onchange=prepare;$('stock-file').onchange=prepare;$('ack').onchange=sync;$('retry').onclick=prepare;
async function confirmGeneric(identity,model=selectedModel){
  $('loader-id').textContent=identity;$('confirm-model').textContent='It is my '+model;
  const dialog=$('model-confirm');dialog.returnValue='cancel';
  return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='continue'),{once:true});dialog.showModal();});
}
$('install').onclick=async()=>{if($('install').disabled)return;busy=true;sync();progress.start();$('log').parentElement.open=true;
  try{
    log('Waiting for browser MIDI permission...');
    const access=await navigator.requestMIDIAccess({sysex:true});
    if(selectedModel==='FM-1')await installFm1(access,pkg,log,{confirmGeneric});
    else await installStockSmk(access,pkg,log,{confirmGeneric:({identity,model})=>confirmGeneric(identity,model)});
    progress.done();pkg=null;
  }catch(e){progress.fail();log(e.message);}finally{busy=false;sync();}
};
$('save-log').onclick=()=>{const url=URL.createObjectURL(new Blob([$('log').textContent],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='musiccoach-usb-log.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
prepare();
