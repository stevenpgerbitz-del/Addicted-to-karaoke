/* Build 137 - Member review form and privacy-aware reviewer cards. */
(function(){
 'use strict';
 const categories=[
  ['kj_host','KJ / Host'],['food','Food'],['venue_size','Venue Size'],
  ['song_selection','Song Selection'],['wait_time','Wait Time'],
  ['sound_quality','Sound Quality'],['atmosphere','Atmosphere']
 ];
 const labels={singer:'Singer',kj:'KJ / Host',venue_owner:'Venue Owner'};
 const mic='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M6 10a6 6 0 0 0 12 0M12 16v6m-4 0h8"/></svg>';
 let reviewDialog=null, authorDialog=null, ratings=new Map(), sending=false, activeVenue=null, authorLoadSerial=0;
 function element(tag,cls,value){
  const x=document.createElement(tag);if(cls)x.className=cls;
  if(value!==undefined)x.textContent=String(value);return x;
 }
 function get(id){return document.getElementById(id)}
 function currentVenue(){return typeof sampleVenues!=='undefined'?sampleVenues.find(v=>v.id===selectedVenue):null}
 function makeReviewDialog(){
  if(reviewDialog)return;
  reviewDialog=document.createElement('dialog');
  reviewDialog.id='atk-write-review-dialog';
  reviewDialog.className='atk-review-dialog';
  reviewDialog.setAttribute('aria-labelledby','atk-write-review-title');
  reviewDialog.innerHTML=[
   '<form id="atk-review-form">',
   '<header class="atk-review-header"><span class="atk-review-eyebrow">YOUR KARAOKE EXPERIENCE</span>',
   '<h2 id="atk-write-review-title">Write a Review</h2><p id="atk-review-venue-name"></p></header>',
   '<div class="atk-review-scroll">',
   '<div class="atk-review-score-heading"><div><strong>Rate your visit</strong><small>Choose 1–5 microphones, or N/A.</small></div>',
   '<span id="atk-review-average" class="atk-review-average">— / 5</span></div>',
   '<div id="atk-review-rating-list" class="atk-review-rating-list"></div>',
   '<p class="atk-review-hint">N/A categories are excluded from your overall rating.</p>',
   '<label for="atk-review-comment" class="atk-review-comment-label">Tell us about your night <small>(optional)</small></label>',
   '<textarea id="atk-review-comment" maxlength="1500" rows="3" placeholder="What made the night great? Anything other singers should know?"></textarea>',
   '<p class="atk-review-hint">Reviews go to Pending Approval before appearing publicly.</p>',
   '</div><p id="atk-review-feedback" class="atk-review-feedback" role="status" aria-live="polite"></p>',
   '<footer class="atk-review-footer"><button id="atk-review-cancel" type="button">Cancel</button>',
   '<button id="atk-review-submit" type="submit">Submit Review</button></footer></form>'
  ].join('');
  document.body.append(reviewDialog);
  const list=get('atk-review-rating-list');
  for(const [key,name] of categories){
   const row=element('div','atk-review-rating-row');
   const label=element('span','atk-review-rating-label',name);
   label.id='atk-review-label-'+key;
   const group=element('div','atk-review-rating-options');
   group.setAttribute('role','group');group.setAttribute('aria-labelledby',label.id);
   for(const score of [1,2,3,4,5,null]){
    const b=element('button','atk-review-rate');
    b.type='button';b.dataset.reviewCategory=key;b.dataset.score=score===null?'na':String(score);
    b.setAttribute('aria-label',score===null?'Not applicable':score+' out of 5');
    b.setAttribute('aria-pressed','false');
    if(score===null)b.textContent='N/A';
    else{b.innerHTML=mic+'<span>'+score+'</span>'}
    b.addEventListener('click',()=>{ratings.set(key,score);paintRatings()});
    group.append(b);
   }
   row.append(label,group);list.append(row);
  }
  get('atk-review-cancel').addEventListener('click',()=>{if(!sending)reviewDialog.close()});
  get('atk-review-form').addEventListener('submit',submitReview);
 }
 function paintRatings(){
  for(const b of reviewDialog.querySelectorAll('[data-review-category]')){
   const value=ratings.get(b.dataset.reviewCategory);
   const selected=(value===null&&b.dataset.score==='na')||(value!==null&&b.dataset.score===String(value));
   b.setAttribute('aria-pressed',String(selected));
  }
  const values=Array.from(ratings.values()).filter(v=>Number.isInteger(v));
  const avg=values.length?(values.reduce((sum,n)=>sum+n,0)/values.length).toFixed(1)+' / 5':'— / 5';
  get('atk-review-average').textContent=avg;
 }
 async function openReviewForm(){
  if(typeof authUser==='undefined'||!authUser||!authClient){
   message('Sign in to write a review. Only Verified members can submit reviews.');
   navigate('signin');return;
  }
  const venue=currentVenue();
  if(!venue||!venue.databaseId){message('This venue is not available for reviews.');return}
  const userId=authUser.id;
  try{
   const {data,error}=await authClient.rpc('get_my_review_privileges');
   if(error)throw error;
   if(authUser?.id!==userId)return;
   if(!data?.verified){message('Only Verified members can write reviews. Request verification for your account first.');return}
   if(data.mode==='suspended'){
    const until=data.suspended_until?new Date(data.suspended_until).toLocaleString():'a later date';
    message('Review privileges suspended until '+until+'.');return;
   }
  }catch(error){
   message('Unable to check review permissions right now. Please try again.');return;
  }
  if(authUser?.id!==userId||selectedVenue!==venue.id)return;
  makeReviewDialog();
  activeVenue=venue.databaseId;sending=false;
  ratings=new Map(categories.map(([key])=>[key,null]));
  get('atk-review-venue-name').textContent=venue.name;
  get('atk-review-comment').value='';
  get('atk-review-feedback').textContent='';
  get('atk-review-submit').disabled=false;
  paintRatings();reviewDialog.showModal();
 }
 async function submitReview(event){
  event.preventDefault();if(sending)return;
  if(!authClient||!authUser){get('atk-review-feedback').textContent='Please sign in to submit your review.';return}
  const values=Object.fromEntries(Array.from(ratings).filter(([,v])=>Number.isInteger(v)));
  if(!Object.keys(values).length){
   get('atk-review-feedback').textContent='Choose a rating for at least one category.';return;
  }
  const comment=get('atk-review-comment').value.trim();
  if(comment&&comment.length<10){
   get('atk-review-feedback').textContent='Write at least 10 characters, or leave the comment blank.';return;
  }
  sending=true;
  const submit=get('atk-review-submit');submit.disabled=true;submit.textContent='Submitting…';
  get('atk-review-feedback').textContent='Submitting your review…';
  try{
   const {data,error}=await authClient.rpc('submit_venue_review',{
    p_venue_id:activeVenue,p_comment:comment,p_ratings:values
   });
   if(error)throw error;
   if(data?.status==='suspended'){
    const until=data.until?new Date(data.until).toLocaleString():'a later date';
    get('atk-review-feedback').textContent='Your review privileges are suspended until '+until+'. The review was not submitted.';
    return;
   }
   if(data?.status!=='pending')throw Error('Unexpected review response.');
   reviewDialog.close();
   message('Review submitted! It is awaiting approval.');
  }catch(error){
   const detail=String(error?.message||'Please try again.');
   get('atk-review-feedback').textContent=detail;
  }finally{
   sending=false;submit.disabled=false;submit.textContent='Submit Review';
  }
 }
 function makeAuthorDialog(){
  if(authorDialog)return;
  authorDialog=document.createElement('dialog');
  authorDialog.id='atk-review-author-dialog';
  authorDialog.className='atk-review-dialog atk-review-author-dialog';
  authorDialog.setAttribute('aria-labelledby','atk-review-author-title');
  authorDialog.innerHTML=[
   '<h2 id="atk-review-author-title">Member Profile</h2>',
   '<div id="atk-review-author-content" class="atk-review-author-content" aria-live="polite"></div>',
   '<footer class="atk-review-footer"><button type="button" id="atk-review-author-close">Close</button></footer>'
  ].join('');
  document.body.append(authorDialog);
  get('atk-review-author-close').addEventListener('click',()=>authorDialog.close());
  authorDialog.addEventListener('close',()=>{++authorLoadSerial});
 }
 async function showAuthor(review){
  const serial=++authorLoadSerial;
  makeAuthorDialog();
  const content=get('atk-review-author-content');content.replaceChildren(element('p','atk-review-muted','Loading profile…'));
  authorDialog.showModal();
  const reviewerId=review.reviewer_id;
  if(!reviewerId){
   content.replaceChildren(element('strong','atk-review-demo-name',review.display_name||'Sample Reviewer'),
    element('p','atk-review-muted','This is a demonstration review, not a registered member profile.'));
   return;
  }
  try{
   if(!authClient)throw Error('Member profiles are temporarily unavailable.');
   const {data,error}=await authClient.rpc('review_author_card',{p_user_id:reviewerId});
   if(error)throw error;
   if(!authorDialog.open||serial!==authorLoadSerial)return;
   content.replaceChildren();
   if(!data?.visible){
    content.append(element('strong','atk-review-demo-name',review.display_name||'Member'),
     element('p','atk-review-muted','This member has chosen not to share their profile with you.'));
    return;
   }
   const head=element('div','atk-review-author-head');
   const avatar=element('span','atk-review-author-avatar',String(data.stage_name||'?').trim().charAt(0).toUpperCase());
   if(data.avatar_path){
    const src=authClient.storage.from('member-avatars').getPublicUrl(data.avatar_path).data?.publicUrl;
    if(src){const image=element('img');image.src=src;image.alt='';image.loading='lazy';avatar.replaceChildren(image)}
   }
   const identity=element('div','atk-review-author-identity');
   identity.append(element('strong','',data.stage_name||review.display_name||'Member'));
   const meta=[];
   if(data.member_number!=null)meta.push('Member #'+String(data.member_number).padStart(6,'0'));
   if(data.joined_at){
    const joined=new Date(data.joined_at);
    if(!Number.isNaN(joined.getTime()))meta.push('Joined '+joined.toLocaleDateString(undefined,{month:'short',year:'numeric'}));
   }
   if(meta.length)identity.append(element('small','',meta.join(' · ')));
   head.append(avatar,identity);content.append(head);
   const badges=element('div','atk-review-author-badges');
   if(data.verified)badges.append(element('span','','✓ Verified'));
   if(data.founder)badges.append(element('span','atk-review-founder','★ Founder'));
   if(badges.childElementCount)content.append(badges);
   const interests=Array.isArray(data.interests)?data.interests.map(k=>labels[k]).filter(Boolean):[];
   if(interests.length){
    content.append(element('h3','','Karaoke Interests'),element('p','',interests.join(' · ')));
   }
   if(String(data.bio||'').trim()){
    content.append(element('h3','','My Story'),element('p','atk-review-author-bio',data.bio.trim()));
   }
   if(!interests.length&&!String(data.bio||'').trim())content.append(element('p','atk-review-muted','This member has not added a public story yet.'));
  }catch(error){
   if(authorDialog.open&&serial===authorLoadSerial)content.replaceChildren(element('p','atk-review-muted','This member profile is unavailable right now.'));
   console.warn('Member review profile could not load',error);
  }
 }
 function attachProfileAction(card,review){
  const summary=card.querySelector('summary'),avatar=summary?.querySelector('.review-avatar');
  const name=summary?.querySelector('.review-main strong');
  if(!summary||!avatar||!name)return;
  const avatarButton=element('button','atk-review-author-avatar-button');
  avatarButton.type='button';avatarButton.setAttribute('aria-label','View profile for '+(review.display_name||'reviewer'));
  avatar.replaceWith(avatarButton);avatarButton.append(avatar);
  const nameButton=element('button','atk-review-author-name-button',review.display_name||'Guest');
  nameButton.type='button';nameButton.setAttribute('aria-label','View profile for '+(review.display_name||'reviewer'));
  name.replaceWith(nameButton);
  if(!review.reviewer_id)nameButton.after(element('span','atk-review-demo-badge','Demo'));
  const action=event=>{event.preventDefault();event.stopPropagation();showAuthor(review)};
  avatarButton.addEventListener('click',action);nameButton.addEventListener('click',action);
 }
 function populateMemberAvatars(rows,cards){
  if(!authClient)return;
  const ids=[...new Set(rows.map(r=>r.reviewer_id).filter(Boolean))];
  if(!ids.length)return;
  authClient.from('member_profiles').select('user_id,avatar_path').in('user_id',ids)
   .then(({data,error})=>{
    if(error||!Array.isArray(data))return;
    const paths=new Map(data.filter(m=>m.avatar_path).map(m=>[m.user_id,m.avatar_path]));
    cards.forEach((card,index)=>{
     const path=paths.get(rows[index]?.reviewer_id),avatar=card.querySelector('.review-avatar');
     if(!path||!avatar||!card.isConnected)return;
     const url=authClient.storage.from('member-avatars').getPublicUrl(path).data?.publicUrl;
     if(!url)return;
     const image=new Image();image.alt='';image.loading='lazy';
     image.onload=()=>{if(avatar.isConnected)avatar.replaceChildren(image)};
     image.src=url;
    });
   }).catch(error=>console.warn('Review avatar lookup unavailable',error));
 }
 const previousRender=window.renderLiveReviews;
 if(typeof previousRender==='function'){
  window.renderLiveReviews=function(rows){
   previousRender(rows);
   const panel=document.getElementById('content');
   const intro=panel.querySelector('.heading + .muted');
   if(intro){
    const sampleCount=rows.filter(r=>!r.reviewer_id).length;
    intro.textContent=rows.length+' approved review'+(rows.length===1?'':'s')+(sampleCount?' · '+sampleCount+' demo sample'+(sampleCount===1?'':'s'):'')+' · Tap a review to see all seven ratings';
   }
   const cards=panel.querySelectorAll('.review-card');
   cards.forEach((card,index)=>{if(rows[index])attachProfileAction(card,rows[index])});
   populateMemberAvatars(rows,Array.from(cards));
   const action=panel.querySelector('button.direction');
   if(action){action.removeAttribute('onclick');action.onclick=openReviewForm;action.type='button'}
  };
 }
 window.atkReviewOpen=openReviewForm;
})();
