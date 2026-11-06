// Mood is a changing feeling, not the slower learned attitude or the birth palette.
const MOOD_NAMES=['calm','happy','excited','sad','enraged'];
export function moodOf(f){
 const m=f?.mood||f||{},feeling=m.feeling??m.mood_feeling;
 return {feeling:MOOD_NAMES.includes(feeling)?feeling:'calm',intensity:Math.max(0,Math.min(1,Number(m.intensity??m.mood_intensity)||0)),updated_at:Number(m.updated_at??m.mood_updated)||0};
}
export function currentMood(f,now=Date.now()){
 const m=moodOf(f),age=Math.max(0,now-m.updated_at),intensity=m.intensity*Math.exp(-age/720000);
 return intensity<.06?{feeling:'calm',intensity:0,updated_at:m.updated_at}:{...m,intensity};
}
export function assessMood(previous,proposed,text='',attitude={},now=Date.now()){
 let feeling,intensity;
 if(typeof proposed==='string'){
  const match=proposed.trim().toLowerCase().match(/^(calm|happy|excited|sad|enraged)\s*[,|:]?\s*(0(?:\.\d+)?|1(?:\.0+)?)\b/);
  if(match){feeling=match[1];intensity=Number(match[2]);}
 }else if(proposed&&MOOD_NAMES.includes(proposed.feeling)&&typeof proposed.intensity==='number'&&Number.isFinite(proposed.intensity)){
  feeling=proposed.feeling;intensity=Math.max(0,Math.min(1,proposed.intensity));
 }
 if(!feeling){
  // Only used for disconnected local dialogue or an omitted/malformed AI field.
  const old=currentMood(previous,now),t=String(text).toLowerCase();let rise=.15;
  if(/\b(hate|idiot|worthless|stupid|shut up|ugly)\b/.test(t)){feeling=(attitude.trust||0)<-.3?'enraged':'sad';rise=.23;}
  else if(/\b(excited|yay|dance|play|adventure|celebrate|amazing)\b/.test(t)){feeling='excited';rise=.20;}
  else if(/\b(thank|thanks|love|friend|beautiful|appreciate|kind)\b/.test(t)){feeling='happy';rise=.18;}
  else if(/\b(sad|lonely|goodbye|miss|cry|grief|lost)\b/.test(t)){feeling='sad';rise=.17;}
  else {feeling=old.feeling;rise=-.09;}
  intensity=Math.max(0,Math.min(1,(old.feeling===feeling?old.intensity:.16)+rise));
 }
 return {feeling,intensity,updated_at:now};
}
export function moodVisual(f,now=Date.now()){
 const m=currentMood(f,now),i=m.intensity;
 // Routine feelings change brightness. Only the upper quarter can tint fur/aurora.
 const edge=Math.max(0,Math.min(1,(i-.74)/.26)),tint=edge*edge*(3-2*edge);
 const colors={calm:'#d3c6e6',happy:'#ffd77b',excited:'#f1a0f8',sad:'#7da8e4',enraged:'#ff6846'};
 const gains={calm:-.08,happy:.52,excited:.88,sad:-.68,enraged:.67};
 return {feeling:m.feeling,intensity:i,glow:1+gains[m.feeling]*i,tint:m.feeling==='calm'?0:tint,color:colors[m.feeling],activity:(m.feeling==='excited'?1:m.feeling==='enraged'?.8:m.feeling==='happy'?.25:0)*i};
}
export function describeMood(f){const m=currentMood(f);return m.intensity<.15?'calm':m.feeling;}
