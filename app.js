import {createWorld} from './scene.js';
const $=id=>document.getElementById(id);
let me={signedIn:false,admin:false,fairy:null,history:[]},worldFairies=[],generationBusy=false,chatBusy=false,selected=null,currentFile='soul_md',deleted=false,adminTarget=null,adminOffset=0,pendingText='',pendingFairyId=null;
const preview={id:'preview',name:'A little possibility',username:'',online:false,appearance:{hue:.855,saturation:.41,lightness:.65,furLength:.116,wingLength:1.05,seed:31051,x:0,z:0}};
const world=createWorld($('world'),{onSelect:openConversation,onHover:(fairy,e)=>{
 const label=$('hover-label');label.hidden=!fairy||!$('dialogue').hidden;
 if(!label.hidden){label.textContent=fairy.id==='preview'?'a glimpse of a little soul':fairy.name+(fairy.id===me.fairy?.id?' · yours':'');label.style.left=e.clientX+'px';label.style.top=(e.clientY-18)+'px';}
}});
world.setFairies([preview],null);
async function api(path,method='GET',body){
 let r;try{r=await fetch('/api/'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});}catch{throw new Error('We lost touch with the hush. Please try again.');}
 let data;try{data=await r.json();}catch{throw new Error('The hush did not answer. Please try again in a moment.');}
 if(!r.ok)throw new Error(data.error||'Something interrupted the hush. Please try again.');return data;
}
let noticeTimer;
function notice(message,permanent=false){clearTimeout(noticeTimer);$('notice').hidden=!message;$('notice').textContent=message;if(message&&!permanent)noticeTimer=setTimeout(()=>{$('notice').hidden=true;},6000);}
function setError(id,error){$(id).textContent=error||'';$(id).hidden=!error;}
function profile(username){
 const a=document.createElement('a');a.className='account-link';a.href='https://websim.com/@'+encodeURIComponent(username);a.target='_blank';a.rel='noopener noreferrer';
 const img=document.createElement('img');img.src='https://images.websim.com/avatar/'+encodeURIComponent(username);img.alt='';img.loading='lazy';a.append(img,document.createTextNode('@'+username));return a;
}
function drawWorld(){
 const list=worldFairies.filter(f=>f.id!==me.fairy?.id);
 if(me.fairy)list.push({...me.fairy,online:true});else list.push(preview);
 world.setFairies(list,me.fairy?.id||null);
 const stored=worldFairies.filter(f=>f.id!==me.fairy?.id);if(me.fairy)stored.push({...me.fairy,online:true});
 const awake=stored.filter(f=>f.online).length,dreaming=stored.length-awake;
 $('population').replaceChildren();const dot=document.createElement('i');$('population').append(dot,document.createTextNode(stored.length?awake+' awake · '+dreaming+' dreaming':'a quiet little world'));
}
async function loadWorld(){
 let list=[],next=0;
 do{const data=await api('world?after='+next);list.push(...data.fairies);next=data.next;}while(next!==null);
 worldFairies=list;drawWorld();
}
function updateIdentity(){
 const f=me.fairy;
 $('retry').hidden=true;
 $('ownership').textContent=f?'ONE SOUL, ONLY YOURS':deleted?'A NEW BEGINNING':me.signedIn?'A SOUL IS TAKING SHAPE':'A LITTLE POSSIBILITY';
 $('fairy-name').textContent=f?f.name:deleted?'Room for someone new.':me.signedIn?'Finding each other.':'Someone, somewhere.';
 $('fairy-description').textContent=f?'Click your fairy. It has a little world to share.':deleted?'Your fairy has gone. A new soul can begin, if you wish.':me.signedIn?'A name, a nature, a little spark of its own.':'A glimpse of a fairy. Sign in to Websim to meet your own.';
 $('home-label').textContent=f?'Find '+f.name:deleted?'A new beginning':'Your little corner';
 $('admin-open').hidden=!me.admin;
}
function generationError(e){notice(e.message,true);$('ownership').textContent='A LITTLE PATIENCE';$('fairy-name').textContent='Not quite here yet.';$('fairy-description').textContent='Your fairy’s place is safe. Try calling it again.';$('retry').hidden=false;}
async function generate(){
 if(generationBusy)return;generationBusy=true;deleted=false;$('retry').hidden=true;$('rebirth').disabled=true;notice('A little soul is finding its way to you…',true);
 try{
  let result;const start=Date.now();
  do{
   result=await api('fairy','POST',{});
   if(result.pending){if(Date.now()-start>150000)throw new Error('Your soul is still taking shape. Please try again shortly.');await new Promise(resolve=>setTimeout(resolve,2800));}
  }while(result.pending);
  me.fairy=result.fairy;me.history=[];notice('There you are, '+me.fairy.name+'.');updateIdentity();await loadWorld();world.home();updateDataPanel();
 }catch(e){generationError(e);setError('data-error',e.message);}finally{generationBusy=false;$('rebirth').disabled=false;}
}
async function boot(){
 try{
  const data=await api('me');me=data;me.history=me.history||[];updateIdentity();await loadWorld();
  if(me.fairy){api('presence','POST',{}).catch(()=>{});}
  else if(me.signedIn){if(me.status==='failed')generationError(new Error('Your fairy could not form last time. You can try again.'));else await generate();}
 }catch(e){notice(e.message,true);$('retry').hidden=false;$('retry').onclick=boot;}
}
$('retry').onclick=generate;
$('home-button').onclick=()=>{world.home();if(deleted){$('data-modal').showModal();updateDataPanel();}};
function message(role,text){const p=document.createElement('p');p.className='message '+role;p.textContent=text;$('messages').append(p);$('messages').scrollTop=$('messages').scrollHeight;return p;}
function openConversation(f){
 selected=f.id;$('hover-label').hidden=true;$('dialogue').hidden=false;$('dialogue-name').textContent=f.id==='preview'?'A little possibility':f.name;$('messages').replaceChildren();setError('chat-error','');
 const isOwn=f.id===me.fairy?.id;$('chat-form').hidden=!isOwn;$('dialogue').querySelector('.dialogue-head small').textContent=isOwn?'is listening':f.id==='preview'?'a glimpse':f.online?'is here':'is dreaming';
 if(isOwn){
  const history=me.history||[];
  if(!history.length){const greeting=me.fairy.soul_md.match(/## First words\n([^]*?)(?:\n\n##|$)/)?.[1]?.trim()||'Hello, you. What’s on your mind?';message('assistant',greeting);}
  else history.forEach(m=>message(m.role,m.content));
  $('chat-input').disabled=chatBusy;$('send').disabled=chatBusy;
  if(chatBusy&&pendingFairyId===f.id){message('user pending',pendingText);message('thinking','listening, very carefully…');}
  if(!chatBusy)setTimeout(()=>$('chat-input').focus({preventScroll:true}),100);
 }else if(f.id==='preview')message('assistant',me.signedIn?'A glimpse of the shape your fairy will take. Its own soul is still on its way.':'I’m only a little possibility. Sign in to Websim, and a fairy with a soul of its own will find you.');
 else{message('assistant','A little soul belonging to');const line=document.createElement('p');line.append(profile(f.username));$('messages').append(line);message('assistant','Only its own companion can hear its thoughts.');}
}
$('close-dialogue').onclick=()=>{$('dialogue').hidden=true;selected=null;};
world.setAnchorCallback(()=>{
 if($('dialogue').hidden||!selected)return;const p=world.project(selected,.98);
 if(!p){$('dialogue').hidden=true;return;}
 const width=$('dialogue').offsetWidth,height=$('dialogue').offsetHeight;
 const x=Math.max(width/2+14,Math.min(innerWidth-width/2-14,p.x));
 const y=Math.max(height+92,Math.min(innerHeight-105,p.y));
 $('dialogue').style.left=x+'px';$('dialogue').style.top=y+'px';
});
$('chat-form').addEventListener('submit',async e=>{
 e.preventDefault();const input=$('chat-input'),text=input.value.trim();if(!text||chatBusy||selected!==me.fairy?.id)return;
 chatBusy=true;pendingText=text;pendingFairyId=me.fairy.id;input.value='';input.disabled=true;$('send').disabled=true;setError('chat-error','');message('user pending',text);message('thinking','listening, very carefully…');const fairyId=me.fairy.id;
 try{
  const result=await api('chat','POST',{text});
  if(me.fairy?.id===fairyId){me.history.push({role:'user',content:text},{role:'assistant',content:result.reply});me.fairy.memory_md=result.memory_md;if(selected===fairyId){$('messages').querySelectorAll('.thinking').forEach(p=>p.remove());$('messages').querySelectorAll('.pending').forEach(p=>p.classList.remove('pending'));message('assistant',result.reply);}updateDataPanel();}
 }catch(e){if(selected===fairyId){$('messages').querySelectorAll('.thinking,.pending').forEach(p=>p.remove());setError('chat-error',e.message);}if(me.fairy?.id===fairyId)input.value=text;}
 finally{chatBusy=false;pendingText='';pendingFairyId=null;input.disabled=false;$('send').disabled=false;if(!$('dialogue').hidden&&selected===fairyId)input.focus({preventScroll:true});}
});
function updateDataPanel(){
 const f=me.fairy;$('data-name').textContent=f?f.name:deleted?'A quiet goodbye.':'A space for you.';
 $('account-link').replaceChildren();if(me.username)$('account-link').append(profile(me.username));
 $('data-status').textContent=f?'One fairy, born '+new Date(f.created_at).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})+'.':deleted?'Your fairy, soul, memories, and conversation records have been deleted.':me.signedIn?'Your fairy is finding its way here.':'Sign in to Websim to be given your own fairy. Guests can wander the hush.';
 $('soul-files').hidden=!f;$('rebirth').hidden=!me.signedIn||!!f||generationBusy;
 $('file-content').textContent=f?.[currentFile]||'';
 $('admin-open').hidden=!me.admin;
}
$('data-button').onclick=()=>{updateDataPanel();$('delete-confirm').hidden=true;$('delete-word').value='';setError('data-error','');$('data-modal').showModal();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('data-modal').addEventListener('click',e=>{if(e.target===$('data-modal')){const rect=$('data-modal').getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)$('data-modal').close();}});
document.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{currentFile=b.dataset.file;document.querySelectorAll('[data-file]').forEach(x=>x.classList.toggle('active',x===b));updateDataPanel();});
$('delete-start').onclick=()=>{$('soul-files').hidden=true;$('delete-confirm').hidden=false;$('delete-word').value='';$('delete-final').disabled=true;};
$('delete-cancel').onclick=()=>{$('delete-confirm').hidden=true;updateDataPanel();};
$('delete-word').oninput=()=>{$('delete-final').disabled=$('delete-word').value!=='DELETE';};
$('delete-final').onclick=async()=>{
 $('delete-final').disabled=true;setError('data-error','');
 try{
  await api('fairy','DELETE',{confirm:$('delete-word').value});const oldId=me.fairy?.id;me.fairy=null;me.history=[];deleted=true;worldFairies=worldFairies.filter(f=>f.id!==oldId);$('dialogue').hidden=true;selected=null;$('delete-confirm').hidden=true;notice('Your fairy and all of its memories have been permanently deleted.');updateIdentity();drawWorld();updateDataPanel();
 }catch(e){setError('data-error',e.message);$('delete-final').disabled=false;}
};
$('rebirth').onclick=async()=>{setError('data-error','');$('data-modal').close();updateIdentity();await generate();};
let adminRows=[];
async function adminList(append=false){
 const data=await api('admin/list?offset='+(append?adminOffset:0));adminOffset=data.next;adminRows=append?[...adminRows,...data.fairies]:data.fairies;$('admin-more').hidden=data.next===null;$('admin-list').replaceChildren();
 for(const f of adminRows){
  const row=document.createElement('div');row.className='admin-row'+(adminTarget===f.user_id?' selected':'');row.append(profile(f.username));
  const b=document.createElement('button');b.textContent=f.name||'Unformed soul';b.onclick=()=>adminRead(f.user_id);const status=document.createElement('small');status.textContent=f.status;row.append(b,status);$('admin-list').append(row);
 }
}
async function openAdmin(){
 if(!me.admin)return;$('data-modal').close();$('admin-panel').hidden=false;$('admin-feedback').textContent='';
 try{await adminList();}catch(e){$('admin-feedback').textContent=e.message;}
}
async function adminRead(uid){
 try{
  const data=await api('admin/read','POST',{user_id:uid});adminTarget=uid;
  const f=data.fairy,form=$('admin-form');form.hidden=false;form.elements.name.value=f.name||'';form.elements.soul_md.value=f.soul_md;form.elements.memory_md.value=f.memory_md;form.elements.appearance.value=JSON.stringify(f.appearance,null,2);
  form.querySelector('.admin-target').textContent='user '+uid+' · fairy '+f.id+' · '+f.status;
  $('admin-signals').textContent=JSON.stringify(f.signals,null,2);$('admin-history').textContent=data.history.map(m=>m.role+': '+m.content).join('\n\n');$('admin-reset-word').value='';$('admin-reset').disabled=true;$('admin-feedback').textContent='';
 }catch(e){$('admin-feedback').textContent=e.message;}
}
$('admin-open').onclick=openAdmin;$('admin-close').onclick=()=>{$('admin-panel').hidden=true;};$('admin-more').onclick=()=>adminList(true).catch(e=>{$('admin-feedback').textContent=e.message;});
addEventListener('keydown',e=>{
 if(e.key==='Escape'){$('dialogue').hidden=true;$('admin-panel').hidden=true;selected=null;return;}
 if((e.key==='~'||e.key==='`'||e.code==='Backquote')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
  e.preventDefault();if(me.admin){if($('admin-panel').hidden)openAdmin();else $('admin-panel').hidden=true;}else notice('The keeper’s panel belongs to this page’s creator.');
 }
});
async function refreshAfterAdmin(){
 const data=await api('me');me={...data,history:data.history||[]};updateIdentity();updateDataPanel();await loadWorld();await adminList();if(selected){$('dialogue').hidden=true;selected=null;}
}
$('admin-form').onsubmit=async e=>{
 e.preventDefault();const form=$('admin-form'),button=form.querySelector('[type=submit]');button.disabled=true;
 try{
  let appearance;try{appearance=JSON.parse(form.elements.appearance.value);}catch{throw new Error('Appearance must be valid JSON.');}
  await api('admin/save','POST',{user_id:adminTarget,name:form.elements.name.value,soul_md:form.elements.soul_md.value,memory_md:form.elements.memory_md.value,appearance});await refreshAfterAdmin();$('admin-feedback').textContent='Saved on the server. Soul, memory, and appearance repaired.';
 }catch(e){$('admin-feedback').textContent=e.message;}finally{button.disabled=false;}
};
$('admin-reset-word').oninput=()=>{$('admin-reset').disabled=$('admin-reset-word').value!=='RESET';};
$('admin-reset').onclick=async()=>{
 $('admin-reset').disabled=true;
 try{
  const own=adminRows.find(f=>f.user_id===adminTarget)?.id===me.fairy?.id;
  await api('admin/reset','POST',{user_id:adminTarget,confirm:$('admin-reset-word').value});if(own)deleted=true;
  adminTarget=null;$('admin-form').hidden=true;await refreshAfterAdmin();$('admin-feedback').textContent='Fairy and conversations permanently reset. That user can create another.';
 }catch(e){$('admin-feedback').textContent=e.message;$('admin-reset').disabled=false;}
};
setInterval(async()=>{
 if(document.hidden)return;
 if(me.signedIn&&me.fairy)await api('presence','POST',{}).catch(()=>{});
 try{await loadWorld();if(me.fairy){const data=await api('me');if(!data.fairy||data.fairy.id!==me.fairy.id){me={...data,history:data.history||[]};deleted=!me.fairy;$('dialogue').hidden=true;updateIdentity();drawWorld();updateDataPanel();}else if(!chatBusy){me.fairy=data.fairy;me.history=data.history||[];updateIdentity();updateDataPanel();drawWorld();}}}catch{}
},45000);
boot();
