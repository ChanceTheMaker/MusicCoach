import {importer} from '@coderline/alphatab';
import {unzipSync} from 'fflate';

export function parseGuitarPro(bytes){
  // Bound expanded GP7/8 archives before handing them to the score parser.
  if(bytes[0]===0x50&&bytes[1]===0x4b){let total=0;unzipSync(bytes,{filter:file=>{if(file.originalSize>16*1024*1024||(total+=file.originalSize)>32*1024*1024)throw Error('Expanded Guitar Pro file is too large.');return false;}});}
  let score;try{score=importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes));}catch{throw Error('This Guitar Pro file could not be read. Use a GP3, GP4, GP5, GPX or GP file.');}
  const warnings=new Set(['Guitar Pro practice follows written bar order at one tempo. Bends, slides, vibrato, grace notes and other expressive effects are not performed or graded.']);
  const parts=[];
  for(const track of score.tracks)for(const staff of track.staves){
    const events=[],ties=new Map(),tuning=staff.tuning;
    const tablature=tuning.length?{tuning:[...tuning],capo:staff.capo||0}:null;
    for(const bar of staff.bars)for(const voice of bar.voices)for(const beat of voice.beats){
      if(beat.graceType!==0)continue;
      const onset=(bar.masterBar.start+beat.displayStart)/960,duration=beat.displayDuration/960;
      if(!(duration>0))continue;
      for(const note of beat.notes){
        if(note.isDead){warnings.add('Dead/muted notes were skipped because practice checks pitched notes.');continue;}
        const pitch=note.realValue;
        if(!Number.isInteger(pitch)||pitch<0||pitch>127)continue;
        const origin=note.isTieDestination?ties.get(note.tieOrigin):null;
        if(origin){origin.duration=Math.max(origin.duration,onset+duration-origin.beat);origin.notationDuration=origin.duration;ties.set(note,origin);continue;}
        const string=tuning.length-note.string;
        const validPosition=tablature&&string>=0&&string<tuning.length&&Number.isInteger(note.fret)&&note.fret>=0&&tuning[string]+tablature.capo+note.fret===pitch;
        const event={written:pitch,beat:onset,duration,velocity:Math.max(1,Math.min(127,15+Number(beat.dynamics||5)*16)),notationDuration:duration,...(validPosition?{position:{string,fret:note.fret}}:{})};
        events.push(event);ties.set(note,event);
      }
    }
    if(events.length){events.sort((a,b)=>a.beat-b.beat||a.written-b.written);parts.push({name:(track.name||'Track '+(track.index+1))+(track.staves.length>1?` · staff ${staff.index+1}`:''),percussion:staff.isPercussion,program:track.playbackInfo.program,score:{notes:events,beat:1,...(tablature?{tablature}:{})}});}
  }
  const first=score.masterBars[0];
  if(score.masterBars.some(b=>b.timeSignatureNumerator!==first.timeSignatureNumerator||b.timeSignatureDenominator!==first.timeSignatureDenominator))warnings.add('Practice bar lines use the initial time signature; note timing is retained.');
  return {title:score.title||'Imported Guitar Pro score',composer:score.artist||score.music||'',bpm:Math.round(score.tempo||120),meter:first?`${first.timeSignatureNumerator}/${first.timeSignatureDenominator}`:'4/4',parts,warnings:[...warnings],pitchConvention:'concert'};
}
