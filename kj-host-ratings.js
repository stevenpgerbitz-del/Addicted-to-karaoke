/* A2K build 194: verified KJ ratings, not venue reviews. */
(function(){
'use strict';
var CATEGORIES=[
 {key:'host_personality',label:'Host Personality'},
 {key:'rotation_fairness',label:'Song Rotation & Fairness'},
 {key:'sound_quality',label:'Sound Quality'},
 {key:'song_selection',label:'Song Selection'},
 {key:'crowd_engagement',label:'Crowd Engagement'}
];
var state={host:null,venueId:null,hostVenues:[],reviews:[],score:null,sort:'newest',draft:{},mode:'list',busy:false};
var reviewDialog,moderationDialog;
function db(){return typeof authClient!=='undefined'?authClient:null}
function user(){return typeof authUser!=='undefined'?authUser:null}
function el(tag,cls,text){
 var e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=String(text);
 return e;
}
function localDate(){
 var d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function cleanError(e){return e?.message||'Could not complete this request. Please retry.'}
function average(r){
 var values=CATEGORIES.map(x=>r[x.key]).filter(x=>x!==null&&x!==undefined&&Number.isFinite(Number(x)));
 return values.length?values.reduce((a,b)=>a+Number(b),0)/values.length:0;
}
function closeReview(){if(reviewDialog?.open&&!state.busy)reviewDialog.close()}
function updateActionBar(){
 var form=state.mode==='compose';
 reviewDialog.querySelector('#a2k-kj-compose').hidden=!form;
 reviewDialog.querySelector('#a2k-kj-list').hidden=form;
 reviewDialog.querySelector('#a2k-kj-write').hidden=form || !user() || user().id===state.host?.user_id;
 reviewDialog.querySelector('#a2k-kj-submit').hidden=!form;
 reviewDialog.querySelector('#a2k-kj-cancel-form').hidden=!form;
 reviewDialog.querySelector('#a2k-kj-close').hidden=form;
}
function makeReviewDialog(){
 reviewDialog=document.createElement('dialog');
 reviewDialog.id='a2k-kj-review-dialog';reviewDialog.className='a2k-kj-dialog';
 reviewDialog.setAttribute('aria-labelledby','a2k-kj-heading');
 reviewDialog.innerHTML=
 '<div class="a2k-kj-inner">'+
 '<h2 id="a2k-kj-heading">KJ Reviews</h2>'+
 '<p id="a2k-kj-intro">Independent ratings for verified karaoke hosts.</p>'+
 '<div id="a2k-kj-overall" class="a2k-kj-summary">No reviews yet</div>'+
 '<div class="a2k-kj-body">'+
 '<section id="a2k-kj-list"><label>Sort reviews'+
 '<select id="a2k-kj-sort"><option value="newest">Newest first</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select>'+
 '</label><div id="a2k-kj-review-list"></div></section>'+
 '<form id="a2k-kj-compose" hidden>'+
 '<p>Rate the KJ, not the venue. Select N/A when a category does not apply.</p>'+
 '<label>When did you attend?<input type="date" name="attended_on" required></label>'+
 '<label>Venue (optional)<select name="venue_id"><option value="">Other / not listed</option></select></label>'+
 '<div id="a2k-kj-rating-questions"></div>'+
 '<label>Tell us about the host (optional)<textarea name="comment" maxlength="1000" placeholder="Share what fellow singers should know…"></textarea></label>'+
 '<p>Reviews are held for moderation before appearing publicly. You can submit one review per KJ for each performance date.</p>'+
 '</form></div>'+
 '<div id="a2k-kj-feedback" class="a2k-kj-feedback" role="status" aria-live="polite"></div>'+
 '<div class="a2k-kj-actions">'+
 '<button id="a2k-kj-write" type="button">Rate This KJ</button>'+
 '<button id="a2k-kj-submit" type="button" hidden>Submit Review</button>'+
 '<button id="a2k-kj-cancel-form" type="button" hidden>Cancel</button>'+
 '<button id="a2k-kj-close" type="button">Close</button>'+
 '</div></div>';
 document.body.append(reviewDialog);
 reviewDialog.querySelector('#a2k-kj-close').onclick=closeReview;
 reviewDialog.querySelector('#a2k-kj-write').onclick=()=>{state.mode='compose';state.draft={};renderCompose();updateActionBar()};
 reviewDialog.querySelector('#a2k-kj-cancel-form').onclick=()=>{state.mode='list';reviewDialog.querySelector('#a2k-kj-feedback').textContent='';updateActionBar()};
 reviewDialog.querySelector('#a2k-kj-submit').onclick=submit;
 reviewDialog.querySelector('#a2k-kj-compose').addEventListener('submit',e=>{e.preventDefault();submit()});
 reviewDialog.querySelector('#a2k-kj-sort').onchange=e=>{state.sort=e.target.value;renderReviews()};
 reviewDialog.addEventListener('cancel',e=>{if(state.busy){e.preventDefault()}});
}
async function open(hostId,venueId){
 var client=db();if(!client)return;
 state.host=null;state.venueId=venueId||null;state.mode='list';state.reviews=[];
 var {data:host,error}=await client.from('kj_review_hosts').select('user_id,stage_name,enabled').eq('user_id',hostId).eq('enabled',true).maybeSingle();
 if(error||!host){return}
 state.host=host;reviewDialog.querySelector('#a2k-kj-heading').textContent=host.stage_name+' · KJ Reviews';
 reviewDialog.querySelector('#a2k-kj-feedback').textContent='';
 reviewDialog.querySelector('#a2k-kj-overall').textContent='Loading ratings…';
 reviewDialog.querySelector('#a2k-kj-review-list').textContent='Loading reviews…';
 updateActionBar();
 if(!reviewDialog.open)reviewDialog.showModal();
 await reload();
}
async function reload(){
 if(!state.host)return;
 var client=db(),id=state.host.user_id;
 try{
  var [summary,links]=await Promise.all([
   client.from('kj_review_scores').select('review_count,average_score').eq('host_user_id',id).maybeSingle(),
   client.from('kj_review_venues').select('venue_id').eq('host_user_id',id)
  ]);
  if(summary.error)throw summary.error;
  if(links.error)throw links.error;
  state.score=summary.data;
  var ids=(links.data||[]).map(x=>x.venue_id);
  state.hostVenues=[];
  if(ids.length){
   var venues=await client.from('venues').select('id,name,city').in('id',ids);
   if(venues.error)throw venues.error;
   state.hostVenues=venues.data||[];
  }
  var results=[],batch=0;
  while(batch<10){
   var page=await client.from('kj_reviews')
    .select('id,reviewer_name,venue_id,attended_on,host_personality,rotation_fairness,sound_quality,song_selection,crowd_engagement,comment,created_at')
    .eq('host_user_id',id).eq('status','approved')
    .order('created_at',{ascending:false}).range(batch*500,batch*500+499);
   if(page.error)throw page.error;
   results.push(...(page.data||[]));
   if(!page.data||page.data.length<500)break;
   batch++;
  }
  state.reviews=results;
  var count=Number(state.score?.review_count)||0;
  var avg=Number(state.score?.average_score);
  reviewDialog.querySelector('#a2k-kj-overall').textContent=count?
   '🎤 '+avg.toFixed(1)+' / 5 · '+count+' approved review'+(count===1?'':'s') :
   'No approved reviews yet';
  renderReviews();
 }catch(e){
  reviewDialog.querySelector('#a2k-kj-review-list').textContent='Could not load KJ reviews.';
  reviewDialog.querySelector('#a2k-kj-feedback').textContent=cleanError(e);
 }
}
function renderReviews(){
 var container=reviewDialog.querySelector('#a2k-kj-review-list');
 container.replaceChildren();
 var rows=state.reviews.slice();
 if(state.sort==='highest')rows.sort((a,b)=>average(b)-average(a)||new Date(b.created_at)-new Date(a.created_at));
 if(state.sort==='lowest')rows.sort((a,b)=>average(a)-average(b)||new Date(b.created_at)-new Date(a.created_at));
 if(!rows.length){container.append(el('p','', 'No approved reviews yet. Be the first singer to share your experience!'));return}
 for(var item of rows){
  var card=el('article','a2k-kj-review-card');
  var head=el('header');
  head.append(el('strong','',item.reviewer_name||'Karaoke Member'));
  head.append(el('strong','', '🎤 '+average(item).toFixed(1)+' / 5'));
  card.append(head);
  var venue=state.hostVenues.find(v=>v.id===item.venue_id);
  card.append(el('small','a2k-kj-date',
   new Date(item.attended_on+'T12:00:00').toLocaleDateString()+(venue?' · '+venue.name:'') ));
  if(item.comment)card.append(el('p','',item.comment));
  var details=el('details');
  details.append(el('summary','', 'Category ratings'));
  var scores=el('div','a2k-kj-scores');
  for(var c of CATEGORIES){
   var val=item[c.key];
   scores.append(el('div','',c.label+': '+(val==null?'N/A':('🎤 '.repeat(Number(val))+val+'/5'))));
  }
  details.append(scores);card.append(details);container.append(card);
 }
 if((state.score?.review_count||0)>state.reviews.length){
  container.append(el('p','', 'Displaying '+state.reviews.length+' of '+state.score.review_count+' reviews.'));
 }
}
function renderCompose(){
 var form=reviewDialog.querySelector('#a2k-kj-compose');
 form.reset();
 var day=form.elements.attended_on;
 day.value=localDate();day.max=localDate();
 var oneYear=new Date();oneYear.setFullYear(oneYear.getFullYear()-1);
 day.min=[oneYear.getFullYear(),String(oneYear.getMonth()+1).padStart(2,'0'),String(oneYear.getDate()).padStart(2,'0')].join('-');
 var select=form.elements.venue_id;
 while(select.options.length>1)select.remove(1);
 for(var v of state.hostVenues){
  var option=document.createElement('option');option.value=v.id;option.textContent=v.name+(v.city?' · '+v.city:'');select.append(option);
 }
 if(state.venueId && state.hostVenues.some(x=>x.id===state.venueId))select.value=state.venueId;
 var root=form.querySelector('#a2k-kj-rating-questions');root.replaceChildren();
 for(let category of CATEGORIES){
  var section=el('section','a2k-kj-category');
  section.append(el('strong','',category.label));
  let group=el('div','a2k-kj-rating-choices');
  for(let score of [0,1,2,3,4,5]){
   let b=el('button','',score===0?'N/A':'🎤 '+score);
   b.type='button';b.dataset.key=category.key;b.dataset.score=String(score);
   b.setAttribute('aria-label',category.label+': '+(score===0?'not applicable':score+' of 5 microphones'));
   b.setAttribute('aria-pressed',score===0?'true':'false');
   b.onclick=()=>{state.draft[category.key]=score;
    for(var btn of group.children)btn.setAttribute('aria-pressed',String(Number(btn.dataset.score)===score));};
   group.append(b);
  }
  section.append(group);root.append(section);state.draft[category.key]=0;
 }
}
async function submit(){
 if(state.busy||!state.host)return;
 if(!user()){reviewDialog.querySelector('#a2k-kj-feedback').textContent='Please sign in before submitting a review.';return}
 var form=reviewDialog.querySelector('#a2k-kj-compose');
 if(!form.reportValidity())return;
 if(user().id===state.host.user_id){reviewDialog.querySelector('#a2k-kj-feedback').textContent='You cannot rate your own KJ profile.';return}
 var ratings=CATEGORIES.filter(c=>state.draft[c.key]>0);
 if(!ratings.length){reviewDialog.querySelector('#a2k-kj-feedback').textContent='Please rate at least one category.';return}
 var payload={
  host_user_id:state.host.user_id,reviewer_id:user().id,
  venue_id:form.elements.venue_id.value||null,attended_on:form.elements.attended_on.value,
  comment:form.elements.comment.value.trim(),status:'pending'
 };
 for(var c of CATEGORIES)payload[c.key]=state.draft[c.key]||null;
 state.busy=true;var button=reviewDialog.querySelector('#a2k-kj-submit');button.disabled=true;
 try{
  var saved=await db().from('kj_reviews').insert(payload);
  if(saved.error)throw saved.error;
  state.mode='list';updateActionBar();
  reviewDialog.querySelector('#a2k-kj-feedback').textContent='Review submitted for approval. Thank you for helping fellow singers!';
  await reload();
 }catch(e){
  reviewDialog.querySelector('#a2k-kj-feedback').textContent=
   e.code==='23505'?'You have already reviewed this host for that performance date.':cleanError(e);
 }finally{state.busy=false;button.disabled=false}
}
// Venue-linked KJs are shown with the schedule, not below Call / Share.
async function venueHosts(venueId){
 var client=db();if(!venueId||!client)return [];
 var links=await client.from('kj_review_venues').select('host_user_id').eq('venue_id',venueId);
 if(links.error)throw links.error;
 var ids=[...new Set((links.data||[]).map(x=>x.host_user_id).filter(Boolean))];
 if(!ids.length)return [];
 var hosts=await client.from('kj_review_hosts')
   .select('user_id,stage_name').eq('enabled',true).in('user_id',ids);
 if(hosts.error)throw hosts.error;
 return (hosts.data||[]).map(h=>({id:h.user_id,name:h.stage_name}))
   .filter(h=>h.id&&h.name);
}
function refreshVenueHostButtons(){
 document.getElementById('a2k-kj-rate-links')?.remove();
}
async function refreshSelfKjProfile(){
 var anchor=document.getElementById('atk-kj-profile-entry');
 if(!anchor)return;
 var button=document.getElementById('a2k-kj-self-reviews');
 if(!button){
  button=el('button','profile-nav-card atk-profile-card-link');
  button.id='a2k-kj-self-reviews';button.type='button';button.hidden=true;
  button.append(el('span','profile-nav-title','🎤 My KJ Reviews'));
  button.append(el('small','', 'See your public KJ rating and singer feedback'));
  anchor.insertAdjacentElement('afterend',button);
 }
 button.hidden=true;
 if(!user()||!db())return;
 var id=user().id;
 var row=await db().from('kj_review_hosts').select('user_id').eq('user_id',id).eq('enabled',true).maybeSingle();
 if(!row.error&&row.data && user()?.id===id){
  button.hidden=false;button.onclick=()=>open(id,null);
 }
}
function makeModerationDialog(){
 moderationDialog=document.createElement('dialog');
 moderationDialog.className='a2k-kj-dialog';moderationDialog.id='a2k-kj-moderation-dialog';
 moderationDialog.innerHTML='<div class="a2k-kj-inner">'+
 '<h2>KJ Review Moderation</h2><p>Review new singer feedback before publication. All decisions are audited.</p>'+
 '<label>Show reviews<select id="a2k-kj-moderation-filter">'+
 '<option value="pending">Pending</option><option value="approved">Approved</option>'+
 '<option value="hidden">Hidden</option><option value="rejected">Rejected</option></select></label>'+
 '<div class="a2k-kj-body"><div id="a2k-kj-moderation-list"></div></div>'+
 '<div id="a2k-kj-moderation-status" class="a2k-kj-feedback" role="status"></div>'+
 '<div class="a2k-kj-actions"><button id="a2k-kj-moderation-close" type="button">Close</button></div></div>';
 document.body.append(moderationDialog);
 moderationDialog.querySelector('#a2k-kj-moderation-close').onclick=()=>moderationDialog.close();
 moderationDialog.querySelector('#a2k-kj-moderation-filter').onchange=refreshModeration;

}
function ensureKjReviewManagementEntry(){
 var panel=document.getElementById('management-reviews');
 if(!panel || document.getElementById('a2k-kj-management-entry'))return;
 var button=el('button','a2k-kj-mini-button a2k-kj-review-switch','🎤 Manage KJ Host Reviews');
 button.id='a2k-kj-management-entry';button.type='button';button.hidden=true;
 button.onclick=moderationOpen;
 var header=panel.querySelector('.mg3-heading');
 if(header)header.insertAdjacentElement('afterend',button);
 else panel.prepend(button);
 db()?.rpc('is_platform_admin').then(result=>{
   button.hidden=result?.error || result?.data!==true;
 }).catch(()=>{button.hidden=true});
}
async function moderationOpen(){
 if(!db()||!user())return;
 var admin=await db().rpc('is_platform_admin');
 if(admin.error||admin.data!==true)return;
 moderationDialog.showModal();await refreshModeration();
}
async function refreshModeration(){
 var list=moderationDialog.querySelector('#a2k-kj-moderation-list'),status=moderationDialog.querySelector('#a2k-kj-moderation-status');
 list.textContent='Loading…';status.textContent='';
 var desired=moderationDialog.querySelector('#a2k-kj-moderation-filter').value;
 try{
  var result=await db().from('kj_reviews')
   .select('id,host_user_id,reviewer_name,venue_id,attended_on,host_personality,rotation_fairness,sound_quality,song_selection,crowd_engagement,comment,created_at,status')
   .eq('status',desired).order('created_at',{ascending:false}).limit(200);
  if(result.error)throw result.error;
  var rows=result.data||[];list.replaceChildren();
  if(!rows.length){list.append(el('p','', 'No '+desired+' KJ reviews.'));return}
  var ids=[...new Set(rows.map(x=>x.host_user_id))];
  var hostResult=await db().from('kj_review_hosts').select('user_id,stage_name').in('user_id',ids);
  var hosts=hostResult.data||[];
  for(let r of rows){
   var card=el('article','a2k-kj-review-card');
   var host=hosts.find(x=>x.user_id===r.host_user_id);
   card.append(el('strong','', (host?.stage_name||'KJ Host')+' · '+r.reviewer_name));
   card.append(el('p','',r.attended_on+' · 🎤 '+average(r).toFixed(1)+'/5'));
   if(r.comment)card.append(el('p','',r.comment));
   var details=el('details');details.append(el('summary','', 'Category ratings'));
   var box=el('div','a2k-kj-scores');
   for(var cat of CATEGORIES)box.append(el('div','',cat.label+': '+(r[cat.key]===null?'N/A':r[cat.key]+'/5')));
   details.append(box);card.append(details);
   var actions=el('div','a2k-kj-review-moderate');
   for(let action of [{status:'approved',label:'Approve'},{status:'hidden',label:'Hide'},{status:'rejected',label:'Reject'}]){
    if(action.status===r.status)continue;
    let b=el('button','',action.label);b.type='button';
    b.onclick=async()=>{
     b.disabled=true;
     var save=await db().from('kj_reviews').update({status:action.status}).eq('id',r.id).select('id').single();
     if(save.error){status.textContent=cleanError(save.error);b.disabled=false;return}
     status.textContent='Review '+action.status+'.';await refreshModeration();
    };
    actions.append(b);
   }
   card.append(actions);list.append(card);
  }
 }catch(e){list.textContent='Could not load reviews.';status.textContent=cleanError(e)}
}
function init(){
 if(!document.querySelector('#venue-screen .actions')||!document.getElementById('management-dialog'))return;
 makeReviewDialog();makeModerationDialog();
 if(typeof window.managementReviewsOpen==='function'){
  var originalReviewManagementOpen=window.managementReviewsOpen;
  window.managementReviewsOpen=function(){
   var result=originalReviewManagementOpen.apply(this,arguments);
   ensureKjReviewManagementEntry();
   return result;
  };
 }

 if(typeof window.openVenue==='function'){
  var originalOpen=window.openVenue;
  window.openVenue=function(){
   var result=originalOpen.apply(this,arguments);
   refreshVenueHostButtons();
   return result;
  };
 }
 if(typeof window.memberLoad==='function'){
  var originalMemberLoad=window.memberLoad;
  window.memberLoad=async function(){
   var result=await originalMemberLoad.apply(this,arguments);
   await refreshSelfKjProfile();
   return result;
  };
 }
 if(!document.getElementById('venue-screen').hidden)refreshVenueHostButtons();
 if(user())refreshSelfKjProfile();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
window.a2kKjRatings={open:open,refreshVenue:refreshVenueHostButtons,venueHosts:venueHosts};
})();