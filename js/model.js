export const THEMES = ['sakura', 'lavender', 'matcha', 'blueberry', 'peach'];
export const PALETTES = {
  sakura: ['#BC6583','#8670B3','#56866D','#B37451'],
  lavender: ['#8162AE','#A85479','#52876B','#A57149'],
  matcha: ['#5F895D','#AB725B','#876AB2','#537EAE'],
  blueberry: ['#567EAC','#9B658F','#52836C','#AC704A'],
  peach: ['#AD7154','#7A68A9','#57846B','#537EAE']
};
export const GOAL_MAX = 10000000;
export const nowISO = () => new Date().toISOString();
export const uid = () => globalThis.crypto?.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');
export const localDate = (d = new Date()) => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export const dateValue = iso => new Date(iso + 'T12:00:00');
export const addDays = (d, n) => { const copy = new Date(d); copy.setDate(copy.getDate()+n); return copy; };
export const weekStart = (d = new Date()) => localDate(addDays(d,-((d.getDay()+6)%7)));
export const dateLabel = iso => iso ? iso.split('-').reverse().join('/') : 'No due date';
export const fullDate = (d = new Date()) => new Intl.DateTimeFormat('en-GB',{weekday:'long',month:'long',day:'numeric'}).format(d);
export const daysUntil = iso => Math.round((Date.parse(iso)-Date.parse(localDate()))/86400000);
export const dueLabel = iso => {
  if (!iso) return 'No deadline';
  const n = daysUntil(iso);
  if (n === 0) return 'Due today';
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} overdue`;
  return `${n} day${n === 1 ? '' : 's'} left`;
};
export function progress(a) {
  const words = Math.min(a.words/a.target,1);
  const done = a.obligations.filter(o => o.done).length;
  const obligations = a.obligations.length;
  const fraction = obligations ? .7*words+.3*done/obligations : words;
  return words === 1 && done === obligations ? 100 : Math.min(99,Math.floor(fraction*100));
}
export const wordProgress = (value,target) => Math.min(100,Math.floor(value/target*100));
export const sum = (list, key) => list.reduce((n,r) => n+r[key],0);
export const number = n => new Intl.NumberFormat('en-GB').format(n);
export function duration(ms) {
  const seconds = Math.floor(ms/1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds/60);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
}
export function clock(ms) {
  const seconds = Math.ceil(ms/1000);
  return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n => String(n).padStart(2,'0')).join(':');
}
export const integer = (value,min,max) => {
  const n = Number(value);
  if (String(value).trim() === '' || !Number.isSafeInteger(n) || n<min || n>max) throw new Error(`Enter a whole number between ${min} and ${max}.`);
  return n;
};
export const clean = (value,max = 120) => {
  const s = value.trim();
  if (!s || s.length>max) throw new Error(`Enter between 1 and ${max} characters.`);
  return s;
};
export const defaultSettings = () => ({
  id:'profile', username:'', theme:'matcha', night:'off', nightHour:19, work:25, short:5, long:15,
  reminders:true, createdAt:nowISO(), lastSaved:null, lastExport:null, backupSnooze:null, timer:null
});
export const defaultCategories = () => ['Research','Writing','Feedback','Editing'].map((name,i) => ({
  id:['research','writing','feedback','editing'][i], name, color:null, slot:i
}));
export const categoryColor = (c,theme) => c?.color || PALETTES[theme][c?.slot ?? 0];
export const blankGoal = (id,kind,date,assignmentId = null) => ({id,kind,date,assignmentId,target:0,items:[],obligationIds:[]});
export function activityByDay(sessions) {
  const days = new Map();
  for (const session of sessions) {
    if (!days.has(session.date)) days.set(session.date,[]);
    days.get(session.date).push(session);
  }
  return days;
}
export function activityByCategory(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    const key = session.categoryId;
    if (!groups.has(key)) groups.set(key,{id:key,name:session.categoryName,color:session.categoryColor,ms:0});
    groups.get(key).ms += session.ms;
  }
  return [...groups.values()].sort((a,b) => b.ms-a.ms || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
