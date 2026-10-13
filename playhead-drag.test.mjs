import test from 'node:test';
import assert from 'node:assert/strict';
import {beatAtX,nearestBand,PlayheadDrag} from './playhead-drag.js';
import {SourceSheet} from './source-sheet.js';
import {playheadAt,TICKS} from './sheet-model.js';

test('dragging inverts rendered positions across unequal note spacing and bar gaps',()=>{
  const anchors=[{beat:0,x:70},{beat:1/3,x:100},{beat:1,x:130},{beat:4,x:270},{beat:4+1e-8,x:290},{beat:8,x:470}];
  for(const beat of [0,1/6,1/3,.75,3.5,5.25,8]){
    const x=playheadAt(anchors.map(a=>({tick:a.beat*TICKS,x:a.x})),beat);
    assert(Math.abs(beatAtX(anchors,x)-beat)<1e-7);
  }
  assert.equal(beatAtX(anchors,-40),0);assert.equal(beatAtX(anchors,900),8);assert.equal(beatAtX([],2),null);
});

test('source-score dragging chooses the right system and measure despite shared x coordinates',()=>{
  const measures=[{system:0,top:20,height:100,anchors:[{beat:0,x:40},{beat:4,x:200}]},{system:0,top:20,height:100,anchors:[{beat:4,x:220},{beat:8,x:400}]},{system:1,top:180,height:100,anchors:[{beat:8,x:40},{beat:12,x:200}]}];
  const sheet={host:{getBoundingClientRect:()=>({left:30,top:-80})},measures};
  const at=(x,y)=>SourceSheet.prototype.beatAtPoint.call(sheet,x,y);
  assert.equal(at(150,0),2);assert.equal(at(340,0),6);assert.equal(at(150,150),10);
  assert.equal(nearestBand([{top:10,bottom:20},{top:40,bottom:50}],38).top,40);
});

class Surface{
  constructor(){this.events={};this.classList={add(){},remove(){}};}
  addEventListener(name,fn){this.events[name]=fn;}
  setPointerCapture(id){this.capture=id;}
  hasPointerCapture(id){return this.capture===id;}
  releasePointerCapture(){this.capture=null;}
  emit(name,data={}){this.events[name]?.({button:0,pointerId:1,pointerType:'mouse',clientX:50,clientY:30,target:{closest:()=>null},preventDefault(){},stopPropagation(){},...data});}
}

test('pointer capture seeks through a drag and commits once on release or cancellation',()=>{
  const surface=new Surface(),moves=[];let starts=0,ends=0;
  const old=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};
  try{
    new PlayheadDrag(surface,{hitTest:x=>x/10,onStart:()=>starts++,onMove:b=>moves.push(b),onEnd:()=>ends++});
    surface.emit('pointerdown');surface.emit('pointermove',{clientX:90});surface.emit('pointerup');surface.emit('lostpointercapture');
    assert.deepEqual(moves,[5,9]);assert.equal(starts,1);assert.equal(ends,1);assert.equal(surface.capture,null);
    surface.emit('pointerdown');surface.emit('pointercancel');assert.equal(ends,2);
  }finally{globalThis.cancelAnimationFrame=old;}
});

test('touch scrolling does not seek but a tap on the score does',()=>{
  const surface=new Surface(),moves=[];let starts=0,ends=0;
  new PlayheadDrag(surface,{hitTest:x=>x/10,onStart:()=>starts++,onMove:b=>moves.push(b),onEnd:()=>ends++});
  surface.emit('pointerdown',{pointerType:'touch'});surface.emit('pointerup',{pointerType:'touch',clientY:100});assert.equal(starts,0);
  surface.emit('pointerdown',{pointerType:'touch'});surface.emit('pointerup',{pointerType:'touch'});assert.deepEqual(moves,[5]);assert.equal(starts,1);assert.equal(ends,1);
});
