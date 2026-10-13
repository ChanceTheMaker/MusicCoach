export const noteName = n => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][((n%12)+12)%12]+(Math.floor(n/12)-1);
export const profiles = {
 singing:{name:'Singing',base:60,low:48,high:84,tip:'Choose a comfortable starting range. Hear the piano reference in Demo, then sing one note at a time. Use headphones so the microphone hears your voice. The pitch meter shows intonation; scoring checks notes and onset timing, not vocal technique.'},
 drums:{name:'Drums',base:36,low:36,high:50,tip:'Play the drum at the left marker. Keys 1–8 or USB MIDI play the kit. Microphone mode grades timing only.'},
 piano:{name:'Piano',base:60,low:48,high:84,tip:'Play the highlighted keys. FM-1 and SMK-37 connect through USB MIDI.'},
 guitar:{name:'Guitar',base:64,low:59,high:78,tip:'Single-note practice. Start on the open high E string; use a clean tone and let each note ring.'},
 bass:{name:'Bass',base:40,low:28,high:55,tip:'Standard E–A–D–G tuning. Follow the string and fret number; the first E2 is fret 2 on the D string. Mute unused strings.'},
 sax:{name:'Saxophone',base:60,low:58,high:79,tip:'Use a comfortable written middle C. Select your instrument’s transposition; the microphone listens for concert pitch.'},
 harmonica:{name:'Harmonica',base:72,low:72,high:84,tip:'C diatonic, holes 4–7: C blow 4, D draw 4, E blow 5, F draw 5, G blow 6, A draw 6, B draw 7, C blow 7. Single notes only.'}
};
export const lessons=[
 {id:'first',title:'Find your first notes',tag:'01 / START HERE',description:'A few notes, one small win at a time. Release between repeated notes.',steps:[0,0,2,2,4,4,2,0],beat:1.5},
 {id:'steps',title:'Up, then back',tag:'02 / MELODY',description:'Follow a five-note path. Aim for an even sound and relaxed movement.',steps:[0,2,4,5,7,5,4,2,0],beat:1},
 {id:'pulse',title:'Pocket rhythm',tag:'03 / TIMING',description:'Alternate long and short notes. Try Learn first, then Perform.',steps:[0,2,4,2,0,0,4,5,7,4,2,0],beat:.75},
 {id:'scale',title:'The octave climb',tag:'04 / RANGE',description:'An original major-scale exercise. Play every pitch in its correct octave.',steps:[0,2,4,5,7,9,11,12,11,9,7,5,4,2,0],beat:1},
 {id:'chords',title:'Together in thirds',tag:'05 / PIANO',description:'Play both notes together. Available with MIDI or the onscreen keyboard.',steps:[[0,4],[2,5],[4,7],[5,9],[7,11],[5,9],[4,7],[0,4]],beat:2,piano:true}
];
export function makeNotes(lesson,base,transpose=0){if(lesson.notes)return lesson.notes.map(n=>({...n,pitch:n.written+transpose}));return lesson.steps.flatMap((step,i)=>(Array.isArray(step)?step:[step]).map(offset=>({pitch:base+offset+transpose,written:base+offset,beat:i*lesson.beat,duration:lesson.beat*.7})));}
export class Session {
 constructor(notes,{mode='learn',bpm=80,meter='4/4',countIn}={}){this.notes=notes.map(n=>({...n,state:'pending'}));this.mode=mode;this.bpm=bpm;const [beats,unit]=meter.split('/').map(Number);this.beatsPerBar=beats>0&&unit>0?beats*4/unit:4;this.time=countIn===false?0:countIn===true?-this.beatsPerBar*60/bpm:-2;this.score=0;this.combo=0;this.best=0;this.wrong=0;this.judged=0;this.held=new Set();this.feedback='Get ready';}
 get beat(){return this.time*this.bpm/60;}
 get next(){return this.notes.find(n=>n.state==='pending');}
 seek(seconds){this.time=Math.max(0,seconds);this.partial=this.time>0;this.score=0;this.combo=0;this.best=0;this.wrong=0;this.judged=0;this.held.clear();for(const n of this.notes){n.state=n.beat*60/this.bpm<this.time-.001?'skipped':'pending';delete n.offset;delete n.started;delete n.heldSeconds;}this.feedback='Ready from this position';}
 get finished(){return this.notes.every(n=>n.state!=='pending')&&this.beat>Math.max(this.playbackEnd||0,...this.notes.map(n=>n.beat+n.duration))+.5;}
 advance(seconds){this.time+=Math.min(seconds,.1); if(this.mode==='learn'&&this.next)this.time=Math.min(this.time,this.next.beat*60/this.bpm); if(this.mode==='demo'){for(const n of this.notes)if(n.state==='pending'&&n.beat<=this.beat)n.state='hit';this.feedback='Demo · listen and follow';return;} if(this.mode!=='learn')for(const n of this.notes)if(n.state==='pending'&&this.time-n.beat*60/this.bpm>.25){n.state='miss';this.combo=0;this.feedback='Keep going';}}
 press(pitch){if(this.mode==='demo')return null;if(this.held.has(pitch))return null;this.held.add(pitch); const candidates=this.notes.filter(n=>n.state==='pending'&&n.pitch===pitch&&Math.abs(n.beat*60/this.bpm-this.time)<=.25);const n=candidates.sort((a,b)=>Math.abs(a.beat*60/this.bpm-this.time)-Math.abs(b.beat*60/this.bpm-this.time))[0]; if(!n){if(this.time>=0){this.wrong++;this.combo=0;this.feedback='Try '+(this.next?noteName(this.next.written):'the next note');}return null;}n.state='hit';n.offset=this.time-n.beat*60/this.bpm;n.started=this.time;this.combo++;this.best=Math.max(this.combo,this.best);this.judged++;this.score+=this.mode==='learn'||Math.abs(n.offset)<.09?100:Math.abs(n.offset)<.18?70:40;this.feedback=this.mode==='learn'?'You got it':Math.abs(n.offset)<.09?'Perfect':n.offset<0?'A little early':'A little late';return n;}
 release(pitch){this.held.delete(pitch);for(const n of this.notes)if(n.pitch===pitch&&n.state==='hit'&&n.started!==undefined&&n.heldSeconds===undefined)n.heldSeconds=Math.max(0,this.time-n.started);}
 get result(){const notes=this.notes.filter(n=>n.state!=='skipped'),hit=notes.filter(n=>n.state==='hit'); const accuracy=Math.round(hit.length/Math.max(1,notes.length+this.wrong)*100);return{score:this.score,maxScore:notes.length*100,accuracy,hits:hit.length,total:notes.length,best:this.best,stars:accuracy>=95?3:accuracy>=75?2:accuracy>=40?1:0};}
}
// Normalized difference pitch detector. Monophonic only; reject weak/aperiodic signals.
export function detectPitch(buffer,sampleRate,minHz=35,maxHz=1600){
 let energy=0;for(const x of buffer)energy+=x*x;if(Math.sqrt(energy/buffer.length)<.008)return null;
 const min=Math.floor(sampleRate/maxHz),max=Math.min(Math.floor(sampleRate/minHz),Math.floor(buffer.length/2)-1), count=buffer.length-max;
 const d=new Float32Array(max+1);let sum=0,chosen=0;
 for(let lag=1;lag<=max;lag++){let v=0;for(let i=0;i<count;i+=2){const delta=buffer[i]-buffer[i+lag];v+=delta*delta;}sum+=v;d[lag]=sum?v*lag/sum:1;if(lag>min+1&&d[lag-1]<.12&&d[lag]>=d[lag-1]){chosen=lag-1;break;}}
 if(!chosen)return null;const a=d[chosen-1],b=d[chosen],c=d[chosen+1],den=a-2*b+c;const refined=chosen+(den?(a-c)/(2*den):0);const hz=sampleRate/refined,midi=69+12*Math.log2(hz/440);return{hz,note:Math.round(midi),cents:Math.round((midi-Math.round(midi))*100),confidence:1-b};
}
