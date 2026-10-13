import test from 'node:test';
import assert from 'node:assert/strict';
import {guitarChords,guitarChordLessons,guitarChordGuide,guitarChordDiagram,guideTarget} from './guitar-chords.js';
import {fingeringFor,legendHTML} from './fingerings.js';
import {tunings} from './instrument-views.js';
import {makeNotes,Session} from './engine.js';
import {buildCatalog} from './library/catalog.mjs';
import {validateScore,instrumentWarnings} from './library/validate.mjs';

test('open chord shapes contain exactly their named chord tones',()=>{
 const pitchClasses={C:[0,4,7],G:[2,7,11],D:[2,6,9],A:[1,4,9],E:[4,8,11],Am:[0,4,9],Em:[4,7,11],Dm:[2,5,9],G7:[2,5,7,11],Fmaj7:[0,4,5,9]};
 for(const [id,shape] of Object.entries(guitarChords)){
  assert.equal(shape.frets.length,6);assert.equal(shape.fingers.length,6);
  const tones=shape.frets.flatMap((fret,i)=>fret<0?[]:[(tunings.guitar[5-i]+fret)%12]);
  assert.deepEqual([...new Set(tones)].sort((a,b)=>a-b),pitchClasses[id]);
  shape.frets.forEach((fret,i)=>assert.ok(fret>0?shape.fingers[i]>=1&&shape.fingers[i]<=4:shape.fingers[i]===0));
 }
});
test('all twelve exercises preserve actual chord strings and omit muted strings',()=>{
 const lessons=guitarChordLessons();assert.equal(lessons.length,12);
 for(const lesson of lessons){
  validateScore({notes:lesson.notes});assert.deepEqual(instrumentWarnings({notes:lesson.notes},'guitar'),[]);
  assert.equal(new Set(lesson.notes.map(n=>n.beat)).size,lesson.notes.length);
  for(const n of makeNotes(lesson)){
   const shape=guitarChords[n.chordShape],{string,fret}=n.position;
   assert.equal(shape.frets[5-string],fret);assert.ok(fret>=0);
   assert.equal(n.written,tunings.guitar[string]+fret);
   const guide=fingeringFor(n,'guitar',lesson,60);
   assert.equal(guide.chordShape,n.chordShape);assert.equal(guide.string,string);
   assert.equal(guide.short,fret?'L'+shape.fingers[5-string]:'open');
  }
 }
});
test('chord diagrams label string direction, muted/open strings, and finger numbers',()=>{
 const svg=guitarChordDiagram('C',4);
 assert.match(svg,/C major chord diagram/);
 assert.match(svg,/E: muted; A: fret 3, finger 3; D: fret 2, finger 2; G: open; B: fret 1, finger 1; e: open/);
 const note=guitarChordLessons()[0].notes[0];
 const html=legendHTML([guitarChordGuide(note)],'guitar',true);
 assert.match(html,/CHORD SHAPE/);assert.match(html,/FRETTING HAND/);
 assert.equal(guitarChordDiagram('__proto__',0),'');assert.equal(guitarChordGuide({chordShape:'__proto__',position:{string:0,fret:0}}),null);
});
test('library entries retain chord metadata, positions and exercise IDs',()=>{
 const catalog=buildCatalog();
 for(const lesson of guitarChordLessons()){
  const item=catalog.find(row=>row.id===lesson.id);
  assert.ok(item);assert.deepEqual(item.score.notes,lesson.notes);assert.ok(item.tags.includes('chord diagrams'));
 }
});
test('demo guides follow the sounding chord rather than jumping ahead at onset',()=>{
 const lesson=guitarChordLessons().find(l=>l.id==='guitar-shape-changes-c-am-fmaj7-g7');
 const session=new Session(makeNotes(lesson),{mode:'demo',bpm:60});
 assert.equal(guideTarget(session).chordShape,'C');
 for(let i=0;i<21;i++)session.advance(.1);
 assert.equal(guideTarget(session).position.string,4); // C shape starts on A string.
 session.time=8.1;session.advance(0);
 assert.equal(guideTarget(session).chordShape,'Am');assert.equal(guideTarget(session).position.string,4);
 session.time=16.1;session.advance(0);
 assert.equal(guideTarget(session).chordShape,'Fmaj7');assert.equal(guideTarget(session).position.string,3);
});
