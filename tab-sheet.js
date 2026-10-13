import {noteName} from './engine.js';
import {TICKS} from './sheet-model.js';

const NS='http://www.w3.org/2000/svg';
function add(parent,name,attrs,text){const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;parent.append(node);return node;}

// Fixed tablature systems use exact event times; the needle shares the lesson clock.
export function engraveTab(row,width,session,tab,model){
  const top=49,gap=21,bottom=top+(tab.tuning.length-1)*gap;
  const svg=add(row.element,'svg',{viewBox:`0 0 ${width} ${row.height}`,width,height:row.height,'aria-hidden':'true'});
  const text=(value,x,y,attrs={})=>add(svg,'text',{x,y,fill:'#202b38','font-family':'Arial, sans-serif','font-size':11,...attrs},value);
  text('TAB',12,top+17,{'font-weight':'bold','font-size':12});
  for(const [string,pitch] of tab.tuning.entries())text(noteName(pitch),43,top+string*gap+4,{'text-anchor':'end','font-size':10});
  const total=row.measures.reduce((n,m)=>n+m.minimum,0),available=width-68;
  const anchors=[];let left=52;
  for(const measure of row.measures){
    const span=measure.minimum/total*available,right=left+span;
    const start=measure.start/TICKS,end=measure.end/TICKS;
    const noteLeft=left+15,noteRight=right-13;
    const xAt=beat=>noteLeft+(noteRight-noteLeft)*(beat-start)/(end-start);
    text(String(measure.index+1),left+5,25,{'font-size':10});
    for(let i=0;i<tab.tuning.length;i++)add(svg,'line',{x1:left,y1:top+i*gap,x2:right,y2:top+i*gap,stroke:'#81909f','stroke-width':1});
    for(const x of [left,right])add(svg,'line',{x1:x,y1:top,x2:x,y2:bottom,stroke:'#596878','stroke-width':1});
    if(measure.restBars>1)text(`${measure.restBars} bars rest`,(left+right)/2,bottom+30,{'text-anchor':'middle'});
    else for(let beat=Math.ceil(start);beat<end;beat++)text(String(Math.round((beat-start)*100)/100+1),xAt(beat),bottom+30,{'text-anchor':'middle',fill:'#7c8897','font-size':10});
    const visible=session.notes.filter(n=>n.beat<end&&n.beat+n.duration>start);
    for(const note of visible){
      const p=tab.positions.get(note);if(!p)continue;
      const onset=note.beat>=start,x=xAt(Math.max(start,note.beat)),y=top+p.string*gap;
      if(onset)anchors.push({tick:note.beat*TICKS,x});
      const stop=xAt(Math.min(end,note.beat+note.duration));
      if(stop>x+12)add(svg,'line',{x1:x+9,y1:y+6,x2:stop,y2:y+6,stroke:'#b8c8db','stroke-width':2});
      const label=onset?String(p.fret):`(${p.fret})`;
      const box=Math.max(16,label.length*9+4);
      add(svg,'rect',{x:x-box/2,y:y-9,width:box,height:18,rx:3,fill:'#fff'});
      const el=text(label,x,y+5,{'text-anchor':'middle','font-size':15,'font-weight':onset?'600':'400',fill:onset?'#202b38':'#718096'});
      add(el,'title',{},`${noteName(note.written)}: string ${p.string+1}, fret ${p.fret}${onset?'':' (held)'}`);
    }
    for(const note of visible.filter(n=>!tab.positions.get(n)&&n.beat>=start))text('?',xAt(note.beat),bottom+50,{'text-anchor':'middle',fill:'#9e2638'});
    anchors.push({tick:measure.start,x:noteLeft},{tick:measure.end-1e-7,x:noteRight});
    if(measure===row.measures.at(-1))anchors.push({tick:measure.end,x:noteRight});
    left=right;
  }
  // At a bar boundary use the next measure's first-note position.
  row.anchors=[...new Map(anchors.map(a=>[a.tick,a])).values()].sort((a,b)=>a.tick-b.tick);
  row.scale=1;row.drawn=true;
}
