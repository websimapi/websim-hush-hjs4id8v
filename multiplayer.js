// The socket carries server state only. No client-side positions are ever sent.
export function createRealtime(handlers){
 let socket=null,live=false,closed=false,starting=false,epoch=0;
 function receive(event){
  let m;try{m=JSON.parse(event.data);}catch{return;}
  if(!live){live=true;handlers.onStatus?.(true);}
  if(m.t)handlers.onClock?.(m.t);
  if(m.type==='welcome'){live=true;handlers.onStatus?.(true);handlers.onPresence?.(m.online||[]);}
  else if(m.type==='world-upsert')handlers.onUpsert?.(m.fairies||[]);
  else if(m.type==='world-remove')handlers.onRemove?.(m.ids||[]);
  else if(m.type==='presence')handlers.onPresence?.(m.online||[]);
  else if(m.type==='snapshot')handlers.onPoses?.(m.poses||[]);
  else if(m.type==='bubbles')handlers.onEvents?.(m.events||[]);
  else if(m.type==='conductor')handlers.onConductor?.(!!m.active);
 }
 async function connect(){
  if(starting||socket)return;closed=false;starting=true;const attempt=++epoch;
  try{
   for(let i=0;i<30&&!window.WebsimSocket;i++)await new Promise(r=>setTimeout(r,100));
   if(!window.WebsimSocket)throw new Error('Live room unavailable');
   if(closed)return;
   const joined=await window.WebsimSocket.joinRoom();if(attempt!==epoch||closed){try{joined.send({type:'sleep'});joined.close?.();}catch{}return;}socket=joined;socket.onmessage=e=>{if(attempt===epoch&&!closed)receive(e);};
   joined.onreconnect=()=>{if(attempt!==epoch||closed)return;live=false;handlers.onStatus?.(false);handlers.onConductor?.(false);joined.send({type:'wake'});};
   joined.onclose=()=>{if(attempt!==epoch||closed)return;live=false;starting=false;socket=null;handlers.onStatus?.(false);handlers.onConductor?.(false);};
   // A refresh also covers generation finishing after the initial connection.
   socket.send({type:'wake'});
  }catch{live=false;starting=false;handlers.onStatus?.(false);}
 }
 return {connect,refresh(){try{socket?.send({type:'refresh'});}catch{}},get live(){return live;},close(){closed=true;live=false;epoch++;try{socket?.send({type:'sleep'});socket?.close?.();}catch{}socket=null;starting=false;}};
}
