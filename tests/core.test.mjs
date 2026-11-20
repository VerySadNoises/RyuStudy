import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import {progress,defaultSettings,defaultCategories,activityByCategory,clock,localDate,weekStart,addDays} from '../js/model.js';
import {newTimer,worked,remaining,changeTimer,logSession} from '../js/timer.js';
import {encode,decode} from '../js/backup.js';

const at=Date.parse('2026-11-20T10:00:00.000Z');
const iso=new Date(at).toISOString();
const work={assignmentId:'a1',categoryId:'writing',kind:'work',minutes:25};
const empty=()=>({
  settings:[defaultSettings()],assignments:[],subjects:[],categories:defaultCategories(),sessions:[],tasks:[],notes:[],goals:[]
});
const assignment={
  id:'a1',title:'Essay',subjectId:null,due:'2026-11-30',words:250,target:1000,
  obligations:[],createdAt:iso,submittedAt:null,archivedAt:null
};

test('weighted progress stays below 100 until every requirement is met',()=>{
  const obligations=[{done:true},{done:false}];
  assert.equal(progress({...assignment,obligations}),32);
  assert.equal(progress({...assignment,words:1000,obligations}),85);
  assert.equal(progress({...assignment,words:999,obligations:[{done:true}]}),99);
  assert.equal(progress({...assignment,words:1000,obligations:[{done:true}]}),100);
  assert.equal(progress({...assignment,words:1000}),100);
  assert.equal(progress(assignment),25);
});
test('time skips correctly after pauses, clock rollback and time in the background',()=>{
  const timer=newTimer(work,at);
  const paused=changeTimer(timer,'pause',at+60000);
  assert.equal(paused.elapsed,60000);
  assert.equal(worked(paused,at+700000),60000);
  const resumed=changeTimer(paused,'resume',at+700000);
  assert.equal(remaining(resumed,at+699000),1440000);
  assert.equal(remaining(resumed,at+720000),1420000);
  const stopped=changeTimer(resumed,'stop',at+735000);
  assert.equal(stopped.elapsed,95000);
  const expiry=changeTimer(resumed,'tick',at+5000000);
  assert.equal(expiry.elapsed,1500000);
  assert.equal(expiry.endedAt,new Date(at+2140000).toISOString());
  assert.equal(expiry.status,'review');
  assert.equal(clock(remaining(timer,at+1)),'00:25:00');
  assert.equal(changeTimer(expiry,'resume'),expiry);
});
test('recording the same timer twice never increments the assignment twice',()=>{
  const data=empty();
  const profile=data.settings[0];
  const live=newTimer(work,at);
  profile.timer=changeTimer(live,'stop',at+5000);
  data.assignments.push({...assignment});
  data.goals.push({id:'day:'+live.date,kind:'day',date:live.date,assignmentId:null,target:500,obligationIds:[],items:[{id:'one',title:'Outline',done:false}]});
  const find=(table,id)=>data[table].find(row=>row.id===id);
  const tx={profile,find,add:(table,row)=>data[table].push(row),put:(table,row)=>{data[table][data[table].findIndex(r=>r.id===row.id)]=row;}};
  const draft={words:200,note:'First draft',completed:['one','absent']};
  assert.equal(logSession(tx,live.id,draft),true);
  assert.equal(logSession(tx,live.id,draft),false);
  assert.equal(data.assignments[0].words,450);
  assert.equal(data.sessions[0].ms,5000);
  assert.deepEqual(data.sessions[0].completed,['one']);
  assert.equal(data.goals[0].items[0].done,true);
  assert.equal(profile.timer,null);
  assert.deepEqual(decode(encode(data)).data,data);
});
test('calendar and category aggregation use real dates and total duration',()=>{
  const friday=new Date(2026,10,20,23,30);
  assert.equal(localDate(addDays(friday,1)),'2026-11-21');
  assert.equal(weekStart(friday),'2026-11-16');
  const rows=[
    {categoryId:'a',categoryName:'A',ms:4000},{categoryId:'b',categoryName:'B',ms:3000},
    {categoryId:'b',categoryName:'B',ms:3000}
  ];
  assert.equal(activityByCategory(rows)[0].id,'b');
});
test('backup JSON round trip restores profile, active timer and text; malformed imports fail',()=>{
  const data=empty();
  Object.assign(data.settings[0],{username:'Léa',theme:'peach',timer:newTimer(work,at)});
  data.assignments.push({...assignment});
  data.tasks.push({id:'task',assignmentId:'a1',title:'Read',done:false,due:null});
  data.notes.push({id:'a1',assignmentId:'a1',text:'<b>plain text</b>'});
  assert.deepEqual(decode(encode(data)).data,data);
  const rejects=[
    d=>d.settings[0].username=3,
    d=>d.settings[0].timer.categoryId='missing',
    d=>d.notes[0].id='another',
    d=>d.assignments[0].due='2026-02-30',
    d=>d.categories[0].color='red',
    d=>d.assignments.push({...assignment}),
    d=>d.settings[0].timer.status='paused',
    d=>d.assignments=[]
  ];
  for(const corrupt of rejects){
    const broken=structuredClone(data);
    corrupt(broken);
    assert.throws(()=>decode(encode(broken)));
  }
  assert.throws(()=>decode('{"version":0}'));
  assert.throws(()=>decode('{'));
});
test('service worker precaches every runtime asset and serves the shell without a network',async()=>{
  const root=new URL('../',import.meta.url);
  const script=await readFile(new URL('service-worker.js',root),'utf8');
  const listeners={};
  const manifests=new Map();
  let cacheName,claimed=false;
  const deleted=[];
  const scope='https://example.test/chapitre/';
  const self={registration:{scope},clients:{claim:async()=>{claimed=true;}},addEventListener:(kind,listener)=>{listeners[kind]=listener;}};
  const names=['other-cache','chapitre-shell-old'];
  const caches={
    open:async name=>{
      cacheName=name;
      return {
        addAll:async requests=>{for(const r of requests){
          const relative=r.url.slice(scope.length)||'index.html';
          const file=await readFile(new URL(relative,root));
          manifests.set(r.url,file);
        }},
        match:async value=>manifests.get(typeof value==='string'?value:value.url)
      };
    },
    keys:async()=>[...names,cacheName],
    delete:async name=>deleted.push(name)
  };
  const context=vm.createContext({self,caches,URL,Request,fetch:async()=>{throw new Error('Offline');}});
  context.importScripts=()=>vm.runInContext('const FONT_VERSION="test"; const FONT_ASSETS=[];',context);
  vm.runInContext(script,context);
  let pending;
  listeners.install({waitUntil:p=>{pending=p;}});
  await pending;
  const runtime=await readdir(new URL('js/',root));
  assert.ok(runtime.every(name=>manifests.has(scope+'js/'+name)));
  assert.ok(manifests.has(scope+'assets/apple-touch-icon.png'));
  listeners.activate({waitUntil:p=>{pending=p;}});
  await pending;
  assert.equal(claimed,true);
  assert.deepEqual(deleted,['chapitre-shell-old']);
  listeners.fetch({request:{url:scope,method:'GET',mode:'navigate'},respondWith:p=>{pending=p;}});
  assert.match((await pending).toString(),/Chapitre/);
  let unrelated=false;
  listeners.fetch({request:{url:scope+'personal.json',method:'GET',mode:'cors'},respondWith:()=>{unrelated=true;}});
  assert.equal(unrelated,false);
});
