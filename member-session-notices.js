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
/* A2K earned-badge notifications: non-modal, vintage, one notification per new server award. */
(function(){
 'use strict';
 const KEY='atk-seen-badge-awards-v1:',MS=10000;
 let checking=false,activeUser='',toast=null,timeout=null,queue=[];
 function clear(){
  if(timeout)clearTimeout(timeout);
  timeout=null;
  if(toast)toast.remove();
  toast=null;
  if(queue.length)setTimeout(showNext,150);
 }
 function openBadges(){
  clear();
  if(typeof navigate==='function')navigate('signin');
  if(typeof memberLoadBadges==='function'&&authUser?.id)void memberLoadBadges(authUser.id);
  const section=document.querySelector('#auth-profile .profile-about-awards');
  if(section){const details=section.closest('details');if(details)details.open=true;section.scrollIntoView({behavior:'smooth',block:'center'});}
 }
 function showNext(){
  if(toast||!queue.length)return;
  const item=queue.shift(),el=document.createElement('div');
  el.className='atk-earned-toast';el.setAttribute('role','status');
  const button=document.createElement('button');button.type='button';button.className='atk-earned-open';
  const image=document.createElement('img');image.src='assets/badges/'+encodeURIComponent(item.code)+'.png?v=319';image.alt='';
  image.onerror=()=>{image.hidden=true};
  const words=document.createElement('span');words.className='atk-earned-words';
  const kicker=document.createElement('small');kicker.textContent=item.kind==='removed'?'BADGE UPDATE':'NEW BADGE EARNED!';
  const title=document.createElement('strong');title.textContent=item.label;
  const sub=document.createElement('span');sub.textContent=item.kind==='removed'?'This badge has been removed from your profile.':(item.code==='founding_tester'?'Welcome to the Beta Team!':(item.description||'View your badges'));
  words.append(kicker,title,sub);button.append(image,words);button.addEventListener('click',openBadges);
  const close=document.createElement('button');close.type='button';close.className='atk-earned-close';
  close.textContent='×';close.setAttribute('aria-label','Dismiss notification');close.addEventListener('click',clear);
  el.append(button,close);document.body.append(el);toast=el;timeout=setTimeout(clear,item.kind==='removed'?8000:5000);
 }
 async function check(){
  if(checking||typeof authClient==='undefined'||!authClient||typeof authUser==='undefined'||!authUser?.id)return;
  checking=true;const id=authUser.id;
  try{
   const {data,error}=await authClient.from('profile_badge_awards')
    .select('badge_code,awarded_at,profile_badge_types(label,category,description)').eq('user_id',id);
   if(error)throw error;
   if(authUser?.id!==id)return;
   const items=(data||[]).filter(v=>v.profile_badge_types&&(v.profile_badge_types.category==='achievement'||v.badge_code==='founder'));
   const storageKey=KEY+id;
   let before=null;
   try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(Array.isArray(saved))before=new Set(saved);}catch(_){}
   const codes=[...new Set(items.map(v=>v.badge_code))];
   try{localStorage.setItem(storageKey,JSON.stringify(codes));}catch(_){}
   const now=Date.now(),newItems=items.filter(v=>{
    if(before)return !before.has(v.badge_code);
    const age=now-Date.parse(v.awarded_at||'');
    return Number.isFinite(age)&&age>=0&&age<120000;
   });
   // Compare only with a previously recorded server result. First-time visitors
   // never receive spurious "removed" notifications for earlier changes.
   const removedCodes=before?[...before].filter(code=>!codes.includes(code)):[];
   let removedLabels={};
   if(removedCodes.length){
    try{
     const {data:types,error:typesError}=await authClient.from('profile_badge_types')
      .select('code,label').in('code',removedCodes);
     if(!typesError&&Array.isArray(types))
      for(const t of types)removedLabels[t.code]=t.label;
    }catch(err){console.warn('Badge titles unavailable for update notification',err)}
   }
   // Recheck identity after the optional catalog lookup to avoid cross-account
   // notifications if somebody signs out while the request is in flight.
   if(authUser?.id!==id)return;
   for(const v of newItems)queue.push({
    kind:'earned',code:String(v.badge_code),
    label:String(v.profile_badge_types.label||'New badge'),
    description:String(v.profile_badge_types.description||'')
   });
   for(const code of removedCodes)queue.push({
    kind:'removed',code:String(code),
    label:String(removedLabels[code]||'Achievement badge'),description:''
   });
   // Keep the existing gallery fresh without forcing a reload or displaying
   // anything to other members.
   if((newItems.length||removedCodes.length)&&!toast)showNext();
   if((newItems.length||removedCodes.length)&&
      !document.getElementById('auth-profile')?.hidden&&
      typeof memberLoadBadges==='function')void memberLoadBadges(id);
  }catch(err){console.warn('Badge notifications unavailable',err)}
  finally{checking=false}
 }
 function sync(){
  const id=typeof authUser!=='undefined'?authUser?.id||'':'';
  if(id!==activeUser){
   activeUser=id;queue=[];if(toast){toast.remove();toast=null}
   if(timeout){clearTimeout(timeout);timeout=null}
  }
  if(id&&document.visibilityState==='visible')void check();
 }
 const css=[
 '.atk-earned-toast{position:fixed;right:20px;bottom:24px;z-index:9000;width:min(330px,calc(100vw - 28px));display:flex;align-items:flex-start;border:1px solid #b38a51;border-radius:12px;background:linear-gradient(145deg,#421b24,#241216);box-shadow:0 6px 25px #0008;color:#f7e5c8;animation:atk-earned-in .2s ease-out}',
 '.atk-earned-open{flex:1;display:flex;gap:10px;align-items:center;min-width:0;padding:10px 4px 10px 11px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}',
 '.atk-earned-open img{width:44px;height:50px;object-fit:contain;flex:none}',
 '.atk-earned-words{display:flex;flex-direction:column;gap:3px;min-width:0}',
 '.atk-earned-words small{font:700 10px Arial,sans-serif;letter-spacing:.4px;color:#e0b77a}',
 '.atk-earned-words strong{font:700 15px Georgia,serif;color:#fff0d5}',
 '.atk-earned-words span{font:12px/1.3 Arial,sans-serif;color:#d9c2a9;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
 '.atk-earned-close{border:0;background:transparent;color:#ead1b7;font-size:22px;min-width:34px;min-height:35px;cursor:pointer}',
 '@keyframes atk-earned-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
 '@media(max-width:799px){.atk-earned-toast{right:14px;bottom:calc(77px + env(safe-area-inset-bottom))}}',
 '@media(prefers-reduced-motion:reduce){.atk-earned-toast{animation:none}}'
 ].join('');
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 setTimeout(sync,1000);setInterval(sync,MS);
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('focus',sync);
 if(typeof authClient!=='undefined'&&authClient?.auth)
  authClient.auth.onAuthStateChange(()=>setTimeout(sync,100));
})();
