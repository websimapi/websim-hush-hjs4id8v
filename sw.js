const CACHE='hush-device-shell-v4';
const FILES=['./','index.html','app.js','style.css','scene.js','fairy-effects.js','bubbles.js','multiplayer.js','offline.js','temperament.js','admin.js','title-ui.js','mood.js','physical.js'];
const ROOTS=['https://esm.sh/three@0.170.0',...['controls/OrbitControls','postprocessing/EffectComposer','postprocessing/RenderPass','postprocessing/UnrealBloomPass','postprocessing/OutputPass'].map(p=>'https://esm.sh/three@0.170.0/examples/jsm/'+p+'.js')];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await Promise.all(FILES.map(async path=>{try{const response=await fetch(new URL(path,self.location),{cache:'reload'});if(response.ok)await cache.put(new URL(path,self.location),response);}catch{}}));
 // Cache public immutable ESM dependencies, never API or account responses.
 const seen=new Set();async function warm(url){if(seen.has(url)||seen.size>=80)return;seen.add(url);try{const r=await fetch(url);if(!r.ok)return;await cache.put(url,r.clone());if(r.url!==url)await cache.put(r.url,r.clone());const source=await r.text(),imports=[...source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)].map(m=>m[1]).filter(p=>p.startsWith('/')||p.startsWith('.'));await Promise.all(imports.map(p=>warm(new URL(p,r.url).href)));}catch{}}
 await Promise.all(ROOTS.map(warm));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('hush-device-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;
 const local=url.origin===self.location.origin,asset=FILES.some(p=>url.pathname===new URL(p,self.location).pathname);
 const publicCDN=url.hostname==='esm.sh'||url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com';
 if((local&&!asset)||(!local&&!publicCDN))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(!local){const hit=await cache.match(request);if(hit)return hit;}
 try{const response=await fetch(request);if(response.ok||response.type==='opaque')await cache.put(request,response.clone());return response;}catch(e){const saved=await cache.match(request);if(saved)return saved;if(request.mode==='navigate'){const shell=await cache.match(new URL('./',self.location));if(shell)return shell;}throw e;}
 })());
});
