/* Bump the cache suffix for every release that changes the offline shell. */
const PREFIX='chapitre-shell-';
importScripts('./font-assets.js');
const CACHE=PREFIX+'v6-'+FONT_VERSION;
const SCOPE=self.registration.scope;
const FILES=[
  './','./index.html','./styles.css','./fonts.css','./font-assets.js',...FONT_ASSETS,'./manifest.webmanifest','./assets/cat.svg',
  './assets/IMG_6566.GIF','./assets/IMG_6567.GIF','./assets/IMG_6575.GIF','./assets/IMG_6569.GIF',
  './assets/IMG_6690.PNG','./assets/sound/EndingBell.mp3','./js/media.js',
  './assets/icon-192-logo-6690.png','./assets/icon-512-logo-6690.png','./assets/maskable-512-logo-6690.png',
  './assets/apple-touch-icon.png','./assets/icon-192.png','./assets/icon-512.png','./assets/maskable-512.png',

  './js/install-android.js','./js/app.js','./js/model.js','./js/db.js','./js/ui.js','./js/assignments.js','./js/pomodoro.js',
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
  if(request.url===new URL('./manifest.webmanifest',SCOPE).href){
    event.respondWith((async()=>{
      try{
        const live=await fetch(request,{cache:'no-cache'});
        if(live.ok) return live;
      }catch{}
      const cache=await caches.open(CACHE);
      return await cache.match(request) || Response.error();
    })());
    return;
  }
  if(request.mode==='navigate' && (path===root || path===root+'index.html')){
    event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(new URL('./index.html',SCOPE).href) || fetch(request)));
  }else if(urls.has(request.url)){
    event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(request) || fetch(request)));
  }
});
