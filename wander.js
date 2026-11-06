import {attitudeOf,affinity} from './temperament.js';
// Private-world choices are simulated locally; social-world poses stay server-owned.
export function createWander(){
 const states=new Map();let previous=null;
 const random=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
 return function poses(fairies,now=Date.now()){
  const dt=previous===null?0:Math.max(0,Math.min(.25,(now-previous)/1000));previous=now;
  const ids=new Set(fairies.map(f=>f.id));for(const id of states.keys())if(!ids.has(id))states.delete(id);
  for(const f of fairies)if(!states.has(f.id)){const a=f.appearance;states.set(f.id,{seed:a.seed>>>0,x:a.x,y:.2,z:a.z,vx:0,vz:0,tx:a.x,tz:a.z,next:0,turn:0});}
  return fairies.map(f=>{
   const s=states.get(f.id),a=attitudeOf(f),origin=f.appearance;
   if(now>=s.next){
    // Rest, explore, or approach a compatible neighbor, according to temperament.
    const choice=random(s),others=fairies.filter(o=>o.id!==f.id&&affinity(f,o)>.2);
    if(choice<.18-a.energy*.1){s.tx=s.x;s.tz=s.z;}
    else if(others.length&&choice<.45+a.warmth*.15){const other=states.get(others[Math.floor(random(s)*others.length)].id),angle=random(s)*Math.PI*2;s.tx=other.x+Math.cos(angle)*2.4;s.tz=other.z+Math.sin(angle)*2.4;}
    else{const angle=random(s)*Math.PI*2,radius=1.5+random(s)*(3.5+Math.max(0,a.curiosity));s.tx=origin.x+Math.cos(angle)*radius;s.tz=origin.z+Math.sin(angle)*radius;}
    s.next=now+6000+random(s)*12000;
   }
   const dx=s.tx-s.x,dz=s.tz-s.z,d=Math.hypot(dx,dz),speed=Math.min(.24+a.energy*.08,d*.35),blend=1-Math.exp(-dt*1.8);
   s.vx+=((d>.08?dx/d*speed:0)-s.vx)*blend;s.vz+=((d>.08?dz/d*speed:0)-s.vz)*blend;
   s.x+=s.vx*dt;s.z+=s.vz*dt;
   const phase=(origin.seed%10000)/10000*Math.PI*2;
   s.y+=(.2+Math.sin(now/1000*.48+phase)*.12-s.y)*(1-Math.exp(-dt*2));
   s.turn+=(-s.vx*.18-s.turn)*blend;
   return {id:f.id,x:s.x,y:s.y,z:s.z,turn:s.turn};
  });
 };
}
