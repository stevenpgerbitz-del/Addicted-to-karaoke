/* A2K build 207: clickable, privacy-aware KJ host profile cards.
   Test mode is a visual preview only; it does not create a hosting record. */
(function(){
'use strict';
let dialog=null;
function element(tag,className,content){
  const x=document.createElement(tag);
  if(className)x.className=className;
  if(content!==undefined)x.textContent=String(content);
  return x;
}
function ensureDialog(){
  if(dialog?.isConnected)return dialog;
  dialog=element('dialog','a2k-kj-host-profile-dialog');
  dialog.id='a2k-kj-host-profile-dialog';
  dialog.setAttribute('aria-labelledby','a2k-kj-host-profile-title');
  dialog.setAttribute('aria-modal','true');
  const body=element('div','a2k-kj-host-profile-inner');
  body.append(element('h2','','KJ Profile'));
  body.querySelector('h2').id='a2k-kj-host-profile-title';
  const info=element('div','a2k-kj-host-profile-body');
  info.id='a2k-kj-host-profile-body';
  const close=element('button','a2k-kj-host-profile-close','Close');
  close.type='button';
  close.addEventListener('click',()=>dialog.close());
  body.append(info,close);
  dialog.append(body);
  document.body.append(dialog);
  return dialog;
}
function renderCard(profile,{venueName='',day='',demo=false}={}){
  const box=dialog.querySelector('#a2k-kj-host-profile-body');
  box.replaceChildren();
  if(demo)box.append(element('div','a2k-kj-profile-test-label','FOUNDER-ONLY PREVIEW · NO REAL HOST ASSIGNMENT'));
  const row=element('div','a2k-kj-host-profile-heading');
  const avatar=element('div','a2k-kj-host-profile-avatar');
  if(!demo && profile.avatar_path){
    try{
      const img=document.createElement('img');
      img.alt='KJ profile photo';
      img.src=authClient.storage.from('member-avatars').getPublicUrl(profile.avatar_path).data.publicUrl;
      avatar.append(img);
    }catch(_){avatar.textContent='🎤'}
  }else avatar.textContent='🎤';
  const name=element('div','a2k-kj-host-profile-names');
  name.append(element('strong','',profile.stage_name));
  name.append(element('span','a2k-kj-host-profile-chip',demo?'Demo KJ':'KJ Host'));
  row.append(avatar,name);
  box.append(row);
  if(venueName)box.append(element('p','a2k-kj-host-profile-venue',
    (demo?'Example at ':'Hosting at ')+venueName+(day&&!demo?' · '+day:'')));
  box.append(element('h3','','About the Host'));
  box.append(element('p','a2k-kj-host-profile-bio',
    profile.bio?.trim()||'This host has not added an About Me description yet.'));
  if(profile.created_at&&!demo){
    const time=new Date(profile.created_at);
    if(!Number.isNaN(time.getTime()))box.append(element('p','a2k-kj-host-profile-since',
      'A2K member since '+time.toLocaleDateString('en-US',{month:'long',year:'numeric'})));
  }
  if(demo)box.append(element('p','a2k-kj-host-profile-disclaimer',
    'This is a sample profile card to test the design. It is not a real KJ, booking, or public event.'));
}
async function openKjHostProfile(userId,venueName,day){
  const dlg=ensureDialog();
  const box=dlg.querySelector('#a2k-kj-host-profile-body');
  box.replaceChildren(element('p','', 'Loading KJ profile…'));
  if(!dlg.open)dlg.showModal();
  try{
    if(!userId || typeof authClient==='undefined' || !authClient)throw Error('Profile unavailable');
    // Direct query is subject to member_profiles RLS. Private profiles do not
    // become readable merely because a schedule links to their user ID.
    const {data,error}=await authClient.from('member_profiles')
      .select('user_id,stage_name,bio,avatar_path,created_at')
      .eq('user_id',userId).maybeSingle();
    if(error)throw error;
    if(!dlg.open)return;
    if(!data){
      box.textContent='This member has not made their profile available to you.';
      return;
    }
    renderCard(data,{venueName,day});
  }catch(error){
    if(dlg.open)box.textContent='This KJ profile is unavailable right now.';
    console.warn('KJ profile card unavailable',error);
  }
}
function founderPreview(box,venue){
  // Only one demo venue, only for the actual Founder. Never publicly advertise
  // the fictional host, and never create a database schedule or fake user.
  if(typeof authUser==='undefined'||!authUser||
     typeof memberFounderId==='undefined'||authUser.id!==memberFounderId||
     venue?.name!=="Doc's Lounge")return;
  if(box.querySelector('.a2k-kj-founder-preview'))return;
  const section=element('div','a2k-kj-founder-preview');
  section.append(element('small','','FOUNDER TEST ONLY · Not part of the venue schedule'));
  const button=element('button','a2k-kj-host-link','Hosted by Sample KJ (Preview)');
  button.type='button';
  button.addEventListener('click',()=>{
    const dlg=ensureDialog();
    renderCard({
      stage_name:'Sample KJ',
      bio:'This example shows how an approved karaoke host’s public About Me details will appear to singers. Their actual stage name, image and description will come from their A2K member profile.'
    },{venueName:venue.name,demo:true});
    if(!dlg.open)dlg.showModal();
  });
  section.append(button);
  box.append(section);
}
window.a2kOpenKjHostProfile=openKjHostProfile;
window.a2kMountKjHostPreview=founderPreview;
})();