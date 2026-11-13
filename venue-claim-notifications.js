/* ATK Build 152 — Private venue claim decision notices for each claimant.
   The review decision and text are saved by the Founder RPC; this reads only
   claimant-owned rows under Supabase RLS, with durable one-time acknowledgment. */
(function(){
 'use strict';
 if(!document.getElementById('atk-owner-profile-entry'))return;
 const node=(tag,cls,value)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=String(value);
  return el;
 };
 let dialog=null,venueLabel=null,messageBody=null,reasonBody=null,noticeFeedback=null,closeButton=null;
 let activeClaim=null,activeUser=null,saving=false,requestSeq=0;
 function ensureDialog(){
  if(dialog)return;
  dialog=node('dialog','atk-venue-community-dialog atk-claim-decision-dialog');
  dialog.id='atk-claim-decision-notice';
  dialog.setAttribute('aria-labelledby','atk-claim-decision-title');
  const title=node('h2','','Venue Claim Update');title.id='atk-claim-decision-title';
  venueLabel=node('p','atk-claim-decision-venue');
  messageBody=node('p','atk-claim-decision-body');
  reasonBody=node('div','atk-claim-decision-reason');
  const explanation=node('p','atk-community-context','This is a private message about your venue ownership request. Your decision history remains available under Profile → My Venues.');
  noticeFeedback=node('p','atk-claim-notice-feedback');
  noticeFeedback.setAttribute('role','status');noticeFeedback.setAttribute('aria-live','polite');
  const footer=node('div','atk-community-dialog-actions atk-claim-notice-footer');
  closeButton=node('button','','Close');closeButton.type='button';
  closeButton.addEventListener('click',markReadAndClose);
  footer.append(closeButton);
  dialog.append(title,venueLabel,messageBody,reasonBody,explanation,noticeFeedback,footer);
  dialog.addEventListener('cancel',event=>{
   event.preventDefault();
   if(!saving)void markReadAndClose();
  });
  document.body.append(dialog);
 }
 function render(claim,user){
  ensureDialog();
  activeClaim=claim;activeUser=user;
  const name=claim.venues?.name||'Your venue';
  const declined=claim.status==='declined';
  venueLabel.textContent=name;
  messageBody.textContent=declined
   ?'Your request to claim this venue was not approved.'
   :'Your venue ownership request has been approved.';
  reasonBody.replaceChildren();
  const heading=node('strong','',declined?'Reason from the review team':'Decision');
  const detail=node('p','',declined
   ?(claim.decision_note||'The review team could not verify your connection to this venue. Please contact the team for more details.')
   :'Your account has been linked to this venue as a verified owner.');
  reasonBody.append(heading,detail);
  noticeFeedback.textContent='';
  closeButton.disabled=false;
  dialog.showModal();
 }
 async function check(){
  const uid=authUser?.id,sequence=++requestSeq;
  if(!uid||!authClient){
   if(dialog?.open)dialog.close();
   activeClaim=null;activeUser=null;
   return;
  }
  if(dialog?.open||saving)return;
  try{
   const {data:claims,error}=await authClient.from('venue_claim_requests')
    .select('id,status,decision_note,reviewed_at,venues(name)')
    .eq('claimant_user_id',uid).in('status',['declined','approved'])
    .order('reviewed_at',{ascending:true}).limit(50);
   if(error)throw error;
   if(sequence!==requestSeq||authUser?.id!==uid||!claims?.length)return;
   const {data:readRows,error:readsError}=await authClient.from('venue_claim_decision_reads')
    .select('claim_id').eq('claimant_user_id',uid).in('claim_id',claims.map(x=>x.id));
   if(readsError)throw readsError;
   if(sequence!==requestSeq||authUser?.id!==uid)return;
   const read=new Set((readRows||[]).map(x=>x.claim_id));
   const unread=claims.find(x=>!read.has(x.id));
   if(!unread||dialog?.open)return;
   // Do not overlay an onboarding wizard, authentication dialog, or management task.
   if(document.querySelector('dialog[open]'))return;
   render(unread,uid);
  }catch(error){
   console.warn('Venue claim decision notice unavailable',error);
  }
 }
 async function markReadAndClose(){
  if(saving||!activeClaim||!dialog?.open)return;
  const id=activeClaim.id,uid=activeUser;
  if(!uid||authUser?.id!==uid){dialog.close();activeClaim=null;return;}
  saving=true;closeButton.disabled=true;noticeFeedback.textContent='Marking message read…';
  try{
   const {error}=await authClient.from('venue_claim_decision_reads')
    .insert({claim_id:id,claimant_user_id:uid});
   if(error&&error.code!=='23505')throw error;
   dialog.close();activeClaim=null;activeUser=null;
   // The next check starts only after saving is reset in finally.
   setTimeout(scheduleCheck,0);
  }catch(error){
   noticeFeedback.textContent='Could not mark the message read. Please try Close again.';
  }finally{
   saving=false;closeButton.disabled=false;
  }
 }
 function scheduleCheck(){Promise.resolve().then(check).catch(error=>console.warn('Claim decision check unavailable',error))}
 // Recheck after login/profile activation, returning to the tab, and closing other
 // site dialogs. No client-side role flags can expose another member's decision.
 const previousRefresh=window.authRefresh;
 if(typeof previousRefresh==='function'){
  window.authRefresh=function(){
   const result=previousRefresh.apply(this,arguments);
   scheduleCheck();
   return result;
  };
 }
 window.addEventListener('focus',scheduleCheck);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCheck()});
 document.addEventListener('close',event=>{
  if(event.target===dialog||!authUser)return;
  scheduleCheck();
 },true);
 scheduleCheck();
})();
