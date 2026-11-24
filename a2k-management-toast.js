/* A2K Management Portal — founder toast watcher, piece 3 (management layer V1 toast).
   In-site notifications reusing the existing badge/achievement toast
   (.atk-earned-toast in member-session-notices.js): same look, same corner,
   same one-at-a-time queue behavior. Founder-only, online only — it polls
   the SAME read-only sources the Approvals queue reads, diffs them against
   a per-user seen-set in localStorage (same pattern as the badge watcher),
   and pops the same toast. Clicking a management toast opens the portal at
   that exact item via the piece-1 #manage/... deep links.
   Scope: while Steven is signed in as founder with the site open. NO PWA
   push, no service worker, no offline delivery (that is the later phase).

   Collision note: the badge watcher's queue is closure-private inside
   member-session-notices.js, so this layer cannot feed it directly. Instead
   this layer renders the identical .atk-earned-toast element and arbitrates
   at the DOM level: it never shows while any .atk-earned-toast is on screen,
   and if a badge toast appears while a management toast is showing, the
   management toast steps aside (re-queued at the front) until the badge
   toast is gone. At most one toast is ever visible. The shared hook
   window.atkToastNotify is exposed so future watchers can feed this queue
   directly instead of arbitrating.

   Fail-soft: every source is fetched independently; one failing source is
   skipped (warn only) and never blocks the others or produces a toast.
   Nothing is ever toasted for an item that is no longer pending — items
   that leave the pending sources are dropped from the queue unread. */
(function(){
 'use strict';
 if(window.__a2kMgmtToast)return;
 window.__a2kMgmtToast=true;

 var VERSION='1';
 var POLL_MS=30000, FIRST_CHECK_MS=1000, TOAST_MS=7000, RECENT_MS=120000;
 var SEEN_PREFIX='atk-seen-mgmt-items-v1:', SEEN_CAP=500;
 var DIALOG_ID='management-dialog';

 var checking=false, founder=null, activeUser='', queue=[], toast=null,
     toastTimer=null, arbTimer=null, observer=null;

 /* Kinds the Approvals queue reads, with the toast copy and the deep link
    each one opens. `filter` is the V1 Approvals filter chip; `withId` is
    true only for kinds whose queue cards V1 stamps with data-mgmt-id
    (venue/hosting/report/photo/suggestion cards + member links) — the
    other kinds' cards are built by closure-private factories V1 cannot
    stamp, so those toasts land on their filter instead of one card. */
 var KINDS={
  venue:{kicker:'NEW VENUE SUBMISSION',filter:'venues',withId:true},
  suggestion:{kicker:'NEW GUEST VENUE SUGGESTION',filter:'venues',withId:true},
  hosting:{kicker:'NEW KJ HOSTING REQUEST',filter:'hosting',withId:true},
  venue_report:{kicker:'NEW VENUE REPORT',filter:'reports',withId:true},
  member_report:{kicker:'NEW MEMBER REPORT',filter:'reports',withId:false},
  photo:{kicker:'NEW VENUE PHOTO',filter:'photos',withId:true},
  member:{kicker:'NEW MEMBER',filter:'members',withId:true},
  claim:{kicker:'NEW VENUE ACCESS CLAIM',filter:'claims',withId:false},
  event:{kicker:'NEW SPECIAL EVENT',filter:'events',withId:false},
  suspension:{kicker:'REVIEW SUSPENSION',filter:'suspensions',withId:false},
  message:{kicker:'SUSPENSION MESSAGE',filter:'messages',withId:false},
  review_report:{kicker:'REPORTED REVIEW',filter:'review_reports',withId:false}
 };
 var VENUE_REPORT_LABELS={
  incorrect_details:'Incorrect venue information',no_karaoke:'No karaoke here',
  closed:'Venue closed',duplicate:'Duplicate listing',
  inappropriate:'Inappropriate content',other:'Other issue'};
 var MEMBER_REPORT_LABELS={
  spam:'Spam / advertising',harassment:'Harassment',impersonation:'Impersonation',
  inappropriate_content:'Inappropriate content',other:'Something else'};

 function hasAuth(){
  return typeof authClient!=='undefined' && authClient &&
   typeof authUser!=='undefined' && authUser;
 }
 function isDesktop(){
  return window.matchMedia('(min-width:1024px)').matches &&
   document.documentElement.classList.contains('a2k-desktop-live');
 }
 function keyOf(item){return item.kind+':'+String(item.id);}
 function seenKey(){return SEEN_PREFIX+(activeUser||'');}

 function readSeen(){
  try{
   var saved=JSON.parse(localStorage.getItem(seenKey())||'null');
   if(Array.isArray(saved))return new Set(saved);
  }catch(e){}
  return null;
 }
 function writeSeen(seen){
  try{
   var arr=Array.from(seen);
   if(arr.length>SEEN_CAP)arr=arr.slice(arr.length-SEEN_CAP);
   localStorage.setItem(seenKey(),JSON.stringify(arr));
  }catch(e){}
 }

 /* ---------- toast CSS: reuse the badge toast's own rules ----------
    member-session-notices.js injects these same rules at runtime. This
    layer injects an identical copy only if no .atk-earned-toast rules are
    present yet, so the toast looks right even if that script loads later
    or is absent; when it is present, nothing is duplicated. The only
    additions are the gold ★ mark (management toasts have no badge image)
    and the .atk-mgmt-toast owner marker used by the arbiter. */
 var TOAST_CSS=[
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
  '@media(prefers-reduced-motion:reduce){.atk-earned-toast{animation:none}}',
  '.atk-earned-toast.atk-mgmt-toast .atk-earned-mark{flex:none;width:44px;height:50px;display:flex;align-items:center;justify-content:center;font:700 30px Georgia,serif;color:#e0b77a}'
 ].join('\n');
 function ensureToastCss(){
  try{
   var styles=document.querySelectorAll('style');
   for(var i=0;i<styles.length;i++){
    if(styles[i].textContent&&styles[i].textContent.indexOf('.atk-earned-toast')!==-1)return;
   }
  }catch(e){}
  var style=document.createElement('style');
  style.setAttribute('data-atk-toast-css','mgmt-v1');
  style.textContent=TOAST_CSS;
  document.head.appendChild(style);
 }

 /* ---------- single-toast arbitration ----------
    A toast is "foreign" when it is a .atk-earned-toast this layer did not
    render (i.e. a badge toast). This layer shows only when the screen is
    toast-free; if a foreign toast appears while ours is up, ours steps
    aside and re-queues at the front. A 300ms pump covers any gap the
    observer misses. */
 function foreignToastPresent(){
  var all=document.querySelectorAll('.atk-earned-toast');
  for(var i=0;i<all.length;i++){
   if(all[i]!==toast)return true;
  }
  return false;
 }
 function clearToast(requeue){
  if(toastTimer){clearTimeout(toastTimer);toastTimer=null;}
  var item=toast?toast.__mgmtItem:null;
  if(toast){toast.remove();toast=null;}
  if(requeue&&item)queue.unshift(item);
  pump();
 }
 function showNext(){
  if(toast||!queue.length)return;
  if(foreignToastPresent())return;
  var item=queue.shift();
  ensureToastCss();
  var el=document.createElement('div');
  el.className='atk-earned-toast atk-mgmt-toast';
  el.setAttribute('role','status');
  el.dataset.atkKind=item.kind;
  el.__mgmtItem=item;
  var button=document.createElement('button');
  button.type='button';button.className='atk-earned-open';
  var mark=document.createElement('span');
  mark.className='atk-earned-mark';mark.textContent='★';mark.setAttribute('aria-hidden','true');
  var words=document.createElement('span');words.className='atk-earned-words';
  var kicker=document.createElement('small');kicker.textContent=item.kicker;
  var title=document.createElement('strong');title.textContent=item.title;
  var sub=document.createElement('span');sub.textContent=item.sub;
  words.append(kicker,title,sub);
  button.append(mark,words);
  button.addEventListener('click',function(){onToastClick(item);});
  var close=document.createElement('button');
  close.type='button';close.className='atk-earned-close';close.textContent='×';
  close.setAttribute('aria-label','Dismiss notification');
  close.addEventListener('click',function(){clearToast(false);});
  el.append(button,close);
  document.body.appendChild(el);
  toast=el;
  toastTimer=setTimeout(function(){clearToast(false);},TOAST_MS);
 }
 function pump(){
  if(arbTimer)return;
  arbTimer=setInterval(function(){
   if(toast&&foreignToastPresent()){clearToast(true);return;}
   showNext();
  },300);
 }
 function installArbiter(){
  if(observer||!('MutationObserver' in window)||!document.body)return;
  observer=new MutationObserver(function(){
   if(toast&&foreignToastPresent())clearToast(true);
   else showNext();
  });
  observer.observe(document.body,{childList:true,subtree:false});
 }

 /* ---------- click: open the portal at the exact item ---------- */
 function deepLink(item){
  var kind=KINDS[item.kind]||{};
  var hash='#manage/approvals/'+(kind.filter||'all');
  if(kind.withId&&item.id)hash+='/'+encodeURIComponent(String(item.id));
  return hash;
 }
 function openItem(item){
  var hash=deepLink(item);
  /* Desktop: the piece-1 hash router opens the portal and lands on the
     item (or its filter). If the hash is already the target, no native
     hashchange fires, so dispatch one for the router. */
  if(isDesktop()&&window.__a2kMgmtV1){
   if(location.hash===hash){
    try{window.dispatchEvent(new HashChangeEvent('hashchange'));}catch(e){
     try{window.dispatchEvent(new Event('hashchange'));}catch(e2){}
    }
   }else{
    location.hash=hash;
   }
   return;
  }
  /* No V1 router (older page, or narrow screen where the portal is the
     phone dialog): open the portal and the Approvals queue directly. */
  try{
   if(typeof managementOpen==='function')managementOpen();
  }catch(e){}
  setTimeout(function(){
   try{
    if(typeof approvalCenterOpen==='function')approvalCenterOpen();
    var filter=(KINDS[item.kind]||{}).filter||'all';
    var select=document.getElementById('atk-approval-filter');
    if(select&&filter!=='events'){
     select.value=filter;
     if(typeof approvalCenterRender==='function')approvalCenterRender();
    }
   }catch(e){}
  },150);
 }
 function onToastClick(item){
  clearToast(false);
  openItem(item);
 }

 /* ---------- shared notify hook (Addendum 2) ----------
    window.atkToastNotify(item) enqueues a toast in the shared queue.
    Items: {kind, id, kicker, title, sub}. The watcher below feeds it;
    future watchers can feed it too instead of rendering their own. */
 function notify(item){
  if(!item||!item.kind||item.id===undefined||item.id===null)return false;
  if(!KINDS[item.kind])return false;
  var kicker=item.kicker||KINDS[item.kind].kicker;
  var title=String(item.title||'Update').slice(0,120);
  var sub=String(item.sub||'Waiting for your review.').slice(0,160);
  var entry={kind:item.kind,id:String(item.id),kicker:kicker,title:title,sub:sub};
  if(queue.some(function(q){return keyOf(q)===keyOf(entry);}))return false;
  queue.push(entry);
  pump();
  showNext();
  return true;
 }
 window.atkToastNotify=notify;

 /* ---------- data: the same read-only sources approvalCenterRefresh reads ----------
    Each fetcher returns [] on any failure (fail soft, warn only) so one
    dead source never blocks the rest. Personal-context filters mirror
    approval-center Build 124: members the founder already hid
    (admin_member_dismissals) never toast, and photos on claimed venues
    (verified_venue_claims) belong to the venue owner, not the founder. */
 function safe(promise){
  return Promise.resolve(promise).then(function(res){
   if(res&&res.error)throw res.error;
   return res&&res.data!==undefined?res.data:null;
  }).catch(function(err){
   console.warn('Management toast source unavailable',err);
   return null;
  });
 }
 /* attempt(fn): run a query-builder chain; a builder that throws
    synchronously (a missing method on a stub, a dead source) becomes a
    null result for that source only, never a failed whole check. */
 function attempt(fn){
  try{return safe(fn());}
  catch(err){console.warn('Management toast source unavailable',err);return Promise.resolve(null);}
 }
 function q(table,select){
  /* Minimal chainable stand-in: the real authClient query builder. */
  var query=authClient.from(table).select(select);
  return query;
 }
 function loc(list){
  return (list||[]).filter(Boolean).join(', ');
 }
 function itemTime(row){
  var t=row&&(row.created_at||row.submitted_at||row.start_at);
  var ms=t?Date.parse(t):NaN;
  return Number.isFinite(ms)?ms:null;
 }
 function isRecent(row){
  var ms=itemTime(row);
  return ms!==null&&(Date.now()-ms)>=0&&(Date.now()-ms)<RECENT_MS;
 }
 function baseItem(kind,row,title,sub){
  return {kind:kind,id:row.id,title:title,sub:sub,_at:itemTime(row)};
 }

 async function fetchAll(){
  var results=await Promise.all([
   attempt(function(){return authClient.rpc('founder_approval_center');}),
   attempt(function(){return q('venue_reports','id,venue_id,reporter_id,reason,note,status,created_at,venues(name,city,state)').eq('status','pending').order('created_at',{ascending:true}).limit(150);}),
   attempt(function(){return q('venue_photos','id,venue_id,storage_path,caption,created_at,uploader_user_id,venues(name,city,state)').eq('moderation_status','pending').eq('published',false).order('created_at',{ascending:true}).limit(150);}),
   attempt(function(){return q('venue_suggestions','id,name,city,state,address_line1,postal_code,karaoke_details,status,submitted_at').eq('status','submitted').order('submitted_at',{ascending:true}).limit(100);}),
   attempt(function(){return q('member_reports','id,member_id,reporter_id,reason,note,status,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(150);}),
   attempt(function(){return q('venue_claim_requests','id,venue_id,claimant_user_id,contact_name,contact_email,contact_phone,relationship,verification_details,created_at,status,venues(name,city,state)').eq('status','pending').order('created_at',{ascending:true}).limit(150);}),
   attempt(function(){return q('karaoke_event_suggestions','id,venue_name,city,state,address,title,start_at,end_at,host_name,notes,source_url,created_at').in('status',['submitted','under_review']).order('created_at',{ascending:false}).limit(100);}),
   attempt(function(){return authClient.rpc('management_review_notification_feed');}),
   attempt(function(){return authClient.rpc('management_pending_review_reports');}),
   attempt(function(){return q('admin_member_dismissals','member_user_id').eq('admin_user_id',authUser.id);}),
   attempt(function(){return q('verified_venue_claims','venue_id').is('revoked_at',null);})
  ]);
  var base=results[0]||{};
  var reports=results[1]||[], photos=results[2]||[], suggestions=results[3]||[],
      memberReports=results[4]||[], claims=results[5]||[], events=results[6]||[],
      feed=results[7]||{}, reviewReports=(results[8]&&results[8].reports)||[],
      dismissals=results[9]||[], claimed=results[10]||[];
  var dismissed=new Set(dismissals.map(function(r){return String(r.member_user_id);}));
  var claimedVenues=new Set(claimed.map(function(r){return String(r.venue_id);}));

  /* Member-report display names, same lookup V85's fetchMemberReports does. */
  var names={};
  var memberIds=memberReports.map(function(r){return r.member_id;}).filter(Boolean);
  if(memberIds.length){
   var profs=await attempt(function(){return q('member_profiles','user_id,stage_name').in('user_id',memberIds);});
   (profs||[]).forEach(function(m){names[String(m.user_id)]=m.stage_name;});
  }

  var items=[];
  (base.venues||[]).forEach(function(v){
   items.push(baseItem('venue',v,v.name||'Venue submission',
    loc([v.city,v.state])+' · waiting for your review.'));
  });
  suggestions.forEach(function(s){
   items.push(baseItem('suggestion',s,s.name||'Guest venue suggestion',
    loc([s.city,s.state])+' · guest suggestion · waiting for your review.'));
  });
  (base.hosting||[]).forEach(function(r){
   items.push(baseItem('hosting',r,r.venue_display_name||r.venue_name||'KJ hosting request',
    (r.host_name||'KJ member')+' · '+((r.sessions||[]).length)+' proposed night'+((r.sessions||[]).length===1?'':'s')+' · waiting for your review.'));
  });
  reports.forEach(function(r){
   var v=r.venues||{};
   items.push(baseItem('venue_report',r,v.name||'Reported venue',
    (VENUE_REPORT_LABELS[r.reason]||'Reported venue')+' · waiting for your review.'));
  });
  memberReports.forEach(function(r){
   items.push(baseItem('member_report',r,names[String(r.member_id)]||'Reported member',
    (MEMBER_REPORT_LABELS[r.reason]||'Reported member')+' · waiting for your review.'));
  });
  photos.forEach(function(p){
   if(claimedVenues.has(String(p.venue_id)))return;
   var v=p.venues||{};
   items.push(baseItem('photo',p,v.name||'Venue photo',
    'Photo submitted'+(p.caption?' · “'+String(p.caption).slice(0,60)+'”':'')+' · waiting for your review.'));
  });
  (base.recent_members||[]).forEach(function(m){
   if(dismissed.has(String(m.id)))return;
   items.push(baseItem('member',m,m.stage_name||'New member',
    'Joined '+(m.created_at?new Date(m.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'recently')+' · tap to view their profile.'));
  });
  claims.forEach(function(c){
   var v=c.venues||{};
   items.push(baseItem('claim',c,v.name||'Venue access claim',
    (c.contact_name||'A member')+' is claiming this venue · waiting for your review.'));
  });
  events.forEach(function(e){
   items.push(baseItem('event',e,e.title||e.venue_name||'Special event',
    loc([e.venue_name,e.city,e.state])+' · waiting for your review.'));
  });
  (feed.suspensions||[]).forEach(function(s){
   items.push(baseItem('suspension',s,s.stage_name||'Member',
    'Review privileges suspended · waiting for your review.'));
  });
  (feed.messages||[]).forEach(function(m){
   items.push(baseItem('message',m,m.stage_name||'Member',
    'Message about a review suspension · waiting for your review.'));
  });
  reviewReports.forEach(function(r){
   items.push(baseItem('review_report',r,r.venue_name||'Reported review',
    (r.author_name?'Review by '+r.author_name+' · ':'')+'waiting for your review.'));
  });
  return items;
 }

 /* ---------- watch loop ---------- */
 async function check(){
  if(checking||!hasAuth())return;
  if(founder!==true)return;
  var id=authUser.id;
  if(id!==activeUser){
   activeUser=id;queue=[];
   if(toast){toast.remove();toast=null;}
   if(toastTimer){clearTimeout(toastTimer);toastTimer=null;}
  }
  checking=true;
  try{
   var items=await fetchAll();
   if(!hasAuth()||authUser.id!==id)return;
   var seen=readSeen();
   var firstRun=seen===null;
   if(firstRun)seen=new Set();
   var current=new Set(items.map(keyOf));
   /* Drop queued toasts for items that are no longer pending — the
      founder (or another tab) already actioned them. */
   queue=queue.filter(function(it){return current.has(keyOf(it));});
   var fresh=[];
   items.forEach(function(it){
    if(seen.has(keyOf(it)))return;
    seen.add(keyOf(it));
    /* First run after install: seed everything silently except items
       created in the last two minutes (the badge watcher's window), so
       installing the layer never floods the founder with old backlog. */
    if(firstRun&&!isRecent(it))return;
    fresh.push(it);
   });
   writeSeen(seen);
   fresh.forEach(function(it){notify(it);});
  }catch(err){
   console.warn('Management toast check unavailable',err);
  }finally{
   checking=false;
  }
 }

 async function checkFounder(){
  if(!hasAuth()){founder=null;return false;}
  try{
   var res=await authClient.rpc('is_platform_founder');
   if(res&&res.error)throw res.error;
   founder=res&&res.data===true;
  }catch(err){
   console.warn('Management toast founder check unavailable',err);
   founder=false;
  }
  return founder===true;
 }

 function sync(){
  var id=hasAuth()?authUser.id||'':'';
  if(id!==activeUser){
   activeUser=id;founder=null;queue=[];
   if(toast){toast.remove();toast=null;}
   if(toastTimer){clearTimeout(toastTimer);toastTimer=null;}
  }
  if(id&&document.visibilityState==='visible'){
   checkFounder().then(function(ok){if(ok)void check();});
  }
 }

 function init(){
  installArbiter();
  if(!document.body)document.addEventListener('DOMContentLoaded',installArbiter,{once:true});
  pump();
  ensureToastCss();
  setTimeout(sync,FIRST_CHECK_MS);
  setInterval(sync,POLL_MS);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('focus',sync);
  if(typeof authClient!=='undefined'&&authClient&&authClient.auth&&
     typeof authClient.auth.onAuthStateChange==='function'){
   try{authClient.auth.onAuthStateChange(function(){setTimeout(sync,100);});}catch(e){}
  }
 }

 /* Test/debug hooks (read-only state plus a manual check; no live data). */
 window.__a2kMgmtToast={
  version:VERSION,
  kinds:Object.keys(KINDS),
  checkNow:function(){return checkFounder().then(function(ok){if(ok)return check();return false;});},
  queueLength:function(){return queue.length;},
  seenCount:function(){var s=readSeen();return s?s.size:0;},
  isFounder:function(){return founder===true;},
  toastVisible:function(){return !!toast;},
  deepLinkFor:function(kind,id){return deepLink({kind:kind,id:id});}
 };

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
