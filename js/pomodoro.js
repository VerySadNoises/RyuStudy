import {blankGoal,clock,localDate,weekStart,number,duration,dateLabel,sum,wordProgress,integer,GOAL_MAX} from './model.js';
import {newTimer,changeTimer,remaining,logSession,focusComplete} from './timer.js';
import {prepareBell,playBell,pomodoroArt} from './media.js';
import {goalEditor,goalList} from './assignments.js';
import {bars,categoryBars,calendar} from './visuals.js';
import {h,button,link,panel,group,muted,tag,subheading,heading,field,input,select,progressBar,checkbox,openDialog,valueGroup,icon} from './ui.js';

const setup={assignmentId:'',categoryId:'',minutes:null};
const options=[15,25,45,60];
const goalFor=(ctx,date)=>ctx.data.goals.find(g=>g.id==='day:'+date) || blankGoal('day:'+date,'day',date);

function transition(ctx,timer,action){
  return ctx.action(tx=>{
    if(tx.profile.timer?.id!==timer.id) throw new Error('The timer changed in another window.');
    const updated=changeTimer(tx.profile.timer,action);
    tx.profile.timer=updated.kind!=='work' && updated.status==='review'?null:updated;
  });
}
export function pomodoro(ctx){
  const {profile:p}=ctx;
  const timer=p.timer;
  const assignments=ctx.data.assignments.filter(a=>!a.submittedAt);
  const categories=ctx.data.categories;
  if(ctx.preset!==null && !timer){
    setup.assignmentId=ctx.preset;
    ctx.preset=null;
  }
  const selection=select([['','Independent study'],...assignments.map(a=>[a.id,a.title])],
    assignments.some(a=>a.id===setup.assignmentId)?setup.assignmentId:'',{onchange:e=>{setup.assignmentId=e.target.value;}});
  const category=select(categories.map(c=>[c.id,c.name]),categories.some(c=>c.id===setup.categoryId)?setup.categoryId:categories[0].id,
    {onchange:e=>{setup.categoryId=e.target.value;}});
  const minutes=input({type:'number',inputmode:'numeric',min:1,max:240,step:1,value:setup.minutes??p.work,required:true});
  const display=h('output',{class:'timer-display',id:'timer-display','aria-label':'Remaining time','aria-live':'off'},clock(timer?remaining(timer):Number(minutes.value)*60000));
  display.updateClock=value=>{const text=clock(remaining(value)); if(display.value!==text) display.value=text;};
  const durationButtons=options.map(n=>button(n+' min',()=>{
    minutes.value=n;
    update();
  },'chip'));
  function update(){
    setup.minutes=minutes.validity.valid?Number(minutes.value):null;
    display.value=clock((setup.minutes??p.work)*60000);
    durationButtons.forEach((btn,i)=>btn.setAttribute('aria-pressed',String(Number(minutes.value)===options[i])));
  }
  minutes.addEventListener('input',update);
  if(!timer){
    durationButtons.forEach((btn,i)=>btn.setAttribute('aria-pressed',String(Number(minutes.value)===options[i])));
  }
  async function start(kind){
    const isWork=kind==='work';
    let value=p[kind];
    if(isWork){
      if(!minutes.reportValidity()) return;
      value=integer(minutes.value,1,240);
      prepareBell();
    }
    await ctx.action(tx=>{
      if(tx.profile.timer) throw new Error('A timer is already active.');
      const assignmentId=isWork?selection.value||null:null;
      const categoryId=isWork?category.value:null;
      if(assignmentId && (!tx.find('assignments',assignmentId) || tx.find('assignments',assignmentId).submittedAt)) throw new Error('Choose an active assignment.');
      if(isWork && !tx.find('categories',categoryId)) throw new Error('Choose an available work category.');
      tx.profile.timer=newTimer({assignmentId,categoryId,kind,minutes:value});
    });
  }
  const currentTitle=ctx.data.assignments.find(a=>a.id===timer?.assignmentId)?.title || 'Independent study';
  const currentCategory=categories.find(c=>c.id===timer?.categoryId)?.name;
  const goal=goalFor(ctx,localDate());
  const today=ctx.data.sessions.filter(s=>s.date===goal.date);
  const words=sum(today,'words');
  return h('div',{class:'stack'},heading('Pomodoro','Set aside a little time for focused work.',link('History','history','secondary','chart')),
    h('div',{class:'timer-layout'},
      h('section',{class:'panel timer-panel'},
        h('span',{class:'eyebrow'},timer?timer.kind==='work'?'FOCUS SESSION':'BREAK':'FOCUS TIMER'),
        pomodoroArt(timer,focusComplete(timer)),
        display,
        h('p',{class:'timer-state'},timer?.status==='paused'?'Paused':timer?.status==='review'?'Ready for your review':timer?.kind==='work'?'In focus':timer?'On a break':'Ready when you are'),
        !timer && group(durationButtons),
        !timer && field('Custom minutes',minutes),
        group(!timer && button('Start',()=>start('work'),'primary','play'),
          timer?.status==='running' && button('Pause',()=>transition(ctx,timer,'pause'),'secondary','pause'),
          timer?.status==='paused' && button('Resume',()=>{prepareBell();return transition(ctx,timer,'resume');},'primary','play'),
          timer && timer.status!=='review' && button('Stop',()=>transition(ctx,timer,'stop'),'danger'),
          timer?.status==='review' && button('Review session',()=>reviewTimer(ctx,true),'primary','check'))),
      h('div',{class:'stack'},
        panel(subheading('Today’s Work'),timer
          ? h('div',{class:'stack tight'},timer.kind==='work'?h('strong',{},currentTitle):h('strong',{},timer.kind==='short'?'Short break':'Long break'),currentCategory && tag(currentCategory))
          : h('div',{class:'stack tight'},field('Assignment',selection),field('Work category',category))),
        panel(subheading('Today’s goals',button('Edit goals',()=>goalEditor(ctx,goal),'secondary')),
          h('p',{},number(words)+(goal.target?' / '+number(goal.target):'')+' words logged'),
          goal.target>0 && progressBar(wordProgress(words,goal.target),'Today’s word goal'),
          goalList(ctx,goal),!goal.items.length && muted('Add a few things to focus on today.')),
        panel(subheading('Take a break'),
          p.reminders && muted('Drink water, take a walk, or make some tea.'),
          group(...['short','long'].map(kind=>{
            const control=button(p[kind]+' min '+kind+' break',()=>start(kind),'secondary','leaf');
            control.disabled=!!timer;
            return control;
          }))))));
}

let openedReview;
export function reviewTimer(ctx,force=false){
  const timer=ctx.profile.timer;
  if(!timer || timer.status!=='review' || timer.kind!=='work' || (!force && openedReview===timer.id)) return;
  openedReview=timer.id;
  const goal=goalFor(ctx,timer.date);
  openDialog('Session review',(close,showError)=>{
    const words=input({type:'number',inputmode:'numeric',min:0,max:GOAL_MAX,step:1,required:true,value:timer.draft.words});
    const note=h('textarea',{rows:3,maxlength:4000},timer.draft.note);
    const boxes=goal.items.map(item=>[item,checkbox(timer.draft.completed.includes(item.id),()=>{},item.title)]);
    const getDraft=()=>({words:integer(words.value,0,GOAL_MAX),note:note.value,completed:boxes.filter(([,box])=>box.checked).map(([item])=>item.id)});
    function storeDraft(){
      if(!words.validity.valid) return;
      const draft=getDraft();
      ctx.action(tx=>{
        if(tx.profile.timer?.id===timer.id) tx.profile.timer={...tx.profile.timer,draft};
      },{renderPage:false});
    }
    words.addEventListener('input',storeDraft);
    note.addEventListener('input',storeDraft);
    for(const [,box] of boxes) box.addEventListener('change',storeDraft);
    const discard=button('No, discard',async()=>{
      discard.disabled=true;
      try {
        await ctx.write(tx=>{ if(tx.profile.timer?.id===timer.id) tx.profile.timer=null; });
        close();
        ctx.toast('Session discarded.');
      }catch(error){showError(error.message);}
      finally{discard.disabled=false;}
    },'quiet');
    const save=button('Yes, save session',async()=>{
      if(!words.reportValidity()) return;
      save.disabled=true;
      discard.disabled=true;
      try {
        const draft=getDraft();
        await ctx.write(tx=>logSession(tx,timer.id,draft));
        close();
        ctx.toast('Session saved.');
      }catch(error){showError(error.message);}
      finally{save.disabled=false;discard.disabled=false;}
    },'primary','check');
    save.disabled=timer.elapsed<1000;
    return h('div',{class:'stack'},focusComplete(timer) && h('div',{class:'celebration stack'},pomodoroArt(timer,true),
      button('Play bell',async()=>{
        prepareBell();
        try{await playBell();}catch{showError('The bell could not be played.');}
      },'secondary')),tag(duration(timer.elapsed)+' of focus'),muted('Would you like to save this session?'),
      field('New words written during this session',words),
      muted('These words are added to the assignment total once. If you already adjusted the total, enter 0.'),
      boxes.length>0 && h('fieldset',{},h('legend',{},'Goals accomplished'),boxes.map(([item,box])=>h('label',{class:'check-row'},box,item.title))),
      field('Session note · optional',note),
      timer.elapsed<1000 && muted('Work for at least one second to log a session.'),group(discard,save));
  });
}

function sessionDetails(s){
  openDialog('Session details',()=>h('div',{class:'stack'},h('strong',{},s.assignmentName||'Independent study'),
    muted(`${dateLabel(s.date)} · ${s.categoryName} · ${duration(s.ms)} · ${number(s.words)} words`),
    h('p',{class:'preserve'},s.note||'No note for this session.'),muted(s.completed.length+' goals checked during this session.')));
}
export function history(ctx){
  const sessions=[...ctx.data.sessions].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
  const date=localDate();
  const week=weekStart();
  const today=sessions.filter(s=>s.date===date);
  const weekly=sessions.filter(s=>s.date>=week && s.date<=date);
  const byAssignment=new Map();
  for(const s of sessions){
    const key=s.assignmentId || s.formerAssignmentId || (s.assignmentName?'removed:'+s.assignmentName:'independent');
    const current=ctx.data.assignments.find(a=>a.id===s.assignmentId);
    if(!byAssignment.has(key)) byAssignment.set(key,{name:current?.title||s.assignmentName||'Independent study',ms:0});
    byAssignment.get(key).ms+=s.ms;
  }
  const filters=select([['all','All time'],['week','This week'],['day','Today']],'all',{'aria-label':'Filter sessions'});
  const list=h('div',{class:'stack tight'});
  const more=button('Show more',()=>{count+=30; populate();},'secondary');
  let count=30;
  function populate(){
    const rows=filters.value==='week'?weekly:filters.value==='day'?today:sessions;
    list.replaceChildren(...(rows.length? rows.slice(0,count).map(s=>h('button',{type:'button',class:'session-row',onclick:()=>sessionDetails(s)},
      h('span',{class:'tile-icon'},icon('timer')),h('span',{},h('strong',{},s.assignmentName||'Independent study'),
        h('small',{},s.categoryName+' · '+dateLabel(s.date))),tag(duration(s.ms)),tag(number(s.words)+' words'))) : [muted('No sessions in this period.')]));
    more.hidden=rows.length<=count;
  }
  filters.addEventListener('change',()=>{count=30; populate();});
  populate();
  return h('div',{class:'stack'},heading('History','A record of your focused study sessions.',link('New session','pomodoro','primary','play')),
    h('div',{class:'summary history-metrics'},valueGroup('Focus today',duration(sum(today,'ms'))),valueGroup('Focus this week',duration(sum(weekly,'ms'))),
      valueGroup('Sessions',number(sessions.length)),valueGroup('Words logged',number(sum(sessions,'words'))),
      valueGroup('Days worked',new Set(sessions.map(s=>s.date)).size)),
    h('div',{class:'detail-grid'},panel(subheading('By category'),categoryBars(ctx,sessions)),
      panel(subheading('By assignment'),bars([...byAssignment.values()].sort((a,b)=>b.ms-a.ms),'No assignment activity yet.'))),
    h('div',{class:'detail-grid'},panel(subheading('Days worked'),calendar(ctx,sessions)),
      panel(subheading('Saved sessions',filters),list,more)));
}
