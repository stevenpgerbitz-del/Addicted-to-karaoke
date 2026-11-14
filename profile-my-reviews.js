/* v179 — My Reviews: signed-in member's published reviews (read-only). */
(function(){
 'use strict';
 const PAGE_SIZE=10;
 const categories={kj_host:'KJ / Host',food:'Food',venue_size:'Venue Size',
   song_selection:'Song Selection',wait_time:'Wait Time',
   sound_quality:'Sound Quality',atmosphere:'Atmosphere'};
 let request=0,page=0,owner=null;
 const el=(tag,cls,txt)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=String(txt);
  return node;
 };
 const host=()=>document.getElementById('atk-my-reviews');
 const active=()=>typeof authUser!=='undefined'&&authUser?.id&&typeof authClient!=='undefined'&&authClient;
 const date=(value)=>{
  const d=new Date(value);
  return Number.isNaN(d.valueOf())?'Date unavailable':
   d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
 };
 function ratingSummary(ratings){
  const valid=(Array.isArray(ratings)?ratings:[])
   .map(item=>Number(item.score))
   .filter(n=>Number.isFinite(n)&&n>=1&&n<=5);
  return valid.length?(valid.reduce((sum,n)=>sum+n,0)/valid.length).toFixed(1)+' / 5':'Not rated';
 }
 function appendText(parent,tag,cls,value){const child=el(tag,cls,value);parent.append(child);return child;}
 function statusLine(root,message){
  root.replaceChildren(el('p','atk-my-reviews-message',message));
 }
 async function openVenueFromReview(venueId,status){
  status.textContent='';
  try{
   if(window.liveVenueLoadPromise)await window.liveVenueLoadPromise;
   if(!active())return;
   const venue=typeof sampleVenues!=='undefined'?
    sampleVenues.find(v=>v.databaseId===venueId&&v.publication_status==='published'):null;
   if(!venue){status.textContent='This venue is not available right now.';return;}
   if(typeof profileCloseSection==='function'&&
      document.getElementById('profile-section-dialog')?.open)profileCloseSection();
   openVenue(venue.id);
  }catch(e){status.textContent='Could not open this venue. Please try again.';}
 }
 function card(review){
  const ratings=Array.isArray(review.review_ratings)?review.review_ratings:[];
  const venue=review.venues||{};
  const details=el('details','atk-my-review-card');
  const summary=el('summary','atk-my-review-summary');
  const left=el('span','atk-my-review-identity');
  appendText(left,'strong','',venue.name||'Karaoke venue');
  appendText(left,'small','',[venue.city,venue.state].filter(Boolean).join(', ')+' · '+date(review.created_at));
  const score=el('strong','atk-my-review-score','★ '+ratingSummary(ratings));
  summary.append(left,score);
  details.append(summary);
  const body=el('div','atk-my-review-body');
  if(review.comment?.trim())appendText(body,'p','atk-my-review-comment',review.comment.trim());
  else appendText(body,'p','atk-my-review-muted','No written review.');
  if(ratings.length){
   const grid=el('div','atk-my-review-ratings');
   for(const category of Object.keys(categories)){
    const r=ratings.find(item=>item.category===category);
    if(!r)continue;
    const line=el('div','atk-my-review-rating');
    appendText(line,'span','',categories[category]);
    appendText(line,'strong','',r.score===null?'N/A':String(r.score)+' / 5');
    grid.append(line);
   }
   if(grid.children.length)body.append(grid);
  }
  const feedback=el('p','atk-my-review-feedback');
  const visit=el('button','atk-my-review-open','View Venue');
  visit.type='button';
  visit.addEventListener('click',()=>openVenueFromReview(review.venue_id,feedback));
  body.append(visit,feedback);
  details.append(body);
  return details;
 }
 async function load(nextPage=0){
  const root=host();
  if(!root)return;
  const generation=++request;
  page=Math.max(0,nextPage);
  if(!active()){
   owner=null;
   statusLine(root,'Sign in to see your published reviews.');
   return;
  }
  const user=authUser.id;
  owner=user;
  statusLine(root,'Loading your published reviews…');
  try{
   // RLS permits approved reviews for published venues; an explicit author filter
   // prevents showing anyone else's review in a signed-in member's profile.
   const result=await authClient.from('reviews')
    .select('id,venue_id,created_at,comment,review_ratings(category,score),venues(name,city,state,slug)',{count:'exact'})
    .eq('reviewer_id',user).eq('status','approved')
    .order('created_at',{ascending:false})
    .range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
   if(result.error)throw result.error;
   if(generation!==request||!host()||owner!==user||authUser?.id!==user)return;
   const rows=Array.isArray(result.data)?result.data:[];
   const total=Number(result.count||0);
   if(total&&page>0&&!rows.length){load(Math.floor((total-1)/PAGE_SIZE));return;}
   root.replaceChildren();
   appendText(root,'p','atk-my-reviews-count',
    total+' published review'+(total===1?'':'s'));
   if(!total){
    appendText(root,'p','atk-my-reviews-message',
     'You haven’t published any reviews yet. Review a venue and it will appear here once approved.');
    return;
   }
   const list=el('div','atk-my-reviews-list');
   for(const row of rows)list.append(card(row));
   root.append(list);
   if(total>PAGE_SIZE){
    const bar=el('div','atk-my-reviews-pager');
    const prev=el('button','','Previous');
    prev.type='button';prev.disabled=page===0;
    prev.addEventListener('click',()=>load(page-1));
    appendText(bar,'span','','Page '+(page+1)+' of '+Math.ceil(total/PAGE_SIZE));
    const next=el('button','','Next');
    next.type='button';next.disabled=(page+1)*PAGE_SIZE>=total;
    next.addEventListener('click',()=>load(page+1));
    bar.prepend(prev);bar.append(next);root.append(bar);
   }
  }catch(e){
   if(generation!==request||owner!==user||authUser?.id!==user)return;
   statusLine(root,'Could not load reviews. Check your connection and try again.');
   const retry=el('button','atk-my-review-open','Retry');
   retry.type='button';retry.addEventListener('click',()=>load(page));root.append(retry);
  }
 }
 // Mobile: called after the section moves into the existing modal.
 window.atkMyReviewsLoad=()=>load(0);
 // Desktop: its accordion opens inline.
 document.addEventListener('toggle',e=>{
  if(e.target?.matches?.('#atk-my-reviews-entry')&&e.target.open)load(0);
 },true);
 // Invalidate in-flight results after a sign-out and avoid stale review cards.
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&host()&&owner&&authUser?.id!==owner)
   load(0);
 });
})();
