// Practice notation uses a sixteenth-note grid; playback always keeps its original timing.
export const TICKS = 4;
const values = [[16,'w',0],[12,'h',1],[8,'h',0],[6,'q',1],[4,'q',0],[3,'8',1],[2,'8',0],[1,'16',0]];

export function splitRhythm(start, length) {
  const result = [];
  while (length > 0) {
    // Split syncopations at the next beat so the pulse remains readable.
    const limit = start % 4 ? Math.min(length, 4 - start % 4) : length;
    const [ticks,duration,dots] = values.find(([n])=>n<=limit);
    result.push({start,ticks,duration,dots}); start+=ticks; length-=ticks;
  }
  return result;
}

export function writtenKey(note, instrument) {
  if (instrument==='drums') {
    const drums={35:'f/4',36:'f/4',38:'c/5',40:'c/5',39:'d/5/x2',42:'g/5/x2',44:'g/5/x2',46:'g/5/x2',45:'a/4',41:'a/4',43:'a/4',47:'a/4',48:'e/5',50:'e/5',49:'a/5/x2',51:'a/5/x2'};
    return {key:drums[note.written]||'c/5',accidental:null};
  }
  const octaveShift=['guitar','bass'].includes(instrument)?1:0;
  if(note.spelling) {
    const s=note.spelling,accidental=({'-2':'bb','-1':'b','0':'n','1':'#','2':'##'})[s.accidental]||'n';
    return {key:s.letter.toLowerCase()+'/'+(s.octave+octaveShift),accidental};
  }
  const pc=((note.written%12)+12)%12;
  return {key:['c','c','d','d','e','f','f','g','g','a','a','b'][pc]+'/'+(Math.floor(note.written/12)-1+octaveShift),accidental:[1,3,6,8,10].includes(pc)?'#':'n'};
}

export function buildSheet(notes,{instrument='piano',meter='4/4',beat=1}={}) {
  let [numerator,denominator]=meter.split('/').map(Number);
  if(!Number.isInteger(numerator)||numerator<1||numerator>32||![1,2,4,8,16].includes(denominator)){numerator=4;denominator=4;}
  const barTicks=numerator*16/denominator;
  const staves=instrument==='piano'?['treble','bass']:[instrument==='bass'?'bass':instrument==='drums'?'percussion':'treble'];
  const onsets=[...new Set(notes.map(n=>n.beat))].sort((a,b)=>a-b);
  const spacing=new Map(onsets.map((b,i)=>[b,(onsets[i+1]??b+(b-onsets[i-1]||beat))-b]));
  let rounded=false,end=barTicks;
  const groups=new Map();
  for(const [index,n] of notes.entries()) {
    const start=Math.round(n.beat*TICKS);
    const inferred=Math.min(beat,spacing.get(n.beat)||beat);
    const length=n.notationDuration??(n.duration>beat?n.duration:inferred);
    const ticks=Math.max(1,Math.round(length*TICKS));
    if(Math.abs(start/TICKS-n.beat)>.015||Math.abs(ticks/TICKS-length)>.015)rounded=true;
    const staff=instrument==='piano'&&n.written<60?1:0;
    const key=[staff,start,ticks].join(':');
    if(!groups.has(key))groups.set(key,{id:key,staff,start,end:start+ticks,notes:[],indexes:[]});
    groups.get(key).notes.push(n);groups.get(key).indexes.push(index);end=Math.max(end,start+ticks);
  }
  // Assign overlapping notes with different lengths to separate voices.
  const lanes=staves.map(()=>[]);
  const bars=new Map();
  for(const group of [...groups.values()].sort((a,b)=>a.start-b.start||b.end-a.end)) {
    const ends=lanes[group.staff];let lane=ends.findIndex(end=>end<=group.start);if(lane<0)lane=ends.length;ends[lane]=group.end;
    for(let pos=group.start;pos<group.end;) {
      const bar=Math.floor(pos/barTicks),stop=Math.min(group.end,(bar+1)*barTicks);
      if(!bars.has(bar))bars.set(bar,{index:bar,start:bar*barTicks,end:(bar+1)*barTicks,parts:staves.map(()=>[])});
      const parts=bars.get(bar).parts[group.staff];parts[lane]??=[];
      for(const fragment of splitRhythm(pos-bar*barTicks,stop-pos))parts[lane].push({...fragment,group,tieIn:bar*barTicks+fragment.start>group.start,tieOut:bar*barTicks+fragment.start+fragment.ticks<group.end});
      pos=stop;
    }
  }
  const totalBars=Math.ceil(end/barTicks),measures=[];
  // Collapse long empty passages without dropping them from the timeline.
  for(let bar=0;bar<totalBars;) {
    let measure=bars.get(bar);
    if(!measure){let stop=bar+1;while(stop<totalBars&&!bars.has(stop))stop++;measure={index:bar,start:bar*barTicks,end:stop*barTicks,restBars:stop-bar,parts:staves.map(()=>[])};bar=stop;}else bar++;
    measure.parts=measure.parts.map(voices=>{
      if(!voices.some(Boolean))voices=[[]];
      return voices.filter(Boolean).map(voice=>{
        const complete=[];let pos=0;
        for(const fragment of voice){if(fragment.start>pos)complete.push(...splitRhythm(pos,fragment.start-pos));complete.push(fragment);pos=fragment.start+fragment.ticks;}
        if(pos<barTicks)complete.push(...splitRhythm(pos,barTicks-pos));
        return complete;
      });
    });
    measure.density=Math.max(...measure.parts.flat().map(v=>v.length));
    measures.push(measure);
  }
  return {measures,staves,numerator,denominator,barTicks,totalBars,end:totalBars*barTicks,rounded};
}

export function arrangeSystems(measures,width) {
  const available=Math.max(260,width-32),systems=[];let row=[],used=0;
  for(const measure of measures) {
    const required=Math.max(155,measure.density*36+38);
    if(row.length&&(used+required+70>available||row.length===4)){systems.push(row);row=[];used=0;}
    row.push({...measure,minimum:required});used+=required;
  }
  if(row.length)systems.push(row);
  return systems;
}

export function playheadAt(anchors,beat) {
  const tick=beat*TICKS;
  if(tick<=anchors[0].tick)return anchors[0].x;
  for(let i=1;i<anchors.length;i++)if(tick<=anchors[i].tick){const a=anchors[i-1],b=anchors[i];return a.x+(b.x-a.x)*(tick-a.tick)/(b.tick-a.tick);}
  return anchors.at(-1).x;
}
