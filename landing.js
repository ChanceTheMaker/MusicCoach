try{const skin=localStorage.getItem('musicteacher.skin'),mode=localStorage.getItem('musicteacher.appearance');if(['practice','concert','neon'].includes(skin))document.documentElement.dataset.skin=skin;if(['light','dark'].includes(mode))document.documentElement.dataset.appearance=mode;}catch{}

const film=document.getElementById('musicFilm'),filmToggle=document.getElementById('filmToggle');
if(film&&filmToggle){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused=false,userStarted=false,inView=false,loaded=false;
  const syncButton=()=>{const playing=!film.paused;filmToggle.innerHTML='<span aria-hidden="true">'+(playing?'&#10074;&#10074;':'&#9654;')+'</span> '+(playing?'Pause animation':'Play animation');filmToggle.setAttribute('aria-label',playing?'Pause animation':'Play animation');};
  const load=()=>{if(!loaded){loaded=true;film.src=film.dataset.src;film.load();}};
  const play=()=>{load();film.play().catch(syncButton);};
  const update=()=>{if(!document.hidden&&inView&&!userPaused&&(!reducedMotion.matches||userStarted))play();else film.pause();};
  filmToggle.onclick=()=>{if(film.paused){userPaused=false;userStarted=true;play();}else{userPaused=true;film.pause();}};
  film.addEventListener('play',syncButton);film.addEventListener('pause',syncButton);
  film.addEventListener('error',()=>{loaded=false;userPaused=true;filmToggle.textContent='Retry animation';filmToggle.setAttribute('aria-label','Retry animation');});
  reducedMotion.addEventListener('change',()=>{userStarted=false;update();});
  document.addEventListener('visibilitychange',update);
  if('IntersectionObserver' in window){new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;update();},{threshold:.15}).observe(film);}else{inView=true;update();}
  syncButton();
}

// Card guidance is available to pointer and keyboard users; Escape dismisses it.
for (const card of document.querySelectorAll('.instrument-card')) {
  card.addEventListener('pointerenter', () => card.classList.remove('tooltip-dismissed'));
  card.addEventListener('focusin', () => card.classList.remove('tooltip-dismissed'));
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelectorAll('.instrument-card').forEach(card => card.classList.add('tooltip-dismissed'));
});
