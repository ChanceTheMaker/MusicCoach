import {beatAtX,nearestBand,PlayheadDrag} from './playhead-drag.js';
import {buildSheet,arrangeSystems,playheadAt,TICKS,writtenKey} from './sheet-model.js';
import {SourceSheet} from './source-sheet.js';
import {tabPositions} from './tab-model.js';
import {engraveTab} from './tab-sheet.js';

export class FullSheet {
  constructor(viewport,score,needle,position) {
    Object.assign(this,{viewport,score,needle,position,active:false,revision:0,rows:[],current:-1});
    this.observer=new ResizeObserver(()=>{
      const width=viewport.clientWidth;
      if(this.active&&width>0&&width!==this.width)this.render();
    });
    this.observer.observe(viewport);
    this.visibility=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){const row=this.rows.find(r=>r.element===entry.target);if(row)this.engrave(row);}
    },{root:viewport,rootMargin:'600px 0px'});
  }
  enableSeeking({onStart,onSeek,onEnd}) {
    this.needle.removeAttribute('aria-hidden');this.needle.tabIndex=0;this.needle.setAttribute('role','slider');this.needle.setAttribute('aria-label','Song playhead');this.needle.setAttribute('aria-valuemin','0');this.needle.setAttribute('aria-orientation','horizontal');
    this.seekTo=beat=>{const end=Math.max(...this.session.notes.map(n=>n.beat+n.duration));onSeek(Math.max(0,Math.min(end,beat)));};
    this.drag=new PlayheadDrag(this.viewport,{handle:this.needle,scroll:true,hitTest:(x,y)=>this.beatAtPoint(x,y),onStart:()=>{this.dragging=true;onStart();},onMove:beat=>this.seekTo(beat),onEnd:()=>{onEnd();this.dragging=false;},onKey:(key,shift)=>{const end=Math.max(...this.session.notes.map(n=>n.beat+n.duration));this.seekTo(key==='Home'?0:key==='End'?end:this.session.beat+(key==='ArrowLeft'?-1:1)*(shift?1:.25));}});
  }
  beatAtPoint(x,y){
    if(!this.active||!this.session)return null;
    if(this.sourceRenderer)return this.sourceRenderer.beatAtPoint(x,y);
    const band=nearestBand(this.rows.map(row=>{const r=row.element.getBoundingClientRect();return{top:r.top,bottom:r.bottom,row,left:r.left};}),y);
    if(!band)return null;
    // Heading clicks should not move playback; dragging may extend past the score.
    if(!this.dragging&&y<band.top)return null;
    this.engrave(band.row);
    return beatAtX(band.row.anchors.map(a=>({beat:a.tick/TICKS,x:a.x})),x-band.left);
  }
  setScore(session,lesson,instrument,rangeShift=0) {
    this.session=session;this.lesson=lesson;this.instrument=instrument;
    this.rangeShift=rangeShift;this.practiceFallback=false;
    this.model=buildSheet(session.notes,{instrument,meter:lesson.meter||'4/4',beat:lesson.beat||1});
    this.dirty=true;
    if(this.active)this.render();
  }
  setTabMode(active){if(this.tabMode!==active){this.tabMode=active;this.dirty=true;}}
  setActive(active) {
    this.active=active;this.viewport.hidden=!active;
    if(active&&this.session){if(this.dirty||this.width!==this.viewport.clientWidth)this.render();else{this.current=-1;if(this.sourceRenderer)this.sourceRenderer.currentSystem=null;this.update();}}
  }
  async render() {
    const revision=++this.revision;
    await document.fonts.ready;
    if(revision!==this.revision||!this.active||!this.model)return;
    this.width=this.viewport.clientWidth;this.dirty=false;this.current=-1;
    this.sourceRenderer?.dispose();this.sourceRenderer=null;
    this.visibility.disconnect();this.score.replaceChildren();this.rows=[];
    this.needle.hidden=true;
    if(this.lesson.notation&&!this.practiceFallback&&!this.tabMode){
      const notice=document.createElement('p');notice.className='source-notation-note';notice.textContent='Original score notation · practice follows written order at the selected tempo.';
      const loading=document.createElement('p');loading.className='source-notation-note';loading.textContent='Engraving the original score…';loading.setAttribute('role','status');
      const host=document.createElement('div');host.className='source-sheet';
      this.score.append(notice,loading,host);
      const renderer=new SourceSheet(host,this.viewport,this.needle,this.position);
      try{
        await renderer.render(this.lesson.notation,this.rangeShift);
        if(revision!==this.revision){renderer.dispose();return;}
        loading.remove();this.sourceRenderer=renderer;this.update();
      }catch(error){
        renderer.dispose();if(revision!==this.revision)return;
        console.error('Original notation:',error);host.remove();loading.textContent='This original score could not be displayed. You can still use practice notation.';
        const fallback=document.createElement('button');fallback.textContent='Use practice notation';fallback.onclick=()=>{this.practiceFallback=true;this.render();};loading.append(' ',fallback);
      }
      return;
    }
    const title=document.createElement('h2');title.textContent=this.lesson.title;
    const subtitle=document.createElement('p');
    const clefNote=['guitar','bass'].includes(this.instrument)?' · sounds one octave lower':this.instrument==='sax'?' · written pitch':'';
    subtitle.textContent=`${this.model.numerator}/${this.model.denominator} · ${this.model.totalBars} measures${clefNote}`+(this.model.rounded?' · rhythms rounded to sixteenths':'');
    if(this.tabMode){
      this.tab=tabPositions(this.session.notes,this.instrument,this.lesson.tablature);
      subtitle.textContent=`${this.tab.tuning.length}-string tablature · ${this.model.numerator}/${this.model.denominator} · ${this.model.totalBars} measures · highest string at top`+(this.tab.capo?` · capo ${this.tab.capo}`:'')+' · lines after numbers show sustain; parentheses mean held notes';
      if(this.tab.unmapped.length)subtitle.textContent+=` · ${this.tab.unmapped.length} notes cannot fit this tuning/chord (marked ?)`;
    }
    const heading=document.createElement('header');heading.className='sheet-heading';heading.append(title,subtitle);this.score.append(heading);
    const systems=arrangeSystems(this.model.measures,this.width);
    const height=this.tabMode?125+(this.tab.tuning.length-1)*21:this.instrument==='piano'?300:210;
    for(const [index,measures] of systems.entries()) {
      const element=document.createElement('div');element.className='sheet-system';element.style.height=height+'px';
      element.setAttribute('role','img');element.setAttribute('aria-label',`${this.tabMode?'Tablature · ':''}Measures ${measures[0].index+1}–${Math.ceil(measures.at(-1).end/this.model.barTicks)}`);
      const row={index,measures,element,height,start:measures[0].start,end:measures.at(-1).end,drawn:false,anchors:[]};
      this.rows.push(row);this.score.append(element);this.visibility.observe(element);
    }
    this.needle.hidden=false;this.update();
  }
  engrave(row) {
    if(row.drawn)return;
    if(this.tabMode){engraveTab(row,this.width,this.session,this.tab,this.model);this.visibility.unobserve(row.element);return;}
    const V=globalThis.VexFlow;
    if(!V){this.fail(row,'Sheet notation could not load. Refresh to retry.');return;}
    try {
      const rowWidth=this.width,renderer=new V.Renderer(row.element,V.Renderer.Backends.SVG);
      renderer.resize(rowWidth,row.height);
      const ctx=renderer.getContext();ctx.setFillStyle('#202b38');ctx.setStrokeStyle('#202b38');
      const svg=row.element.querySelector('svg');svg.setAttribute('aria-hidden','true');
      // Scale only unusually dense single measures; normal systems keep a readable staff size.
      const required=row.measures.reduce((sum,m)=>sum+m.minimum,0)+90;
      const scale=Math.min(1,(rowWidth-16)/required),width=(rowWidth-16)/scale;
      ctx.scale(scale,scale);
      const total=row.measures.reduce((sum,m)=>sum+m.minimum,0);
      const available=width-26;let x=18;const previous=new Map(),allFragments=[];
      const anchors=new Map();
      for(const [mi,measure] of row.measures.entries()) {
        const first=mi===0,measureWidth=measure.minimum/total*available;
        const staves=this.model.staves.map((clef,staff)=>{
          const stave=new V.Stave(x,30+staff*110,measureWidth);
          if(first)stave.addClef(clef,'default',['guitar','bass'].includes(this.instrument)?'8vb':undefined);
          if(measure.index===0)stave.addTimeSignature(`${this.model.numerator}/${this.model.denominator}`);
          if(measure.end===this.model.end)stave.setEndBarType(V.Barline.type.END);
          return stave;
        });
        const startX=Math.max(...staves.map(s=>s.getNoteStartX()));
        for(const stave of staves)stave.setNoteStartX(startX).setContext(ctx).draw();
        ctx.setFont('Arial',10);ctx.fillText(String(measure.index+1),x+3,28);
        if(measure.restBars>1)ctx.fillText(`${measure.restBars} bars rest`,startX+5,22);
        if(staves.length>1){new V.StaveConnector(staves[0],staves[1]).setType(first?V.StaveConnector.type.BRACE:V.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();new V.StaveConnector(staves[0],staves[1]).setType(V.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();}
        const formatter=new V.Formatter(),allVoices=[],staffVoices=[];
        measure.parts.forEach((voices,staff)=>{
          const accidentalState=new Map();
          const rendered=voices.map((fragments,voiceIndex)=>{
            const tickables=fragments.map(fragment=>{
              const notes=fragment.group?[...fragment.group.notes].sort((a,b)=>a.written-b.written):[];
              const keys=notes.map(n=>writtenKey(n,this.instrument));
              const staveNote=new V.StaveNote({keys:keys.length?keys.map(k=>k.key):[this.model.staves[staff]==='bass'?'d/3':'b/4'],duration:fragment.duration+(fragment.dots?'d':'')+(keys.length?'':'r'),clef:this.model.staves[staff],autoStem:voices.length===1,stemDirection:voiceIndex%2?-1:1});
              if(fragment.dots)V.Dot.buildAndAttach([staveNote],{all:true});
              keys.forEach((key,i)=>{const expected=accidentalState.get(key.key)||'n';if(key.accidental&&key.accidental!==expected&&!fragment.tieIn)staveNote.addModifier(new V.Accidental(key.accidental),i);accidentalState.set(key.key,key.accidental);});
              staveNote.setStave(staves[staff]);
              allFragments.push({fragment,note:staveNote,staff,measure,notes});
              return staveNote;
            });
            return new V.Voice({numBeats:this.model.numerator,beatValue:this.model.denominator}).addTickables(tickables);
          });
          formatter.joinVoices(rendered);allVoices.push(...rendered);staffVoices.push(rendered);
        });
        formatter.format(allVoices,Math.max(30,staves[0].getNoteEndX()-startX-15),{context:ctx});
        staffVoices.forEach((voices,staff)=>voices.forEach(voice=>{
          const groups=this.model.denominator===8&&this.model.numerator%3===0?[new V.Fraction(3,8)]:[new V.Fraction(1,4)];
          const beams=V.Beam.generateBeams(voice.getTickables(),{groups});
          voice.draw(ctx,staves[staff]);beams.forEach(beam=>beam.setContext(ctx).draw());
        }));
        for(const entry of allFragments.filter(e=>e.measure===measure)) {
          const {fragment,note,notes}=entry;
          const tick=measure.start+fragment.start;
          anchors.set(tick,(note.getNoteHeadBeginX()+5)*scale);
          if(fragment.group) {
            const indexes=notes.map((_,i)=>i),prior=previous.get(fragment.group.id);
            if(fragment.tieIn)new V.StaveTie({firstNote:prior?.note,lastNote:note,firstIndexes:indexes,lastIndexes:indexes}).setContext(ctx).draw();
            previous.set(fragment.group.id,entry);
            const lyric=!fragment.tieIn?notes.find(n=>n.lyric)?.lyric:null;
            if(lyric){ctx.setFont('Arial',12);ctx.fillText(lyric,note.getNoteHeadBeginX()-3,180);}
          }
        }
        anchors.set(measure.end,(x+measureWidth-7)*scale);
        x+=measureWidth;
      }
      for(const {fragment,note,notes} of previous.values())if(fragment.tieOut)new V.StaveTie({firstNote:note,firstIndexes:notes.map((_,i)=>i)}).setContext(ctx).draw();
      row.anchors=[...anchors].map(([tick,x])=>({tick,x})).sort((a,b)=>a.tick-b.tick);
      row.scale=scale;row.drawn=true;this.visibility.unobserve(row.element);
    } catch(error) {console.error('Sheet notation:',error);this.fail(row,'This passage could not be engraved. Switch to Scrolling notes to continue.');}
  }
  fail(row,message) {row.drawn=true;row.element.replaceChildren();const p=document.createElement('p');p.className='sheet-error';p.textContent=message;row.element.append(p);}
  update() {
    if(this.active&&this.session){const end=Math.max(...this.session.notes.map(n=>n.beat+n.duration));this.needle.setAttribute('aria-valuemax',String(end));this.needle.setAttribute('aria-valuenow',String(Math.max(0,this.session.beat)));this.needle.setAttribute('aria-valuetext','Beat '+(Math.max(0,this.session.beat)+1).toFixed(2));}
    if(this.active&&this.sourceRenderer){this.sourceRenderer.update(this.session.beat,!this.dragging);return;}
    if(!this.active||!this.rows.length)return;
    const tick=Math.max(0,this.session.beat*TICKS);
    let index=this.rows.findIndex(row=>tick<row.end);if(index<0)index=this.rows.length-1;
    const row=this.rows[index];this.engrave(row);
    if(!row.anchors.length){this.needle.hidden=true;return;}
    this.needle.hidden=false;
    const x=playheadAt(row.anchors,this.session.beat);
    this.needle.style.transform=`translate(${x}px,${row.element.offsetTop+20*row.scale}px)`;
    this.needle.style.height=(row.height-55)*row.scale+'px';
    this.needle.dataset.beat=this.session.beat.toFixed(3);
    if(index!==this.current) {
      this.current=index;
      // Scroll the sheet only at line changes. Users can browse freely within a line.
      if(!this.dragging)this.viewport.scrollTo({top:index===0?0:Math.max(0,row.element.offsetTop-24),behavior:'instant'});
    }
    const measure=Math.min(this.model.totalBars,Math.floor(tick/this.model.barTicks)+1);
    const label=this.session.beat<0?'Ready · measure 1':`Measure ${measure} of ${this.model.totalBars}`;
    if(this.position.textContent!==label)this.position.textContent=label;
  }
}
