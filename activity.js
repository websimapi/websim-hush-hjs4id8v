// Presence is derived from input timing only; no keys, pointer coordinates or text are recorded.
export const AFK_AFTER_MS=60000;
export function createActivity(){
 let lastInput=Date.now(),started=Date.now();const engagement=new Map();
 const input=e=>{if(e.isTrusted)lastInput=Date.now();};
 for(const type of ['pointermove','pointerdown','keydown','input','touchstart','wheel'])addEventListener(type,input,{passive:true});
 return {start(){lastInput=started=Date.now();engagement.clear();},engage(id){lastInput=Date.now();engagement.set(id,lastInput);},snapshot(id,now=Date.now()){const idle_ms=Math.max(0,now-lastInput),disengaged_ms=Math.max(0,now-(engagement.get(id)||started));return {afk:idle_ms>=AFK_AFTER_MS,idle_ms:Math.min(1800000,idle_ms),disengaged_ms:Math.min(1800000,disengaged_ms)};}};
}
