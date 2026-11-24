/* A2K Management Portal — desktop Venues/Members/System rebuild, piece 2 (management layer V2).
   Presentation layer only, following the V1 layer pattern: it rearranges and
   restyles the existing portal panels and modules, and never changes how any
   action saves data. Desktop only (>=1024px, the same line
   desktop-management.js uses); the mobile dialog is untouched.
   Scope: Venues + Members side-by-side (list left, details right), the
   member file's injected panels gathered into labeled sections in one
   scroll, and the System tab with a merged Backups area + Prepare to Go
   Live row + Activity Log as its single home. System Wipe is not touched.
   Requires the V1 layer (tab shell, Overview, Approvals, deep links); V2
   extends its routing with #manage/venues/<id> and #manage/members/<id>
   hash updates when a venue/member is opened from the list. */
(function(){
 'use strict';
 if(window.__a2kMgmtV2)return;
 window.__a2kMgmtV2=true;

 var DIALOG_ID='management-dialog';
 var VENUES='management-venues', VENUE_DETAILS='management-venue-details';
 var USERS='management-users', MEMBER_DETAILS='management-member-details';
 var BACKUPS='management-backups', HISTORY='management-history';
 var PANEL_IDS=[VENUES,VENUE_DETAILS,USERS,MEMBER_DETAILS,BACKUPS,HISTORY,
  'management-approvals','management-reviews'];

 var built=false, historyLoaded=false, historyLoading=false;
 var lastVenueRow=null, lastMemberRow=null;

 function $(id){return document.getElementById(id);}
 function isDesktop(){
  return window.matchMedia('(min-width:1024px)').matches &&
   document.documentElement.classList.contains('a2k-desktop-live');
 }
 function dialog(){return $(DIALOG_ID);}
 function isActive(){
  var d=dialog();
  return isDesktop() && !!d && !!d.open &&
   document.body.classList.contains('a2k-desktop-management-active');
 }
 function currentTab(){
  var d=dialog();
  return (d&&d.dataset&&d.dataset.mgmtTab)||'';
 }
 function el(tag,cls,text){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
 }
 function setHash(hash){
  try{history.replaceState(null,'',hash);}catch(e){}
 }

 /* ---------- build: one-time restructure ---------- */

 function build(){
  if(built)return;
  var d=dialog();
  if(!d)return;
  built=true;

  /* The split views are float + margin, and a float cannot sit above the
     block that precedes it in the document — but in the dialog markup the
     details panels come BEFORE their lists (venue-details before venues,
     member-details before users), which dropped the floated list below
     the details. Reorder each pair so the list precedes its details.
     Both stay direct children of the dialog, so the :has rules that size
     it keep matching; nothing reads the sections in document order
     (V1 iterates its own panel list; the modules use getElementById). */
  var venues=$(VENUES), venueDetails=$(VENUE_DETAILS);
  if(venues&&venueDetails)venues.parentNode.insertBefore(venues,venueDetails);
  var users=$(USERS), memberDetails=$(MEMBER_DETAILS);
  if(users&&memberDetails)users.parentNode.insertBefore(users,memberDetails);

  buildSystem(d);
  buildCloseButtons();

  /* Keep the layer in sync with the portal's own navigation: every panel
     show/hide. The observer only ever un-hides a panel the portal itself
     just showed beside its partner — it never opens a panel on its own
     except for the System tab's co-visible Activity Log (see sync). */
  var obs=new MutationObserver(function(){sync();});
  PANEL_IDS.forEach(function(id){
   var s=$(id);
   if(s)obs.observe(s,{attributes:true,attributeFilter:['hidden']});
  });
  d.addEventListener('close',function(){
   historyLoaded=false;historyLoading=false;
   clearSelected();
   d.classList.remove('mgmt-v2-split-venues','mgmt-v2-split-members');
  });

  /* Clicks on list rows remember the row, so the split view can highlight
     the venue/member whose details are showing. */
  var venues=$(VENUES);
  if(venues)venues.addEventListener('click',function(ev){
   var row=ev.target&&ev.target.closest
    ?ev.target.closest('.mv-list-venue-button, .mv2-recent-row'):null;
   if(row)lastVenueRow=row;
  });
  var users=$(USERS);
  if(users)users.addEventListener('click',function(ev){
   var row=ev.target&&ev.target.closest
    ?ev.target.closest('.mg2-member-card'):null;
   if(row)lastMemberRow=row;
  });

  /* The list rows can arrive AFTER the details open (deep link: the
     dashboard/recent list renders from its own RPC), so re-mark the
     selected row whenever a list's children change while its split is up. */
  [['mv2-recent-list','venue'],['mv-results','venue'],
   ['mg2-recent-list','member'],['mg-results','member']].forEach(function(pair){
   var node=$(pair[0]);
   if(!node)return;
   new MutationObserver(function(){
    var d=dialog();
    if(!d)return;
    if(pair[1]==='venue'&&d.classList.contains('mgmt-v2-split-venues'))markSelected('venue');
    if(pair[1]==='member'&&d.classList.contains('mgmt-v2-split-members'))markSelected('member');
   }).observe(node,{childList:true});
  });

  /* The hero name can also arrive after the rows (deep link: the venue
     fetch resolves after the dashboard list renders), so re-mark when
     the hero text itself changes while its split is up. */
  var vHero=$('mv2-hero-name');
  if(vHero)new MutationObserver(function(){
   var d=dialog();
   if(d&&d.classList.contains('mgmt-v2-split-venues'))markSelected('venue');
  }).observe(vHero,{childList:true,characterData:true,subtree:true});
  var mHero=$('mg2-member-hero');
  if(mHero)new MutationObserver(function(){
   var d=dialog();
   if(d&&d.classList.contains('mgmt-v2-split-members'))markSelected('member');
  }).observe(mHero,{childList:true,characterData:true,subtree:true});

  wrapOpenFunctions();
 }

 /* ---------- System tab restructure ---------- */

 function buildSystem(d){
  var backups=$(BACKUPS);
  var history=$(HISTORY);
  var footer=d.querySelector(':scope > .atk-history-footer');
  if(!backups||!history)return;

  /* Activity Log sits after Backups in the System tab (it is a direct
     child of the dialog either way, so the :has rules that size the
     dialog keep matching; on mobile the panels still show one at a
     time, so the move changes nothing there). */
  if(footer)history.parentNode.insertBefore(history,footer);
  else backups.parentNode.insertBefore(history,backups.nextSibling);

  var home=$('atk-backup-home');
  if(!home)return;

  /* "Backups" heading over the merged area. */
  if(!$('mgmt-v2-backups-title')){
   var title=el('h3','mgmt-v2-area-title','Backups');
   title.id='mgmt-v2-backups-title';
   home.parentNode.insertBefore(title,home);
  }

  /* Wrap each backup row's label + description in one copy span so the
     row can lay out as copy + chevron. The buttons keep their inline
     onclick handlers (atkWizardStart / atkInspectorStart) untouched. */
  var chev;
  Array.prototype.forEach.call(home.querySelectorAll('.management-entry'),function(btn){
   var onclick=btn.getAttribute('onclick')||'';
   if(onclick.indexOf('managementHistoryOpen')!==-1){
    /* The duplicate Activity Log door: the log lives in its own section
       on this tab now. Kept in the DOM for mobile, hidden on desktop. */
    btn.classList.add('mgmt-v2-activity-door');
    return;
   }
   if(onclick.indexOf("atkWizardStart('live')")!==-1)return; /* moved below */
   if(!btn.querySelector('.mgmt-v2-row-copy')){
    var copy=el('span','mgmt-v2-row-copy');
    while(btn.firstChild)copy.appendChild(btn.firstChild);
    btn.appendChild(copy);
    chev=el('span','mgmt-v2-row-chev','›');
    btn.appendChild(chev);
   }
  });

  /* Prepare to Go Live becomes its own row after the Backups area, with
     the current phase and lock status shown on the row itself (read from
     the lifecycle panel's own text — never hardcoded). */
  if(!$('mgmt-v2-golive')){
   var liveBtn=null;
   Array.prototype.forEach.call(home.querySelectorAll('.management-entry'),function(btn){
    var onclick=btn.getAttribute('onclick')||'';
    if(onclick.indexOf("atkWizardStart('live')")!==-1)liveBtn=btn;
   });
   if(liveBtn){
    if(!liveBtn.querySelector('.mgmt-v2-row-copy')){
     var copy2=el('span','mgmt-v2-row-copy');
     while(liveBtn.firstChild)copy2.appendChild(liveBtn.firstChild);
     liveBtn.appendChild(copy2);
     liveBtn.appendChild(el('span','mgmt-v2-row-chev','›'));
    }
    var row=el('div','mgmt-v2-golive');
    row.id='mgmt-v2-golive';
    var status=el('span','mgmt-v2-golive-status','');
    status.id='mgmt-v2-golive-status';
    status.textContent=goliveStatusText();
    row.appendChild(liveBtn);
    row.appendChild(status);
    home.parentNode.insertBefore(row,home.nextSibling);
   }
  }
 }

 function goliveStatusText(){
  var panel=$('atk-lifecycle-panel');
  if(!panel)return '';
  var text=panel.textContent||'';
  /* Read the phase from the <strong> itself: the panel's flat textContent
     runs 'Development' straight into the next paragraph ('Before…'). */
  var phase=null;
  var strong=panel.querySelector('strong');
  if(strong){
   var m=/Current phase:\s*(.+)/.exec(strong.textContent||'');
   if(m)phase=m[1].trim();
  }
  if(!phase){
   var m2=/Current phase:\s*([A-Za-z]+)/.exec(text);
   if(m2)phase=m2[1];
  }
  var locked=/Launch is locked/.test(text);
  var parts=[];
  if(phase)parts.push('Phase: '+phase);
  parts.push(locked?'Launch locked':'Launch unlocked');
  return parts.join(' · ');
 }

 /* ---------- close-details buttons (desktop split only) ---------- */

 function buildCloseButtons(){
  var vHead=$(VENUE_DETAILS)&&$(VENUE_DETAILS).querySelector('.management-user-head');
  if(vHead&&!$('mgmt-v2-close-venue')){
   var vb=el('button','mgmt-v2-close-pane','✕ Close details');
   vb.type='button';vb.id='mgmt-v2-close-venue';
   vb.addEventListener('click',function(){
    if(typeof managementVenueDetailBack==='function')managementVenueDetailBack();
   });
   vHead.after(vb);
  }
  var mHead=$(MEMBER_DETAILS)&&$(MEMBER_DETAILS).querySelector('.mg2-details-header');
  if(mHead&&!$('mgmt-v2-close-member')){
   var mb=el('button','mgmt-v2-close-pane','✕ Close member file');
   mb.type='button';mb.id='mgmt-v2-close-member';
   mb.addEventListener('click',function(){
    if(typeof managementMemberBack==='function')managementMemberBack();
   });
   mHead.after(mb);
  }
 }

 /* ---------- member file: gather the junk drawer into labeled sections ---------- */

 function tidyMemberFile(){
  var details=$(MEMBER_DETAILS);
  if(!details||details.hidden)return;
  var hero=$('mg2-member-hero');
  var perms=$('mg2-permissions');
  var kj=$('mg2-kj-verification');
  var review=$('mg2-review-privileges');
  var community=$('abm-community-panel');
  var karaoke=details.querySelector('.mg2-disclosure');
  var historyDisc=null;
  var discs=details.querySelectorAll('.mg2-disclosure');
  if(discs.length>1)historyDisc=discs[1];

  /* Canonical section order: hero, Role & Verification, KJ, Review
     Privileges, Recognition, Karaoke Profile, Account History. The
     injected panels mount wherever their module puts them (Community
     Supporter lands right after the hero; Review Privileges lands
     before KJ); moving a node by id is presentation only — every module
     keeps referencing its panel by id. */
  if(perms&&kj)perms.after(kj);
  if(kj&&review)kj.after(review);
  if(review&&community)review.after(community);
  else if(kj&&community&&!review)kj.after(community);
  else if(perms&&community&&!kj&&!review)perms.after(community);
  if(community&&karaoke)community.after(karaoke);
  if(karaoke&&historyDisc)karaoke.after(historyDisc);

  /* Labels: the permissions section is "Role & Verification"; the
     Community Supporter panel is the "Recognition" section. */
  if(perms){
   var h=perms.querySelector('.mg2-section-title h3');
   if(h&&h.textContent.trim()==='Roles & Permissions')h.textContent='Role & Verification';
  }
  if(community&&!community.querySelector('.mgmt-v2-eyebrow')){
   var brow=el('p','mgmt-v2-eyebrow','Recognition');
   community.insertBefore(brow,community.firstChild);
  }
  /* The Founding Tester panel (when present) is a recognition panel too,
     but it is out of this piece's scope; leave it where its module put it. */
  void hero;
 }

 /* ---------- selected-row highlight ---------- */

 function clearSelected(){
  lastVenueRow=null;lastMemberRow=null;
  Array.prototype.forEach.call(document.querySelectorAll('.mgmt-v2-selected'),function(n){
   n.classList.remove('mgmt-v2-selected');
  });
 }

 function markSelected(kind){
  var row=null;
  if(kind==='venue'){
   row=(lastVenueRow&&document.contains(lastVenueRow))?lastVenueRow:null;
   if(!row){
    var name=$('mv2-hero-name');
    var want=name?name.textContent.trim():'';
    if(want){
     var cands=document.querySelectorAll(
      '#mv-results .mv-list-venue-button, #mv2-recent-list .mv2-recent-row');
     Array.prototype.forEach.call(cands,function(c){
      if(!row&&(c.textContent||'').indexOf(want)!==-1)row=c;
     });
    }
   }
   Array.prototype.forEach.call(document.querySelectorAll(
    '#mv-results .mgmt-v2-selected, #mv2-recent-list .mgmt-v2-selected'),function(n){
    n.classList.remove('mgmt-v2-selected');
   });
  }else{
   row=(lastMemberRow&&document.contains(lastMemberRow))?lastMemberRow:null;
   if(!row){
    var hero=$('mg2-member-hero');
    var h3=hero?hero.querySelector('h3'):null;
    var want2=h3?h3.textContent.trim():'';
    if(want2){
     var cands2=document.querySelectorAll(
      '#mg-results .mg2-member-card, #mg2-recent-list .mg2-member-card');
     Array.prototype.forEach.call(cands2,function(c){
      if(!row&&(c.textContent||'').indexOf(want2)!==-1)row=c;
     });
    }
   }
   Array.prototype.forEach.call(document.querySelectorAll(
    '#mg-results .mgmt-v2-selected, #mg2-recent-list .mgmt-v2-selected'),function(n){
    n.classList.remove('mgmt-v2-selected');
   });
  }
  if(row)row.classList.add('mgmt-v2-selected');
 }

 /* ---------- sync: split views + System co-visibility ---------- */

 function sync(){
  if(!built)return;
  var d=dialog();
  if(!d)return;
  if(!isActive()){
   d.classList.remove('mgmt-v2-split-venues','mgmt-v2-split-members');
   return;
  }
  var venueDetails=$(VENUE_DETAILS), venues=$(VENUES);
  var memberDetails=$(MEMBER_DETAILS), users=$(USERS);
  var backups=$(BACKUPS), history=$(HISTORY);

  /* Venues: when a venue's details are showing, the list stays visible
     beside them instead of being hidden (the old pop-over stack). */
  if(venueDetails&&!venueDetails.hidden){
   if(venues&&venues.hidden)venues.hidden=false;
   d.classList.add('mgmt-v2-split-venues');
   markSelected('venue');
  }else{
   d.classList.remove('mgmt-v2-split-venues');
   if(venues){
    Array.prototype.forEach.call(venues.querySelectorAll('.mgmt-v2-selected'),function(n){
     n.classList.remove('mgmt-v2-selected');
    });
    lastVenueRow=null;
   }
  }

  /* Members: same split — directory left, member file right. */
  if(memberDetails&&!memberDetails.hidden){
   if(users&&users.hidden)users.hidden=false;
   d.classList.add('mgmt-v2-split-members');
   tidyMemberFile();
   markSelected('member');
  }else{
   d.classList.remove('mgmt-v2-split-members');
   if(users){
    Array.prototype.forEach.call(users.querySelectorAll('.mgmt-v2-selected'),function(n){
     n.classList.remove('mgmt-v2-selected');
    });
    lastMemberRow=null;
   }
  }

  /* System: Backups and Activity Log share the tab. Whichever one the
     portal shows, the other shows beside it — the log's duplicate home
     door is gone (V1 Overview replaced the home list on desktop; V2
     hides the System Maintenance card's Activity History button). */
  var otherVisible=false;
  ['management-approvals','management-reviews',VENUES,VENUE_DETAILS,USERS,MEMBER_DETAILS]
   .forEach(function(id){
    var s=$(id);
    if(s&&!s.hidden)otherVisible=true;
   });
  if(!otherVisible&&(backups||history)&&
     ((backups&&!backups.hidden)||(history&&!history.hidden))){
   if(backups&&backups.hidden)backups.hidden=false;
   if(history&&history.hidden)history.hidden=false;
   /* First time the System tab is shown on desktop, load the log through
      its existing entry point (it does the founder check, the RPC and
      the render). Guarded so it runs once per portal session. */
   if(!historyLoaded&&!historyLoading&&
      (currentTab()==='system'||typeof window.__a2kMgmtV1==='undefined')){
    historyLoading=true;
    try{
     var p=null;
     if(typeof managementHistoryOpen==='function')p=managementHistoryOpen();
     Promise.resolve(p).then(function(){historyLoaded=true;historyLoading=false;})
      .catch(function(){historyLoading=false;});
    }catch(e){historyLoading=false;}
   }
  }
 }

 /* ---------- hash updates for list selections ---------- */

 function wrapOpenFunctions(){
  var origVenueDetail=null, origVenueBack=null, origMemberOpen=null, origMemberBack=null;
  try{origVenueDetail=window.managementVenueDetailOpen;}catch(e){}
  try{origVenueBack=window.managementVenueDetailBack;}catch(e){}
  try{origMemberOpen=window.managementMemberOpen;}catch(e){}
  try{origMemberBack=window.managementMemberBack;}catch(e){}

  if(typeof origVenueDetail==='function'&&!origVenueDetail.__mgmtV2Wrapped){
   var wrappedVenueDetail=function(id){
    var out=origVenueDetail.apply(this,arguments);
    return Promise.resolve(out).then(function(r){
     if(isActive())setHash('#manage/venues/'+id);
     return r;
    });
   };
   wrappedVenueDetail.__mgmtV2Wrapped=true;
   try{window.managementVenueDetailOpen=wrappedVenueDetail;}catch(e){}
  }
  if(typeof origVenueBack==='function'&&!origVenueBack.__mgmtV2Wrapped){
   var wrappedVenueBack=function(){
    var out=origVenueBack.apply(this,arguments);
    if(isActive())setHash('#manage/venues');
    return out;
   };
   wrappedVenueBack.__mgmtV2Wrapped=true;
   try{window.managementVenueDetailBack=wrappedVenueBack;}catch(e){}
  }
  if(typeof origMemberOpen==='function'&&!origMemberOpen.__mgmtV2Wrapped){
   var wrappedMemberOpen=function(member){
    var out=origMemberOpen.apply(this,arguments);
    if(isActive()&&member&&member.id)setHash('#manage/members/'+member.id);
    return out;
   };
   wrappedMemberOpen.__mgmtV2Wrapped=true;
   try{window.managementMemberOpen=wrappedMemberOpen;}catch(e){}
  }
  if(typeof origMemberBack==='function'&&!origMemberBack.__mgmtV2Wrapped){
   var wrappedMemberBack=function(){
    var ret='users';
    try{ret=typeof managementMemberReturnView!=='undefined'
     ?managementMemberReturnView:'users';}catch(e){ret='users';}
    var out=origMemberBack.apply(this,arguments);
    if(isActive())setHash(ret==='approvals'?'#manage/approvals':'#manage/members');
    return out;
   };
   wrappedMemberBack.__mgmtV2Wrapped=true;
   try{window.managementMemberBack=wrappedMemberBack;}catch(e){}
  }
 }

 /* ---------- init ---------- */

 function init(){
  build();
  sync();
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
