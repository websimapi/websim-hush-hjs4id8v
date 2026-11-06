import {createWorld} from './scene.js';
import {createBubbles} from './bubbles.js';
import {createRealtime} from './multiplayer.js';
import {localFairies,editLocal,generateLocal,chatLocal,encounterLocal,offlinePoses,reserveTransfer,finishTransfer,activateTransfer,deleteLocal,initiativeLocal} from './offline.js';
import {describeAttitude} from './temperament.js';
import {setupAdmin} from './admin.js';
import {createTitleUI} from './title-ui.js';
import {describeMood} from './mood.js';
import {physicalDetails} from './physical.js';
const $=id=>document.getElementById(id);
// Every visit starts in the private world; joining the social world is explicit.
let mode='offline',atTitle=true,inspectId=null,initiativeBusy=false,initiativeSession=0;
let me={signedIn:false,admin:false,fairy:null,history:[]},locals=[],worldFairies=[],activeId=null,selected=null,chatBusy=false,generationBusy=false,changing=false,transferring=false,loading=false,currentFile='soul_md',conductor=false,eventCursor=0,epoch=0;
const world=createWorld($('world'),{onSelect:onFairySelect,onContext:showFairyMenu,onHover:(f,e)=>{const l=$('hover-label');l.hidden=atTitle||!f||!$('dialogue').hidden;if(!l.hidden){l.textContent=f.name+(owns(f.id)?' · yours':'');l.style.left=e.clientX+'px';l.style.top=(e.clientY-18)+'px';}}});
const bubbles=createBubbles(world,$('bubble-layer'),()=>worldFairies);
const titleUI=createTitleUI({world,onEnter:f=>f.status==='pending-transfer'?resumeFromPicker(f.id):enterWorld(f),onCreate:generate,onMenuAction:(action,f,point)=>{
 if(action==='menu'){showFairyMenu(f,point);return;}
 if(action==='resume'){resumeFromPicker(f.id);return;}if(action==='cancel'){inspectId=f.id;updatePanel();if(!$('data-modal').open)$('data-modal').showModal();cancelMove(f.id);return;}
 inspectId=f.id;updatePanel();$('delete-confirm').hidden=true;$('transfer-confirm').hidden=true;error('data-error','');
 $('data-modal').showModal();if(action==='free')$('delete-start').click();if(action==='transfer'){$('soul-files').hidden=true;$('transfer-confirm').hidden=false;}
}});
function resumeFromPicker(id){inspectId=id;updatePanel();if(!$('data-modal').open)$('data-modal').showModal();resumeMove(id);}
function titleSlots(){
 if(mode==='offline')return [0,1,2].map(i=>locals[i]||null);
 if(me.fairy)return [me.fairy];
 return !me.signedIn&&worldFairies.length?worldFairies.slice(0,3):[null];
}
function settingsFairy(){return (mode==='offline'?locals.find(f=>f.id===inspectId):me.fairy?.id===inspectId?me.fairy:worldFairies.find(f=>f.id===inspectId))||companion();}
function showFairyMenu(f,event){
 if(!f)return;titleUI.menuAt(f,event,{owned:owns(f.id),pending:f.status==='pending-transfer',transfer:mode==='online'&&owns(f.id),transferFull:locals.length>=3,busy:transferring});
}
function onFairySelect(f){if(atTitle)enterWorld(f);else openConversation(f);}
function enterWorld(f){
 if(!f||f.status==='creating')return;if(f.status==='pending-transfer'){resumeFromPicker(f.id);return;}
 atTitle=false;document.body.classList.remove('at-title');titleUI.closeMenu();$('data-modal').close();closeConversation();inspectId=null;
 if(mode==='offline'&&owns(f.id))activeId=f.id;
 world.setTitle(false);drawWorld();if(mode==='offline')world.applySnapshot(offlinePoses(locals));else realtime.connect();
 world.focus(f.id);world.follow(f.id);
 const visit=++initiativeSession;setTimeout(()=>{if(visit===initiativeSession)companionMoment();},2000);
}
function showTitle(){
 if(transferring)return;initiativeSession++;atTitle=true;document.body.classList.add('at-title');titleUI.closeMenu();$('data-modal').close();closeConversation();realtime.close();conductor=false;
 for(const f of worldFairies)bubbles.clear(f.id);drawWorld();updatePanel();
}

function owns(id){return mode==='offline'?locals.some(f=>f.id===id&&f.status==='ready'):id===me.fairy?.id;}
function companion(){return mode==='offline'?locals.find(f=>f.id===activeId&&f.status==='ready')||locals.find(f=>f.status==='ready'):me.fairy;}
function closeConversation(){$('dialogue').hidden=true;selected=null;world.follow(null);}
function clearScene(){for(const f of worldFairies)bubbles.clear(f.id);worldFairies=[];world.setFairies([],null);closeConversation();}
let timer;
function notice(text,permanent=false){clearTimeout(timer);$('notice').textContent=text;$('notice').hidden=!text;if(text&&!permanent)timer=setTimeout(()=>{$('notice').hidden=true;},6500);}
function error(id,text){$(id).textContent=text||'';$(id).hidden=!text;}
async function api(path,method='GET',body){let response;try{response=await fetch('/api/'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});}catch{throw new Error('Cannot reach the social world. Your device saves are safe.');}let data;try{data=await response.json();}catch{throw new Error('The social world did not answer. Please try again.');}if(!response.ok)throw new Error(data.error||'Please try again shortly.');return data;}
function profile(username){const a=document.createElement('a');a.className='account-link';a.href='https://websim.com/@'+encodeURIComponent(username);a.target='_blank';a.rel='noopener noreferrer';const img=document.createElement('img');img.src='https://images.websim.com/avatar/'+encodeURIComponent(username);img.alt='';a.append(img,document.createTextNode('@'+username));return a;}
async function ensureAccount(){me=await api('me');me.history=me.history||[];$('admin-open').hidden=!me.admin;return me;}
const realtime=createRealtime({
 onClock:t=>{if(mode==='online')bubbles.syncClock(t);},
 onPoses:poses=>{if(mode==='online')world.applySnapshot(poses);},
 onEvents:events=>{if(mode!=='online')return;bubbles.add(events);events.forEach(e=>{eventCursor=Math.max(eventCursor,e.id);});},
 onUpsert:fairies=>{if(mode!=='online')return;const map=new Map(worldFairies.map(f=>[f.id,f]));for(const f of fairies){map.set(f.id,f);if(f.id===me.fairy?.id)me.fairy={...me.fairy,...f};}worldFairies=[...map.values()];drawWorld();world.applySnapshot(fairies.filter(f=>f.pose).map(f=>({id:f.id,...f.pose})));},
 onRemove:ids=>{if(mode!=='online')return;ids.forEach(id=>bubbles.clear(id));worldFairies=worldFairies.filter(f=>!ids.includes(f.id));if(ids.includes(me.fairy?.id)){me.fairy=null;me.history=[];closeConversation();}drawWorld();updatePanel();},
 onPresence:ids=>{if(mode!=='online')return;const set=new Set(ids);worldFairies.forEach(f=>{f.online=set.has(f.id);});drawWorld();},
 onStatus:live=>{if(mode!=='online')return;$('connection-dot').dataset.live=live?'true':'false';$('connection-dot').title=live?'Online · live social world':'Online · reconnecting';if(!live)conductor=false;},
 onConductor:value=>{conductor=mode==='online'&&value;}
});
function drawWorld(){
 if(mode==='offline')worldFairies=locals.filter(f=>f.status==='ready').map(f=>({...f,online:true}));
 else if(me.fairy){const i=worldFairies.findIndex(f=>f.id===me.fairy.id);if(i<0)worldFairies.push(me.fairy);else worldFairies[i]={...me.fairy,...worldFairies[i]};}
 const slots=titleSlots();if(atTitle)world.setTitle(true,slots.map(f=>f?.id||null));
 world.setFairies(atTitle?slots.filter(f=>f&&f.status!=='creating'):worldFairies,atTitle?null:companion()?.id||null);
 if(atTitle)titleUI.render(slots,generationBusy||transferring||changing);
 $('mode-label').textContent=mode==='offline'?'Offline':'Online';
 $('mode-label').title=mode==='offline'?'Private fairies on this device':'One fairy in the shared world';
 if(mode==='offline'){$('connection-dot').dataset.live='offline';$('connection-dot').title='Offline · device-only saves';}
}
async function refreshLocal(){locals=await localFairies();if(locals.some(f=>f.status==='creating'&&Date.now()-f.created_at>30000)){await editLocal(list=>{for(const f of list)if(f.status==='creating'&&Date.now()-f.created_at>30000)f.status='ready';});locals=await localFairies();}if(!locals.some(f=>f.id===activeId&&f.status==='ready'))activeId=locals.find(f=>f.status==='ready')?.id||null;if(mode==='offline'){drawWorld();world.applySnapshot(offlinePoses(locals));}updatePanel();}
async function loadWorld(){
 if(mode!=='online'||loading)return;loading=true;const run=epoch;try{let all=[],next=0;do{const data=await api('world?after='+next);all.push(...data.fairies);next=data.next;}while(next!==null);if(mode==='online'&&run===epoch){worldFairies=all;drawWorld();world.applySnapshot(all.filter(f=>f.pose).map(f=>({id:f.id,...f.pose})));}}finally{loading=false;}
}
async function switchMode(next){
 if(changing||chatBusy||generationBusy||transferring){notice('Let this little moment finish before changing worlds.');return;}
 changing=true;initiativeSession++;atTitle=true;document.body.classList.add('at-title');inspectId=null;titleUI.closeMenu();epoch++;realtime.close();conductor=false;clearScene();mode=next;try{localStorage.setItem('hush-mode',mode);}catch{}
 try{if(mode==='offline'){bubbles.syncClock(Date.now());await refreshLocal();}else{await ensureAccount();await loadWorld();if(!atTitle)realtime.connect();}error('data-error','');}catch(e){error('data-error',e.message);notice(e.message);}
 finally{changing=false;drawWorld();updatePanel();}
}
function updatePanel(){
 const f=settingsFairy(),offline=mode==='offline';
 $('mode-offline').classList.toggle('active',offline);$('mode-online').classList.toggle('active',!offline);$('mode-offline').setAttribute('aria-selected',String(offline));$('mode-online').setAttribute('aria-selected',String(!offline));
 $('data-name').textContent=f?f.name:'Details';
 const traits=$('physical-details');traits.hidden=!f;traits.replaceChildren();
 for(const [label,value] of physicalDetails(f?.appearance)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;if(label==='Mass')dd.title='Simulated fairy mass, in milligrams.';else dd.title='Relative to a typical fairy.';traits.append(dt,dd);}
 $('account-link').replaceChildren();if(!offline&&(f?.username||me.username))$('account-link').append(profile(f?.username||me.username));
 $('data-status').textContent=f?describeAttitude(f)+' · feeling '+describeMood(f):'';
 $('storage-note').textContent=offline?'Souls, memories, attitudes and conversations are saved in IndexedDB on this device. Connected AI can process dialogue; without it, replies are local. Clearing browser storage erases these fairies.':'Online souls and memories are saved on the authoritative server. Offline fairies cannot be brought here.';
 $('slot-list').replaceChildren();
 for(const local of locals){
  if(local.status!=='pending-transfer')continue;
  const row=document.createElement('div');row.className='fairy-slot'+(local.id===f?.id?' selected':'');
  if(local.status==='pending-transfer'){
   const label=document.createElement('span');label.textContent=local.name+' · move pending';row.append(label);
   const resume=document.createElement('button');resume.textContent='Resume';resume.onclick=()=>resumeMove(local.id);const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>cancelMove(local.id);row.append(resume,cancel);
  }else{const button=document.createElement('button');button.textContent=local.name+(local.status==='creating'?' · forming…':'');button.disabled=local.status!=='ready';button.onclick=()=>{activeId=local.id;closeConversation();drawWorld();world.home();updatePanel();};row.append(button);if(local.status==='ready'){const label=document.createElement('small');label.textContent=describeAttitude(local).split(', ').slice(0,2).join(' · ');row.append(label);}}
  $('slot-list').append(row);
 }
 $('soul-files').hidden=!f||!owns(f.id);$('file-content').textContent=f?.[currentFile]||'';
 $('delete-start').hidden=!f||!owns(f.id);
 $('privacy-note').textContent=offline?'Only saved in this browser. Local dialogue needs no connection; AI dialogue needs one.':'Private conversations and files are visible only to you and the page creator.';
 $('rebirth').hidden=true;
 $('rebirth').disabled=generationBusy||transferring;$('rebirth').textContent=offline?'Generate fairy · '+locals.length+'/3':'Generate my online fairy';
 $('transfer-start').hidden=offline;$('transfer-start').disabled=locals.length>=3||transferring;$('transfer-start').textContent=locals.length>=3?'Offline slots full':'Move offline instead';
 $('admin-open').hidden=!me.admin;
 $('mode-offline').disabled=chatBusy||generationBusy||transferring||changing;$('mode-online').disabled=chatBusy||generationBusy||transferring||changing;
 if(atTitle){world.setTitle(true,titleSlots().map(f=>f?.id||null));titleUI.render(titleSlots(),generationBusy||transferring||changing);}
}
async function generate(){
 if(generationBusy||changing||transferring)return;generationBusy=true;updatePanel();notice('…',true);const origin=mode;
 try{
  if(origin==='offline'){const fairy=await generateLocal();activeId=fairy.id;await refreshLocal();notice('');}
  else{await ensureAccount();if(!me.signedIn)throw new Error('Sign in to Websim first.');let result;const start=Date.now();do{result=await api('fairy','POST',{});if(result.pending){if(Date.now()-start>150000)throw new Error('Still forming. Please try again shortly.');await new Promise(r=>setTimeout(r,2500));}}while(result.pending);me.fairy=result.fairy;me.history=[];await loadWorld();realtime.refresh();notice('');}
  if(!atTitle)world.home();$('data-modal').close();error('data-error','');
 }catch(e){error('data-error',e.message);notice(e.message);}finally{generationBusy=false;drawWorld();updatePanel();}
}
function openConversation(f){
 $('hover-label').hidden=true;if(!owns(f.id)){notice(f.name+' listens to their own companion.');return;}
 if(mode==='offline'){activeId=f.id;drawWorld();updatePanel();}
 selected=f.id;world.follow(f.id);$('dialogue').hidden=false;$('dialogue-name').textContent=f.name;error('chat-error','');
 const history=mode==='offline'?f.history||[]:me.history||[],last=[...history].reverse().find(m=>m.role==='assistant');
 const greeting=f.soul_md?.match(/## First words\n([^]*?)(?:\n\n##|$)/)?.[1]?.trim();
 if(last?.content||greeting)bubbles.add([{id:'recall-'+f.id,fairy_id:f.id,kind:'speech',text:last?.content||greeting,audience:'private',at:Date.now(),expires:Date.now()+25000}]);
 $('chat-input').disabled=chatBusy;$('send').disabled=chatBusy;if(!chatBusy)setTimeout(()=>$('chat-input').focus({preventScroll:true}),80);
}
world.setAnchorCallback(()=>{if(atTitle){titleUI.update();return;}bubbles.update();if($('dialogue').hidden||!selected)return;const p=world.project(selected,-1.04);if(!p){closeConversation();return;}const width=$('dialogue').offsetWidth,height=$('dialogue').offsetHeight,h=window.visualViewport?.height||innerHeight;$('dialogue').style.visibility=p.visible?'visible':'hidden';$('dialogue').style.left=Math.max(width/2+14,Math.min(innerWidth-width/2-14,p.x))+'px';$('dialogue').style.top=Math.max(14,Math.min(h-height-14,p.y))+'px';});
$('chat-form').onsubmit=async e=>{
 e.preventDefault();const text=$('chat-input').value.trim();if(!text||chatBusy||!owns(selected))return;const id=selected,origin=mode;chatBusy=true;$('chat-input').value='';$('chat-input').disabled=true;$('send').disabled=true;error('chat-error','');bubbles.listening(id,true);updatePanel();
 try{const result=origin==='offline'?await chatLocal(id,text):await api('chat','POST',{text});if(origin==='offline'){await refreshLocal();if(!result.usedAI)$('dialogue-name').textContent=(companion()?.name||'Fairy')+' · local reply';}else if(me.fairy?.id===id){me.history.push({role:'user',content:text},{role:'assistant',content:result.reply});me.fairy.memory_md=result.memory_md;me.fairy.attitude=result.attitude;me.fairy.mood=result.mood;const found=worldFairies.find(f=>f.id===id);if(found){found.attitude=result.attitude;found.mood=result.mood;}realtime.refresh();updatePanel();}if(mode===origin)bubbles.add(result.events||[]);
 }catch(e){if(selected===id){error('chat-error',e.message);$('chat-input').value=text;}}
 finally{chatBusy=false;bubbles.listening(id,false);$('chat-input').disabled=false;$('send').disabled=false;updatePanel();if(selected===id&&!$('dialogue').hidden)$('chat-input').focus({preventScroll:true});}
};
$('close-dialogue').onclick=closeConversation;
$('mode-offline').onclick=()=>switchMode('offline');$('mode-online').onclick=()=>switchMode('online');
$('data-button').onclick=()=>{inspectId=companion()?.id||null;updatePanel();$('delete-confirm').hidden=true;$('transfer-confirm').hidden=true;error('data-error','');$('data-modal').showModal();};
$('mode-label').onclick=showTitle;
$('return-title').onclick=showTitle;
$('home-button').onclick=()=>{if(companion())world.home();else showTitle();};
$('rebirth').onclick=generate;$('retry').onclick=generate;
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
for(const b of document.querySelectorAll('[data-file]'))b.onclick=()=>{currentFile=b.dataset.file;document.querySelectorAll('[data-file]').forEach(x=>x.classList.toggle('active',x===b));updatePanel();};
$('delete-start').onclick=()=>{if(!settingsFairy()||!owns(settingsFairy().id))return;$('soul-files').hidden=true;$('delete-confirm').hidden=false;$('delete-word').value='';$('delete-final').disabled=true;$('delete-description').textContent=mode==='offline'?'Permanently delete this fairy and all its memories from this device.':'Permanently delete this fairy and its memories, or move it offline instead.';};
$('delete-cancel').onclick=()=>{$('delete-confirm').hidden=true;updatePanel();};
$('delete-word').oninput=()=>{$('delete-final').disabled=$('delete-word').value!=='DELETE';};
$('delete-final').onclick=async()=>{const f=settingsFairy();if(!f||!owns(f.id))return;$('delete-final').disabled=true;try{if(mode==='offline')await deleteLocal(f.id);else{await api('fairy','DELETE',{confirm:$('delete-word').value});me.fairy=null;me.history=[];worldFairies=worldFairies.filter(x=>x.id!==f.id);realtime.refresh();}bubbles.clear(f.id);closeConversation();$('delete-confirm').hidden=true;await refreshLocal();drawWorld();inspectId=null;$('data-modal').close();showTitle();notice('Deleted.');}catch(e){error('data-error',e.message);$('delete-final').disabled=false;}};
$('transfer-start').onclick=()=>{$('delete-confirm').hidden=true;$('transfer-confirm').hidden=false;};
$('transfer-back').onclick=()=>{$('transfer-confirm').hidden=true;$('delete-confirm').hidden=false;};
$('transfer-final').onclick=async()=>{
 if(transferring)return;
 try{await refreshLocal();if(locals.length>=3)throw new Error('Free one of the three offline slots first.');const snapshot=await api('transfer/prepare','POST',{});let id;try{id=await reserveTransfer(snapshot);}catch(e){await api('transfer/cancel','POST',{token:snapshot.token}).catch(()=>{});throw e;}await refreshLocal();await resumeMove(id);}catch(e){error('data-error',e.message);}
};
async function resumeMove(id){
 if(transferring)return;transferring=true;updatePanel();error('data-error','');
 try{
  await ensureAccount();const f=(await localFairies()).find(x=>x.id===id);if(!f?.transfer)throw new Error('Pending move not found.');
  const token=f.transfer.token,status=await api('transfer/status?token='+encodeURIComponent(token));
  if(status.state==='committed'){if(!f.transfer.complete)throw new Error('The saved local copy is incomplete. Do not clear browser storage.');}
  else{
   if(status.state!=='pending')throw new Error('This move expired or belongs to another account. Cancel the pending copy, then start again; the online fairy was not removed.');
   let history=[];
   for(const source of ['messages','events']){let after=0;do{const page=await api('transfer/history?token='+encodeURIComponent(token)+'&source='+source+'&after='+after);history.push(...page.entries.map(e=>source==='messages'?e:{...e,role:'encounter',content:'['+e.role+'] '+e.content}));after=page.next;}while(after!==null);}
   history.sort((a,b)=>a.created_at-b.created_at);await finishTransfer(id,history);
   await api('transfer/commit','POST',{token,confirm:'MOVE OFFLINE'});
  }
  await activateTransfer(id);const old=me.fairy?.id;if(old)bubbles.clear(old);me.fairy=null;me.history=[];$('transfer-confirm').hidden=true;$('delete-confirm').hidden=true;realtime.refresh();
  transferring=false;await switchMode('offline');activeId=id;await refreshLocal();showTitle();notice('Moved offline.');
 }catch(e){error('data-error',e.message);await refreshLocal().catch(()=>{});}finally{transferring=false;updatePanel();}
}
async function cancelMove(id){
 const f=locals.find(x=>x.id===id);if(!f?.transfer)return;
 try{const status=await api('transfer/status?token='+encodeURIComponent(f.transfer.token));if(status.state==='committed'){await resumeMove(id);return;}if(status.state==='pending')await api('transfer/cancel','POST',{token:f.transfer.token});await deleteLocal(id);await refreshLocal();notice('Move cancelled. The online fairy was kept.');}catch(e){error('data-error',e.message);}
}
setupAdmin({$,api,getMe:()=>me,ensureAccount,refresh:async()=>{await ensureAccount();if(mode==='online'){realtime.refresh();await loadWorld();}updatePanel();},profile,notice});
addEventListener('keydown',e=>{if(e.key==='Escape')closeConversation();});
addEventListener('storage',e=>{if(e.key==='hush-local-change')refreshLocal().catch(()=>{});});
setInterval(()=>{if(mode==='offline'&&!document.hidden)world.applySnapshot(offlinePoses(locals));},100);
setInterval(async()=>{if(atTitle||mode!=='offline'||document.hidden||generationBusy||transferring||initiativeBusy||chatBusy)return;try{const events=await encounterLocal();await refreshLocal();if(mode==='offline')bubbles.add(events);}catch{}},25000);
setInterval(async()=>{if(atTitle||mode!=='online'||document.hidden||realtime.live)return;try{await loadWorld();const data=await api('wild/events?after='+eventCursor);if(mode!=='online')return;bubbles.syncClock(data.t);bubbles.add(data.events);data.events.forEach(e=>{eventCursor=Math.max(eventCursor,e.id);});}catch{}},3500);
setInterval(async()=>{if(mode!=='online'||document.hidden||chatBusy||transferring)return;try{await ensureAccount();updatePanel();drawWorld();}catch{}},45000);
setInterval(()=>{if(!atTitle&&mode==='online'&&conductor&&realtime.live&&me.fairy)api('wild/encounter','POST',{}).catch(()=>{});},20000);
addEventListener('pagehide',()=>realtime.close());
async function boot(){
 try{
  await editLocal(list=>{for(const f of list){if(f.status==='creating'&&Date.now()-f.created_at>30000)f.status='ready';if(f.busyUntil<Date.now()){f.busy=null;f.busyUntil=0;}}});
  await refreshLocal();if(mode==='online'){await ensureAccount();await loadWorld();}else drawWorld();updatePanel();
 }catch(e){error('data-error',e.message);notice(e.message,true);}
}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
boot();

async function companionMoment(){
 const fairy=companion();
 if(atTitle||document.hidden||!fairy||initiativeBusy||chatBusy||generationBusy||transferring||changing||$('data-modal').open)return;
 if(!$('dialogue').hidden&&$('chat-input').value.trim())return;
 if(mode==='online'&&!realtime.live)return;
 initiativeBusy=true;const origin=mode,visit=initiativeSession,id=fairy.id;
 try{
  const result=origin==='offline'?await initiativeLocal(id):await api('companion/pulse','POST',{});
  if(mode!==origin||visit!==initiativeSession||atTitle||document.hidden)return;
  if(origin==='offline')await refreshLocal();
  else if(result.fairy&&me.fairy?.id===id){
   me.fairy=result.fairy;if(result.speech)me.history.push({role:'assistant',content:result.speech});
   const i=worldFairies.findIndex(f=>f.id===id);if(i>=0)worldFairies[i]={...worldFairies[i],...result.fairy};drawWorld();updatePanel();realtime.refresh();
  }
  bubbles.add(result.events||[]);
 }catch{}finally{initiativeBusy=false;}
}
setInterval(companionMoment,15000);
addEventListener('visibilitychange',()=>{
 if(document.hidden){if(mode==='online')realtime.close();return;}
 if(!atTitle){if(mode==='online')realtime.connect();const visit=initiativeSession;setTimeout(()=>{if(visit===initiativeSession)companionMoment();},2200);}
});
