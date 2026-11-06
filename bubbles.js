import {createSpeechQueue} from './speech-queue.js';
export function createBubbles(world,host,getFairies,isAfk=()=>false){
 const queue=createSpeechQueue(),nodes=new Map(),anchors=new Map();let offset=0,clockSet=false;
 function syncClock(t){const sample=t-Date.now();offset=clockSet?offset*.9+sample*.1:sample;clockSet=true;}
 function add(list){queue.add(list,Date.now()+offset);}
 function listening(id,value){if(value)queue.pause(id,Date.now()+offset);else queue.resume(id);}
 function respond(id,list){queue.respond(id,list,Date.now()+offset);}
 function clear(id){queue.clear(id);nodes.get(id)?.remove();nodes.delete(id);anchors.delete(id);}
 document.addEventListener('visibilitychange',()=>queue.suspend());
 function update(){
  const fairies=new Map(getFairies().map(f=>[f.id,f])),visible=new Set(),projections=new Map();
  for(const [id] of fairies){const p=world.project(id,1.12);projections.set(id,p);if(!document.hidden&&p?.visible&&p.distance<40)visible.add(id);}
  // Once a message has appeared, keep it on screen for its reading window even
  // if a snapshot, camera movement or temporary missing profile loses the anchor.
  if(!document.hidden)for(const id of nodes.keys())visible.add(id);
  const chosen=queue.current(Date.now()+offset,visible,performance.now(),e=>!isAfk()||e.kind==='thought'||!!e.partner_id);
  // Voice eligibility is checked when generating events, not here: refreshing a
  // partial/stale fairy profile must never erase an already delivered message.
  for(const [id,node] of nodes)if(!chosen.has(id)){node.remove();nodes.delete(id);anchors.delete(id);}
  for(const [id,e] of chosen){
   const p=projections.get(id),f=fairies.get(id);let node=nodes.get(id);
   if(!node){if(!visible.has(id))continue;node=document.createElement('div');node.className='world-bubble';node.setAttribute('role','status');host.append(node);nodes.set(id,node);}
   node.hidden=document.hidden;
   if(node.dataset.event!==String(e.id)){
    node.dataset.event=String(e.id);node.className='world-bubble '+e.kind;
    const name=document.createElement('small');name.textContent=f?.name||'';
    const text=document.createElement('p');text.textContent=e.text;
    node.replaceChildren(name,text);node.setAttribute('aria-label',(f?.name||'Fairy')+(e.kind==='thought'?' thinks: ':' says: ')+e.text);
   }
   if(p?.visible&&p.distance<40&&Number.isFinite(p.x)&&Number.isFinite(p.y))anchors.set(id,{x:p.x,y:p.y});
   const anchor=anchors.get(id)||{x:innerWidth/2,y:innerHeight/2};
   const half=Math.min(innerWidth-24,node.offsetWidth||270)/2;
   const x=Math.min(innerWidth-half-12,Math.max(half+12,anchor.x));
   node.style.left=x+'px';node.style.top=Math.min(innerHeight-28,Math.max(node.offsetHeight+16,anchor.y))+'px';
   node.style.opacity='1';
   node.style.setProperty('--tail-shift',Math.max(-100,Math.min(100,anchor.x-x))+'px');
  }
 }
 return {add,update,listening,respond,clear,syncClock};
}
