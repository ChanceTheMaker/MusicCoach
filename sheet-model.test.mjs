import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSheet,arrangeSystems,playheadAt,writtenKey} from './sheet-model.js';
import {Session,makeNotes,lessons,profiles} from './engine.js';
import {harmonyLessons} from './harmony-lessons.js';
import {guitarChordLessons} from './guitar-chords.js';
import {drumLessons} from './drums.js';
import {singingLessons} from './singing.js';
import {buildCatalog} from './library/catalog.mjs';

test('chords share a voice; overlapping durations use complete independent voices',()=>{
  const model=buildSheet([{written:60,beat:0,duration:4},{written:64,beat:0,duration:4},{written:67,beat:1,duration:1}],{instrument:'guitar'});
  const voices=model.measures[0].parts[0];assert.equal(voices.length,2);
  assert.equal(voices[0][0].group.notes.length,2);
  for(const voice of voices)assert.equal(voice.reduce((n,f)=>n+f.ticks,0),16);
  assert.equal(voices[1][0].group,undefined);assert.equal(voices[1][1].group.notes[0].written,67);
});

test('sustained notes split across barlines with ties and do not mutate playback',()=>{
  const notes=[{written:48,beat:3,duration:6,notationDuration:6}];
  const original=structuredClone(notes),model=buildSheet(notes);
  assert.deepEqual(notes,original);assert.equal(model.measures.length,3);
  const fragments=model.measures.flatMap(m=>m.parts[1].flat()).filter(f=>f.group);
  assert.equal(fragments.reduce((n,f)=>n+f.ticks,0),24);
  assert.equal(fragments[0].tieIn,false);assert.equal(fragments[0].tieOut,true);
  assert.equal(fragments.at(-1).tieIn,true);assert.equal(fragments.at(-1).tieOut,false);
});

test('piano splits at middle C; bass/guitar show octave clefs and sax uses written pitch',()=>{
  const model=buildSheet([{written:48,beat:0,duration:1},{written:60,beat:0,duration:1}]);
  assert.equal(model.measures[0].parts[0][0][0].group.notes[0].written,60);
  assert.equal(model.measures[0].parts[1][0][0].group.notes[0].written,48);
  assert.equal(writtenKey({written:40},'guitar').key,'e/3');
  assert.equal(writtenKey({written:28},'bass').key,'e/2');
  assert.equal(writtenKey({written:60,pitch:51},'sax').key,'c/4');
  assert.deepEqual(writtenKey({written:61,spelling:{letter:'D',octave:4,accidental:-1}},'sax'),{key:'d/4',accidental:'b'});
});

test('percussion uses staff voices and short hits inherit onset spacing',()=>{
  const model=buildSheet(drumLessons[2].notes,{instrument:'drums',beat:1});
  assert.equal(model.staves[0],'percussion');assert.equal(model.measures[0].parts[0][0][0].ticks,2);
  assert.equal(model.measures[0].parts[0][0][0].group.notes.length,2);
  assert.equal(model.totalBars,4);
  assert.equal(writtenKey({written:42},'drums').key,'g/5/x2');
});

test('compound meter and long empty passages retain their timeline',()=>{
  const model=buildSheet([{written:60,beat:0,duration:1.5},{written:62,beat:300,duration:1.5}],{meter:'6/8'});
  assert.equal(model.barTicks,12);assert.equal(model.totalBars,101);
  assert.equal(model.measures.length,3);assert.equal(model.measures[1].restBars,99);
  assert.equal(model.measures[2].start,1200);
});

test('a complete practice score can be arranged at desktop and phone widths',()=>{
  for(const instrument of Object.keys(profiles)){
    const collection=[...(instrument==='drums'?drumLessons:instrument==='singing'?singingLessons:lessons),...harmonyLessons(instrument),...(instrument==='guitar'?guitarChordLessons():[])];
    for(const lesson of collection){
      const model=buildSheet(makeNotes(lesson,profiles[instrument].base),{instrument,beat:lesson.beat,meter:lesson.meter});
      for(const measure of model.measures)for(const voices of measure.parts)for(const voice of voices)assert.equal(voice.reduce((n,f)=>n+f.ticks,0),model.barTicks,`${instrument} ${lesson.id}`);
      for(const width of [300,1600]){
        const rows=arrangeSystems(model.measures,width);
        assert.equal(rows.flat().length,model.measures.length);assert(rows.every(row=>row.length<=4));
      }
    }
  }
});

test('playhead interpolates along fixed anchors and follows Wait and tempo changes',()=>{
  const anchors=[{tick:0,x:50},{tick:4,x:100},{tick:8,x:160}];
  assert.equal(playheadAt(anchors,-2),50);assert.equal(playheadAt(anchors,.5),75);assert.equal(playheadAt(anchors,20),160);
  const session=new Session([{written:60,pitch:60,beat:0,duration:1},{written:62,pitch:62,beat:1,duration:1}],{mode:'learn',bpm:120});
  for(let i=0;i<30;i++)session.advance(.1);
  assert.equal(playheadAt(anchors,session.beat),50);
  session.press(60);session.advance(.1);assert.equal(playheadAt(anchors,session.beat),60);
  session.bpm=60;assert.equal(playheadAt(anchors,session.beat),55);
});

test('unsupported fine rhythms are flagged and kept out of playback data',()=>{
  const notes=[{written:60,beat:1/3,duration:1/3,notationDuration:1/3}];
  const model=buildSheet(notes);assert.equal(model.rounded,true);assert.equal(notes[0].beat,1/3);
});

test('every playable library score retains every note and fills every measure',()=>{
  for(const entry of buildCatalog().filter(e=>e.score)){
    const model=buildSheet(entry.score.notes,{instrument:entry.instrument,meter:entry.meter,beat:entry.score.beat});
    const indexes=new Set();
    for(const measure of model.measures)for(const voices of measure.parts)for(const voice of voices){
      assert.equal(voice.reduce((n,f)=>n+f.ticks,0),model.barTicks,entry.id);
      for(const fragment of voice)for(const index of fragment.group?.indexes||[])indexes.add(index);
    }
    assert.equal(indexes.size,entry.score.notes.length,entry.id);
  }
});
