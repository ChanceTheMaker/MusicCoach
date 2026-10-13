// Inverse of the notation playhead interpolation, shared by tab and source scores.
export function beatAtX(anchors,x){
  if(!anchors.length)return null;
  if(x<=anchors[0].x)return anchors[0].beat;
  for(let i=1;i<anchors.length;i++)if(x<=anchors[i].x){const a=anchors[i-1],b=anchors[i];return b.x>a.x?a.beat+(b.beat-a.beat)*(x-a.x)/(b.x-a.x):b.beat;}
  return anchors.at(-1).beat;
}
export function nearestBand(bands,y){
  let best=null,distance=Infinity;
  for(const band of bands){const d=Math.max(band.top-y,0,y-band.bottom);if(d<distance){best=band;distance=d;}}
  return best;
}

// Pointer capture keeps a drag alive outside the handle; touch browsing stays native.
export class PlayheadDrag {
  constructor(surface,{handle,hitTest,onStart,onMove,onEnd,onKey,scroll}){
    Object.assign(this,{surface,handle,hitTest,onStart,onMove,onEnd,onKey,scroll});
    surface.addEventListener('pointerdown',e=>{
      if(e.button!==0||this.pointer!==undefined||e.target.closest('button,a,input,select'))return;
      const onHandle=handle?.contains(e.target);
      if(e.pointerType==='touch'&&!onHandle){this.tap={x:e.clientX,y:e.clientY,id:e.pointerId};return;}
      if(hitTest(e.clientX,e.clientY)===null)return;
      e.preventDefault();this.pointer=e.pointerId;this.point={x:e.clientX,y:e.clientY};
      surface.setPointerCapture(e.pointerId);surface.classList.add('scrubbing');this.onStart();handle?.focus({preventScroll:true});this.move();this.edgeScroll();
    });
    surface.addEventListener('pointermove',e=>{if(this.pointer!==e.pointerId)return;e.preventDefault();this.point={x:e.clientX,y:e.clientY};this.move();});
    surface.addEventListener('pointerup',e=>{
      if(this.tap?.id===e.pointerId){const tap=this.tap;this.tap=null;if(Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<8){const beat=hitTest(e.clientX,e.clientY);if(beat!==null){this.onStart();this.onMove(beat);this.onEnd();}}}
      this.end(e);
    });
    surface.addEventListener('pointercancel',e=>{this.tap=null;this.end(e);});
    surface.addEventListener('lostpointercapture',e=>this.end(e));
    handle?.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();this.onStart();this.onKey(e.key,e.shiftKey);this.onEnd();});
  }
  move(){const beat=this.hitTest(this.point.x,this.point.y);if(beat!==null)this.onMove(beat);}
  edgeScroll(){
    if(this.pointer===undefined||!this.scroll)return;
    const r=this.surface.getBoundingClientRect(),y=this.point.y;
    const speed=y<r.top+30?-10:y>r.bottom-30?10:0;
    if(speed){const before=this.surface.scrollTop;this.surface.scrollTop+=speed;if(before!==this.surface.scrollTop)this.move();}
    this.raf=requestAnimationFrame(()=>this.edgeScroll());
  }
  end(e){if(this.pointer!==e.pointerId)return;this.pointer=undefined;cancelAnimationFrame(this.raf);this.surface.classList.remove('scrubbing');if(this.surface.hasPointerCapture(e.pointerId))this.surface.releasePointerCapture(e.pointerId);this.onEnd();}
}
