import {createSpeechQueue} from './speech-queue.js';
import {canSpeak} from './language.js';
export function createBubbles(world,host,getFairies,isAfk=()=>false){
 const queue=createSpeechQueue(),nodes=new Map();let offset=0,clockSet=false;
 function syncClock(t){const sample=t-Date.now();offset=clockSet?offset*.9+sample*.1:sample;clockSet=true;}
 function add(list){queue.add(list,Date.now()+offset);}
 function listening(id,value){if(value)queue.pause(id,Date.now()+offset);else queue.resume(id);}
 function respond(id,list){queue.respond(id,list,Date.now()+offset);}
 function clear(id){queue.clear(id);nodes.get(id)?.remove();nodes.delete(id);}
 document.addEventListener('visibilitychange',()=>queue.suspend());
 function update(){
  const fairies=new Map(getFairies().map(f=>[f.id,f])),visible=new Set();
  if(!document.hidden)for(const [id] of fairies){const p=world.project(id,1.12);if(p?.visible&&p.distance<40)visible.add(id);}
  const chosen=queue.current(Date.now()+offset,visible,performance.now(),e=>!isAfk()||e.kind==='thought'||!!e.partner_id);
  for(const [id,f] of fairies)if(!canSpeak(f)){queue.clear(id);chosen.delete(id);}
  for(const [id,node] of nodes)if(!chosen.has(id)){node.remove();nodes.delete(id);}
  for(const [id,e] of chosen){
   const p=world.project(id,1.12),f=fairies.get(id);let node=nodes.get(id);
   if(!node){node=document.createElement('div');node.className='world-bubble';node.setAttribute('role','status');host.append(node);nodes.set(id,node);}
   node.hidden=!p?.visible||p.distance>40;
   if(node.hidden)continue;
   if(node.dataset.event!==String(e.id)){
    node.dataset.event=String(e.id);node.className='world-bubble '+e.kind+(e.id==='waiting'?' waiting':'');
    const name=document.createElement('small');name.textContent=f?.name||'';
    const text=document.createElement('p');text.textContent=e.text;
    node.replaceChildren(name,text);node.setAttribute('aria-label',(f?.name||'Fairy')+(e.kind==='thought'?' thinks: ':' says: ')+e.text);
   }
   const half=Math.min(innerWidth-24,270)/2;
   const x=Math.min(innerWidth-half-12,Math.max(half+12,p.x));
   node.style.left=x+'px';node.style.top=Math.max(node.offsetHeight+16,p.y)+'px';
   node.style.opacity=String(Math.min(1,Math.max(0,(40-p.distance)/8)));
   node.style.setProperty('--tail-shift',Math.max(-100,Math.min(100,p.x-x))+'px');
  }
 }
 return {add,update,listening,respond,clear,syncClock};
}
