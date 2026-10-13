// Transport preparation is independent of song time, so resume never rewinds.
export class CountIn {
  constructor(){this.cancel();}
  cancel(){this.remaining=0;this.lastPulse=-1;}
  get active(){return this.remaining>0;}
  get count(){return this.active?Math.ceil(this.remaining/this.interval):0;}
  start(bpm,meter='4/4',enabled=true){
    this.cancel();
    if(!enabled)return;
    let [beats,unit]=meter.split('/').map(Number);
    if(!(beats>0&&unit>0)){beats=4;unit=4;}
    this.interval=60/bpm*4/unit;
    this.duration=this.remaining=beats*this.interval;
  }
  advance(session,seconds,onPulse=()=>{}){
    let elapsed=Math.max(0,Math.min(seconds,.1));
    if(this.active){
      const pulse=Math.floor((this.duration-this.remaining)/this.interval+1e-8);
      if(pulse!==this.lastPulse){this.lastPulse=pulse;onPulse(pulse);}
      const used=Math.min(elapsed,this.remaining);
      this.remaining=Math.max(0,this.remaining-used);elapsed-=used;
      if(this.remaining<1e-9)this.remaining=0;
      if(this.active)return;
    }
    session.advance(elapsed);
  }
}
