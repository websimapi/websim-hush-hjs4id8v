// One display lane per fairy. Direct input is a barrier until its AI reply arrives.
export function createSpeechQueue(){
 const lanes=new Map(),seen=new Set();
 const lane=id=>{if(!lanes.has(id))lanes.set(id,{pending:[],active:null,waiting:false});return lanes.get(id);};
 function add(events,now=Date.now()){
  for(const e of events){const key=String(e.id);if(seen.has(key)||!['speech','thought'].includes(e.kind)||!e.text?.trim()||e.expires<=now)continue;
   seen.add(key);lane(e.fairy_id).pending.push({event:e,key,ready:e.at,duration:Math.max(7000,Math.min(e.kind==='speech'?24000:9000,e.expires-e.at)),remaining:null,priority:0});
  }
 }
 function pause(id,now=Date.now()){
  const l=lane(id);for(const item of l.pending)item.priority=0;if(l.active)l.active.priority=0;l.waiting=true;if(l.active){const item=l.active;item.remaining=Math.max(7000,item.remaining??item.duration);l.pending.unshift(item);l.active=null;}
 }
 function respond(id,events,now=Date.now()){
  add(events,now);const l=lane(id),ids=new Set(events.filter(e=>e.fairy_id===id).map(e=>String(e.id)));
  for(const item of l.pending)if(ids.has(item.key)){item.priority=1;item.ready=now;}
  l.pending.sort((a,b)=>b.priority-a.priority||(a.priority&&b.priority?(a.event.kind==='speech'?0:1)-(b.event.kind==='speech'?0:1):0));
  l.waiting=false;
 }
 function current(now=Date.now(),visible=null,clock=now,allow=null){
  const result=new Map();for(const [id,l] of lanes){
   const showing=visible===null||visible.has(id),elapsed=l.lastTick==null?0:Math.max(0,clock-l.lastTick);l.lastTick=clock;
   if(l.waiting){l.wasVisible=false;continue;}
   // Only readable time in the scene counts toward a bubble's lifetime.
   if(l.active&&showing&&l.wasVisible)l.active.remaining-=elapsed;
   if(l.active&&l.active.remaining<=0)l.active=null;
   if(!l.active&&showing){const i=l.pending.findIndex(item=>item.ready<=now&&(item.priority>0||!allow||allow(item.event)));if(i>=0){l.active=l.pending.splice(i,1)[0];l.active.remaining??=l.active.duration;}}
   l.wasVisible=showing;
   if(l.active)result.set(id,l.active.event);
  }return result;
 }
 function suspend(){for(const l of lanes.values()){l.lastTick=null;l.wasVisible=false;}}
 function clear(id){lanes.delete(id);}
 return {add,pause,respond,current,clear,suspend};
}
