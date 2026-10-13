// SPDX-License-Identifier: GPL-3.0-only
import {SMKBrowserSynth} from './audio/smk-browser.js';
const $=id=>document.getElementById(id),synth=new SMKBrowserSynth(),ctx=$('lcd').getContext('2d'),frame=ctx.createImageData(240,240);
const library=await fetch('./musiccoach-library.json').then(r=>{if(!r.ok)throw Error('Practice library unavailable');return r.json();});
const lessons=library.map(l=>[l.title,l.aim]);
let state=[0,0,0,0,88,1],ready=false,starting=false,held=new Map(),pointers=new Set(),padOwners=new Map(),perf=Array(32).fill(0),lastPerfTheme=-1;
function command(kind,value=0){if(ready)synth.node.port.postMessage({type:'coach',kind,value});}
function release(owner){const n=held.get(owner);if(n===undefined)return;held.delete(owner);if(![...held.values()].includes(n)){synth.midi([128,n,0]);$('keyboard').querySelector('[data-note="'+n+'"]')?.setAttribute('aria-pressed','false');}}
function press(owner,n,velocity=100){if(!ready||held.has(owner))return;const already=[...held.values()].includes(n);held.set(owner,n);if(!already)synth.midi([144,n,velocity]);$('keyboard').querySelector('[data-note="'+n+'"]')?.setAttribute('aria-pressed','true');}
function releaseAll(){pointers.clear();for(const owner of [...padOwners.keys()])padRelease(owner);for(const owner of [...held.keys()])release(owner);if(ready){synth.midi([176,64,0]);synth.release();}$('sustain').setAttribute('aria-pressed','false');}
function makeKeys(){releaseAll();command(11,$('target').value==='smk'?1:0);const fm=$('target').value==='fm1',low=fm?53:48,count=fm?27:37;let white=0;const black=n=>[1,3,6,8,10].includes(n%12),total=Array.from({length:count},(_,i)=>!black(low+i)).filter(Boolean).length;
 $('keyboard').replaceChildren();for(let i=0;i<count;i++){const n=low+i,b=document.createElement('button'),sharp=black(n);b.type='button';b.className='key '+(sharp?'black':'white');b.dataset.note=n;b.setAttribute('aria-pressed','false');const name=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][n%12]+(Math.floor(n/12)-1);b.setAttribute('aria-label','Play '+name);b.textContent=name;if(sharp){b.style.width=62/total+'%';b.style.left=(white-.31)*100/total+'%';}else white++;
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers.add(e.pointerId);press('p'+e.pointerId,n);};b.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('#keyboard .key'),next=hit?+hit.dataset.note:undefined,owner='p'+e.pointerId;if(held.get(owner)!==next){release(owner);if(next!==undefined)press(owner,next);}};b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>{pointers.delete(e.pointerId);release('p'+e.pointerId);};
  b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)press('b'+n,n);}};b.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();release('b'+n);}};b.onblur=()=>release('b'+n);b.onclick=e=>{if(e.detail===0){press('a'+n,n);setTimeout(()=>release('a'+n),140);}};$('keyboard').append(b);
 }
 $('model').textContent=fm?'FM-1':'SMK-37';$('hardwareHelp').textContent=fm?'FM-1: K1 volume / K2 sound / K3 lesson (scene in Psychedelic) / K4 shuttle. Preset dial: modes + scenes. Hold EDIT with K1-K4 for performance parameters. SAVE opens Settings.':'SMK: K1 volume / K2 sound / K3 lesson (scene in Psychedelic) / K4 shuttle. K5-K8 edit the selected FX page. FX cycles pages; Globe cycles Coach / Jam / Psychedelic. Pads play drums or edit sequencer steps.';

}
synth.listeners.add(({pixels,status:s,performance:p,lights})=>{state=s;updatePerformance(p,lights);const pixels16=new Uint16Array(pixels);for(let i=0;i<pixels16.length;i++){const v=((pixels16[i]&255)<<8)|(pixels16[i]>>8);frame.data[i*4]=((v>>11)&31)*255/31;frame.data[i*4+1]=((v>>5)&63)*255/63;frame.data[i*4+2]=(v&31)*255/31;frame.data[i*4+3]=255;}ctx.putImageData(frame,0,0);
 $('sound').value=s[15]&255;$('shuttle').max=library[s[1]].steps.reduce((n,x)=>n+x.duration/4,0);if(document.activeElement!==$('shuttle'))$('shuttle').value=Math.max(0,(s[11]-4000)/1000);$('position').textContent='Beat '+(Math.max(0,(s[11]-4000)/1000)+1).toFixed(1);
 $('lesson').textContent=lessons[s[1]][0];$('lessonHint').textContent=lessons[s[1]][1];$('lessonNumber').textContent=String(s[1]+1).padStart(2,'0')+' / '+((s[15]>>16)?library.length:47);$('bpm').textContent=s[4]+' BPM';if(document.activeElement!==$('tempo'))$('tempo').value=s[4];$('countin').textContent='Count-in '+(s[5]?'on':'off');$('countin').setAttribute('aria-pressed',String(!!s[5]));document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.mode===s[2])));
 updatePrimaryKnobs();
 $('status').textContent=perf[0]?(['Coach','Jam','Psychedelic'][perf[0]]+' / '+(perf[3]?'Groove playing':'Play live or start the groove')):perf[25]===2&&s[0]!==2?('Sequencer / '+(perf[3]?'Playing':'Paused')+' / '+s[8]+' of 4 lanes matched'):s[0]===2?(s[2]===2?'Demo complete. Try Learn next.':s[7]+' points · '+s[9]+'% accuracy · '+s[10]+' stars'):s[0]===0?'Choose a lesson and press Play.':!s[3]?'Paused. Your position is ready.':s[11]<4000?'Count-in: '+Math.ceil((4000-s[11])/1000):s[2]===2?'Demo playing. Watch the notes and pads.':'Step '+(s[6]+1)+' · '+s[7]+' points · '+s[12]+' hit combo';
});
async function startAudio(){if(starting)return;if(ready){releaseAll();command(1);synth.volume(0);ready=false;setEnabled(false);$('audio').textContent='Enable sound & screen';return;}starting=true;$('audio').disabled=true;try{await synth.start();synth.volume(+$('volume').value/100);synth.visible(true);ready=true;command(11,$('target').value==='smk'?1:0);$('audio').textContent='Mute & pause';}catch(e){$('status').textContent='Could not start audio: '+e.message;}finally{starting=false;$('audio').disabled=false;setEnabled(ready);}}
$('audio').onclick=startAudio;
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>command(+b.dataset.command,+(b.dataset.value||0)));
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>command(3,+b.dataset.mode-state[2]));
$('tempo').onchange=()=>command(4,+$('tempo').value-state[4]);$('volume').oninput=()=>synth.volume(+$('volume').value/100);
$('sound').onchange=()=>command(8,+$('sound').value-(state[15]&255));$('shuttle').onchange=()=>command(9,Math.round(+$('shuttle').value-Math.max(0,(state[11]-4000)/1000)));
$('sustain').onclick=()=>{if(!ready)return;const on=$('sustain').getAttribute('aria-pressed')!=='true';$('sustain').setAttribute('aria-pressed',String(on));synth.midi([176,64,on?127:0]);};$('panic').onclick=releaseAll;$('target').onchange=makeKeys;
const map={KeyA:60,KeyW:61,KeyS:62,KeyE:63,KeyD:64,KeyF:65,KeyT:66,KeyG:67,KeyY:68,KeyH:69,KeyU:70,KeyJ:71,KeyK:72};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||e.target.matches('input,select,textarea'))return;if(map[e.code]){e.preventDefault();if(!e.repeat)press(e.code,map[e.code]);}});document.addEventListener('keyup',e=>release(e.code));window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();command(1);}synth.visible(!document.hidden);});
makeKeys();ctx.fillStyle='#0d1024';ctx.fillRect(0,0,240,240);ctx.fillStyle='#d6ff52';ctx.font='bold 22px monospace';ctx.textAlign='center';ctx.fillText('Music Coach',120,104);ctx.font='12px monospace';ctx.fillStyle='#aeb8d0';ctx.fillText('ENABLE SOUND TO BEGIN',120,138);

const padNames=['Kick','Snare','Clap','Closed hat','Open hat','Low tom','Mid tom','High tom','Rim','Cowbell','Crash','Ride','Shaker','Clave','Low kick','Snap'];
const parameterNames=[['Drive','Chorus','Delay','Reverb'],['Rate','Wave','Pitch','Filter'],['Mode','Rate','Octave','Gate'],['Root','Scale','Snap','Shift'],['Chord','Voicing','Root','Spread'],['Repeat','Rate','Gate','Hold'],['Play','Pattern','Rate','Swing']];
const themes=['Coach Red','FM-1 Mint','Pro Neon','Elite Gold','Vapor','Arctic','Ember','Ocean','Orchid','Acid','Rose','Mono'];
const accents=['#ff5269','#74ffd6','#d6ff52','#ffbd4c','#ba86ff','#70dbff','#ff8d4b','#40b7ff','#dd7aff','#afff41','#ff91c0','#f4f7ef'];
function padPress(owner,pad){if(!ready||padOwners.has(owner))return;const already=[...padOwners.values()].includes(pad);padOwners.set(owner,pad);if(!already)synth.panel(3,pad,+$('velocity').value);}
function padRelease(owner){const pad=padOwners.get(owner);if(pad===undefined)return;padOwners.delete(owner);if(![...padOwners.values()].includes(pad))synth.panel(3,pad,0);}
padNames.forEach((name,pad)=>{const b=document.createElement('button');b.className='pad';b.dataset.pad=pad;b.innerHTML='<small>'+String(pad+1).padStart(2,'0')+'</small><strong>'+name+'</strong>';b.setAttribute('aria-label','Pad '+(pad+1)+': '+name);b.setAttribute('aria-pressed','false');
 b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);padPress('p'+e.pointerId,pad);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>padRelease('p'+e.pointerId);
 b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)padPress('b'+pad,pad);}};b.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();padRelease('b'+pad);}};b.onblur=()=>padRelease('b'+pad);b.onclick=e=>{if(e.detail===0){padPress('a'+pad,pad);setTimeout(()=>padRelease('a'+pad),120);}};$('pads').append(b);
});
const primaryControls=[
 {name:'Volume',id:'volume',min:0,max:70,read:()=>+$('volume').value,text:v=>v+'%',change:d=>{const el=$('volume');el.value=Math.max(0,Math.min(70,+el.value+d));el.oninput();}},
 {name:'Sound',id:'sound',min:0,max:5,read:()=>+$('sound').value,text:v=>['Piano','Electric piano','Organ','Synth','Flute','Sax'][v],change:d=>command(8,d)},
 {name:'Song',min:0,max:library.length-1,read:()=>state[1],text:v=>lessons[v][0],change:d=>{releaseAll();command(2,d);}},
 {name:'Playhead',id:'shuttle',min:0,max:()=>Math.floor(+$('shuttle').max),read:()=>+$('shuttle').value,text:v=>'Beat '+(v+1).toFixed(1),change:d=>command(9,d)},
 {name:'Tempo',id:'tempo',min:40,max:160,read:()=>+$('tempo').value,text:v=>v+' BPM',change:d=>command(4,d)}
];
function updatePrimaryKnobs(){primaryControls.forEach(c=>{
 const value=c.read(),max=typeof c.max==='function'?c.max():c.max,text=c.text(value);
 c.knob.setAttribute('aria-valuenow',value);c.knob.setAttribute('aria-valuemax',max);c.knob.setAttribute('aria-valuetext',text);
 c.knob.style.setProperty('--angle',(-140+280*(value-c.min)/Math.max(1,max-c.min))+'deg');c.output.textContent=text;c.output.title=text;
});}
primaryControls.forEach(c=>{
 const box=document.createElement('div');box.className='master-knob';
 box.innerHTML='<strong>'+c.name+'</strong><div class="parameter-dial primary-dial" role="slider" tabindex="0" aria-label="'+c.name+'" aria-valuemin="'+c.min+'" title="Drag up/down, scroll, or use arrow keys"><span></span></div><output aria-hidden="true"></output>';
 if(c.name==='Tempo')box.querySelector('strong').insertAdjacentHTML('afterbegin','<svg width="10" height="12" viewBox="0 0 13 15" aria-hidden="true"><path d="M5 1 1 14h10L5 1ZM6 12l6-9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg> ');
 c.knob=box.querySelector('.parameter-dial');c.output=box.querySelector('output');let drag=null,wheel=0;
 const adjust=d=>{if(!ready)return;c.change(d);if(c.id==='volume')updatePrimaryKnobs();};
 c.knob.onpointerdown=e=>{if(!ready||e.button!==0)return;e.preventDefault();c.knob.focus();c.knob.setPointerCapture(e.pointerId);drag={id:e.pointerId,y:e.clientY};};
 c.knob.onpointermove=e=>{if(!ready||!drag||e.pointerId!==drag.id)return;const max=typeof c.max==='function'?c.max():c.max,pixels=Math.max(2,150/(max-c.min)),steps=Math.trunc((drag.y-e.clientY)/pixels);if(steps){adjust(steps);drag.y-=steps*pixels;}};
 c.knob.onpointerup=c.knob.onpointercancel=c.knob.onlostpointercapture=()=>{drag=null;};c.knob.onblur=()=>{drag=null;wheel=0;};
 c.knob.onkeydown=e=>{const max=typeof c.max==='function'?c.max():c.max;let d;if(['ArrowUp','ArrowRight'].includes(e.key))d=1;else if(['ArrowDown','ArrowLeft'].includes(e.key))d=-1;else if(e.key==='Home')d=c.min-c.read();else if(e.key==='End')d=max-c.read();if(d!==undefined){e.preventDefault();adjust(d);}};
 c.knob.addEventListener('wheel',e=>{if(!ready||document.activeElement!==c.knob)return;e.preventDefault();wheel-=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?240:1);const steps=Math.trunc(wheel/40);if(steps){adjust(steps);wheel-=steps*40;}},{passive:false});
 $('primaryKnobs').append(box);
});
updatePrimaryKnobs();
// Ranges mirror mc_param in musiccoach_performance.c and TP in params.c.
const parameterRanges=[[[0,127],[0,127],[0,127],[0,127]],[[0,127],[0,4],[-64,63],[-64,63]],[[0,14],[0,9],[1,4],[1,127]],[[0,11],[0,15],[0,3],[-24,24]],[[0,9],[0,4],[0,11],[0,127]],[[0,1],[0,9],[1,127],[0,1]],[[0,1],[0,3],[0,9],[0,100]]];
for(let k=0;k<4;k++){
 const box=document.createElement('div');box.className='fxknob';
 box.innerHTML='<small>K'+(k+5)+'</small><strong>'+parameterNames[0][k]+'</strong><div class="parameter-dial" role="slider" tabindex="0" aria-label="'+parameterNames[0][k]+'" aria-valuemin="0" aria-valuemax="127" aria-valuenow="0" title="Drag up/down, scroll, or use arrow keys"><span></span></div><output aria-hidden="true">0</output>';
 const knob=box.querySelector('.parameter-dial');let drag=null,wheel=0;
 knob.onpointerdown=e=>{if(!ready||e.button!==0)return;e.preventDefault();knob.focus();knob.setPointerCapture(e.pointerId);drag={id:e.pointerId,y:e.clientY,page:perf[1]};};
 knob.onpointermove=e=>{if(!ready||!drag||drag.id!==e.pointerId)return;if(drag.page!==perf[1]){drag=null;return;}const [min,max]=parameterRanges[perf[1]][k],pixels=Math.max(2,150/(max-min)),steps=Math.trunc((drag.y-e.clientY)/pixels);if(steps){command(15+k,steps);drag.y-=steps*pixels;}};
 knob.onpointerup=knob.onpointercancel=knob.onlostpointercapture=()=>{drag=null;};
 knob.onblur=()=>{drag=null;wheel=0;};
 knob.onkeydown=e=>{if(!ready)return;let delta;if(['ArrowUp','ArrowRight'].includes(e.key))delta=1;else if(['ArrowDown','ArrowLeft'].includes(e.key))delta=-1;else if(e.key==='Home')delta=-127;else if(e.key==='End')delta=127;if(delta!==undefined){e.preventDefault();command(15+k,delta);}};
 knob.addEventListener('wheel',e=>{if(!ready||document.activeElement!==knob)return;e.preventDefault();wheel-=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?240:1);const steps=Math.trunc(wheel/40);if(steps){command(15+k,steps);wheel-=steps*40;}},{passive:false});
 $('fxknobs').append(box);
}
['Kick','Snare','Hats','Clap'].forEach((name,k)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>command(23,k-perf[14]);$('seqLanes').append(b);});
themes.forEach((name,k)=>$('theme').add(new Option(name,k)));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{releaseAll();command(12,+b.dataset.view-perf[0]);});
document.querySelectorAll('[data-fxpage]').forEach(b=>b.onclick=()=>command(27,+b.dataset.fxpage));$('drumbank').onchange=()=>{if(+$('drumbank').value!==perf[2])command(14);};
$('openSettings').onclick=()=>{$('settingsDialog').showModal();if(!perf[10])command(19);};$('settingsDialog').onclose=()=>{if(perf[10])command(19);};
$('theme').onchange=()=>command(6,+$('theme').value-state[13]);$('surface').onchange=()=>command(20,$('surface').selectedIndex-perf[11]);
$('lightshow').onchange=()=>command(21);$('brightness').onchange=()=>command(22,+$('brightness').value-perf[13]);
const playModes=['Coach','Jam','Psychedelic / Auto Tour','Neon Horizon','Orbital Ribbons','Thought Vortex','Prism Bloom','String Theory','Star Choir'];

let dialDrag=null,wheelTravel=0;
const dial=$('modeDial');
dial.onpointerdown=e=>{if(!ready||e.button!==0)return;e.preventDefault();dial.focus();dial.setPointerCapture(e.pointerId);dialDrag={id:e.pointerId,y:e.clientY};};
dial.onpointermove=e=>{if(!dialDrag||dialDrag.id!==e.pointerId)return;const steps=Math.trunc((dialDrag.y-e.clientY)/16);if(steps){command(26,steps);dialDrag.y-=steps*16;}};
dial.onpointerup=dial.onpointercancel=dial.onlostpointercapture=()=>{dialDrag=null;};
dial.onkeydown=e=>{if(!ready)return;let delta;if(['ArrowUp','ArrowRight'].includes(e.key))delta=1;else if(['ArrowDown','ArrowLeft'].includes(e.key))delta=-1;else if(e.key==='Home')delta=-perf[28];else if(e.key==='End')delta=8-perf[28];if(delta!==undefined){e.preventDefault();command(26,delta);}};
dial.addEventListener('wheel',e=>{if(!ready||document.activeElement!==dial)return;e.preventDefault();wheelTravel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?240:1);const steps=Math.trunc(wheelTravel/60);if(steps){command(26,steps);wheelTravel-=steps*60;}},{passive:false});
function updatePerformance(p,lights){if(!p)return;perf=p;
 const mode=p[28]||0;$('modeName').textContent=playModes[mode].replace('Psychedelic / ','');$('modeName').title=playModes[mode];$('modeDial').setAttribute('aria-valuenow',mode);$('modeDial').setAttribute('aria-valuetext',playModes[mode]);$('modeDial').style.setProperty('--angle',(-140+mode*35)+'deg');
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.view===p[0])));
 document.querySelectorAll('[data-fxpage]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.fxpage===p[1])));$('drumbank').value=p[2];$('theme').value=state[13];$('surface').selectedIndex=p[11];$('lightshow').checked=!!p[12];$('brightness').value=p[13];
 document.body.dataset.surface=p[11];document.documentElement.style.setProperty('--accent',accents[state[13]]);
 document.querySelectorAll('.fxknob').forEach((b,k)=>{
  const name=parameterNames[p[1]][k],value=p[6+k]<<0,[min,max]=parameterRanges[p[1]][k],knob=b.querySelector('.parameter-dial');
  b.querySelector('strong').textContent=name;b.querySelector('output').textContent=value;
  knob.setAttribute('aria-label',name);knob.setAttribute('aria-valuemin',min);knob.setAttribute('aria-valuemax',max);knob.setAttribute('aria-valuenow',value);
  knob.style.setProperty('--angle',(-140+280*(value-min)/(max-min))+'deg');
 });
 const seq=!p[0]&&p[25]===2;$('seqLanes').hidden=!seq;$('seqLanes').querySelectorAll('button').forEach((b,k)=>b.setAttribute('aria-pressed',String(p[14]===k)));
 $('padCoachStatus').textContent=seq?lessons[state[1]][0]+' / '+state[8]+' of 4 lanes matched':!p[0]&&p[25]===1?lessons[state[1]][0]+' / '+(state[3]?'Step '+(state[6]+1):'Paused')+' / '+state[7]+' points / Next: '+padNames.filter((_,k)=>p[24]&(1<<k)).join(' + '):'';
 document.querySelectorAll('.pad').forEach((b,k)=>{const rgb=lights?.[k]||0,hit=!!(p[26]&(1<<k));b.style.setProperty('--pad-color',`rgb(${(rgb>>16)*31} ${((rgb>>8)&255)*31} ${(rgb&255)*31})`);b.classList.toggle('hit',hit);b.classList.toggle('target',seq?!!(p[20+p[14]]&(1<<k)):!p[0]&&p[25]===1&&!!(p[24]&(1<<k)));b.classList.toggle('active-step',seq&&!!((state[2]===2?p[20+p[14]]:p[16+p[14]])&(1<<k)));b.classList.toggle('playhead',seq&&!!p[3]&&p[5]===k);b.querySelector('strong').textContent=seq?'Step '+(k+1):padNames[k];b.setAttribute('aria-label',seq?'Step '+(k+1)+': '+['Kick','Snare','Hats','Clap'][p[14]]:'Pad '+(k+1)+': '+padNames[k]);b.setAttribute('aria-pressed',String(seq?!!(p[16+p[14]]&(1<<k)):[...padOwners.values()].includes(k)));});
 document.querySelectorAll('#keyboard .key').forEach(el=>{const k=+el.dataset.note-53;el.classList.toggle('lit',$('target').value==='fm1'&&k>=0&&k<27&&!!lights?.[16+k]);});
}
const categories=[...new Set(library.map(l=>l.category))].sort();categories.forEach(c=>$('filterCategory').add(new Option(c,c)));
function filterLibrary(){const q=$('search').value.trim().toLocaleLowerCase(),instrument=$('filterInstrument').value,level=$('filterLevel').value,category=$('filterCategory').value;
 const found=library.filter(l=>(!instrument||l.instrument===instrument)&&(!level||l.level===level)&&(!category||l.category===category)&&(!q||[l.title,l.instrument,l.category,l.level,l.aim,l.tip,l.sticking].join(' ').toLocaleLowerCase().includes(q)));
 $('libraryCount').textContent=found.length+' / '+library.length+' studies';$('libraryResults').replaceChildren();
 if(!found.length){const p=document.createElement('p');p.textContent='No studies match those filters. Try a broader search or reset the filters.';$('libraryResults').append(p);}
 found.forEach(l=>{const card=document.createElement('article');card.className='study';const meta=document.createElement('small');meta.textContent=l.instrument+' / '+l.category+' / '+l.level;const title=document.createElement('h3');title.textContent=l.title;const aim=document.createElement('p');aim.textContent=l.aim;const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='How to practice';const tip=document.createElement('p');tip.textContent=l.tip;const credit=document.createElement('small');credit.textContent=l.credit;detail.append(summary,tip,credit);const launch=document.createElement('button');launch.textContent='Practice →';launch.onclick=async()=>{launch.disabled=true;try{if(!ready)await startAudio();if(!ready)return;if(l.instrument!=='Piano'&&$('target').value!=='smk'){$('target').value='smk';makeKeys();}releaseAll();command(12,-perf[0]);command(2,l.id-state[1]);command(4,l.bpm-state[4]);if(perf[10])command(19);$('lesson').scrollIntoView({behavior:'smooth',block:'center'});}finally{launch.disabled=false;}};card.append(meta,title,aim,detail,launch);$('libraryResults').append(card);});
}
['search','filterInstrument','filterLevel','filterCategory'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',filterLibrary));$('clearFilters').onclick=()=>{['search','filterInstrument','filterLevel','filterCategory'].forEach(id=>$(id).value='');filterLibrary();};filterLibrary();

function setEnabled(on){document.querySelectorAll('#modeDial,.parameter-dial').forEach(el=>el.setAttribute('aria-disabled',String(!on)));document.querySelectorAll('[data-command],[data-mode],[data-view],#modePrev,#modeNext,#openSettings,#sound,#shuttle,#tempo,[data-fxpage],#drumbank,#sustain,.fxknob button,.pad').forEach(el=>el.disabled=!on);}
setEnabled(false);

// Reserve the measured dock height so the last lesson/footer stays scrollable.
const playDock=$('playDock');
new ResizeObserver(()=>document.documentElement.style.setProperty('--play-dock-height',Math.ceil(playDock.getBoundingClientRect().height)+'px')).observe(playDock);
