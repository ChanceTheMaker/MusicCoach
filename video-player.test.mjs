import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeId,validateVideo,videoBeat,videoTime} from './video-model.js';
import {VideoPlayer} from './video-player.js';
import {Session} from './engine.js';
import {validateScore} from './library/validate.mjs';

test('YouTube links normalize safely and video metadata survives score validation',()=>{
  const id='FW4-COwyMCI';
  for(const url of [id,'https://youtu.be/'+id,'https://www.youtube.com/watch?v='+id+'&t=10','https://www.youtube-nocookie.com/embed/'+id])assert.equal(youtubeId(url),id);
  assert.equal(youtubeId('https://youtube.com.evil.example/watch?v='+id),null);assert.equal(youtubeId('javascript:alert(1)'),null);
  const video=validateVideo({url:'https://youtu.be/'+id,offset:2.5,bpm:116});
  assert.deepEqual(validateScore({notes:[{written:40,beat:0,duration:1}],video}).video,video);
  assert.throws(()=>validateVideo({...video,offset:-1}));assert.throws(()=>validateVideo({...video,bpm:0}));
  assert(Math.abs(videoBeat(videoTime(17.25,video),video)-17.25)<1e-9);
});

function fixture(mode='demo'){
  const session=new Session([{written:60,pitch:60,beat:2,duration:1},{written:62,pitch:62,beat:4,duration:1}],{mode,bpm:120,countIn:false});
  const state={seconds:0,status:1,rate:1,plays:0,pauses:0,seeks:[],attempts:0};
  const player={getCurrentTime:()=>state.seconds,getPlayerState:()=>state.status,getPlaybackRate:()=>state.rate,playVideo:()=>state.plays++,pauseVideo:()=>state.pauses++,seekTo:time=>{state.seeks.push(time);state.seconds=time;}};
  const controller=Object.create(VideoPlayer.prototype);
  Object.assign(controller,{video:{youtubeId:'FW4-COwyMCI',offset:0,bpm:120},ready:true,started:true,waiting:false,ignoreUntil:0,player,getSession:()=>session,isRunning:()=>true,onSeek:beat=>{state.attempts++;session.seek(beat*60/session.bpm);},onPause:()=>state.pauses++,updatePosition(){},$:id=>['videoSync','videoEnabled'].includes(id)?{checked:true}:{textContent:''}});
  return {session,state,controller};
}
test('video clock drives notation, holds during buffering, and detects a seek',()=>{
  const {session,state,controller}=fixture();state.seconds=.2;controller.tick(session);assert.equal(session.time,.2);
  state.status=3;state.seconds=.5;controller.tick(session);assert.equal(session.time,.2);
  state.status=1;controller.tick(session);assert.equal(session.time,.5);
  state.seconds=10;controller.tick(session);assert.equal(session.time,10);assert.equal(state.attempts,1);assert(session.partial);
});
test('Wait holds the video at the target note and resumes after a correct note',()=>{
  const {session,state,controller}=fixture('learn');session.time=.8;state.seconds=1.05;controller.tick(session);
  assert.equal(session.beat,2);assert(controller.waiting);assert.equal(state.seeks.at(-1),1);
  controller.tick(session);assert.equal(state.plays,0);
  session.press(60);controller.tick(session);assert(!controller.waiting);assert.equal(state.plays,1);
});
test('transport preparation pauses and seeks the video to the current playhead',()=>{
  const {session,state,controller}=fixture();session.time=1.5;controller.video.offset=3;controller.prepare();
  assert.equal(state.seeks.at(-1),4.5);assert.equal(state.plays,0);assert.equal(controller.started,false);
});
test('seeking resets the attempt and excludes skipped notes from accuracy and maximum score',()=>{
  const {session}=fixture('practice');session.seek(2);assert.equal(session.notes[0].state,'skipped');assert.equal(session.notes[1].state,'pending');assert.equal(session.result.total,1);assert.equal(session.result.maxScore,100);
  session.press(62);assert.equal(session.score,100);session.seek(0);assert.equal(session.score,0);assert.equal(session.partial,false);assert(session.notes.every(n=>n.state==='pending'));
});

test('turning YouTube off removes its clock and readiness dependency',async()=>{const {controller,session,state}=fixture();controller.$=id=>id==='videoEnabled'?{checked:false}:id==='videoSync'?{checked:true}:{textContent:''};controller.ready=false;controller.loading=Promise.resolve(false);assert.equal(controller.active,false);assert.equal(await controller.ensureReady(),true);assert.equal(controller.tick(session),false);controller.seek(5);assert.equal(state.seeks.length,0);});
test('closing the video panel does not call pause',()=>{const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{checked:true,hidden:false,setAttribute(){}});return elements.get(id);};const previous=globalThis.document;globalThis.document={getElementById:element};let pauses=0;try{new VideoPlayer({getSession:()=>null,isRunning:()=>true,onPause:()=>pauses++,onSync(){}});element('videoToggle').onclick();assert.equal(element('videoPanel').hidden,true);assert.equal(pauses,0);}finally{globalThis.document=previous;}});
