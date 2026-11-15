/* A2K Home Option B • read-only, real community data.
   No invented venues, schedules, ratings, or account totals. */
(function(){
 'use strict';
 const root=()=>document.getElementById('home-screen');
 const create=(tag,className,text)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 const fallback='assets/atk-default-venue.webp';
 const liveVenues=()=>{
  try{return (typeof sampleVenues!=='undefined'&&Array.isArray(sampleVenues)?
   sampleVenues:[]).filter(v=>v.databaseId&&v.publication_status==='published')}
  catch(e){return []}
 };
 const imageFor=v=>v?.image||fallback;
 const formatTime=(time)=>{
  const match=String(time||'').match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if(!match)return '';
  const hr=Number(match[1]);
  return String(hr%12||12)+':'+match[2]+(hr<12?' AM':' PM');
 };
 const chicagoDay=()=>new Intl.DateTimeFormat('en-US',{
  weekday:'long',timeZone:'America/Chicago'
 }).format(new Date());
 function navFind(){
  if(typeof navigate==='function')navigate('find');
  else location.hash='#find';
 }
 async function openLiveVenue(id,slug){
  try{await Promise.resolve(window.liveVenueLoadPromise)}catch(e){}
  const venue=liveVenues().find(v=>String(v.databaseId)===String(id));
  if(venue&&typeof openVenue==='function'){openVenue(venue.id);return}
  if(slug){location.hash='#venue/'+encodeURIComponent(slug);return}
  navFind();
 }
 function setPicture(img,venue){
  img.src=imageFor(venue);
  img.alt=venue?.hasPhoto?'Photo of '+venue.name:'Venue photo coming soon';
  img.loading='lazy';
  img.onerror=()=>{img.onerror=null;img.src=fallback;img.alt='Venue photo coming soon'};
 }
 function renderTonight(events){
  const list=document.getElementById('a2k-b-tonight');
  if(!list)return;
  list.replaceChildren();
  for(const event of events.slice(0,2)){
   const tile=create('button','a2k-b-card a2k-b-tonight');
   tile.type='button';
   tile.setAttribute('aria-label','View '+event.name+' karaoke tonight');
   const img=create('img','a2k-b-tonight-photo');
   const v=liveVenues().find(x=>String(x.databaseId)===String(event.id));
   setPicture(img,v);
   const text=create('span','a2k-b-tonight-body');
   text.append(create('strong','',event.name));
   text.append(create('small','',[event.city,event.state].filter(Boolean).join(', ')));
   text.append(create('small','a2k-b-date','Tonight · '+formatTime(event.start)));
   text.append(create('span','a2k-b-tag',event.host?'KJ Hosting':'Karaoke Night'));
   tile.append(img,text);
   tile.addEventListener('click',()=>void openLiveVenue(event.id,event.slug));
   list.append(tile);
  }
  if(events.length<2){
   const tile=create('button','a2k-b-card a2k-b-tonight a2k-b-browse');
   tile.type='button';
   tile.setAttribute('aria-label','Browse all published karaoke venues');
   const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
   icon.setAttribute('viewBox','0 0 24 24');
   icon.setAttribute('class','a2k-b-browse-icon');
   const p=document.createElementNS('http://www.w3.org/2000/svg','path');
   p.setAttribute('d','M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z M12 10h.01');
   icon.append(p);
   const text=create('span','a2k-b-tonight-body');
   text.append(create('strong','',events.length?'More Karaoke Venues':'No Events Listed Tonight'));
   text.append(create('small','',events.length?
    'Explore other published Iowa venues.':'No verified karaoke times posted for tonight.'));
   text.append(create('span','a2k-b-tag','Browse Venues'));
   tile.append(icon,text);
   tile.addEventListener('click',navFind);
   list.append(tile);
  }
 }
 async function loadTonight(){
  try{
   const venues=await supabaseRead(
    'venues?select=id,name,city,state,slug,karaoke_schedule,publication_status&published=eq.true&publication_status=eq.published&order=name.asc');
   if(!Array.isArray(venues))throw Error('No venue response');
   const today=chicagoDay();
   const dayNumber=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(today);
   const events=[];
   for(const v of venues){
    const entries=Array.isArray(v.karaoke_schedule)?v.karaoke_schedule:[];
    for(const item of entries){
     if(String(item?.day).toLowerCase()!==today.toLowerCase())continue;
     if(!formatTime(item.start))continue;
     events.push({id:v.id,name:v.name,city:v.city,state:v.state,slug:v.slug,start:item.start});
    }
   }
   // Match the venue-details public KJ schedule, which is approval-gated by the database.
   const hostResults=await Promise.allSettled(venues.map(v=>
    supabaseRead('rpc/atk_public_kj_schedule?p_venue_id='+encodeURIComponent(v.id))));
   hostResults.forEach((result,index)=>{
    if(result.status!=='fulfilled'||!Array.isArray(result.value))return;
    const v=venues[index];
    for(const item of result.value){
     if(Number(item.day_of_week)!==dayNumber||!formatTime(item.start_at))continue;
     events.push({id:v.id,name:v.name,city:v.city,state:v.state,slug:v.slug,
      start:item.start_at,host:true});
    }
   });
   events.sort((a,b)=>String(a.start).localeCompare(String(b.start))||
    a.name.localeCompare(b.name));
   // Repeated schedule sources should not duplicate the same venue and start time.
   const seen=new Set();
   const unique=events.filter(e=>{
    const key=e.id+'|'+e.start;
    if(seen.has(key))return false;
    seen.add(key);return true;
   });
   renderTonight(unique);
  }catch(e){
   console.warn('A2K Home: published schedule unavailable',e);
   renderTonight([]);
   const first=document.querySelector('#a2k-b-tonight .a2k-b-browse .a2k-b-tonight-body strong');
   if(first)first.textContent='Schedule Unavailable';
   const detail=document.querySelector('#a2k-b-tonight .a2k-b-browse .a2k-b-tonight-body small');
   if(detail)detail.textContent='Please try again or browse venue schedules.';
  }
 }
 function featuredEmpty(text){
  const el=document.getElementById('a2k-b-feature');
  if(el){el.replaceChildren(create('span','a2k-b-feature-copy',text));el.onclick=navFind}
 }
 async function loadFeatured(){
  try{
   await Promise.resolve(window.liveVenueLoadPromise);
   const candidates=liveVenues();
   if(!candidates.length){
    featuredEmpty('Published venue information is temporarily unavailable. Explore Find Karaoke.');
    return;
   }
   const sorted=[...candidates].sort((a,b)=>{
    const aRating=a.rating!==null&&a.rating!==undefined&&Number.isFinite(Number(a.rating))?Number(a.rating):-1;
    const bRating=b.rating!==null&&b.rating!==undefined&&Number.isFinite(Number(b.rating))?Number(b.rating):-1;
    return bRating-aRating||String(a.name).localeCompare(String(b.name));
   });
   const featured=sorted[0];
   const host=document.getElementById('a2k-b-feature');
   if(!host)return;
   host.replaceChildren();
   const img=create('img','a2k-b-feature-photo');
   setPicture(img,featured);
   const info=create('span','a2k-b-feature-copy');
   info.append(create('strong','',featured.name));
   info.append(create('small','',[featured.city,featured.state].filter(Boolean).join(', ')));
   if(featured.tagline)info.append(create('em','',featured.tagline));
   if(featured.rating!==null&&featured.rating!==undefined&&Number.isFinite(Number(featured.rating))){
    info.append(create('small','a2k-b-rating','★ '+Number(featured.rating).toFixed(1)+' / 5'));
   }else info.append(create('small','a2k-b-rating','Not rated yet'));
   host.append(img,info);
   host.onclick=()=>void openLiveVenue(featured.databaseId,featured.shareSlug||featured.slug);
   host.setAttribute('aria-label','View featured venue '+featured.name);
  }catch(e){
   console.warn('A2K Home: featured venue unavailable',e);
   featuredEmpty('Featured venue currently unavailable. Browse published venues.');
  }
 }
 async function loadStats(){
  try{
   const result=await supabaseRead('rpc/atk_home_community_counts');
   const counts=Array.isArray(result)?result[0]:result;
   if(!counts)throw Error('Missing community totals');
   for(const key of ['users','reviews','members','venues']){
    const field=document.querySelector('[data-a2k-b-stat="'+key+'"]');
    const value=Number(counts[key]);
    if(field&&Number.isSafeInteger(value)&&value>=0)
     field.textContent=value.toLocaleString('en-US');
   }
  }catch(e){console.warn('A2K Home: community counts unavailable',e);}
 }
 /* v182 — measure visible Home content and choose the gentlest fit tier.
    Never clip or hide Community Spotlight; allow scrolling for short windows
    and large accessibility font settings. */
 let fitQueued=false;
 function fitHome(){
  const panel=root(),content=panel?.querySelector('.a2k-b-home');
  if(!panel||!content||panel.hidden||panel.clientHeight<150)return;
  content.classList.remove('a2k-b-compact','a2k-b-tight');
  const overflow=()=>panel.scrollHeight>panel.clientHeight+3;
  if(overflow())content.classList.add('a2k-b-compact');
  if(overflow())content.classList.add('a2k-b-tight');
  if(!overflow()&&panel.scrollTop)panel.scrollTop=0;
 }
 function queueHomeFit(){
  if(fitQueued)return;
  fitQueued=true;
  requestAnimationFrame(()=>{fitQueued=false;fitHome();});
 }
 function setupHomeFit(){
  const panel=root(),content=panel?.querySelector('.a2k-b-home');
  if(!panel||!content)return;
  // Rendered async venue cards and statistics can change section height.
  new MutationObserver(queueHomeFit).observe(content,{
   subtree:true,childList:true,characterData:true
  });
  new MutationObserver(queueHomeFit).observe(panel,{
   attributes:true,attributeFilter:['hidden']
  });
  window.addEventListener('resize',queueHomeFit,{passive:true});
  window.visualViewport?.addEventListener('resize',queueHomeFit,{passive:true});
  document.fonts?.ready?.then(queueHomeFit);
  const logo=content.querySelector('.approved-logo');
  if(logo&&!logo.complete)logo.addEventListener('load',queueHomeFit,{once:true});
  queueHomeFit();
 }
 function init(){
  if(!root()||!document.getElementById('a2k-b-tonight'))return;
  setupHomeFit();
  void loadStats();
  void loadFeatured();
  void loadTonight();
  // Venue cover images arrive asynchronously after the public listing loads.
  window.setTimeout(()=>{if(root()&&!root().hidden)void loadFeatured()},1600);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();