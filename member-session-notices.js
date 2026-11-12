/* Build 139 - Sign-in review suspension notices and 24-hour browser sign-in window.
   The website sign-out is a convenience boundary, not a Supabase server-side timebox. */
(function(){
 'use strict';
 const MAX_AGE_MS=24*60*60*1000;
 const STORAGE_KEY='atk-signin-24h-session-v1';
 const SHOWN_PREFIX='atk-review-suspension-shown-v1:';
 let timer=null,signingOut=false,noticeInFlight=false,lastNoticeUser='',memoryWindow=null,dialog=null;
 const $=id=>document.getElementById(id);
 function readWindow(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch(_){return memoryWindow}
 }
 function writeWindow(value){
  memoryWindow=value;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch(_){}
 }
 function clearWindow(){
  memoryWindow=null;
  try{localStorage.removeItem(STORAGE_KEY)}catch(_){}
 }
 function decodeSessionId(token){
  try{
   const part=String(token||'').split('.')[1];
   if(!part)return '';
   const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
   const payload=JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'=')));
   return typeof payload.session_id==='string'?payload.session_id:'';
  }catch(_){return ''}
 }
 function clearTimer(){if(timer!==null)clearTimeout(timer);timer=null}
 function makeDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='atk-review-suspension-notice';
  dialog.className='atk-review-suspension-dialog';
  dialog.setAttribute('aria-labelledby','atk-review-suspension-heading');
  const title=document.createElement('h2');title.id='atk-review-suspension-heading';title.tabIndex=-1;
  title.textContent='Review Privileges Suspended';
  const intro=document.createElement('p');intro.id='atk-review-suspension-intro';
  intro.textContent='Your account is temporarily unable to submit venue reviews.';
  const reasonHead=document.createElement('strong');
  reasonHead.textContent='Reason';
  const reason=document.createElement('p');reason.id='atk-review-suspension-reason';
  const issuerHead=document.createElement('strong');issuerHead.textContent='Suspended by';
  const issuer=document.createElement('p');issuer.id='atk-review-suspension-issuer';
  const timeHead=document.createElement('strong');
  timeHead.textContent='Reviewing returns';
  const time=document.createElement('p');time.id='atk-review-suspension-until';
  const note=document.createElement('p');note.className='atk-review-suspension-note';
  note.textContent='You can still use the rest of Addicted to Karaoke while review privileges are suspended. They return automatically when the suspension ends.';
  const contact=document.createElement('details');contact.id='atk-suspension-contact';contact.className='atk-suspension-contact';
  const contactHeading=document.createElement('summary');contactHeading.textContent='Message the Admin Team';
  const form=document.createElement('form');form.id='atk-suspension-message-form';
  const contactLabel=document.createElement('label');contactLabel.htmlFor='atk-suspension-message';
  contactLabel.textContent='Questions about your suspension? Send a message to the admin team.';
  const contactInput=document.createElement('textarea');contactInput.id='atk-suspension-message';
  contactInput.minLength=10;contactInput.maxLength=1000;contactInput.rows=3;
  contactInput.placeholder='Please explain your question (10–1000 characters).';
  const contactStatus=document.createElement('p');contactStatus.id='atk-suspension-contact-status';
  contactStatus.setAttribute('role','status');contactStatus.setAttribute('aria-live','polite');
  const contactSend=document.createElement('button');contactSend.type='submit';contactSend.id='atk-suspension-message-send';
  contactSend.textContent='Send Message';
  form.append(contactLabel,contactInput,contactStatus,contactSend);
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   const text=contactInput.value.trim();
   if(text.length<10||text.length>1000){
    contactStatus.textContent='Please enter 10–1000 characters.';return;
   }
   contactSend.disabled=true;contactStatus.textContent='Sending your message…';
   try{
    const {data,error}=await authClient.rpc('send_review_suspension_message',{p_message:text});
    if(error)throw error;
    if(!data?.sent)throw Error(data?.message||'Your message is already recorded.');
    contactStatus.textContent='Your message was sent to the admin team.';
    contactInput.value='';contactInput.disabled=true;contactSend.hidden=true;
   }catch(error){contactStatus.textContent=error.message||'Unable to send. Please try again.';contactSend.disabled=false}
  });
  contact.append(contactHeading,form);
  const footer=document.createElement('footer');
  const close=document.createElement('button');close.type='button';close.className='member-button';close.textContent='Close';
  close.addEventListener('click',()=>dialog.close());
  footer.append(close);
  dialog.append(title,intro,reasonHead,reason,issuerHead,issuer,timeHead,time,note,contact,footer);
  document.body.append(dialog);
  return dialog;
 }
 async function showReviewSuspension(data){
  if(!data||data.mode!=='suspended')return false;
  const d=makeDialog(),until=String(data.suspended_until||'');
  $('atk-review-suspension-reason').textContent=String(data.reason||'Your review privileges were restricted.');
  $('atk-review-suspension-issuer').textContent=String(data.issued_by||'Site Moderator');
  const date=until?new Date(until):null;
  $('atk-review-suspension-until').textContent=date&&!Number.isNaN(date.getTime())
   ?date.toLocaleString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
   :'When your suspension expires.';
  const contact=$('atk-suspension-contact'),input=$('atk-suspension-message'),
   submit=$('atk-suspension-message-send'),status=$('atk-suspension-contact-status');
  contact.open=false;input.value='';input.disabled=false;submit.disabled=false;submit.hidden=false;status.textContent='';
  try{
   const {data:sent,error}=await authClient.rpc('get_my_review_suspension_message');
   if(error)throw error;
   if(sent?.sent){
    input.disabled=true;submit.hidden=true;status.textContent='Your message about this suspension is already on file.';
   }
  }catch(error){status.textContent='Message status unavailable. You may still send your message.';}
  if(!d.open){
   d.showModal();
   $('atk-review-suspension-heading')?.focus({preventScroll:true});
  }
  return true;
 }
 window.atkShowReviewSuspension=showReviewSuspension;
 function shownKey(userId,until){return SHOWN_PREFIX+userId+':'+String(until||'')}
 function alreadyShown(key){try{return sessionStorage.getItem(key)==='1'}catch(_){return lastNoticeUser===key}}
 function markShown(key){lastNoticeUser=key;try{sessionStorage.setItem(key,'1')}catch(_){}}
 function clearShownOnSignOut(userId){
  lastNoticeUser='';
  try{
   for(let i=sessionStorage.length-1;i>=0;i--){
    const key=sessionStorage.key(i);
    if(key&&key.startsWith(SHOWN_PREFIX+(userId||'')+':'))sessionStorage.removeItem(key);
   }
  }catch(_){}
 }
 async function showSuspensionIfAny(session){
  if(noticeInFlight||signingOut||!session?.user||!authClient)return;
  const userId=session.user.id;
  noticeInFlight=true;
  try{
   const {data,error}=await authClient.rpc('get_my_review_privileges');
   if(error)throw error;
   if(signingOut||authUser?.id!==userId||data?.mode!=='suspended')return;
   const until=String(data.suspended_until||'');
   const key=shownKey(userId,until);
   if(alreadyShown(key))return;
   if(!alreadyShown(key)){
    markShown(key);
    await showReviewSuspension(data);
   }
  }catch(err){console.warn('Review suspension sign-in notice unavailable',err)}
  finally{noticeInFlight=false}
 }
 async function expireSession(){
  if(signingOut||!authClient)return;
  signingOut=true;clearTimer();
  const previous=readWindow();
  try{
   const {error}=await authClient.auth.signOut();
   if(error)throw error;
   clearWindow();
   clearShownOnSignOut(previous?.userId);
   if(dialog?.open)dialog.close();
   if(typeof authMode==='function')authMode('login');
   if(typeof navigate==='function')navigate('signin');
   if(typeof authStatus==='function')authStatus('Your 24-hour sign-in period has ended. Please sign in again.');
  }catch(err){
   console.warn('Automatic 24-hour sign-out failed',err);
   if(typeof authStatus==='function')authStatus('Please sign out and sign in again to renew your session.');
   clearWindow();
  }finally{signingOut=false}
 }
 function applySession(session,event){
  if(!session?.user){
   if(event==='SIGNED_OUT'){
    const previous=readWindow();
    clearTimer();clearWindow();clearShownOnSignOut(previous?.userId);
    if(dialog?.open)dialog.close();
   }
   return;
  }
  if(signingOut)return;
  const userId=session.user.id,sessionId=decodeSessionId(session.access_token)||userId;
  const existing=readWindow();
  const now=Date.now();
  const same=existing?.userId===userId && existing?.sessionId===sessionId &&
    Number.isFinite(existing.startedAt)&&existing.startedAt>0&&existing.startedAt<now+300000;
  const windowState=same?existing:{userId,sessionId,startedAt:now};
  if(!same)writeWindow(windowState);
  clearTimer();
  const remaining=windowState.startedAt+MAX_AGE_MS-now;
  if(remaining<=0){void expireSession();return}
  timer=setTimeout(()=>{void expireSession()},remaining);
  if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='INITIAL_CHECK'){
   void showSuspensionIfAny(session);
  }
 }
 function checkOnReturn(){
  if(signingOut||!authClient)return;
  const state=readWindow();
  if(state?.userId&&Date.now()>=state.startedAt+MAX_AGE_MS){
   void expireSession();return;
  }
  if(!state&&authUser){
   void authClient.auth.getSession().then(({data,error})=>{if(!error)applySession(data?.session,'INITIAL_CHECK')})
    .catch(err=>console.warn('Session check unavailable',err));
  }
 }
 function install(){
  if(typeof authClient==='undefined'||!authClient?.auth)return;
  authClient.auth.onAuthStateChange((event,session)=>{
   // Avoid calling Supabase Auth methods from inside an auth callback.
   setTimeout(()=>applySession(session,event),0);
  });
  setTimeout(()=>{
   authClient.auth.getSession().then(({data,error})=>{
    if(!error)applySession(data?.session,'INITIAL_CHECK');
   }).catch(err=>console.warn('Initial session check unavailable',err));
  },0);
  window.addEventListener('focus',checkOnReturn);
  window.addEventListener('pageshow',checkOnReturn);
  document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible')checkOnReturn();
  });
 }
 install();
})();