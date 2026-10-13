export function youtubeId(value){
  if(typeof value!=='string')return null;
  if(/^[\w-]{11}$/.test(value))return value;
  let url;try{url=new URL(value);}catch{return null;}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
  const host=url.hostname.toLowerCase();let id;
  if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
  else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host))id=url.pathname==='/watch'?url.searchParams.get('v'):/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1];
  return /^[\w-]{11}$/.test(id||'')?id:null;
}
export function validateVideo(value){
  if(!value)return null;
  const id=youtubeId(value.youtubeId||value.url),offset=Number(value.offset??0),bpm=Number(value.bpm??120);
  if(!id)throw Error('Use a valid YouTube video link.');
  if(!Number.isFinite(offset)||offset<0||offset>86400||!Number.isFinite(bpm)||bpm<20||bpm>300)throw Error('Video start must be 0–86,400 seconds and song tempo 20–300 BPM.');
  return {youtubeId:id,offset,bpm};
}
export const videoBeat=(seconds,video)=>Math.max(0,(seconds-video.offset)*video.bpm/60);
export const videoTime=(beat,video)=>Math.max(0,video.offset+beat*60/video.bpm);
