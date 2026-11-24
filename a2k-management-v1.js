/* A2K Management Portal — desktop tabbed shell, piece 1 (management layer V1).
   Presentation layer only, following the V74/V75 profile-layer pattern:
   it rearranges and restyles the existing portal panels and modules, and
   never changes how any action saves data. Desktop only (>=1024px, the
   same line desktop-management.js uses); the mobile dialog is untouched.
   Scope: six-tab shell + Overview mission control + Approvals with visible
   filter chips + #manage/... deep links. Venues/Members/Reviews/System tabs
   frame their existing panels unchanged in this piece. */
(function(){
 'use strict';
 if(window.__a2kMgmtV1)return;
 window.__a2kMgmtV1=true;

 var DIALOG_ID='management-dialog';
 var TABS=[
  {id:'overview',label:'Overview'},
  {id:'approvals',label:'Approvals'},
  {id:'venues',label:'Venues'},
  {id:'members',label:'Members'},
  {id:'reviews',label:'Reviews'},
  {id:'system',label:'System'}
 ];
 /* Filter-chip label overrides. Chips are otherwise built from the live
    <select> options, so any module-injected option becomes a chip. The
    'reports' filter covers venue reports AND member reports (V85 groups
    member reports under the same filter). 'events' is a pseudo-filter:
    special events have no select value of their own. */
 var FILTER_LABELS={all:'All Items',venues:'Venue Submissions',hosting:'KJ Hosting',
  reports:'Reports',photos:'Venue Photos',members:'New Members',claims:'Venue Access',
  events:'Special Events',suspensions:'Suspensions',messages:'Messages',
  review_reports:'Reported Reviews'};
 var PANEL_TABS={
  'management-approvals':'approvals',
  'management-venues':'venues','management-venue-details':'venues',
  'management-users':'members','management-member-details':'members',
  'management-reviews':'reviews',
  'management-backups':'system','management-history':'system'
 };
 var PANEL_IDS=Object.keys(PANEL_TABS);
 /* Panels belonging to each tab. The V2 split views keep a tab's detail
    panel beside its list, so switching tabs hides every panel except the
    target tab's own panels. */
 var TAB_PANELS={
  approvals:['management-approvals'],
  venues:['management-venues','management-venue-details'],
  members:['management-users','management-member-details'],
  reviews:['management-reviews'],
  system:['management-backups','management-history']
 };
 function hideOtherPanels(tab){
  var keep=TAB_PANELS[tab]||[];
  PANEL_IDS.forEach(function(id){
   if(keep.indexOf(id)===-1){var s=$(id);if(s&&!s.hidden)s.hidden=true;}
  });
 }

 var built=false, overviewSerial=0, itemTimer=null, routing=false;
 var currentFilter='all';
 /* The page's own router rewrites an unrecognised hash to #home on
    DOMContentLoaded, before this layer's init runs — so a #manage/...
    deep link would be lost on a fresh load. Capture the load-time hash
    here, while this script tag executes during parsing and the hash is
    still the one the visitor opened. */
 var loadHash=(typeof location!=='undefined'?location.hash||'':'');

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
 function hasAuth(){return typeof authClient!=='undefined' && authClient &&
  typeof authUser!=='undefined' && authUser;}

 /* ---------- build: tab bar, founder pill, overview, filter chips ---------- */

 function el(tag,cls,text){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
 }

 function build(){
  if(built)return;
  var d=dialog();
  if(!d)return;
  built=true;

  /* Founder pill removed Nov 24, 2026 — the pill render that used to sit
     here is gone. `title` is still declared: the observer setup below
     watches it. */
  var title=$('management-title');

  /* Tab bar, in the profile's tab language (v71: dark gradient tabs,
     cream active tab). Inserted after the intro paragraph. */
  var bar=el('nav','mgmt-tabs');
  bar.id='mgmt-tabs';
  bar.setAttribute('role','tablist');
  bar.setAttribute('aria-label','Management sections');
  TABS.forEach(function(t){
   var b=el('button','mgmt-tab',t.label);
   b.type='button';b.dataset.tab=t.id;b.setAttribute('role','tab');
   b.setAttribute('aria-selected','false');
   b.addEventListener('click',function(){openTab(t.id);});
   bar.append(b);
  });
  var intro=d.querySelector(':scope > p');
  var tools=d.querySelector(':scope > .management-tools');
  if(intro&&intro.parentNode)intro.parentNode.insertBefore(bar,intro.nextSibling);
  else if(tools)d.insertBefore(bar,tools);
  else d.prepend(bar);

  buildOverview(d,tools);
  buildChips();

  /* Keep the layer in sync with the portal's own navigation: every panel
     show/hide, every queue render, and the approval-count badge text. */
  var obs=new MutationObserver(function(){sync();});
  PANEL_IDS.forEach(function(id){
   var s=$(id);
   if(s)obs.observe(s,{attributes:true,attributeFilter:['hidden']});
  });
  if(tools)obs.observe(tools,{attributes:true,attributeFilter:['hidden']});
  if(title)obs.observe(title,{attributes:true,attributeFilter:['hidden']});
  var results=$('atk-approval-results');
  if(results)new MutationObserver(function(){updateChipCounts();}).observe(results,
   {childList:true,subtree:true});
  var events=$('a2k-special-event-approvals');
  if(events)new MutationObserver(function(){updateChipCounts();}).observe(events,
   {childList:true,subtree:true});
  var badge=$('management-approval-count');
  if(badge)new MutationObserver(function(){updateTabBadges();}).observe(badge,
   {childList:true,characterData:true,subtree:true});
  var filter=$('atk-approval-filter');
  if(filter)new MutationObserver(function(){rebuildChips();syncChipActive();}).observe(filter,
   {childList:true});

  d.addEventListener('close',onDialogClosed);
  window.addEventListener('hashchange',onHashChange);
  var media=window.matchMedia('(min-width:1024px)');
  var onMedia=function(){if(!isDesktop())teardownTexts();};
  if(media.addEventListener)media.addEventListener('change',onMedia);
  else if(media.addListener)media.addListener(onMedia);

  stampCardFactories();
  wrapRender();
 }

 function buildOverview(d,tools){
  var ov=el('section','mgmt-overview');
  ov.id='mgmt-overview';
  ov.setAttribute('aria-label','Management overview');
  ov.hidden=true;

  var cards=el('div','mgmt-count-cards');
  var cardDefs=[
   {key:'approvals',label:'Approvals Waiting',go:function(){openTab('approvals');}},
   {key:'venues',label:'Venue Submissions',go:function(){openApprovalsFilter('venues');}},
   {key:'attention',label:'Venues Needing Attention',go:function(){openTab('venues');}},
   {key:'reviews',label:'Reviews Pending',go:function(){openTab('reviews');}}
  ];
  cardDefs.forEach(function(def){
   var c=el('button','mgmt-count-card');
   c.type='button';c.dataset.card=def.key;
   c.append(el('strong','mgmt-count-num','—'),el('span','mgmt-count-label',def.label),
    el('span','mgmt-count-link','Review ›'));
   c.addEventListener('click',def.go);
   cards.append(c);
  });
  ov.append(cards);

  var shortcuts=el('div','mgmt-shortcuts');
  shortcuts.append(el('span','mgmt-shortcuts-label','Go to:'));
  TABS.forEach(function(t){
   if(t.id==='overview')return;
   var b=el('button','mgmt-shortcut',t.label);
   b.type='button';
   b.addEventListener('click',function(){openTab(t.id);});
   shortcuts.append(b);
  });
  ov.append(shortcuts);

  var cols=el('div','mgmt-overview-cols');
  var needs=el('div','mgmt-needs');
  needs.append(el('h3','mgmt-section-title','Needs Attention'));
  var list=el('div','mgmt-needs-list');
  list.id='mgmt-needs-list';
  needs.append(list);
  cols.append(needs);

  var toolsCol=el('div','mgmt-quick-tools');
  toolsCol.append(el('h3','mgmt-section-title','Quick Tools'));
  var bingo=toolRow('🎵','Music Bingo Lab',
   'Print bingo cards for game night — a side tool, kept handy but out of the way.',
   function(){window.location.assign('tools/music-bingo.html');});
  var badges=toolRow('✦','Badge Settings',
   'Set how many songs, favorites, and reviews earn each member badge.',
   function(){
    if(typeof window.a2kBadgeManagementOpen==='function')window.a2kBadgeManagementOpen();
    else{var b=$('abm-launch');if(b)b.click();}
   });
  toolsCol.append(bingo,badges);
  toolsCol.append(el('p','mgmt-tools-note',
   'Everything on this page is one click from where it lives — no doors inside doors.'));
  cols.append(toolsCol);
  ov.append(cols);

  if(tools)d.insertBefore(ov,tools);
  else d.append(ov);
 }

 function toolRow(icon,title,desc,fn){
  var row=el('div','mgmt-tool-row');
  var ic=el('span','mgmt-tool-icon',icon);
  var copy=el('div','mgmt-tool-copy');
  copy.append(el('strong','',title),el('small','',desc));
  var open=el('button','mgmt-tool-open','Open ›');
  open.type='button';
  open.addEventListener('click',fn);
  row.append(ic,copy,open);
  return row;
 }

 function buildChips(){
  var section=$('management-approvals');
  if(!section||$('mgmt-filter-chips'))return;
  var wrap=el('div','mgmt-filter-chips');
  wrap.id='mgmt-filter-chips';
  wrap.setAttribute('role','group');
  wrap.setAttribute('aria-label','Filter approvals');
  var results=$('atk-approval-results');
  if(results)section.insertBefore(wrap,results);
  else section.append(wrap);
  rebuildChips();
 }

 function rebuildChips(){
  var wrap=$('mgmt-filter-chips');
  var filter=$('atk-approval-filter');
  if(!wrap||!filter)return;
  var values=[];
  Array.prototype.forEach.call(filter.options,function(o){
   if(values.indexOf(o.value)===-1)values.push(o.value);
  });
  /* Special events have no select value; the chip goes after New Members. */
  var at=values.indexOf('members');
  if(values.indexOf('events')===-1)values.splice(at===-1?values.length:at+1,0,'events');
  wrap.replaceChildren();
  values.forEach(function(value){
   var opt=filter.querySelector('option[value="'+value+'"]');
   var label=FILTER_LABELS[value]||(opt?opt.textContent:value);
   var chip=el('button','mgmt-chip',label+' ');
   chip.type='button';chip.dataset.filter=value;
   chip.setAttribute('aria-pressed','false');
   chip.append(el('span','mgmt-chip-count',''));
   chip.addEventListener('click',function(){setFilter(value);});
   wrap.append(chip);
  });
  syncChipActive();
  updateChipCounts();
 }

 function syncChipActive(){
  var wrap=$('mgmt-filter-chips');
  if(!wrap)return;
  Array.prototype.forEach.call(wrap.children,function(chip){
   var on=chip.dataset.filter===currentFilter;
   chip.classList.toggle('mgmt-chip-active',on);
   chip.setAttribute('aria-pressed',String(on));
  });
 }

 /* ---------- tab sync ---------- */

 function visiblePanelTab(){
  for(var i=0;i<PANEL_IDS.length;i++){
   var s=$(PANEL_IDS[i]);
   if(s&&!s.hidden)return PANEL_TABS[PANEL_IDS[i]];
  }
  return 'overview';
 }

 function sync(){
  if(!built)return;
  var d=dialog();
  if(!d)return;
  var active=isActive();
  d.dataset.mgmtTab=active?visiblePanelTab():'';
  if(!active){
   var ov=$('mgmt-overview');
   if(ov)ov.hidden=true;
   return;
  }
  var tab=visiblePanelTab();
  var tabs=$('mgmt-tabs');
  if(tabs)Array.prototype.forEach.call(tabs.children,function(b){
   var on=b.dataset.tab===tab;
   b.classList.toggle('mgmt-tab-active',on);
   b.setAttribute('aria-selected',String(on));
  });
  /* The select is the queue's own source of truth (approvalCenterOpen
     resets it to 'all'); follow it so the chips never disagree. */
  if(tab==='approvals'){
   var section=$('management-approvals');
   var sel=$('atk-approval-filter');
   if(sel)currentFilter=(section&&section.classList.contains('mgmt-events-only'))
    ?'events':sel.value;
  }
  /* Overview replaces the old home list on desktop; the other tabs show
     their existing panels. The intro line becomes the mission-control
     subtitle while the portal is open on desktop. */
  var ov2=$('mgmt-overview');
  if(ov2)ov2.hidden=(tab!=='overview');
  var intro=d.querySelector(':scope > p');
  if(intro&&intro.dataset.mgmtOrig===undefined)intro.dataset.mgmtOrig=intro.textContent;
  if(intro)intro.textContent='Everything that needs you, in one place';
  var head=$('management-approvals')&&$('management-approvals').querySelector('h2');
  if(head){
   if(head.dataset.mgmtOrig===undefined)head.dataset.mgmtOrig=head.textContent;
   head.textContent='Approvals';
  }
  if(tab==='overview')refreshOverview();
  syncChipActive();
  updateTabBadges();
 }

 function teardownTexts(){
  var d=dialog();
  if(!d)return;
  var intro=d.querySelector(':scope > p');
  if(intro&&intro.dataset.mgmtOrig!==undefined)intro.textContent=intro.dataset.mgmtOrig;
  var head=$('management-approvals')&&$('management-approvals').querySelector('h2');
  if(head&&head.dataset.mgmtOrig!==undefined)head.textContent=head.dataset.mgmtOrig;
  delete d.dataset.mgmtTab;
 }

 function onDialogClosed(){
  teardownTexts();
  var ov=$('mgmt-overview');
  if(ov)ov.hidden=true;
  /* A closed portal leaves no #manage route behind, so a later reload
     does not auto-reopen it. */
  if(location.hash.indexOf('#manage')===0){
   try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  }
 }

 /* ---------- tab opening ---------- */

 function openTab(tab){
  if(!isActive()&&tab!=='overview')return;
  setHashForTab(tab,tab==='approvals'?currentFilter:null);
  /* Hide the previous tab's panels first. The per-tab open functions
     never hid them — only approvalCenterOpen and managementReviewsOpen
     reset — so visiblePanelTab() (first visible panel wins) kept
     reporting the old tab and the switch never landed. Approvals to
     Venues/Members failed this way for every role; Overview worked only
     because it resets. System is excluded: its opener does its own
     founder-gated reset, and hiding first would flash the Overview while
     its async check runs. */
  if(tab!=='overview'&&tab!=='system')hideOtherPanels(tab);
  if(tab==='overview'){
   if(typeof managementResetNavigation==='function')managementResetNavigation();
  }else if(tab==='approvals'){
   if(typeof approvalCenterOpen==='function')approvalCenterOpen();
  }else if(tab==='venues'){
   if(typeof managementVenuesOpen==='function')managementVenuesOpen();
  }else if(tab==='members'){
   if(typeof managementUsersOpen==='function')managementUsersOpen();
  }else if(tab==='reviews'){
   if(typeof managementReviewsOpen==='function')managementReviewsOpen();
  }else if(tab==='system'){
   if(typeof managementBackupOpen==='function')managementBackupOpen();
  }
  sync();
 }

 function openApprovalsFilter(filter){
  openTab('approvals');
  setFilter(filter||'all');
 }

 function setFilter(value){
  currentFilter=value||'all';
  var section=$('management-approvals');
  var select=$('atk-approval-filter');
  if(currentFilter==='events'){
   if(select)select.value='all';
   if(section)section.classList.add('mgmt-events-only');
  }else{
   if(section)section.classList.remove('mgmt-events-only');
   if(select)select.value=currentFilter;
  }
  if(typeof approvalCenterRender==='function')approvalCenterRender();
  syncChipActive();
  updateChipCounts();
  setHashForTab('approvals',currentFilter);
 }

 /* ---------- overview data ---------- */

 function approvalData(){
  try{return (typeof atkApprovalData!=='undefined'&&atkApprovalData)||null;}
  catch(e){return null;}
 }

 /* Member reports and review notifications used to be read off the badge
    line's suffixes, but the venue-claim module rewrites that line in full
    (its setBadge runs last in the approvalCenterBadge chain, after the
    notification and member-report suffixes are appended), so the suffixes
    are wiped before this layer ever reads them — the Approvals total came
    out 9 instead of 13. Read both counts directly from their own
    read-only sources instead; the badge text stays only as a fallback. */
 var extraCounts={memberReports:null,notifications:null};

 function parseBadgeCounts(){
  var out={total:null,claims:0,memberReports:0,notifications:0};
  var badge=$('management-approval-count');
  if(!badge)return out;
  var text=badge.textContent||'';
  var m=/^\s*(\d+)/.exec(text);
  if(m)out.total=Number(m[1]);
  var mr=/(\d+)\s+member report/.exec(text);
  if(mr)out.memberReports=Number(mr[1]);
  var nt=/(\d+)\s+review notification/.exec(text);
  if(nt)out.notifications=Number(nt[1]);
  if(extraCounts.memberReports!==null)out.memberReports=extraCounts.memberReports;
  if(extraCounts.notifications!==null)out.notifications=extraCounts.notifications;
  return out;
 }

 function setCard(key,value){
  var card=document.querySelector('.mgmt-count-card[data-card="'+key+'"] strong');
  if(card)card.textContent=(value===null||value===undefined)?'—':String(value);
 }

 async function refreshOverview(){
  if(!hasAuth())return;
  var serial=++overviewSerial;
  /* Await the badge first: approvalData() is only populated once the
     badge chain resolves, so reading it synchronously left the first two
     count cards stuck on '—' until the user left and re-entered Overview. */
  if(typeof approvalCenterBadge==='function'){
   try{await approvalCenterBadge();}catch(e){}
  }
  if(serial!==overviewSerial)return;
  /* Direct read-only counts for the two groups whose badge suffixes get
     wiped (see parseBadgeCounts). Fail soft to the badge-text fallback. */
  try{
   var mr=await authClient.from('member_reports')
    .select('id',{count:'exact',head:true}).eq('status','pending');
   if(serial===overviewSerial&&mr&&!mr.error)extraCounts.memberReports=mr.count||0;
  }catch(e){}
  if(serial!==overviewSerial)return;
  try{
   var feed=await Promise.all([
    authClient.rpc('management_review_notification_feed'),
    authClient.rpc('management_pending_review_reports')]);
   if(serial===overviewSerial){
    var f=feed[0]&&feed[0].data, rr=feed[1]&&feed[1].data;
    extraCounts.notifications=
     ((f&&f.suspensions?f.suspensions.length:0)+(f&&f.messages?f.messages.length:0)+
      (rr&&rr.reports?rr.reports.length:0));
   }
  }catch(e){}
  if(serial!==overviewSerial)return;
  var data=approvalData();
  var badge=parseBadgeCounts();
  var venueSubs=data?((Number(data.venue_count)||0)+(Number(data.suggestion_count)||0)):null;
  var hosting=data?Number(data.hosting_count)||0:0;
  var venueReports=data?Number(data.report_count)||0:0;
  var photos=data?Number(data.photo_count)||0:0;
  var members=data?((data.recent_members||[]).length):0;
  var claims=0;
  if(badge.total!==null&&data){
   claims=Math.max(0,badge.total-((Number(data.total_pending)||0)+venueReports+photos));
  }
  var total=null;
  if(data){
   total=(Number(data.total_pending)||0)+venueReports+photos+
    (Number(data.suggestion_count)||0)+claims+badge.memberReports+badge.notifications;
  }else if(badge.total!==null){
   total=badge.total+badge.memberReports+badge.notifications;
  }
  setCard('approvals',total);
  setCard('venues',venueSubs);
  renderNeeds({venueSubs:venueSubs,hosting:hosting,venueReports:venueReports,
   memberReports:badge.memberReports,photos:photos,members:members,claims:claims});
  updateTabBadges();

  /* Venues needing attention and reviews pending come from the same
     read-only RPCs their own panels already use. Fail soft to "—". */
  if(typeof authClient.rpc==='function'){
   authClient.rpc('founder_venue_dashboard').then(function(res){
    if(serial!==overviewSerial)return;
    var d=res&&res.data;
    var n=d?((Number(d.pending_submissions)||0)+(Number(d.pending_reports)||0)+
     (Number(d.pending_photos)||0)):null;
    setCard('attention',n);
    var row=document.querySelector('[data-need="attention"] .mgmt-need-count');
    if(row)row.textContent=(n===null?'—':n+' item'+(n===1?'':'s'));
    var att=document.querySelector('[data-need="attention"]');
    if(att)att.style.display=(n? '':'none');
   }).catch(function(){if(serial===overviewSerial)setCard('attention',null);});
   authClient.rpc('management_review_directory',
    {p_search:'',p_status:'pending',p_sort:'newest',p_page:1}).then(function(res){
    if(serial!==overviewSerial)return;
    var n=(res&&res.data&&res.data.stats)?Number(res.data.stats.pending||0):null;
    setCard('reviews',n);
    var row=document.querySelector('[data-need="reviews"] .mgmt-need-count');
    if(row)row.textContent=(n===null?'—':n+' pending');
    var rev=document.querySelector('[data-need="reviews"]');
    if(rev)rev.style.display=(n?'':'none');
    updateTabBadges(n);
   }).catch(function(){if(serial===overviewSerial)setCard('reviews',null);});
  }
 }

 function renderNeeds(c){
  var list=$('mgmt-needs-list');
  if(!list)return;
  list.replaceChildren();
  var rows=[
   {key:'venues',title:'Venue submissions',sub:'New listings awaiting review.',
    count:c.venueSubs,go:function(){openApprovalsFilter('venues');}},
   {key:'hosting',title:'KJ hosting requests',sub:'Hosts asking for karaoke nights.',
    count:c.hosting,go:function(){openApprovalsFilter('hosting');}},
   {key:'reports',title:'Venue reports',sub:'Members flagging wrong venue details.',
    count:c.venueReports,go:function(){openApprovalsFilter('reports');}},
   {key:'member-reports',title:'Member reports',sub:'Members reporting another member.',
    count:c.memberReports,go:function(){openApprovalsFilter('reports');}},
   {key:'photos',title:'Venue photos',sub:'Submitted photos awaiting review.',
    count:c.photos,go:function(){openApprovalsFilter('photos');}},
   {key:'claims',title:'Venue access claims',sub:'Members claiming a venue as theirs.',
    count:c.claims,go:function(){openApprovalsFilter('claims');}},
   {key:'members',title:'New members',sub:'Recent sign-ups to glance at.',
    count:c.members,go:function(){openApprovalsFilter('members');}}
  ];
  var any=false;
  rows.forEach(function(r){
   if(!r.count)return;
   any=true;
   var row=el('div','mgmt-need-row');
   row.dataset.need=r.key;
   var copy=el('div','mgmt-need-copy');
   copy.append(el('strong','',r.title+' — '),el('span','mgmt-need-count',r.count+' waiting'),
    el('small','',r.sub));
   var b=el('button','mgmt-need-review','Review');
   b.type='button';
   b.addEventListener('click',r.go);
   row.append(copy,b);
   list.append(row);
  });
  /* Rows fed by the two overview RPCs are added by refreshOverview and
     hidden until their counts arrive. */
  [['attention','Venues needing attention','Venues flagged by the dashboard.'],
   ['reviews','Reviews pending','Reviews waiting for moderation.']].forEach(function(def){
   var row=el('div','mgmt-need-row');
   row.dataset.need=def[0];
   row.style.display='none';
   var copy=el('div','mgmt-need-copy');
   copy.append(el('strong','',def[1]+' — '),el('span','mgmt-need-count','Checking…'),
    el('small','',def[2]));
   var b=el('button','mgmt-need-review','Review');
   b.type='button';
   b.addEventListener('click',function(){
    openTab(def[0]==='attention'?'venues':'reviews');
   });
   row.append(copy,b);
   list.append(row);
  });
  if(!any){
   var done=el('p','mgmt-needs-empty','All caught up — nothing needs your attention.');
   list.append(done);
  }
 }

 /* ---------- approvals: chip counts + tab badges ---------- */

 function countCardsIn(root){
  if(!root)return 0;
  return root.querySelectorAll(
   '.atk-approval-card, .atk-approval-member-link, .a2k-special-approval-card').length;
 }

 function updateChipCounts(){
  var wrap=$('mgmt-filter-chips');
  if(!wrap)return;
  var root=$('atk-approval-results');
  var counts={all:0,venues:0,hosting:0,reports:0,photos:0,members:0,claims:0,
   events:0,suspensions:0,messages:0,review_reports:0};
  if(root){
   var current=null;
   Array.prototype.forEach.call(root.children,function(node){
    if(node.classList&&node.classList.contains('atk-approval-group-label')){
     var t=node.textContent||'';
     if(t.indexOf('Guest venue suggestions')===0||t.indexOf('Submitted venues')===0)current='venues';
     else if(t.indexOf('KJ hosting requests')===0)current='hosting';
     else if(t.indexOf('Venue Reports')===0||t.indexOf('Member Reports')===0)current='reports';
     else if(t.indexOf('Venue Photos')===0)current='photos';
     else if(t.indexOf('New members')===0)current='members';
     else if(t.indexOf('Venue Access Requests')===0)current='claims';
     else current=null;
    }else if(node.classList&&node.classList.contains('v85-member-reports-group')){
     current='reports';
     var mrc=node.querySelectorAll('.atk-approval-card').length;
     counts.reports+=mrc;
     counts.all+=mrc;
    }else if(node.classList&&node.classList.contains('atk-review-notification-section')){
     Array.prototype.forEach.call(node.children,function(child){
      if(child.classList&&child.classList.contains('atk-approval-group-label')){
       var t2=child.textContent||'';
       if(t2.indexOf('Reported reviews')===0)current='review_reports';
       else if(t2.indexOf('Suspension messages')===0)current='messages';
       else if(t2.indexOf('Review suspensions')===0)current='suspensions';
       else current=null;
      }else if(child.matches&&child.matches('.atk-approval-card')&&current){
       counts[current]++;counts.all++;
      }
     });
     current=null;
    }else if(current&&(node.matches&&
     (node.matches('.atk-approval-card')||node.matches('.atk-approval-member-link')||
      node.matches('.atk-approval-member-row')))){
     counts[current]++;
     counts.all++;
    }else if(node.classList&&node.classList.contains('atk-approval-member-heading')){
     current='members';
    }
   });
  }
  var ev=$('a2k-special-event-approvals');
  if(ev)counts.events=ev.querySelectorAll('.a2k-special-approval-card').length;
  counts.all+=counts.events;
  Array.prototype.forEach.call(wrap.children,function(chip){
   var n=counts[chip.dataset.filter];
   var span=chip.querySelector('.mgmt-chip-count');
   if(span)span.textContent=(n?' ('+n+')':'');
  });
 }

 function updateTabBadges(pendingReviews){
  var tabs=$('mgmt-tabs');
  if(!tabs)return;
  var badge=parseBadgeCounts();
  var data=approvalData();
  var approvalsTotal=null;
  if(data){
   var claims=0;
   if(badge.total!==null){
    claims=Math.max(0,badge.total-((Number(data.total_pending)||0)+
     (Number(data.report_count)||0)+(Number(data.photo_count)||0)));
   }
   approvalsTotal=(Number(data.total_pending)||0)+(Number(data.report_count)||0)+
    (Number(data.photo_count)||0)+(Number(data.suggestion_count)||0)+claims+
    badge.memberReports+badge.notifications;
  }else if(badge.total!==null){
   approvalsTotal=badge.total+badge.memberReports+badge.notifications;
  }
  setTabBadge('approvals',approvalsTotal);
  if(pendingReviews!==undefined&&pendingReviews!==null)setTabBadge('reviews',pendingReviews);
 }

 function setTabBadge(tab,count){
  var tabs=$('mgmt-tabs');
  if(!tabs)return;
  var b=tabs.querySelector('[data-tab="'+tab+'"]');
  if(!b)return;
  var pill=b.querySelector('.mgmt-tab-badge');
  if(!count){if(pill)pill.remove();return;}
  if(!pill){pill=el('span','mgmt-tab-badge','');b.append(pill);}
  pill.textContent=String(count);
 }

 /* ---------- deep links ---------- */

 function setHashForTab(tab,filter){
  if(!isActive())return;
  var hash='#manage/'+tab;
  if(tab==='approvals'&&filter&&filter!=='all')hash+='/'+filter;
  try{history.replaceState(null,'',hash);}catch(e){}
 }

 function parseRoute(hash){
  var h=(typeof hash==='string'?hash:(location.hash||''));
  if(h.indexOf('#manage')!==0)return null;
  var parts=h.slice(1).split('/').filter(Boolean);
  /* parts: ['manage', tab, extra?, id?] */
  return {tab:parts[1]||'overview',extra:parts[2]||null,id:parts[3]||null};
 }

 function onHashChange(){
  if(!isDesktop())return;
  var route=parseRoute();
  if(route){
   if(isActive())applyRoute(route);
   else openFromRoute(route);
   return;
  }
  /* Leaving the portal's routes for another page closes the workspace,
     so the panel never floats over other pages. */
  if(isActive()&&location.hash&&location.hash!=='#'){
   if(typeof window.a2kDesktopManagementClose==='function')window.a2kDesktopManagementClose();
  }
 }

 function openFromRoute(route){
  /* Wait for the session (the founder check lives in managementOpen).
     Signed-out visitors get managementOpen's silent no-op. */
  var tries=0;
  var iv=setInterval(function(){
   tries++;
   var ready=false;
   try{ready=(typeof authUser!=='undefined');}catch(e){ready=false;}
   if(ready||tries>50){
    clearInterval(iv);
    if(!hasAuth())return;
    if(typeof managementOpen==='function')managementOpen();
    /* managementOpen awaits the admin RPC, so the portal may not be
       active yet when a single 150ms timer fires — on a slow connection
       the route was silently dropped and the deep link landed on
       Overview. Poll briefly instead, and only apply while the portal
       still sits on its default tab (a manual tab click must win over
       the pending route). */
    var rtries=0;
    var riv=setInterval(function(){
     rtries++;
     var d=dialog();
     var cur=d?d.dataset.mgmtTab:null;
     if(isActive()||rtries>10){
      clearInterval(riv);
      if(isActive()&&(cur==='overview'||cur===route.tab))applyRoute(route);
     }
    },150);
   }
  },200);
 }

 function applyRoute(route){
  if(routing)return;
  routing=true;
  try{
   var tab=TABS.some(function(t){return t.id===route.tab;})?route.tab:'overview';
   if(tab==='approvals'){
    openTab('approvals');
    if(route.extra)setFilter(route.extra);
    if(route.id)openApprovalItem(route.extra||'all',route.id);
   }else if(tab==='venues'&&route.extra){
    openTab('venues');
    if(typeof managementVenueDetailOpen==='function')managementVenueDetailOpen(route.extra);
    setHash('#manage/venues/'+route.extra);
   }else if(tab==='members'&&route.extra){
    openTab('members');
    openMemberById(route.extra);
    setHash('#manage/members/'+route.extra);
   }else{
    openTab(tab);
   }
  }finally{
   routing=false;
  }
 }

 function setHash(hash){
  try{history.replaceState(null,'',hash);}catch(e){}
 }

 function openMemberById(id){
  if(!hasAuth())return;
  var status=$('mg-status');
  authClient.from('member_profiles').select('user_id,stage_name,created_at')
   .eq('user_id',id).maybeSingle().then(function(res){
    if(!res||res.error||!res.data||!res.data.stage_name){
     if(status)status.textContent='Could not open that member directly — use search.';
     return;
    }
    var name=res.data.stage_name;
    return authClient.rpc('management_list_members',
     {p_search:name,p_role:'all',p_verified:'all',p_sort:'newest',p_page:1})
     .then(function(r2){
      var members=(r2&&r2.data&&r2.data.members)||[];
      var m=null;
      for(var i=0;i<members.length;i++){
       if(String(members[i].id)===String(id)){m=members[i];break;}
      }
      if(m&&typeof managementMemberOpen==='function')managementMemberOpen(m,'users');
      else if(status)status.textContent='Could not open that member directly — use search.';
     });
   }).catch(function(){
    if(status)status.textContent='Could not open that member directly — use search.';
   });
 }

 /* Card ids are stamped by wrapping the global card factories (the
    closure-private factories in the claims, member-report, suspension and
    special-event modules cannot be wrapped from here; those items land on
    their filter, and the card-level open is a documented follow-up). */
 function stampCardFactories(){
  var defs=[
   ['approvalCenterVenueCard','venue'],['approvalCenterHostingCard','hosting'],
   ['approvalCenterReportCard','venue-report'],['approvalCenterPhotoCard','photo'],
   ['approvalCenterGuestSuggestionCard','suggestion']
  ];
  defs.forEach(function(def){
   var name=def[0],kind=def[1];
   var orig=null;
   try{orig=window[name];}catch(e){orig=null;}
   if(typeof orig!=='function'||orig.__mgmtStamped)return;
   var wrapped=function(item){
    var card=orig.apply(this,arguments);
    if(card&&card.dataset&&item&&item.id){
     card.dataset.mgmtId=item.id;
     card.dataset.mgmtKind=kind;
    }
    return card;
   };
   wrapped.__mgmtStamped=true;
   try{window[name]=wrapped;}catch(e){}
  });
 }

 function wrapRender(){
  var orig=null;
  try{orig=window.approvalCenterRender;}catch(e){orig=null;}
  if(typeof orig!=='function'||orig.__mgmtWrapped)return;
  var wrapped=function(){
   var out=orig.apply(this,arguments);
   try{
    /* Member links are rendered in data order; stamp them from the
       (already dismissal-filtered) recent_members array. */
    var data=approvalData();
    var links=document.querySelectorAll('#atk-approval-results .atk-approval-member-link');
    var members=(data&&data.recent_members)||[];
    Array.prototype.forEach.call(links,function(link,i){
     if(members[i]&&members[i].id){
      link.dataset.mgmtId=members[i].id;
      link.dataset.mgmtKind='member';
     }
    });
    var section=$('management-approvals');
    if(section&&currentFilter==='events')section.classList.add('mgmt-events-only');
    updateChipCounts();
   }catch(e){}
   return out;
  };
  wrapped.__mgmtWrapped=true;
  try{window.approvalCenterRender=wrapped;}catch(e){}
 }

 function openApprovalItem(filter,id){
  var deadline=Date.now()+5000;
  var tick=function(){
   var card=document.querySelector(
    '#atk-approval-results [data-mgmt-id="'+id+'"]');
   if(card){
    if(card.tagName==='DETAILS')card.open=true;
    if(card.scrollIntoView)card.scrollIntoView({block:'center'});
    card.classList.add('mgmt-deep-flash');
    setTimeout(function(){card.classList.remove('mgmt-deep-flash');},2600);
    return;
   }
   if(Date.now()<deadline)setTimeout(tick,250);
  };
  setTimeout(tick,300);
 }

 /* ---------- init ---------- */

 function init(){
  build();
  sync();
  var route=parseRoute(loadHash);
  if(route&&isDesktop()){
   if(isActive())applyRoute(route);
   else openFromRoute(route);
  }
  /* The workspace can open later (profile Management button); a live
     observer keeps the layer synced from the first activation on. */
  var d=dialog();
  if(d){
   var obs=new MutationObserver(function(){sync();});
   obs.observe(d,{attributes:true,attributeFilter:['open']});
  }
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
