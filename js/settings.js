import {THEMES,categoryColor,clean,integer,nowISO,uid} from './model.js';
import {snapshot,replaceAll,reset} from './db.js';
import {BACKUP_LIMIT,encode,decode} from './backup.js';
import {h,button,link,panel,group,muted,subheading,heading,field,input,select,modalForm,confirmAction,openDialog,listRow} from './ui.js';

const cap=s=>s[0].toUpperCase()+s.slice(1);
const nameInput=(value='',maxlength=120)=>input({type:'text',value,maxlength,required:true});
const numeric=(value,min,max)=>input({type:'number',inputmode:'numeric',value,min,max,step:1,required:true});
function settingsForm(label,content,save){
  const submit=h('button',{type:'submit',class:'button secondary'},label);
  return h('form',{class:'stack tight',onsubmit:async e=>{
    e.preventDefault();
    submit.disabled=true;
    try{ await save(); }
    catch{}
    finally{ submit.disabled=false; }
  }},content,group(submit));
}
function editLabel(ctx,table,row){
  const kind=table==='categories'?'category':'subject';
  const name=nameInput(row?.name);
  const slot=row?.slot ?? ctx.data.categories.length%4;
  const fallback=categoryColor({color:null,slot},ctx.profile.theme);
  const color=input({type:'text',value:row?.color||'',maxlength:7,pattern:'#[0-9A-Fa-f]{6}',placeholder:fallback,autocapitalize:'none',spellcheck:'false'});
  const picker=input({type:'color',value:row?.color||fallback});
  picker.addEventListener('input',()=>{color.value=picker.value;});
  color.addEventListener('input',()=>{if(/^#[\da-f]{6}$/i.test(color.value)) picker.value=color.value;});
  modalForm((row?'Edit ':'New ')+kind,()=>[field(cap(kind)+' name',name),table==='categories' &&
    h('div',{class:'form-pair'},field('Hex colour · optional',color),field('Colour picker',picker)),
    table==='categories' && muted('Leave the hex field empty to follow the selected theme.')],()=>ctx.write(tx=>{
    const title=clean(name.value);
    if(tx.data[table].some(item=>item.id!==row?.id && item.name.toLowerCase()===title.toLowerCase())) throw new Error('That name is already in use.');
    if(row && !tx.find(table,row.id)) throw new Error('This '+kind+' has been removed.');
    tx.put(table,table==='categories'?{id:row?.id||uid(),name:title,color:color.value||null,slot}:{id:row?.id||uid(),name:title});
  }));
}
function deleteLabel(ctx,table,row){
  const isCategory=table==='categories';
  confirmAction('Delete “'+row.name+'”?',isCategory?'Existing sessions keep the recorded category and colour.':'Assignments using this subject will display Independent study.',
    'Delete',()=>ctx.write(tx=>{
      if(isCategory && tx.data.categories.length<=1) throw new Error('Keep at least one work category.');
      if(isCategory && tx.profile.timer?.categoryId===row.id) throw new Error('Finish or discard the current session first.');
      if(!isCategory) for(const a of tx.data.assignments.filter(a=>a.subjectId===row.id)) tx.put('assignments',{...a,subjectId:null});
      tx.remove(table,row.id);
    }),true);
}

async function exportBackup(ctx){
  let file;
  let stamp;
  try{
    const data=await snapshot();
    stamp=nowISO();
    data.settings[0].lastExport=stamp;
    const bytes=encode(data);
    if(new Blob([bytes]).size>BACKUP_LIMIT) throw new Error('This backup exceeds the 25 MB import limit.');
    file=new File([bytes],'ryu-study-backup-'+stamp.slice(0,10)+'.json',{type:'application/json'});
  }catch(error){ctx.error(error); return;}
  const mark=()=>ctx.write(tx=>{tx.profile.lastExport=stamp;});
  openDialog('Export backup',(close,showError)=>{
    let shareable=false;
    try { shareable=!!navigator.canShare?.({files:[file]}); } catch {}
    const save=button('Download JSON',async()=>{
      save.disabled=true;
      const url=URL.createObjectURL(file);
      const a=h('a',{href:url,download:file.name});
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      try{ await mark(); close(); }
      catch(error){ showError(error.message); save.disabled=false; }
    },'secondary');
    const share=button('Save to Files',async()=>{
      share.disabled=true;
      try {
        await navigator.share({files:[file]});
        await mark();
        close();
      }catch(error){
        if(error.name!=='AbortError') showError('Sharing failed. Download the JSON instead to save a copy.');
      }finally{share.disabled=false;}
    },'primary');
    return h('div',{class:'stack'},muted(shareable?'Choose Save to Files in the share sheet and select On My iPhone or iCloud Drive.':'Download a JSON file, then open your browser’s downloads or the Files app to move it.'),
      group(save,shareable && share));
  });
}
export function importBackup(ctx){
  openDialog('Import backup',close=>{
    const picker=input({type:'file',accept:'.json,application/json'});
    let validated;
    let attempt=0;
    const summary=h('div',{class:'stack tight',role:'status'});
    const apply=button('Continue',()=>{
      if(!validated) return;
      const candidate=validated;
      confirmAction('Replace your workspace?','This replaces all local data, including the current timer. Export the current workspace first if you want to keep a copy.',
        'Replace with backup',async()=>{
          await ctx.replace(()=>replaceAll(candidate.data));
          close();
          ctx.go('home');
          ctx.toast('Backup restored.');
        },true);
    },'primary');
    apply.disabled=true;
    picker.addEventListener('change',async()=>{
      const token=++attempt;
      validated=null;
      apply.disabled=true;
      summary.replaceChildren();
      const file=picker.files[0];
      if(!file) return;
      if(file.size>BACKUP_LIMIT){ summary.textContent='Choose a JSON file smaller than 25 MB.'; return; }
      try{
        const candidate=decode(await file.text());
        if(token!==attempt) return;
        const {data,exportedAt}=candidate;
        summary.append(h('strong',{},data.settings[0].username||'Unnamed profile'),
          muted('Exported '+new Date(exportedAt).toLocaleString()),
          muted(`${data.assignments.length} assignments · ${data.sessions.length} sessions · ${data.tasks.length} tasks · ${data.notes.length} notes · ${data.goals.length} goals`),
          muted(`${data.subjects.length} subjects · ${data.categories.length} categories · ${cap(data.settings[0].theme)} theme`),
          ...(data.settings[0].timer?[h('p',{},'This backup includes a timer in progress or awaiting review.')]:[]));
        validated=candidate;
        apply.disabled=false;
      }catch(error){ if(token===attempt) summary.textContent='Invalid backup. '+error.message; }
    });
    return h('div',{class:'stack'},field('Ryu Study JSON backup',picker),summary,group(button('Cancel',close,'quiet'),apply));
  });
}
export function settings(ctx){
  const p=ctx.profile;
  const name=nameInput(p.username,60);
  name.autocomplete='given-name';
  const night=select([['off','Light'],['on','Night'],['auto','Automatic']],p.night,
    {onchange:e=>{const value=e.target.value; ctx.action(tx=>{tx.profile.night=value;});}});
  const hour=numeric(p.nightHour,0,23);
  const work=numeric(p.work,1,240);
  const short=numeric(p.short,1,240);
  const long=numeric(p.long,1,240);
  const reminders=input({type:'checkbox',checked:p.reminders,onchange:e=>{const value=e.target.checked; ctx.action(tx=>{tx.profile.reminders=value;});}});
  const categories=ctx.data.categories;
  const subjects=ctx.data.subjects;
  const labels=(table,rows)=>rows.map(row=>listRow(
    table==='categories' && h('span',{class:'swatch',style:'--swatch:'+categoryColor(row,p.theme)},''),
    h('span',{class:'row-label'},row.name),
    button('Edit',()=>editLabel(ctx,table,row),'quiet'),
    button('Delete',()=>deleteLabel(ctx,table,row),'quiet')));
  return h('div',{class:'stack'},heading('Settings','Make Ryu Study feel like your workspace.',link('History','history','secondary','chart')),
    h('div',{class:'detail-grid'},
      panel(subheading('Profile'),settingsForm('Save name',field('Your name',name),()=>ctx.write(tx=>{tx.profile.username=clean(name.value,60);}))),
      panel(subheading('Appearance'),h('div',{class:'theme-grid'},THEMES.map(theme=>
        h('button',{type:'button',class:'theme-button','aria-pressed':String(p.theme===theme),onclick:()=>ctx.action(tx=>{tx.profile.theme=theme;})},
          h('span',{class:'theme-preview','data-theme':theme},h('i',{},''),h('i',{},''),h('i',{},'')),cap(theme)))),
        field('Display mode',night),
        settingsForm('Save schedule',field('Automatic night starts at · hour 0–23',hour),()=>ctx.write(tx=>{tx.profile.nightHour=integer(hour.value,0,23);})),
        muted('Automatic mode returns to light at 07:00, using device time.')),
      panel(subheading('Pomodoro'),settingsForm('Save durations',[
        field('Focus minutes',work),h('div',{class:'form-pair'},field('Short break minutes',short),field('Long break minutes',long))
      ],()=>ctx.write(tx=>{tx.profile.work=integer(work.value,1,240);tx.profile.short=integer(short.value,1,240);tx.profile.long=integer(long.value,1,240);})),
        h('label',{class:'check-row'},reminders,'Show break reminders')),
      panel(subheading('Work categories',button('Add category',()=>editLabel(ctx,'categories'),'secondary','plus')),labels('categories',categories)),
      panel(subheading('Subjects',button('Add subject',()=>editLabel(ctx,'subjects'),'secondary','plus')),subjects.length?labels('subjects',subjects):muted('No subjects yet. Add one here or when creating an assignment.')),
      h('section',{class:'panel',id:'data-settings'},
        subheading('Data'),
        h('p',{class:'muted',id:'offline-status'},ctx.offlineReady?'Offline cache ready.':'Offline cache not ready yet. Use HTTPS or localhost.'),
        h('p',{class:'muted',id:'save-status'},''),
        h('p',{class:'muted',id:'persist-status'},'Persistent storage: '+ctx.persistent+'.'),
        muted(p.lastExport?'Last export · '+new Date(p.lastExport).toLocaleString():'No backup exported yet.'),
        muted('iOS can remove local data in some circumstances. Keep a JSON copy in Files or iCloud Drive.'),
        group(button('Export JSON',()=>exportBackup(ctx),'primary'),button('Import JSON',()=>importBackup(ctx),'secondary')),
        button('Reset application',()=>confirmAction('Reset Ryu Study?','Erase the local profile, assignments, sessions, goals, tasks and notes? This cannot be undone without a backup.',
          'Erase all local data',async()=>{await ctx.replace(reset);ctx.go('home');ctx.toast('Workspace reset.');},true),'danger'))));
}
