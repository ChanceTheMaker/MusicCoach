import {SamplePlayer,soundBanks} from './sample-player.js';
import {DrumPlayer} from './drums.js';
export function programBank(program){
 if(program>=24&&program<=31)return 'acoustic_guitar_steel';
 if(program>=32&&program<=39)return 'electric_bass_finger';
 if(program===22)return 'harmonica';
 return ({64:'soprano_sax',65:'alto_sax',66:'tenor_sax',67:'baritone_sax'})[program]||'acoustic_grand_piano';
}
// Each track owns its voices, so muting a guitar cannot cut off another guitar.
export class TrackMixer{
 constructor({makePlayer=t=>t.percussion?new DrumPlayer():new SamplePlayer()}={}){this.makePlayer=makePlayer;this.tracks=[];this.volume=.65;this.muted=false;this.enabled=true;this.demo=false;this.cache={encoded:new Map(),decoded:new Map(),pending:new Map()};}
 setSong(lesson){
  if(this.lessonId===lesson.id)return;
  this.stop();for(const t of this.tracks){t.player.master?.disconnect();t.player.compressor?.disconnect();}
  this.lessonId=lesson.id;
  let saved={};try{saved=JSON.parse(localStorage.getItem('musicteacher.mix.'+lesson.id)||'{}');}catch{}
  this.tracks=(lesson.tracks||[]).map(track=>{const player=this.makePlayer(track);if(!track.percussion){Object.assign(player,this.cache,{maxDecodedBanks:8});player.select(programBank(track.program));}return {...track,player,muted:typeof saved[track.id]==='boolean'?saved[track.id]:null,voices:new Map(),cursor:0};});
 }
 isMuted(t){return t.muted??(t.practice&&!this.demo);}
 setMute(id,muted){const t=this.tracks.find(t=>t.id===id);if(!t)return;t.muted=muted;if(muted){t.player.stopAll();t.voices.clear();}this.applyVolume();try{localStorage.setItem('musicteacher.mix.'+this.lessonId,JSON.stringify(Object.fromEntries(this.tracks.filter(t=>t.muted!==null).map(t=>[t.id,t.muted]))));}catch{}}
 setVolume(volume,muted){this.volume=volume;this.muted=muted;this.applyVolume();}
 applyVolume(){for(const t of this.tracks)t.player.setVolume(this.volume*.75,this.muted||!this.enabled||this.isMuted(t));}
 async prepare(ctx){if(!this.enabled)return;await Promise.all(this.tracks.map(async t=>{t.player.connect(ctx);if(!t.percussion)await t.player.prepare();}));this.applyVolume();}
 stop(){for(const t of this.tracks){t.player.stopAll();t.voices.clear();t.cursor=0;}this.lastBeat=null;}
 tick(beat){
  if(!this.enabled||beat<0)return;
  if(this.lastBeat!==null&&beat<this.lastBeat)this.stop();
  const from=this.lastBeat??beat-.06;this.lastBeat=beat;
  for(const t of this.tracks){
   // Resume held melodic notes when seeking; percussion only fires fresh onsets.
   const active=new Map();
   for(const n of t.notes){if(n.beat>beat)break;if(t.percussion){if(n.beat>from&&!this.isMuted(t))t.player.hit(n.written,n.velocity||90);}else if(n.beat+n.duration>beat)active.set(n.written,n);}
   if(t.percussion)continue;
   for(const [pitch,onset] of t.voices)if(this.isMuted(t)||active.get(pitch)?.beat!==onset){t.player.noteOff(pitch);t.voices.delete(pitch);}
   if(!this.isMuted(t))for(const [pitch,n] of active)if(!t.voices.has(pitch)){t.player.noteOn(pitch,n.velocity||90);t.voices.set(pitch,n.beat);}
  }
 }
 get endBeat(){return this.tracks.reduce((end,t)=>t.notes.reduce((end,n)=>Math.max(end,n.beat+n.duration),end),0);}
}
export function mountMixer(mixer,{onChange}){
 const enabled=document.getElementById('midiBacking'),rows=document.getElementById('midiTracks'),help=document.getElementById('midiHelp');
 try{enabled.checked=localStorage.getItem('musicteacher.midiBacking')!=='false';}catch{}
 mixer.enabled=enabled.checked;
 enabled.onchange=()=>{onChange();mixer.enabled=enabled.checked;mixer.stop();mixer.applyVolume();try{localStorage.setItem('musicteacher.midiBacking',String(mixer.enabled));}catch{}};
 return ()=>{
  rows.replaceChildren();
  help.textContent=mixer.tracks.length?'Your practice part is silent in Wait, Practice and Perform; Demo includes it. Mute any part below. MIDI sound follows the song playhead.':'No separate MIDI parts in this lesson. Demo can play its practice notes. Import a multitrack MIDI, Guitar Pro or MusicXML file for accompaniment.';
  for(const t of mixer.tracks){const row=document.createElement('label');row.className='midi-track';const text=document.createElement('span'),name=document.createElement('strong'),sound=document.createElement('small'),mute=document.createElement('input'),label=document.createElement('span');name.textContent=t.name+(t.practice?' (your part)':'');sound.textContent=t.percussion?'Drum kit':soundBanks[programBank(t.program)].label+' sound';text.append(name,sound);mute.type='checkbox';mute.checked=mixer.isMuted(t);mute.setAttribute('aria-label','Mute '+t.name+' '+t.id);mute.onchange=()=>mixer.setMute(t.id,mute.checked);label.textContent='Mute';row.append(text,mute,label);rows.append(row);}
 };
}
