/* ATK Build 153 — verified venue owner's compact My Venues workspace.
   All data comes from RLS-scoped queries. Editing is enforced by a separate
   verified-owner, field-allowlisted Supabase RPC. No founder privileges are shared. */
(function(){
 'use strict';
 const entry=document.getElementById('atk-owner-profile-entry');
 const panel=entry?.querySelector('.profile-owner-panel');
 if(!entry||!panel)return;
 const node=(tag,cls,text)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);
  return e;
 };
 const button=(text,handler,cls)=>{
  const b=node('button',cls,text);b.type='button';b.addEventListener('click',handler);return b;
 };
 const formatDate=value=>{
  if(!value)return '';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
 };
 const fallback='assets/atk-default-venue.webp';
 let loadedUser=null,sequence=0,scheduled=false,activeTab='venues',searchText='';
 let owned=[],requests=[],photos=[],reviews=[],photoAvailable=false,reviewAvailable=false;
 let coverURLs=new Map(),editor=null,editingRow=null,editorBusy=false,feedbackText='';
 const shell=node('div','atk-od-workspace');
 shell.id='atk-owner-dashboard';
 const intro=node('p','atk-od-intro','Your venues, ownership requests, and listing tools.');
 const summary=node('div','atk-od-stats');
 const stats={};
 for(const [key,label] of [['verified','Verified'],['pending','Pending'],['declined','Declined']]){
  const card=node('div','atk-od-stat');
  const val=node('strong','atk-od-stat-value','0');
  card.append(val,node('small','',label));summary.append(card);stats[key]=val;
 }
 const toolsRow=node('div','atk-od-tools');
 const find=button('Find a Venue',()=>{
  if(typeof profileOwnerFindVenues==='function')profileOwnerFindVenues();
  else if(typeof navigate==='function')navigate('find');
 },'atk-od-action atk-od-action-primary');
 toolsRow.append(find);
 const tabs=node('div','atk-od-tabs');tabs.setAttribute('role','tablist');
 const venueTab=button('My Venues',()=>setTab('venues'),'atk-od-tab');
 const requestTab=button('Claim Requests',()=>setTab('requests'),'atk-od-tab');
 const venueTabCount=node('small','', '0');
 const requestTabCount=node('small','', '0');
 venueTab.append(venueTabCount);requestTab.append(requestTabCount);
 venueTab.setAttribute('role','tab');requestTab.setAttribute('role','tab');
 tabs.append(venueTab,requestTab);
 const searchBox=node('label','atk-od-search-label');
 searchBox.append(node('span','','Search your venues'));
 const search=node('input','atk-od-search');
 search.type='search';search.placeholder='Venue or city';search.autocomplete='off';
 search.addEventListener('input',()=>{
  searchText=search.value.trim().toLocaleLowerCase();paintCards();
 });
 searchBox.append(search);
 const status=node('p','atk-od-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const cards=node('div','atk-od-cards');
 shell.append(intro,summary,toolsRow,tabs,searchBox,status,cards);
 panel.replaceChildren(shell);

 function setTab(which){
  activeTab=which;paintCards();
 }
 function resetForAccount(uid){
  loadedUser=uid;owned=[];requests=[];photos=[];reviews=[];coverURLs=new Map();
  photoAvailable=false;reviewAvailable=false;activeTab='venues';searchText='';search.value='';feedbackText='';
 }
 function queueRefresh(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;void refresh()});
 }
 async function refresh(){
  const uid=authUser?.id||null,token=++sequence;
  if(uid!==loadedUser)resetForAccount(uid);
  if(!uid||!authClient){
   entry.hidden=true;
   if(editor?.open)editor.close();
   status.textContent='';cards.replaceChildren();
   return;
  }
  status.textContent='Loading your venues…';
  try{
   const [ownedResult,requestResult]=await Promise.all([
    authClient.from('verified_venue_claims')
     .select('venue_id,approved_at,venues(id,name,slug,city,state,address_line1,postal_code,phone,website,tagline,description,publication_status,published,updated_at,karaoke_schedule)')
     .eq('owner_user_id',uid).is('revoked_at',null),
    authClient.from('venue_claim_requests')
     .select('id,venue_id,status,created_at,reviewed_at,decision_note,venues(name,city,state,slug,publication_status)')
     .eq('claimant_user_id',uid).order('created_at',{ascending:false}).limit(150)
   ]);
   if(ownedResult.error)throw ownedResult.error;
   if(requestResult.error)throw requestResult.error;
   if(token!==sequence||authUser?.id!==uid)return;
   owned=(ownedResult.data||[]).sort((a,b)=>(a.venues?.name||'').localeCompare(b.venues?.name||''));
   requests=requestResult.data||[];
   const interests=Array.isArray(memberProfile?.karaoke_interests)?memberProfile.karaoke_interests:[];
   entry.hidden=!(owned.length||requests.length||interests.includes('venue_owner'));
   const ids=owned.map(x=>x.venue_id);
   photos=[];reviews=[];coverURLs=new Map();photoAvailable=false;reviewAvailable=false;
   if(ids.length){
    const [p,r]=await Promise.all([
     authClient.from('venue_photos').select('id,venue_id,caption,moderation_status,published,is_cover,storage_path,created_at').in('venue_id',ids).limit(1000),
     authClient.from('reviews').select('id,venue_id').eq('status','approved').in('venue_id',ids).limit(1000)
    ]);
    if(token!==sequence||authUser?.id!==uid)return;
    if(!p.error){photos=p.data||[];photoAvailable=true}
    else console.warn('Owner venue photo totals unavailable',p.error);
    if(!r.error){reviews=r.data||[];reviewAvailable=true}
    else console.warn('Owner venue review totals unavailable',r.error);
   }
   status.textContent=feedbackText||'';
   feedbackText='';
   paintCards();
   const covers=photos.filter(p=>p.published===true&&p.moderation_status==='approved'&&p.is_cover&&p.storage_path);
   if(covers.length){
    for(const photo of covers){
     try{
      const {data,error}=await authClient.storage.from('venue-community-photos').createSignedUrl(photo.storage_path,3600);
      if(token!==sequence||authUser?.id!==uid)return;
      if(!error&&data?.signedUrl)coverURLs.set(photo.venue_id,data.signedUrl);
     }catch(error){console.warn('Venue image preview unavailable',error)}
    }
    if(token===sequence&&authUser?.id===uid)paintCards();
   }
  }catch(error){
   if(token!==sequence||authUser?.id!==uid)return;
   status.textContent='Could not load your venues: '+(error.message||'Please try again.');
   cards.replaceChildren();
   // Retain an existing visible entry so the error can be seen and retried.
   entry.hidden=false;
   const retry=button('Try Again',queueRefresh,'atk-od-action atk-od-action-primary');
   cards.append(retry);
  }
 }
 function photoStats(id){
  const these=photos.filter(p=>p.venue_id===id);
  return {
   approved:these.filter(p=>p.published===true&&p.moderation_status==='approved').length,
   pending:these.filter(p=>p.moderation_status==='pending').length
  };
 }
 function paintCards(){
  const pending=requests.filter(x=>x.status==='pending').length;
  const declined=requests.filter(x=>x.status==='declined').length;
  stats.verified.textContent=String(owned.length);
  stats.pending.textContent=String(pending);
  stats.declined.textContent=String(declined);
  venueTabCount.textContent=String(owned.length);
  requestTabCount.textContent=String(requests.length);
  for(const [tab,which] of [[venueTab,'venues'],[requestTab,'requests']]){
   const active=activeTab===which;
   tab.setAttribute('aria-selected',String(active));
   tab.tabIndex=active?0:-1;
  }
  searchBox.hidden=activeTab!=='venues'||owned.length<3;
  cards.replaceChildren();
  if(activeTab==='venues')paintOwned();
  else paintRequests();
 }
 function venuePhotoSection(row){
  const relevant=photos.filter(photo=>photo.venue_id===row.venue_id
   &&(photo.moderation_status==='pending'
    ||(photo.moderation_status==='approved'&&photo.published===true)));
  if(!photoAvailable||!relevant.length)return null;
  const section=node('section','atk-od-photo-section');
  section.setAttribute('aria-label','Photos for '+(row.venues?.name||'this venue'));
  const countPending=relevant.filter(p=>p.moderation_status==='pending').length;
  const trigger=button(
   'Venue Photos ('+relevant.length+')'+(countPending?' · '+countPending+' awaiting approval':''),
   ()=>void togglePhotos(),'atk-od-photo-toggle'
  );
  trigger.setAttribute('aria-expanded','false');
  const gallery=node('div','atk-od-photo-panel');
  gallery.hidden=true;
  section.append(trigger,gallery);
  let loaded=false;
  async function togglePhotos(){
   const open=trigger.getAttribute('aria-expanded')==='true';
   trigger.setAttribute('aria-expanded',String(!open));
   gallery.hidden=open;
   if(open||loaded)return;
   loaded=true;
   gallery.append(node('p','atk-od-muted','Loading venue photos…'));
   const grid=node('div','atk-od-photo-grid');
   const pending=relevant.filter(p=>p.moderation_status==='pending');
   const sorted=[...pending,...relevant.filter(p=>p.moderation_status!=='pending')];
   for(const photo of sorted.slice(0,30)){
    const item=node('figure','atk-od-photo-tile');
    const image=node('img','atk-od-photo-thumb');
    image.alt=photo.caption||'Venue photo';
    image.loading='lazy';
    const label=node('figcaption','',photo.moderation_status==='pending'?'Awaiting approval':'Approved photo');
    item.append(image,label);
    if(photo.caption)item.append(node('small','atk-od-photo-caption',photo.caption));
    grid.append(item);
    if(photo.storage_path){
     // Only approved venue owners can read these records. Generate short-lived
     // image URLs when this specific venue's photo list is opened.
     authClient.storage.from('venue-community-photos').createSignedUrl(photo.storage_path,600)
      .then(({data,error})=>{
       if(error||!data?.signedUrl)throw error||Error('No preview URL');
       if(item.isConnected&&row.venue_id&&authUser?.id===loadedUser)image.src=data.signedUrl;
      })
      .catch(()=>{if(item.isConnected)item.replaceChildren(node('p','atk-od-muted','Photo preview unavailable'),label)});
    }else{
     item.replaceChildren(node('p','atk-od-muted','Photo preview unavailable'),label);
    }
   }
   gallery.replaceChildren(grid);
   if(relevant.length>30)gallery.append(node('p','atk-od-muted','Showing the first 30 photos.'));
   if(countPending){
    const review=button('Review Pending Photos ('+countPending+')',()=>{
     if(typeof atkOwnerPhotoOpen==='function')void atkOwnerPhotoOpen(row.venue_id,row.venues?.name);
    },'atk-od-action atk-od-action-primary atk-od-photo-review');
    gallery.append(review);
   }
  }
  return section;
 }
 function paintOwned(){
  if(!owned.length){
   const empty=node('div','atk-od-empty');
   empty.append(node('strong','','No verified venues yet'),
    node('p','','After a claim is approved, you can manage the listing here. Check Claim Requests for updates.'));
   cards.append(empty);return;
  }
  const filtered=owned.filter(row=>{
   const v=row.venues;
   return !searchText||[v?.name,v?.city,v?.state].filter(Boolean).join(' ').toLocaleLowerCase().includes(searchText);
  });
  if(!filtered.length){
   cards.append(node('p','atk-od-empty','No matching venues. Try another name or city.'));return;
  }
  for(const row of filtered){
   const v=row.venues,available=!!v?.published&&v?.publication_status==='published';
   const card=node('article','atk-od-venue-card');
   const top=node('div','atk-od-venue-top');
   const image=node('img','atk-od-cover');
   image.src=coverURLs.get(row.venue_id)||fallback;
   image.alt='Venue photo';image.loading='lazy';
   image.onerror=function(){this.onerror=null;this.src=fallback};
   const info=node('div','atk-od-venue-info');
   const name=node('strong','atk-od-venue-name',v?.name||'Venue listing unavailable');
   const location=node('p','atk-od-location',[v?.city,v?.state].filter(Boolean).join(', ')||'Location unavailable');
   const badge=node('span','atk-od-owner-label',available?'Verified Owner':'Listing unavailable');
   const description=node('p','atk-od-tagline',v?.tagline||'Approved '+formatDate(row.approved_at));
   info.append(name,location,badge,description);
   top.append(image,info);card.append(top);
   const metrics=node('div','atk-od-mini-metrics');
   const ps=photoStats(row.venue_id);
   const reviewCount=reviews.filter(r=>r.venue_id===row.venue_id).length;
   metrics.append(
    node('span','',reviewAvailable?reviewCount+' '+(reviewCount===1?'review':'reviews'):'Reviews unavailable'),
    node('span','',photoAvailable?ps.approved+' '+(ps.approved===1?'photo':'photos'):'Photos unavailable')
   );
   if(photoAvailable&&ps.pending)metrics.append(node('span','atk-od-photo-pending-count',
    ps.pending+' awaiting photo approval'));
   card.append(metrics);
   const venuePhotos=venuePhotoSection(row);
   if(venuePhotos)card.append(venuePhotos);
   if(available){
    const actions=node('div','atk-od-card-actions');
    actions.append(button('View Listing',()=>void viewListing(row),'atk-od-action'),
     button('Edit Details',()=>openEditor(row),'atk-od-action atk-od-action-primary'));
    card.append(actions);
   }else{
    card.append(node('p','atk-od-muted','This listing is not public. Only site management can change publication status.'));
   }
   cards.append(card);
  }
 }
 function paintRequests(){
  if(!requests.length){
   const empty=node('div','atk-od-empty');
   empty.append(node('strong','','No claim requests yet'),node('p','','Find a venue and select Claim Venue to request ownership.'));
   cards.append(empty);return;
  }
  for(const row of requests){
   const card=node('article','atk-od-request-card');
   const head=node('div','atk-od-request-top');
   const label={approved:'Approved',pending:'Pending Review',declined:'Declined'}[row.status]||'Updated';
   const statusLabel=node('span','atk-od-request-status',label);
   statusLabel.dataset.status=row.status;
   head.append(node('strong','',row.venues?.name||'Venue'),statusLabel);
   card.append(head);
   const sub=[row.venues?.city,row.venues?.state].filter(Boolean).join(', ');
   if(sub)card.append(node('p','atk-od-location',sub));
   const when=formatDate(row.reviewed_at||row.created_at);
   if(when)card.append(node('small','atk-od-muted',(row.status==='pending'?'Submitted ':'Reviewed ')+when));
   if(row.status==='declined'){
    card.append(node('p','atk-od-decision','Review team: '+(row.decision_note||'Unable to confirm venue ownership.')));
   }else if(row.status==='approved'){
    card.append(node('p','atk-od-decision','Your claim was approved. See My Venues to manage your listing.'));
   }else{
    card.append(node('p','atk-od-muted','Your request is waiting for verification. It does not grant venue access.'));
   }
   cards.append(card);
  }
 }
 async function viewListing(row){
  const id=row.venue_id;
  if(window.liveVenueLoadPromise?.then)try{await window.liveVenueLoadPromise}catch(error){}
  const v=typeof sampleVenues!=='undefined'?sampleVenues.find(x=>x.databaseId===id):null;
  if(!v){status.textContent='That venue is not available on the public site right now.';return}
  if(document.getElementById('profile-section-dialog')?.open&&typeof profileCloseSection==='function')profileCloseSection();
  if(typeof openVenue==='function')openVenue(v.id);
 }
 const editFields=[
  {key:'tagline',label:'Short tagline',pane:'about',max:180},
  {key:'description',label:'About this venue',pane:'about',max:1800,type:'textarea'},
  {key:'phone',label:'Phone number',pane:'contact',max:40,type:'tel'},
  {key:'website',label:'Website URL',pane:'contact',max:400,type:'url',hint:'Start with https://'},
  {key:'address_line1',label:'Street address',pane:'location',max:180},
  {key:'city',label:'City',pane:'location',max:120},
  {key:'state',label:'State (2 letters)',pane:'location',max:2},
  {key:'postal_code',label:'ZIP / postal code',pane:'location',max:20}
 ];
 const inputs={};
 let editDialog=null,editStatus=null,editSave=null,editCancel=null,editTitle=null;
 let editTabs=new Map(),editPanes=new Map(),editorTab='about';
 function editorTabShow(which){
  editorTab=which;
  for(const [id,tab] of editTabs)tab.setAttribute('aria-selected',String(id===which));
  for(const [id,pane] of editPanes)pane.hidden=id!==which;
 }
 function makeEditor(){
  if(editDialog)return;
  editDialog=node('dialog','atk-od-editor');
  editDialog.id='atk-owner-venue-editor';
  editDialog.setAttribute('aria-labelledby','atk-od-editor-heading');
  const heading=node('h2','','Edit Venue Details');heading.id='atk-od-editor-heading';
  editTitle=node('p','atk-od-editor-venue');
  const intro=node('p','atk-od-muted','Update listing information for this verified venue. Publishing and ownership permissions remain with site management.');
  const form=node('form','atk-od-edit-form');
  form.noValidate=true;
  const navigation=node('div','atk-od-editor-tabs');navigation.setAttribute('role','tablist');
  for(const [id,label] of [['about','About'],['contact','Contact'],['location','Location']]){
   const tab=button(label,()=>editorTabShow(id),'atk-od-editor-tab');
   tab.setAttribute('role','tab');navigation.append(tab);editTabs.set(id,tab);
   const pane=node('div','atk-od-editor-pane');
   pane.setAttribute('role','tabpanel');pane.hidden=true;editPanes.set(id,pane);
  }
  form.append(navigation);
  for(const f of editFields){
   const wrap=node('label','atk-od-field');
   wrap.append(node('span','',f.label));
   const input=f.type==='textarea'?node('textarea','atk-od-input'):node('input','atk-od-input');
   if(f.type==='textarea')input.rows=3;
   else input.type=f.type||'text';
   input.maxLength=f.max;input.name=f.key;
   input.autocomplete='off';
   if(f.hint)input.placeholder=f.hint;
   wrap.append(input);
   editPanes.get(f.pane).append(wrap);
   inputs[f.key]=input;
  }
  for(const pane of editPanes.values())form.append(pane);
  editStatus=node('p','atk-od-edit-status');editStatus.setAttribute('role','status');editStatus.setAttribute('aria-live','polite');
  const footer=node('div','atk-od-edit-actions');
  editCancel=button('Cancel',closeEditor,'atk-od-action');
  editSave=node('button','atk-od-action atk-od-action-primary','Save Changes');editSave.type='submit';
  footer.append(editCancel,editSave);form.append(editStatus,footer);
  editDialog.append(heading,editTitle,intro,form);
  editDialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor()});
  form.addEventListener('submit',event=>{event.preventDefault();void saveEditor()});
  document.body.append(editDialog);
  editor=editDialog;
 }
 function openEditor(row){
  if(!row?.venues||!authUser)return;
  makeEditor();editingRow=row;editorBusy=false;editStatus.textContent='';
  editTitle.textContent=row.venues.name;
  for(const f of editFields)inputs[f.key].value=row.venues[f.key]||'';
  editorTabShow('about');editDialog.showModal();
 }
 function closeEditor(){if(editorBusy||!editDialog?.open)return;editDialog.close();editingRow=null}
 async function saveEditor(){
  if(editorBusy||!editingRow||!authUser||!authClient)return;
  const data={};
  for(const f of editFields)data[f.key]=inputs[f.key].value.trim();
  if(data.city.length<2||!/^[A-Za-z]{2}$/.test(data.state)){
   editStatus.textContent='Please enter a city and two-letter state.';
   editorTabShow('location');return;
  }
  if(data.website&&!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(data.website)){
   editStatus.textContent='Enter a website starting with https://, or leave it blank.';
   editorTabShow('contact');return;
  }
  const uid=authUser.id,venueId=editingRow.venue_id,updatedAt=editingRow.venues.updated_at;
  editorBusy=true;editSave.disabled=true;editCancel.disabled=true;
  editStatus.textContent='Saving venue details…';
  try{
   const {data:response,error}=await authClient.rpc('owner_update_venue_details',{
    p_venue_id:venueId,p_details:data,p_expected_updated_at:updatedAt
   });
   if(error)throw error;
   if(response?.ok!==true||response.venue_id!==venueId)throw Error('Save confirmation was not received.');
   if(uid!==authUser?.id){editDialog.close();return}
   editDialog.close();editingRow=null;
   feedbackText='Venue details saved successfully.';
   await refresh();
   if(typeof window.loadLiveVenues==='function'){
    try{await window.loadLiveVenues()}catch(error){console.warn('Public venue list refresh unavailable',error)}
   }
  }catch(error){
   editStatus.textContent='Could not save changes: '+(error.message||'Please try again.');
  }finally{
   editorBusy=false;editSave.disabled=false;editCancel.disabled=false;
  }
 }
 window.atkOwnerDashboardRefresh=refresh;
 const ownerSummary=entry.querySelector('summary');
 ownerSummary?.addEventListener('click',queueRefresh);
 entry.addEventListener('toggle',()=>{if(entry.open)queueRefresh()});
 const previousAuthRefresh=window.authRefresh;
 if(typeof previousAuthRefresh==='function'){
  window.authRefresh=function(){
   const result=previousAuthRefresh.apply(this,arguments);
   queueRefresh();
   return result;
  };
 }
 // The existing claim module calls atkOwnerDashboardRefresh when profile loading completes.
 queueRefresh();
})();