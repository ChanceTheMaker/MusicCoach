// Original instructional scores. Folk melodies are new teaching reductions, not scans or recordings.
import {harmonyLessons} from '../harmony-lessons.js';
import {guitarChordLessons} from '../guitar-chords.js';
const instruments=['piano','guitar','bass','sax','harmonica','singing'];
const bases={singing:60,piano:60,guitar:60,bass:36,sax:60,harmonica:72};
const names={singing:'Singing',piano:'Piano',guitar:'Guitar',bass:'Bass',sax:'Saxophone',harmonica:'Harmonica',drums:'Drums'};
const coaching={singing:'Sing one note at a time in a comfortable range. Use Demo for a piano reference, then match the written melody with your voice. Choose a lower starting range if needed. Pitch centering is displayed; tone quality and breath support are not graded.',piano:'Use a relaxed hand and release between repeated notes. Learn waits for the correct key; timing modes keep the pulse.',guitar:'Standard E–A–D–G–B–E tuning. Follow string/fret positions and alternate your picking fingers or pick direction. Mute idle strings.',bass:'Standard E–A–D–G tuning. Alternate plucking fingers and mute strings you are not playing. Aim for an even attack.',sax:'Read written pitches; choose your sax type above the staff. Breathe at phrase boundaries and aim for a steady tone. The microphone judges concert pitch.',harmonica:'Use a C Richter diatonic harmonica, holes 4–7. Follow blow/draw directions. These scores need no bends or overblows.'};
function notes(pattern,base=60,unit=1){let beat=0;return pattern.flatMap(step=>{const [pitch,len]=Array.isArray(step)?step:[step,unit];const at=beat;beat+=len;return pitch===null?[]:[{written:base+pitch,beat:at,duration:len*.8,notationDuration:len}];});}
const major=[0,2,4,5,7,9,11,12];
const down=a=>[...a,...a.slice(0,-1).reverse()];
const primers=[
 ['One note, steady pulse',[0,0,0,0,0,0,0,0],'pulse,quarter notes','Count one-two-three-four aloud before beginning.'],
 ['Two neighboring notes',[0,2,0,2,2,0,2,0],'seconds,ear training','Keep both notes equally clear.'],
 ['Three-note conversation',[0,2,4,2,0,0,2,4,4,2,0],'three notes,phrase','Hear the rise and fall before you play.'],
 ['Five-note ladder',down([0,2,4,5,7]),'five notes,scale','Keep a relaxed movement between adjacent notes.'],
 ['Long notes',[[0,4],[2,4],[4,4],[2,4],[0,4]],'whole notes,breath','Count all four beats; hold grading is not yet automatic.'],
 ['Half-note balance',[[0,2],[2,2],[4,2],[5,2],[7,2],[4,2],[2,2],[0,2]],'half notes,duration','Count two beats for each note.'],
 ['Quarter-note march',[0,2,4,5,7,5,4,2,0,0,0,0],'quarter notes,pulse','Keep a walking pace.'],
 ['Eighth-note pairs',[[0,.5],[0,.5],[2,1],[4,.5],[4,.5],[2,1],[0,2]],'eighth notes,subdivision','Count one-and, two-and.'],
 ['Silence is music',[[0,1],[null,1],[2,1],[null,1],[4,1],[null,1],[0,2]],'rests,listening','Leave the written gaps silent. Rest silence is self-assessed.'],
 ['Repeated-note release',[0,0,0,2,2,2,4,4,4,2,0],'repeated notes,articulation','Release fully between attacks.'],
 ['Skip a step',[0,4,2,5,4,7,5,9,7,4,2,0],'thirds,intervals','Listen for the space between the notes.'],
 ['Tonic and fifth',[0,7,0,7,4,7,4,0],'fifths,tonic','Sing each target before playing.'],
 ['Octave landmark',[0,12,0,12,7,12,7,0],'octave,range','Maintain the same relaxed tone at both ends.'],
 ['The major scale',down(major),'major scale,diatonic','Read each pitch and work slowly through the turn.'],
 ['Dotted rhythm',[[0,1.5],[2,.5],[4,1.5],[5,.5],[7,2],[4,2],[2,1.5],[0,.5],[0,2]],'dotted notes,rhythm','Count subdivisions through the long note.'],
 ['First complete phrase',[0,2,4,7,5,4,2,0,2,5,7,9,7,4,2,[0,2]],'phrase,review','Take one phrase at a time, then connect the whole line.']
];
const lessons=[
 ['Scale in thirds',[0,4,2,5,4,7,5,9,7,11,9,12,11,7,4,0],'thirds,scale'],
 ['Three-note sequences',[0,2,4,2,4,5,4,5,7,5,7,9,7,9,11,9,11,12],'sequence,reading'],
 ['Four-note sequences',[0,2,4,5,2,4,5,7,4,5,7,9,5,7,9,11,7,9,11,12],'sequence,scale'],
 ['Major triad',down([0,4,7,12]),'triad,arpeggio'],
 ['Minor-color ear training',[9,12,9,5,9,5,2,5,2,0,4,7],'minor,ear training'],
 ['Major pentatonic',down([0,2,4,7,9,12]),'pentatonic,improvisation'],
 ['Offbeat entrances',[[null,.5],[0,.5],[2,1],[null,.5],[4,.5],[5,1],[null,.5],[7,.5],[4,1],[2,1],[0,2]],'syncopation,rests'],
 ['Waltz phrases',[[0,2],[4,1],[7,2],[5,1],[4,2],[2,1],[0,3]],'waltz,3/4']
];
const etudes=[
 ['Morning steps',[0,2,4,5,7,4,5,2,4,0,2,5,7,9,7,4,2,0],'stepwise,phrase'],
 ['Little arches',[0,4,7,4,2,5,9,5,4,7,12,7,5,9,12,9,7,4,2,0],'arpeggio,coordination'],
 ['Skipping stones',[0,4,2,5,4,7,5,9,7,11,9,12,7,4,0],'thirds,position'],
 ['Echo walk',[0,2,4,0,2,4,2,4,5,2,4,5,4,5,7,4,5,7,0],'memory,reading'],
 ['Quiet spaces',[[0,1],[null,1],[4,.5],[5,.5],[7,1],[null,1],[9,1],[7,1],[4,2],[null,1],[2,1],[0,2]],'rests,eighth notes'],
 ['The turning path',[12,11,9,7,5,4,2,0,2,5,4,7,5,9,7,12,9,5,2,0],'range,scale'],
 ['Three-beat dance',[0,4,7,2,5,9,4,7,12,5,9,12,7,4,2,[0,3]],'3/4,arpeggio'],
 ['First recital',[0,2,4,7,9,7,4,2,0,4,7,12,11,9,7,5,4,2,0,2,5,9,7,5,4,2,[0,4]],'recital,review']
];
const songs=[
 {id:'twinkle',title:'Twinkle, Twinkle, Little Star',composer:'Traditional French melody',pattern:[0,0,7,7,9,9,[7,2],5,5,4,4,2,2,[0,2],7,7,5,5,4,4,[2,2],7,7,5,5,4,4,[2,2],0,0,7,7,9,9,[7,2],5,5,4,4,2,2,[0,2]],source:'https://www.loc.gov/resource/music.mussm-sm1879-02893/'},
 {id:'mary',title:'Mary Had a Little Lamb',composer:'Traditional / Lowell Mason',pattern:[4,2,0,2,4,4,[4,2],2,2,[2,2],4,7,[7,2],4,2,0,2,4,4,4,4,2,2,4,2,[0,4]],source:'https://en.wikisource.org/wiki/Mary_Had_a_Little_Lamb'},
 {id:'frere',title:'Frère Jacques',composer:'Traditional French',pattern:[0,2,4,0,0,2,4,0,4,5,[7,2],4,5,[7,2],[7,.5],[9,.5],[7,.5],[5,.5],4,0,[7,.5],[9,.5],[7,.5],[5,.5],4,0,0,7,[0,2],0,7,[0,2]],source:'https://www.loc.gov/item/jukebox-18041/'},
 {id:'ode',title:'Ode to Joy — theme',composer:'Ludwig van Beethoven',pattern:[4,4,5,7,7,5,4,2,0,0,2,4,[4,1.5],[2,.5],[2,2],4,4,5,7,7,5,4,2,0,0,2,4,[2,1.5],[0,.5],[0,2]],source:'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528'},
 {id:'hot-cross',title:'Hot Cross Buns',composer:'Traditional English',pattern:[[4,1],[2,1],[0,2],[4,1],[2,1],[0,2],[0,.5],[0,.5],[0,.5],[0,.5],[2,.5],[2,.5],[2,.5],[2,.5],4,2,[0,2]],source:'https://en.wikisource.org/wiki/The_Nursery_Rhymes_of_England'},
 {id:'london',title:'London Bridge',composer:'Traditional English',pattern:[[7,1.5],[9,.5],7,5,4,5,[7,2],2,4,[5,2],4,5,[7,2],[7,1.5],[9,.5],7,5,4,5,[7,2],[2,2],[7,2],4,0,[0,2]],source:'https://en.wikisource.org/wiki/The_Nursery_Rhymes_of_England'},
 {id:'row',title:'Row, Row, Row Your Boat',composer:'Traditional',meter:'6/8',pattern:[[0,1.5],[0,1.5],[0,1],[2,.5],[4,1.5],[4,1],[2,.5],[4,1],[5,.5],[7,3],[12,.5],[12,.5],[12,.5],[7,.5],[7,.5],[7,.5],[4,.5],[4,.5],[4,.5],[0,.5],[0,.5],[0,.5],[7,1],[5,.5],[4,1],[2,.5],[0,3]],source:'https://en.wikisource.org/wiki/Row,_Row,_Row_Your_Boat'},
 {id:'au-clair',title:'Au clair de la lune',composer:'Traditional French',pattern:[0,0,0,2,[4,2],[2,2],0,4,2,2,[0,4],0,0,0,2,[4,2],[2,2],0,4,2,2,[0,4],2,2,2,2,[9,2],[9,2],7,5,4,2,[0,4]],source:'https://www.loc.gov/item/jukebox-18041/'}
];
const jazz=[
 ['Major chord-tone conversation',[0,4,7,9,7,4,2,0,4,7,11,12,11,7,4,0],'major seventh,chord tones'],
 ['Dorian stepping stones',[2,4,5,7,9,11,12,11,9,7,5,4,2],'dorian,modal'],
 ['ii–V–I roots and thirds',[2,5,9,5,7,11,2,5,0,4,7,11,12,7,4,0],'ii V I,harmony'],
 ['Swing subdivision study',[[0,2/3],[4,1/3],[7,2/3],[9,1/3],[7,2/3],[4,1/3],[2,2/3],[0,1/3],[4,2/3],[7,1/3],[11,2/3],[12,1/3],[7,1],[0,1]],'swing,triplet subdivision'],
 ['Bossa offbeat study',[[0,.5],[null,.5],[4,.5],[7,1],[null,.5],[9,1],[7,.5],[null,.5],[4,1],[2,.5],[0,1.5]],'bossa,syncopation'],
 ['Walking chord tones',[0,4,7,9,5,9,12,9,7,11,9,5,0,4,2,0],'walking bass,quarter notes']
];
export function buildCatalog(){const rows=[];let order=0;const add=(instrument,id,title,kind,pattern,extra={})=>{rows.push({id:instrument+'-'+id,title,composer:'MusicTeacher original',instrument,kind,level:kind==='primer'?1:kind==='jazz-study'?3:2,description:coaching[instrument]||'Follow the rhythm lanes. MIDI judges drum voice; acoustic input checks timing only.',tags:[],bpm:70,meter:'4/4',tonality:instrument==='bass'?'C major':'C major',rights:'Original teaching material · GPL-3.0-only',source_url:'',source_name:'MusicTeacher original curriculum',playable:true,score:{notes:notes(pattern,bases[instrument]||0),beat:1},sort_order:order++,origin:'curated',...extra});};
 for(const instrument of instruments){primers.forEach(([title,p,tags,tip],i)=>add(instrument,'primer-'+(i+1),String(i+1).padStart(2,'0')+' · '+title,'primer',p,{description:tip+' '+coaching[instrument],tags:tags.split(','),level:i<8?1:2}));lessons.forEach(([t,p,tags],i)=>add(instrument,'lesson-'+i,t,'lesson',p,{tags:tags.split(','),meter:tags.includes('3/4')?'3/4':'4/4'}));etudes.forEach(([t,p,tags],i)=>add(instrument,'etude-'+i,'Étude '+(i+1)+' · '+t,'etude',p,{tags:tags.split(','),level:i<4?2:3,meter:tags.includes('3/4')?'3/4':'4/4'}));songs.forEach(s=>add(instrument,s.id,s.title,'song',s.pattern,{composer:s.composer,source_url:s.source,source_name:'Historical melody reference; new single-line teaching reduction',rights:'Public-domain melody; new teaching reduction · GPL-3.0-only',description:'Simplified single-line melody in a beginner range; not a full score or commercial arrangement. '+coaching[instrument],tags:['traditional','beginner melody'],meter:s.meter||'4/4'}));jazz.forEach(([t,p,tags],i)=>add(instrument,'jazz-'+i,t,'jazz-study',p,{tags:tags.split(','),description:'Original exercise, not a transcription of a Real Book tune. '+coaching[instrument]}));}
 const drum=(id,title,kind,events,extra={})=>add('drums',id,title,kind,[],{tonality:'Unpitched',tags:['rhythm'],score:{notes:events.map(([beat,written])=>({beat,written,duration:.18})),beat:1},...extra});
 const line=(voice,step=1,bars=4,start=0)=>Array.from({length:Math.ceil((bars*4-start)/step)},(_,i)=>[start+i*step,voice]);
 const patterns=[['Kick pulse',line(36)],['Snare pulse',line(38)],['Closed hi-hat quarters',line(42)],['Hi-hat eighth notes',line(42,.5)],['Hands alternate on snare',line(38,.5)],['Backbeat on two and four',line(38,2,4,1)],['Kick and backbeat',[...line(36,2),...line(38,2,4,1)]],['Four on the floor',[...line(36),...line(42,.5)]],['Basic rock beat',[...line(36,2),...line(38,2,4,1),...line(42,.5)]],['Clap backbeat',[...line(39,2,4,1),...line(42,.5),...line(36,2)]],['Open-hat endings',[...line(36,2),...line(38,2,4,1),...line(42,.5).filter(([b])=>b%4!==3.5),...line(46,4,4,3.5)]],['Crash on the one',[...line(49,4),...line(36,2),...line(38,2,4,1)]]];
 patterns.forEach(([t,p],i)=>drum('primer-'+i,String(i+1).padStart(2,'0')+' · '+t,'primer',p,{level:i<6?1:2}));
 for(let i=0;i<8;i++){let ev=[];for(let bar=0;bar<4;bar++){ev.push(...line(42,.5,1).map(([b,n])=>[b+bar*4,n]),[bar*4,36],[bar*4+2,36],[bar*4+1,38]);const fill=[38,38,45,50,45,38,50,49];for(let j=0;j<4;j++)ev.push([bar*4+3+j*.25,fill[(i+j)%8]]);}drum('fill-'+i,'Fill study '+(i+1)+' · '+['Snare to toms','Descending toms','Around the kit','Return to crash','Low-tom answer','High-tom answer','Four-hit turn','Mixed voices'][i],'etude',ev,{level:3,tags:['fills','sixteenth notes']});}
 for(let i=0;i<8;i++){const ev=[...line(42,i%2?.5:1,8),...line(38,2,8,1),...line(36,2,8),...line(36,4,8,[.5,1.5,2.5,3.5][i%4])];drum('groove-'+i,'Groove '+(i+1)+' · '+['Offbeat kick','Early pickup','Late pickup','Turnaround','Half-time feel','Steady rock','Pop pocket','Dance pulse'][i],'lesson',ev,{level:2,tags:['groove','coordination']});}
 for(let i=0;i<4;i++)drum('jazz-'+i,['Swing ride timing','Jazz kick pulse','Brush-style snare timing','Triplet fill'][i],'jazz-study',Array.from({length:24},(_,n)=>[i===3?n/3:Math.floor(n/2)+(n%2?2/3:0),i===1?36:i===2?38:i===3?[38,45,50][n%3]:42]),{level:3,tags:['swing','triplets'],description:'Original timing study. Use the mapped hi-hat voice as the timekeeping lane; a full ride/brush kit is not yet included.'});
 const realTitles=['All of Me','All the Things You Are','Autumn Leaves','Blue Bossa','Blue Monk','Body and Soul','Black Orpheus','Beautiful Love','Footprints','So What','Solar','Satin Doll','Misty','My Funny Valentine','There Will Never Be Another You','Take the A Train','Watermelon Man','Maiden Voyage','Impressions','Doxy','All Blues','C Jam Blues','Tune Up','Stella by Starlight','On Green Dolphin Street','How High the Moon','Have You Met Miss Jones?','There Is No Greater Love','Song for My Father','Recorda Me'];
 for(const instrument of [...instruments,'drums'])for(const [i,title] of realTitles.entries())add(instrument,'real-book-'+i,title,'tune-index',[],{composer:'See licensed edition',level:3,playable:false,score:null,tags:['jazz standard','Real Book','reference'],source_url:'https://www.halleonard.com/product/240221/the-real-book-volume-i-sixth-edition',source_name:'Real Book / jazz-standard reference; edition membership varies',rights:'Reference only. No melody, lyrics or chord chart included.',description:'Use a licensed chart or import a file you are entitled to use. Try the original jazz studies for playable preparation. Transpose or adapt your imported part for '+names[instrument]+'.'});
 for(const instrument of [...instruments,'drums'])for(const lesson of harmonyLessons(instrument))add(instrument,lesson.id.slice(instrument.length+1),lesson.title,'lesson',[],{description:lesson.description,tags:lesson.tags,bpm:lesson.bpm,level:lesson.level,tonality:lesson.tonality,meter:lesson.meter,score:{notes:lesson.notes,beat:lesson.beat}});
 for(const lesson of guitarChordLessons())add('guitar',lesson.id.slice(7),lesson.title,'lesson',[],{description:lesson.description,tags:lesson.tags,bpm:lesson.bpm,level:lesson.level,tonality:lesson.tonality,meter:lesson.meter,score:{notes:lesson.notes,beat:lesson.beat}});
 for(const row of rows)if(row.score)row.score.notes.sort((a,b)=>a.beat-b.beat||a.written-b.written);
 return rows;
}
