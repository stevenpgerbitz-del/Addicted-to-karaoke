/* A2K profile picture choices: no inferred gender, microphone by default. */
(function(){
 'use strict';
 const assets=[
  ['mic','Microphone','assets/a2k-directory-vintage-mic.svg'],
  ['male','Male figure','assets/a2k-avatar-male.svg'],
  ['female','Female figure','assets/a2k-avatar-female.svg']
 ];
 let dialog=null,busy=false;
 function build(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='a2k-avatar-choice-dialog';
  dialog.setAttribute('aria-label','Choose your profile picture');
  const heading=document.createElement('h2');heading.textContent='Choose Your Profile Picture';
  const hint=document.createElement('p');hint.textContent='Choose a default picture or upload your own. You can change it anytime.';
  const grid=document.createElement('div');grid.className='a2k-avatar-choices';
  for(const [key,label,url] of assets){
   const button=document.createElement('button');button.type='button';button.className='a2k-avatar-choice';
   button.setAttribute('aria-label','Use '+label+' profile picture');
   const image=document.createElement('img');image.src=url;image.alt='';
   const caption=document.createElement('span');caption.textContent=label+(key==='mic'?' · Default':'');
   button.append(image,caption);
   button.onclick=()=>void choose(key);
   grid.append(button);
  }
  const upload=document.createElement('button');upload.type='button';upload.className='a2k-avatar-upload';
  upload.textContent='Upload My Own Photo';
  upload.onclick=()=>{dialog.close();document.getElementById('member-avatar-input')?.click()};
  const close=document.createElement('button');close.type='button';close.className='a2k-avatar-close';
  close.textContent='Close';close.onclick=()=>dialog.close();
  const feedback=document.createElement('p');feedback.id='a2k-avatar-choice-feedback';feedback.setAttribute('role','status');
  dialog.append(heading,hint,grid,upload,feedback,close);
  document.body.append(dialog);return dialog;
 }
 async function choose(key){
  if(busy||typeof authClient==='undefined'||!authClient||typeof authUser==='undefined'||!authUser||typeof memberProfile==='undefined'||!memberProfile)return;
  const feedback=document.getElementById('a2k-avatar-choice-feedback');
  const controls=dialog.querySelectorAll('button');busy=true;controls.forEach(b=>b.disabled=true);
  feedback.textContent='Saving picture…';
  try{
   if(key==='mic'){
    const stamp=new Date().toISOString();
    const response=await authClient.from('member_profiles').update({avatar_path:null,updated_at:stamp})
      .eq('user_id',authUser.id).select('avatar_path,updated_at').single();
    if(response.error)throw response.error;
    Object.assign(memberProfile,response.data);
    memberShowAvatar();
   }else{
    const img=new Image();img.src=assets.find(a=>a[0]===key)[2];await img.decode();
    const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;
    canvas.getContext('2d').drawImage(img,0,0,400,400);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to prepare picture.')),'image/jpeg',0.9));
    const file=new File([blob],'a2k-avatar.jpg',{type:'image/jpeg'});
    const input={files:[file],value:''};
    await memberUploadAvatar(input);
    const status=document.getElementById('member-avatar-status');
    if(!status||status.textContent!=='Photo updated!')throw new Error(status?.textContent||'Picture was not saved.');
   }
   feedback.textContent='Profile picture updated.';
   dialog.close();
  }catch(error){feedback.textContent=error.message||'Unable to update the picture.'}
  finally{busy=false;controls.forEach(b=>b.disabled=false)}
 }
 window.a2kOpenAvatarChoices=function(){
  if(typeof authUser==='undefined'||!authUser||typeof memberProfile==='undefined'||!memberProfile)return;
  build();
  dialog.querySelector('#a2k-avatar-choice-feedback').textContent='';
  if(!dialog.open)dialog.showModal();
 };
})();
