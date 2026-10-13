import {validateVideo,videoBeat,videoTime} from './video-model.js';
let apiPromise;
function loadAPI(){
  if(globalThis.YT?.Player)return Promise.resolve(globalThis.YT);
  if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
    const timeout=setTimeout(()=>{apiPromise=null;reject(Error('YouTube did not load. Check your connection and try again.'));},15000);
    globalThis.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve(globalThis.YT);};
    script.onerror=()=>{clearTimeout(timeout);apiPromise=null;script.remove();reject(Error('YouTube could not load.'));};document.head.append(script);
  });
  return apiPromise;
}

export class VideoPlayer {
  constructor({getSession,isRunning,onPlay,onPause,onSeek,onSave,onSync}){
    Object.assign(this,{getSession,isRunning,onPlay,onPause,onSeek,onSave,onSync,revision:0,ready:false,ignoreUntil:0,waiting:false});
    this.$=id=>document.getElementById(id);const $=this.$;
    $('videoToggle').onclick=()=>{$('videoPanel').hidden=!$('videoPanel').hidden;$('videoToggle').setAttribute('aria-expanded',String(!$('videoPanel').hidden));};
    try{$('videoEnabled').checked=localStorage.getItem('musicteacher.youtubeEnabled')!=='false';$('videoMuted').checked=localStorage.getItem('musicteacher.youtubeMuted')==='true';}catch{}
    $('videoEnabled').onchange=()=>{this.onPause();this.$('videoMount').hidden=!this.enabled;try{localStorage.setItem('musicteacher.youtubeEnabled',String(this.enabled));}catch{}if(this.enabled&&this.video&&!this.player)this.startLoading();this.onSync();};
    $('videoMuted').onchange=()=>{this.applyMute();try{localStorage.setItem('musicteacher.youtubeMuted',String($('videoMuted').checked));}catch{}};
    $('videoSync').onchange=()=>{this.onPause();this.onSync();};
    $('videoSave').onclick=async()=>{
      try{const video=validateVideo({url:$('videoUrl').value,offset:$('videoOffset').value,bpm:$('videoBpm').value});this.onPause();await this.onSave(video);this.setVideo(video,true);$('videoStatus').textContent='Video saved for this song.';}catch(e){$('videoStatus').textContent=e.message;}
    };
    $('videoPosition').oninput=()=>{this.onPause();const beat=Number($('videoPosition').value);this.onSeek(beat);if(this.active)this.seek(beat);this.updatePosition();};
    $('videoRate').onchange=()=>{if(this.ready)this.player.setPlaybackRate(Number($('videoRate').value));};
    $('videoAlign').onclick=async()=>{
      if(!this.ready)return;
      this.onPause();const offset=this.player.getCurrentTime()-this.getSession().beat*60/this.video.bpm;
      if(offset<0){$('videoStatus').textContent='Move the video later, or move the song playhead earlier, then align again.';return;}
      try{const video=validateVideo({...this.video,offset});await this.onSave(video);this.video=video;$('videoOffset').value=offset.toFixed(3);$('videoStatus').textContent='Aligned the current video moment with the song playhead.';}catch(e){$('videoStatus').textContent=e.message;}
    };
  }
  get enabled(){return this.$('videoEnabled').checked;}
  applyMute(){if(this.ready){if(this.$('videoMuted').checked)this.player.mute();else this.player.unMute();}}
  startLoading(){this.loading=this.load(this.revision).catch(e=>{if(this.enabled){this.$('videoStatus').textContent=e.message+' Turn off Use YouTube to play MIDI instead.';this.onPause();}return false;});}
  get active(){return this.enabled&&!!this.video&&this.$('videoSync').checked;}
  get rate(){return this.ready?this.player.getPlaybackRate()||1:1;}
  setSong(lesson){
    if(this.lessonId===lesson.id)return;
    this.lessonId=lesson.id;let video=lesson.video;
    try{video=JSON.parse(localStorage.getItem('musicteacher.video.'+lesson.id)||'null')||video;}catch{}
    this.$('videoBpm').value=video?.bpm||lesson.bpm||this.getSession().bpm;
    this.setVideo(video||null,!!video);
  }
  setVideo(video,show){
    this.revision++;this.player?.destroy();this.player=null;this.ready=false;this.waiting=false;this.started=false;this.video=video;
    const $=this.$;$('videoMount').replaceChildren();$('videoPanel').hidden=!show;$('videoToggle').setAttribute('aria-expanded',String(show));
    $('videoUrl').value=video?'https://www.youtube.com/watch?v='+video.youtubeId:'';$('videoOffset').value=video?.offset||0;
    $('videoControls').hidden=!video;$('videoStatus').textContent=video?'Loading linked YouTube video...':'Paste a YouTube link to add a video to this song.';
    if(video){$('videoBpm').value=video.bpm;$('videoWatch').href='https://www.youtube.com/watch?v='+video.youtubeId;if(this.enabled)this.startLoading();}
    $('videoMount').hidden=!this.enabled;if(video&&!this.enabled)$('videoStatus').textContent='YouTube is off. MIDI playback uses the song tempo.';this.onSync();
  }
  async load(revision){
    const YT=await loadAPI();if(revision!==this.revision)return false;
    const host=document.createElement('div');this.$('videoMount').append(host);
    return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('YouTube player did not become ready. Use Open on YouTube or retry Save video.')),15000);
      this.player=new YT.Player(host,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:this.video.youtubeId,playerVars:{playsinline:1,origin:location.origin,rel:0},events:{
        onReady:()=>{clearTimeout(timer);if(revision!==this.revision){resolve(false);return;}this.ready=true;this.applyMute();this.ignoreUntil=performance.now()+700;this.player.cueVideoById({videoId:this.video.youtubeId,startSeconds:videoTime(this.getSession().beat,this.video)});const rates=this.player.getAvailablePlaybackRates()||[1];this.$('videoRate').replaceChildren(...rates.map(rate=>new Option(rate+'x',rate)));this.$('videoRate').value='1';this.$('videoStatus').textContent='Linked video ready. Play starts both after count-in.';this.onSync();resolve(true);},
        onStateChange:e=>this.state(e.data),
        onPlaybackRateChange:()=>{this.$('videoRate').value=String(this.rate);this.onSync();},
        onError:e=>{clearTimeout(timer);this.ready=false;this.$('videoStatus').textContent='YouTube could not play this video (code '+e.data+'). Open it on YouTube, or choose another video.';if(this.active)this.onPause();resolve(false);},
        onAutoplayBlocked:()=>{this.$('videoStatus').textContent='Press Play inside the video once to enable playback, then use MusicCoach Play.';this.onPause();}
      }});
    });
  }
  refreshRates(){const rates=this.player.getAvailablePlaybackRates();if(!rates?.length)return;const select=this.$('videoRate');if(select.options.length!==rates.length){select.replaceChildren(...rates.map(rate=>new Option(rate+'x',rate)));select.value=String(this.rate);}}
  state(state){
    if(this.ready)this.refreshRates();
    if(!this.active||!this.ready||performance.now()<this.ignoreUntil)return;
    if(state===1&&!this.isRunning()){
      const beat=videoBeat(this.player.getCurrentTime(),this.video);
      if(Math.abs(beat-this.getSession().beat)>.5)this.onSeek(beat);
      this.pause();this.onPlay();
    }else if(state===2&&this.isRunning()&&!this.waiting)this.onPause();
    else if(state===0&&this.isRunning())this.onPause();
  }
  pause(){if(this.ready){this.ignoreUntil=performance.now()+600;this.player.pauseVideo();}this.started=false;this.waiting=false;}
  seek(beat){if(this.active&&this.ready&&this.video){this.ignoreUntil=performance.now()+700;this.player.seekTo(videoTime(beat,this.video),true);this.player.pauseVideo();this.started=false;}}
  prepare(){if(!this.active)return;this.pause();this.seek(this.getSession().beat);}
  pollPaused(){if(this.scrubbing||!this.active||!this.ready||performance.now()<this.ignoreUntil||this.player.getPlayerState()!==2)return;const beat=videoBeat(this.player.getCurrentTime(),this.video);if(Math.abs(beat-this.getSession().beat)>.5)this.onSeek(beat);}
  async ensureReady(){return !this.active||this.ready||await this.loading;}
  tick(session){
    if(!this.active||!this.ready)return false;
    if(this.waiting){if(session.next&&session.next.beat<=session.beat+1e-5)return true;this.waiting=false;this.seek(session.beat);}
    if(!this.started){this.ignoreUntil=performance.now()+600;this.player.playVideo();this.started=true;this.$('videoStatus').textContent='Video and score playback are linked.';return true;}
    if(this.player.getPlayerState()!==1)return true; // Buffering and paused video freeze notation.
    const beat=videoBeat(this.player.getCurrentTime(),this.video),target=beat*60/session.bpm;
    if(Math.abs(target-session.time)>.8){this.onSeek(beat);return true;}
    session.time=target;session.advance(0);
    if(session.mode==='learn'&&session.next&&session.beat>=session.next.beat-1e-5){this.pause();this.waiting=true;this.seek(session.beat);this.$('videoStatus').textContent='Waiting for your note - video and score are held together.';}
    this.updatePosition();return true;
  }
  updatePosition(){const session=this.getSession();if(!session)return;const end=Math.max(session.playbackEnd||0,...session.notes.map(n=>n.beat+n.duration));this.$('videoPosition').max=end;this.$('videoPosition').value=Math.max(0,session.beat);this.$('videoPositionLabel').textContent='Beat '+(Math.max(0,session.beat)+1).toFixed(1);}
}
