// Original short vocal exercises; ranges are starting pitches, not voice classifications.
export const singingLessons=[
{id:'voice-match',title:'Match one note',steps:[0,0,0,0],beat:3,description:'Listen in Demo, then hum or sing the same note softly. Leave a small breath between repeats.'},
{id:'voice-neighbors',title:'Two-note echo',steps:[0,2,0,2,2,0],beat:2,description:'Sing on a comfortable vowel. Listen for the small step between the two pitches.'},
{id:'voice-three',title:'Three-note hum',steps:[0,2,4,2,0],beat:2,description:'Hum a gentle three-note rise and return. Choose a lower starting range if needed.'},
{id:'voice-five',title:'Five-note warm-up',steps:[0,2,4,5,7,5,4,2,0],beat:1.5,description:'Sing an easy five-note ladder on ah or oo. Keep the tone comfortable.'},
{id:'voice-thirds',title:'Hear the third',steps:[0,4,0,4,2,5,2,0],beat:2,description:'Listen to each interval in Demo, then echo it without sliding between notes.'},
{id:'voice-triad',title:'Sing a triad',steps:[0,4,7,4,0,0,4,7,4,0],beat:2,description:'Sing the notes of a major chord one at a time. Use Demo as a piano reference.'},
{id:'voice-scale',title:'One-octave scale',steps:[0,2,4,5,7,9,11,12,11,9,7,5,4,2,0],beat:1.5,description:'Try only a comfortable octave; change starting range whenever you need to.'},
{id:'voice-phrase',title:'Short melody, clear rhythm',steps:[0,2,4,4,2,0,2,4,7,4,2,0],beat:1,description:'Start with Wait, then try Practice. Scoring checks note choice and onset timing, not breath support or tone quality.'}
].map((l,i)=>({...l,tag:'VOICE / '+String(i+1).padStart(2,'0'),notes:l.steps.map((step,j)=>({written:60+step,beat:j*l.beat,duration:l.beat*.7,notationDuration:l.beat,lyric:i===0?'Ah':i===2?'Mm':({0:'Do',2:'Re',4:'Mi',5:'Fa',7:'Sol',9:'La',11:'Ti',12:'Do'})[step]}))}));
export function vocalScore(notes,shift=0){return notes.map(n=>({...n,written:n.written+shift,pitch:n.pitch+shift,...(shift?{spelling:undefined}:{})}));}

export function vocalCues(notes){return notes.filter((n,i)=>i===0||n.beat!==notes[i-1].beat).map(n=>({beat:n.beat,duration:n.duration,text:n.lyric||'Ah'}));}
