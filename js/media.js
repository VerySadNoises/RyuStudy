import {h,cat} from './ui.js';

const END_GIFS=['IMG_6569.GIF', 'sticker_2BADD146-C5B8-4B32-8483-923837818A80.gif', 'sticker_BB8F344E-6527-42CB-BFD4-B6566750D307.gif'];
const BELL='./assets/sound/EndingBell.mp3';
let player;
let announced;
let playAttempt=0;

function bell(){
  if(!player){
    player=new Audio(BELL);
    player.preload='auto';
  }
  return player;
}

// Start playback inside the tap handler to authorize this element on iOS.
export function prepareBell(){
  const audio=bell();
  const attempt=++playAttempt;
  audio.muted=true;
  const finish=()=>{
    if(attempt!==playAttempt) return;
    audio.pause();
    if(audio.readyState>0) audio.currentTime=0;
    audio.muted=false;
  };
  void audio.play().then(finish,finish);
}

export function playBell(){
  const audio=bell();
  ++playAttempt;
  audio.muted=false;
  if(audio.readyState>0) audio.currentTime=0;
  return audio.play();
}

export function announceCompletion(timer){
  if(announced===timer.id) return;
  announced=timer.id;
  void playBell().catch(()=>{});
}

export function pomodoroArt(timer,finished=false){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return cat();
  const draw=finished ? [...timer.id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0)%END_GIFS.length : 0;
  const gif=finished?END_GIFS[draw]:timer?.kind==='work' && timer.status==='running'?'IMG_'+(timer.focusGif??6566)+'.GIF':null;
  return gif?h('img',{class:'cat',src:'./assets/'+gif,alt:'',width:300,height:300}):cat();
}