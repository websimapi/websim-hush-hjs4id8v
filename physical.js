// Append idempotent migrations here for future physical upgrades. Never reroll valid traits.
export const PHYSICAL_VERSION=1;
function physicalHash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function physicalUnit(seed,key){return physicalHash(seed+':'+key)/4294967296;}
function physicalNumber(a,key,min,max,fallback){if(typeof a[key]!=='number'||!Number.isFinite(a[key])||a[key]<min||a[key]>max)a[key]=fallback;}
const physicalMigrations=[
 function dimensionsV1(a,identity){
  physicalNumber(a,'seed',0,2147483647,physicalHash(identity||'hush-fairy')%2147483647);
  a.seed=Math.floor(a.seed);
  const u=key=>physicalUnit(a.seed,key);
  physicalNumber(a,'hue',0,1,u('hue'));
  physicalNumber(a,'saturation',0,1,.28+u('saturation')*.5);
  physicalNumber(a,'lightness',.02,.98,.48+u('lightness')*.26);
  physicalNumber(a,'furLength',.03,.2,.08+u('furLength')*.06);
  physicalNumber(a,'x',-100,100,(u('x')-.5)*24);
  physicalNumber(a,'z',-100,100,(u('z')-.5)*24);
  physicalNumber(a,'wingLength',.5,1.8,.70+u('wingLength')*.75);
  physicalNumber(a,'wingWidth',.045,.23,.065+u('wingWidth')*.115);
  physicalNumber(a,'wingThickness',.008,.075,.014+u('wingThickness')*.036);
  physicalNumber(a,'wingCurve',.02,.18,.04+u('wingCurve')*.08);
  physicalNumber(a,'wingTaper',.5,1.4,.65+u('wingTaper')*.5);
  physicalNumber(a,'bodyScale',.75,1.3,.84+u('bodyScale')*.34);
  // Fictional mass, not real-world measurements: constant body density + four wings.
  a.massMg=Math.round((12*a.bodyScale**3+4*a.wingLength*a.wingWidth*a.wingThickness*10)*100)/100;
 }
];
export function upgradeAppearance(value,identity=''){
 let source=value;
 if(typeof source==='string'){try{source=JSON.parse(source);}catch{source={};}}
 const a=source&&typeof source==='object'&&!Array.isArray(source)?{...source}:{};
 // Re-run repairs even for a current record: missing/corrupt fields can occur at any version.
 for(const migration of physicalMigrations)migration(a,identity);
 a.appearanceVersion=Math.max(PHYSICAL_VERSION,Number.isInteger(a.appearanceVersion)?a.appearanceVersion:0);
 return a;
}
export function physicalDetails(a){
 if(!a)return [];
 return [['Body',a.bodyScale.toFixed(2)+'×'],['Mass',a.massMg.toFixed(1)+' mg'],['Wing length',a.wingLength.toFixed(2)+'×'],['Wing width',(a.wingWidth/.11).toFixed(2)+'×'],['Wing thickness',(a.wingThickness/.024).toFixed(2)+'×']];
}
