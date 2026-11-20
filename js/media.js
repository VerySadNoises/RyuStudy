import {h,cat} from './ui.js';

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
  if(!audio || document.hidden || announced===timer.id) return;
  announced=timer.id;
  void playBell().catch(()=>{});
}

export function pomodoroArt(timer,finished=false){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return cat();
  const gif=finished?6569:timer?.kind==='work' && timer.status==='running'?(timer.focusGif??6566):null;
  return gif?h('img',{class:'cat',src:'./assets/IMG_'+gif+'.GIF',alt:'',width:300,height:300}):cat();
}