import {FOCUS_GIFS} from './timer.js';
import {STORES} from './db.js';
import {THEMES,GOAL_MAX,nowISO} from './model.js';

export const BACKUP_LIMIT = 25 * 1024 * 1024;
export const encode = data => JSON.stringify({format:'chapitre-backup',version:1,exportedAt:nowISO(),data},null,2);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v,max,min=0) => typeof v === 'string' && v.length >= min && v.length<=max && (!min || !!v.trim());
const id = v => str(v,100,1) && /^[a-z0-9:_-]+$/i.test(v);
const bool = v => typeof v === 'boolean';
const int = (v,min,max) => Number.isSafeInteger(v) && v>=min && v<=max;
const time = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const date = v => typeof v === 'string' && time(v+'T00:00:00.000Z');
const optional = (fn,v) => v === null || fn(v);
const color = v => typeof v === 'string' && /^#[a-f\d]{6}$/i.test(v);
const oneOf = (values,v) => values.includes(v);
const unique = list => new Set(list).size === list.length;
const listOf = (list,fn,max=50000) => Array.isArray(list) && list.length<=max && list.every(fn);
const ids = v => listOf(v,id,5000) && unique(v);
const item = v => object(v) && id(v.id) && str(v.title,120,1) && bool(v.done);
const items = v => listOf(v,item,5000) && unique(v.map(i=>i.id));
const draft = v => object(v) && int(v.words,0,GOAL_MAX) && str(v.note,4000) && ids(v.completed);
const timer = v => object(v) && id(v.id) && optional(id,v.assignmentId) && optional(id,v.categoryId)
  && oneOf(['work','short','long'],v.kind) && oneOf(['running','paused','review'],v.status)
  && int(v.total,60000,14400000) && v.total%60000===0 && int(v.elapsed,0,v.total)
  && date(v.date) && time(v.startedAt) && optional(time,v.pausedAt) && optional(time,v.resumedAt)
  && (v.status === 'running' ? time(v.anchor) : v.anchor === null)
  && (v.status === 'paused' ? time(v.pausedAt) : true)
  && (v.status === 'review' ? time(v.endedAt) : v.endedAt === null)
  && (v.kind === 'work' ? id(v.categoryId) : v.categoryId === null && v.assignmentId === null)
  && (v.focusGif===undefined || v.kind==='work' && FOCUS_GIFS.includes(v.focusGif))
  && draft(v.draft);
const schemas = {
  settings: v => v.id==='profile' && str(v.username,60) && oneOf(THEMES,v.theme) && oneOf(['off','on','auto'],v.night)
    && int(v.nightHour,0,23) && int(v.work,1,240) && int(v.short,1,240) && int(v.long,1,240)
    && bool(v.reminders) && time(v.createdAt) && optional(time,v.lastSaved) && optional(time,v.lastExport)
    && optional(time,v.backupSnooze) && optional(timer,v.timer),
  assignments: v => str(v.title,120,1) && optional(id,v.subjectId) && optional(date,v.due)
    && int(v.target,300,10000) && int(v.words,0,GOAL_MAX) && items(v.obligations)
    && time(v.createdAt) && optional(time,v.submittedAt) && optional(time,v.archivedAt) && (!v.archivedAt || !!v.submittedAt),
  subjects: v => str(v.name,120,1),
  categories: v => str(v.name,120,1) && optional(color,v.color) && int(v.slot,0,3),
  sessions: v => optional(id,v.assignmentId) && (v.formerAssignmentId===undefined || v.assignmentId===null && id(v.formerAssignmentId)) && optional(n=>str(n,120,1),v.assignmentName) && id(v.categoryId)
    && str(v.categoryName,120,1) && color(v.categoryColor) && date(v.date) && time(v.startedAt)
    && time(v.endedAt) && time(v.savedAt) && int(v.ms,1000,14400000) && int(v.words,0,GOAL_MAX)
    && str(v.note,4000) && ids(v.completed),
  tasks: v => id(v.assignmentId) && str(v.title,120,1) && bool(v.done) && optional(date,v.due),
  notes: v => v.id===v.assignmentId && id(v.assignmentId) && str(v.text,30000),
  goals: v => oneOf(['day','week'],v.kind) && date(v.date) && int(v.target,0,GOAL_MAX) && items(v.items)
    && ids(v.obligationIds) && (v.kind==='day'
      ? v.assignmentId===null && v.id==='day:'+v.date && !v.obligationIds.length
      : id(v.assignmentId) && v.id==='week:'+v.assignmentId+':'+v.date && new Date(v.date+'T12:00:00Z').getUTCDay()===1)
};

export function decode(source) {
  const envelope = JSON.parse(source);
  if (!object(envelope) || envelope.format!=='chapitre-backup' || envelope.version!==1 || !time(envelope.exportedAt) || !object(envelope.data)) {
    throw new Error('This file is not a supported Chapitre backup.');
  }
  const data = {};
  for (const name of STORES) {
    const rows = envelope.data[name];
    if (!listOf(rows,row=>object(row) && id(row.id) && schemas[name](row)) || !unique(rows.map(row=>row.id))) {
      throw new Error(`Invalid or duplicate records in ${name}.`);
    }
    data[name] = rows;
  }
  if (data.settings.length!==1 || !data.categories.length) throw new Error('The backup is missing its profile or categories.');
  const assignments = new Map(data.assignments.map(row=>[row.id,row]));
  const subjects = new Set(data.subjects.map(row=>row.id));
  const categories = new Set(data.categories.map(row=>row.id));
  const active = data.settings[0].timer;
  const broken = data.assignments.some(a=>a.subjectId && !subjects.has(a.subjectId))
    || ['tasks','notes','goals','sessions'].some(name=>data[name].some(row=>row.assignmentId && !assignments.has(row.assignmentId)))
    || data.goals.some(g=>g.kind==='week' && g.obligationIds.some(key=>!assignments.get(g.assignmentId).obligations.some(o=>o.id===key)))
    || (active && ((active.assignmentId && !assignments.has(active.assignmentId))
      || (active.categoryId && !categories.has(active.categoryId)) || data.sessions.some(s=>s.id===active.id)));
  if (broken) throw new Error('The backup contains inconsistent references.');
  return {data,exportedAt:envelope.exportedAt};
}
