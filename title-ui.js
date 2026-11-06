export function createTitleUI({world,onEnter,onCreate,onMenuAction}){
 const layer=document.getElementById('title-fairies'),menu=document.getElementById('fairy-menu');
 let slots=[],nodes=[],current=null,hold=null,suppressUntil=0;
 const $=id=>document.getElementById(id);
 function cancelHold(){clearTimeout(hold);hold=null;}
 function menuAt(f,point,options={}){
  if(!f)return;cancelHold();current=f;$('menu-name').textContent=f.name||'';
  $('menu-free').hidden=!options.owned||options.pending;
  $('menu-transfer').hidden=!options.transfer||options.pending;
  $('menu-resume').hidden=!options.pending;$('menu-cancel-move').hidden=!options.pending;$('menu-details').hidden=!!options.pending;
  for(const b of menu.querySelectorAll('button'))b.disabled=!!options.busy;
  $('menu-transfer').disabled=!!options.busy||!!options.transferFull;$('menu-transfer').textContent=options.transferFull?'Move offline · full':'Move offline…';
  menu.hidden=false;const rect=menu.getBoundingClientRect();
  menu.style.left=Math.max(12,Math.min(innerWidth-rect.width-12,point?.clientX??innerWidth/2))+'px';
  menu.style.top=Math.max(12,Math.min(innerHeight-rect.height-12,point?.clientY??innerHeight/2))+'px';
  menu.querySelector('button:not([hidden])')?.focus({preventScroll:true});
 }
 function closeMenu(){menu.hidden=true;current=null;}
 const actions={'menu-details':'details','menu-free':'free','menu-transfer':'transfer','menu-resume':'resume','menu-cancel-move':'cancel'};
 for(const [id,action] of Object.entries(actions))$(id).onclick=()=>{const f=current;closeMenu();if(f)onMenuAction(action,f);};
 document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target))closeMenu();});
 addEventListener('keydown',e=>{if(menu.hidden)return;if(e.key==='Escape'){e.stopPropagation();closeMenu();return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...menu.querySelectorAll('button:not([hidden]):not(:disabled)')],i=buttons.indexOf(document.activeElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
 function render(next,busy=false){
  cancelHold();slots=next;layer.replaceChildren();nodes=[];
  slots.forEach((f,i)=>{
   const button=document.createElement('button');button.className='fairy-pick'+(!f?' vacant':f.status==='creating'?' forming':'');
   button.type='button';button.disabled=busy||f?.status==='creating';button.setAttribute('aria-label',f?f.status==='pending-transfer'?'Resume moving '+f.name:f.status==='creating'?'Fairy forming':f.name+' · enter world':'Create fairy');
   if(f?.status==='ready'||f?.status==='pending-transfer')button.setAttribute('aria-haspopup','menu');
   if(!f||f.status==='creating'){const plus=document.createElement('span');plus.className='slot-add';plus.textContent=f?'◌':'+';button.append(plus);}
   if(f?.status==='pending-transfer'){const pending=document.createElement('span');pending.className='slot-pending';pending.textContent='↙';button.append(pending);}
   button.onclick=()=>{if(Date.now()<suppressUntil)return;if(f)onEnter(f);else onCreate();};
   function show(e){e.preventDefault();if(!f||f.status==='creating')return;const r=button.getBoundingClientRect();onMenuAction('menu',f,{clientX:e.clientX||r.x+r.width/2,clientY:e.clientY||r.y+r.height/2});}
   button.oncontextmenu=show;let down=null;
   button.onpointerdown=e=>{if(e.button!==0||!f)return;cancelHold();down={x:e.clientX,y:e.clientY};hold=setTimeout(()=>{suppressUntil=Date.now()+1000;show(e);},620);};
   button.onpointermove=e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>9)cancelHold();};
   button.onpointerup=button.onpointercancel=button.onpointerleave=()=>{cancelHold();down=null;};
   button.onkeydown=e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')show(e);};
   layer.append(button);nodes.push(button);
  });update();
 }
 function update(){for(let i=0;i<nodes.length;i++){const p=world.slotProject(i,slots.length);nodes[i].style.left=p.x+'px';nodes[i].style.top=p.y+'px';}}
 return {render,update,menuAt,closeMenu};
}
