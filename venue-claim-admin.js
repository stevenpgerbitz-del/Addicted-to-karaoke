/* ATK Build 149: Founder-only claim review in existing Approval Center. */
(function(){
 'use strict';
 if(typeof approvalCenterRender!=='function'||typeof approvalCenterRefresh!=='function')return;
 let claims=[],claimCount=0,loadNumber=0;
 const filter=document.getElementById('atk-approval-filter');
 if(filter&&!filter.querySelector('option[value="claims"]')){
  const opt=document.createElement('option');opt.value='claims';opt.textContent='Venue ownership claims';
  const photos=filter.querySelector('option[value="photos"]');
  filter.insertBefore(opt,photos||null);
 }
 const beforeSetBadge=approvalCenterSetBadge;
 approvalCenterSetBadge=function(data){
  beforeSetBadge(data);
  if(!data)return;
  const cnt=Number(data.total_pending||0)+Number(data.report_count||0)+Number(data.photo_count||0)+claimCount;
  const members=(data.recent_members||[]).filter(m=>!atkDismissedMemberIds?.has(m.id)).length;
  const target=document.getElementById('management-approval-count');
  if(target)target.textContent=cnt+' pending decision'+(cnt===1?'':'s')+(members?' · '+members+' new member'+(members===1?'':'s'):'');
 };
 async function fetchClaims(){
  const {data,error}=await authClient.from('venue_claim_requests')
   .select('id,venue_id,claimant_user_id,contact_name,contact_email,contact_phone,relationship,verification_details,created_at,status,venues(name,city,state)')
   .eq('status','pending').order('created_at',{ascending:true}).limit(150);
  if(error)throw error;
  return data||[];
 }
 const originalBadge=approvalCenterBadge;
 approvalCenterBadge=async function(){
  const uid=authUser?.id;
  await originalBadge.apply(this,arguments);
  if(!uid||!authClient)return;
  try{
   const {count,error}=await authClient.from('venue_claim_requests')
    .select('id',{count:'exact',head:true}).eq('status','pending');
   if(error)throw error;
   if(authUser?.id!==uid)return;
   claimCount=count||0;
   if(atkApprovalData)approvalCenterSetBadge(atkApprovalData);
  }catch(error){console.warn('Venue claim approval count unavailable',error)}
 };
 const originalRefresh=approvalCenterRefresh;
 approvalCenterRefresh=async function(message=''){
  const serial=++loadNumber,uid=authUser?.id;
  claims=[];claimCount=0;
  await originalRefresh.apply(this,arguments);
  if(!uid||!authClient||document.getElementById('management-approvals').hidden)return;
  try{
   const result=await fetchClaims();
   if(serial!==loadNumber||authUser?.id!==uid||document.getElementById('management-approvals').hidden)return;
   claims=result;claimCount=result.length;
   approvalCenterRender();
   if(atkApprovalData)approvalCenterSetBadge(atkApprovalData);
  }catch(error){
   approvalCenterMessage('Unable to load venue ownership claims: '+(error.message||'Please try again.'));
  }
 };
 function makeClaimCard(c){
  const rel={owner:'Owner',manager:'Manager',authorized_representative:'Authorized Representative'}[c.relationship]||c.relationship;
  const {card,inside}=approvalCenterDetails(c.venues?.name||'Venue',
   c.contact_name+' · '+rel+' · Submitted '+approvalCenterDate(c.created_at));
  const details=[
   'Venue: '+[c.venues?.name,c.venues?.city,c.venues?.state].filter(Boolean).join(', '),
   'Contact name: '+c.contact_name,
   'Work email: '+c.contact_email,
   'Contact phone: '+(c.contact_phone||'Not provided'),
   'Relationship: '+rel,
   'Verification information: '+c.verification_details
  ];
  for(const line of details)inside.append(approvalCenterEl('p',line,'atk-approval-note'));
  inside.append(approvalCenterEl('p','Review the claim independently before approving. Approval grants verified ownership for this specific venue.','atk-approval-note'));
  const reason=approvalCenterEl('textarea',undefined,'atk-approval-reason');
  reason.maxLength=500;reason.placeholder='Reason for declining (at least five characters)';
  reason.setAttribute('aria-label','Reason for declining ownership claim');
  reason.hidden=true;
  inside.append(reason);
  const actions=approvalCenterEl('div',undefined,'atk-approval-actions');
  const approve=approvalCenterButton('Approve',()=>{
   if(approve.textContent!=='Confirm Approval'){
    reason.hidden=true;decline.textContent='Decline';approve.textContent='Confirm Approval';
    approvalCenterMessage('Verify ownership details before granting access to this venue. Confirm Approval to proceed.');
    return;
   }
   decide(c,'approve',null,card);
  });
  const decline=approvalCenterButton('Decline',()=>{
   if(reason.hidden){reason.hidden=false;approve.textContent='Approve';decline.textContent='Confirm Decline';reason.focus();return}
   if(reason.value.trim().length<5){approvalCenterMessage('Enter a reason of at least five characters.');reason.focus();return}
   decide(c,'decline',reason.value.trim(),card);
  });
  actions.append(decline,approve);inside.append(actions);
  return card;
 }
 async function decide(c,action,reason,card){
  if(atkApprovalSaving||!authUser||!authClient)return;
  atkApprovalSaving=true;
  const buttons=[...card.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  approvalCenterMessage('Reviewing ownership claim…');
  try{
   const {data,error}=await authClient.rpc('founder_decide_venue_claim',{
    p_claim_id:c.id,p_decision:action,p_reason:reason
   });
   if(error)throw error;
   if(data?.ok!==true||data.claim_id!==c.id||data.status!==(action==='approve'?'approved':'declined'))
    throw Error('The claim decision could not be confirmed.');
   atkApprovalSaving=false;
   await approvalCenterRefresh(action==='approve'
    ?'Verified venue ownership approved. Access is limited to the approved venue.'
    :'Ownership request declined. The member can submit a new request later.');
  }catch(error){
   approvalCenterMessage('Could not review claim: '+(error.message||'Please try again.'));
   buttons.forEach(b=>b.disabled=false);
  }finally{atkApprovalSaving=false}
 }
 const originalRender=approvalCenterRender;
 approvalCenterRender=function(){
  originalRender.apply(this,arguments);
  const current=filter?.value||'all';
  if(current!=='all'&&current!=='claims')return;
  const root=document.getElementById('atk-approval-results');
  if(!root)return;
  if(claims.length||current==='claims'){
   const firstMember=[...root.querySelectorAll('.atk-approval-group-label')]
    .find(h=>h.textContent.startsWith('New members'));
   const bucket=document.createDocumentFragment();
   const header=approvalCenterEl('h3','Venue Ownership Claims · '+claims.length,'atk-approval-group-label');
   bucket.append(header);
   if(!claims.length)bucket.append(approvalCenterEl('p','No venue ownership requests waiting for review.','atk-approval-muted'));
   for(const c of claims)bucket.append(makeClaimCard(c));
   // Member headings are wrapped by approval-center.js for the Hide all action.
   // Insert beside the wrapper (a direct child of root), not inside it.
   const memberSection=firstMember?.closest('.atk-approval-member-heading')||firstMember;
   if(memberSection?.parentElement===root)root.insertBefore(bucket,memberSection);
   else root.append(bucket);
  }
  const summary=document.getElementById('atk-approval-summary');
  if(summary&&atkApprovalData){
   const total=Number(atkApprovalData.total_pending||0)
     +Number(atkApprovalData.report_count||0)+Number(atkApprovalData.photo_count||0)+claimCount;
   if(total)summary.textContent=total+' item'+(total===1?'':'s')+' awaiting review · '+claimCount+' ownership claim'+(claimCount===1?'':'s');
   else summary.textContent='All caught up — no approvals waiting.';
  }
 };
})();
