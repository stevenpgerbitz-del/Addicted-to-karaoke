/* A2K Build 258 — founder-safe user deletion and member self-service.
   Database checks all permissions and deletes only after an impact preview. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const make=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=String(txt);
  return el;
};
let modal=null,preview=null,targetId=null,busy=false;
function client(){return typeof authClient!=='undefined'?authClient:null}
function actor(){return typeof authUser!=='undefined'?authUser:null}
function protect(member){
  return !member||member.id===actor()?.id||
    ['founder','super_admin','admin','moderator','owner'].includes(member.role)||
    Number(member.member_number)===1;
}
async function request(action,props){
  if(!client()||!actor())throw Error('Sign in again to continue.');
  const {data,error}=await client().functions.invoke('a2k-member-deletion',{body:{action,...props}});
  if(error){
    let message=error.message||'Request failed.';
    try{const payload=await error.context?.json?.();if(payload?.error)message=payload.error}catch(_){}
    throw Error(message);
  }
  if(data?.error)throw Error(data.error);
  return data;
}
function appendLine(list,label,value){
  const row=make('div','a2k-delete-impact-row');
  row.append(make('span','',label),make('strong','',String(value??0)));list.append(row);
}
function close(){if(busy)return;if(modal?.open)modal.close();modal=null;preview=null;targetId=null;}
function showError(message){
  const target=$('a2k-delete-error');if(target)target.textContent=String(message||'');
}
async function begin(target){
  if(busy)return;
  targetId=target;
  if(modal?.open)modal.close();
  modal=document.createElement('dialog');
  modal.id='a2k-delete-account-dialog';
  modal.className='a2k-delete-dialog';
  modal.setAttribute('aria-labelledby','a2k-delete-heading');
  const title=make('h2','', 'Permanent Account Deletion');title.id='a2k-delete-heading';
  const notice=make('p','a2k-delete-lede','Checking which account records and community content would be deleted…');
  const summary=make('div','a2k-delete-impact');summary.id='a2k-delete-impact';
  const warning=make('p','a2k-delete-warning','This is permanent. Reviews and photos from other members attached to deleted venues may also be removed.');
  warning.hidden=true;
  const reasonWrap=make('label','a2k-delete-field');
  reasonWrap.append(make('strong','','Reason for deletion (required for administrator actions)'));
  const reason=make('textarea');reason.id='a2k-delete-reason';reason.rows=2;reason.maxLength=400;reason.placeholder='Why is this member being removed?';
  reasonWrap.append(reason);reasonWrap.hidden=true;
  const confirmWrap=make('label','a2k-delete-field');
  const phrase=make('strong','','');
  const confirm=make('input');confirm.id='a2k-delete-confirm';confirm.type='text';confirm.autocomplete='off';confirm.spellcheck=false;
  confirm.setAttribute('aria-label','Enter deletion confirmation phrase');
  confirmWrap.append(phrase,confirm);confirmWrap.hidden=true;
  const error=make('p','a2k-delete-error','');error.id='a2k-delete-error';error.setAttribute('role','alert');
  const actions=make('div','a2k-delete-actions');
  const cancel=make('button','a2k-delete-cancel','Cancel');cancel.type='button';cancel.onclick=close;
  const erase=make('button','a2k-delete-erase','Delete Permanently');erase.type='button';erase.disabled=true;
  actions.append(cancel,erase);
  modal.append(title,notice,summary,warning,reasonWrap,confirmWrap,error,actions);
  document.body.append(modal);
  modal.addEventListener('close',()=>{if(!busy){modal.remove();modal=null;preview=null;targetId=null}});
  modal.showModal();
  try{
    const response=await request('preview',{target});
    if(!modal?.open||targetId!==target)return;
    preview=response.preview;
    if(!preview||preview.target!==target)throw Error('Could not verify the account.');
    const self=preview.kind==='self',content=preview.content||{};
    notice.textContent=(self?'Your account':'Member '+preview.name+
      (preview.member_number?' (#'+String(preview.member_number).padStart(6,'0')+')':''))+
      ' and the following associated records will be permanently deleted:';
    summary.replaceChildren();
    for(const [label,key] of [
      ['Venues they created','venues'],['Venue reviews affected','venue_reviews'],
      ['KJ/Host reviews affected','kj_reviews'],['Venue photos affected','photos'],
      ['Songs','songs'],['Favorites','favorites'],['KJ hosting requests','host_requests'],['Approved schedules to review','approved_kj_schedule_requests'],
      ['Venue suggestions','venue_suggestions'],['Ownership claims','venue_claims'],
      ['Special karaoke events','special_events'],['Event submissions','special_event_suggestions'],
      ['Venue reports','venue_reports']])appendLine(summary,label,content[key]);
    appendLine(summary,'Uploaded files',preview.storage_count);
    const outside=Number(content.account_reviews_by_others||0)+Number(content.kj_reviews_by_others||0);
    warning.hidden=outside===0&&Number(content.venues||0)===0&&Number(content.approved_kj_schedule_requests||0)===0;
    if(outside)warning.textContent=outside+' reviews by OTHER MEMBERS will also be removed because they are attached to this member’s venues or KJ profile.';
    else if(Number(content.venues||0)>0)warning.textContent='Deleting these venues also deletes associated schedules, saved favorites, and photos that other members may have posted.';
    else if(Number(content.approved_kj_schedule_requests||0)>0)warning.textContent='Approved KJ schedules on surviving venues may require administrative review after account removal.';
    reasonWrap.hidden=self;
    confirmWrap.hidden=false;
    const required=self?'DELETE MY ACCOUNT':'DELETE MEMBER';
    phrase.textContent='Type '+required+' to confirm';
    confirm.placeholder=required;
    erase.disabled=false;
    erase.onclick=()=>void execute(target,required);
    confirm.focus();
  }catch(e){
    if(modal?.open)showError(e.message||'Could not load deletion preview.');
  }
}
async function execute(target,required){
  if(busy||!preview||targetId!==target)return;
  const phrase=$('a2k-delete-confirm')?.value||'';
  const reason=$('a2k-delete-reason')?.value.trim()||'';
  if(phrase!==required){showError('Type '+required+' exactly to continue.');return}
  if(preview.kind==='management'&&reason.length<5){showError('Enter a reason of at least five characters.');return}
  busy=true;const erase=modal?.querySelector('.a2k-delete-erase'),cancel=modal?.querySelector('.a2k-delete-cancel');
  if(erase)erase.disabled=true;if(cancel)cancel.disabled=true;
  showError('Deleting account and associated content…');
  try{
    const self=preview.kind==='self';
    const result=await request('delete',{target,signature:preview.signature,confirmation:phrase,reason});
    if(!result?.deleted)throw Error('Account deletion could not be verified.');
    busy=false;
    if(modal?.open)modal.close();
    modal?.remove();modal=null;preview=null;targetId=null;
    if(self){
      try{await client()?.auth.signOut()}catch(e){console.warn('A2K signout after account deletion',e)}
      location.replace(location.origin+'/?account=deleted');
    }else{
      if(typeof managementMemberBack==='function')managementMemberBack();
      if(typeof managementUsersLoad==='function')void managementUsersLoad();
      const feedback=$('mg-status');if(feedback)feedback.textContent='Member account and related content deleted.';
    }
  }catch(e){
    busy=false;if(erase)erase.disabled=false;if(cancel)cancel.disabled=false;
    showError(e.message||'Could not delete member. No account removal was confirmed.');
  }
}
function mountManagement(){
  const details=$('management-member-details');
  if(!details||$('a2k-management-delete-entry'))return;
  const wrap=make('section','mg2-section a2k-management-delete');wrap.id='a2k-management-delete-entry';
  const heading=make('div','mg2-section-top');heading.append(make('h3','', 'Account Removal'));
  const note=make('p','a2k-delete-note','Remove a member and the content they submitted. A preview and confirmation are required.');
  const deleteButton=make('button','a2k-delete-management-button','Delete Member');
  deleteButton.type='button';
  deleteButton.onclick=()=>{const member=typeof managementSelectedMember!=='undefined'?managementSelectedMember:null;
    if(member&&!protect(member))void begin(member.id);};
  wrap.append(heading,note,deleteButton);
  const anchor=$('mg2-history-panel')?.closest('.mg2-disclosure')||$('mg2-permissions');
  if(anchor?.parentNode)anchor.insertAdjacentElement('afterend',wrap);
  else details.append(wrap);
  function refresh(){
    const member=typeof managementSelectedMember!=='undefined'?managementSelectedMember:null;
    const blocked=protect(member);
    wrap.hidden=details.hidden;
    deleteButton.disabled=blocked;
    note.textContent=blocked?'This account is protected. Founder, administrator and your own account cannot be deleted here.':
      'Delete '+(member?.stage_name||'this member')+' and their contributions after reviewing the complete impact.';
  }
  new MutationObserver(refresh).observe(details,{attributes:true,attributeFilter:['hidden']});
  refresh();
}
function mountSelf(){
  if($('a2k-self-delete-entry'))return;
  const settings=$('a2k-profile-settings')?.querySelector('.a2k-profile-settings-panel');
  if(!settings)return;
  const section=make('section','a2k-delete-self');section.id='a2k-self-delete-entry';
  const heading=make('div','profile-section-top');heading.append(make('strong','','Account & Data'));
  const note=make('p','a2k-delete-note','Permanently remove your A2K account, reviews, photos, songs and venues you created. You can see the impact before confirming.');
  const btn=make('button','a2k-delete-self-button','Delete My Account');
  btn.type='button';btn.onclick=()=>{if(actor()?.id)void begin(actor().id)};
  section.append(heading,note,btn);settings.append(section);
  function refresh(){
    const valid=!!actor()?.id;
    btn.disabled=!valid;
  }
  refresh();
  if(client())client().rpc('is_platform_founder').then(({data,error})=>{
    if(!section.isConnected||error)return;
    if(data===true){
      btn.disabled=true;
      note.textContent='The Founder account is protected. Site ownership must be handled separately before it can be removed.';
    }
  }).catch(()=>{});
}
function install(){mountManagement();mountSelf();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
