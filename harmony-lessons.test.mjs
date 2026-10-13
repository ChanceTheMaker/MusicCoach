import test from 'node:test';
import assert from 'node:assert/strict';
import {harmonyLessons} from './harmony-lessons.js';
import {makeNotes,Session} from './engine.js';
import {fingeringFor} from './fingerings.js';
import {vocalScore} from './singing.js';
import {acousticScore,drumVoice} from './drums.js';
import {buildCatalog} from './library/catalog.mjs';
import {validateScore,instrumentWarnings} from './library/validate.mjs';

const melodic=['piano','guitar','bass','sax','harmonica','singing'];
test('every melodic instrument has four chord and four arpeggio lessons with valid scores',()=>{
 for(const instrument of melodic)for(const source of ['screen','midi','mic']){
  const lessons=harmonyLessons(instrument,source);
  assert.equal(lessons.length,8);
  assert.equal(lessons.filter(l=>l.tags.includes('chords')).length,4);
  assert.equal(lessons.filter(l=>l.tags.includes('arpeggios')).length,4);
  for(const l of lessons){validateScore({notes:l.notes});assert.deepEqual(instrumentWarnings({notes:l.notes},instrument),[]);}
 }
});
test('voicings contain the named chord tones and inversions',()=>{
 const lessons=harmonyLessons('piano');
 const firstChord=l=>l.notes.filter(n=>n.beat===0).map(n=>n.written);
 assert.deepEqual(firstChord(lessons[0]),[60,64,67]);
 assert.deepEqual(firstChord(lessons[1]),[60,64,69]);
 assert.deepEqual(firstChord(lessons[2]),[62,65,67,71]);
 assert.deepEqual(firstChord(lessons[3]),[64,67,72]);
 const progression=lessons[7].notes;
 assert.deepEqual(progression.map(n=>n.written),[60,64,67,60,65,69,62,65,67,71,60,64,67]);
 assert.deepEqual(progression.filter((n,i)=>i===0||n.beat-progression[i-1].beat>1).map(n=>n.beat),[0,4,8,13]);
});
test('only piano with MIDI/onscreen input uses simultaneous chords; all arpeggios are sequential',()=>{
 for(const instrument of melodic)for(const source of ['screen','midi','mic'])for(const lesson of harmonyLessons(instrument,source)){
  const simultaneous=new Set(lesson.notes.map(n=>n.beat)).size<lesson.notes.length;
  assert.equal(simultaneous,instrument==='piano'&&source!=='mic'&&lesson.tags.includes('chords'));
  assert.ok(lesson.notes.every(n=>n.notationDuration===(simultaneous?3:1)));
 }
});
test('new lesson notes have valid string/hole/key guides and fit the FM-1 keyboard',()=>{
 for(const instrument of ['guitar','bass','sax','harmonica'])for(const lesson of harmonyLessons(instrument))for(const n of makeNotes(lesson,60)){
  assert.ok(fingeringFor(n,instrument,lesson,60),instrument+' '+lesson.id+' '+n.written);
  if(instrument==='harmonica')assert.ok(n.written>=72&&n.written<=84);
 }
 for(const l of harmonyLessons('piano'))assert.ok(l.notes.every(n=>n.written>=53&&n.written<=79));
});
test('sax transposition and vocal range changes preserve the curriculum',()=>{
 for(const transpose of [-9,-14,-2,-21])for(const l of harmonyLessons('sax'))assert.ok(makeNotes(l,60,transpose).every(n=>n.pitch===n.written+transpose));
 for(const shift of [-12,-5,0])for(const l of harmonyLessons('singing')){
  const score=vocalScore(makeNotes(l,60),shift);
  assert.ok(score.every(n=>n.written>=48&&n.written<=72&&n.lyric));
  assert.deepEqual(score.map(n=>n.lyric),l.notes.map(n=>n.lyric));
 }
});
test('chords and broken chords can be completed by the practice engine',()=>{
 for(const source of ['screen','mic']){
  const l=harmonyLessons('piano',source)[0],session=new Session(makeNotes(l,60),{bpm:60});
  for(let steps=0;steps<500&&!session.finished;steps++){
   session.advance(.1);
   const next=session.next;
   if(next&&Math.abs(session.beat-next.beat)<.001){const targets=session.notes.filter(n=>n.state==='pending'&&n.beat===next.beat);for(const n of targets){assert.ok(session.press(n.pitch));session.release(n.pitch);}}
  }
  assert.equal(session.finished,true);assert.equal(session.result.accuracy,100);
 }
});
test('drum counterparts use mapped voices and work with acoustic onset collapsing',()=>{
 const [together,sequence]=harmonyLessons('drums');
 assert.ok(together.notes.length>new Set(together.notes.map(n=>n.beat)).size);
 assert.equal(new Set(sequence.notes.map(n=>n.beat)).size,sequence.notes.length);
 for(const l of [together,sequence]){validateScore({notes:l.notes});assert.ok(l.notes.every(n=>drumVoice(n.written)!==null));}
 assert.equal(acousticScore(makeNotes(together)).length,16);
});
test('every new menu lesson has the same stable ID and score in the library',()=>{
 const catalog=buildCatalog();
 for(const instrument of [...melodic,'drums'])for(const lesson of harmonyLessons(instrument)){
  const row=catalog.find(r=>r.id===lesson.id);assert.ok(row);assert.equal(row.origin,'curated');assert.deepEqual(row.score.notes,lesson.notes);
 }
 assert.equal(catalog.filter(r=>r.id.includes('-harmony-')).length,50);
});
