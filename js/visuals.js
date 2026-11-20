import {activityByCategory,activityByDay,addDays,categoryColor,dateValue,duration,fullDate,localDate,number,sum} from './model.js';
import {h,muted,openDialog,tag,valueGroup} from './ui.js';

function details(day,sessions,ctx){
  openDialog(fullDate(dateValue(day)),()=>h('div',{class:'stack'},
    h('div',{class:'summary'},valueGroup('Sessions',sessions.length),valueGroup('Focus',duration(sum(sessions,'ms'))),valueGroup('Words',number(sum(sessions,'words')))),
    sessions.length?h('div',{class:'stack tight'},activityByCategory(sessions).map(item=>
      h('div',{class:'category-line'},h('span',{class:'swatch',style:'--swatch:'+currentColor(ctx,item)},''),h('span',{},item.name),tag(duration(item.ms)))))
      :muted('No work was logged on this day.')));
}
const currentColor=(ctx,group)=>{
  const category=ctx.data.categories.find(c=>c.id===group.id);
  return category ? categoryColor(category,ctx.profile.theme) : group.color;
};
export function calendar(ctx,sessions){
  const grouped=activityByDay(sessions);
  const today=new Date();
  const sunday=addDays(today,(7-today.getDay())%7);
  const first=addDays(sunday,-55);
  const weeks=Array.from({length:8},(_,i)=>addDays(first,i*7));
  const cells=weeks.flatMap(start=>Array.from({length:7},(_,j)=>{
    const d=addDays(start,j);
    const day=localDate(d);
    if(day>localDate(today)) return h('span',{class:'day future','aria-hidden':'true'});
    const rows=grouped.get(day)||[];
    const dominant=activityByCategory(rows)[0];
    const color=dominant && currentColor(ctx,dominant);
    return h('button',{type:'button',class:'day'+(rows.length?' worked':''),style:color?'--day-color:'+color:null,
      'aria-label':fullDate(d)+', '+rows.length+' sessions',title:fullDate(d)+': '+rows.length+' sessions',
      onclick:()=>details(day,rows,ctx)},h('span',{},''));
  }));
  return h('div',{class:'calendar'},
    h('div',{class:'calendar-main'},
      h('div',{class:'week-labels','aria-hidden':'true'},['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>h('span',{},x))),
      h('div',{class:'day-grid','aria-label':'Eight-week activity calendar'},cells)),
    h('div',{class:'calendar-caption'},h('span',{},fullDate(first).split(', ').at(-1)),h('span',{},'Today')),
    h('div',{class:'legend'},h('span',{},h('i',{}),'No activity'),h('span',{},h('i',{class:'filled'}),'Logged work')));
}
export function bars(rows,empty){
  if(!rows.length) return muted(empty);
  const max=Math.max(...rows.map(r=>r.ms),1);
  return h('div',{class:'bars'},rows.map(r=>h('div',{class:'bar-row'},
    h('div',{class:'progress-label'},h('span',{},r.name),h('strong',{},duration(r.ms))),
    h('div',{class:'bar-track','aria-hidden':'true'},h('span',{style:'--width:'+Math.round(r.ms/max*100)+'%;--bar:'+(r.color||'var(--accent)')},'')))));
}
export function categoryBars(ctx,sessions){
  return bars(activityByCategory(sessions).map(g=>({...g,color:currentColor(ctx,g)})),'No category activity yet.');
}
