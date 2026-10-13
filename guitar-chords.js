import {tunings} from './instrument-views.js';
import {noteName} from './engine.js';

// Chord data is stored low E to high e; diagrams display high e at the top.
export const guitarChords={
 C:{name:'C major',frets:[-1,3,2,0,1,0],fingers:[0,3,2,0,1,0]},
 G:{name:'G major',frets:[3,2,0,0,0,3],fingers:[2,1,0,0,0,3]},
 D:{name:'D major',frets:[-1,-1,0,2,3,2],fingers:[0,0,0,1,3,2]},
 A:{name:'A major',frets:[-1,0,2,2,2,0],fingers:[0,0,1,2,3,0]},
 E:{name:'E major',frets:[0,2,2,1,0,0],fingers:[0,2,3,1,0,0]},
 Am:{name:'A minor',frets:[-1,0,2,2,1,0],fingers:[0,0,2,3,1,0]},
 Em:{name:'E minor',frets:[0,2,2,0,0,0],fingers:[0,2,3,0,0,0]},
 Dm:{name:'D minor',frets:[-1,-1,0,2,3,1],fingers:[0,0,0,2,3,1]},
 G7:{name:'G dominant seventh',frets:[3,2,0,0,0,1],fingers:[3,2,0,0,0,1]},
 Fmaj7:{name:'F major seventh',frets:[-1,-1,3,2,1,0],fingers:[0,0,3,2,1,0]}
};

export function guitarChordLessons(){
 const plans=[...Object.keys(guitarChords).map(id=>({id:id.toLowerCase(),title:'Guitar chords · '+guitarChords[id].name,chords:[id,id,id,id]})),
  {id:'changes-c-am-fmaj7-g7',title:'Chord changes · C–Am–Fmaj7–G7',chords:['C','Am','Fmaj7','G7','C','Am','Fmaj7','G7']},
  {id:'changes-g-em-c-d',title:'Chord changes · G–Em–C–D',chords:['G','Em','C','D','G','Em','C','D']}];
 return plans.map(plan=>{
  const notes=plan.chords.flatMap((id,bar)=>guitarChords[id].frets.flatMap((fret,i)=>fret<0?[]:[{written:tunings.guitar[5-i]+fret,position:{string:5-i,fret},chordShape:id}]).map((n,i)=>({...n,beat:bar*8+i,duration:.8,notationDuration:1})));
  return {id:'guitar-shape-'+plan.id,title:plan.title,tag:'GUITAR CHORD SHAPES',curriculum:true,theory:true,chordDiagrams:true,notes,beat:1,meter:'4/4',bpm:60,keyboardBase:Math.min(...notes.map(n=>n.written)),level:plan.id.startsWith('changes')?3:2,tonality:plan.id.startsWith('changes')?'Chord progression':guitarChords[plan.chords[0]].name,tags:['guitar','chords','chord diagrams','open chords',...(plan.id.startsWith('changes')?['chord changes']:[])],description:'Standard tuning, horizontal diagram: high e at the top, low E at the bottom, frets increase to the right. Hold the complete chord shape and pick each indicated string from low to high. X = do not play; O = open; dots show frets and finger numbers. Use the remaining beats to release or prepare the next shape. Microphone scoring checks individual notes, not a full strum or physical finger placement. For unscored strumming, pause and use the displayed chord diagram.'};
 });
}

export function guitarChordGuide(note){
 const shape=Object.hasOwn(guitarChords,note?.chordShape)?guitarChords[note.chordShape]:null,pos=note?.position;
 if(!shape||!pos||shape.frets[5-pos.string]!==pos.fret)return null;
 const finger=shape.fingers[5-pos.string];
 return {kind:'fretted',short:finger?'L'+finger:'open',left:finger?[finger]:[],right:[],chordShape:note.chordShape,string:pos.string,title:shape.name+' · '+noteName(note.written),detail:'Hold '+note.chordShape+' and pick string '+(pos.string+1)+' ('+noteName(tunings.guitar[pos.string])+'), '+(pos.fret?'fret '+pos.fret+' with finger '+finger:'open')+'. Follow the outlined string in the diagram. X = mute · O = open · 1–4 = fingers.'};
}

export function guitarChordDiagram(id,activeString){
 const shape=Object.hasOwn(guitarChords,id)?guitarChords[id]:null;if(!shape)return '';
 const labels=['E','A','D','G','B','e'];
 const description=shape.frets.map((fret,i)=>labels[i]+': '+(fret<0?'muted':fret===0?'open':'fret '+fret+', finger '+shape.fingers[i])).join('; ');
 let drawing='';
 const left=59,top=45,gap=22,fretWidth=40;
 for(let string=0;string<6;string++){
  const i=5-string,y=top+string*gap,fret=shape.frets[i];
  if(string===activeString)drawing+='<rect x="29" y="'+(y-10)+'" width="193" height="20" rx="8" fill="#245da512" stroke="#245da5" stroke-width="2"/>';
  drawing+='<path d="M'+left+' '+y+' H219" stroke="#555" stroke-width="'+(1+string*.15)+'"/>';
  if(fret<=0)drawing+='<text x="43" y="'+(y+4)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#111">'+(fret<0?'X':'O')+'</text>';
  drawing+='<text x="17" y="'+(y+4)+'" text-anchor="middle" font-size="11" fill="#333">'+labels[i]+'</text>';
 }
 for(let fret=0;fret<=4;fret++){
  const x=left+fret*fretWidth;
  drawing+='<path d="M'+x+' '+top+' V155" stroke="#333" stroke-width="'+(fret===0?4:1)+'"/>';
  if(fret>0)drawing+='<text x="'+(x-fretWidth/2)+'" y="177" text-anchor="middle" font-size="10" fill="#555">'+fret+'</text>';
 }
 for(let string=0;string<6;string++){const i=5-string;if(shape.frets[i]>0){const x=left+(shape.frets[i]-.5)*fretWidth,y=top+string*gap;drawing+='<circle cx="'+x+'" cy="'+y+'" r="9" fill="#111"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">'+shape.fingers[i]+'</text>';}}
 return '<svg class="guitar-chord-chart" viewBox="0 0 234 207" role="img" aria-label="'+shape.name+' chord diagram; high e at top, low E at bottom; '+description+'"><title>'+shape.name+' - high e at top; frets increase right</title><rect x="1" y="1" width="232" height="205" rx="8" fill="#fff" stroke="#c7d0dc"/><text x="117" y="23" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#111">'+id+'</text>'+drawing+'<text x="117" y="197" text-anchor="middle" font-size="8" fill="#555">X MUTE / O OPEN / 1-4 FINGERS</text></svg>';
}

// Demo marks a note hit at onset, so its next pending note is already ahead.
export function guideTarget(session){
 if(!session)return null;
 if(session.mode==='demo')return session.notes.find(n=>n.beat<=session.beat&&n.beat+n.duration>session.beat)||session.next;
 return session.next;
}
