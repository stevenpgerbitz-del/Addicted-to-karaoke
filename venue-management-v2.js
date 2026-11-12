
/* Venue Management v2 (Build 128): mobile-first, non-neon, section-based.
   Uses existing authenticated Supabase client, protected founder actions and legacy edit safety flows. */
(function(){
 'use strict';
 const get=id=>document.getElementById(id);
 const mk=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=value;
  return node;
 };
 const btn=(label,callback,cls)=>{
  const node=mk('button',cls,label);node.type='button';
  node.addEventListener('click',callback);return node;
 };
 const paths={
  search:'M21 21l-4.4-4.4 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  filter:'M4 7h16 M7 12h10 M10 17h4',
  building:'M3 21V7l9-4 9 4v14M7 21v-7h10v7 M3 10h18',
  clipboard:'M9 4h6l1 2h4v16H4V6h4l1-2z M9 14l2 2 4-4',
  flag:'M5 22V4 M5 5c5-3 9 3 15 0v12c-6 3-10-3-15 0',
  image:'M3 4h18v16H3z M7.5 9a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0 M4 18l6-6 3 3 3-4 5 6',
  chevron:'m9 18 6-6-6-6',
  pencil:'M12 20h9 M16 4a2 2 0 0 1 3 3L8 18l-4 1 1-4Z',
  phone:'M22 16.9v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.7 4a2 2 0 0 1-.6 1.7l-2 2a16 16 0 0 0 5.6 5.6l2-2a2 2 0 0 1 1.7-.6l4 .7a2 2 0 0 1 1.5 1.8z',
  music:'M9 18V5l12-3v13 M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0 M21 15a3 2 0 1 1-6 0 3 2 0 0 1 6 0',
  calendar:'M3 5h18v16H3z M3 10h18 M7 2v6 M17 2v6',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 5a4 4 0 0 1 0 8 M19 15a4 4 0 0 1 3 4v2',
  clock:'M12 6v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  mail:'M3 5h18v14H3z M3 6l9 7 9-7',
  plus:'M12 5v14 M5 12h14',
  info:'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  external:'M14 3h7v7 M21 3l-10 10 M20 14v6H4V4h6',
  tag:'M2 12l10 10 10-10V2H12z M16 8h.01'
 };
 function icon(name){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('mv2-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',paths[name]||paths.info);svg.append(p);return svg;
 }
 const original={
  venueOpen:managementVenuesOpen, venueLoad:managementVenuesLoad,
  detailOpen:managementVenueDetailOpen,detailBack:managementVenueDetailBack,
  statusSave:managementVenueStatusSave,scheduleSave:managementScheduleSave,
  fieldSave:managementVenueFieldSave,amenitiesSave:managementAmenitiesSave,
  descriptionSave:managementVenueDescriptionSave,identitySave:managementVenueIdentitySave
 };
 let installed=false,browseAll=false,dashboardSerial=0,contactSerial=0,overlayBusy=false;
 let overlay,overlayBody,overlayHeading,overlayFeedback,overlaySave,overlayCancel,overlaySaveHandler,contactCache=[];
 const defaultGenres=['All Genres','Pop','Rock','Country','R&B','Hip-Hop','Classic Rock','80s & 90s','Indie','Jazz','Blues','Latin'];
 const statusLabels={submitted:'Submitted',under_review:'Under Review',published:'Published',archived:'Archived'};
 const statusLabel=x=>statusLabels[x]||'Submitted';
 function setText(id,t){const node=get(id);if(node)node.textContent=t??''}
 function row(label,value){
  const r=mk('div','mv2-detail-row');
  r.append(mk('dt','',label),mk('dd','',value==null||value===''?'Not provided':String(value)));
  return r;
 }
 function detailGroup(title,ico,id,edit){
  const card=mk('section','mv2-detail-section');card.id='mv2-group-'+id;
  const header=mk('div','mv2-section-heading');
  const titleWrap=mk('div','mv2-heading-name');titleWrap.append(icon(ico),mk('h3','',title));
  const action=btn('Edit',edit,'mv2-section-edit');action.prepend(icon('pencil'));
  header.append(titleWrap,action);
  const description=mk('dl','mv2-detail-values');description.id='mv2-values-'+id;
  card.append(header,description);return card;
 }
 function makeOverlay(){
  const dialog=get('management-dialog');
  overlay=mk('div','mv2-overlay');overlay.id='mv2-overlay';overlay.hidden=true;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','mv2-overlay-title');
  const content=mk('div','mv2-overlay-panel');
  overlayHeading=mk('h2','');overlayHeading.id='mv2-overlay-title';
  overlayBody=mk('div','mv2-overlay-body');
  overlayFeedback=mk('p','mv2-overlay-feedback');overlayFeedback.setAttribute('role','status');
  const actions=mk('div','mv2-overlay-actions');
  overlayCancel=btn('Cancel',()=>closeOverlay(),'mv2-button-secondary');
  overlaySave=btn('Save Changes',async ()=>{
   if(overlayBusy||!overlaySaveHandler)return;
   overlayBusy=true;overlaySave.disabled=true;overlayFeedback.textContent='Saving changes…';
   try{await overlaySaveHandler();overlayBusy=false;closeOverlay();}
   catch(error){overlayFeedback.textContent=error.message||'Unable to save changes.'}
   finally{overlayBusy=false;overlaySave.disabled=false}
  },'mv2-button-red');
  actions.append(overlayCancel,overlaySave);
  content.append(overlayHeading,overlayBody,overlayFeedback,actions);
  overlay.append(content);dialog.append(overlay);
  dialog.addEventListener('cancel',event=>{
   if(!overlay.hidden){event.preventDefault();if(!overlayBusy)closeOverlay()}
  });
 }
 function openOverlay(title,onSave){
  overlayHeading.textContent=title;overlayBody.replaceChildren();overlayFeedback.textContent='';
  overlaySaveHandler=onSave||null;overlaySave.hidden=!onSave;overlayCancel.textContent=onSave?'Cancel':'Close';
  overlay.hidden=false;overlay.scrollTop=0;
 }
 function closeOverlay(){if(overlayBusy)return;overlay.hidden=true;overlayBody.replaceChildren();overlaySaveHandler=null}
 function inputField(label,value,max=300,type='text'){
  const wrap=mk('label','mv2-field');wrap.append(mk('span','',label));
  const input=mk('input','');input.type=type;input.maxLength=max;input.value=value||'';
  wrap.append(input);overlayBody.append(wrap);return input;
 }
 function textareaField(label,value){
  const wrap=mk('label','mv2-field');wrap.append(mk('span','',label));
  const input=mk('textarea','');input.maxLength=4000;input.rows=4;input.value=value||'';
  wrap.append(input);overlayBody.append(wrap);return input;
 }
 function chosenTiles(label,values,choices,allSpecial=false){
  const section=mk('div','mv2-tile-section');section.append(mk('h3','',label));
  const grid=mk('div','mv2-choice-grid');const selected=new Set(values||[]);
  const options=[...new Set([...choices,...selected])];
  for(const choice of options){
   const tile=btn(choice,()=>{
    if(allSpecial&&choice==='All Genres'){
     const pressed=tile.getAttribute('aria-pressed')!=='true';
     [...grid.children].forEach(x=>x.setAttribute('aria-pressed','false'));
     tile.setAttribute('aria-pressed',String(pressed));return;
    }
    if(allSpecial){const all=[...grid.children].find(x=>x.textContent==='All Genres');if(all)all.setAttribute('aria-pressed','false')}
    tile.setAttribute('aria-pressed',String(tile.getAttribute('aria-pressed')!=='true'));
   },'mv2-choice');
   tile.setAttribute('aria-pressed',String(selected.has(choice)));grid.append(tile);
  }
  section.append(grid);overlayBody.append(section);
  return ()=>[...grid.children].filter(x=>x.getAttribute('aria-pressed')==='true').map(x=>x.textContent);
 }
 async function updateVenue(payload){
  const venue=managementSelectedVenue;
  if(!authClient||!authUser||!venue)throw Error('Please reopen this venue and sign in.');
  const {data,error}=await authClient.from('venues').update(payload).eq('id',venue.id).select('*').single();
  if(error)throw error;
  if(!data)throw Error('No venue changes were saved.');
  Object.assign(managementSelectedVenue,data);
  if(typeof sampleVenues!=='undefined'&&Array.isArray(sampleVenues)){
   const publicVenue=sampleVenues.find(x=>x.databaseId===venue.id);
   if(publicVenue){
    const mapped={name:data.name,city:data.city,state:data.state,address:data.address_line1||'Address not available',
     tagline:data.tagline,description:data.description,genres:data.genres,
     genre:data.genres?.[0]||'Other',publication_status:data.publication_status,
     karaoke_schedule:data.karaoke_schedule||[],phone:data.phone,website:data.website,amenities:data.amenities};
    Object.assign(publicVenue,mapped);
   }
  }
  managementVenueFieldRefresh();
  managementAmenitiesSummary();
  managementScheduleSummary();
  setText('mvd-name',data.name);setText('mvd-location',[data.city,data.state].filter(Boolean).join(', '));
  setText('mvd-description',data.description);managementVenueStatusDisplay();
  refreshDetail();
  setText('mvd-feedback','Venue changes saved successfully.');
  return data;
 }
 function editGroup(group){
  const v=managementSelectedVenue;if(!v)return;
  if(group==='karaoke'){managementScheduleEdit();return}
  if(group==='basics'){
   openOverlay('Edit Basics',async ()=>{
    const name=fields.name.value.trim(),city=fields.city.value.trim(),state=fields.state.value.trim().toUpperCase();
    if(!name||!city||!state)throw Error('Venue name, city, and state are required.');
    await updateVenue({name,tagline:fields.tagline.value.trim(),
     address_line1:fields.address.value.trim(),city,state,postal_code:fields.zip.value.trim()});
   });
   const fields={
    name:inputField('Venue name',v.name,120),
    tagline:inputField('Tagline',v.tagline,200),
    address:inputField('Street address',v.address_line1,220),
    city:inputField('City',v.city,120),
    state:inputField('State',v.state,40),
    zip:inputField('ZIP / postal code',v.postal_code,20)
   };
   const group=mk('div','mv2-status-change');
   group.append(mk('span','','Publication Status: '+statusLabel(v.publication_status)));
   group.append(btn('Change status',()=>{
    closeOverlay();managementVenueStatusEdit();
   },'mv2-text-action'));
   overlayBody.append(group);
   if(typeof atkAddressAttach==='function'){
    try{atkAddressAttach(fields.address,place=>{
     fields.address.value=place.address||fields.address.value;
     fields.city.value=place.city||fields.city.value;
     fields.state.value=place.state||fields.state.value;
     fields.zip.value=place.postal||fields.zip.value;
    })}catch(e){console.warn('Address suggestions unavailable',e)}
   }
  }else if(group==='contact'){
   openOverlay('Edit Venue Contact',async ()=>{
    const website=fields.website.value.trim(),phone=fields.phone.value.trim();
    let url=website;
    if(url&&!/^https?:\/\//i.test(url))url='https://'+url;
    if(url){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw Error('bad protocol')}
      catch(e){throw Error('Enter a valid website URL.')}}
    await updateVenue({phone,website:url});
   });
   const fields={
    phone:inputField('Venue phone number',v.phone,40,'tel'),
    website:inputField('Venue website',v.website,400,'url')
   };
  }else if(group==='profile'){
   openOverlay('Edit Venue Profile',async ()=>{
    const genres=getGenres(),amenities=getAmenities();
    await updateVenue({description:description.value.trim(),genres,amenities});
   });
   const description=textareaField('About This Venue',v.description);
   const getGenres=chosenTiles('Music genres',v.genres,defaultGenres,true);
   const amenityChoices=(typeof managementAmenityChoices!=='undefined')
    ?managementAmenityChoices.map(x=>x[0]):[];
   const getAmenities=chosenTiles('Amenities',v.amenities,amenityChoices);
  }
 }
 function formatTime(s){
  if(!s)return '';
  const match=String(s).match(/^(\d{1,2}):(\d{2})/);
  if(!match)return String(s);
  const h=Number(match[1]);return String(h%12||12)+':'+match[2]+' '+(h<12?'AM':'PM');
 }
 function refreshDetail(){
  const v=managementSelectedVenue;if(!v)return;
  setText('mv2-hero-name',v.name);
  setText('mv2-hero-location',[v.city,v.state].filter(Boolean).join(', '));
  setText('mv2-hero-status',statusLabel(v.publication_status));
  const pill=get('mv2-hero-status');pill.dataset.status=v.publication_status||'submitted';
  const basics=get('mv2-values-basics');basics.replaceChildren(
   row('Venue Name',v.name),row('Publication Status',statusLabel(v.publication_status)),
   row('Address',[v.address_line1,v.city,v.state,v.postal_code].filter(Boolean).join(', ')),
   row('Tagline',v.tagline));
  const contact=get('mv2-values-contact');contact.replaceChildren(
   row('Phone',v.phone),row('Website',v.website));
  const profile=get('mv2-values-profile');
  const genres=(v.genres||[]).join(' · ');
  const amenities=(v.amenities||[]).join(' · ');
  profile.replaceChildren(row('Genres',genres),
   row('About This Venue',v.description),row('Amenities',amenities));
  const schedule=Array.isArray(v.karaoke_schedule)?v.karaoke_schedule:[];
  const lines=schedule.map(x=>(x.day||'Day')+' · '+formatTime(x.start)+'–'+formatTime(x.end));
  get('mv2-values-karaoke').replaceChildren(
   row('Karaoke Days & Times',lines.length?lines.join(' | '):'No schedule posted'));
 }
 async function loadPublicLink(id){
  const {data,error}=await authClient.from('venues').select('slug').eq('id',id).single();
  if(error||managementSelectedVenue?.id!==id)return;
  const button=get('mv2-public-link');button.hidden=!data?.slug||managementSelectedVenue?.publication_status!=='published';
  if(!button.hidden)button.onclick=()=>{
   window.open(location.origin+location.pathname+'#venue/'+encodeURIComponent(data.slug),'_blank','noopener');
  };
 }
 async function loadContacts(id){
  const serial=++contactSerial,root=get('mv2-contact-list');root.textContent='Loading contacts…';
  try{
   const {data,error}=await authClient.rpc('founder_venue_contacts',{p_venue_id:id});
   if(error)throw error;
   if(serial!==contactSerial||managementSelectedVenue?.id!==id)return;
   contactCache=Array.isArray(data)?data:[];
   root.replaceChildren();
   const owners=contactCache.filter(c=>c.contact_kind==='owner'),hosts=contactCache.filter(c=>c.contact_kind==='kj');
   if(!owners.length)root.append(mk('p','mv2-empty-contact','No verified venue owner is linked to this venue.'));
   for(const contact of owners)root.append(contactButton(contact));
   if(!hosts.length)root.append(mk('p','mv2-empty-contact','No registered KJ is linked to this venue yet.'));
   for(const contact of hosts)root.append(contactButton(contact));
  }catch(error){
   if(serial!==contactSerial)return;
   root.textContent='Contact details are unavailable: '+(error.message||'Please try again.');
  }
 }
 function contactAvatar(contact){
  const base=mk('span','mv2-contact-avatar');
  if(contact.avatar_path){
   const photo=mk('img','');photo.alt='';
   const address=authClient.storage.from('member-avatars').getPublicUrl(contact.avatar_path);
   photo.src=address.data?.publicUrl||'';
   photo.onerror=()=>{photo.remove();base.textContent=(contact.stage_name||'?').charAt(0).toUpperCase()};
   base.append(photo);
  }else base.textContent=(contact.stage_name||'?').charAt(0).toUpperCase();
  return base;
 }
 function contactButton(c){
  const card=btn('',()=>openContact(c),'mv2-contact-card');
  const info=mk('span','mv2-contact-info');
  info.append(mk('small','',c.contact_kind==='owner'?'Verified Venue Owner':'KJ / Host'),
   mk('strong','',c.stage_name||'Registered member'));
  if(c.member_number!=null)info.append(mk('small','','Member #'+String(c.member_number).padStart(6,'0')));
  card.append(contactAvatar(c),info,icon('chevron'));return card;
 }
 function openContact(c){
  openOverlay('Account Contact',null);
  const head=mk('div','mv2-contact-popup-head');
  head.append(contactAvatar(c));
  const identity=mk('div','');
  identity.append(mk('h3','',c.stage_name||'Registered member'),
    mk('p','',c.contact_kind==='owner'?'Verified Venue Owner':'KJ / Host'));
  head.append(identity);overlayBody.append(head);
  const details=mk('dl','mv2-contact-metadata');
  if(c.member_number!=null)details.append(row('Member #',String(c.member_number).padStart(6,'0')));
  if(c.joined_at){const d=new Date(c.joined_at);
   if(!Number.isNaN(d.getTime()))details.append(row('Member since',d.toLocaleDateString(undefined,{month:'long',year:'numeric'})))}
  if(c.email)details.append(row('Email',c.email));
  if(c.phone)details.append(row('Phone',c.phone));
  if(c.bio)details.append(row('About',c.bio));
  overlayBody.append(details);
  const actions=mk('div','mv2-contact-actions');
  if(c.email){const link=mk('a','mv2-link-button','Email');link.href='mailto:'+encodeURIComponent(c.email);
   link.prepend(icon('mail'));actions.append(link)}
  if(c.phone){const link=mk('a','mv2-link-button','Text');link.href='sms:'+String(c.phone).replace(/[^\d+]/g,'');
   link.prepend(icon('phone'));actions.append(link)}
  if(actions.childElementCount)overlayBody.append(actions);
  else overlayBody.append(mk('p','mv2-empty-contact','No contact method is available on this account.'));
  overlayBody.append(mk('p','mv2-private-note','Contact information is visible only to authorized management accounts.'));
 }
 function createVenue(){
  openOverlay('Add Venue',async ()=>{
   const name=fields.name.value.trim(),city=fields.city.value.trim(),state=fields.state.value.trim().toUpperCase();
   if(!name||!city||!state)throw Error('Enter a venue name, city, and state.');
   if(!authClient||!authUser)throw Error('Sign in to add a venue.');
   const slugBase=name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,55)||'venue';
   const slug=slugBase+'-'+crypto.randomUUID().slice(0,8);
   const payload={name,slug,city,state,address_line1:fields.address.value.trim(),
    postal_code:fields.zip.value.trim(),publication_status:'submitted',published:false};
   const {data,error}=await authClient.from('venues').insert(payload).select('id').single();
   if(error)throw error;
   if(!data?.id)throw Error('Could not confirm the new venue.');
   browseAll=true;
   await original.detailOpen(data.id);
   if(managementSelectedVenue?.id===data.id){refreshDetail();loadContacts(data.id);loadPublicLink(data.id)}
   refreshDashboard();
  });
  const fields={
   name:inputField('Venue name',null,120),
   address:inputField('Street address',null,220),
   city:inputField('City',null,120),
   state:inputField('State','IA',40),
   zip:inputField('ZIP / postal code',null,20)
  };
  const p=mk('p','mv2-private-note','New venues are saved as Submitted and remain hidden until approved.');
  overlayBody.append(p);
  if(typeof atkAddressAttach==='function'){
   try{atkAddressAttach(fields.address,place=>{
    fields.address.value=place.address||fields.address.value;
    fields.city.value=place.city||fields.city.value;
    fields.state.value=place.state||fields.state.value;
    fields.zip.value=place.postal||fields.zip.value;
   })}catch(e){}
  }
 }
 function attentionEntry(label,description,count,ico,filter){
  const b=btn('',()=>{
   if(typeof approvalCenterOpen!=='function')return;
   approvalCenterOpen();
   const select=get('atk-approval-filter');if(select)select.value=filter;
  },'mv2-attention-row');
  const left=mk('span','mv2-attention-icon');left.append(icon(ico));
  const info=mk('span','mv2-attention-text');info.append(mk('strong','',label),mk('small','',description));
  const countBadge=mk('span','mv2-attention-count',String(count));
  b.append(left,info,countBadge,icon('chevron'));return b;
 }
 function recentVenue(v){
  const card=btn('',()=>managementVenueDetailOpen(v.id),'mv2-recent-row');
  const info=mk('span','mv2-recent-text');info.append(mk('strong','',v.name),
   mk('small','',[v.city,v.state].filter(Boolean).join(', ')));
  const pill=mk('span','mv2-status',statusLabel(v.publication_status));
  pill.dataset.status=v.publication_status||'submitted';
  card.append(info,pill,icon('chevron'));return card;
 }
 async function refreshDashboard(){
  const current=++dashboardSerial,summary=get('mv2-needs-list');if(!summary||!authClient)return;
  setText('mv2-attention-total','Checking…');setText('mv2-total-venues','');
  try{
   const {data,error}=await authClient.rpc('founder_venue_dashboard');
   if(error)throw error;
   if(current!==dashboardSerial)return;
   const items=[
    {key:'pending_submissions',name:'Venue Submissions',desc:'New listings awaiting review.',icon:'clipboard',filter:'venues'},
    {key:'pending_reports',name:'Reported Venues',desc:'Listings with reported issues.',icon:'flag',filter:'reports'},
    {key:'pending_photos',name:'Photo Approvals',desc:'Submitted photos awaiting review.',icon:'image',filter:'photos'}
   ];
   const count=items.reduce((n,i)=>n+(Number(data[i.key])||0),0);
   setText('mv2-attention-total',count+' item'+(count===1?'':'s'));
   setText('mv2-total-venues',(Number(data.total_venues)||0).toLocaleString()+' total venue'+(Number(data.total_venues)===1?'':'s'));
   summary.replaceChildren();
   for(const item of items){const num=Number(data[item.key])||0;
    if(num>0)summary.append(attentionEntry(item.name,item.desc,num,item.icon,item.filter))}
   if(!summary.childElementCount)summary.append(mk('p','mv2-empty-attention','All caught up — no venue items need your attention.'));
   const recent=get('mv2-recent-list');recent.replaceChildren();
   const rows=Array.isArray(data.recent_venues)?data.recent_venues:[];
   if(!rows.length)recent.append(mk('p','mv2-directory-empty','No venues have been added yet.'));
   else rows.forEach(v=>recent.append(recentVenue(v)));
  }catch(error){
   if(current!==dashboardSerial)return;
   setText('mv2-attention-total','Unavailable');
   summary.textContent='Unable to load venue updates: '+(error.message||'Please try again.');
  }
 }
 function directoryActive(){
  return browseAll||get('mv-search').value.trim()!==''||
   get('mv-state').value!=='all'||get('mv-status').value!=='all';
 }
 function browseDirectory(){
  browseAll=true;
  const input=get('mv-search');input.focus();
  managementVenuePage=1;managementVenuesLoad();
 }
 function buildDirectory(){
  const section=get('management-venues');section.classList.add('mv2-list-screen');
  const head=section.querySelector('.management-user-head');head.classList.add('mv2-header');
  const heading=mk('div','mv2-header-titles');
  heading.append(mk('h2','','Venue Management'),mk('p','','Manage listings, ownership, and details.'));
  const add=btn('Add Venue',createVenue,'mv2-add-button');add.prepend(icon('plus'));
  head.replaceChildren(heading,add);
  const search=mk('div','mv2-search-wrap');
  const searchLabel=get('mv-search').closest('label');
  searchLabel.classList.add('mv2-search-label');searchLabel.insertBefore(icon('search'),get('mv-search'));
  search.append(searchLabel);
  const toolbar=mk('div','mv2-toolbar');
  const filter=btn('Filters',()=>{
   const panel=get('mv2-filters-panel');panel.hidden=!panel.hidden;
   filter.setAttribute('aria-expanded',String(!panel.hidden));
  },'mv2-filter-toggle');filter.prepend(icon('filter'));filter.setAttribute('aria-expanded','false');
  const sort=get('mv-sort').closest('label');sort.classList.add('mv2-toolbar-select');
  const status=get('mv-status').closest('label');status.classList.add('mv2-toolbar-select');
  toolbar.append(filter,sort,status);
  const filterPanel=mk('div','mv2-filters-panel');filterPanel.id='mv2-filters-panel';filterPanel.hidden=true;
  filterPanel.append(get('mv-state').closest('label'),btn('Clear filters',()=>{
   get('mv-state').value='all';get('mv-status').value='all';get('mv-sort').value='az';browseAll=false;
   filterPanel.hidden=true;filter.setAttribute('aria-expanded','false');managementVenuesChanged();
  },'mv2-clear-filters'));
  section.querySelector('.management-filters')?.remove();
  const attention=mk('section','mv2-attention');
  attention.id='mv2-attention-section';
  const attentionHead=mk('div','mv2-block-heading');
  attentionHead.append(mk('h3','','Needs Attention'),mk('span','mv2-section-count','Checking…'));
  attentionHead.lastChild.id='mv2-attention-total';
  const list=mk('div','mv2-attention-list');list.id='mv2-needs-list';
  attention.append(attentionHead,list);
  const directory=mk('section','mv2-directory');
  const dirHead=mk('div','mv2-block-heading');
  dirHead.append(mk('h3','','Venue Directory'),mk('span','mv2-section-count',''));
  dirHead.lastChild.id='mv2-total-venues';
  const prompt=mk('div','mv2-directory-prompt');prompt.id='mv2-directory-prompt';
  prompt.append(icon('info'),mk('span','','Search above to find any venue, or browse the full directory.'));
  prompt.append(btn('Browse all venues',browseDirectory,'mv2-browse-button'));
  const recent=mk('div','mv2-recent');recent.id='mv2-recent-section';
  const recentHead=mk('div','mv2-recent-heading');
  recentHead.append(mk('h3','','Recently Updated'),btn('View all',browseDirectory,'mv2-text-action'));
  const recentList=mk('div','mv2-recent-list');recentList.id='mv2-recent-list';
  recent.append(recentHead,recentList);
  const resultStatus=get('mv-status-text');resultStatus.classList.add('mv2-results-status');
  resultStatus.hidden=true;
  const results=get('mv-results');results.classList.add('mv2-directory-results');results.hidden=true;
  const pages=get('mv-page').closest('.management-pages');pages.classList.add('mv2-pagination');pages.hidden=true;
  directory.append(dirHead,prompt,recent,resultStatus,results,pages);
  head.after(search,toolbar,filterPanel,attention,directory);
  get('mv-sort').addEventListener('change',()=>{browseAll=true});
  get('mv-status').addEventListener('change',()=>{browseAll=true});
  get('mv-state').addEventListener('change',()=>{browseAll=true});
 }
 function buildDetails(){
  const section=get('management-venue-details');section.classList.add('mv2-details-screen');
  const top=mk('div','mv2-venue-hero');
  const info=mk('div','mv2-hero-info');
  info.append(mk('strong','mv2-venue-name',''));info.lastChild.id='mv2-hero-name';
  info.append(mk('span','mv2-venue-location',''));info.lastChild.id='mv2-hero-location';
  const right=mk('div','mv2-hero-right');
  const pill=mk('span','mv2-status','');pill.id='mv2-hero-status';
  const pageLink=btn('View Public Page',()=>{},'mv2-public-link');pageLink.id='mv2-public-link';pageLink.hidden=true;
  pageLink.prepend(icon('external'));right.append(pill,pageLink);
  top.append(info,right);
  const groups=mk('div','mv2-detail-groups');
  groups.append(
   detailGroup('Basics','building','basics',()=>editGroup('basics')),
   detailGroup('Contact','phone','contact',()=>editGroup('contact')),
   detailGroup('Venue Profile','tag','profile',()=>editGroup('profile')),
   detailGroup('Karaoke Details','calendar','karaoke',()=>editGroup('karaoke'))
  );
  const contacts=mk('section','mv2-detail-section mv2-contacts-section');
  const header=mk('div','mv2-section-heading');
  const title=mk('div','mv2-heading-name');title.append(icon('users'),mk('h3','','Venue Contacts'));
  header.append(title);
  const note=mk('p','mv2-contact-note','Verified owners and associated registered KJs. Tap a name to view private contact information.');
  const list=mk('div','mv2-contacts-list');list.id='mv2-contact-list';
  contacts.append(header,note,list);
  const advanced=mk('details','mv2-advanced-actions');
  const summary=mk('summary','','Advanced actions');advanced.append(summary,get('mvd-delete-entry'));
  const frame=mk('div','mv2-detail-frame');frame.append(top,groups,contacts,advanced);
  section.querySelector('.management-user-head').after(frame);
 }
 function install(){
  if(installed)return;
  installed=true;
  buildDirectory();buildDetails();makeOverlay();
 }
 managementVenuesOpen=function(){
  install();browseAll=false;
  get('mv-search').value='';get('mv-state').value='all';get('mv-status').value='all';get('mv-sort').value='az';
  const filters=get('mv2-filters-panel');filters.hidden=true;
  sectionGuard();original.venueOpen();refreshDashboard();
 };
 function sectionGuard(){
  const filter=get('management-venues').querySelector('.mv2-filter-toggle');if(filter)filter.setAttribute('aria-expanded','false');
 }
 managementVenuesLoad=async function(){
  if(!installed)return original.venueLoad();
  const active=directoryActive();
  get('mv2-attention-section').hidden=active;
  get('mv2-directory-prompt').hidden=active;
  get('mv2-recent-section').hidden=active;
  get('mv-status-text').hidden=!active;
  get('mv-results').hidden=!active;
  get('mv-page').closest('.management-pages').hidden=!active;
  if(!active){
   ++managementVenueRequest;managementVenuePage=1;managementVenueTotal=0;
   get('mv-results').replaceChildren();get('mv-status-text').textContent='';
   return;
  }
  await original.venueLoad();
  get('mv-page').closest('.management-pages').hidden=managementVenueTotal<=20;
 };
 managementVenueDetailOpen=async function(id){
  install();
  await original.detailOpen(id);
  if(managementSelectedVenue?.id!==id||get('management-venue-details').hidden)return;
  refreshDetail();get('mv2-public-link').hidden=true;loadContacts(id);loadPublicLink(id);
 };
 managementVenueDetailBack=function(){
  ++contactSerial;if(overlay&&!overlay.hidden&&!overlayBusy)closeOverlay();
  original.detailBack();refreshDashboard();
 };
 for(const method of ['statusSave','scheduleSave','fieldSave','amenitiesSave','descriptionSave','identitySave']){
  const key={statusSave:'managementVenueStatusSave',scheduleSave:'managementScheduleSave',fieldSave:'managementVenueFieldSave',
   amenitiesSave:'managementAmenitiesSave',descriptionSave:'managementVenueDescriptionSave',identitySave:'managementVenueIdentitySave'}[method];
  const previous=original[method];
  window[key]=async function(){
   const result=await previous.apply(this,arguments);
   if(installed&&managementSelectedVenue&&!get('management-venue-details').hidden){
    refreshDetail();
    if(method==='statusSave')loadPublicLink(managementSelectedVenue.id);
   }
   return result;
  };
 }
 // Existing templates are loaded before this script. Initialize without replacing stored venue data.
 install();
})();
