// Shared local simulation rules. The authoritative server keeps its own copy.
const clamp=(n,lo=-1,hi=1)=>Math.max(lo,Math.min(hi,n));
export function attitudeOf(f){
 const seed=(typeof f.appearance==='string'?JSON.parse(f.appearance):f.appearance)?.seed||1;
 const a=f.attitude||f;
 return {warmth:Number.isFinite(a.warmth)?a.warmth:((seed%97)/97-.5)*.5,
 trust:Number.isFinite(a.trust)?a.trust:.15,
 energy:Number.isFinite(a.energy)?a.energy:((seed%71)/71-.5)*.7,
 curiosity:Number.isFinite(a.curiosity)?a.curiosity:.35};
}
export function respondTo(current,text,strength=1,other=null){
 const a=attitudeOf({attitude:current}),t=String(text).toLowerCase().replace(/[’]/g,"'");
 const has=r=>r.test(t)?1:0;
 const cruel=has(/\b(hate|stupid|idiot|worthless|ugly|shut up|pathetic|loser|useless|shut it|go away)\b/);
 const hurt=has(/\b(don't like you|do not like you|don't trust you|leave me alone|nobody likes you)\b/);
 const kind=has(/\b(thank|thanks|kind|lovely|beautiful|wonderful|appreciate|proud|please|sorry|forgive|care|gentle|friend|love)\b/)*(1-has(/\b(don't|do not|never) (love|care|appreciate|trust)\b/));
 const playful=has(/\b(play|fun|laugh|haha|joke|dance|excited|adventure|yay)\b/);
 const peaceful=has(/\b(quiet|calm|rest|peace|soft|relax|patient|breathe)\b/);
 const curious=has(/\b(wonder|curious|discover|learn|explore|why|how|imagine|mystery)\b/);
 a.warmth=clamp(a.warmth+strength*(kind*.065-cruel*.095-hurt*.06));
 a.trust=clamp(a.trust+strength*(kind*.07-cruel*.12-hurt*.08));
 a.energy=clamp(a.energy+strength*(playful*.055-peaceful*.045+cruel*.025));
 a.curiosity=clamp(a.curiosity+strength*(curious*.045-cruel*.025));
 if(other){const o=attitudeOf({attitude:other});for(const k of ['warmth','energy','curiosity'])a[k]=clamp(a[k]+(o[k]-a[k])*.012*strength);}
 return a;
}
export function affinity(a,b){
 a=attitudeOf(a);b=attitudeOf(b);
 return clamp(.46-.52*Math.abs(a.warmth-b.warmth)-.27*Math.abs(a.energy-b.energy)+.13*(a.trust+b.trust)/2+.16*(a.warmth+b.warmth)/2);
}
export function describeAttitude(f){
 const a=attitudeOf(f);
 return [(a.warmth<-.35?'prickly':a.warmth>.35?'affectionate':'gentle but individual'),(a.trust<-.3?'guarded':a.trust>.45?'trusting':'cautiously open'),(a.energy<-.3?'quiet':a.energy>.3?'playful':'unhurried'),(a.curiosity>.4?'inquisitive':'thoughtful')].join(', ');
}
export function basePose(f,now){
 const a=typeof f.appearance==='string'?JSON.parse(f.appearance):f.appearance;
 const phase=(a.seed%10000)/10000*Math.PI*2,t=now/1000;
 return {x:a.x+Math.sin(t*.037+phase)*2.4+Math.sin(t*.071+phase*2)*.5,y:.2+Math.sin(t*.48+phase)*.17,z:a.z+Math.cos(t*.031+phase)*2.2,turn:Math.sin(t*.11+phase)*.055};
}
export function socialPoses(fairies,now){
 const original=new Map(fairies.map(f=>[f.id,basePose(f,now)])),bins=new Map();
 for(const f of fairies){const p=original.get(f.id),key=Math.floor(p.x/8)+','+Math.floor(p.z/8);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(f);}
 return fairies.map(f=>{
  const p={...original.get(f.id)};let dx=0,dz=0;const candidates=[],gx=Math.floor(p.x/8),gz=Math.floor(p.z/8);
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){let taken=0;for(const o of bins.get((gx+x)+','+(gz+z))||[]){if(o.id!==f.id){candidates.push(o);if(++taken>=16)break;}}}
  const neighbors=candidates.map(o=>{const q=original.get(o.id);return {o,q,d:Math.hypot(q.x-p.x,q.z-p.z)};}).filter(o=>o.d<8).sort((a,b)=>a.d-b.d).slice(0,8);
  for(const {o,q,d} of neighbors){
   const comfort=affinity(f,o),force=comfort<0?comfort*1.5*(1-d/8):comfort*.35*(1-d/8);
   dx+=(q.x-p.x)/Math.max(d,.5)*force;dz+=(q.z-p.z)/Math.max(d,.5)*force;
   if(d<1.8){dx-=(q.x-p.x)/Math.max(d,.5)*(1.8-d)*.35;dz-=(q.z-p.z)/Math.max(d,.5)*(1.8-d)*.35;}
  }
  p.x+=clamp(dx,-1.5,1.5);p.z+=clamp(dz,-1.5,1.5);return {id:f.id,...p};
 });
}
