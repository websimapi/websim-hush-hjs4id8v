import * as THREE from 'three';
import {livingWool,addBodyAurora,wingAurora} from './fairy-effects.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const low=new URLSearchParams(location.search).get('gpu')==='false'||!!window.websim?.lowGpu;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const Y=new THREE.Vector3(0,1,0);
function woolGeometry(){
 const v=[],n=[],ix=[],rings=6,sides=5;
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=.0115*Math.pow(1-t,.65)+.001;
  for(let k=0;k<sides;k++){
   const a=k/sides*Math.PI*2;
   v.push(Math.sin(t*4.6)*.019+Math.cos(a)*r,t*.115,Math.sin(t*5.8)*.012+Math.sin(a)*r);
   n.push(Math.cos(a),.12,Math.sin(a));
   if(j<rings-1){const p=j*sides+k,q=j*sides+(k+1)%sides;ix.push(p,q,p+sides,q,q+sides,p+sides);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
function wingGeometry(length,width){
 const v=[],uv=[],ix=[];const steps=32;
 for(let i=0;i<=steps;i++){
  const t=i/steps,w=Math.pow(Math.sin(Math.PI*t),.82)*width*(.65+t*.35),bend=Math.sin(t*Math.PI)*.075;
  v.push(bend-w,length*t,Math.sin(t*Math.PI)*.04,bend+w,length*t,Math.sin(t*Math.PI)*.04);uv.push(0,t,1,t);
  if(i<steps){const p=i*2;ix.push(p,p+1,p+2,p+1,p+3,p+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
const tuftGeometry=woolGeometry();
export function createWorld(host,{onSelect,onHover}){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f2eef4');scene.fog=new THREE.Fog('#f2eef4',35,90);
 const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);camera.position.set(0,1.1,8.1);
 const renderer=new THREE.WebGLRenderer({antialias:!low,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;host.appendChild(renderer.domElement);
 let composer;
 if(!low){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.72,.72,1.08));composer.addPass(new OutputPass());}
 scene.add(new THREE.HemisphereLight('#fffafd','#b1a2bd',2.4));
 const sun=new THREE.DirectionalLight('#fff5ed',3.5);sun.position.set(-3,5,5);scene.add(sun);
 const rim=new THREE.DirectionalLight('#e9dcff',2);rim.position.set(3,1,-3);scene.add(rim);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!low;controls.dampingFactor=.065;controls.enablePan=true;controls.minDistance=2.8;controls.maxDistance=65;controls.maxPolarAngle=Math.PI*.64;controls.minPolarAngle=Math.PI*.22;controls.target.set(0,.25,0);controls.rotateSpeed=.4;controls.panSpeed=.5;controls.zoomSpeed=.55;
 const effectTime={value:0};
 const fairies=new Map(),hits=[],frames=new Map();let selectedId=null,ownId=null,focus=null,lastRender=0,dirty=true,hovered=null,framed=false,followId=null,followPrevious=null;
 const mist=null;
 const dummy=new THREE.Object3D(),baseGeo=new THREE.SphereGeometry(.65,low?24:48,low?18:32);
 function createFairy(data,hero=false,index=0){
  const a=data.appearance,random=rng(a.seed),group=new THREE.Group();
  const hue=a.hue, sat=a.saturation,light=a.lightness;
  const glowPhase=(a.seed%10000)/10000*Math.PI*2;
  const baseColor=new THREE.Color().setHSL(hue,sat,light);
  const bodyMat=low?new THREE.MeshBasicMaterial({color:baseColor}):new THREE.MeshStandardMaterial({color:baseColor,roughness:1,emissive:baseColor,emissiveIntensity:.12});
  if(!low)livingWool(bodyMat,{time:effectTime,phase:glowPhase,color:baseColor,reduced});
  const body=new THREE.Mesh(baseGeo,bodyMat);body.userData.fairy=data.id;group.add(body);hits.push(body);
  const count=low?(hero?2800:200):hero?12000:index<28?1300:70;
  const furMat=low?new THREE.MeshBasicMaterial({color:'#ffffff'}):new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,emissive:baseColor,emissiveIntensity:.18});
  if(!low)livingWool(furMat,{time:effectTime,phase:glowPhase,color:baseColor,fur:true,reduced});
  const fur=new THREE.InstancedMesh(tuftGeometry,furMat,count);fur.frustumCulled=false;
  const color=new THREE.Color();
  for(let i=0;i<count;i++){
   const y=1-2*(i+.5)/count,angle=i*Math.PI*(3-Math.sqrt(5))+(random()-.5)*.18,r=Math.sqrt(1-y*y);
   const normal=new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r);
   dummy.position.copy(normal).multiplyScalar(.64+(random()-.5)*.012);
   dummy.quaternion.setFromUnitVectors(Y,normal);dummy.rotateY(random()*Math.PI*2);
   const len=a.furLength/.115*(.65+random()*.6);dummy.scale.setScalar(.75+random()*.55);dummy.scale.y=len;
   dummy.updateMatrix();fur.setMatrixAt(i,dummy.matrix);
   color.setHSL(hue+(random()-.5)*.027,sat*(.7+random()*.3),Math.min(.88,light+(random()-.35)*.19+(y*.05)));
   fur.setColorAt(i,color);
  }
  group.add(fur);
  const wings=[];
  for(const side of [-1,1]) for(let upper=0;upper<2;upper++){
   const top=upper===0,len=a.wingLength*(top?1.18:.83),width=top?.11:.082;
   const hinge=new THREE.Group();hinge.position.set(side*(top?.81:.79),top?.25:-.16,-.1);
   hinge.rotation.z=side*(top?-.78:-2.12);
   const wingMat=low?new THREE.MeshBasicMaterial({color:'#fffaff',side:THREE.DoubleSide,transparent:true,opacity:.95}):new THREE.MeshStandardMaterial({color:'#fffaff',emissive:'#fff5ff',emissiveIntensity:2.4,side:THREE.DoubleSide,roughness:.4,transparent:true,opacity:.85,depthWrite:false});
   if(!low)hinge.add(wingAurora(wingGeometry(len*1.08,width*3.5),{time:effectTime,phase:glowPhase+upper+side,color:baseColor,reduced}));
   const wing=new THREE.Mesh(wingGeometry(len,width),wingMat);wing.renderOrder=4;hinge.add(wing);
   const pts=[];for(let j=0;j<16;j++){const t=j/15;pts.push(new THREE.Vector3(Math.sin(t*Math.PI)*.075,len*t,Math.sin(t*Math.PI)*.04+.006));}
   const vein=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.0025,3,false),new THREE.MeshBasicMaterial({color:'#eadff3',transparent:true,opacity:.38}));hinge.add(vein);
   group.add(hinge);wings.push({hinge,base:hinge.rotation.z,side,phase:upper*.9});
  }
  if(!low)addBodyAurora(group,{time:effectTime,phase:glowPhase,color:baseColor,reduced});
  if(data.pose)group.position.set(data.pose.x,data.pose.y,data.pose.z);else group.position.set(a.x,.2,a.z);
  scene.add(group);
  return {data,group,wings,body,fur,hero,phase:random()*Math.PI*2,base:new THREE.Vector3(data.pose?.x??a.x,data.pose?.y??.2,data.pose?.z??a.z),hover:0};
 }
 function clearFairy(f){
  scene.remove(f.group);const at=hits.indexOf(f.body);if(at>=0)hits.splice(at,1);
  f.group.traverse(o=>{if(o.isMesh){if(o.geometry!==baseGeo&&o.geometry!==tuftGeometry)o.geometry.dispose();if(o.material)o.material.dispose();if(o.isInstancedMesh)o.dispose();}});
 }
 function setFairies(list,id){
  const changedOwn=ownId!==id;ownId=id;if(!list.length){framed=false;focus=null;followId=null;followPrevious=null;}
  const ids=new Set(list.map(f=>f.id));
  for(const [key,f] of fairies){if(!ids.has(key)){clearFairy(f);fairies.delete(key);frames.delete(key);if(followId===key){followId=null;followPrevious=null;}}}
  list.forEach((data,i)=>{
   let f=fairies.get(data.id);const hero=data.id===ownId||data.id==='preview';
   if(f&&(JSON.stringify(f.data.appearance)!==JSON.stringify(data.appearance)||f.hero!==hero)){clearFairy(f);fairies.delete(data.id);f=null;}
   if(!f){f=createFairy(data,hero,i);fairies.set(data.id,f);}else f.data=data;
  });
  if(list.length&&(!framed||changedOwn)){home(true);framed=true;}
  dirty=true;
 }
 function home(immediate=false){
  const f=fairies.get(ownId)||fairies.get('preview')||fairies.values().next().value;if(!f)return;
  const target=f.group.position.clone().add(new THREE.Vector3(0,.25,0));
  const distance=innerWidth<700?10.5:7.7;
  const position=target.clone().add(new THREE.Vector3(0,.65,distance));
  if(immediate||low){controls.target.copy(target);camera.position.copy(position);controls.update();}else focus={target,position};
  dirty=true;
 }
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 function pick(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(hits,false)[0]?.object.userData.fairy;}
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};focus=null;followId=null;followPrevious=null;});
 renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const id=pick(e);if(id){selectedId=id;onSelect(fairies.get(id).data);}}down=null;});
 renderer.domElement.addEventListener('pointermove',e=>{const id=pick(e);hovered=id;renderer.domElement.style.cursor=id?'pointer':down?'grabbing':'grab';if(onHover)onHover(id?fairies.get(id).data:null,e);dirty=true;});
 renderer.domElement.addEventListener('pointerleave',()=>{hovered=null;onHover?.(null);});
 controls.addEventListener('change',()=>{dirty=true;});
 function project(id,above=1.2){
  const f=fairies.get(id);if(!f)return null;
  const p=f.group.position.clone().add(new THREE.Vector3(0,above,0)).project(camera);
  return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,visible:p.z<1&&p.z>-1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.3,distance:camera.position.distanceTo(f.group.position)};
 }
 let anchorCallback=()=>{};
 function animate(now){
  requestAnimationFrame(animate);
  const t=Date.now()/1000;
  effectTime.value=performance.now()/1000;
  // Only server snapshots move a fairy. Interpolate 220 ms behind the room.
  for(const f of fairies.values()){
   const timeline=frames.get(f.data.id),renderAt=performance.now()-220;
   if(timeline?.length){
    let left=timeline[0],right=timeline[timeline.length-1];
    for(let i=1;i<timeline.length;i++)if(timeline[i].time>=renderAt){left=timeline[i-1];right=timeline[i];break;}
    const alpha=right.time===left.time?1:THREE.MathUtils.clamp((renderAt-left.time)/(right.time-left.time),0,1);
    f.group.position.set(THREE.MathUtils.lerp(left.x,right.x,alpha),THREE.MathUtils.lerp(left.y,right.y,alpha),THREE.MathUtils.lerp(left.z,right.z,alpha));
    f.group.rotation.z=reduced?0:THREE.MathUtils.lerp(left.turn||0,right.turn||0,alpha);
   }
   for(const w of f.wings){w.hinge.rotation.y=reduced?0:Math.sin(t*3.7+w.phase+f.phase)*.20*w.side;w.hinge.rotation.z=w.base+(reduced?0:Math.sin(t*2.5+f.phase)*.025*w.side);}
   if(low&&!reduced)f.fur.scale.setScalar(1+Math.sin(t*1.3+f.phase)*.012);
   f.hover=THREE.MathUtils.lerp(f.hover,hovered===f.data.id?1:0,.08);f.group.scale.setScalar(1+f.hover*.018);
  }
  if(focus?.target){camera.position.lerp(focus.position,.055);controls.target.lerp(focus.target,.055);if(camera.position.distanceTo(focus.position)<.015)focus=null;}
  if(followId){const f=fairies.get(followId);if(f){if(followPrevious){const delta=f.group.position.clone().sub(followPrevious);camera.position.add(delta);controls.target.add(delta);}followPrevious=f.group.position.clone();}}
  controls.update();anchorCallback();
  if(low&&now-lastRender<1000&&!dirty)return;
  if(low&&now-lastRender<150)return;
  if(mist)mist.rotation.y=Math.sin(t*.02)*.04;
  composer?composer.render():renderer.render(scene,camera);lastRender=now;dirty=false;
 }
 requestAnimationFrame(animate);
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight);dirty=true;});
 function applySnapshot(poses){
  const time=performance.now();for(const p of poses){if(![p.x,p.y,p.z].every(Number.isFinite))continue;const timeline=frames.get(p.id)||[];timeline.push({...p,time});while(timeline.length>5)timeline.shift();frames.set(p.id,timeline);}dirty=true;
 }
 return {setFairies,home,project,applySnapshot,follow:id=>{followId=id;followPrevious=null;},setAnchorCallback:fn=>{anchorCallback=fn;},get ownId(){return ownId;}};
}
