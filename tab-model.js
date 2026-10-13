import {tunings} from './instrument-views.js';

export function tabPositions(notes,instrument,tablature) {
  const tuning=tablature?.tuning||tunings[instrument],capo=tablature?.capo||0;
  const positions=new Map(),groups=new Map();
  for(const note of notes){if(!groups.has(note.beat))groups.set(note.beat,[]);groups.get(note.beat).push(note);}
  for(const group of groups.values()){
    const choices=group.map(note=>{
      const pitch=note.pitch??note.written,p=note.position;
      const valid=p&&Number.isInteger(p.string)&&Number.isInteger(p.fret)&&p.string>=0&&p.string<tuning.length&&p.fret>=0&&p.fret<=36&&tuning[p.string]+capo+p.fret===pitch;
      return {note,choices:valid?[p]:tuning.map((open,string)=>({string,fret:pitch-open-capo})).filter(p=>p.fret>=0&&p.fret<=24).sort((a,b)=>a.fret-b.fret||a.string-b.string)};
    }).sort((a,b)=>a.choices.length-b.choices.length);
    const used=new Set(),chosen=new Map();let attempts=0;
    function assign(index){if(index===choices.length)return true;if(++attempts>10000)return false;const {note,choices:options}=choices[index];for(const p of options)if(!used.has(p.string)){used.add(p.string);chosen.set(note,p);if(assign(index+1))return true;used.delete(p.string);chosen.delete(note);}return false;}
    if(!assign(0)){
      // Keep playable notes visible even if the imported chord needs more strings.
      used.clear();chosen.clear();for(const {note,choices:options} of choices){const p=options.find(p=>!used.has(p.string));if(p){chosen.set(note,p);used.add(p.string);}}
    }
    for(const note of group)positions.set(note,chosen.get(note)||null);
  }
  return {tuning,capo,positions,unmapped:notes.filter(n=>!positions.get(n))};
}
