export function setupAdmin({$,api,getMe,ensureAccount,refresh,profile,notice}){
let adminRows=[],adminTarget=null,adminOffset=0;
async function adminList(append=false){
 const data=await api('admin/list?offset='+(append?adminOffset:0));adminOffset=data.next;adminRows=append?[...adminRows,...data.fairies]:data.fairies;$('admin-more').hidden=data.next===null;$('admin-list').replaceChildren();
 for(const f of adminRows){
  const row=document.createElement('div');row.className='admin-row'+(adminTarget===f.user_id?' selected':'');row.append(profile(f.username));
  const b=document.createElement('button');b.textContent=f.name||'Unformed soul';b.onclick=()=>adminRead(f.user_id);const status=document.createElement('small');status.textContent=f.status;row.append(b,status);$('admin-list').append(row);
 }
}
async function openAdmin(){
 try{await ensureAccount();}catch(e){notice(e.message);return;}if(!getMe().admin){notice('The keeper’s panel belongs to this page’s creator.');return;}$('data-modal').close();$('admin-panel').hidden=false;$('admin-feedback').textContent='';
 try{await adminList();}catch(e){$('admin-feedback').textContent=e.message;}
}
async function adminRead(uid){
 try{
  const data=await api('admin/read','POST',{user_id:uid});adminTarget=uid;
  const f=data.fairy,form=$('admin-form');form.hidden=false;form.elements.name.value=f.name||'';form.elements.soul_md.value=f.soul_md;form.elements.memory_md.value=f.memory_md;form.elements.appearance.value=JSON.stringify(f.appearance,null,2);
  form.querySelector('.admin-target').textContent='user '+uid+' · fairy '+f.id+' · '+f.status;
  $('admin-signals').textContent=JSON.stringify({birth:f.signals,attitude:f.attitude},null,2);$('admin-history').textContent=data.history.map(m=>m.role+': '+m.content).join('\n\n');$('admin-reset-word').value='';$('admin-reset').disabled=true;$('admin-feedback').textContent='';
 }catch(e){$('admin-feedback').textContent=e.message;}
}
$('admin-open').onclick=openAdmin;$('admin-close').onclick=()=>{$('admin-panel').hidden=true;};$('admin-more').onclick=()=>adminList(true).catch(e=>{$('admin-feedback').textContent=e.message;});
addEventListener('keydown',e=>{
 if(e.key==='Escape'){$('admin-panel').hidden=true;return;}
 if((e.key==='~'||e.key==='`'||e.code==='Backquote')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
  e.preventDefault();if($('admin-panel').hidden)openAdmin();else $('admin-panel').hidden=true;
 }
});
async function refreshAfterAdmin(){await refresh();await adminList();}
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
  const own=adminRows.find(f=>f.user_id===adminTarget)?.id===getMe().fairy?.id;
  await api('admin/reset','POST',{user_id:adminTarget,confirm:$('admin-reset-word').value});
  adminTarget=null;$('admin-form').hidden=true;await refreshAfterAdmin();$('admin-feedback').textContent='Fairy and conversations permanently reset. That user can create another.';
 }catch(e){$('admin-feedback').textContent=e.message;$('admin-reset').disabled=false;}
};

}
