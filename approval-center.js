/* Centralized founder approval queue. Server-side permissions are enforced by RPCs. */
let atkApprovalData=null,atkApprovalSerial=0,atkApprovalSaving=false;
const atkApprovalDays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function approvalCenterEl(tag,text,cls){
 const el=document.createElement(tag);if(text!==undefined)el.textContent=text;
 if(cls)el.className=cls;return el;
}
function approvalCenterButton(text,fn){
 const b=approvalCenterEl('button',text);b.type='button';b.addEventListener('click',fn);return b;
}
function approvalCenterMessage(t){document.getElementById('atk-approval-feedback').textContent=t;}
function approvalCenterDate(t){
 const d=new Date(t);return Number.isNaN(d.valueOf())?'Unknown date':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
}
function approvalCenterSetBadge(data){
 const count=Number(data.total_pending||0);
 document.getElementById('management-approval-count').textContent=count+' pending decision'+(count===1?'':'s')+' · New member updates';
}
function approvalCenterBadge(){
 const owner=authUser?.id;if(!owner||!authClient)return;
 authClient.rpc('founder_approval_center').then(({data,error})=>{
  if(!error&&data&&authUser?.id===owner){atkApprovalData=data;approvalCenterSetBadge(data);}
 }).catch(()=>{});
}
function approvalCenterOpen(){
 if(!authClient||!authUser)return;
 managementResetNavigation();
 document.querySelector('#management-dialog>.management-tools').hidden=true;
 document.getElementById('management-title').hidden=true;
 document.querySelector('#management-dialog>p').hidden=true;
 document.getElementById('management-approvals').hidden=false;
 document.getElementById('management-approvals').scrollTop=0;
 document.getElementById('management-dialog').scrollTop=0;
 document.getElementById('atk-approval-filter').value='all';
 approvalCenterMessage('');
 approvalCenterRefresh();
}
function approvalCenterBack(){
 ++atkApprovalSerial;
 document.getElementById('management-approvals').hidden=true;
 document.querySelector('#management-dialog>.management-tools').hidden=false;
 document.getElementById('management-title').hidden=false;
 document.querySelector('#management-dialog>p').hidden=false;
 document.getElementById('management-dialog').scrollTop=0;
 approvalCenterBadge();
}
async function approvalCenterRefresh(success=''){
 const request=++atkApprovalSerial,owner=authUser?.id;
 document.getElementById('atk-approval-summary').textContent='Checking pending approvals…';
 try{
  const {data,error}=await authClient.rpc('founder_approval_center');
  if(error)throw error;
  if(!data||!Array.isArray(data.venues)||!Array.isArray(data.hosting)||!Array.isArray(data.recent_members))throw Error('Unexpected approval results');
  if(request!==atkApprovalSerial||authUser?.id!==owner||document.getElementById('management-approvals').hidden)return;
  atkApprovalData=data;approvalCenterSetBadge(data);approvalCenterRender();
  approvalCenterMessage(success);
 }catch(e){
  if(request!==atkApprovalSerial)return;
  document.getElementById('atk-approval-summary').textContent='Unable to load pending items.';
  document.getElementById('atk-approval-results').replaceChildren();
  approvalCenterMessage(e.message||'Please try again.');
 }
}
function approvalCenterGroup(root,label){root.append(approvalCenterEl('h3',label,'atk-approval-group-label'));}
function approvalCenterDetails(title,subtitle){
 const card=approvalCenterEl('details',undefined,'atk-approval-card');
 const summary=approvalCenterEl('summary');
 const text=approvalCenterEl('span');
 text.append(approvalCenterEl('strong',title),approvalCenterEl('small',subtitle));
 summary.append(text,approvalCenterEl('span','›','atk-approval-chevron'));
 card.append(summary);
 const inside=approvalCenterEl('div',undefined,'atk-approval-details');card.append(inside);
 return {card,inside};
}
function approvalCenterVenueCard(v){
 const visible=v.publication_status==='under_review'?'Under Review · Visible':'Submitted · Hidden';
 const {card,inside}=approvalCenterDetails(v.name,[v.city,v.state].filter(Boolean).join(', ')+' · '+visible);
 inside.append(approvalCenterEl('p',[v.address_line1,v.city,v.state,v.postal_code].filter(Boolean).join(', ')));
 inside.append(approvalCenterEl('p','Approve to publish. Decline archives the listing and keeps it recoverable.','atk-approval-note'));
 const reason=approvalCenterEl('textarea',undefined,'atk-approval-reason');
 reason.hidden=true;reason.maxLength=400;reason.placeholder='Reason for declining (required)';
 reason.setAttribute('aria-label','Reason for declining venue');
 inside.append(reason);
 const actions=approvalCenterEl('div',undefined,'atk-approval-actions');
 const decline=approvalCenterButton('Decline',()=>{
  if(reason.hidden){reason.hidden=false;decline.textContent='Confirm Decline';approve.textContent='Approve';reason.focus();return;}
  if(reason.value.trim().length<5){approvalCenterMessage('Please enter at least five characters explaining the decline.');reason.focus();return;}
  approvalCenterVenueAction(v,'archived','Declined in Approval Center: '+reason.value.trim(),card);
 });
 const approve=approvalCenterButton('Approve',()=>{
  if(approve.textContent!=='Confirm Publish'){
   approve.textContent='Confirm Publish';reason.hidden=true;decline.textContent='Decline';
   approvalCenterMessage('Publishing makes this venue publicly visible. Select Confirm Publish to proceed.');return;
  }
  approvalCenterVenueAction(v,'published','Approved in Approval Center after review of venue submission.',card);
 });
 const rights=atkApprovalData?.capabilities||{};
 if(rights.venue_decline_archive)actions.append(decline);
 if(rights.venue_publish)actions.append(approve);
 inside.append(actions);
 return card;
}
async function approvalCenterVenueAction(v,status,reason,card){
 if(atkApprovalSaving)return;
 atkApprovalSaving=true;const buttons=[...card.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 approvalCenterMessage('Saving venue decision…');
 try{
  const {data,error}=await authClient.rpc('founder_set_venue_publication',{
   p_venue_id:v.id,p_status:status,p_reason:reason
  });
  if(error)throw error;
  if(!Array.isArray(data)||!data.some(x=>x.id===v.id&&x.publication_status===status))throw Error('Decision could not be confirmed');
  atkApprovalSaving=false;
  await approvalCenterRefresh(status==='published'?'Venue published. Decision recorded in Activity History.':'Venue declined and archived. It remains recoverable from Venue Management.');
 }catch(e){atkApprovalSaving=false;buttons.forEach(b=>b.disabled=false);approvalCenterMessage('Unable to save venue decision: '+(e.message||'Please retry.'));}
}
function approvalCenterDuration(start,end){
 const valid=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!valid.test(start)||!valid.test(end))return 0;
 const mins=t=>{const p=t.split(':').map(Number);return p[0]*60+p[1];};
 return (mins(end)-mins(start)+1440)%1440;
}
function approvalCenterHostingCard(r){
 const {card,inside}=approvalCenterDetails(r.venue_display_name||r.venue_name||'Unknown venue',
  (r.host_name||'KJ member')+' · '+(r.sessions||[]).length+' proposed night(s) · Pending');
 inside.append(approvalCenterEl('p','Host: '+(r.host_name||'KJ member')));
 const published=r.venue_published&&r.venue_status==='published';
 if(!published)inside.append(approvalCenterEl('p','Publish the venue first before approving public karaoke nights.','atk-approval-note'));
 if(r.notes)inside.append(approvalCenterEl('p',r.notes));
 const rows=[];
 for(const s of r.sessions||[]){
  const line=approvalCenterEl('div',undefined,'atk-host-time-row');
  line.append(approvalCenterEl('strong',atkApprovalDays[s.day]||'Unknown day'));
  const fields={};
  for(const key of ['start','end']){
   const label=approvalCenterEl('label',key==='start'?'Starts':'Ends');
   const input=document.createElement('input');input.type='time';input.value=s[key]||'';
   input.setAttribute('aria-label',(atkApprovalDays[s.day]||'Karaoke')+' '+key+' time');
   label.append(input);line.append(label);fields[key]=input;
  }
  rows.push({day:s.day,start:fields.start,end:fields.end});inside.append(line);
 }
 const warning=approvalCenterEl('p','','atk-host-warning');inside.append(warning);
 const reason=approvalCenterEl('textarea',undefined,'atk-approval-reason');
 reason.hidden=true;reason.maxLength=400;reason.placeholder='Reason for rejection (required)';
 reason.setAttribute('aria-label','Reason for rejecting hosting request');inside.append(reason);
 const actions=approvalCenterEl('div',undefined,'atk-approval-actions');
 const sessions=()=>rows.map(row=>({day:Number(row.day),start:row.start.value,end:row.end.value}));
 const check=()=>{
  let problem='';
  for(const row of rows){
   const duration=approvalCenterDuration(row.start.value,row.end.value);
   if(duration===0)problem='Enter a valid start and end time for each day.';
   else if(duration>720)problem=(atkApprovalDays[row.day]||'This night')+' is '+(duration/60).toFixed(1)+' hours long. Check AM/PM; midnight is 12:00 AM.';
   if(problem)break;
  }
  warning.textContent=problem;
  approve.disabled=!!problem||!published||atkApprovalSaving;
  return !problem;
 };
 const reject=approvalCenterButton('Reject',()=>{
  if(reason.hidden){reason.hidden=false;reject.textContent='Confirm Reject';approve.textContent='Approve Schedule';reason.focus();return;}
  if(reason.value.trim().length<5){approvalCenterMessage('Rejection reason must be at least five characters.');reason.focus();return;}
  approvalCenterHostingAction(r,'rejected',null,reason.value.trim(),card);
 });
 const approve=approvalCenterButton('Approve Schedule',()=>{
  if(!check()||!published)return;
  if(approve.textContent!=='Confirm Approval'){
   approve.textContent='Confirm Approval';reason.hidden=true;reject.textContent='Reject';
   approvalCenterMessage('These times will become public. Select Confirm Approval to publish them.');return;
  }
  approvalCenterHostingAction(r,'approved',sessions(),null,card);
 });
 for(const row of rows)for(const field of [row.start,row.end]){
  field.addEventListener('input',()=>{approve.textContent='Approve Schedule';check();});
  field.addEventListener('change',()=>{approve.textContent='Approve Schedule';check();});
 }
 const rights=atkApprovalData?.capabilities||{};
 if(rights.hosting_reject)actions.append(reject);
 if(rights.hosting_approve)actions.append(approve);
 inside.append(actions);check();
 return card;
}
async function approvalCenterHostingAction(r,action,sessions,reason,card){
 if(atkApprovalSaving)return;
 atkApprovalSaving=true;const buttons=[...card.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 approvalCenterMessage(action==='approved'?'Publishing approved karaoke nights…':'Rejecting hosting request…');
 try{
  const {data,error}=await authClient.rpc('founder_review_kj_host_request',{
   p_request_id:r.id,p_action:action,p_sessions:sessions,p_reason:reason
  });
  if(error)throw error;
  if(data?.status!==action)throw Error('Decision could not be confirmed');
  atkApprovalSaving=false;
  await approvalCenterRefresh(action==='approved'?'KJ hosting nights approved and published. Decision recorded in Activity History.':'KJ request rejected. No nights published. Decision recorded in Activity History.');
 }catch(e){atkApprovalSaving=false;buttons.forEach(b=>b.disabled=false);approvalCenterMessage('Unable to review hosting request: '+(e.message||'Please retry.'));}
}
function approvalCenterMemberOpen(member){
 if(!member?.id||!authClient||!authUser)return;
 const profile={
  id:member.id,
  stage_name:member.stage_name||'Karaoke member',
  role:member.role||'member',
  verified:member.verified===true,
  joined_at:member.created_at
 };
 document.getElementById('management-approvals').hidden=true;
 managementMemberOpen(profile,'approvals');
 document.getElementById('management-dialog').scrollTop=0;
}
function approvalCenterRender(){
 const data=atkApprovalData,root=document.getElementById('atk-approval-results');
 root.replaceChildren();
 if(!data)return;
 const section=document.getElementById('management-approvals');
 if(section)section.scrollTop=0;
 const total=Number(data.total_pending||0);
 const venues=Array.isArray(data.venues)?data.venues:[];
 const hosting=Array.isArray(data.hosting)?data.hosting:[];
 const members=Array.isArray(data.recent_members)?data.recent_members:[];
 const summary=document.getElementById('atk-approval-summary');
 summary.textContent=total
  ? total+' item'+(total===1?'':'s')+' awaiting review · '+Number(data.venue_count||0)+' venue'+(Number(data.venue_count||0)===1?'':'s')+' · '+Number(data.hosting_count||0)+' KJ request'+(Number(data.hosting_count||0)===1?'':'s')
  : 'All caught up — no approvals waiting.';
 const filter=document.getElementById('atk-approval-filter').value;
 const showVenues=filter==='all'||filter==='venues';
 const showHosting=filter==='all'||filter==='hosting';
 const showMembers=filter==='all'||filter==='members';
 if(showVenues&&(venues.length||filter==='venues')){
  approvalCenterGroup(root,'Venue submissions'+(venues.length?' · '+venues.length:''));
  if(!venues.length)root.append(approvalCenterEl('p','No venue submissions waiting for review.','atk-approval-muted'));
  for(const venue of venues)root.append(approvalCenterVenueCard(venue));
 }
 if(showHosting&&(hosting.length||filter==='hosting')){
  approvalCenterGroup(root,'KJ hosting requests'+(hosting.length?' · '+hosting.length:''));
  if(!hosting.length)root.append(approvalCenterEl('p','No pending KJ hosting nights.','atk-approval-muted'));
  for(const request of hosting)root.append(approvalCenterHostingCard(request));
 }
 if(showMembers&&(members.length||filter==='members')){
  approvalCenterGroup(root,'New members · '+members.length);
  root.append(approvalCenterEl('p','Accounts are active when registered. Tap a member to see their management profile.','atk-approval-muted'));
  if(!members.length)root.append(approvalCenterEl('p','No new members in the last seven days.','atk-approval-muted'));
  for(const member of members){
   const c=approvalCenterButton('',()=>approvalCenterMemberOpen(member));
   c.className='atk-approval-member atk-approval-member-link';
   c.setAttribute('aria-label','View member profile: '+(member.stage_name||'Karaoke member'));
   const info=approvalCenterEl('span',undefined,'atk-approval-member-info');
   info.append(approvalCenterEl('strong',member.stage_name||'Karaoke member'),
    approvalCenterEl('small','Joined '+approvalCenterDate(member.created_at)+' · '+(member.verified?'Verified member':'Account active')));
   c.append(info,approvalCenterEl('span','›','atk-approval-chevron'));
   root.append(c);
  }
 }
}