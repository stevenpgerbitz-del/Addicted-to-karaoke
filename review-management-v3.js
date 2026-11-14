/* Build 144 — Review Management. Backend enforces every moderation permission. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const cats=[['kj_host','KJ / Host'],['food','Food'],['venue_size','Venue Size'],['song_selection','Song Selection'],['wait_time','Wait Time'],['sound_quality','Sound Quality'],['atmosphere','Atmosphere']];
const names={pending:'Pending',approved:'Published',hidden:'Hidden',archived:'Archived',rejected:'Rejected'};
const opts={approve:['Approve & Publish','Publish','Publish this review and include its ratings.'],reject:['Reject Review','Reject','Reject this pending review, keeping a recoverable record.'],hide:['Hide Review','Hide','Remove the review and its scores from public view.'],archive:['Archive Review','Archive','Archive this review without deleting its history.'],spam:['Spam & Archive','Archive as Spam','Archive as spam and exclude its ratings.'],restore:['Restore Review','Restore','Republish the review and include its ratings again.']};
const S={page:1,filter:'all',sort:'newest',search:'',bulk:false,selected:new Set(),result:null,serial:0,busy:false,choice:null,dialog:null,debounce:null};
let built=false;
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n}
function button(label,click,cls){const n=el('button',cls,label);n.type='button';if(click)n.addEventListener('click',click);return n}
function date(t){const d=new Date(t);return Number.isNaN(d.valueOf())?'Unknown date':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
function score(x){if(x===null||x===undefined||x==='')return 'N/A';const n=Number(x);return Number.isFinite(n)?n.toFixed(1)+' / 5':'N/A'}
function allowed(r){if(r.can_moderate===false)return [];const possible={pending:['approve','reject','archive','spam'],approved:['hide','archive','spam'],hidden:['archive','spam','restore'],rejected:['archive','restore'],archived:['restore']}[r.status]||[];return possible.filter(x=>x!=='restore'||S.result?.can_restore)}
function status(t){return names[t]||'Unknown'}
function feedback(t=''){if($('mg3-feedback'))$('mg3-feedback').textContent=t}
function build(){
 if(built||!$('management-reviews'))return;
 $('management-reviews').innerHTML=[
 '<header class="mg3-heading"><h2>Review Management</h2><p>Review submissions, investigate reports and recover archived feedback.</p></header>',
 '<div class="mg3-metrics" id="mg3-metrics" aria-label="Review counts"></div>',
 '<div class="mg3-search"><label for="mg3-search">Find a review</label><input id="mg3-search" type="search" maxlength="120" autocomplete="off" placeholder="Reviewer, venue or review text"></div>',
 '<div class="mg3-filters"><label for="mg3-status">Status<select id="mg3-status">',
 '<option value="all">All reviews</option><option value="pending">Pending</option><option value="approved">Published</option><option value="reported">Reported</option><option value="hidden">Hidden</option><option value="archived">Archived</option><option value="rejected">Rejected</option></select></label>',
 '<label for="mg3-sort">Sort by<select id="mg3-sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="rating_high">Highest rated</option><option value="rating_low">Lowest rated</option></select></label></div>',
 '<div class="mg3-toolbar"><span id="mg3-count">Loading reviews…</span><button type="button" id="mg3-multiple" aria-pressed="false">Manage Multiple</button></div>',
 '<div id="mg3-bulk" class="mg3-bulk" hidden><div class="mg3-bulk-top"><strong id="mg3-selected">0 selected</strong><button type="button" id="mg3-all">Select visible</button><button type="button" id="mg3-clear">Clear</button></div>',
 '<div class="mg3-bulk-controls"><label for="mg3-bulk-action">Action<select id="mg3-bulk-action"><option value="">Choose action</option></select></label><button type="button" id="mg3-apply">Review Action</button></div><p id="mg3-bulk-hint">Select up to 20 reviews.</p></div>',
 '<div id="mg3-list" class="mg3-list" aria-live="polite"></div>',
 '<div id="mg3-pager" class="mg3-pager"><button type="button" id="mg3-prev">Previous</button><span id="mg3-page">Page 1</span><button type="button" id="mg3-next">Next</button></div>',
 '<p id="mg3-feedback" class="mg3-feedback" role="status"></p>'
 ].join('');
 $('mg3-search').addEventListener('input',()=>{clearTimeout(S.debounce);S.search=$('mg3-search').value.trim();S.debounce=setTimeout(()=>{S.page=1;S.selected.clear();load()},280)});
 $('mg3-status').addEventListener('change',()=>{S.filter=$('mg3-status').value;S.page=1;S.selected.clear();load()});
 $('mg3-sort').addEventListener('change',()=>{S.sort=$('mg3-sort').value;S.page=1;S.selected.clear();load()});
 $('mg3-multiple').addEventListener('click',()=>toggleBulk(!S.bulk));
 $('mg3-all').addEventListener('click',()=>{for(const r of S.result?.rows||[]){if(S.selected.size>=20)break;if(allowed(r).length)S.selected.add(r.id)}render()});
 $('mg3-clear').addEventListener('click',()=>{S.selected.clear();render()});
 $('mg3-apply').addEventListener('click',()=>{
  const a=$('mg3-bulk-action').value,items=(S.result?.rows||[]).filter(r=>S.selected.has(r.id));
  if(!a||!items.length)return feedback('Select reviews and an action first.');
  if(items.some(r=>!allowed(r).includes(a)))return feedback('Those statuses cannot all use that action.');
  confirmAction(a,items);
 });
 $('mg3-prev').addEventListener('click',()=>{if(S.page>1){S.page--;S.selected.clear();load()}});
 $('mg3-next').addEventListener('click',()=>{if(S.page*15<Number(S.result?.total||0)){S.page++;S.selected.clear();load()}});
 built=true;
}
function toggleBulk(next){
 S.bulk=!!next;S.selected.clear();
 $('mg3-bulk').hidden=!next;
 $('mg3-multiple').setAttribute('aria-pressed',String(!!next));
 $('mg3-multiple').textContent=next?'Done':'Manage Multiple';
 if(S.result)render();
}
function renderMetrics(){
 const box=$('mg3-metrics');box.replaceChildren();
 for(const [key,label] of [['all','Total'],['pending','Pending'],['approved','Published'],['reported','Reported']]){
  const n=button('',()=>{S.filter=key;S.page=1;S.selected.clear();$('mg3-status').value=key;load()},'mg3-metric');
  n.setAttribute('aria-pressed',String(S.filter===key));
  n.setAttribute('aria-label',label+': '+Number(S.result.stats[key]||0)+'. Filter by '+label);
  n.append(el('strong','',Number(S.result.stats[key]||0)),el('small','',label));box.append(n);
 }
}
function renderBulk(){
 if(!S.bulk)return;
 const eligible=(S.result?.rows||[]).filter(r=>allowed(r).length);
 const items=eligible.filter(r=>S.selected.has(r.id));
 $('mg3-selected').textContent=items.length+' selected';
 const common=Object.keys(opts).filter(a=>items.length&&items.every(r=>allowed(r).includes(a)));
 const choice=$('mg3-bulk-action'),before=choice.value;
 choice.replaceChildren(new Option('Choose action',''));
 for(const a of common)choice.add(new Option(opts[a][0],a));
 choice.value=common.includes(before)?before:'';
 $('mg3-apply').disabled=!items.length||!common.length;
 $('mg3-all').disabled=!eligible.length||items.length===eligible.length;
 $('mg3-bulk-hint').textContent=items.length&&!common.length?'Selected reviews have incompatible statuses. Clear or adjust your selection.':'Select up to 20 reviews with compatible statuses.';
}
function card(r){
 const outer=el('div','mg3-card-wrap');if(S.selected.has(r.id))outer.classList.add('mg3-selected-card');
 if(S.bulk&&allowed(r).length){
  const select=button(S.selected.has(r.id)?'✓ Selected':'Select review',()=>{
   if(S.selected.has(r.id))S.selected.delete(r.id);
   else if(S.selected.size<20)S.selected.add(r.id);
   else return feedback('Select a maximum of 20 reviews.');
   render();
  },'mg3-selection');
  select.setAttribute('aria-pressed',String(S.selected.has(r.id)));outer.append(select);
 }
 const details=el('details','mg3-card'),summary=el('summary','mg3-card-head');
 const avatar=el('span','mg3-avatar',String(r.reviewer_name||'M').trim().charAt(0).toUpperCase());avatar.setAttribute('aria-hidden','true');
 const mid=el('span','mg3-card-main');
 mid.append(el('strong','',r.reviewer_name||'Member'),el('span','mg3-venue-name',r.venue_name||'Unknown venue'),
  el('small','',date(r.created_at)+' · '+[r.venue_city,r.venue_state].filter(Boolean).join(', ')));
 const right=el('span','mg3-card-right');
 right.append(el('span','mg3-state mg3-'+r.status,status(r.status)),el('b','mg3-score',score(r.average_score)));
 summary.append(avatar,mid,right);
 const text=r.comment?.trim()||'No written comment.';
 details.append(summary,el('p','mg3-preview',text));
 const inside=el('div','mg3-inside');
 inside.append(el('h3','','Review Comments'),el('p','mg3-comment',text));
 if(Number(r.pending_reports)>0)inside.append(el('p','mg3-report-alert',r.pending_reports+' pending report'+(r.pending_reports===1?'':'s')+' · See Notification Center for report decisions.'));
 else if(Number(r.report_history)>0)inside.append(el('p','mg3-muted',r.report_history+' earlier report'+(r.report_history===1?'':'s')+' on record.'));
 inside.append(el('h3','','Category Ratings'));
 const ratings=el('div','mg3-ratings');
 for(const [key,label] of cats){
  const n=Number(r.ratings?.[key]),v=Number.isInteger(n)&&n>=1&&n<=5?n+' / 5':'N/A';
  const line=el('div','mg3-rating');line.append(el('span','',label),el('b','',v));ratings.append(line);
 }
 inside.append(ratings);
 const acts=allowed(r);
 if(acts.length){
  inside.append(el('h3','','Moderation Actions'));
  const row=el('div','mg3-actions');
  for(const a of acts)row.append(button(opts[a][0],()=>confirmAction(a,[r]),'mg3-action mg3-action-'+a));
  inside.append(row);
 }
 if(acts.length)inside.append(el('p','mg3-muted','Actions are recorded in Activity Log. Unpublished reviews do not count toward venue ratings.'));
 details.append(inside);outer.append(details);return outer;
}
function render(){
 if(!S.result)return;
 renderMetrics();const list=$('mg3-list');list.replaceChildren();
 const data=S.result,rows=data.rows||[],total=Number(data.total||0),pages=Math.max(1,Math.ceil(total/15));
 const canManageOnPage=rows.some(r=>allowed(r).length>0);
 $('mg3-multiple').hidden=!canManageOnPage;
 if(S.bulk&&!canManageOnPage){
  S.bulk=false;S.selected.clear();$('mg3-bulk').hidden=true;
  $('mg3-multiple').setAttribute('aria-pressed','false');
  $('mg3-multiple').textContent='Manage Multiple';
 }
 $('mg3-count').textContent=total?((S.page-1)*15+1)+'–'+Math.min(S.page*15,total)+' of '+total+' reviews':'0 reviews found';
 if(rows.length)rows.forEach(r=>list.append(card(r)));
 else{const empty=el('div','mg3-empty');empty.append(el('strong','','Nothing to review here.'),el('p','','Try another status or search.'));list.append(empty)}
 $('mg3-page').textContent='Page '+S.page+' of '+pages;
 $('mg3-prev').disabled=S.page<=1;$('mg3-next').disabled=S.page>=pages;
 renderBulk();
}
async function load(message=''){
 build();const user=authUser?.id,serial=++S.serial;
 feedback(message);if(!$('mg3-list')||!authClient||!user)return;
 $('mg3-list').replaceChildren(el('p','mg3-muted','Loading reviews…'));
 $('mg3-prev').disabled=true;$('mg3-next').disabled=true;
 try{
  const {data,error}=await authClient.rpc('management_review_directory',{
   p_search:S.search,p_status:S.filter,p_sort:S.sort,p_page:S.page
  });
  if(error)throw error;
  if(serial!==S.serial||authUser?.id!==user)return;
  if(!data||!Array.isArray(data.rows)||!data.stats)throw Error('Unexpected response from Review Management.');
  S.result=data;S.selected.clear();render();
 }catch(e){
  if(serial!==S.serial)return;
  $('mg3-list').replaceChildren(el('p','mg3-empty','Unable to load reviews: '+(e.message||'Please retry.')));
  $('mg3-count').textContent='Review list unavailable';
 }
}
function makeDialog(){
 const d=document.createElement('dialog');d.id='mg3-confirm';d.className='mg3-confirm';
 d.setAttribute('aria-labelledby','mg3-confirm-title');
 const title=el('h2','','Confirm Moderation');title.id='mg3-confirm-title';title.tabIndex=-1;
 const intro=el('p','mg3-confirm-intro');intro.id='mg3-confirm-intro';
 const label=el('label','mg3-reason-label','Reason (required)');label.htmlFor='mg3-reason';
 const reason=el('textarea');reason.id='mg3-reason';reason.maxLength=500;reason.rows=3;
 const msg=el('p','mg3-dialog-message');msg.id='mg3-dialog-message';msg.setAttribute('role','status');
 const foot=el('footer','mg3-dialog-actions');
 foot.append(button('Cancel',()=>{if(!S.busy)d.close()},'mg3-cancel'));
 const save=button('Save',saveAction,'mg3-save');save.id='mg3-save';foot.append(save);
 d.append(title,intro,label,reason,msg,foot);document.body.append(d);S.dialog=d;
}
function confirmAction(action,items){
 if(S.busy||!opts[action]||!items?.length)return;
 if(!S.dialog)makeDialog();
 S.choice={action,items};
 $('mg3-confirm-title').textContent=opts[action][0]+(items.length>1?' · '+items.length+' reviews':'');
 $('mg3-confirm-intro').textContent=(items.length===1?'Review by '+items[0].reviewer_name+' at '+items[0].venue_name+'. ':'This applies to '+items.length+' reviews. ')+opts[action][2];
 $('mg3-reason').value='';
 $('mg3-reason').placeholder=action==='approve'?'Optional note for Activity Log':'Explain this decision in 5–500 characters';
 $('mg3-confirm').querySelector('label').textContent=action==='approve'?'Reason (optional)':'Reason (required)';
 $('mg3-dialog-message').textContent='';
 $('mg3-save').textContent=opts[action][1];
 S.dialog.showModal();
 $('mg3-confirm-title').focus({preventScroll:true});
}
async function saveAction(){
 if(S.busy||!S.choice||!authClient)return;
 const {action,items}=S.choice,reason=$('mg3-reason').value.trim();
 if(action!=='approve'&&(reason.length<5||reason.length>500)){
  $('mg3-dialog-message').textContent='Please enter a reason between 5 and 500 characters.';return;
 }
 S.busy=true;$('mg3-save').disabled=true;
 $('mg3-dialog-message').textContent='Saving decision…';
 const owner=authUser?.id;
 try{
  const many=items.length>1,rpc=many?'management_review_bulk_action':'management_review_action';
  const args=many?{p_review_ids:items.map(r=>r.id),p_action:action,p_reason:reason}:{p_review_id:items[0].id,p_action:action,p_reason:reason};
  const {data,error}=await authClient.rpc(rpc,args);
  if(error)throw error;if(data?.success!==true)throw Error('Unable to verify moderation update.');
  if(authUser?.id!==owner)return;
  S.dialog.close();S.choice=null;S.selected.clear();
  if(S.bulk)toggleBulk(false);
  if(typeof liveReviewCache!=='undefined')liveReviewCache.clear();
  await load(items.length===1?'Review updated and logged.':items.length+' reviews updated and logged.');
  if(typeof approvalCenterBadge==='function')void approvalCenterBadge();
 }catch(e){$('mg3-dialog-message').textContent=e.message||'Unable to save moderation action.'}
 finally{S.busy=false;if($('mg3-save'))$('mg3-save').disabled=false}
}
function managementReviewsOpen(){
 if(!authClient||!authUser)return;
 build();managementResetNavigation();
 document.querySelector('#management-dialog>.management-tools').hidden=true;
 $('management-title').hidden=true;document.querySelector('#management-dialog>p').hidden=true;
 $('management-reviews').hidden=false;$('management-reviews').scrollTop=0;
 S.page=1;S.filter='all';S.sort='newest';S.search='';S.selected.clear();
 S.bulk=false;$('mg3-bulk').hidden=true;$('mg3-multiple').textContent='Manage Multiple';$('mg3-multiple').setAttribute('aria-pressed','false');
 $('mg3-search').value='';$('mg3-status').value='all';$('mg3-sort').value='newest';
 load();
}
function managementReviewsBack(){
 ++S.serial;S.selected.clear();S.result=null;S.bulk=false;
 if(S.dialog?.open)S.dialog.close();
 managementResetNavigation();
}
window.managementReviewsOpen=managementReviewsOpen;
window.managementReviewsBack=managementReviewsBack;

/* Admins and moderators use the same Review Management surface without gaining
   Founder-only Management Portal entries or permissions. */
let staffDialog=null,staffEntry=null,staffMarker=null,staffUser=null,staffCheck=0;
function makeStaffEntry(){
 if(staffEntry||!$('management-open'))return;
 staffEntry=button('Review Management',openStaffPanel,'profile-action mg3-staff-entry');
 staffEntry.id='mg3-staff-review-entry';staffEntry.hidden=true;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('class','profile-ui-icon');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('aria-hidden','true');
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
 svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');
 svg.setAttribute('stroke-linejoin','round');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d','M5 3h14v18H5zM9 8h6M9 12h6M9 16h4');
 svg.append(path);staffEntry.prepend(svg);
 $('management-open').after(staffEntry);
 staffDialog=document.createElement('dialog');
 staffDialog.id='mg3-staff-dialog';staffDialog.className='management-dialog mg3-staff-dialog';
 staffDialog.setAttribute('aria-label','Review Management');
 const close=button('Close',()=>staffDialog.close(),'member-button mg3-staff-close');
 staffDialog.append(close);document.body.append(staffDialog);
 staffDialog.addEventListener('close',()=>{
  ++S.serial;S.selected.clear();S.result=null;S.bulk=false;
  if(S.dialog?.open)S.dialog.close();
  const section=$('management-reviews');section.hidden=true;
  if(staffMarker?.parentNode)staffMarker.replaceWith(section);
  staffMarker=null;
 });
}
async function checkStaffAccess(id){
 makeStaffEntry();const serial=++staffCheck;
 if(staffEntry)staffEntry.hidden=true;
 if(!id||!authClient)return;
 try{
  const {data,error}=await authClient.rpc('management_review_directory',{
   p_search:'',p_status:'all',p_sort:'newest',p_page:1
  });
  if(serial!==staffCheck||authUser?.id!==id)return;
  if(error)throw error;
  // Founder already has this page inside Management Portal.
  staffEntry.hidden=data?.role==='founder'||!['admin','super_admin','moderator'].includes(data?.role);
 }catch(error){if(serial===staffCheck&&staffEntry)staffEntry.hidden=true}
}
function openStaffPanel(){
 if(!authClient||!authUser||!staffDialog||!staffEntry||staffEntry.hidden)return;
 build();const root=$('management-reviews');
 if(!root||staffDialog.open)return;
 staffMarker=document.createComment('Return Review Management to Management Portal');
 root.before(staffMarker);
 staffDialog.insertBefore(root,staffDialog.firstChild);
 root.hidden=false;root.scrollTop=0;
 S.page=1;S.filter='all';S.sort='newest';S.search='';S.selected.clear();S.bulk=false;
 $('mg3-bulk').hidden=true;$('mg3-multiple').textContent='Manage Multiple';$('mg3-multiple').setAttribute('aria-pressed','false');
 $('mg3-search').value='';$('mg3-status').value='all';$('mg3-sort').value='newest';
 staffDialog.showModal();load();
}
makeStaffEntry();
if(authClient?.auth){
 authClient.auth.onAuthStateChange((_event,session)=>{
  setTimeout(()=>{
   const id=session?.user?.id;
   if(!id){++staffCheck;staffUser=null;if(staffEntry)staffEntry.hidden=true;if(staffDialog?.open)staffDialog.close();return}
   if(staffUser!==id){staffUser=id;void checkStaffAccess(id)}
  },0);
 });
 if(authUser){staffUser=authUser.id;void checkStaffAccess(authUser.id)}
}
})();
