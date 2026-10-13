// Original, ready-to-play harmony curriculum shared by the menu and library.
const bases={piano:60,guitar:60,bass:36,sax:60,harmonica:72,singing:60};
const cues={0:'Do',2:'Re',4:'Mi',5:'Fa',7:'Sol',9:'La',11:'Ti',12:'Do'};
const coaching={
 piano:'Release between chords. Microphone input separates the tones; MIDI and onscreen input play the chord together.',
 guitar:'Pick one note at a time in standard tuning, following the string and fret. These are chord-tone studies, not strummed-chord assessment.',
 bass:'Pluck one chord tone at a time and mute unused strings. Follow the string and fret shown.',
 sax:'Read the written notes and choose your saxophone transposition. Take a breath between phrases.',
 harmonica:'Use a C diatonic harmonica, holes 4–7. Follow each hole and breath cue; no bends are needed.',
 singing:'Sing the solfège cues or a comfortable vowel. Choose your starting range; Demo provides a piano reference.'
};
const patterns=[
 {key:'chord-major',title:'Chords · C major',tones:[0,4,7],kind:'chord',tonality:'C major',detail:'Learn the root, major third and fifth: C–E–G.'},
 {key:'chord-minor',title:'Chords · A minor, first inversion',tones:[0,4,9],kind:'chord',tonality:'A minor',detail:'A minor contains A–C–E. This first inversion starts on C: C–E–A.'},
 {key:'chord-seventh',title:'Chords · G7, second inversion',tones:[2,5,7,11],kind:'chord',tonality:'G dominant seventh',detail:'G7 contains G–B–D–F. This second inversion starts on D: D–F–G–B.'},
 {key:'chord-inversion',title:'Chords · C major, first inversion',tones:[4,7,12],kind:'chord',tonality:'C major',detail:'Keep the same C-major chord tones but start on E: E–G–C.'},
 {key:'arpeggio-major',title:'Arpeggios · C major octave',tones:[0,4,7,12],kind:'arpeggio',tonality:'C major',detail:'Play C–E–G–C and return down the chord, one note at a time.'},
 {key:'arpeggio-minor',title:'Arpeggios · A minor, first inversion',tones:[0,4,9],kind:'arpeggio',tonality:'A minor',detail:'Outline A minor by rising through C–E–A, then descending.'},
 {key:'arpeggio-seventh',title:'Arpeggios · G7, second inversion',tones:[2,5,7,11],kind:'arpeggio',tonality:'G dominant seventh',detail:'Rise and fall through D–F–G–B. Listen for the tension of the dominant seventh.'},
 {key:'arpeggio-progression',title:'Arpeggios · C–F–G7–C',groups:[[0,4,7],[0,5,9],[2,5,7,11],[0,4,7]],kind:'arpeggio',tonality:'C major',detail:'Connect I–IV–V7–I one tone at a time. C uses root position, F second inversion and G7 second inversion. Leave a beat to prepare each new chord.'}
];

export function harmonyLessons(instrument,source='screen'){
 if(instrument==='drums')return coordinationLessons();
 if(!Object.hasOwn(bases,instrument))return [];
 const base=bases[instrument];
 return patterns.map(pattern=>{
  const together=pattern.kind==='chord'&&instrument==='piano'&&source!=='mic';
  const notes=[];
  const add=(offset,beat,duration,notationDuration=1)=>notes.push({written:base+offset,beat,duration,notationDuration,...(instrument==='singing'?{lyric:cues[offset]}:{})});
  if(together){for(let repeat=0;repeat<4;repeat++)for(const tone of pattern.tones)add(tone,repeat*4,2.5,3);}
  else if(pattern.groups){let beat=0;for(const tones of pattern.groups){for(const tone of tones)add(tone,beat++, .8);beat++;}}
  else {const tones=pattern.kind==='arpeggio'?[...pattern.tones,...pattern.tones.slice(0,-1).reverse()]:pattern.tones;let beat=0;for(let repeat=0;repeat<3;repeat++){for(const tone of tones)add(tone,beat++, .8);beat++;}}
  const tip=instrument==='piano'&&pattern.kind==='arpeggio'?'Play one key at a time with even timing. Arpeggios stay sequential with every input type.':coaching[instrument];
  return {id:instrument+'-harmony-'+pattern.key,title:pattern.title,tag:pattern.kind==='chord'?'CHORD LESSON':'ARPEGGIO LESSON',description:pattern.detail+' '+(together?'Play all the displayed chord tones together. ':pattern.kind==='chord'?'Play the chord tones separately, with a beat of rest between groups. ':'')+tip,theory:true,curriculum:true,notes,beat:1,keyboardBase:base,meter:'4/4',bpm:60,level:pattern.key.includes('seventh')||pattern.groups?3:2,tonality:pattern.tonality,tags:['harmony',pattern.kind==='chord'?'chords':'arpeggios',...(pattern.key.includes('minor')?['minor']:[]),...(pattern.key.includes('seventh')?['seventh']:[]),...(pattern.key.includes('inversion')||pattern.key.includes('minor')||pattern.key.includes('seventh')?['inversions']:[])]};
 });
}

function coordinationLessons(){
 const simultaneous=[];
 for(let bar=0;bar<4;bar++)for(const [offset,voices] of [[0,[36,42]],[1,[38,42]],[2,[36,42]],[3,[38,49]]])for(const written of voices)simultaneous.push({written,beat:bar*4+offset,duration:.18});
 const sequence=Array.from({length:4},(_,bar)=>[38,50,45,36,45,50,38].map((written,i)=>({written,beat:bar*4+i*.5,duration:.18}))).flat();
 return [
  {id:'drums-harmony-together',title:'Coordination · Together on the beat',description:'Play kick or snare together with the indicated hat or cymbal. These are simultaneous drum hits, not pitched chords. MIDI/onscreen input checks both voices; acoustic mode checks one onset per beat.',notes:simultaneous,tags:['coordination','simultaneous hits']},
  {id:'drums-harmony-sequence',title:'Coordination · Around the kit',description:'Move from snare to high tom, low tom and kick, then back. Keep the eighth notes even and rest before repeating. This is an unpitched sequence, not an arpeggio. Acoustic mode checks timing only.',notes:sequence,tags:['coordination','fills','eighth notes']}
 ].map(l=>({...l,tag:'DRUM COORDINATION',curriculum:true,theory:true,beat:1,meter:'4/4',bpm:60,level:2,tonality:'Unpitched'}));
}
