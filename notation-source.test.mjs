import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {zipSync,strToU8} from 'fflate';
import {parseImport} from './library/imports.mjs';
import {validateScore} from './library/validate.mjs';
import {validateNotation} from './library/notation-source.mjs';
import {sourcePosition} from './source-sheet.js';
import {Session} from './engine.js';

const xml=readFileSync(new URL('./tests/fixtures/original-notation.musicxml',import.meta.url),'utf8');

test('MusicXML preserves advanced source notation, part identity and the initial meter',()=>{
  const result=parseImport('score.musicxml',Buffer.from(xml));
  assert.equal(result.meter,'4/4');assert.deepEqual(result.parts.map(p=>p.partId),['P1','P2']);
  for(const mark of ['<staccato/>','<trill-mark/>','<fermata/>','<time-modification>','<pedal','<wedge','<slur','<fingering>','<grace','new-system="yes"','<repeat','<lyric>'])assert(result.notation.xml.includes(mark),mark);
  assert.equal(result.parts[0].score.notes.find(n=>n.written===65).beat,1);
  assert(result.parts[0].score.notes.some(n=>n.beat===1+1/3));
  assert(result.parts[0].score.notes.some(n=>n.beat===5));
  assert(!result.notation.xml.includes('<!DOCTYPE'));
});

test('source score survives compressed import, validation, JSON export and reimport',()=>{
  const mxl=zipSync({'META-INF/container.xml':strToU8('<container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>'),'score.musicxml':strToU8(xml)});
  const preview=parseImport('score.mxl',Buffer.from(mxl));
  const score=validateScore({...preview.parts[0].score,notation:{...preview.notation,partIds:['P1'],transpose:2}});
  const roundtrip=parseImport('export.json',Buffer.from(JSON.stringify({score})));
  assert.deepEqual(roundtrip.notation,score.notation);assert.deepEqual(roundtrip.parts[0].score,score);
});

test('source validation rejects malformed or unsafe XML and inconsistent part choices',()=>{
  const source={format:'musicxml',xml};
  assert.throws(()=>validateNotation({...source,xml:'<score-partwise>'}));
  assert.throws(()=>validateNotation({...source,xml:'<!DOCTYPE x [<!ENTITY ext SYSTEM "file:///secret">]>'+xml}));
  assert.throws(()=>validateNotation({...source,partIds:['missing']}));
  assert.throws(()=>validateNotation({...source,transpose:.5}));
  assert.throws(()=>validateNotation({...source,xml:' '.repeat(8*1024*1024+1)}));
  assert.equal(validateNotation(source).partIds.length,2);
});

test('source playhead keeps exact triplet timing, pickups and system changes',()=>{
  const measures=[{start:0,end:1,system:0,anchors:[{beat:0,x:50},{beat:1,x:80}]},{start:1,end:5,system:0,anchors:[{beat:1,x:100},{beat:1+1/3,x:130},{beat:1+2/3,x:160},{beat:5,x:300}]},{start:5,end:8,system:1,anchors:[{beat:5,x:50},{beat:8,x:200}]}];
  assert.equal(sourcePosition(measures,-4).x,50);
  assert(Math.abs(sourcePosition(measures,1+1/6).x-115)<1e-8);
  assert.equal(sourcePosition(measures,5).system,1);
  assert.equal(sourcePosition(measures,5).x,50);
  assert.equal(sourcePosition(measures,20).x,200);
});

test('count-in is one bar at the chosen tempo, including compound meter; off starts at zero',()=>{
  const notes=[{pitch:60,written:60,beat:0,duration:1}];
  const common=new Session(notes,{bpm:80,meter:'4/4',countIn:true});assert.equal(common.time,-3);assert.equal(common.beat,-4);
  assert.equal(new Session(notes,{bpm:120,meter:'3/4',countIn:true}).time,-1.5);
  assert.equal(new Session(notes,{bpm:60,meter:'6/8',countIn:true}).time,-3);
  const off=new Session(notes,{bpm:80,countIn:false});assert.equal(off.time,0);assert.equal(off.beat,0);
  assert(off.press(60));
});
