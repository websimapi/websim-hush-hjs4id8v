import * as THREE from 'three';

// Cosmetic only: these shaders never alter a fairy's authoritative position.
const spectrum = `
vec3 auroraPalette(float t, vec3 heart) {
 vec3 mint=vec3(.22,.95,.70), blue=vec3(.28,.64,1.0), violet=vec3(.76,.36,1.0);
 float drift=.5+.5*sin(t);
 vec3 light=mix(mint,blue,smoothstep(.05,.78,drift));
 light=mix(light,violet,.5+.5*sin(t*.71+2.0));
 return mix(light,heart,.32);
}
`;

export function livingWool(material,{time,phase,color,mood,fur=false,reduced=false}) {
 material.onBeforeCompile=shader=>{
  shader.uniforms.uMoodGlow=mood.glow;shader.uniforms.uMoodTint=mood.tint;shader.uniforms.uMoodColor=mood.color;
  shader.uniforms.uFairyTime=time;
  shader.uniforms.uFairyPhase={value:phase};
  shader.uniforms.uFairyHeart={value:color};
  shader.uniforms.uFairyMotion={value:reduced?0:1};
  const common=`uniform float uMoodGlow,uMoodTint;uniform vec3 uMoodColor;uniform float uFairyTime;uniform float uFairyPhase;uniform vec3 uFairyHeart;uniform float uFairyMotion;varying vec3 vFairyRoot;varying float vFairyTip;`;
  shader.vertexShader=common+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
   #include <begin_vertex>
   vec3 fairyRoot=position;
   #ifdef USE_INSTANCING
    fairyRoot=instanceMatrix[3].xyz;
   #endif
   vFairyRoot=fairyRoot;
   vFairyTip=clamp(position.y/.115,0.0,1.0);
   `+(fur?`
    float wave=sin(dot(fairyRoot,vec3(4.2,5.4,3.1))+uFairyTime*1.55+uFairyPhase);
    float wave2=sin(dot(fairyRoot,vec3(-3.0,2.7,5.0))-uFairyTime*.95+uFairyPhase);
    float tipWeight=vFairyTip*vFairyTip*uFairyMotion;
    transformed.x+=tipWeight*(wave*.017+wave2*.006);
    transformed.z+=tipWeight*(wave2*.014);
    transformed.y*=1.0+wave*.15*vFairyTip*uFairyMotion;
   `:''));
  shader.fragmentShader=common+spectrum+shader.fragmentShader;
  if(fur)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,uMoodColor,uMoodTint*.38);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
   #include <emissivemap_fragment>
   float fairyFlow=dot(vFairyRoot,vec3(3.4,4.8,2.2))+uFairyTime*.65*uFairyMotion+uFairyPhase;
   float fairyBand=pow(.5+.5*sin(fairyFlow),3.0);
   vec3 fairyLight=mix(auroraPalette(fairyFlow*.52,uFairyHeart),uMoodColor,uMoodTint*.70);
   totalEmissiveRadiance+=fairyLight*(`+(fur?'0.20+fairyBand*.75*(.3+.7*vFairyTip)':'0.16+fairyBand*.27')+`)*uMoodGlow;
  `);
 };
 material.customProgramCacheKey=()=>fur?'living-wool-v2':'living-heart-v2';
}

function auraMaterial({time,phase,color,mood,layer=0,wing=false,reduced=false}) {
 return new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,side:THREE.FrontSide,toneMapped:false,
  uniforms:{uMoodGlow:mood.glow,uMoodTint:mood.tint,uMoodColor:mood.color,uTime:time,uPhase:{value:phase},uHeart:{value:color},uLayer:{value:layer},uMotion:{value:reduced?0:1}},
  vertexShader: `
   uniform float uTime,uPhase,uLayer,uMotion;
   varying vec3 vLocal,vNormal,vView;varying vec2 vUv;
   void main(){
    vUv=uv;vec3 p=position;
    `+(wing?`
     float tip=sin(uv.y*3.14159265);
     p.z+=sin(uv.y*9.0-uTime*1.15*uMotion+uPhase)*.045*tip*uMotion;
    `:`
     float a=atan(p.z,p.x);
     float ripple=sin(a*5.0+p.y*5.0-uTime*.6*uMotion+uPhase)*.035;
     ripple+=sin(a*9.0-p.y*3.0+uTime*.4*uMotion+uPhase)*.016;
     p*=1.0+ripple*uMotion;
    `)+`
    vLocal=p;vec4 view=modelViewMatrix*vec4(p,1.0);
    vNormal=normalize(normalMatrix*normal);vView=normalize(-view.xyz);
    gl_Position=projectionMatrix*view;
   }
  `,
  fragmentShader: `
   uniform float uTime,uPhase,uLayer,uMotion,uMoodGlow,uMoodTint;uniform vec3 uHeart,uMoodColor;
   varying vec3 vLocal,vNormal,vView;varying vec2 vUv;
   `+spectrum+`
   void main(){
    float time=uTime*uMotion;
    `+(wing?`
     float sweep=vUv.y*10.0-time*.85+uPhase;
     float filament=.4+.6*pow(.5+.5*sin(sweep+sin(vUv.x*7.0+time*.6)),2.0);
     float fade=pow(max(0.0,sin(vUv.x*3.14159265)),1.7)*pow(max(0.0,sin(vUv.y*3.14159265)),.65);
     vec3 color=auroraPalette(sweep*.5+vUv.x*2.0,uHeart);
     float alpha=fade*(.20+filament*.36);
    `:`
     float angle=atan(vLocal.z,vLocal.x);
     float latitude=vLocal.y/length(vLocal);
     float sweep=angle*4.0+latitude*5.0-time*.55+uPhase+uLayer*1.8;
     float folded=sweep+sin(angle*3.0-latitude*4.0+time*.36)*1.35;
     float curtain=pow(.5+.5*sin(folded),2.2);
     float threads=.65+.35*sin(folded*3.0+latitude*15.0-time*.4);
     float facing=clamp(dot(normalize(vNormal),normalize(vView)),0.0,1.0);
     float edge=pow(1.0-facing,1.3)*smoothstep(0.0,.30,facing);
     vec3 color=auroraPalette(folded*.38+latitude*2.5+uLayer,uHeart);
     float alpha=edge*(.14+curtain*.55)*threads*(uLayer<.5?1.0:.66);
    `)+`
    color=mix(color,uMoodColor,uMoodTint*.75);
    gl_FragColor=vec4(color*1.13*uMoodGlow,alpha*min(1.35,uMoodGlow));
   }
  `
 });
}

export function addBodyAurora(group,options) {
 const shells=[];
 for(let layer=0;layer<2;layer++){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(layer===0?.93:1.18,48,32),auraMaterial({...options,layer}));
  mesh.renderOrder=2+layer;group.add(mesh);shells.push(mesh);
 }
 return shells;
}

export function wingAurora(geometry,options) {
 const mesh=new THREE.Mesh(geometry,auraMaterial({...options,wing:true}));
 mesh.material.side=THREE.DoubleSide;mesh.position.z=-.025;mesh.renderOrder=1;
 return mesh;
}
