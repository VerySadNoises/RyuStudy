import {progress,wordProgress,number,dateLabel,dueLabel,daysUntil,fullDate,localDate,weekStart,addDays,
  nowISO,uid,clean,integer,GOAL_MAX,blankGoal,sum} from './model.js';
import {h,button,link,panel,group,muted,tag,subheading,heading,field,input,select,cat,progressBar,checkbox,listRow,modalForm,confirmAction,openDialog,icon,valueGroup} from './ui.js';
import {calendar} from './visuals.js';

const textField=(value='',required=true,maxlength=120)=>input({value,required,maxlength,type:'text'});
const numberField=(value,min,max)=>input({value,min,max,required:true,step:1,type:'number',inputmode:'numeric'});
const byDue=(a,b)=>(a.due||'9999-12-31').localeCompare(b.due||'9999-12-31') || a.title.localeCompare(b.title);
const subject=(ctx,a)=>ctx.data.subjects.find(s=>s.id===a.subjectId)?.name || 'Independent study';
const active=ctx=>ctx.data.assignments.filter(a=>!a.submittedAt).sort(byDue);

function card(ctx,a){
  const n=progress(a);
  return h('a',{href:'#assignment/'+a.id,class:'assignment-card'},
    h('div',{class:'card-top'},h('span',{class:'tile-icon'},icon('book')),
      a.submittedAt ? tag(a.archivedAt?'Archived':'Submitted') : h('span',{class:'tag '+(a.due && daysUntil(a.due)<=2?'urgent':'')},dueLabel(a.due))),
    h('h3',{},a.title),h('span',{class:'subject'},subject(ctx,a)),
    h('div',{class:'card-date'},icon('calendar'),dateLabel(a.due)),
    h('div',{class:'progress-label'},h('span',{},'Progress'),h('strong',{},n+'%')),progressBar(n,a.title+' progress'));
}
function empty(ctx){
  return h('div',{class:'empty'},h('span',{class:'tile-icon'},icon('book')),h('h3',{},'A fresh page'),
    muted('Add your first assignment to keep deadlines, words, and ideas together.'),
    button('Create an assignment',()=>editAssignment(ctx),'secondary','plus'));
}
export function home(ctx){
  const rows=active(ctx);
  const today=ctx.data.sessions.filter(s=>s.date===localDate());
  const thisWeek=ctx.data.sessions.filter(s=>s.date>=weekStart() && s.date<=localDate());
  const last=ctx.profile.lastExport || ctx.profile.createdAt;
  const remind=Date.now()-Math.max(Date.parse(last),Date.parse(ctx.profile.backupSnooze || last))>=604800000;
  return h('div',{class:'stack dashboard'},
    h('section',{class:'hero'},h('div',{class:'hero-copy'},h('div',{class:'eyebrow'},icon('leaf'),' YOUR STUDY SPACE'),
      h('h1',{},'Hi, '+ctx.profile.username+'!'),h('span',{class:'mobile-date'},icon('calendar'),fullDate()),h('p',{},'A little progress goes a long way. What are we working on today?'),
      link('Start Working','pomodoro','primary','play')),
      h('div',{class:'hero-art'},cat(),h('span',{class:'art-caption'},'THE STUDY BUDDY'))),
    h('div',{class:'summary'},valueGroup('Active assignments',rows.length),valueGroup('Words today',number(sum(today,'words'))),
      valueGroup('Focus this week',Math.floor(sum(thisWeek,'ms')/60000)+' min')),
    remind && h('aside',{class:'banner'},h('span',{},'It’s been a week. Save a copy of your workspace.'),group(
      link('Back up','settings/data','secondary'),button('Later',()=>ctx.action(tx=>{tx.profile.backupSnooze=nowISO();}),'quiet'))),
    h('div',{class:'dashboard-grid'},
      h('section',{class:'panel assignments-panel'},subheading('My Assignments',link('View all','assignments','quiet','arrow')),
        rows.length?h('div',{class:'cards'},rows.slice(0,4).map(a=>card(ctx,a))):empty(ctx),
        link('Archived assignments','assignments/archived','quiet','archive')),
      panel(subheading('Focus activity',link('History','history','quiet','chart')),
        muted('Your last eight weeks of study.'),calendar(ctx,ctx.data.sessions),
        h('div',{class:'focus-tip'},h('span',{class:'tile-icon'},icon('timer')),h('div',{},h('strong',{},today.length+' '+(today.length===1?'session':'sessions')+' today'),muted('Sessions appear here when you save them.'))))));
}
export function assignments(ctx,archived){
  const rows=ctx.data.assignments.filter(a=>archived?!!a.archivedAt:!a.archivedAt).sort((a,b)=>Number(!!a.submittedAt)-Number(!!b.submittedAt)||byDue(a,b));
  return h('div',{class:'stack'},heading(archived?'Archived assignments':'Assignments','Keep your coursework, deadlines, and milestones together.',
    group(link(archived?'Current assignments':'Archived',archived?'assignments':'assignments/archived','secondary','archive'),
      !archived && button('New assignment',()=>editAssignment(ctx),'primary','plus'))),
    rows.length?h('div',{class:'cards standalone-cards'},rows.map(a=>card(ctx,a))):panel(archived?muted('Archived assignments will appear here.'):empty(ctx)));
}
export function editAssignment(ctx,a){
  const title=textField(a?.title);
  const due=input({type:'date',value:a?.due||''});
  const target=numberField(a?.target??1500,300,10000);
  const slider=input({type:'range',min:300,max:10000,step:1,value:target.value,'aria-label':'Word target slider'});
  slider.addEventListener('input',()=>{target.value=slider.value;});
  target.addEventListener('input',()=>{if(target.validity.valid) slider.value=target.value;});
  const subjectField=select([['','No subject'],...ctx.data.subjects.map(s=>[s.id,s.name]),['new','+ Create a subject']],a?.subjectId || '');
  const custom=textField('',false);
  const customLabel=field('New subject',custom);
  customLabel.hidden=true;
  subjectField.addEventListener('change',()=>{customLabel.hidden=subjectField.value!=='new'; custom.required=!customLabel.hidden;});
  const obligations=h('div',{class:'stack tight'});
  const controls=new Map();
  function add(row){
    const titleInput=textField(row.title,false);
    titleInput.setAttribute('aria-label','Obligation');
    const done=checkbox(row.done,()=>{},'Obligation completed');
    const view=listRow(done,titleInput,button('Remove',()=>{controls.delete(row.id); view.remove();},'quiet'));
    controls.set(row.id,{titleInput,done});
    obligations.append(view);
  }
  for(const o of a?.obligations || []) add(o);
  const suggestions=['Bibliography','Images / Illustrations','Footnotes','Abstract'];
  modalForm(a?'Edit assignment':'New assignment',()=>[
    field('Assignment name',title),field('Subject',subjectField),customLabel,field('Due date · optional',due),
    field('Word target',target),slider,h('h3',{},'Required obligations'),muted('Add the requirements that count toward completion.'),
    group(suggestions.map(title=>button('+ '+title,()=>{
      if(![...controls.values()].some(c=>c.titleInput.value.trim().toLowerCase()===title.toLowerCase())) add({id:uid(),title,done:false});
    },'chip'))),obligations,button('Add obligation',()=>add({id:uid(),title:'',done:false}),'secondary','plus')
  ],async()=>{
    const name=clean(title.value);
    const goal=integer(target.value,300,10000);
    const deadline=due.value || null;
    if(deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) throw new Error('Enter a four-digit calendar year.');
    const rows=[...controls.entries()].filter(([,c])=>c.titleInput.value.trim()).map(([id,c])=>({id,title:clean(c.titleInput.value),done:c.done.checked}));
    if(rows.length>5000) throw new Error('This assignment has too many obligations.');
    const id=a?.id || uid();
    await ctx.write(tx=>{
      const live=tx.find('assignments',id);
      if(a && !live) throw new Error('The assignment has been removed.');
      let subjectId=subjectField.value || null;
      if(subjectId==='new'){
        const name=clean(custom.value);
        subjectId=tx.data.subjects.find(s=>s.name.toLowerCase()===name.toLowerCase())?.id || uid();
        if(!tx.find('subjects',subjectId)) tx.add('subjects',{id:subjectId,name});
      }else if(subjectId && !tx.find('subjects',subjectId)) throw new Error('This subject has been removed.');
      tx.put('assignments',{words:0,createdAt:nowISO(),submittedAt:null,archivedAt:null,...live,id,title:name,due:deadline,target:goal,subjectId,obligations:rows});
      for(const g of tx.data.goals.filter(g=>g.assignmentId===id)){
        tx.put('goals',{...g,obligationIds:g.obligationIds.filter(key=>rows.some(o=>o.id===key))});
      }
    });
    ctx.go('assignment/'+id);
  },a?'Save changes':'Create assignment');
}
function editTask(ctx,a,task){
  const title=textField(task?.title);
  const due=input({type:'date',value:task?.due||''});
  modalForm(task?'Edit task':'New task',()=>[field('Task name',title),field('Due date · optional',due)],async()=>{
    if(due.value && !/^\d{4}-\d{2}-\d{2}$/.test(due.value)) throw new Error('Enter a four-digit calendar year.');
    await ctx.write(tx=>{
      if(!tx.find('assignments',a.id)) throw new Error('The assignment has been removed.');
      const live=task && tx.find('tasks',task.id);
      if(task && !live) throw new Error('The task has been removed.');
      tx.put('tasks',{id:task?.id || uid(),assignmentId:a.id,title:clean(title.value),done:live?.done??false,due:due.value||null});
    });
  });
}

export function goalEditor(ctx,current,obligations=[]){
  const target=numberField(current.target,0,GOAL_MAX);
  const itemContainer=h('div',{class:'stack tight'});
  const controls=new Map();
  const obligationInputs=obligations.map(o=>[o,checkbox(current.obligationIds.includes(o.id),()=>{},o.title)]);
  function add(row){
    const title=textField(row.title,false);
    title.setAttribute('aria-label','Goal text');
    const done=checkbox(row.done,()=>{},'Goal completed');
    const view=listRow(done,title,button('Remove',()=>{controls.delete(row.id); view.remove();},'quiet'));
    controls.set(row.id,{title,done});
    itemContainer.append(view);
  }
  current.items.forEach(add);
  modalForm(current.kind==='day'?'Today’s goals':'Weekly goals',()=>[
    field('Word goal · 0 to disable',target),h('h3',{},'Checklist'),itemContainer,
    button('Add goal',()=>add({id:uid(),title:'',done:false}),'secondary','plus'),
    obligations.length>0 && h('div',{class:'stack tight'},h('h3',{},'Required obligations this week'),obligationInputs.map(([o,box])=>h('label',{class:'check-row'},box,o.title)))
  ],async()=>{
    const items=[...controls.entries()].filter(([,o])=>o.title.value.trim()).map(([id,c])=>({id,title:clean(c.title.value),done:c.done.checked}));
    if(items.length>5000) throw new Error('This checklist has too many goals.');
    const targetValue=integer(target.value,0,GOAL_MAX);
    await ctx.write(tx=>{
      const live=current.assignmentId && tx.find('assignments',current.assignmentId);
      if(current.assignmentId && !live) throw new Error('The assignment has been removed.');
      tx.put('goals',{...current,target:targetValue,items,obligationIds:obligationInputs.filter(([o,box])=>box.checked && live?.obligations.some(row=>row.id===o.id)).map(([o])=>o.id)});
    });
  });
}
export function goalList(ctx,goal){
  return goal.items.map(item=>h('label',{class:'check-row'},checkbox(item.done,e=>{
    const done=e.target.checked;
    ctx.action(tx=>{
      const live=tx.find('goals',goal.id);
      if(live) tx.put('goals',{...live,items:live.items.map(o=>o.id===item.id?{...o,done}:o)});
    });
  },item.title),h('span',{class:item.done?'done':''},item.title)));
}

function setAssignment(ctx,id,apply){
  return ctx.write(tx=>{
    const live=tx.find('assignments',id);
    if(!live) throw new Error('The assignment was removed.');
    tx.put('assignments',apply(live));
  });
}
function submitAssignment(ctx,a){
  confirmAction('Submit assignment?',`Mark “${a.title}” as officially completed?`,'Submit',async()=>{
    await setAssignment(ctx,a.id,live=>{
      if(progress(live)!==100) throw new Error('Complete the word target and all required obligations first.');
      return {...live,submittedAt:live.submittedAt || nowISO()};
    });
    openDialog('Assignment complete!',close=>h('div',{class:'celebration stack'},cat('celebrate'),muted('Well done. You’ve finished '+a.title+'.'),
      group(button('Keep here',close,'secondary'),button('Archive',async()=>{
        try { await setAssignment(ctx,a.id,live=>({...live,archivedAt:nowISO()})); close(); ctx.go('assignments/archived'); }
        catch {}
      },'primary','archive'))));
  });
}
function removeAssignment(ctx,a){
  confirmAction('Delete assignment?',`Delete “${a.title}”, its tasks, notes and weekly goals? Logged sessions stay in History with their recorded title.`,'Delete',async()=>{
    await ctx.write(tx=>{
      if(tx.profile.timer?.assignmentId===a.id) throw new Error('Finish or discard the current session first.');
      tx.remove('assignments',a.id);
      for(const table of ['tasks','notes','goals','sessions']){
        for(const row of tx.data[table].filter(row=>row.assignmentId===a.id)){
          if(table==='sessions') tx.put(table,{...row,assignmentId:null,formerAssignmentId:row.assignmentId});
          else tx.remove(table,row.id);
        }
      }
    });
    ctx.go('assignments');
  },true);
}
export function assignment(ctx,id){
  const a=ctx.data.assignments.find(row=>row.id===id);
  if(!a) return panel(heading('Assignment unavailable'),link('Back to assignments','assignments','secondary','back'));
  const sessions=ctx.data.sessions.filter(s=>s.assignmentId===id);
  const tasks=ctx.data.tasks.filter(t=>t.assignmentId===id).sort((a,b)=>Number(a.done)-Number(b.done)||byDue(a,b));
  const monday=weekStart();
  const weekGoalId='week:'+id+':'+monday;
  const goal=ctx.data.goals.find(g=>g.id===weekGoalId) || blankGoal(weekGoalId,'week',monday,id);
  const weekWords=sum(sessions.filter(s=>s.date>=monday && s.date<=localDate(addDays(new Date(monday+'T12:00:00'),6))),'words');
  const planned=a.obligations.filter(o=>goal.obligationIds.includes(o.id));
  const notes=h('textarea',{rows:6,maxlength:30000,placeholder:'Ideas, references, or reminders…'},ctx.data.notes.find(n=>n.id===id)?.text || '');
  const noteStatus=h('span',{class:'muted',role:'status'},'Changes save automatically.');
  let revision=0;
  notes.addEventListener('input',async()=>{
    const text=notes.value;
    const edit=++revision;
    noteStatus.textContent='Saving…';
    try {
      await ctx.write(tx=>{
        if(!tx.find('assignments',id)) throw new Error('The assignment was removed.');
        tx.put('notes',{id,assignmentId:id,text});
      },{renderPage:false});
      if(edit===revision) noteStatus.textContent='Saved';
    }catch { if(edit===revision) noteStatus.textContent='Unsaved. Edit the note to retry.'; }
  });
  const p=progress(a);
  const work=button('Start Working',()=>{ctx.preset=id; ctx.go('pomodoro'); if(ctx.profile.timer && ctx.profile.timer.assignmentId!==id) ctx.toast('Finish your current timer to switch assignments.');},'primary','play');
  const submit=button('Submit',()=>submitAssignment(ctx,a),'primary','check');
  submit.disabled=p!==100;
  return h('div',{class:'stack'},
    link('Back to Home','home','quiet back-link','back'),
    heading(a.title,`${subject(ctx,a)} · ${dateLabel(a.due)} · ${p}% overall`,
      group(button('Edit',()=>editAssignment(ctx,a),'secondary','pencil'),!a.submittedAt && submit)),
    a.submittedAt && h('div',{class:'banner'},tag(a.archivedAt?'Archived':'Submitted'),group(
      button(a.archivedAt?'Unarchive':'Archive',()=>setAssignment(ctx,id,live=>({...live,archivedAt:live.archivedAt?null:nowISO()})).catch(()=>{}),'secondary','archive'),
      button('Reopen',()=>setAssignment(ctx,id,live=>({...live,submittedAt:null,archivedAt:null})).catch(()=>{}),'quiet'))),
    h('div',{class:'detail-grid'},panel(subheading('Writing progress',button('Adjust words',()=>{
      const words=numberField(a.words,0,GOAL_MAX);
      modalForm('Adjust current word count',()=>field('Total words written',words),()=>setAssignment(ctx,id,live=>({...live,words:integer(words.value,0,GOAL_MAX)})));
    },'secondary')),h('div',{class:'word-count'},number(a.words),h('small',{},' / '+number(a.target)+' words')),progressBar(wordProgress(a.words,a.target),'Word target progress'),
      h('p',{class:'muted'},`${wordProgress(a.words,a.target)}% of word target · ${p}% overall`),
      muted('Overall progress uses 70% word count and 30% required obligations. With no obligations, words count for 100%. Optional to-dos are separate. Adjusting the total does not change session history.'),
      a.obligations.map(o=>h('label',{class:'check-row'},checkbox(o.done,e=>{
        const done=e.target.checked;
        setAssignment(ctx,id,live=>({...live,obligations:live.obligations.map(item=>item.id===o.id?{...item,done}:item)})).catch(()=>{});
      },o.title),h('span',{class:o.done?'done':''},o.title))),!a.submittedAt && work),
      panel(subheading('Activity calendar'),muted('Tap a day to see logged work.'),calendar(ctx,sessions))),
    h('div',{class:'detail-grid'},panel(subheading('To-do list',button('Add task',()=>editTask(ctx,a),'secondary','plus')),
      tasks.length?tasks.map(t=>listRow(h('label',{class:'check-row task-name'},checkbox(t.done,e=>{
        const done=e.target.checked;
        ctx.action(tx=>{const live=tx.find('tasks',t.id); if(live) tx.put('tasks',{...live,done});});
      },t.title),h('span',{},h('span',{class:t.done?'done':''},t.title),h('small',{},(t.done?'Done':'Open')+(t.due?' · '+dateLabel(t.due):'')))),
      button('Edit',()=>editTask(ctx,a,t),'quiet'),button('Delete',()=>confirmAction('Delete task?',t.title,'Delete',()=>ctx.write(tx=>tx.remove('tasks',t.id)),true),'quiet'))):muted('No tasks added yet.')),
      panel(subheading('Weekly goals',button('Edit goals',()=>goalEditor(ctx,goal,a.obligations),'secondary')),
        muted('Week of '+dateLabel(monday)),h('p',{},number(weekWords)+(goal.target?' / '+number(goal.target):'')+' words logged'),
        goal.target>0 && progressBar(wordProgress(weekWords,goal.target),'Weekly word goal'),
        goalList(ctx,goal),planned.length>0 && h('div',{},h('h3',{},'Planned obligations'),
          planned.map(o=>h('p',{class:o.done?'done':''},(o.done?'✓ ':'○ ')+o.title))),
        muted('Weekly words come from saved sessions.'))),
    panel(subheading('Notes'),field('Assignment notes',notes),noteStatus),
    button('Delete assignment',()=>removeAssignment(ctx,a),'danger back-link'));
}
