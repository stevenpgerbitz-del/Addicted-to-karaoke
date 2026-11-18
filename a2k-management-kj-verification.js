/* A2K Build 334 — approved Verified KJ badge management.
   Uses the existing badge art; no Founding KJ badge is created.
   Account verification and venue approvals remain independent. */
(function(){
 'use strict';
 const get=id=>document.getElementById(id);
 const mk=(tag,cls,content)=>{
   const e=document.createElement(tag);
   if(cls)e.className=cls;
   if(content!==undefined)e.textContent=content;
   return e;
 };
 const button=(text,fn,cls)=>{
   const e=mk('button',cls,text);e.type='button';
   e.addEventListener('click',fn);return e;
 };
 let selected=null,eligible=false,verified=null,serial=0;
 const details=get('management-member-details');
 const permissions=get('mg2-permissions');
 if(!details||!permissions||typeof managementMemberOpen!=='function')return;

 const section=mk('section','mg2-section mg2-kj-verification');
 section.id='mg2-kj-verification';
 const header=mk('div','mg2-section-top');
 const title=mk('span','mg2-section-title');
 title.append(mk('strong','','🎤 KJ Verification'));
 const edit=button('Verify KJ',openEditor,'mg2-edit-button');
 edit.id='mg2-kj-edit';edit.hidden=true;
 header.append(title,edit);
 const body=mk('div','mg2-kj-verification-body');
 const art=mk('img','mg2-kj-verification-art');
 art.src='assets/badges/verified_kj.png?v=334';
 art.alt='Verified KJ badge artwork';
 art.loading='lazy';
 const copy=mk('div','mg2-kj-verification-copy');
 const status=mk('strong','mg2-kj-verification-status','Checking verification…');
 status.id='mg2-kj-status';
 const note=mk('p','mg2-muted',
  'Official KJ recognition. Separate from the blue account checkmark and venue approvals.');
 const outcome=mk('p','mg2-kj-outcome');outcome.id='mg2-kj-outcome';
 outcome.setAttribute('role','status');
 copy.append(status,note,outcome);
 body.append(art,copy);section.append(header,body);
 permissions.insertAdjacentElement('afterend',section);

 const overlay=mk('div','mg-role-confirm-overlay mg2-kj-overlay');
 overlay.id='mg2-kj-overlay';overlay.hidden=true;
 const dialog=mk('div','mg-role-confirm-card mg2-kj-dialog');
 dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-labelledby','mg2-kj-dialog-title');
 const heading=mk('h3','', 'KJ Verification');
 heading.id='mg2-kj-dialog-title';
 const memberName=mk('p','mg2-kj-member-name');
 const current=mk('p','mg2-muted');
 const selectLabel=mk('label','', 'Verification action');
 const select=mk('select','');select.id='mg2-kj-action';
 for(const [value,label] of [['approve','Award Verified KJ badge'],['revoke','Revoke Verified KJ badge']]){
   const option=mk('option','',label);option.value=value;select.append(option);
 }
 selectLabel.append(select);
 const reasonLabel=mk('label','','Reason for the decision');
 const reason=mk('input','');reason.id='mg2-kj-reason';
 reason.type='text';reason.maxLength=300;
 reason.placeholder='How did you confirm their KJ status?';
 reasonLabel.append(reason);
 const feedback=mk('p','mg2-kj-feedback');feedback.setAttribute('role','alert');
 const actions=mk('div','mg-confirm-actions');
 const cancel=button('Cancel',closeEditor,'mg2-kj-cancel');
 const save=button('Save Changes',saveVerification,'mg2-kj-save');
 actions.append(cancel,save);
 dialog.append(heading,memberName,current,selectLabel,reasonLabel,feedback,actions);
 overlay.append(dialog);details.append(overlay);
 overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&!overlay.hidden){e.preventDefault();closeEditor()}
 });

 function render(){
   if(!selected)return;
   const protectedMember=selected.role==='founder'||selected.id===authUser?.id;
   status.textContent=verified==null?'Checking KJ verification…':
     verified?'Verified KJ badge awarded':eligible?'KJ / Host — not yet verified':'Member has not registered as KJ / Host';
   art.classList.toggle('mg2-kj-art-inactive',verified!==true);
   edit.hidden=protectedMember||verified==null||(!eligible&&!verified);
   edit.textContent=verified?'Edit':'Verify KJ';
 }
 async function loadStatus(member){
   const seq=++serial;
   selected=member;eligible=member.is_host===true;verified=null;
   outcome.textContent='';render();
   try{
     if(typeof authClient==='undefined'||!authClient)throw Error('Please sign in');
     const [profile,award]=await Promise.all([
       authClient.from('member_profiles').select('karaoke_interests').eq('user_id',member.id).maybeSingle(),
       authClient.from('profile_badge_awards').select('badge_code')
         .eq('user_id',member.id).eq('badge_code','verified_kj').limit(1)
     ]);
     if(seq!==serial||selected?.id!==member.id)return;
     if(profile.error)throw profile.error;
     if(award.error)throw award.error;
     eligible=eligible||(Array.isArray(profile.data?.karaoke_interests)&&profile.data.karaoke_interests.includes('kj'));
     verified=(award.data||[]).length>0;
     render();
   }catch(error){
     if(seq!==serial)return;
     status.textContent='Could not load KJ verification: '+(error.message||'Please retry');
     edit.hidden=true;
   }
 }
 function openEditor(){
   if(!selected||verified==null||(!eligible&&!verified)||
     selected.role==='founder'||selected.id===authUser?.id)return;
   memberName.textContent=selected.stage_name||'Karaoke Member';
   current.textContent='Currently: '+(verified?'Verified KJ':'Not verified as KJ');
   select.value=verified?'revoke':'approve';
   reason.value='';feedback.textContent='';
   overlay.hidden=false;select.focus();
 }
 function closeEditor(){overlay.hidden=true;feedback.textContent=''}
 async function saveVerification(){
   if(!selected||verified==null||typeof authClient==='undefined'||!authClient)return;
   const target=selected,targetId=target.id;
   const next=select.value==='approve',why=reason.value.trim();
   if(next===verified){feedback.textContent='Please select a different verification status.';return}
   if(why.length<5){feedback.textContent='Enter a reason with at least 5 characters.';return}
   save.disabled=true;save.textContent='Saving…';feedback.textContent='Saving verification…';
   try{
     const {data,error}=await authClient.rpc('management_set_kj_verification',{
       p_user_id:targetId,p_verified:next,p_reason:why
     });
     if(error)throw error;
     if(!data?.success)throw Error('Database did not confirm the change.');
     if(selected?.id!==targetId){closeEditor();return}
     closeEditor();
     // Reopen the same member through the existing management workflow so
     // the badge, member history and status refresh from the database.
     managementMemberOpen(target);
     outcome.textContent=next?
       'Verified KJ badge awarded. The decision is in Activity History.':
       'Verified KJ badge revoked. The decision is in Activity History.';
   }catch(error){feedback.textContent='Unable to save KJ status: '+(error.message||'Please try again.')}
   finally{save.disabled=false;save.textContent='Save Changes'}
 }
 const originalOpen=managementMemberOpen;
 managementMemberOpen=function(member,...other){
   const result=originalOpen.call(this,member,...other);
   void loadStatus(member);
   return result;
 };
 const originalBack=managementMemberBack;
 managementMemberBack=function(...args){
   ++serial;selected=null;closeEditor();
   return originalBack.apply(this,args);
 };
})();