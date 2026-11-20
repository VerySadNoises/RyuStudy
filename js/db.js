import {defaultSettings,defaultCategories,nowISO} from './model.js';

const NAME = 'chapitre-study-studio';
const VERSION = 2;
export const STORES = ['settings','assignments','subjects','categories','sessions','tasks','notes','goals'];
let database;
const changes = new EventTarget();
const channel = typeof window === 'object' && typeof BroadcastChannel === 'function' ? new BroadcastChannel(NAME) : null;
channel?.addEventListener('message',() => changes.dispatchEvent(new Event('external')));
export const onExternalChange = fn => changes.addEventListener('external',fn);

export function openDatabase(onVersionChange) {
  return new Promise((resolve,reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB is unavailable on this device.'));
    const request = indexedDB.open(NAME,VERSION);
    request.onupgradeneeded = event => {
      const db = request.result;
      const tx = request.transaction;
      if (event.oldVersion < 1) {
        for (const name of STORES) db.createObjectStore(name,{keyPath:'id'});
        tx.objectStore('settings').add(defaultSettings());
        for (const category of defaultCategories()) tx.objectStore('categories').add(category);
      }
      if (event.oldVersion < 2) {
        for (const name of ['sessions','tasks','goals']) {
          tx.objectStore(name).createIndex('assignmentId','assignmentId');
        }
        tx.objectStore('sessions').createIndex('date','date');
      }
    };
    request.onblocked = () => reject(new Error('Close other Chapitre windows, then reload to open your storage.'));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => { database.close(); onVersionChange(); };
      resolve();
    };
  });
}

function transaction(names,mode,work) {
  return new Promise((resolve,reject) => {
    let tx;
    try {
      try {
        tx = mode === 'readwrite'
          ? database.transaction(names,mode,{durability:'strict'})
          : database.transaction(names,mode);
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        tx = database.transaction(names,mode);
      }
    } catch (error) {
      reject(error);
      return;
    }
    let failure;
    let result;
    const guard = fn => event => {
      try { fn(event); }
      catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure || tx.error || new Error('The transaction was interrupted.'));
    guard(() => work(name => tx.objectStore(name),guard,value => { result = value; }))();
  });
}

export function savedAt() {
  return transaction(['settings'],'readonly',(store,guard,finish) => {
    const request = store('settings').get('profile');
    request.onsuccess = guard(() => finish(request.result?.lastSaved));
  });
}

export function snapshot() {
  return transaction(STORES,'readonly',(store,guard,finish) => {
    const data = {};
    finish(data);
    for (const name of STORES) {
      const request = store(name).getAll();
      request.onsuccess = guard(() => { data[name] = request.result; });
    }
  });
}

// Read and write in the same IDB transaction so concurrent tabs see the latest state.
export async function mutate(apply) {
  const result = await transaction(STORES,'readwrite',(store,guard,finish) => {
    const data = {};
    let pending = STORES.length;
    for (const name of STORES) {
      const request = store(name).getAll();
      request.onsuccess = guard(() => {
        data[name] = request.result;
        if (--pending) return;
        const profile = data.settings.find(row => row.id === 'profile');
        const edits = {
          data, profile,
          put: (key,row) => store(key).put(row),
          add: (key,row) => store(key).add(row),
          remove: (key,id) => store(key).delete(id),
          find: (key,id) => data[key].find(row => row.id === id)
        };
        finish(apply(edits));
        edits.put('settings',{...profile,lastSaved:nowISO()});
      });
    }
  });
  channel?.postMessage('saved');
  return result;
}

export async function replaceAll(data) {
  await transaction(STORES,'readwrite',store => {
    for (const name of STORES) {
      const table = store(name);
      table.clear();
      for (const row of data[name]) table.add(name === 'settings' ? {...row,lastSaved:nowISO()} : row);
    }
  });
  channel?.postMessage('replaced');
}
export const reset = () => replaceAll(Object.fromEntries(STORES.map(name => [
  name,name === 'settings' ? [defaultSettings()] : name === 'categories' ? defaultCategories() : []
])));
