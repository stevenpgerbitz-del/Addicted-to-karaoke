/* A2K build 211: show approved host ratings beside schedule names, plus profile-integrated reviews.
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

const ratingCategories=[
  {key:'host_personality',label:'Host Personality'},
  {key:'rotation_fairness',label:'Song Rotation & Fairness'},
  {key:'sound_quality',label:'Sound Quality'},
  {key:'song_selection',label:'Song Selection'},
  {key:'crowd_engagement',label:'Crowd Engagement'}
];
function reviewAverage(review){
  const nums=ratingCategories.map(c=>Number(review[c.key])).filter(v=>v>=1&&v<=5);
  return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0;
}
function dateLabel(value){
  const date=new Date(String(value).slice(0,10)+'T12:00:00');
  return Number.isNaN(date.getTime())?'Unknown date':date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function todayLocal(){
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function previewReviews(){
  return [
    {id:'preview-1',reviewer_name:'Karaoke Fan',attended_on:'2026-11-14',
     venue_name:"Doc's Lounge",host_personality:5,rotation_fairness:5,
     sound_quality:4,song_selection:5,crowd_engagement:5,
     comment:'Great energy and a fair rotation. Everyone had a chance to sing.'},
    {id:'preview-2',reviewer_name:'Saturday Singer',attended_on:'2026-11-07',
     venue_name:"Doc's Lounge",host_personality:4,rotation_fairness:4,
     sound_quality:5,song_selection:4,crowd_engagement:4,
     comment:'Friendly host, clear sound, and a fun night of karaoke.'}
  ];
}
function reviewCard(review,venueName){
  const card=element('article','a2k-kj-host-review-card');
  const header=element('div','a2k-kj-host-review-heading');
  header.append(element('strong','',review.reviewer_name||'Karaoke Member'),
    element('strong','', '🎤 '+reviewAverage(review).toFixed(1)+'/5'));
  card.append(header);
  const where=element('p','a2k-kj-host-review-location',
    'Rated at '+(venueName||'Venue not specified')+' · '+dateLabel(review.attended_on));
  card.append(where);
  if(review.comment)card.append(element('p','a2k-kj-host-review-comment',review.comment));
  const details=element('details','a2k-kj-host-review-details');
  details.append(element('summary','','Category ratings'));
  const scores=element('div','a2k-kj-host-review-scores');
  for(const c of ratingCategories){
    const score=Number(review[c.key]);
    scores.append(element('div','',c.label+': '+(score>=1&&score<=5?score+'/5':'N/A')));
  }
  details.append(scores);card.append(details);
  return card;
}
async function mountRatings(hostId,venueId,demo,root){
  const section=element('section','a2k-kj-host-rating-section');
  const details=element('details','a2k-kj-host-rating-details');
  const summary=element('summary','a2k-kj-host-rating-summary');
  const score=element('strong','','🎤 KJ Reviews');
  const count=element('span','','Loading ratings…');
  summary.append(score,count);
  details.append(summary);
  const list=element('div','a2k-kj-host-review-list');
  list.hidden=true;
  details.append(list);
  const action=element('button','a2k-kj-rate-action','Rate This KJ');
  action.type='button';action.hidden=true;
  const formMount=element('div','a2k-kj-host-review-compose');
  formMount.hidden=true;
  const feedback=element('p','a2k-kj-host-rating-feedback');
  feedback.setAttribute('role','status');
  section.append(details,action,formMount,feedback);
  root.append(section);
  let eligible=demo,reviewCount=0,loaded=0,loading=false,hasMore=false;
  let venueNames=new Map(),venueOptions=[],draft={},started=false;
  const demoRows=demo?previewReviews():[];
  const showStatus=(msg)=>{feedback.textContent=msg;};
  const loadVenues=async(ids)=>{
    const need=ids.filter(id=>id&&!venueNames.has(id));
    if(!need.length)return;
    const response=await authClient.from('venues').select('id,name,city').in('id',[...new Set(need)]);
    if(response.error)throw response.error;
    for(const venue of response.data||[])venueNames.set(venue.id,venue.name);
  };
  const addReviewRows=async()=>{
    if(loading||!hasMore)return;
    loading=true;
    const more=list.querySelector('.a2k-kj-host-review-more');
    if(more)more.disabled=true;
    try{
      let rows;
      if(demo){rows=demoRows.slice(loaded,loaded+5);}
      else{
        const response=await authClient.from('kj_reviews')
          .select('id,reviewer_name,venue_id,attended_on,host_personality,rotation_fairness,sound_quality,song_selection,crowd_engagement,comment,created_at')
          .eq('host_user_id',hostId).eq('status','approved')
          .order('created_at',{ascending:false}).range(loaded,loaded+4);
        if(response.error)throw response.error;
        rows=response.data||[];
        await loadVenues(rows.map(item=>item.venue_id));
      }
      if(more)more.remove();
      for(const review of rows){
        list.append(reviewCard(review,demo?review.venue_name:venueNames.get(review.venue_id)));
      }
      loaded+=rows.length;
      hasMore=loaded<reviewCount&&rows.length>0;
      if(hasMore){
        const next=element('button','a2k-kj-host-review-more','Show more reviews');
        next.type='button';next.onclick=addReviewRows;list.append(next);
      }else if(!loaded)list.append(element('p','a2k-kj-host-review-empty',
        'No approved reviews yet. Be the first to share your karaoke experience.'));
    }catch(e){showStatus('Could not load KJ reviews. Please try again.');console.warn('KJ reviews',e)}
    finally{loading=false;if(more?.isConnected)more.disabled=false}
  };
  details.addEventListener('toggle',()=>{
    if(!details.open)return;
    list.hidden=false;
    if(!started&&eligible){started=true;addReviewRows();}
    if(!eligible)list.replaceChildren(element('p','','Reviews will be available after host verification.'));
  });
  const startRating=async()=>{
    if(!demo&&!authUser){showStatus('Please sign in to rate this KJ.');return;}
    if(!demo&&authUser?.id===hostId){showStatus('You cannot rate yourself.');return;}
    if(!eligible)return;
    formMount.hidden=false;action.hidden=true;details.open=false;showStatus('');
    try{
      if(!demo){
        const linked=await authClient.from('kj_review_venues')
          .select('venue_id').eq('host_user_id',hostId);
        if(linked.error)throw linked.error;
        const ids=[...new Set((linked.data||[]).map(row=>row.venue_id))];
        await loadVenues(ids);
        venueOptions=ids.map(id=>({id,name:venueNames.get(id)||'Venue'}));
      }else venueOptions=[{id:'preview-docs',name:"Doc's Lounge"}];
      buildForm();
    }catch(e){showStatus('Unable to prepare review form. Please try again.');formMount.hidden=true;action.hidden=false;}
  };
  function buildForm(){
    draft={};
    formMount.replaceChildren();
    const form=element('form','a2k-kj-inline-review-form');
    form.noValidate=false;
    form.append(element('h3','','Rate This KJ'));
    const dateLabelEl=element('label','', 'When did you attend?');
    const date=element('input');date.type='date';date.name='attended_on';date.required=true;
    date.value=todayLocal();date.max=todayLocal();
    const yearAgo=new Date();yearAgo.setFullYear(yearAgo.getFullYear()-1);
    date.min=[yearAgo.getFullYear(),String(yearAgo.getMonth()+1).padStart(2,'0'),String(yearAgo.getDate()).padStart(2,'0')].join('-');
    dateLabelEl.append(date);form.append(dateLabelEl);
    const venueLabel=element('label','', 'Where did you see this KJ?');
    const select=element('select');select.name='venue_id';
    const empty=element('option','','Other / not listed');empty.value='';select.append(empty);
    for(const venue of venueOptions){
      const option=element('option','',venue.name);
      option.value=venue.id;select.append(option);
    }
    if(venueId&&venueOptions.some(x=>x.id===venueId))select.value=venueId;
    if(demo)select.value='preview-docs';
    venueLabel.append(select);form.append(venueLabel);
    for(const category of ratingCategories){
      const group=element('fieldset','a2k-kj-inline-category');
      group.append(element('legend','',category.label));
      const choices=element('div','a2k-kj-inline-choices');
      draft[category.key]=0;
      for(const value of [0,1,2,3,4,5]){
        const choice=element('button','',value===0?'N/A':String(value));
        choice.type='button';choice.dataset.score=String(value);
        choice.setAttribute('aria-label',category.label+': '+(value===0?'not applicable':value+' out of 5'));
        choice.setAttribute('aria-pressed',String(value===0));
        choice.onclick=()=>{
          draft[category.key]=value;
          for(const button of choices.children)
            button.setAttribute('aria-pressed',String(Number(button.dataset.score)===value));
        };
        choices.append(choice);
      }
      group.append(choices);form.append(group);
    }
    const commentLabel=element('label','', 'Your review (optional)');
    const comment=element('textarea');comment.name='comment';comment.maxLength=1000;
    comment.rows=3;comment.placeholder='Share what fellow singers should know…';
    commentLabel.append(comment);form.append(commentLabel);
    form.append(element('p','a2k-kj-inline-note',demo?
      'Demo preview only. This form does not submit a real review.':
      'New KJ ratings are held for moderation before appearing publicly.'));
    const buttons=element('div','a2k-kj-inline-actions');
    const cancel=element('button','','Cancel');cancel.type='button';
    cancel.onclick=()=>{formMount.hidden=true;formMount.replaceChildren();action.hidden=false;showStatus('');};
    const send=element('button','','Submit Review');send.type='submit';
    buttons.append(cancel,send);form.append(buttons);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!form.reportValidity())return;
      if(!ratingCategories.some(c=>draft[c.key]>0)){
        showStatus('Please rate at least one category.');return;
      }
      if(demo){
        showStatus('Preview complete. No review was saved.');
        formMount.hidden=true;formMount.replaceChildren();action.hidden=false;return;
      }
      if(!authUser||authUser.id===hostId){showStatus('Sign in with a different account to rate this KJ.');return;}
      send.disabled=true;cancel.disabled=true;showStatus('Submitting your review…');
      const payload={
        host_user_id:hostId,reviewer_id:authUser.id,
        venue_id:select.value||null,attended_on:date.value,
        comment:comment.value.trim(),status:'pending'
      };
      for(const c of ratingCategories)payload[c.key]=draft[c.key]||null;
      try{
        const saved=await authClient.from('kj_reviews').insert(payload);
        if(saved.error)throw saved.error;
        showStatus('Review submitted for moderation. Thank you!');
        formMount.hidden=true;formMount.replaceChildren();action.hidden=false;
      }catch(error){
        showStatus(error.code==='23505'?
          'You already reviewed this KJ for that performance date.':
          (error.message||'Could not submit review. Please try again.'));
      }finally{send.disabled=false;cancel.disabled=false;}
    });
    formMount.append(form);
    date.focus();
  }
  action.onclick=startRating;
  if(demo){
    reviewCount=demoRows.length;
    score.textContent='🎤 4.5 / 5';
    count.textContent='2 sample reviews · Demo';
    eligible=true;hasMore=true;action.hidden=false;
    return;
  }
  if(!hostId||typeof authClient==='undefined'||!authClient){
    count.textContent='Ratings unavailable';return;
  }
  try{
    const [host,stats]=await Promise.all([
      authClient.from('kj_review_hosts').select('user_id,enabled').eq('user_id',hostId).eq('enabled',true).maybeSingle(),
      authClient.from('kj_review_scores').select('review_count,average_score').eq('host_user_id',hostId).maybeSingle()
    ]);
    if(!root.isConnected)return;
    if(host.error)throw host.error;
    if(!host.data){count.textContent='Awaiting verified KJ status';return;}
    eligible=true;
    if(stats.error)throw stats.error;
    reviewCount=Math.max(0,Number(stats.data?.review_count)||0);
    if(reviewCount){
      const average=Number(stats.data?.average_score)||0;
      score.textContent='🎤 '+average.toFixed(1)+' / 5';
    }else score.textContent='🎤 Not rated yet';
    count.textContent=reviewCount+' approved review'+(reviewCount===1?'':'s')+' · View details';
    hasMore=true;action.hidden=false;
  }catch(e){
    count.textContent='Ratings unavailable';
    console.warn('KJ rating summary unavailable',e);
  }
}

function renderCard(profile,{venueName='',day='',timeRange='',venueId=null,demo=false}={}){
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
  mountRatings(profile.user_id||null,venueId,demo,box);
  if(venueName){
    const schedule=element('section','a2k-kj-host-profile-schedule');
    schedule.append(element('h3','','Hosting Schedule'));
    schedule.append(element('strong','a2k-kj-host-profile-venue',venueName));
    if(day||timeRange){
      const when=[day,timeRange].filter(Boolean).join(' · ');
      schedule.append(element('p','a2k-kj-host-profile-hours',when));
    }
    box.append(schedule);
  }
  box.append(element('h3','','About the Host'));
  box.append(element('p','a2k-kj-host-profile-bio',
    profile.bio?.trim()||'This host has not added an About Me description yet.'));
  if(profile.created_at&&!demo){
    const time=new Date(profile.created_at);
    if(!Number.isNaN(time.getTime()))box.append(element('p','a2k-kj-host-profile-since',
      'A2K member since '+time.toLocaleDateString('en-US',{month:'long',year:'numeric'})));
  }
  if(demo)box.append(element('p','a2k-kj-host-profile-disclaimer','DEMO PROFILE — Example information and sample reviews only. No real member ratings are included.'));
}
async function openKjHostProfile(userId,venueName,day,timeRange='',venueId=null){
  const dlg=ensureDialog();
  const box=dlg.querySelector('#a2k-kj-host-profile-body');
  box.replaceChildren(element('p','', 'Loading KJ profile…'));
  if(!dlg.open)dlg.showModal();
  try{
    if(!userId || typeof authClient==='undefined' || !authClient)throw Error('Profile unavailable');
    // Direct query is subject to member_profiles RLS. Private profiles do not
    // become readable merely because a schedule links to their user ID.
    // The sample KJ profile is tied to Bob's account in kj_review_hosts.
    // Only published demo data is displayed here; Bob's private member
    // profile and real review counts remain protected by their own RLS.
    const {data:host,error:hostError}=await authClient.from('kj_review_hosts')
      .select('user_id,stage_name,enabled').eq('user_id',userId)
      .eq('enabled',true).maybeSingle();
    if(hostError)throw hostError;
    if(host?.stage_name==='DJ Copper Mic (Demo)'){
      if(!dlg.open)return;
      renderCard({
        stage_name:'DJ Copper Mic (Demo)',
        bio:'Karaoke is about making everyone feel welcome on stage. I enjoy classic rock, country, pop, and those unexpected crowd favorites. My goal is to keep the rotation fair, the music sounding great, and the energy going all night.'
      },{venueName,day,timeRange,venueId,demo:true});
      return;
    }
    const {data,error}=await authClient.from('member_profiles')
      .select('user_id,stage_name,bio,avatar_path,created_at')
      .eq('user_id',userId).maybeSingle();
    if(error)throw error;
    if(!dlg.open)return;
    if(!data){
      box.textContent='This member has not made their profile available to you.';
      return;
    }
    renderCard(data,{venueName,day,timeRange,venueId});
  }catch(error){
    if(dlg.open)box.textContent='This KJ profile is unavailable right now.';
    console.warn('KJ profile card unavailable',error);
  }
}

/* Decorates links with approved KJ review scores; no separate venue ratings. */
const kjVenueScoreCache=new Map();
function venueScore(hostId){
  if(!kjVenueScoreCache.has(hostId)){
    const request=(async()=>{
      if(typeof authClient==='undefined'||!authClient)return null;
      const result=await authClient.from('kj_review_scores')
        .select('review_count,average_score').eq('host_user_id',hostId).maybeSingle();
      if(result.error)throw result.error;
      return result.data||{review_count:0,average_score:null};
    })();
    kjVenueScoreCache.set(hostId,request);
    request.catch(()=>kjVenueScoreCache.delete(hostId));
  }
  return kjVenueScoreCache.get(hostId);
}
function hostLinkParts(button,label){
  button.replaceChildren();
  const name=element('span','a2k-kj-host-link-name',label);
  const rating=element('span','a2k-kj-host-link-score');
  button.append(name,rating);
  return rating;
}
async function decorateKjVenueLink(button,hostId,label){
  const rating=hostLinkParts(button,label);
  if(!hostId)return;
  try{
    const score=await venueScore(hostId);
    if(!button.isConnected||!rating.isConnected||!score)return;
    const count=Number(score.review_count)||0;
    const average=Number(score.average_score);
    rating.textContent=count&&Number.isFinite(average)?
      '🎤 '+average.toFixed(1)+'/5' : 'No ratings yet';
    rating.title=count?
      count+' approved KJ review'+(count===1?'':'s'):
      'No approved KJ reviews yet';
  }catch(error){
    console.warn('KJ venue rating unavailable',error);
    // Do not invent ratings if the public scores endpoint is temporarily down.
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
  const button=element('button','a2k-kj-host-link');
  const preview=previewReviews();
  const previewScore=preview.reduce((sum,item)=>sum+reviewAverage(item),0)/preview.length;
  const previewRating=hostLinkParts(button,'🎤 DJ Copper Mic (Demo)');
  previewRating.textContent='🎤 '+previewScore.toFixed(1)+'/5';
  previewRating.title='Founder-only preview rating';
  button.type='button';
  button.setAttribute('aria-label','View DJ Copper Mic demo profile linked to Bob');
  button.addEventListener('click',()=>{
    void openKjHostProfile('ead825e0-0cf2-4404-b04b-5376dede2b84',
      venue.name,'Saturday',
      saturday.querySelector('span')?.textContent?.trim()||'',
      venue.databaseId||null);
  });
  section.append(button);
  const hostArea=saturday.querySelector('.a2k-schedule-hosts');
  if(hostArea)hostArea.append(section);
  else saturday.insertAdjacentElement('afterend',section);
}
// Return sample metrics only; never store them as real reviews.
window.a2kKjDemoRating=()=>{
  const samples=previewReviews();
  return {average:samples.length?samples.reduce((sum,r)=>sum+reviewAverage(r),0)/samples.length:0,
    count:samples.length};
};
window.a2kDecorateKjVenueLink=decorateKjVenueLink;
window.a2kOpenKjHostProfile=openKjHostProfile;
// Reuse the same approved KJ review widget inside the unified member profile.
window.a2kMountKjRatings=mountRatings;
window.a2kMountKjHostPreview=founderPreview;
})();