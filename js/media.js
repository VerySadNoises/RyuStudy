import {h,cat} from './ui.js';

const END_GIFS=['IMG_6569.GIF', 'sticker_2BADD146-C5B8-4B32-8483-923837818A80.gif', 'sticker_BB8F344E-6527-42CB-BFD4-B6566750D307.gif'];
const BELL='./assets/sound/EndingBell.mp3';
let audio, recording, announced;

export function prepareBell(){
  const Context=window.AudioContext || window.webkitAudioContext;
  if(!Context) return;
  try{
    audio ??= new Context();
    if(audio.state!=='running') void audio.resume().catch(()=>{});
    recording ??= fetch(BELL).then(response=>{
      if(!response.ok) throw new Error('Bell unavailable.');
      return response.arrayBuffer();
    }).then(bytes=>audio.decodeAudioData(bytes)).catch(()=>{
      recording=undefined;
      return null;
    });
  }catch{}
}

export async function playBell(){
  if(!audio) throw new Error('Sound is unavailable.');
  if(audio.state!=='running') await audio.resume();
  const buffer=await recording;
  if(!buffer) throw new Error('Bell unavailable.');
  const sound=audio.createBufferSource();
  sound.buffer=buffer;
  sound.connect(audio.destination);
  sound.start();
}

export function announceCompletion(timer){
  if(!audio || announced===timer.id) return;
  announced=timer.id;
  void playBell().catch(()=>{});
}

export function pomodoroArt(timer,finished=false){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return cat();
  const draw=finished ? [...timer.id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0)%END_GIFS.length : 0;
  const gif=finished?END_GIFS[draw]:timer?.kind==='work' && timer.status==='running'?'IMG_'+(timer.focusGif??6566)+'.GIF':null;
  return gif?h('img',{class:'cat',src:'./assets/'+gif,alt:'',width:300,height:300}):cat();
}