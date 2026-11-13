/* A2K Venue Team & Owner Photo Tools — scoped venue roles, no platform promotions. */
(function(){
'use strict';
const client=()=>typeof authClient!=='undefined'?authClient:null;
const current=()=>typeof authUser!=='undefined'?authUser:null;
const make=(tag,klass,value)=>{
 const e=document.createElement(tag);if(klass)e.className=klass;
 if(value!==undefined)e.textContent=String(value);return e;
};
const btn=(label,fn,klass='vt-btn')=>{
 const b=make('button',klass,label);b.type='button';if(fn)b.addEventListener('click',fn);return b;
};
const rpc=async(name,args)=>{
 const api=client();if(!api||!current())throw Error('Sign in to manage a venue.');
 const {data,error}=await api.rpc(name,args);
 if(error)throw error;return data;
};
const roleName={venue_manager:'Venue Manager',venue_moderator:'Venue Moderator'};
const features=[
 ['edit_details','Edit venue details'],
 ['manage_photos','Manage venue photos'],
 ['manage_schedule','Karaoke schedule'],
 ['manage_amenities','Venue amenities']
];
const enabledFeatures=['edit_details','manage_photos'];
const defaults={venue_manager:['edit_details','manage_photos'],venue_moderator:['manage_photos']};
let dialog,heading,subheading,message,body,footer,activeVenueId,activeVenueName,busy=false;
let team=[],selected=null,selectedRole='venue_moderator',selectedPerms=[],lookupToken=0;
let photoDialog,photoTitle,photoNotice,photoBody,photoFooter,photoItems=[],photoVenueId,photoBusy=false;
function notice(text,error=false){
 if(!message)return;
 message.textContent=text||'';message.hidden=!text;message.dataset.error=error?'true':'false';
}
function setupDialog(){
 if(dialog)return;
 dialog=make('dialog','vt-dialog');
 heading=make('h2','','Manage Team');heading.id='vt-heading';
 dialog.setAttribute('aria-labelledby','vt-heading');
 subheading=make('p','vt-subtitle','');
 message=make('p','vt-message','');message.hidden=true;message.setAttribute('role','status');
 body=make('div','vt-body');footer=make('div','vt-footer');
 dialog.append(heading,subheading,message,body,footer);
 dialog.addEventListener('cancel',event=>{if(busy){event.preventDefault();return}selected=null});
 document.body.append(dialog);
}
function actionFooter(items){
 footer.replaceChildren();
 for(const item of items)footer.append(item);
}
const close=()=>{if(!busy&&dialog?.open){dialog.close();selected=null}};
function setBusy(b){busy=b;dialog?.querySelectorAll('button,input').forEach(x=>x.disabled=b);}
function roleTile(role,area){
 const label=roleName[role];
 const tile=btn(label,()=>{
  selectedRole=role;selectedPerms=[...defaults[role]];
  renderEditor(area);
 },'vt-tile');
 tile.setAttribute('aria-pressed',String(selectedRole===role));
 return tile;
}
function permTile(key,label){
 const supported=enabledFeatures.includes(key);
 const chosen=selectedPerms.includes(key);
 const tile=btn(label+(supported?'':' · Soon'),()=>{
  if(!supported)return;
  selectedPerms=chosen?selectedPerms.filter(x=>x!==key):[...selectedPerms,key];
  render();
 },'vt-tile vt-permission');
 tile.disabled=!supported;tile.setAttribute('aria-pressed',String(chosen));
 return tile;
}
function renderEditor(){
 body.replaceChildren();
 const section=make('section','vt-panel');
 section.append(make('h3','',selected.existing?'Edit Team Access':'Invite Member'));
 section.append(make('p','vt-muted',(selected.name||'Karaoke Member')+' · '+activeVenueName));
 const title=make('p','vt-label','Team role');section.append(title);
 const roles=make('div','vt-role-tiles');
 for(const role of ['venue_manager','venue_moderator'])roles.append(roleTile(role));
 section.append(roles);
 section.append(make('p','vt-label','Allowed responsibilities'));
 const perms=make('div','vt-permission-tiles');
 for(const [key,label] of features)perms.append(permTile(key,label));
 section.append(perms,make('p','vt-muted','Schedule and amenities controls will be available when their venue editors are connected. Team access never grants A2K administrator powers.'));
 body.append(section);
 actionFooter([
  btn('Cancel',()=>{selected=null;notice('');render()},'vt-btn'),
  btn(selected.existing?'Save Changes':'Send Invitation',()=>void saveTeam(),'vt-btn vt-primary')
 ]);
}
async function saveTeam(){
 if(!selected||busy)return;
 if(!selectedPerms.length){notice('Choose at least one available responsibility.',true);return;}
 setBusy(true);notice('Saving team access…');
 const edit=selected;
 try{
  const result=await rpc('venue_team_manage',{
   p_venue_id:activeVenueId,p_member_id:edit.user_id,
   p_action:edit.existing?'update':'invite',p_role:selectedRole,p_permissions:selectedPerms
  });
  if(result?.ok!==true)throw Error('The team change could not be confirmed.');
  selected=null;notice(edit.existing?'Team permissions saved.':'Invitation sent. Access begins after the member accepts.');
  await loadTeam();
 }catch(error){notice(error.message||'Unable to save team member.',true);}
 finally{setBusy(false)}
}
async function revokeMember(row){
 if(busy)return;
 selected={confirmation:true,user_id:row.member_user_id};
 body.replaceChildren();
 const panel=make('section','vt-panel');
 panel.append(make('h3','','Remove access?'),make('p','vt-muted',
  (row.name||'This member')+' will immediately lose management access to '+activeVenueName+'. Their A2K account will not be affected.'));
 body.append(panel);
 actionFooter([
  btn('Cancel',()=>{selected=null;render()},'vt-btn'),
  btn('Remove Access',async()=>{
   setBusy(true);notice('Removing access…');
   try{
    const out=await rpc('venue_team_manage',{p_venue_id:activeVenueId,
     p_member_id:row.member_user_id,p_action:'revoke'});
    if(out?.ok!==true)throw Error('Access change not confirmed.');
    selected=null;notice('Venue access removed.');await loadTeam();
   }catch(error){notice(error.message||'Could not remove access.',true);}
   finally{setBusy(false)}
  },'vt-btn vt-primary')
 ]);
}
function editMember(row){
 selected={user_id:row.member_user_id,name:row.name,existing:true};
 selectedRole=row.role;
 selectedPerms=(row.permissions||[]).filter(p=>enabledFeatures.includes(p));
 notice('');render();
}
function startInvite(member){
 selected={user_id:member.user_id,name:member.stage_name,existing:false};
 selectedRole='venue_moderator';selectedPerms=[...defaults.venue_moderator];
 notice('');render();
}
function searchArea(){
 const searchPanel=make('section','vt-panel');
 searchPanel.append(make('h3','','Invite an A2K Member'));
 const label=make('label','vt-field');label.append(make('span','','Search by stage name'));
 const input=make('input','vt-input');input.type='search';input.placeholder='Start typing a member name';
 input.autocomplete='off';label.append(input);searchPanel.append(label);
 const results=make('div','vt-results');
 searchPanel.append(results);
 let timer;
 input.addEventListener('input',()=>{
  clearTimeout(timer);const val=input.value.trim();const id=++lookupToken;
  results.replaceChildren();
  if(val.length<2){results.append(make('p','vt-muted','Enter at least two characters.'));return;}
  timer=setTimeout(async()=>{
   results.replaceChildren(make('p','vt-muted','Searching members…'));
   try{
    const found=await rpc('venue_team_find_members',{p_search:val});
    if(id!==lookupToken||!results.isConnected)return;
    results.replaceChildren();
    if(!found?.length){results.append(make('p','vt-muted','No matching member found.'));return;}
    for(const member of found){
     const exists=team.some(x=>x.member_user_id===member.user_id&&['pending','active'].includes(x.status));
     const row=btn(member.stage_name+(exists?' · Already invited':''),()=>startInvite(member),'vt-result');
     row.disabled=exists;results.append(row);
    }
   }catch(error){if(id===lookupToken)results.replaceChildren(make('p','vt-muted',error.message||'Search unavailable.'));}
  },300);
 });
 return searchPanel;
}
function render(){
 if(selected?.confirmation)return;
 if(selected){renderEditor();return;}
 body.replaceChildren();
 const members=team.filter(x=>['pending','active'].includes(x.status));
 const teamPanel=make('section','vt-panel');
 teamPanel.append(make('h3','','Your Venue Team ('+members.length+')'));
 if(!members.length)teamPanel.append(make('p','vt-muted','No team members yet. Invite a registered member below.'));
 for(const row of members){
  const item=make('article','vt-member');
  const info=make('div','vt-member-info');
  info.append(make('strong','',row.name||'Karaoke member'),
   make('small','',roleName[row.role]+' · '+(row.status==='pending'?'Invitation pending':'Active')));
  const detail=make('p','vt-muted',(row.permissions||[]).filter(x=>enabledFeatures.includes(x))
   .map(x=>features.find(f=>f[0]===x)?.[1]).join(' · ')||'No active responsibilities');
  info.append(detail);item.append(info);
  const actions=make('div','vt-member-actions');
  actions.append(btn('Edit',()=>editMember(row),'vt-mini'),
   btn(row.status==='pending'?'Cancel Invite':'Remove',()=>void revokeMember(row),'vt-mini'));
  item.append(actions);teamPanel.append(item);
 }
 body.append(teamPanel,searchArea());
 actionFooter([btn('Close',close,'vt-btn vt-primary')]);
}
async function loadTeam(){
 const venue=activeVenueId;const identity=current()?.id;
 const data=await rpc('venue_team_panel',{p_venue_id:venue});
 if(venue!==activeVenueId||identity!==current()?.id)return;
 team=Array.isArray(data)?data:[];render();
}
async function openTeam(venueId,venueName){
 if(!venueId||!current())return;
 setupDialog();
 activeVenueId=venueId;activeVenueName=venueName||'this venue';
 selected=null;team=[];heading.textContent='Manage Team';subheading.textContent=activeVenueName;
 notice('');body.replaceChildren(make('p','vt-muted','Loading team…'));
 actionFooter([btn('Close',close,'vt-btn vt-primary')]);
 if(!dialog.open)dialog.showModal();
 try{await loadTeam()}catch(error){notice('Unable to load team: '+(error.message||'Try again.'),true);}
}
function setupPhotoDialog(){
 if(photoDialog)return;
 photoDialog=make('dialog','vt-dialog vt-photos');
 photoTitle=make('h2','','Venue Photos');photoTitle.id='vt-photo-heading';
 photoDialog.setAttribute('aria-labelledby','vt-photo-heading');
 photoNotice=make('p','vt-message');photoNotice.setAttribute('role','status');photoNotice.hidden=true;
 photoBody=make('div','vt-body');
 photoFooter=make('div','vt-footer');
 photoFooter.append(btn('Close',()=>{if(!photoBusy)photoDialog.close()},'vt-btn vt-primary'));
 photoDialog.append(photoTitle,photoNotice,photoBody,photoFooter);
 photoDialog.addEventListener('cancel',event=>{if(photoBusy)event.preventDefault()});
 document.body.append(photoDialog);
}
function photoFeedback(text,error=false){
 photoNotice.textContent=text||'';photoNotice.hidden=!text;photoNotice.dataset.error=error?'true':'false';
}
function photoBusySet(value){
 photoBusy=value;
 photoDialog.querySelectorAll('button').forEach(b=>b.disabled=value);
}
function photoGrid(){
 photoFooter.replaceChildren(btn('Close',()=>{if(!photoBusy)photoDialog.close()},'vt-btn vt-primary'));
 photoBody.replaceChildren();
 if(!photoItems.length){photoBody.append(make('p','vt-muted','No venue photos yet. Registered members can submit photos from the venue listing.'));return;}
 const grid=make('div','vt-photo-grid');
 for(const photo of photoItems){
  const tile=btn('',()=>viewPhoto(photo.id),'vt-photo-item');
  tile.setAttribute('aria-label',(photo.caption||'Venue photo')+' · '+photo.moderation_status);
  const img=make('img');img.src='assets/atk-default-venue.webp';img.alt=photo.caption||'Venue photo';img.loading='lazy';
  tile.append(img,make('small','',photo.is_cover?'★ Default photo':photo.moderation_status));
  grid.append(tile);
  if(photo.storage_path){
   client().storage.from('venue-community-photos').createSignedUrl(photo.storage_path,600)
   .then(({data,error})=>{if(!error&&data?.signedUrl&&tile.isConnected&&photoVenueId===photo.venue_id)img.src=data.signedUrl})
   .catch(()=>{});
  }
 }
 photoBody.append(grid);
}
async function reloadPhotos(){
 const id=photoVenueId;
 const {data,error}=await client().from('venue_photos')
  .select('id,venue_id,storage_path,caption,moderation_status,published,is_cover,created_at')
  .eq('venue_id',id).order('created_at',{ascending:false}).limit(150);
 if(error)throw error;
 if(id!==photoVenueId)return;
 photoItems=data||[];photoGrid();
}
async function performPhoto(photo,action,reason){
 if(photoBusy)return;
 photoBusySet(true);photoFeedback('Saving photo changes…');
 try{
  const out=await rpc('manage_venue_gallery_photo',{
   p_photo_id:photo.id,p_action:action,p_reason:reason||null
  });
  if(out?.ok!==true)throw Error('Photo change not confirmed.');
  await reloadPhotos();
  photoFeedback(action==='remove'?'Photo removed from public view. The original is retained.':
   action==='restore'?'Photo returned to pending approval.':'Photo gallery updated.');
  if(typeof window.atkOwnerDashboardRefresh==='function')void window.atkOwnerDashboardRefresh();
  if(typeof window.loadLiveVenues==='function')void window.loadLiveVenues();
 }catch(error){photoFeedback(error.message||'Could not update this photo.',true);}
 finally{photoBusySet(false);}
}
function viewPhoto(id){
 const photo=photoItems.find(x=>x.id===id);if(!photo||photoBusy)return;
 photoBody.replaceChildren();
 const area=make('section','vt-panel');
 area.append(make('h3','',photo.caption||'Venue Photo'));
 const img=make('img','vt-photo-large');img.alt=photo.caption||'Venue photo';
 img.src='assets/atk-default-venue.webp';area.append(img);
 if(photo.storage_path)client().storage.from('venue-community-photos').createSignedUrl(photo.storage_path,600)
  .then(({data,error})=>{if(!error&&data?.signedUrl&&img.isConnected)img.src=data.signedUrl}).catch(()=>{});
 area.append(make('p','vt-muted','Status: '+(photo.is_cover?'Default cover':photo.moderation_status)));
 const actions=make('div','vt-photo-actions');
 if(photo.moderation_status==='pending')actions.append(btn('Approve',()=>void performPhoto(photo,'approve'),'vt-btn'));
 if(photo.moderation_status==='removed'){
  actions.append(btn('Restore for Review',()=>void performPhoto(photo,'restore'),'vt-btn'));
 }else{
  actions.append(btn('Remove Photo',()=>confirmRemove(photo),'vt-btn vt-primary'));
 }
 if(photo.moderation_status==='approved'&&photo.published&&!photo.is_cover)
  actions.append(btn('Set as Cover',()=>void performPhoto(photo,'set_cover'),'vt-btn'));
 area.append(actions);photoBody.append(area);
 photoFooter.replaceChildren(btn('Back to Photos',photoGrid,'vt-btn'),
  btn('Close',()=>{if(!photoBusy)photoDialog.close()},'vt-btn vt-primary'));
}
function confirmRemove(photo){
 photoBody.replaceChildren();
 const area=make('section','vt-panel');
 area.append(make('h3','','Remove this photo?'),make('p','vt-muted',
  'This photo will disappear from the public venue gallery. It can be restored for review later; nothing is permanently deleted.'));
 const actions=make('div','vt-photo-actions');
 actions.append(btn('Cancel',()=>viewPhoto(photo.id),'vt-btn'),
  btn('Remove Photo',()=>void performPhoto(photo,'remove','Removed by venue team'),'vt-btn vt-primary'));
 area.append(actions);photoBody.append(area);
}
async function openPhotos(venueId,venueName){
 if(!venueId||!current())return;
 setupPhotoDialog();photoVenueId=venueId;photoItems=[];
 photoTitle.textContent=(venueName||'Venue')+' · Photos';photoFeedback('');
 photoBody.replaceChildren(make('p','vt-muted','Loading photos…'));
 photoFooter.replaceChildren(btn('Close',()=>{if(!photoBusy)photoDialog.close()},'vt-btn vt-primary'));
 if(!photoDialog.open)photoDialog.showModal();
 try{await reloadPhotos()}catch(error){photoFeedback('Unable to load photos: '+(error.message||'Try again.'),true);}
}
window.atkVenueTeam={openTeam,openPhotos};
})();