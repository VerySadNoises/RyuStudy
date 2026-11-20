import {categoryColor,localDate,nowISO,uid,GOAL_MAX} from './model.js';

export const FOCUS_GIFS=[6566,6567,6575];
export const focusComplete=timer=>timer?.kind==='work' && timer.status==='review' && timer.elapsed>=timer.total;

export function newTimer({assignmentId,categoryId,kind,minutes},at = Date.now()) {
  const total = minutes*60000;
  return {
    id:uid(), assignmentId, categoryId, kind, total, elapsed:0, status:'running',
    ...(kind==='work'?{focusGif:FOCUS_GIFS[Math.floor(Math.random()*FOCUS_GIFS.length)]}:{}),
    startedAt:new Date(at).toISOString(), anchor:new Date(at).toISOString(),
    pausedAt:null,resumedAt:null,endedAt:null,date:localDate(new Date(at)),
    draft:{words:0,note:'',completed:[]}
  };
}

export function worked(timer,at = Date.now()) {
  const current = timer.status === 'running' ? Math.max(0,at-Date.parse(timer.anchor)) : 0;
  return Math.min(timer.total,timer.elapsed+current);
}

export const remaining = (timer,at) => timer.total-worked(timer,at);

export function changeTimer(timer,action,at = Date.now()) {
  if (!timer || timer.status === 'review') return timer;
  const elapsed = worked(timer,at);
  const stamp = new Date(at).toISOString();
  if (elapsed >= timer.total || action === 'stop') {
    const end = timer.status === 'running' && elapsed >= timer.total
      ? new Date(Date.parse(timer.anchor)+timer.total-timer.elapsed).toISOString() : stamp;
    return {...timer,elapsed,status:'review',anchor:null,endedAt:end};
  }
  if (action === 'pause' && timer.status === 'running') {
    return {...timer,elapsed,status:'paused',anchor:null,pausedAt:stamp};
  }
  if (action === 'resume' && timer.status === 'paused') {
    return {...timer,status:'running',anchor:stamp,resumedAt:stamp};
  }
  return timer;
}

export function logSession(tx,id,draft) {
  const timer = tx.profile.timer;
  if (tx.find('sessions',id)) return false;
  if (!timer || timer.id !== id || timer.status !== 'review' || timer.kind !== 'work') {
    throw new Error('This session is no longer available.');
  }
  if (timer.elapsed < 1000) throw new Error('Work for at least one second to log a session.');
  const assignment = timer.assignmentId ? tx.find('assignments',timer.assignmentId) : null;
  const category = tx.find('categories',timer.categoryId);
  const goal = tx.find('goals','day:'+timer.date);
  const completed = draft.completed.filter(itemId => goal?.items.some(i => i.id === itemId));
  if (assignment && assignment.words+draft.words > GOAL_MAX) throw new Error('The resulting word count is too high.');
  tx.add('sessions',{
    id,assignmentId:assignment?.id ?? null,assignmentName:assignment?.title ?? null,
    categoryId:timer.categoryId,categoryName:category?.name ?? 'Former category',
    categoryColor:categoryColor(category,tx.profile.theme),
    date:timer.date,startedAt:timer.startedAt,endedAt:timer.endedAt,savedAt:nowISO(),
    ms:timer.elapsed,words:draft.words,note:draft.note,completed
  });
  if (assignment) tx.put('assignments',{...assignment,words:assignment.words+draft.words});
  if (goal) tx.put('goals',{...goal,items:goal.items.map(item => completed.includes(item.id) ? {...item,done:true} : item)});
  tx.profile.timer = null;
  return true;
}
