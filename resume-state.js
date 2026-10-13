export const resumeDefault=true;
export function restoreTarget(state,requestedInstrument){
 if(!state||state.version!==1)return null;
 if(state.ui?.resumeEnabled===false)return null;
 if(requestedInstrument&&requestedInstrument!==state.instrument)return null;
 if(!['piano','guitar','bass','sax','harmonica','drums','singing'].includes(state.instrument)||typeof state.lessonId!=='string'||!Number.isFinite(state.beat)||state.beat<0)return null;
 return {...state,beat:Math.min(100256,state.beat)};
}
export function storageKey(user){return 'musiccoach.resume.'+(user?.id||'guest');}
