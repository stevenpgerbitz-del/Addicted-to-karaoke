/* Founder-only Community Supporter award/revoke panel, Addicted to Karaoke. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
let selected=null,serial=0,busy=false;
function ensure(){
 let panel=$('abm-community-panel');
 if(panel)return panel;
 const hero=$('mg2-member-hero'),parent=$('management-member-details');
 if(!hero||!parent)return null;
 panel=el('section','mg2-section');panel.id='abm-community-panel';
 panel.style.cssText='margin-top:12px;padding:14px;border:1px solid #a77a4b;border-radius:12px;background:linear-gradient(145deg,#351b21,#1d1215);color:#f7e4ca';
 const title=el('h3','','Community Supporter');
 title.style.cssText='color:#efd2a2;font:700 17px Georgia,serif;margin:0 0 8px';
 const copy=el('p','','Founder recognition for a member who goes above and beyond supporting the karaoke community.');
 copy.style.cssText='font-size:12px;line-height:1.5;color:#d7bca4;margin:0 0 12px';
 const actions=el('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
 const award=el('button','member-button','Award Community Supporter');award.type='button';award.id='abm-community-award';
 const revoke=el('button','member-button','Revoke Community Supporter');revoke.type='button';revoke.id='abm-community-revoke';
 const info=el('p','','Checking badge status…');info.id='abm-community-status';info.style.cssText='font-size:12px;color:#e1c4ad;margin:10px 0 0';info.setAttribute('role','status');
 award.addEventListener('click',()=>change('award'));revoke.addEventListener('click',()=>change('revoke'));
 actions.append(award,revoke);panel.append(title,copy,actions,info);
 const beta=$('mg2-founding-tester');if(beta)beta.after(panel);else hero.after(panel);
 return panel;
}
async function refresh(){
 const member=selected,request=++serial,panel=ensure();
 if(!panel||!member||!authUser)return;
 panel.hidden=member.id===authUser.id||member.role==='founder';
 if(panel.hidden)return;
 const award=$('abm-community-award'),revoke=$('abm-community-revoke'),status=$('abm-community-status');
 award.disabled=true;revoke.disabled=true;status.textContent='Checking badge status…';
 try{
  const {data,error}=await authClient.rpc('founder_community_badge_status',{p_user_id:member.id});
  if(error)throw error;
  if(request!==serial||selected?.id!==member.id)return;
  award.hidden=!!data.awarded;revoke.hidden=!data.awarded;award.disabled=!!data.awarded;revoke.disabled=!data.awarded;
  status.textContent=data.awarded?'This member holds the Community Supporter badge.':'This member has not yet received Community Supporter.';
 }catch(e){if(request===serial)status.textContent='Badge status unavailable: '+(e.message||'Please retry')}
}
async function confirmChange(action,member){
 const dlg=el('dialog');dlg.style.cssText='width:min(380px,95vw);border:2px solid #c49a62;border-radius:15px;background:#2b141a;color:#fff1d9;padding:18px;text-align:center';
 dlg.append(el('h3','','Community Supporter'),el('p','',(action==='award'?'Award to ':'Revoke from ')+(member.stage_name||'this member')+'?'));
 const actions=el('div');actions.style.cssText='display:flex;gap:12px;justify-content:center';
 const cancel=el('button','member-button','Cancel'),okay=el('button','member-button',action==='award'?'Award Badge':'Revoke Badge');
 cancel.style.minHeight=okay.style.minHeight='42px';actions.append(cancel,okay);dlg.append(actions);document.body.append(dlg);
 return new Promise(resolve=>{
  let done=false;const close=value=>{if(done)return;done=true;dlg.close();dlg.remove();resolve(value)};
  cancel.onclick=()=>close(false);okay.onclick=()=>close(true);dlg.addEventListener('cancel',e=>{e.preventDefault();close(false)});
  dlg.showModal();
 });
}
async function change(action){
 const member=selected;if(busy||!member||!authUser)return;
 if(!await confirmChange(action,member)||selected?.id!==member.id)return;
 busy=true;$('abm-community-award').disabled=true;$('abm-community-revoke').disabled=true;
 $('abm-community-status').textContent='Saving badge…';
 try{
  const {error}=await authClient.rpc('founder_community_badge_manage',{p_user_id:member.id,p_action:action});if(error)throw error;
  await refresh();$('abm-community-status').textContent=action==='award'?'Community Supporter badge awarded and logged.':'Community Supporter badge revoked and logged.';
 }catch(e){$('abm-community-status').textContent='Unable to update: '+(e.message||'Please retry')}
 finally{busy=false}
}
const original=window.managementMemberOpen;
if(typeof original!=='function')return;
window.managementMemberOpen=function(member){
 selected=member;const result=original.apply(this,arguments);
 ensure();void refresh();return result;
};
})();