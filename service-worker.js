/* Bump the cache suffix for every release that changes the offline shell. */
const PREFIX='chapitre-shell-';
importScripts('./font-assets.js');
const CACHE=PREFIX+'v3-'+FONT_VERSION;
const SCOPE=self.registration.scope;
const FILES=[
  './','./index.html','./styles.css','./fonts.css','./font-assets.js',...FONT_ASSETS,'./manifest.webmanifest','./assets/cat.svg',
  './assets/apple-touch-icon.png','./assets/icon-192.png','./assets/icon-512.png','./assets/maskable-512.png',

  './js/app.js','./js/model.js','./js/db.js','./js/ui.js','./js/assignments.js','./js/pomodoro.js',
  './js/timer.js','./js/visuals.js','./js/settings.js','./js/backup.js'
];
const urls=new Set(FILES.map(path=>new URL(path,SCOPE).href));
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll([...urls].map(url=>new Request(url,{cache:'reload'})));
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX) && key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET' || !request.url.startsWith(SCOPE)) return;
  const path=new URL(request.url).pathname;
  const root=new URL(SCOPE).pathname;
  if(request.mode==='navigate' && (path===root || path===root+'index.html')){
    event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(new URL('./index.html',SCOPE).href) || fetch(request)));
  }else if(urls.has(request.url)){
    event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(request) || fetch(request)));
  }
});
