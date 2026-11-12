/* Build 133 — User Management mobile redesign.
   Read-only founder directory + member details, reusing existing secured role/verification actions. */
(function(){
 'use strict';
 const get=id=>document.getElementById(id);
 const make=(tag,className,value)=>{
  const item=document.createElement(tag);
  if(className)item.className=className;
  if(value!==undefined)item.textContent=String(value);
  return item;
 };
 const button=(text,fn,className)=>{
  const item=make('button',className,text);item.type='button';
  if(fn)item.addEventListener('click',fn);return item;
 };
 const shapes={
  people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 5a4 4 0 0 1 0 8 M19 15a4 4 0 0 1 3 4v2',
  search:'M21 21l-4.4-4.4 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  shield:'M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z M8 12l3 3 5-5',
  chevron:'M9 18l6-6-6-6',
  pencil:'M12 20h9 M16 4a2 2 0 0 1 3 3L8 18l-4 1 1-4Z',
  mic:'M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4 M5 10v2a7 7 0 0 0 14 0v-2 M12 19v4 M8 23h8',
  history:'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v5l4 2',
  clipboard:'M9 3h6l1 3h4v16H4V6h4z M9 13l2 2 4-4',
  filter:'M4 7h16 M7 12h10 M10 17h4',
  id:'M3 5h18v14H3z M7 10h.01 M7 14h.01 M11 10h6 M11 14h5',
  info:'M12 12v5 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
 };
 function icon(name){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('mg2-icon');svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');
  svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',shapes[name]||shapes.info);svg.append(path);return svg;
 }
 function avatar(member,large=false){
  const wrapper=make('span','mg2-avatar'+(large?' mg2-avatar-large':''),((member.stage_name||'?').trim()[0]||'?').toUpperCase());
  if(member.avatar_path&&authClient){
   const src=authClient.storage.from('member-avatars').getPublicUrl(member.avatar_path).data?.publicUrl;
   if(src){
    const img=make('img','');img.alt='';
    img.loading='lazy';
    img.addEventListener('load',()=>{wrapper.textContent='';wrapper.append(img)});
    img.src=src;
   }
  }
  return wrapper;
 }
 function roleName(role){
  return String(role||'member').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
 }
 function memberNumber(member){
  return member.member_number==null?'Member number pending':'Member #'+String(member.member_number).padStart(6,'0');
 }
 function date(value,withDay=false){
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'Date unavailable':
   d.toLocaleDateString(undefined,withDay?{month:'short',day:'numeric',year:'numeric'}:{month:'short',year:'numeric'});
 }
 function roleBadges(member){
  const badges=make('span','mg2-badges');
  if(member.verified)badges.append(make('span','mg2-badge mg2-badge-verified','✓ Verified'));
  if(member.role==='founder')badges.append(make('span','mg2-badge mg2-badge-founder','★ Founder'));
  else if(member.role&&member.role!=='member')badges.append(make('span','mg2-badge',roleName(member.role)));
  if(member.is_host)badges.append(make('span','mg2-badge','KJ / Host'));
  if(member.is_owner)badges.append(make('span','mg2-badge','Venue Owner'));
  if(!badges.childElementCount)badges.append(make('span','mg2-badge','Member'));
  return badges;
 }
 let ready=false,browseAll=false,lastResults=[],profileSerial=0,listSerial=0,filterDebounce=null;
 let originalOpen,originalLoad,originalChanged,originalMemberOpen,originalMemberBack,originalSaveRole,originalSaveVerification;
 let detailMemberId=null;
 const users=()=>get('management-users'),details=()=>get('management-member-details');
 const active=()=>browseAll||get('mg-search').value.trim()||
    get('mg-role').value!=='all'||get('mg-verified').value!=='all';
 function makeListCard(member){
  const card=button('',()=>managementMemberOpen(member),'mg2-member-card');
  card.setAttribute('aria-label','View '+(member.stage_name||'member')+' account details');
  const info=make('span','mg2-member-info');
  info.append(make('strong','',member.stage_name||'Karaoke Member'),
    make('small','',memberNumber(member)+' · Joined '+date(member.joined_at,true)));
  const badgeContainer=roleBadges(member);
  card.append(avatar(member),info,badgeContainer,icon('chevron'));
  return card;
 }
 function fillCards(holder,data){
  holder.replaceChildren();
  if(!data.length){
   holder.append(make('p','mg2-empty','No members match these filters.'));
   return;
  }
  for(const member of data)holder.append(makeListCard(member));
 }
 function changeFilter(){
  managementUserPage=1;
  clearTimeout(filterDebounce);
  filterDebounce=setTimeout(managementUsersLoad,230);
 }
 function browse(){
  browseAll=true;managementUserPage=1;
  managementUsersLoad();
  get('mg-search').focus();
 }
 function resetFilters(){
  browseAll=false;
  get('mg-search').value='';get('mg-role').value='all';
  get('mg-verified').value='all';get('mg-sort').value='newest';
  const extra=get('mg2-more-filters');extra.hidden=true;
  get('mg2-filter-button').setAttribute('aria-expanded','false');
  managementUserPage=1;managementUsersLoad();
 }
 function createUsers(){
  const section=users();
  section.classList.add('mg2-users-screen');
  const head=section.querySelector('.management-user-head');
  head.classList.add('mg2-header');
  const heading=make('div','mg2-header-copy');
  heading.append(make('h2','','User Management'),
   make('p','','Manage members, roles, and verification.'));
  head.replaceChildren(heading);
  const search=section.querySelector('label:has(#mg-search)');
  search.classList.add('mg2-search-label');
  const searchIcon=icon('search');search.prepend(searchIcon);
  get('mg-search').placeholder='Name or member number';
  search.setAttribute('aria-label','Search members');
  const legacyFilters=section.querySelector('.management-filters');
  const role=get('mg-role').closest('label');
  const verified=get('mg-verified').closest('label');
  const sort=get('mg-sort').closest('label');
  legacyFilters.remove();
  const toolbar=make('div','mg2-toolbar');
  const toggle=button('Filters',()=>{
   const panel=get('mg2-more-filters');
   panel.hidden=!panel.hidden;
   toggle.setAttribute('aria-expanded',String(!panel.hidden));
  },'mg2-filter-button');
  toggle.id='mg2-filter-button';toggle.prepend(icon('filter'));toggle.setAttribute('aria-expanded','false');
  role.classList.add('mg2-toolbar-label');verified.classList.add('mg2-toolbar-label');
  toolbar.append(toggle,role,verified);
  const extra=make('div','mg2-more-filters');extra.id='mg2-more-filters';extra.hidden=true;
  sort.classList.add('mg2-sort-label');extra.append(sort,button('Reset filters',resetFilters,'mg2-inline-link'));
  const attention=make('section','mg2-attention');
  const attentionTitle=make('div','mg2-block-heading');
  attentionTitle.append(make('h3','','Needs Attention'));
  const action=button('',()=>{if(typeof approvalCenterOpen==='function')approvalCenterOpen()},'mg2-approval-action');
  const actionIcon=make('span','mg2-approval-icon');actionIcon.append(icon('clipboard'));
  const actionCopy=make('span','mg2-approval-copy');
  actionCopy.append(make('strong','','Member Requests & Approvals'),
   make('small','','Open the Approval Center to review pending requests and updates.'));
  action.append(actionIcon,actionCopy,icon('chevron'));
  attention.append(attentionTitle,action);
  const directory=make('section','mg2-directory');
  const dirTitle=make('div','mg2-block-heading');
  dirTitle.append(make('h3','','Member Directory'));
  const total=make('span','mg2-total','');total.id='mg2-total';
  dirTitle.append(total);
  const hint=make('p','mg2-directory-hint','Recently registered members. Search or browse to find anyone.');
  const recent=make('div','mg2-recent-list');recent.id='mg2-recent-list';
  const browseButton=button('Browse all members',browse,'mg2-browse');
  browseButton.prepend(icon('people'));browseButton.append(icon('chevron'));
  const originalStatus=get('mg-status'),originalResults=get('mg-results');
  originalStatus.classList.add('mg2-status');
  originalResults.classList.add('mg2-results');
  const pages=get('mg-page').closest('.management-pages');
  pages.classList.add('mg2-pages');
  directory.append(dirTitle,hint,recent,browseButton,originalStatus,originalResults,pages);
  head.after(search,toolbar,extra,attention,directory);
  // Keep the existing sort functionality, exposing it inside Filters.
  get('mg-sort').addEventListener('change',()=>{browseAll=true;changeFilter()});
 }
 function section(title,which){
  const wrapper=make('section','mg2-section');
  const row=make('div','mg2-section-top');
  const label=make('span','mg2-section-title');label.append(icon(which),make('h3','',title));
  row.append(label);wrapper.append(row);
  return {wrapper,row};
 }
 function togglePanel(buttonEl,panel){
  const expanded=buttonEl.getAttribute('aria-expanded')==='true';
  panel.hidden=expanded;
  buttonEl.setAttribute('aria-expanded',String(!expanded));
 }
 function makeDisclosure(title,ico,id,description){
  const sectionEl=make('section','mg2-disclosure');
  const control=button('','', 'mg2-disclosure-button');
  // Direct user control; no inert rows.
  control.replaceChildren();
  const leading=make('span','mg2-disclosure-label');
  leading.append(icon(ico),make('strong','',title));
  const right=icon('chevron');right.classList.add('mg2-chevron');
  control.append(leading,right);
  control.setAttribute('aria-expanded','false');
  control.setAttribute('aria-controls',id);
  const content=make('div','mg2-disclosure-content');content.id=id;content.hidden=true;
  if(description)content.append(make('p','mg2-muted',description));
  control.addEventListener('click',()=>togglePanel(control,content));
  sectionEl.append(control,content);
  return {sectionEl,content};
 }
 function createDetails(){
  const sectionEl=details();
  sectionEl.classList.add('mg2-details-screen');
  const originalHead=sectionEl.querySelector('.management-user-head');
  originalHead.classList.add('mg2-details-header');
  originalHead.replaceChildren(make('h2','','Member Details'));
  const hero=make('section','mg2-member-hero');hero.id='mg2-member-hero';
  const originalCards=sectionEl.querySelectorAll(':scope > .management-detail-card');
  const permissions=section('Roles & Permissions','shield');
  permissions.wrapper.id='mg2-permissions';
  const edit=button('Edit',()=>{
   const chooser=get('mg2-role-chooser');
   chooser.hidden=!chooser.hidden;
   edit.setAttribute('aria-expanded',String(!chooser.hidden));
  },'mg2-edit-button');
  edit.prepend(icon('pencil'));edit.id='mg2-edit';edit.setAttribute('aria-expanded','false');
  permissions.row.append(edit);
  const values=make('dl','mg2-permissions-values');values.id='mg2-permissions-values';
  const chooser=make('div','mg2-role-chooser');chooser.id='mg2-role-chooser';chooser.hidden=true;
  chooser.append(button('Change platform role',()=>{chooser.hidden=true;managementOpenEditor('role')},'mg2-chooser-action'),
    button('Change verification',()=>{chooser.hidden=true;managementOpenEditor('verification')},'mg2-chooser-action'));
  permissions.wrapper.append(values,chooser);
  const karaoke=makeDisclosure('Karaoke Profile','mic','mg2-karaoke-panel',
   'Loading karaoke interests…');
  const history=makeDisclosure('Account History','history','mg2-history-panel',
   'Loading recorded management activity…');
  originalHead.after(hero,permissions.wrapper,karaoke.sectionEl,history.sectionEl);
  // Original secure fields remain mounted for the existing editor and confirmation workflow.
  for(const card of originalCards)card.classList.add('mg2-legacy-card');
  // Preserve original editor layers and confirmation dialogs, without moving them.
 }
 function fillPermissions(member){
  const view=get('mg2-permissions-values');view.replaceChildren();
  function line(label,value){
   const row=make('div','mg2-permissions-row');
   row.append(make('dt','',label),make('dd','',value));view.append(row);
  }
  line('Platform role',roleName(member.role));
  line('Verification',member.verified?'Verified':'Not verified');
  const protectedMember=member.role==='founder'||member.id===authUser?.id;
  get('mg2-edit').hidden=protectedMember;
  get('mg2-role-chooser').hidden=true;
  get('mg2-edit').setAttribute('aria-expanded','false');
 }
 function paintHero(member){
  const holder=get('mg2-member-hero');holder.replaceChildren();
  const info=make('div','mg2-hero-info');
  info.append(make('h3','',member.stage_name||'Karaoke Member'),
   make('p','',memberNumber(member)+' · Joined '+date(member.joined_at)));
  info.append(roleBadges(member));
  holder.append(avatar(member,true),info);
 }
 function formatInterest(value){
  return String(value||'').replace(/_/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase());
 }
 function paintProfile(data){
  const panel=get('mg2-karaoke-panel');panel.replaceChildren();
  const p=data?.profile||{};
  const interests=Array.isArray(p.karaoke_interests)?p.karaoke_interests:[];
  const names=interests.filter(Boolean).map(formatInterest);
  panel.append(make('p','mg2-subheading','Interests'),
   make('p','',names.length?names.join(' · '):'No karaoke interests have been added.'));
  if(p.bio?.trim()){
   panel.append(make('p','mg2-subheading','About This Member'),
    make('p','',p.bio.trim()));
  }
  const venues=Array.isArray(data?.venues)?data.venues:[];
  if(venues.length){
   panel.append(make('p','mg2-subheading','Associated Venues'));
   for(const venue of venues){
    const line=make('p','mg2-venue-association');
    line.append(make('strong','',venue.name||'Venue'),make('small','',venue.connection||'Associated'));
    panel.append(line);
   }
  }
 }
 function paintHistory(data){
  const panel=get('mg2-history-panel');panel.replaceChildren();
  const history=Array.isArray(data?.history)?data.history:[];
  panel.append(make('p','mg2-muted','Recorded management changes only; login history is not collected here.'));
  if(!history.length){panel.append(make('p','mg2-history-empty','No recorded management changes for this member.'));return}
  for(const item of history){
   const card=make('div','mg2-history-record');
   card.append(make('strong','',String(item.action||'Account update').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())));
   card.append(make('small','',date(item.created_at,true)));
   if(item.reason)card.append(make('p','',String(item.reason)));
   panel.append(card);
  }
 }
 async function fetchDetails(member){
  const serial=++profileSerial;
  get('mg2-karaoke-panel').replaceChildren(make('p','mg2-muted','Loading karaoke profile…'));
  get('mg2-history-panel').replaceChildren(make('p','mg2-muted','Loading account history…'));
  try{
   const {data,error}=await authClient.rpc('founder_member_profile',{p_user_id:member.id});
   if(error)throw error;
   if(serial!==profileSerial||managementSelectedMember?.id!==member.id)return;
   if(data?.profile){
    // Keep server data authoritative, especially after a role or verification change.
    Object.assign(member,data.profile);
    paintHero(member);fillPermissions(member);
   }
   paintProfile(data);paintHistory(data);
  }catch(error){
   if(serial!==profileSerial)return;
   get('mg2-karaoke-panel').textContent='Unable to load profile: '+(error.message||'Please try again.');
   get('mg2-history-panel').textContent='Unable to load history: '+(error.message||'Please try again.');
  }
 }
 function paintDirectory(data){
  const members=Array.isArray(data?.members)?data.members:[];
  lastResults=members;
  managementUserTotal=Number(data?.total)||0;
  const isActive=!!active();
  get('mg2-total').textContent=managementUserTotal.toLocaleString()+' total member'+(managementUserTotal===1?'':'s');
  get('mg2-recent-list').hidden=isActive;
  get('mg2-recent-list').replaceChildren();
  get('mg2-browse').hidden=isActive;
  users().querySelector('.mg2-attention').hidden=isActive;
  users().querySelector('.mg2-directory-hint').hidden=isActive;
  get('mg-status').hidden=!isActive;
  get('mg-results').hidden=!isActive;
  const pager=get('mg-page').closest('.management-pages');
  pager.hidden=!isActive||managementUserTotal<=25;
  if(!isActive){
   const recent=members.slice(0,3);
   if(recent.length)fillCards(get('mg2-recent-list'),recent);
   else get('mg2-recent-list').append(make('p','mg2-empty','No members have registered yet.'));
  }else{
   fillCards(get('mg-results'),members);
   get('mg-status').textContent=managementUserTotal+' matching member'+(managementUserTotal===1?'':'s');
   get('mg-page').textContent='Page '+managementUserPage+' of '+Math.max(1,Math.ceil(managementUserTotal/25));
   get('mg-prev').disabled=managementUserPage<=1;
   get('mg-next').disabled=managementUserPage*25>=managementUserTotal;
  }
 }
 function install(){
  if(ready)return;ready=true;
  createUsers();createDetails();
 }
 originalOpen=managementUsersOpen;
 originalLoad=managementUsersLoad;
 originalChanged=managementUsersChanged;
 originalMemberOpen=managementMemberOpen;
 originalMemberBack=managementMemberBack;
 originalSaveRole=managementMemberSaveRole;
 originalSaveVerification=managementMemberSaveVerification;
 managementUsersOpen=function(){
  install();
  browseAll=false;managementUserPage=1;
  get('mg-search').value='';get('mg-role').value='all';
  get('mg-verified').value='all';get('mg-sort').value='newest';
  get('mg2-more-filters').hidden=true;
  get('mg2-filter-button').setAttribute('aria-expanded','false');
  originalOpen.apply(this,arguments);
 };
 managementUsersChanged=changeFilter;
 managementUsersLoad=async function(){
  install();
  const serial=++listSerial;
  const args={p_search:get('mg-search').value.trim(),
   p_role:get('mg-role').value,p_verified:get('mg-verified').value,
   p_sort:get('mg-sort').value,p_page:managementUserPage};
  get('mg2-total').textContent='Loading…';
  if(active())get('mg-status').textContent='Loading members…';
  try{
   if(!authClient||!authUser)throw Error('Please sign in again.');
   const {data,error}=await authClient.rpc('founder_member_directory',args);
   if(serial!==listSerial||users().hidden)return;
   if(error)throw error;
   paintDirectory(data);
  }catch(error){
   if(serial!==listSerial)return;
   get('mg2-total').textContent='Unavailable';
   get('mg-status').hidden=false;
   get('mg-status').textContent='Unable to load members: '+(error.message||'Please try again.');
   get('mg-results').hidden=true;
   get('mg2-recent-list').replaceChildren();
   get('mg2-recent-list').append(make('p','mg2-empty','Member directory unavailable.'));
   get('mg-page').closest('.management-pages').hidden=true;
  }
 };
 managementMemberOpen=function(member,returnView='users'){
  install();
  originalMemberOpen.apply(this,arguments);
  detailMemberId=member.id;
  paintHero(member);fillPermissions(member);
  get('mg2-karaoke-panel').hidden=true;
  get('mg2-history-panel').hidden=true;
  for(const btn of details().querySelectorAll('.mg2-disclosure-button'))btn.setAttribute('aria-expanded','false');
  fetchDetails(member);
 };
 managementMemberBack=function(){
  ++profileSerial;detailMemberId=null;
  originalMemberBack.apply(this,arguments);
 };
 managementMemberSaveRole=async function(){
  const result=await originalSaveRole.apply(this,arguments);
  const member=managementSelectedMember;
  if(member&&details()&&!details().hidden){
   fillPermissions(member);paintHero(member);
   if(!get('mg-save-result-overlay').hidden)fetchDetails(member);
  }
  return result;
 };
 managementMemberSaveVerification=async function(){
  const result=await originalSaveVerification.apply(this,arguments);
  const member=managementSelectedMember;
  if(member&&details()&&!details().hidden){
   fillPermissions(member);paintHero(member);
   if(!get('mg-save-result-overlay').hidden)fetchDetails(member);
  }
  return result;
 };
 install();
})();