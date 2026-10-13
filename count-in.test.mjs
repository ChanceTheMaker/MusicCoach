import test from 'node:test';
import assert from 'node:assert/strict';
import {CountIn} from './count-in.js';
import {Session} from './engine.js';

const session=()=>new Session([{pitch:60,written:60,beat:20,duration:1}],{mode:'practice',bpm:120,countIn:false});
test('resume counts a bar without moving the playhead or grading notes',()=>{
  const song=session(),count=new CountIn();song.time=4.125;
  count.start(120,'4/4');const pulses=[];
  for(let i=0;i<19;i++){count.advance(song,.1,p=>pulses.push(p));assert.equal(song.time,4.125);assert.equal(song.wrong,0);assert.equal(song.notes[0].state,'pending');}
  count.advance(song,.1,p=>pulses.push(p));assert.equal(count.active,false);
  assert.deepEqual(pulses,[0,1,2,3]);assert(Math.abs(song.time-4.125)<1e-9);
  count.advance(song,.1);assert(Math.abs(song.time-4.225)<1e-9);
});
test('pausing during count-in and resuming starts a fresh bar at the same position',()=>{
  const song=session(),count=new CountIn();song.time=5;
  count.start(120);count.advance(song,.1);count.cancel();assert.equal(song.time,5);
  count.start(120);assert.equal(count.count,4);assert.equal(count.remaining,2);
  count.advance(song,.1);assert.equal(song.time,5);
});
test('disabling count-in resumes immediately without resetting the playhead',()=>{
  const song=session(),count=new CountIn();song.time=3;
  count.start(120);count.cancel();count.advance(song,.1);assert.equal(song.time,3.1);
  count.start(120,'4/4',false);count.advance(song,.1);assert.equal(song.time,3.2);
});
test('count-in respects tempo and meter and carries the final partial frame into playback',()=>{
  const song=session(),count=new CountIn();count.start(60,'6/8');
  assert.equal(count.remaining,3);assert.equal(count.count,6);
  count.start(120,'3/4');assert.equal(count.remaining,1.5);
  count.remaining=.025;count.advance(song,.1);assert(Math.abs(song.time-.075)<1e-9);
});
