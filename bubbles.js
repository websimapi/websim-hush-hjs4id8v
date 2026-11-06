export function createBubbles(world,host,getFairies){
 const events=new Map(),nodes=new Map(),waiting=new Set();let offset=0,clockSet=false;
 function syncClock(t){const sample=t-Date.now();offset=clockSet?offset*.9+sample*.1:sample;clockSet=true;}
 function add(list){for(const e of list){if(!['thought','speech'].includes(e.kind)||typeof e.text!=='string')continue;events.set(String(e.id),e);}}
 function listening(id,value){value?waiting.add(id):waiting.delete(id);}
 function clear(id){for(const [key,e] of events)if(e.fairy_id===id||e.partner_id===id)events.delete(key);nodes.get(id)?.remove();nodes.delete(id);waiting.delete(id);}
 function update(){
  const now=Date.now()+offset,fairies=new Map(getFairies().map(f=>[f.id,f])),chosen=new Map();
  for(const [id,e] of events){
   if(e.expires<=now){events.delete(id);continue;}
   if(e.at>now)continue;
   const f=fairies.get(e.fairy_id);
   if(!f)continue;
   if(e.audience==='public'&&(!f.online||!fairies.get(e.partner_id)?.online))continue;
   const old=chosen.get(e.fairy_id);if(!old||e.at>old.at||(e.at===old.at&&e.id>old.id))chosen.set(e.fairy_id,e);
  }
  for(const id of waiting)chosen.set(id,{id:'waiting',fairy_id:id,kind:'thought',text:'…'});
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
 return {add,update,listening,clear,syncClock};
}
