/* Build 148 — public review filters and paginated browsing.
   Loads ten published reviews per request. Only the selected page is rendered.
   The public RPC enforces published-only reviews on the database. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const state={venueId:null,sort:'newest',mic:'all',page:1,meta:null};
 const number=n=>Math.max(0,Number(n)||0);
 const noun=(n,word)=>n+' '+word+(n===1?'':'s');
 function button(text,fn,cls){
  const e=document.createElement('button');e.type='button';e.className=cls||'';
  e.textContent=text;e.addEventListener('click',fn);return e;
 }
 function select(labelText,id,values,value,onChange){
  const label=document.createElement('label');label.className='atk-public-review-select-label';
  label.htmlFor=id;
  const heading=document.createElement('span');heading.textContent=labelText;
  const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',labelText);
  for(const [v,text] of values){
   const option=new Option(text,v);select.add(option);
  }
  select.value=value;
  select.addEventListener('change',()=>onChange(select.value));
  label.append(heading,select);return label;
 }
 function filters(meta){
  const box=document.createElement('div');box.className='atk-public-review-filterbar';
  const ratings=[['all','All ratings ('+number(meta.overall_total)+')']];
  for(let i=1;i<=5;i++){
   const n=number(meta.distribution?.[i]);
   ratings.push([String(i),i+' '+(i===1?'mic':'mics')+' ('+n+')']);
  }
  box.append(
   select('Rating','atk-public-review-rating',ratings,state.mic,value=>{
    if(value===state.mic)return;
    state.mic=value;state.page=1;
    window.atkLoadVenueReviewsPage();
   }),
   select('Sort','atk-public-review-sort',[
    ['newest','Newest first'],['oldest','Oldest first'],
    ['highest','Highest rated'],['lowest','Lowest rated']
   ],state.sort,value=>{
    if(value===state.sort)return;
    state.sort=value;state.page=1;
    window.atkLoadVenueReviewsPage();
   })
  );
  return box;
 }
 function pager(meta){
  const total=number(meta.total),size=number(meta.page_size)||10;
  const pages=Math.max(1,Math.ceil(total/size));
  if(pages<=1)return null;
  const box=document.createElement('div');box.className='atk-public-review-pages';
  const prev=button('Previous',()=>{if(state.page>1){state.page--;window.atkLoadVenueReviewsPage()}},'atk-public-review-page');
  const next=button('Next',()=>{if(state.page<pages){state.page++;window.atkLoadVenueReviewsPage()}},'atk-public-review-page');
  prev.disabled=state.page<=1;next.disabled=state.page>=pages;
  const label=document.createElement('span');label.textContent='Page '+state.page+' of '+pages;
  label.setAttribute('aria-live','polite');
  box.append(prev,label,next);return box;
 }
 const original=window.renderLiveReviews;
 if(typeof original==='function'){
  window.renderLiveReviews=function(rows){
   const result=original.apply(this,arguments);
   const panel=$('content'),meta=state.meta;
   if(!panel||!meta)return result;
   const intro=panel.querySelector('.heading + .muted');
   if(intro){
    const all=number(meta.overall_total),matching=number(meta.total);
    intro.textContent=state.mic==='all'
     ?noun(all,'approved review')
     :noun(matching,'review')+' matching '+state.mic+' '+(state.mic==='1'?'mic':'mics')+' · '+all+' total';
   }
   const list=panel.querySelector('.review-list');
   const empty=panel.querySelector('p.description');
   if(!rows.length&&empty){
    empty.textContent=state.mic==='all'
     ?'No approved reviews for this venue yet.'
     :'No reviews match this microphone rating.';
   }
   const anchor=list||empty||panel.querySelector('button.direction');
   if(anchor)anchor.before(filters(meta));
   const pages=pager(meta);
   if(pages){
    if(list)list.after(pages);
    else if(empty)empty.after(pages);
   }
   return result;
  };
 }
 async function load(){
  const request=++reviewRequestSequence;
  const venue=typeof sampleVenues!=='undefined'?sampleVenues.find(x=>x.id===selectedVenue):null;
  const panel=$('content');
  if(!venue||!panel){if(panel)panel.textContent='Venue not found.';return}
  panel.innerHTML='<div class="heading"><h2>Venue Reviews</h2></div><p class="muted" role="status">Loading reviews…</p>';
  try{
   if(!venue.databaseId&&window.liveVenueLoadPromise)await window.liveVenueLoadPromise;
   if(!venue.databaseId)throw Error('Venue is not available from the database');
   if(state.venueId!==venue.databaseId){
    state.venueId=venue.databaseId;state.page=1;state.mic='all';state.sort='newest';state.meta=null;
   }
   const params=new URLSearchParams({
    p_venue_id:venue.databaseId,p_sort:state.sort,p_page:String(state.page)
   });
   if(state.mic!=='all')params.set('p_mic',state.mic);
   // Stable, read-only RPC can be called using the same anonymous-safe REST helper
   // that serves the rest of the public venue pages.
   const data=await supabaseRead('rpc/venue_reviews_page?'+params.toString());
   if(request!==reviewRequestSequence||selectedVenue!==venue.id||
      document.querySelector('[data-tab="reviews"]')?.getAttribute('aria-selected')!=='true')return;
   if(!data||!Array.isArray(data.rows))throw Error('Unexpected review response');
   const total=number(data.total),size=number(data.page_size)||10;
   if(state.page>1&&state.page>Math.ceil(total/size)){
    state.page=Math.max(1,Math.ceil(total/size));
    return load();
   }
   state.meta=data;
   renderLiveReviews(data.rows);
  }catch(e){
   if(request!==reviewRequestSequence||selectedVenue!==venue.id)return;
   state.meta=null;
   panel.innerHTML='<div class="heading"><h2>Venue Reviews</h2></div>';
   const error=document.createElement('p');error.className='description';
   error.textContent='Unable to load reviews. Check your connection and try again.';
   const retry=button('Retry Reviews',()=>window.atkLoadVenueReviewsPage(),'direction');
   panel.append(error,retry);
   console.warn('Public review listing unavailable',e);
  }
 }
 window.atkLoadVenueReviewsPage=load;
})();