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
 async function change(action){
  const member=selected;
  if(loading||!member||!founder())return;
  if(action==='revoke'&&!window.confirm('Revoke the Founding Tester badge from '+(member.stage_name||'this member')+'? This frees one of the 25 spots.'))return;
  if(action==='award'&&!window.confirm('Award the Founding Tester — Beta Team badge to '+(member.stage_name||'this member')+'?'))return;
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
 '#mg2-founding-tester[hidden]{display:none!important}'
 ].join('');
 const style=el('style');style.textContent=css;document.head.append(style);
})();
