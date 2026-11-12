/* Build 138 - Review Privileges in Member Details.  Founder management view; enforcement lives in Supabase. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const el=(tag,cls,content)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(content!==undefined)node.textContent=String(content);
  return node;
 };
 const durations=[1,3,7];
 const modeNames={allowed:'Allowed',approval_required:'Approval Required',suspended:'Suspended'};
 let currentUser=null,lookupSerial=0,mode='allowed',state=null,working=false;
 function build(){
  if($('mg2-review-privileges'))return;
  const permissions=$('mg2-permissions'),details=$('management-member-details');
  if(!permissions||!details)return;
  const section=el('section','mg2-section mg2-review-privileges');
  section.id='mg2-review-privileges';
  const head=el('div','mg2-section-top');
  const title=el('span','mg2-section-title');
  title.innerHTML='<svg class="mg2-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6zM9 12l2 2 4-4"/></svg>';
  title.append(el('h3','','Review Privileges'));
  const edit=el('button','mg2-edit-button','Edit');edit.type='button';edit.id='mg2-review-edit';
  edit.hidden=true;edit.setAttribute('aria-expanded','false');
  edit.addEventListener('click',()=>{
   const editor=$('mg2-review-editor');
   editor.hidden=!editor.hidden;
   edit.setAttribute('aria-expanded',String(!editor.hidden));
   if(!editor.hidden){
    selectMode(state?.mode||'allowed');
    $('mg2-review-days').value='1';
    $('mg2-review-reason').value='';
    $('mg2-review-feedback').textContent='';
   }
  });
  head.append(title,edit);
  const summary=el('div','mg2-review-summary');summary.id='mg2-review-summary';
  summary.append(el('p','mg2-muted','Loading review privileges…'));
  const editor=el('div','mg2-review-editor');editor.id='mg2-review-editor';editor.hidden=true;
  const modes=el('div','mg2-review-modes');modes.setAttribute('role','group');modes.setAttribute('aria-label','Review permission');
  for(const [key,name,description] of [
   ['allowed','Allowed','Reviews can publish normally.'],
   ['approval_required','Approval Required','Send all reviews to moderation.'],
   ['suspended','Suspended','Temporarily stop new reviews.']
  ]){
   const control=el('button','mg2-review-mode');control.type='button';
   control.dataset.mode=key;control.setAttribute('aria-pressed','false');
   control.append(el('strong','',name),el('small','',description));
   control.addEventListener('click',()=>selectMode(key));
   modes.append(control);
  }
  const duration=el('div','mg2-review-duration');duration.id='mg2-review-duration';duration.hidden=true;
  const daysLabel=el('label','','Suspension duration');daysLabel.htmlFor='mg2-review-days';
  const select=el('select');select.id='mg2-review-days';
  for(const d of durations){
   const option=el('option','',d+' '+(d===1?'day':'days'));option.value=String(d);select.append(option);
  }
  duration.append(daysLabel,select,el('p','mg2-muted','The member can review again automatically when the suspension ends.'));
  const reasonLabel=el('label','','Reason for change');reasonLabel.htmlFor='mg2-review-reason';
  const textarea=el('textarea');textarea.id='mg2-review-reason';textarea.rows=3;
  textarea.maxLength=500;textarea.minLength=5;
  textarea.placeholder='Briefly explain the reason for this change.';
  const feedback=el('p','mg2-review-feedback');feedback.id='mg2-review-feedback';
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const actions=el('div','mg2-review-actions');
  const cancel=el('button','','Cancel');cancel.type='button';
  cancel.addEventListener('click',()=>{if(!working){editor.hidden=true;edit.setAttribute('aria-expanded','false')}});
  const save=el('button','','Save Changes');save.type='button';save.id='mg2-review-save';
  save.addEventListener('click',savePrivileges);
  actions.append(cancel,save);
  editor.append(modes,duration,reasonLabel,textarea,feedback,actions);
  section.append(head,summary,editor);
  permissions.after(section);
 }
 function selectMode(next){
  mode=next;
  document.querySelectorAll('#mg2-review-privileges [data-mode]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  });
  $('mg2-review-duration').hidden=mode!=='suspended';
 }
 function formatDate(input){
  if(!input)return 'Unknown date';
  const value=new Date(input);
  return Number.isNaN(value.getTime())?'Unknown date':value.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
 }
 function fillSummary(){
  const container=$('mg2-review-summary');
  if(!container)return;
  container.replaceChildren();
  if(!state){container.append(el('p','mg2-muted','Unable to load privileges.'));return}
  const line=el('div','mg2-review-state');
  const label=el('strong','',modeNames[state.mode]||'Allowed');
  label.classList.toggle('mg2-review-state-blocked',state.mode==='suspended');
  const detail=el('small','',state.mode==='suspended'?'Until '+formatDate(state.suspended_until):
   state.mode==='approval_required'?'New reviews must be approved before appearing.':'Verified members can submit reviews normally.');
  line.append(label,detail);container.append(line);
  const stats=el('div','mg2-review-stats');
  stats.append(el('span','',Number(state.recent_reviews||0)+' / '+Number(state.hourly_limit||10)+' reviews this hour'),
   el('span','','Prior suspensions: '+Number(state.suspension_count||0)));
  container.append(stats);
  if(state.mode==='suspended'&&state.reason){
   container.append(el('p','mg2-muted','Reason: '+state.reason));
  }
  if(state.mode==='suspended')container.append(el('p','mg2-muted','Email delivery pending setup. Suspension notice has been recorded.'));
  $('mg2-review-edit').hidden=!state.can_manage;
 }
 async function load(member){
  build();
  if(!$('mg2-review-privileges'))return;
  const serial=++lookupSerial;currentUser=member?.id||null;
  state=null;
  $('mg2-review-editor').hidden=true;
  $('mg2-review-edit').hidden=true;
  $('mg2-review-edit').setAttribute('aria-expanded','false');
  $('mg2-review-summary').replaceChildren(el('p','mg2-muted','Loading review privileges…'));
  if(!currentUser||!authClient)return;
  try{
   const {data,error}=await authClient.rpc('management_get_review_privileges',{p_user_id:currentUser});
   if(error)throw error;
   if(serial!==lookupSerial)return;
   state=data;fillSummary();return true;
  }catch(error){
   if(serial!==lookupSerial)return false;
   $('mg2-review-summary').replaceChildren(el('p','mg2-muted','Unable to load review privileges: '+(error.message||'Please try again.')));
   return false;
  }
 }
 async function savePrivileges(){
  if(working||!state?.can_manage||!currentUser)return;
  const reason=$('mg2-review-reason').value.trim();
  if(reason.length<5){
   $('mg2-review-feedback').textContent='Please enter a reason (at least 5 characters).';
   return;
  }
  const uid=currentUser,days=mode==='suspended'?Number($('mg2-review-days').value):null;
  working=true;$('mg2-review-save').disabled=true;
  $('mg2-review-feedback').textContent='Saving review privileges…';
  try{
   const {data,error}=await authClient.rpc('management_set_review_privileges',{
    p_user_id:uid,p_mode:mode,p_duration_days:days,p_reason:reason
   });
   if(error)throw error;
   if(data?.success!==true)throw Error('Update could not be verified.');
   if(currentUser!==uid)return;
   const savedMode=mode;
   const refreshed=await load({id:uid});
   if(currentUser!==uid)return;
   if(!refreshed)throw Error('Saved, but unable to refresh review privileges. Reopen this member to verify.');
   $('mg2-review-summary').append(el('p','mg2-review-success',
    savedMode==='suspended'?'Suspension saved. A notification record is ready for email setup.':'Review privileges updated.'));
  }catch(error){
   if(currentUser===uid)$('mg2-review-feedback').textContent=error.message||'Could not update review privileges.';
  }finally{
   working=false;
   const save=$('mg2-review-save');if(save)save.disabled=false;
  }
 }
 const original=window.managementMemberOpen;
 if(typeof original!=='function')return;
 window.managementMemberOpen=function(member){
  const result=original.apply(this,arguments);
  load(member);return result;
 };
})();
