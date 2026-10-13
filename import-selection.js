// Keep all sounding parts independently of the written practice part.
export function backingTracks(preview,selected,shift=0){
 if(preview.parts.length===1&&preview.parts[0].score.tracks)return preview.parts[0].score.tracks.map(t=>({...t,notes:t.notes.map(n=>({...n,written:n.written+(t.percussion?0:shift)}))}));
 return preview.parts.map((part,i)=>({id:'part-'+i,name:part.name,program:part.program||0,percussion:!!part.percussion,practice:selected.includes(part),notes:(part.playbackNotes||part.score.notes).map(n=>({written:n.written+(part.percussion?0:shift),beat:n.beat,duration:n.duration,velocity:n.velocity||90}))}));
}
