/* Build 141 — Notification Center additions for review suspension notices/messages.
   All data and state changes come from access-controlled Supabase RPCs. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 let lastFeed=null,fetchSerial=0,staffDialog=null,staffButton=null,staffAccessSerial=0;
 const make=(tag,cls,text)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);return e;
 };
 function button(text,fn,cls){
  const e=make('button',cls,text);e.type='button';if(fn)e.addEventListener('click',fn);return e;
 }
 function formatDate(t){
  const d=new Date(t);
  return Number.isNaN(d.getTime())?'Unknown date':d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
 }
 function notify(text){
  const status=$('atk-approval-feedback');if(status&&!$('management-approvals')?.hidden)status.textContent=text;
  const second=$('atk-staff-notifications-feedback');if(staffDialog?.open&&second)second.textContent=text;
 }
 async function loadFeed(){
  if(!authClient||!authUser)return null;
  const owner=authUser.id,serial=++fetchSerial;
  const {data,error}=await authClient.rpc('management_review_notification_feed');
  if(error)throw error;
  if(owner!==authUser?.id||serial!==fetchSerial)return null;
  lastFeed=data;return data;
 }
 function feedCounts(data){
  return Number(data?.suspensions?.length||0)+Number(data?.messages?.length||0);
 }
 function options(){
  const filter=$('atk-approval-filter');
  if(!filter||filter.querySelector('option[value="suspensions"]'))return;
  for(const [value,text] of [['suspensions','Review suspensions'],['messages','Suspension messages']]){
   const o=document.createElement('option');o.value=value;o.textContent=text;filter.append(o);
  }
 }
 async function act(kind,id,action){
  notify(action==='dismiss'?'Hiding this notification for your account…':'Marking message handled…');
  try{
   const params=action==='dismiss'
    ?['management_dismiss_review_notification',{p_kind:kind,p_id:id}]
    :['management_review_notification_action',{p_kind:kind,p_id:id,p_action:'resolve'}];
   const {data,error}=await authClient.rpc(params[0],params[1]);
   if(error)throw error;
   if(data?.success!==true)throw Error('Change could not be confirmed.');
   const fresh=await loadFeed();
   if(!fresh)throw Error('Unable to refresh notifications. Please reopen this view.');
   if(staffDialog?.open)renderStaff(fresh);
   if(!$('management-approvals')?.hidden)renderFounder(fresh);
   notify(action==='dismiss'?'Hidden only for your account. Other moderators can still see it.':'Message marked handled for the team.');
  }catch(e){notify('Unable to update notification: '+(e.message||'Please try again.'))}
 }
 function detailCard(title,subtitle){
  const outer=make('details','atk-approval-card atk-review-notification-card');
  const heading=make('summary');
  const copy=make('span');copy.append(make('strong','',title),make('small','',subtitle));
  heading.append(copy,make('span','atk-approval-chevron','›'));
  const inside=make('div','atk-approval-details');outer.append(heading,inside);
  return {outer,inside};
 }
 function cardForSuspension(row){
  const {outer,inside}=detailCard(row.stage_name||'Member',
    (row.active?'Review privileges suspended':'Suspension expired')+' · '+formatDate(row.created_at));
  inside.append(make('p','',Number(row.suspension_days||0)+'-day suspension · '+(row.active?'Active':'Expired')));
  inside.append(make('p','','Issued by: '+(row.issued_by||'Site Moderator')));
  inside.append(make('p','','Until: '+formatDate(row.suspended_until)));
  inside.append(make('p','','Reason: '+(row.reason||'No reason recorded.')));
  const actions=make('div','atk-approval-actions');
  actions.append(button('Hide for Me',()=>act('suspension',row.id,'dismiss')));
  if(typeof approvalCenterMemberOpen==='function'&&staffDialog?.open!==true){
   actions.append(button('Member Details',()=>approvalCenterMemberOpen({id:row.user_id,stage_name:row.stage_name})));
  }
  inside.append(actions);return outer;
 }
 function cardForMessage(row){
  const {outer,inside}=detailCard(row.stage_name||'Member',
    'Message about review suspension · '+formatDate(row.created_at));
  inside.append(make('p','','Received: '+formatDate(row.created_at)));
  inside.append(make('p','','Suspension ends: '+formatDate(row.suspended_until)));
  const content=make('p','atk-review-notification-message',row.message||'');
  inside.append(content);
  const actions=make('div','atk-approval-actions');
  actions.append(button('Hide for Me',()=>act('message',row.id,'dismiss')));
  const done=button('Mark Handled',()=>{
   if(done.dataset.confirm!=='yes'){
    done.dataset.confirm='yes';done.textContent='Confirm Handled';return;
   }
   act('message',row.id,'resolve');
  });
  actions.append(done);inside.append(actions);return outer;
 }
 function fillFeed(root,feed,filter){
  const suspensions=Array.isArray(feed?.suspensions)?feed.suspensions:[];
  const messages=Array.isArray(feed?.messages)?feed.messages:[];
  const showS=filter==='all'||filter==='suspensions';
  const showM=filter==='all'||filter==='messages';
  if(showM&&(messages.length||filter==='messages')){
   root.append(make('h3','atk-approval-group-label','Suspension messages · '+messages.length));
   if(!messages.length)root.append(make('p','atk-approval-muted','No suspension messages to handle.'));
   messages.forEach(x=>root.append(cardForMessage(x)));
  }
  if(showS&&(suspensions.length||filter==='suspensions')){
   root.append(make('h3','atk-approval-group-label','Review suspensions · '+suspensions.length));
   if(!suspensions.length)root.append(make('p','atk-approval-muted','No new suspension notifications.'));
   suspensions.forEach(x=>root.append(cardForSuspension(x)));
  }
 }
 function renderFounder(data){
  const root=$('atk-approval-results'),panel=$('management-approvals');
  if(!root||panel?.hidden||!data)return;
  root.querySelectorAll('[data-notification-section="true"]').forEach(x=>x.remove());
  const holder=make('section','atk-review-notification-section');
  holder.dataset.notificationSection='true';
  fillFeed(holder,data,$('atk-approval-filter')?.value||'all');
  root.append(holder);
  const summary=$('atk-approval-summary');
  const suffix=feedCounts(data);
  if(summary){
   const base=summary.textContent.replace(/ · \d+ review notification(?:s)?$/,'');
   summary.textContent=base+(suffix?' · '+suffix+' review notification'+(suffix===1?'':'s'):'');
  }
 }
 async function refreshFounder(){
  try{
   const data=await loadFeed();
   if(!data)return;
   renderFounder(data);
  }catch(e){notify('Review notifications unavailable: '+(e.message||'Please try again.'))}
 }
 function adjustBadge(data){
  const badge=$('management-approval-count');
  if(!badge||!data)return;
  const base=badge.textContent.replace(/ · \d+ review notification(?:s)?$/,'');
  const count=feedCounts(data);
  badge.textContent=base+(count?' · '+count+' review notification'+(count===1?'':'s'):'');
 }
 function createStaffUI(){
  if(staffDialog)return;
  const profileAnchor=$('management-open');
  if(profileAnchor){
   staffButton=button('Notification Center',()=>openStaff(), 'profile-action atk-staff-notification-entry');
   staffButton.id='atk-staff-notification-entry';
   staffButton.hidden=true;profileAnchor.after(staffButton);
  }
  staffDialog=document.createElement('dialog');
  staffDialog.id='atk-staff-notifications-dialog';
  staffDialog.className='management-dialog atk-staff-notifications-dialog';
  staffDialog.setAttribute('aria-labelledby','atk-staff-notifications-heading');
  const title=make('h2','', 'Notification Center');title.id='atk-staff-notifications-heading';
  const explanation=make('p','atk-approval-intro','Review suspensions and messages from members.');
  const count=make('p','atk-approval-summary','Loading notifications…');count.id='atk-staff-notifications-summary';
  const results=make('div','atk-staff-notification-results');results.id='atk-staff-notifications-results';
  const feedback=make('p','');feedback.id='atk-staff-notifications-feedback';
  feedback.setAttribute('role','status');
  const close=button('Close',()=>staffDialog.close(),'member-button atk-staff-notifications-close');
  staffDialog.append(title,explanation,count,results,feedback,close);document.body.append(staffDialog);
 }
 function renderStaff(data){
  const root=$('atk-staff-notifications-results');
  if(!root)return;
  root.replaceChildren();
  const count=feedCounts(data);
  $('atk-staff-notifications-summary').textContent=
   count?count+' notification'+(count===1?'':'s'):'All caught up — no notifications waiting.';
  fillFeed(root,data,'all');
 }
 async function openStaff(){
  if(!authClient||!authUser)return;
  createStaffUI();
  staffDialog.showModal();
  $('atk-staff-notifications-results').textContent='';
  $('atk-staff-notifications-summary').textContent='Loading notifications…';
  $('atk-staff-notifications-feedback').textContent='';
  try{const data=await loadFeed();if(data&&staffDialog.open)renderStaff(data)}
  catch(e){$('atk-staff-notifications-summary').textContent='Unable to load notifications: '+(e.message||'Please try again.')}
 }
 async function updateStaffAccess(){
  createStaffUI();
  const serial=++staffAccessSerial,id=authUser?.id;
  if(staffButton)staffButton.hidden=true;
  if(!id||!authClient)return;
  try{
   // Do not expose the staff-only entrance unless server-side role checks succeed.
   const {data,error}=await authClient.rpc('management_review_notification_feed');
   if(serial!==staffAccessSerial||authUser?.id!==id)return;
   if(error)throw error;
   if(staffButton){
    // Founder already has the notification center inside Management Portal.
    const {data:founder,error:fe}=await authClient.rpc('is_platform_founder');
    if(serial!==staffAccessSerial||authUser?.id!==id)return;
    staffButton.hidden=!fe&&founder===true;
   }
  }catch(e){if(staffButton)staffButton.hidden=true}
 }
 options();
 const previousRender=window.approvalCenterRender;
 const previousRefresh=window.approvalCenterRefresh;
 const previousBadge=window.approvalCenterBadge;
 if(typeof previousRender==='function'){
  window.approvalCenterRender=function(){
   const value=previousRender.apply(this,arguments);
   renderFounder(lastFeed);return value;
  };
 }
 if(typeof previousRefresh==='function'){
  window.approvalCenterRefresh=async function(){
   const value=await previousRefresh.apply(this,arguments);
   if(!$('management-approvals')?.hidden)await refreshFounder();
   return value;
  };
 }
 if(typeof previousBadge==='function'){
  window.approvalCenterBadge=async function(){
   const value=await previousBadge.apply(this,arguments);
   try{adjustBadge(await loadFeed())}catch(e){console.warn('Review notification badge unavailable',e)}
   return value;
  };
 }
 createStaffUI();
 if(authClient?.auth){
  authClient.auth.onAuthStateChange((_event,session)=>{
   setTimeout(()=>{if(session?.user)void updateStaffAccess();else{
    ++staffAccessSerial;if(staffButton)staffButton.hidden=true;
    if(staffDialog?.open)staffDialog.close();lastFeed=null;
   }},0);
  });
  if(authUser)void updateStaffAccess();
 }
})();
