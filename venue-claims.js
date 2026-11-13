/* ATK Venue Claims — request-only public surface; approvals are founder-controlled. */
(function(){
 'use strict';
 let busy=false, activeVenueId=null, activeMemberId=null, requestSerial=0, selectedRole='';
 const $=id=>document.getElementById(id);
 function make(tag,cls,content){
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(content!==undefined)e.textContent=content;
  return e;
 }
 function button(label,handler,cls){
  const b=make('button',cls,label);b.type='button';b.addEventListener('click',handler);return b;
 }
 // The action is part of the venue page itself, not dynamically inserted after load.
 const claim=$('atk-venue-claim-entry');
 if(!claim)return;
 claim.addEventListener('click',openClaim);
 const dlg=make('dialog','atk-venue-community-dialog atk-claim-dialog');
 dlg.id='atk-venue-claim-dialog';
 dlg.setAttribute('aria-labelledby','atk-claim-title');
 const form=make('form');
 form.noValidate=true;
 const title=make('h2','', 'Claim This Venue'); title.id='atk-claim-title';
 const intro=make('p','atk-community-context','Request to manage a venue listing. Ownership is granted only after verification and admin approval.');
 const venueName=make('p','atk-claim-venue-name');
 const roleLabel=make('p','atk-claim-label','What is your connection to this venue?');
 const roles=make('div','atk-claim-roles');
 roles.setAttribute('role','group');
 roles.setAttribute('aria-label','Your connection to this venue');
 for(const [value,label] of [['owner','Owner'],['manager','Manager'],['authorized_representative','Authorized Representative']]){
  const b=button(label,()=>selectRole(value),'atk-claim-role');
  b.dataset.role=value;b.setAttribute('aria-pressed','false');roles.append(b);
 }
 const controls=[
  ['name','Contact name','text',120],
  ['email','Work email','email',254],
  ['phone','Phone (optional)','tel',40]
 ];
 const inputs={};
 for(const [key,label,type,max] of controls){
  const wrap=make('label','atk-claim-field',label);
  const input=make('input');input.type=type;input.maxLength=max;
  input.autocomplete=key==='name'?'name':key==='email'?'email':'tel';
  input.id='atk-claim-'+key;
  wrap.append(input);form.append(wrap);inputs[key]=input;
 }
 const evidence=make('label','atk-claim-field','How can we verify your connection?');
 const detail=make('textarea');detail.id='atk-claim-details';
 detail.maxLength=1200;detail.rows=4;detail.placeholder='Business website, your position, or other information the team can use to verify you. Do not include passwords or private ID documents.';
 evidence.append(detail);
 const privacy=make('p','atk-community-context','Your contact details are private to the reviewing team. Sending this request does not change any venue permissions.');
 const status=make('p','atk-claim-status');status.id='atk-claim-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const footer=make('div','atk-community-dialog-actions');
 const cancel=button('Cancel',closeClaim);const submit=make('button','','Submit Claim');submit.type='submit';
 footer.append(cancel,submit);
 // Put the role selector before the contact fields.
 form.prepend(title,intro,venueName,roleLabel,roles);
 form.append(evidence,privacy,status,footer);
 form.addEventListener('submit',submitClaim);
 dlg.append(form);document.body.append(dlg);
 dlg.addEventListener('cancel',event=>{event.preventDefault();closeClaim()});
 function selectRole(role){
  selectedRole=role;
  roles.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));
 }
 function closeClaim(){if(!busy)dlg.close()}
 function current(){return typeof atkVenueCurrent==='function'?atkVenueCurrent():null}
 function isEligible(v){return !!(v?.databaseId&&v.publication_status==='published')}
 async function refreshEntry(){
  const serial=++requestSerial, v=current(), member=authUser?.id;
  claim.hidden=!isEligible(v);
  claim.disabled=false;claim.textContent='Claim Venue';
  if(!isEligible(v)||!member||!authClient)return;
  try{
   const {data,error}=await authClient.from('venue_claim_requests')
    .select('status').eq('venue_id',v.databaseId)
    .eq('claimant_user_id',member)
    .order('created_at',{ascending:false}).limit(1);
   if(error)throw error;
   if(serial!==requestSerial||current()?.databaseId!==v.databaseId||authUser?.id!==member)return;
   const last=data?.[0]?.status;
   if(last==='pending'){claim.textContent='Claim Pending';claim.disabled=true}
   if(last==='approved'){claim.textContent='Ownership Verified';claim.disabled=true}
  }catch(error){console.warn('Venue claim status unavailable',error)}
 }
 async function openClaim(){
  if(!atkVenueRequireAccount('claim a venue'))return;
  const v=current();
  if(!isEligible(v))return;
  busy=false;activeVenueId=v.databaseId;activeMemberId=authUser.id;selectedRole='';
  venueName.textContent=v.name+' · '+[v.city,v.state].filter(Boolean).join(', ');
  status.textContent='';
  roles.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));
  inputs.name.value=(typeof memberProfile!=='undefined'&&memberProfile?.stage_name)||'';
  inputs.email.value=authUser.email||'';
  inputs.phone.value='';detail.value='';
  dlg.showModal();
 }
 async function submitClaim(event){
  event.preventDefault();
  if(busy||!authClient||!authUser)return;
  if(authUser.id!==activeMemberId||current()?.databaseId!==activeVenueId){
   status.textContent='The venue or signed-in account has changed. Close this form and try again.';return;
  }
  const name=inputs.name.value.trim(),email=inputs.email.value.trim(),
   phone=inputs.phone.value.trim(),details=detail.value.trim();
  if(!selectedRole){status.textContent='Choose Owner, Manager or Authorized Representative.';return}
  if(name.length<3||!inputs.email.validity.valid||!email.includes('@')||details.length<20||(phone&&phone.length<7)){
   status.textContent='Enter your name, a valid work email, and at least 20 characters explaining how we can verify you.';return;
  }
  busy=true;submit.disabled=true;cancel.disabled=true;status.textContent='Submitting claim for review…';
  try{
   const {error}=await authClient.from('venue_claim_requests').insert({
    venue_id:activeVenueId,claimant_user_id:activeMemberId,
    contact_name:name,contact_email:email,contact_phone:phone||null,
    relationship:selectedRole,verification_details:details
   });
   if(error)throw error;
   dlg.close();message('Claim submitted. Your venue permissions remain unchanged until approval.');
   await refreshEntry();
   if(typeof window.atkClaimRefreshMyVenues==='function')window.atkClaimRefreshMyVenues();
   if(typeof approvalCenterBadge==='function')approvalCenterBadge();
  }catch(error){
   status.textContent=error.code==='23505'
    ?'You already have a pending claim for this venue.'
    :'Could not submit claim: '+(error.message||'Please try again.');
  }finally{busy=false;submit.disabled=false;cancel.disabled=false}
 }
 async function refreshMyVenues(){
  const entry=$('atk-owner-profile-entry');
  if(!entry||!authUser||!authClient)return;
  let wrap=$('atk-claim-my-requests');
  if(!wrap){
   wrap=make('div','atk-claim-my-requests');wrap.id='atk-claim-my-requests';
   const btn=entry.querySelector('.profile-owner-panel .member-button');
   btn?.parentElement.insertBefore(wrap,btn);
  }
  const uid=authUser.id;wrap.textContent='Checking your venue claims…';
  const {data,error}=await authClient.from('venue_claim_requests')
   .select('id,venue_id,status,created_at,reviewed_at,decision_note,venues(name,city,state)')
   .eq('claimant_user_id',uid).order('created_at',{ascending:false}).limit(30);
  if(!wrap.isConnected||authUser?.id!==uid)return;
  if(error){wrap.textContent='Unable to check claim requests.';return}
  // Claimants can find their messages even if they did not choose Venue Owner during setup.
  if(data?.length)entry.hidden=false;
  wrap.replaceChildren();
  if(!data?.length){wrap.append(make('p','atk-community-context','No ownership requests yet. Find a venue to submit one.'));return}
  for(const row of data){
   const label=row.status==='approved'?'Verified':row.status==='declined'?'Declined':'Pending review';
   const card=make('div','atk-claim-status-row');
   card.append(make('strong','',row.venues?.name||'Venue'),make('small','',label));
   if(row.status==='declined'){
    card.append(make('p','atk-claim-decision-copy','Message from the team: '+(row.decision_note||'Your claim was not approved. Contact the team if you need more information.')));
   }else if(row.status==='approved'){
    card.append(make('p','atk-claim-decision-copy','Your ownership claim was approved. Your verified venue permissions are now active.'));
   }
   wrap.append(card);
  }
 }
 window.atkClaimRefreshMyVenues=refreshMyVenues;
 const previousOpen=window.openVenue;
 if(typeof previousOpen==='function'){
  window.openVenue=function(id){const value=previousOpen.apply(this,arguments);refreshEntry();return value};
 }
 const ownerEntry=$('atk-owner-profile-entry');
 if(ownerEntry){
  ownerEntry.addEventListener('toggle',()=>{if(ownerEntry.open)refreshMyVenues()});
 }
 // Profile loading may reset interest-based section visibility; restore My Venues
 // for members with a real claim after their profile finishes loading.
 if(typeof memberLoad==='function'){
  const oldMemberLoad=window.memberLoad;
  window.memberLoad=async function(){
   const result=await oldMemberLoad.apply(this,arguments);
   if(authUser)await refreshMyVenues();
   return result;
  };
 }
 if(typeof authRefresh==='function'){
  // Keep status synchronized after sign-in, sign-out and profile refresh.
  const previousAuthRefresh=window.authRefresh;
  window.authRefresh=function(){const result=previousAuthRefresh.apply(this,arguments);refreshEntry();if(ownerEntry?.open)refreshMyVenues();return result};
 }
 // Critical: published venues are loaded asynchronously. A page opened before
 // the database returns must still reveal Claim Venue once its real record loads.
 if(window.liveVenueLoadPromise?.then){
  window.liveVenueLoadPromise.then(refreshEntry).catch(()=>refreshEntry());
 }
 window.atkClaimRefreshEntry=refreshEntry;
 refreshEntry();
})();
