/* Founder-only Founding Tester — Beta Team badge control in existing User Management member detail. */
(function(){
 'use strict';
 const get=id=>document.getElementById(id);
 let token=0,selected=null,loading=false;
 const el=(name,cls,text)=>{const n=document.createElement(name);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
 function founder(){
  return !!authUser&&authUser.id==='491e4116-52cc-4b4a-837f-cb5a28e74e53';
 }
 function ensure(){
  const parent=get('management-member-details'),hero=get('mg2-member-hero');
  if(!parent||!hero)return null;
  let panel=get('mg2-founding-tester');
  if(panel)return panel;
  panel=el('section','mg2-section','');panel.id='mg2-founding-tester';
  const top=el('div','mg2-section-top');
  top.append(el('h3','','Founding Tester — Beta Team'));
  const row=el('div','mg2-founding-row');
  const img=el('img');img.src='assets/badges/founding_tester.svg';img.alt='Founding Tester Beta Team badge';
  const copy=el('div','mg2-founding-copy');
  const counter=el('strong','','Loading badge status…');counter.id='mg2-founding-count';
  const info=el('p','','Exclusive to 25 eligible members. Founder-awarded; vacant spots return when an account is permanently deleted.');info.id='mg2-founding-note';
  copy.append(counter,info);row.append(img,copy);
  const actions=el('div','mg2-founding-actions');
  const award=el('button','member-button','Award Beta Badge');award.type='button';award.id='mg2-founding-award';award.disabled=true;
  const revoke=el('button','member-button','Revoke Badge');revoke.type='button';revoke.id='mg2-founding-revoke';revoke.disabled=true;revoke.hidden=true;
  const status=el('p','mg2-muted');status.id='mg2-founding-status';status.setAttribute('role','status');
  actions.append(award,revoke);panel.append(top,row,actions,status);
  hero.after(panel);
  award.addEventListener('click',()=>change('award'));
  revoke.addEventListener('click',()=>change('revoke'));
  return panel;
 }
 async function refresh(){
  const member=selected,request=++token,panel=ensure();
  if(!panel||!member||!founder()){if(panel)panel.hidden=true;return}
  panel.hidden=member.id===authUser.id||member.role==='founder';
  if(panel.hidden)return;
  const counter=get('mg2-founding-count'),award=get('mg2-founding-award'),revoke=get('mg2-founding-revoke');
  counter.textContent='Checking badge status…';award.disabled=true;revoke.disabled=true;
  try{
   const {data,error}=await authClient.rpc('founder_beta_badge_status',{p_user_id:member.id});
   if(error)throw error;
   if(request!==token||selected?.id!==member.id)return;
   counter.textContent=data.used+' of '+data.capacity+' badges awarded';
   award.hidden=!!data.awarded;award.disabled=!!data.awarded||data.used>=data.capacity;
   revoke.hidden=!data.awarded;revoke.disabled=!data.awarded;
   get('mg2-founding-status').textContent=data.awarded?'This member has the Founding Tester badge.':data.used>=data.capacity?'All badge spots are filled.':'This member has not received the badge.';
  }catch(error){
   if(request!==token)return;
   counter.textContent='Badge status unavailable';
   get('mg2-founding-status').textContent=error.message||'Try again.';
  }
 }
 function confirmBadgeChange(action,member){
  return new Promise(resolve=>{
   const dialog=el('dialog','mg2-beta-confirm');
   dialog.setAttribute('aria-labelledby','mg2-beta-confirm-heading');
   dialog.setAttribute('aria-modal','true');
   const shell=el('div','mg2-beta-confirm-shell');
   const brand=el('p','mg2-beta-confirm-brand','ADDicted to Karaoke');
   brand.textContent='Addicted to Karaoke';
   const heading=el('h2','',action==='award'?'Award Founding Tester?':'Revoke Founding Tester?');
   heading.id='mg2-beta-confirm-heading';
   const row=el('div','mg2-beta-confirm-detail');
   const image=el('img');
   image.src='assets/badges/founding_tester.svg';
   image.alt='Founding Tester — Beta Team badge';
   const copy=el('div','');
   copy.append(el('strong','','FOUNDING TESTER'),el('span','','BETA TEAM'));
   row.append(image,copy);
   const message=el('p','mg2-beta-confirm-message',
    (action==='award'?'Award':'Revoke')+' the Founding Tester — Beta Team badge '+
    (action==='award'?'to ':'from ')+(member.stage_name||'this member')+'?');
   const note=el('p','mg2-beta-confirm-note',action==='award'
    ?'This uses one of the 25 available badge spots.'
    :'This makes the badge spot available to another member.');
   const actions=el('div','mg2-beta-confirm-actions');
   const cancel=el('button','','Cancel');cancel.type='button';
   const confirm=el('button','mg2-beta-confirm-approve',action==='award'?'Award Badge':'Revoke Badge');
   confirm.type='button';
   actions.append(cancel,confirm);
   shell.append(brand,heading,row,message,note,actions);
   dialog.append(shell);
   let settled=false;
   function finish(approved){
    if(settled)return;
    settled=true;
    if(dialog.open)dialog.close();
    resolve(approved);
   }
   cancel.addEventListener('click',()=>finish(false));
   confirm.addEventListener('click',()=>finish(true));
   dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
   dialog.addEventListener('click',event=>{if(event.target===dialog)finish(false)});
   dialog.addEventListener('close',()=>{
    dialog.remove();
    if(!settled){settled=true;resolve(false)}
   },{once:true});
   document.body.append(dialog);
   try{dialog.showModal();cancel.focus()}
   catch(error){dialog.remove();if(!settled){settled=true;resolve(false)}}
  });
 }
 async function change(action){
  const member=selected;
  if(loading||!member||!founder())return;
  if(!await confirmBadgeChange(action,member))return;
  if(selected?.id!==member.id||!founder())return;
  loading=true;get('mg2-founding-award').disabled=true;get('mg2-founding-revoke').disabled=true;
  get('mg2-founding-status').textContent=action==='award'?'Awarding badge…':'Revoking badge…';
  try{
   const {data,error}=await authClient.rpc('founder_beta_badge_manage',{p_user_id:member.id,p_action:action});
   if(error)throw error;
   get('mg2-founding-status').textContent=action==='award'?'Badge awarded! The member will see their notification.':'Badge revoked; one spot is available again.';
   await refresh();
  }catch(error){get('mg2-founding-status').textContent='Unable to update badge: '+(error.message||'Please try again.');await refresh()}
  finally{loading=false}
 }
 const old=window.managementMemberOpen;
 if(typeof old!=='function')return;
 window.managementMemberOpen=function(member){
  selected=member;
  const result=old.apply(this,arguments);
  ensure();void refresh();
  return result;
 };
 const css=[
 '#mg2-founding-tester{margin-top:12px;padding:13px;border:1px solid #9a744d;border-radius:12px;background:linear-gradient(140deg,#361d20,#1c1114)}',
 '#mg2-founding-tester .mg2-section-top{margin-bottom:7px;color:#f2d7a4}',
 '.mg2-founding-row{display:flex;gap:11px;align-items:center}',
 '.mg2-founding-row img{width:56px;height:68px;object-fit:contain;flex:none}',
 '.mg2-founding-copy{min-width:0;color:#f3dfc4}',
 '.mg2-founding-copy strong{font:700 14px Georgia,serif}',
 '.mg2-founding-copy p{font:12px/1.4 Arial,sans-serif;margin:4px 0;color:#d7bc9f}',
 '.mg2-founding-actions{display:flex;gap:9px;margin-top:10px}',
 '.mg2-founding-actions button{font-size:13px;min-height:38px}',
 '#mg2-founding-status{font-size:12px;margin:8px 0 0}',
 '.mg2-beta-confirm{box-sizing:border-box;width:min(390px,calc(100vw - 30px));max-height:85dvh;overflow-y:auto;margin:auto;padding:0;border:1px solid #b68a58;border-radius:17px;background:linear-gradient(145deg,#32161b,#1b1012);color:#f6e7d2;box-shadow:0 20px 65px #000c}',
 '.mg2-beta-confirm::backdrop{background:rgba(0,0,0,.78)}',
 '.mg2-beta-confirm-shell{padding:22px 18px 17px;text-align:center}',
 '.mg2-beta-confirm-brand{font:italic 700 16px Georgia,serif;color:#d5a969;margin:0 0 12px}',
 '.mg2-beta-confirm h2{font:700 24px/1.2 Georgia,serif;color:#f9ebd6;margin:0 0 14px}',
 '.mg2-beta-confirm-detail{display:flex;justify-content:center;align-items:center;gap:13px;border:1px solid #865343;background:#432127;border-radius:12px;padding:10px 12px;text-align:left}',
 '.mg2-beta-confirm-detail img{width:57px;height:65px;object-fit:contain;flex:none}',
 '.mg2-beta-confirm-detail div{display:flex;flex-direction:column;gap:5px;min-width:0}',
 '.mg2-beta-confirm-detail strong{font:700 16px/1.2 Georgia,serif;color:#ffe6b6}',
 '.mg2-beta-confirm-detail span{font:700 11px/1.2 Arial,sans-serif;color:#d8ac71;letter-spacing:1.4px}',
 '.mg2-beta-confirm-message{font:15px/1.5 Arial,sans-serif;color:#f6e7d2;margin:16px 0 7px;overflow-wrap:anywhere}',
 '.mg2-beta-confirm-note{font:12px/1.4 Arial,sans-serif;color:#d8bca1;margin:0 0 17px}',
 '.mg2-beta-confirm-actions{display:flex;gap:10px}',
 '.mg2-beta-confirm-actions button{flex:1;min-width:0;min-height:44px;padding:12px 8px;border-radius:10px;border:1px solid #e36f62;background:linear-gradient(#a72a27,#671312);color:#fff0e1;font:700 14px Arial,sans-serif;cursor:pointer}',
 '.mg2-beta-confirm-actions button:focus-visible{outline:2px solid #ffdea5;outline-offset:3px}',
 '.mg2-beta-confirm-actions .mg2-beta-confirm-approve{background:linear-gradient(#bc342d,#761511)}',
 '#mg2-founding-tester[hidden]{display:none!important}'
 ].join('');
 const style=el('style');style.textContent=css;document.head.append(style);
})();
