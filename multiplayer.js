// The socket carries server state only. No client-side positions are ever sent.
export function createRealtime(handlers){
 let socket=null,live=false,closed=false,starting=false;
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
  if(starting||socket)return;starting=true;
  try{
   for(let i=0;i<30&&!window.WebsimSocket;i++)await new Promise(r=>setTimeout(r,100));
   if(!window.WebsimSocket)throw new Error('Live room unavailable');
   if(closed)return;
   socket=await window.WebsimSocket.joinRoom();socket.onmessage=receive;
   socket.onreconnect=()=>{live=false;handlers.onStatus?.(false);handlers.onConductor?.(false);socket.send({type:'refresh'});};
   socket.onclose=()=>{live=false;handlers.onStatus?.(false);handlers.onConductor?.(false);};
   // A refresh also covers generation finishing after the initial connection.
   socket.send({type:'refresh'});
  }catch{live=false;starting=false;handlers.onStatus?.(false);}
 }
 return {connect,refresh(){try{socket?.send({type:'refresh'});}catch{}},get live(){return live;},close(){closed=true;live=false;socket?.close?.();}};
}
