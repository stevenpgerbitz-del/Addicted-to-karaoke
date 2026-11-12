/* Build 131 — Venue Photos & Gallery.
   Extends the approved venue cards; all photo moderation is enforced by Supabase. */
(function(){
 'use strict';
 const BUCKET='venue-community-photos';
 const get=id=>document.getElementById(id);
 const el=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 const button=(label,click,cls)=>{
  const node=el('button',cls,label);node.type='button';
  if(click)node.addEventListener('click',click);
  return node;
 };
 const icon=(name)=>{
  const paths={
   photos:'M3 4h18v16H3z M3 17l6-6 4 4 3-4 5 5 M8 9h.01',
   upload:'M12 16V3 M7 8l5-5 5 5 M4 17v4h16v-4',
   star:'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-5-4.9 6.9-1z',
   chevron:'M9 18l6-6-6-6',
   close:'M5 5l14 14 M19 5L5 19'
  };
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  svg.classList.add('mv3-icon');
  svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('stroke-linecap','round');
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',paths[name]||paths.photos);svg.append(p);return svg;
 };
 const safeStatus={pending:'Pending',approved:'Approved',rejected:'Rejected',removed:'Removed'};
 let photos=[], currentVenueId=null, selectedPhoto=null, busy=false, requestSerial=0, galleryOpen=false;
 let overlay, overlayScroll, grid, preview, notice, footerClose, uploadButton, fileInput, filter, sortBy, sectionImg;
 let previousFocus=null, dialogCancelListenerInstalled=false;
 const imageFallback=new Map();
 function isFounderView(id){
  return !!authClient&&!!authUser&&managementSelectedVenue?.id===id&&
   !get('management-venue-details').hidden;
 }
 function updateNotice(message,error=false){
  if(!notice)return;
  notice.textContent=message||'';
  notice.dataset.error=String(error);
  notice.hidden=!message;
 }
 function fileFormat(file){return ['image/jpeg','image/png','image/webp'].includes(file?.type)}
 function photoCount(label,count){return count+' '+label+(count===1?'':'s')}
 function formatPhotoDate(value){
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
 }
 function photoDisplayName(photo){
  const caption=(photo?.caption||'').trim();
  return caption || 'Venue photo';
 }
 function meta(){
  const approved=photos.filter(x=>x.moderation_status==='approved'&&x.published);
  const pending=photos.filter(x=>x.moderation_status==='pending');
  const cover=approved.find(x=>x.is_cover)||null;
  return {approved,pending,cover};
 }
 async function signedUrlForPhoto(photo){
  if(!photo?.storage_path)return '';
  if(photo.signedUrl)return photo.signedUrl;
  const {data,error}=await authClient.storage.from(BUCKET).createSignedUrl(photo.storage_path,1800);
  if(error)throw error;
  photo.signedUrl=data?.signedUrl||'';
  return photo.signedUrl;
 }
 async function loadPhotoList(id){
  const {data,error}=await authClient.from('venue_photos')
   .select('id,venue_id,storage_path,caption,published,moderation_status,is_cover,created_at,uploader_user_id')
   .eq('venue_id',id).order('created_at',{ascending:false}).limit(150);
  if(error)throw error;
  return data||[];
 }
 function createSummary(){
  const frame=get('management-venue-details')?.querySelector('.mv2-detail-frame');
  if(!frame||get('mv3-photo-section'))return;
  const section=el('section','mv2-detail-section mv3-photo-summary');
  section.id='mv3-photo-section';
  const heading=el('div','mv2-section-heading');
  const title=el('div','mv2-heading-name');
  title.append(icon('photos'),el('h3','','Photos & Gallery'));
  const count=el('span','mv3-count','0 Photos');count.id='mv3-photo-count';
  heading.append(title,count);
  const summary=el('div','mv3-summary-body');
  const thumb=el('div','mv3-summary-thumbnail');thumb.id='mv3-summary-thumbnail';
  sectionImg=el('img','','');sectionImg.alt='Default venue photo';sectionImg.hidden=true;
  thumb.append(sectionImg,icon('photos'));
  const text=el('div','mv3-summary-info');
  const galleryTotal=el('p','','0 approved photos');galleryTotal.id='mv3-approved-count';
  const pendingTotal=el('p','','No photos pending approval');pendingTotal.id='mv3-pending-count';
  const coverMessage=el('p','mv3-cover-hint','No default photo selected');coverMessage.id='mv3-cover-hint';
  text.append(galleryTotal,pendingTotal,coverMessage);
  summary.append(thumb,text);
  const manage=button('Manage Photos',openGallery,'mv3-open-button');
  manage.append(icon('chevron'));manage.id='mv3-open-gallery';
  section.append(heading,summary,manage);
  frame.insertBefore(section,frame.querySelector('.mv2-advanced-actions'));
 }
 function paintSummary(){
  const summary=get('mv3-photo-section');
  if(!summary||!currentVenueId||managementSelectedVenue?.id!==currentVenueId)return;
  const {approved,pending,cover}=meta();
  get('mv3-photo-count').textContent=photoCount('Photo',approved.length);
  get('mv3-approved-count').textContent=photoCount('approved photo',approved.length);
  get('mv3-pending-count').textContent=pending.length?photoCount('pending review',pending.length):'No photos pending approval';
  get('mv3-cover-hint').textContent=cover?'Default photo selected':'No default photo selected';
  sectionImg.hidden=true;
  const thumb=get('mv3-summary-thumbnail');thumb.classList.remove('mv3-has-cover');
  if(!cover)return;
  signedUrlForPhoto(cover).then(url=>{
   if(!url||managementSelectedVenue?.id!==currentVenueId||!cover.is_cover)return;
   sectionImg.src=url;sectionImg.alt='Default photo for '+managementSelectedVenue.name;
   sectionImg.hidden=false;thumb.classList.add('mv3-has-cover');
  }).catch(()=>{get('mv3-cover-hint').textContent='Default image unavailable'});
 }
 async function refreshSummary(id){
  const serial=++requestSerial;currentVenueId=id;photos=[];
  createSummary();
  if(get('mv3-photo-count'))get('mv3-photo-count').textContent='Loading…';
  try{
   const rows=await loadPhotoList(id);
   if(serial!==requestSerial||!isFounderView(id))return;
   photos=rows;paintSummary();
  }catch(error){
   if(serial!==requestSerial)return;
   if(get('mv3-photo-count'))get('mv3-photo-count').textContent='Unavailable';
   if(get('mv3-cover-hint'))get('mv3-cover-hint').textContent=error.message||'Could not load photos';
  }
 }
 function createGallery(){
  if(overlay)return;
  const dialog=get('management-dialog');
  overlay=el('div','mv3-gallery-overlay');overlay.id='mv3-gallery-overlay';overlay.hidden=true;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','mv3-gallery-heading');
  const shell=el('div','mv3-gallery-shell');
  const header=el('div','mv3-gallery-header');
  const title=el('h2','','Manage Venue Photos');title.id='mv3-gallery-heading';
  const subtitle=el('p','','');subtitle.id='mv3-gallery-subtitle';
  header.append(title,subtitle);
  overlayScroll=el('div','mv3-gallery-scroll');
  const hint=el('p','mv3-gallery-hint',
   'Tap a photo to enlarge it, set its default status, or review submissions.');
  const upload=el('div','mv3-upload-zone');
  uploadButton=button('Upload Photos',()=>fileInput.click(),'mv3-upload-button');
  uploadButton.prepend(icon('upload'));
  const label=el('span','','JPEG, PNG or WebP · up to 5 MB each');
  fileInput=el('input','mv3-file-input');fileInput.type='file';
  fileInput.accept='image/jpeg,image/png,image/webp';fileInput.multiple=true;fileInput.hidden=true;
  fileInput.setAttribute('aria-label','Choose photos to upload');
  fileInput.addEventListener('change',uploadFiles);
  upload.append(uploadButton,label,fileInput);
  const row=el('div','mv3-gallery-toolbar');
  const photoCountLabel=el('h3','','Venue Photos');photoCountLabel.id='mv3-grid-heading';
  filter=el('select','mv3-gallery-filter');
  filter.setAttribute('aria-label','Filter venue photos');
  for(const [value,label] of [['all','All statuses'],['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['removed','Removed']]){
   const option=el('option','',label);option.value=value;filter.append(option);
  }
  filter.addEventListener('change',paintGrid);
  sortBy=el('select','mv3-gallery-sort');
  sortBy.setAttribute('aria-label','Sort venue photos');
  for(const [value,label] of [['newest','Newest first'],['oldest','Oldest first']]){
   const option=el('option','',label);option.value=value;sortBy.append(option);
  }
  sortBy.addEventListener('change',paintGrid);
  row.append(photoCountLabel,filter,sortBy);
  grid=el('div','mv3-gallery-grid');grid.id='mv3-gallery-grid';
  preview=el('section','mv3-photo-viewer');preview.id='mv3-photo-viewer';preview.hidden=true;
  notice=el('p','mv3-gallery-notice');notice.id='mv3-gallery-notice';notice.setAttribute('role','status');
  notice.setAttribute('aria-live','polite');notice.hidden=true;
  overlayScroll.append(hint,upload,row,grid,preview,notice);
  const footer=el('div','mv3-gallery-footer');
  footerClose=button('Close',closeGallery,'mv3-red-button');footer.append(footerClose);
  shell.append(header,overlayScroll,footer);overlay.append(shell);dialog.append(overlay);
  if(!dialogCancelListenerInstalled){
   dialogCancelListenerInstalled=true;
   dialog.addEventListener('cancel',event=>{
    if(!overlay.hidden){
     event.preventDefault();
     if(!busy){if(selectedPhoto)clearViewer();else closeGallery()}
    }
   },true);
  }
 }
 async function openGallery(){
  const id=managementSelectedVenue?.id;
  if(!isFounderView(id))return;
  createGallery();
  currentVenueId=id;
  previousFocus=document.activeElement;
  overlay.hidden=false;galleryOpen=true;overlayScroll.scrollTop=0;
  get('mv3-gallery-subtitle').textContent=
   managementSelectedVenue.name+' · '+[managementSelectedVenue.city,managementSelectedVenue.state].filter(Boolean).join(', ');
  clearViewer();updateNotice('');
  filter.value='all';sortBy.value='newest';
  grid.textContent='Loading photos…';uploadButton.focus();
  await refreshGallery(id);
 }
 async function refreshGallery(id=currentVenueId){
  try{
   const rows=await loadPhotoList(id);
   if(!galleryOpen||currentVenueId!==id)return;
   photos=rows;
   paintSummary();paintGrid();
  }catch(error){if(galleryOpen)updateNotice('Unable to load photos: '+(error.message||'Please try again.'),true)}
 }
 function paintGrid(){
  if(!grid||!galleryOpen)return;
  let showing=photos.filter(p=>filter.value==='all'||p.moderation_status===filter.value);
  showing=[...showing].sort((a,b)=>sortBy.value==='oldest'
   ?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
  get('mv3-grid-heading').textContent='Venue Photos ('+showing.length+')';
  grid.replaceChildren();
  if(!showing.length){grid.append(el('p','mv3-empty-photos',
   photos.length?'No photos match this filter.':'No venue photos yet. Upload the first one above.'));return}
  for(const p of showing){
   const tile=button('',()=>showViewer(p.id),'mv3-photo-tile');
   tile.setAttribute('aria-label',photoDisplayName(p)+', '+(p.is_cover?'default photo':safeStatus[p.moderation_status]||p.moderation_status));
   if(p.is_cover)tile.classList.add('mv3-cover-tile');
   const thumb=el('div','mv3-tile-image');
   thumb.append(icon('photos'));
   const picture=el('img','');picture.alt='';picture.loading='lazy';picture.hidden=true;
   thumb.append(picture);
   signedUrlForPhoto(p).then(url=>{
    if(!tile.isConnected||!url)return;
    picture.src=url;picture.hidden=false;thumb.classList.add('mv3-loaded');
   }).catch(()=>{});
   const badge=el('span','mv3-photo-badge',
    p.is_cover?'★ Default':safeStatus[p.moderation_status]||'Photo');
   badge.dataset.state=p.is_cover?'cover':p.moderation_status;
   thumb.append(badge);
   const caption=el('span','mv3-tile-caption',photoDisplayName(p));
   tile.append(thumb,caption);grid.append(tile);
  }
 }
 function clearViewer(){
  selectedPhoto=null;
  if(preview){preview.hidden=true;preview.replaceChildren()}
 }
 function showViewer(photoId){
  const photo=photos.find(p=>p.id===photoId);
  if(!photo||busy)return;
  selectedPhoto=photo;
  preview.replaceChildren();preview.hidden=false;
  const head=el('div','mv3-viewer-heading');
  const h3=el('h3','',photoDisplayName(photo));
  const close=button('×',()=>clearViewer(),'mv3-viewer-dismiss');
  close.setAttribute('aria-label','Close large photo preview');
  head.append(h3,close);
  const imageWrap=el('div','mv3-large-image');
  imageWrap.append(icon('photos'));
  const img=el('img','');img.alt=photoDisplayName(photo);
  img.hidden=true;
  imageWrap.append(img);
  signedUrlForPhoto(photo).then(url=>{
   if(selectedPhoto?.id!==photoId||!url)return;
   img.src=url;img.hidden=false;imageWrap.classList.add('mv3-loaded');
  }).catch(()=>{});
  const detail=el('div','mv3-viewer-detail');
  const status=photo.is_cover?'Default photo':safeStatus[photo.moderation_status]||'Photo';
  detail.append(el('span','mv3-photo-state',status),el('span','',formatPhotoDate(photo.created_at)));
  const actions=el('div','mv3-photo-actions');
  if(photo.moderation_status==='approved'&&photo.published){
   const set=button(photo.is_cover?'★ Default Photo':'☆ Set as Default',
    ()=>takeAction(photo,'set_cover'),'mv3-action-primary');
   if(photo.is_cover)set.disabled=true;
   actions.append(set);
  }
  if(photo.moderation_status==='pending'){
   actions.append(button('Approve',()=>takeAction(photo,'approve'),'mv3-action-primary'),
    button('Reject',()=>askReject(photo),'mv3-action-secondary'));
  }
  if(photo.moderation_status==='removed'){
   actions.append(button('Restore for Review',()=>takeAction(photo,'restore'),'mv3-action-primary'));
  }else{
   actions.append(button('Remove',()=>askRemove(photo),'mv3-action-secondary'));
  }
  const inline=el('div','mv3-viewer-inline');inline.id='mv3-viewer-inline';inline.hidden=true;
  preview.append(head,imageWrap,detail,actions,inline);
  preview.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 function inlinePanel(heading,description,needsReason,submitLabel,submit){
  const wrap=get('mv3-viewer-inline');
  if(!wrap)return;
  wrap.replaceChildren();wrap.hidden=false;
  wrap.append(el('h4','',heading),el('p','',description));
  let textInput=null;
  if(needsReason){
   textInput=el('textarea','');textInput.maxLength=500;textInput.rows=2;
   textInput.placeholder='Reason for rejecting this photo';
   textInput.setAttribute('aria-label','Rejection reason');wrap.append(textInput);
  }
  const actions=el('div','mv3-inline-actions');
  actions.append(button('Cancel',()=>{wrap.hidden=true;wrap.replaceChildren()},'mv3-action-secondary'),
   button(submitLabel,()=>{
    if(needsReason&&textInput.value.trim().length<5){
     updateNotice('Enter a reason of at least five characters before rejecting.',true);textInput.focus();return;
    }
    submit(textInput?.value.trim()||null);
   },'mv3-action-primary'));
  wrap.append(actions);
  if(textInput)textInput.focus();
 }
 function askReject(photo){
  inlinePanel('Reject this photo',
   'The image will stay private. Give the uploader a clear explanation.',
   true,'Reject Photo',reason=>takeAction(photo,'reject',reason));
 }
 function askRemove(photo){
  inlinePanel('Remove this photo?',
   'The image will disappear from the public gallery. Its record is retained so it can be restored later.',
   false,'Remove Photo',()=>takeAction(photo,'remove','Removed by venue management'));
 }
 function setBusy(on){
  busy=on;
  if(uploadButton)uploadButton.disabled=on;
  if(footerClose)footerClose.disabled=on;
  if(overlay)for(const b of overlay.querySelectorAll('.mv3-photo-actions button,.mv3-inline-actions button,.mv3-photo-tile'))b.disabled=on;
 }
 async function takeAction(photo,action,reason=null){
  if(busy||!authClient||!authUser)return;
  const id=currentVenueId;
  if(!isFounderView(id)||photo.venue_id!==id)return;
  setBusy(true);updateNotice('Saving photo changes…');
  try{
   const {data,error}=await authClient.rpc('manage_venue_gallery_photo',{
    p_photo_id:photo.id,p_action:action,p_reason:reason
   });
   if(error)throw error;
   if(data?.ok!==true||data.photo_id!==photo.id)throw Error('Photo update was not confirmed.');
   const messages={
    approve:'Photo approved and added to the public gallery.',
    reject:'Photo rejected and kept private.',
    remove:'Photo removed from the gallery. It can be restored later.',
    restore:'Photo restored to pending review.',
    set_cover:'Default venue photo updated.'
   };
   clearViewer();await refreshGallery(id);
   updateNotice(messages[action]||'Photo updated.');
   if(typeof approvalCenterBadge==='function')approvalCenterBadge();
   if(action==='set_cover'||action==='remove')await applyPublicCovers();
  }catch(error){updateNotice('Could not update photo: '+(error.message||'Please try again.'),true)}
  finally{setBusy(false)}
 }
 async function uploadFiles(){
  const selected=Array.from(fileInput.files||[]);
  fileInput.value='';
  if(!selected.length||busy)return;
  const id=currentVenueId,uid=authUser?.id;
  if(!isFounderView(id)||!uid)return;
  if(selected.length>8){updateNotice('Choose up to 8 photos at a time.',true);return}
  if(selected.some(file=>!fileFormat(file)||file.size>5242880)){
   updateNotice('Use JPEG, PNG, or WebP images, no larger than 5 MB each.',true);return;
  }
  setBusy(true);
  let completed=0;
  try{
   for(let i=0;i<selected.length;i++){
    if(authUser?.id!==uid||!isFounderView(id))throw Error('Your account or selected venue changed.');
    updateNotice('Uploading photo '+(i+1)+' of '+selected.length+'…');
    const file=selected[i];
    const blob=await atkVenuePhotoProcess(file);
    if(!blob||blob.size>5242880)throw Error('An image is too large after processing.');
    const path=uid+'/'+id+'/'+crypto.randomUUID()+'.jpg';
    const uploaded=await authClient.storage.from(BUCKET).upload(path,blob,{
     contentType:'image/jpeg',upsert:false
    });
    if(uploaded.error)throw uploaded.error;
    const inserted=await authClient.from('venue_photos').insert({
     venue_id:id,storage_path:path,caption:'',
     uploader_user_id:uid,published:false,moderation_status:'pending'
    });
    if(inserted.error)throw inserted.error;
    completed++;
   }
   await refreshGallery(id);
   updateNotice(photoCount('photo',completed)+' uploaded for review. Tap a pending photo to approve it.');
   if(typeof approvalCenterBadge==='function')approvalCenterBadge();
  }catch(error){
   if(completed)await refreshGallery(id);
   updateNotice(photoCount('photo',completed)+' uploaded. '+(error.message||'Upload failed.'),true);
  }finally{setBusy(false)}
 }
 function closeGallery(){
  if(busy)return;
  if(!overlay||overlay.hidden)return;
  ++requestSerial;galleryOpen=false;overlay.hidden=true;clearViewer();updateNotice('');
  if(previousFocus?.isConnected)previousFocus.focus();
 }
 async function applyPublicCovers(){
  if(typeof sampleVenues==='undefined'||!Array.isArray(sampleVenues)||!authClient)return;
  const current=sampleVenues.filter(v=>v.databaseId);
  if(!current.length)return;
  for(const v of current)if(!imageFallback.has(v.databaseId))
   imageFallback.set(v.databaseId,v.image);
  try{
   const {data,error}=await authClient.from('venue_photos')
    .select('venue_id,storage_path').eq('is_cover',true)
    .eq('published',true).eq('moderation_status','approved').limit(1500);
   if(error)throw error;
   const rows=data||[];
   const signs=rows.length
    ?await authClient.storage.from(BUCKET).createSignedUrls(rows.map(x=>x.storage_path),86400)
    :{data:[],error:null};
   if(signs.error)throw signs.error;
   const urls=new Map((signs.data||[]).map(x=>[x.path,x.signedUrl]));
   const byVenue=new Map(rows.map(x=>[x.venue_id,urls.get(x.storage_path)]));
   for(const v of current){
    const cover=byVenue.get(v.databaseId);
    v.image=cover||imageFallback.get(v.databaseId)||v.image;
    v.hasPhoto=!!cover||v.hasPhoto;
    const teaser=[...document.querySelectorAll('.venue-teaser[data-venue]')]
     .find(card=>card.dataset.venue===v.id);
    const media=teaser?.querySelector('.teaser-img');
    const image=media?.querySelector('img:not(.mv3-cover-blur)');
    if(image){
     image.src=v.image;
     image.alt=cover?'Cover photo for '+v.name:'Venue illustration for '+v.name;
     image.classList.toggle('mv3-cover-image',!!cover);
     // A portrait cover should not stretch the venue card or be zoomed/cropped.
     // Its softened backdrop fills only the existing image panel.
     let backdrop=media.querySelector('.mv3-cover-blur');
     if(cover){
      if(!backdrop){
       backdrop=document.createElement('img');
       backdrop.className='mv3-cover-blur';
       backdrop.alt='';
       backdrop.setAttribute('aria-hidden','true');
       backdrop.decoding='async';
       media.prepend(backdrop);
      }
      backdrop.src=cover;
     }else if(backdrop){backdrop.remove()}
    }
    if(typeof selectedVenue!=='undefined'&&selectedVenue===v.id){
     const hero=get('venue-screen')?.querySelector('.identity img');
     if(hero)hero.src=v.image;
    }
   }
  }catch(error){console.warn('Venue cover photos unavailable',error)}
 }
 // Extend the existing Venue Details route without changing its approved sections.
 createSummary();
 const originalOpen=managementVenueDetailOpen;
 managementVenueDetailOpen=async function(id){
  const r=await originalOpen.apply(this,arguments);
  if(isFounderView(id))await refreshSummary(id);
  return r;
 };
 const originalBack=managementVenueDetailBack;
 managementVenueDetailBack=function(){
  closeGallery();++requestSerial;currentVenueId=null;
  return originalBack.apply(this,arguments);
 };
 // Load the selected cover on published list cards and venue hero images.
 if(window.liveVenueLoadPromise?.then)window.liveVenueLoadPromise.then(applyPublicCovers);
 const priorPublicLoad=window.loadLiveVenues;
 if(typeof priorPublicLoad==='function'){
  window.loadLiveVenues=async function(){
   const result=await priorPublicLoad.apply(this,arguments);
   await applyPublicCovers();
   return result;
  };
 }
 // The Add Venue editor calls the legacy detail opener directly; follow its
 // rendered name so the new section still stays in sync for freshly created venues.
 const nameEl=get('mv2-hero-name');
 if(nameEl&&typeof MutationObserver==='function'){
  let scheduled=false;
  const observer=new MutationObserver(()=>{
   if(scheduled)return;scheduled=true;
   queueMicrotask(()=>{
    scheduled=false;
    const id=managementSelectedVenue?.id;
    if(id&&isFounderView(id)&&currentVenueId!==id)refreshSummary(id);
   });
  });
  observer.observe(nameEl,{childList:true,characterData:true,subtree:true});
 }
})();
