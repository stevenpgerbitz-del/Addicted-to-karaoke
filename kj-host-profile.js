/* A2K build 208: privacy-aware KJ host profile cards.
   Temporary Founder-only UI preview does not write any hosting data. */
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
  name.append(element('span','a2k-kj-host-profile-chip','KJ Host'));
  row.append(avatar,name);
  box.append(row);
  if(venueName)box.append(element('p','a2k-kj-host-profile-venue',
    'Hosting at '+venueName+(day?' · '+day:'')));
  box.append(element('h3','','About the Host'));
  box.append(element('p','a2k-kj-host-profile-bio',
    profile.bio?.trim()||'This host has not added an About Me description yet.'));
  if(profile.created_at&&!demo){
    const time=new Date(profile.created_at);
    if(!Number.isNaN(time.getTime()))box.append(element('p','a2k-kj-host-profile-since',
      'A2K member since '+time.toLocaleDateString('en-US',{month:'long',year:'numeric'})));
  }
  if(demo)box.append(element('p','a2k-kj-host-profile-disclaimer','Preview visible only to the Founder.'));
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
  // Temporary local preview only: Founder-only, no database user, no public
  // hosting relationship. Remove this function once the visual is approved.
  if(typeof authUser==='undefined'||!authUser||
     typeof memberFounderId==='undefined'||authUser.id!==memberFounderId||
     venue?.name!=="Doc's Lounge")return;
  if(box.querySelector('.a2k-kj-founder-preview'))return;
  const saturday=[...box.querySelectorAll('.venue-schedule-line')]
    .find(line=>line.querySelector('b')?.textContent==='Saturday');
  if(!saturday)return;
  const section=element('div','a2k-kj-founder-preview');
  const button=element('button','a2k-kj-host-link','🎤 Hosted by DJ Copper Mic');
  button.type='button';
  button.setAttribute('aria-label','View DJ Copper Mic KJ profile preview');
  button.addEventListener('click',()=>{
    const dlg=ensureDialog();
    renderCard({
      stage_name:'DJ Copper Mic',
      bio:'Karaoke is about making everyone feel welcome on stage. I enjoy classic rock, country, pop, and those unexpected crowd favorites. My goal is to keep the rotation fair, the music sounding great, and the energy going all night.'
    },{venueName:venue.name,day:'Saturday',demo:true});
    if(!dlg.open)dlg.showModal();
  });
  section.append(button);
  saturday.insertAdjacentElement('afterend',section);
}
window.a2kOpenKjHostProfile=openKjHostProfile;
window.a2kMountKjHostPreview=founderPreview;
})();