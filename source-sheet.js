import {beatAtX,nearestBand} from './playhead-drag.js';
let rendererLoading;
function loadRenderer() {
  if(globalThis.opensheetmusicdisplay)return Promise.resolve(globalThis.opensheetmusicdisplay);
  if(!rendererLoading)rendererLoading=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='assets/osmd/opensheetmusicdisplay.min.js';
    script.onload=()=>resolve(globalThis.opensheetmusicdisplay);
    script.onerror=()=>{rendererLoading=null;script.remove();reject(Error('The MusicXML renderer could not load.'));};
    document.head.append(script);
  });
  return rendererLoading;
}

// Kept separate from the simplified practice score: source timing is not quantized.
export function sourcePosition(measures,beat) {
  let low=0,high=measures.length-1;
  while(low<high){const mid=Math.floor((low+high)/2);if(beat<measures[mid].end)high=mid;else low=mid+1;}
  const measure=measures[low],anchors=measure.anchors;
  let x=anchors[0].x;
  if(beat>=anchors.at(-1).beat)x=anchors.at(-1).x;
  else for(let i=1;i<anchors.length;i++)if(beat<=anchors[i].beat){const a=anchors[i-1],b=anchors[i];x=a.x+(b.x-a.x)*Math.max(0,(beat-a.beat)/(b.beat-a.beat));break;}
  return {...measure,x};
}

export class SourceSheet {
  constructor(host,viewport,needle,position){Object.assign(this,{host,viewport,needle,position,measures:[],currentSystem:null,disposed:false});}
  async render(source,shift=0) {
    const library=await loadRenderer();if(this.disposed)return;
    const doc=new DOMParser().parseFromString(source.xml,'application/xml');
    if(doc.querySelector('parsererror'))throw Error('The source MusicXML could not be read.');
    // External graphics/links are not needed for notation and must not trigger remote requests.
    doc.querySelectorAll('image,credit-image,link,script,foreignObject').forEach(node=>node.remove());
    const osmd=this.osmd=new library.OpenSheetMusicDisplay(this.host,{
      autoResize:false,backend:'svg',drawingParameters:'default',disableCursor:true,
      pageFormat:'Endless',newSystemFromXML:true,newSystemFromNewPageInXML:true,
      newPageFromXML:false,drawCredits:true,drawFingerings:true,drawSlurs:true,
      drawLyrics:true,drawMetronomeMarks:true,setWantedStemDirectionByXml:true,
      autoBeam:false,autoGenerateMultipleRestMeasuresFromRestMeasures:false,
      useXMLMeasureNumbers:true,followCursor:false
    });
    osmd.setLogLevel('error');
    await osmd.load(doc);if(this.disposed){osmd.clear();return;}
    for(const part of osmd.Sheet.Instruments)part.Visible=source.partIds.includes(part.IdString);
    const transpose=(source.transpose||0)+shift;
    if(transpose){osmd.TransposeCalculator=new library.TransposeCalculator();osmd.Sheet.Transpose=transpose;}
    Object.assign(osmd.EngravingRules,{CursorIgnoreRepetitions:true,SlurPlacementFromXML:true,ArticulationPlacementFromXML:true,FingeringPositionFromXML:true,TupletsBracketedUseXMLValue:true,TupletsRatioedUseXMLValue:true});
    osmd.Zoom=this.viewport.clientWidth<600?.8:1;
    const textContext=document.createElement('canvas').getContext('2d');
    textContext.font=`${osmd.EngravingRules.SheetTitleHeight*10*osmd.Zoom}px Times New Roman`;
    const titleWidth=textContext.measureText(osmd.Sheet.TitleString||'').width;
    if(titleWidth>this.viewport.clientWidth-40)osmd.EngravingRules.SheetTitleHeight*=Math.max(100,this.viewport.clientWidth-40)/titleWidth;
    osmd.render();
    const scale=osmd.Zoom*10;
    this.host.setAttribute('aria-label','Imported score with original MusicXML notation');
    const systems=new Map();
    for(const measureStaves of osmd.GraphicSheet.MeasureList){
      const staves=measureStaves.filter(m=>m?.ParentStaff?.ParentInstrument?.Visible&&m.ParentMusicSystem);
      if(!staves.length)continue;
      const first=staves[0],sourceMeasure=first.parentSourceMeasure,system=first.ParentMusicSystem;
      if(!systems.has(system))systems.set(system,systems.size);
      const start=sourceMeasure.AbsoluteTimestamp.RealValue*4,end=start+sourceMeasure.Duration.RealValue*4;
      if(!(end>start))continue;
      const staffLines=system.StaffLines;
      const top=Math.min(...staffLines.map(s=>s.PositionAndShape.AbsolutePosition.y+s.TopLineOffset))*scale-18;
      const bottom=Math.max(...staffLines.map(s=>s.PositionAndShape.AbsolutePosition.y+s.BottomLineOffset))*scale+18;
      const position=first.PositionAndShape.AbsolutePosition;
      const anchors=new Map([[start,(position.x+first.beginInstructionsWidth)*scale]]);
      for(const stave of staves)for(const entry of stave.staffEntries){
        const beat=start+entry.relInMeasureTimestamp.RealValue*4;
        const hasRegularNote=entry.graphicalVoiceEntries.some(v=>!v.parentVoiceEntry?.IsGrace);
        if(hasRegularNote)anchors.set(beat,entry.PositionAndShape.AbsolutePosition.x*scale);
      }
      anchors.set(end,(position.x+first.PositionAndShape.Size.width-first.endInstructionsWidth)*scale-3);
      this.measures.push({start,end,system:systems.get(system),top,height:Math.max(45,bottom-top),number:sourceMeasure.getPrintedMeasureNumber(),anchors:[...anchors].map(([beat,x])=>({beat,x})).sort((a,b)=>a.beat-b.beat)});
    }
    if(!this.measures.length)throw Error('No visible measures were found for the selected part.');
    this.host.dataset.measures=String(this.measures.length);
    this.host.dataset.systems=String(systems.size);
  }
  beatAtPoint(x,y){
    const rect=this.host.getBoundingClientRect();x-=rect.left;y-=rect.top;
    const band=nearestBand(this.measures.map(measure=>({top:measure.top,bottom:measure.top+measure.height,measure})),y);
    if(!band)return null;
    const measures=this.measures.filter(m=>m.system===band.measure.system);
    let best=measures[0],distance=Infinity;
    for(const measure of measures){const left=measure.anchors[0].x,right=measure.anchors.at(-1).x,d=Math.max(left-x,0,x-right);if(d<distance){best=measure;distance=d;}}
    return beatAtX(best.anchors,x);
  }
  update(beat,autoScroll=true){
    if(!this.measures.length||this.disposed)return;
    const point=sourcePosition(this.measures,Math.max(0,beat));
    const top=this.host.offsetTop+point.top;
    this.needle.hidden=false;this.needle.style.transform=`translate(${point.x+this.host.offsetLeft}px,${top}px)`;
    this.needle.style.height=point.height+'px';this.needle.dataset.beat=beat.toFixed(3);
    if(point.system!==this.currentSystem){this.currentSystem=point.system;if(autoScroll)this.viewport.scrollTo({top:point.system===0?0:Math.max(0,top-30),behavior:'instant'});}
    const label=beat<0?'Ready · original notation':`Measure ${point.number} · original notation`;
    if(this.position.textContent!==label)this.position.textContent=label;
  }
  dispose(){this.disposed=true;this.osmd?.clear();}
}
