import * as db from './db.js';
import {fullDate} from './model.js';
import {changeTimer,remaining} from './timer.js';
import {h,button,link,cat,icon,group,field,input,muted} from './ui.js';
import {home,assignments,assignment,editAssignment} from './assignments.js';
import {pomodoro,reviewTimer,history} from './pomodoro.js';
import {settings,importBackup} from './settings.js';

const main=document.getElementById('main');
const nav=document.getElementById('nav');
const errorBox=document.getElementById('error');
const noticeBox=document.getElementById('notice');
const topbar=document.getElementById('topbar');
const storage=document.getElementById('storage-indicator');
const pages=[
  ['home','Home','home'],['assignments','Assignments','book'],['pomodoro','Pomodoro','timer'],
  ['history','History','chart'],['settings','Settings','settings']
];
let current, offlineReady=false, persistent='unknown', failed=false, noticeId, busyTimer=false;
let queued=Promise.resolve();
let externalPending=false;

export const ctx={
  get data(){ return current; },
  get profile(){ return current.settings[0]; },
  get persistent(){ return persistent; },
  get offlineReady(){ return offlineReady; },
  preset:null,
  get route(){ return location.hash.slice(1).split('/'); },
  go(route){
    if (location.hash==='#'+route) render();
    else location.hash=route;
  },
  render,
  toast(message){
    noticeBox.textContent=message;
    noticeBox.hidden=false;
    clearTimeout(noticeId);
    noticeId=setTimeout(()=>{noticeBox.hidden=true;},4500);
  },
  error(error){
    failed=true;
    errorBox.replaceChildren(h('span',{},'Save or storage error. '+error.message),
      button('Dismiss',()=>{errorBox.hidden=true;},'quiet'));
    errorBox.hidden=false;
    updateStatus();
  },
  async refresh(){ current=await db.snapshot(); updateStatus(); },
  write(apply,{renderPage=true,report=true}={}){
    return enqueue(async()=>{
      try {
        const result=await db.mutate(apply);
        failed=false;
        errorBox.hidden=true;
        await ctx.refresh();
        applyTheme();
        if(renderPage) render();
        return result;
      } catch (error) {
        if (report) ctx.error(error);
        throw error;
      }
    });
  },
  replace(operation){
    return enqueue(async()=>{
      try {
        await operation();
        failed=false;
        errorBox.hidden=true;
        await ctx.refresh();
        render();
      } catch(error){ ctx.error(error); throw error; }
    });
  },
  action(apply,options){ return ctx.write(apply,options).catch(()=>{}); }
};
function enqueue(work){
  const next=queued.then(work);
  queued=next.catch(()=>{});
  return next;
}
function updateStatus(){
  const status=document.getElementById('save-status');
  if(status && current) status.textContent=failed?'An error occurred during the last write.'
    : ctx.profile.lastSaved ? 'Saved '+new Date(ctx.profile.lastSaved).toLocaleString() : 'No changes saved yet.';
  storage.replaceChildren(h('span',{class:'status-dot'},''),h('span',{},failed?'Check local storage':offlineReady?'Ready offline':'Local workspace'));
}
function applyTheme(){
  if(!current) return;
  const p=ctx.profile;
  const hour=new Date().getHours();
  const dark=p.night==='on' || (p.night==='auto' && ((hour-p.nightHour+24)%24)<((7-p.nightHour+24)%24 || 24));
  const root=document.documentElement;
  if(root.dataset.theme===p.theme && root.dataset.night===(dark?'yes':'no')) return;
  root.dataset.theme=p.theme;
  document.documentElement.dataset.night=dark?'yes':'no';
  document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}
function activeNav(route){
  const key=route==='assignment'?'assignments':route;
  nav.replaceChildren(h('span',{class:'nav-caption'},'WORKSPACE'),...pages.map(([id,label,symbol])=>
    h('a',{class:'nav-link '+(id==='history'?'desktop-only':''),href:'#'+id,'aria-current':key===id?'page':null},icon(symbol),h('span',{},label))));
}
function welcome(){
  const name=input({id:'welcome-name',required:true,maxlength:60,autocomplete:'given-name',
    placeholder:'Your first name or nickname','aria-describedby':'welcome-error','enterkeyhint':'go'});
  const error=h('p',{id:'welcome-error',class:'form-error',role:'alert',hidden:true});
  const caption=h('span',{},'Let’s get started');
  const start=h('button',{type:'submit',class:'button primary',style:'touch-action:manipulation',onclick:event=>{
    event.preventDefault();
    void save();
  }},icon('arrow'),caption);
  const form=h('form',{class:'stack',novalidate:true,onsubmit:event=>{
    event.preventDefault();
    void save();
  }},field('What’s your name?',name),start,error);

  function showError(message){
    error.textContent=message;
    error.hidden=false;
  }
  async function save(){
    if(start.disabled) return;
    const value=name.value.trim();
    if(!value || value.length>60){
      name.setAttribute('aria-invalid','true');
      showError('Enter a first name or nickname (1–60 characters).');
      name.focus();
      return;
    }
    start.disabled=true;
    caption.textContent='Saving…';
    error.hidden=true;
    try {
      await ctx.write(tx=>{ if(!tx.profile.username) tx.profile.username=value; },{renderPage:false,report:false});
      ctx.go('home');
    }catch(saveError){
      showError('Could not save your name. '+saveError.message);
    }finally{
      start.disabled=false;
      caption.textContent='Let’s get started';
    }
  }
  name.addEventListener('input',()=>{
    name.removeAttribute('aria-invalid');
    error.hidden=true;
  });
  return h('section',{class:'welcome panel'},h('div',{},h('span',{class:'eyebrow'},'YOUR PERSONAL STUDY STUDIO'),
    h('h1',{},'Welcome!'),muted('A cosy place to plan your assignments, write, and find your focus.'),form,
    button('Restore a backup',()=>importBackup(ctx),'quiet')),h('div',{class:'welcome-art'},cat()));
}

function render(){
  if(!current) return;
  applyTheme();
  const [route,id]=ctx.route;
  const signed=!!ctx.profile.username;
  const section=pages.find(p=>p[0]===route)?.[1] || (route==='assignment'?'Assignment':'Home');
  document.body.classList.toggle('onboarding',!signed);
  activeNav(route || 'home');
  topbar.replaceChildren(h('div',{class:'breadcrumb'},h('a',{href:'#home'},'Study studio'),h('span',{},'/'),h('strong',{},section)),
    h('div',{class:'top-actions'},h('span',{class:'top-date'},icon('calendar'),fullDate()),
      signed && h('a',{href:'#settings',class:'button icon-button quiet mobile-only','aria-label':'Settings'},icon('settings')),
      signed && route!=='settings' && button('New assignment',()=>editAssignment(ctx),'primary top-add','plus')));
  if(!signed) main.replaceChildren(welcome());
  else if(route==='assignment') main.replaceChildren(assignment(ctx,id));
  else if(route==='assignments') main.replaceChildren(assignments(ctx,id==='archived'));
  else if(route==='pomodoro') main.replaceChildren(pomodoro(ctx));
  else if(route==='history') main.replaceChildren(history(ctx));
  else if(route==='settings') main.replaceChildren(settings(ctx));
  else main.replaceChildren(home(ctx));
  updateStatus();
  if(route==='settings' && id==='data') document.getElementById('data-settings')?.scrollIntoView();
  tick();
}
function tick(){
  applyTheme();
  if(!current || busyTimer) return;
  const timer=ctx.profile.timer;
  if(!timer) return;
  const display=document.getElementById('timer-display');
  if(display) display.updateClock(timer);
  if(timer.status==='review'){
    if(ctx.route[0]==='pomodoro' && !document.querySelector('dialog[open]')) reviewTimer(ctx);
    return;
  }
  if(timer.status!=='running' || remaining(timer)>0) return;
  busyTimer=true;
  ctx.action(tx=>{
    if(tx.profile.timer?.id!==timer.id) return;
    const updated=changeTimer(tx.profile.timer,'tick');
    tx.profile.timer=updated.kind!=='work' && updated.status==='review'?null:updated;
  }).then(()=>{
    if(!ctx.profile.timer && timer.kind!=='work') ctx.toast('Your break is complete.');
  }).finally(()=>{busyTimer=false;});
}
addEventListener('hashchange',()=>{
  for(const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  window.scrollTo(0,0);
  render();
  main.focus({preventScroll:true});
});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault(); main.focus();});
function canSyncExternal(){
  return current && !document.hidden && !document.querySelector('dialog[open]')
    && !(main.contains(document.activeElement) && document.activeElement.matches('input,textarea,select'));
}
function syncExternal(){
  if(!canSyncExternal()){
    externalPending=true;
    return;
  }
  externalPending=false;
  enqueue(async()=>{
    // Returning to the app should leave buttons in place when storage is unchanged.
    if(await db.savedAt() === ctx.profile.lastSaved) return;
    const latest=await db.snapshot();
    if(!canSyncExternal()){
      externalPending=true;
      return;
    }
    current=latest;
    render();
  }).catch(ctx.error);
}
document.addEventListener('focusout',()=>{ if(externalPending) setTimeout(syncExternal,0); });
for(const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close',()=>{ if(externalPending) syncExternal(); });
db.onExternalChange(syncExternal);
addEventListener('pageshow',tick);
document.addEventListener('visibilitychange',()=>{if(!document.hidden) {syncExternal(); tick();}});
setInterval(tick,500);

async function offline(){
  if(!('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});
    await navigator.serviceWorker.ready;
    offlineReady=true;
    updateStatus();
    const badge=document.getElementById('offline-status');
    if(badge) badge.textContent='Offline cache ready.';
  }catch(error){
    ctx.toast('Offline cache could not be prepared. Reload from HTTPS to retry.');
    console.error(error);
  }
}
async function start(){
  try {
    await db.openDatabase(()=>ctx.error(new Error('The storage format changed. Reload Chapitre.')));
    await ctx.refresh();
    if(!location.hash) historyReplace();
    render();
    offline();
    if(navigator.storage?.persist){
      try { persistent=await navigator.storage.persist()?'granted':'not granted'; }
      catch { persistent='unavailable'; }
    }else persistent='unavailable';
    const badge=document.getElementById('persist-status');
    if(badge) badge.textContent='Persistent storage: '+persistent+'.';
  }catch(error){
    ctx.error(error);
    main.replaceChildren(h('section',{class:'panel'},h('h1',{},'Storage unavailable'),muted('Your workspace could not be opened. Check the browser’s storage settings and try again.'),button('Reload',()=>location.reload(),'primary')));
  }
}
function historyReplace(){ window.history.replaceState(null,'','#home'); }
start();
