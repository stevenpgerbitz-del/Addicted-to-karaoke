/* A2K 226: optional foreground-only "Use My Location" karaoke search.
   Coordinates remain in browser memory, never saved or sent to another service.
   Existing venue coordinates take precedence over approximate Iowa city centers. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const cityCenters={
  'ia|des moines':[41.5868,-93.6250],
  'ia|altoona':[41.6442,-93.4647],
  'ia|johnston':[41.6709,-93.6972],
  'ia|windsor heights':[41.5978,-93.7083],
  'ia|ames':[42.0347,-93.6200],
  'ia|kelley':[41.9511,-93.6652],
  'ia|urbandale':[41.6267,-93.7122],
  'ia|west des moines':[41.5772,-93.7113],
  'ia|clive':[41.6036,-93.7241],
  'ia|ankeny':[41.7297,-93.6058],
  'ia|waukee':[41.6117,-93.8852],
  'ia|grimes':[41.6883,-93.7911],
  'ia|boone':[42.0597,-93.8802],
  'ia|polk city':[41.7708,-93.7147],
  'ia|granger':[41.7605,-93.8247],
  'ia|nevada':[42.0228,-93.4528],
  'ia|bondurant':[41.7005,-93.4627],
  'ia|pleasant hill':[41.5844,-93.5199]
 };
 let location=null,active=false,pending=false,radius=25;
 const rad=x=>x*Math.PI/180;
 const miles=(lat1,lon1,lat2,lon2)=>{
  const dlat=rad(lat2-lat1),dlon=rad(lon2-lon1);
  const a=Math.sin(dlat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dlon/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
 };
 function placePoint(venue){
  if(!venue)return null;
  const latitude=venue.latitude,longitude=venue.longitude;
  if(latitude!==null&&latitude!==undefined&&longitude!==null&&longitude!==undefined){
   const lat=Number(latitude),lon=Number(longitude);
   if(Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180)
    return {lat,lon,estimated:false};
  }
  const key=String(venue.state||'IA').trim().toLowerCase()+'|'+String(venue.city||'').trim().toLowerCase();
  const center=cityCenters[key];
  return center?{lat:center[0],lon:center[1],estimated:true}:null;
 }
 function distanceTo(venue){
  if(!active||!location)return null;
  const p=placePoint(venue);
  return p?{miles:miles(location.lat,location.lon,p.lat,p.lon),estimated:p.estimated}:null;
 }
 window.a2kNearbyVenueMatches=venue=>{
  if(!active)return true;
  const result=distanceTo(venue);
  return !!result&&result.miles<=radius;
 };
 window.a2kNearbyDistance=distanceTo;
 const refresh=()=>{if(typeof window.filterVenues==='function')window.filterVenues()};
 function init(){
  const find=$('find-screen'),search=$('venue-search');
  if(!find||!search||$('a2k-nearby-controls'))return;
  const bar=document.createElement('div');bar.className='a2k-nearby-controls';bar.id='a2k-nearby-controls';
  const button=document.createElement('button');button.type='button';button.id='a2k-nearby-button';
  button.textContent='⌖ Use My Location';
  button.setAttribute('aria-pressed','false');
  const label=document.createElement('label');label.className='a2k-nearby-radius';
  label.textContent='Within';
  const select=document.createElement('select');select.id='a2k-nearby-radius';
  select.setAttribute('aria-label','Nearby search radius');
  for(const val of [10,25,50,100,200]){
   const opt=document.createElement('option');opt.value=val;opt.textContent=val+' miles';
   select.append(opt);
  }
  select.value=String(radius);
  label.append(select);bar.append(button,label);
  const status=document.createElement('p');status.className='a2k-nearby-status';
  status.id='a2k-nearby-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  search.insertAdjacentElement('afterend',bar);
  bar.insertAdjacentElement('afterend',status);
  const setStatus=text=>{status.textContent=text;};
  const update=()=>{
   button.disabled=pending;select.disabled=pending;
   button.textContent=pending?'Finding your location…':active?'✕ Clear Location':'⌖ Use My Location';
   button.setAttribute('aria-pressed',String(active));
  };
  select.addEventListener('change',()=>{
   radius=Number(select.value)||25;
   if(active){setStatus('Showing nearby karaoke within '+radius+' miles. Distances are approximate where venue coordinates are missing.');refresh();}
  });
  button.addEventListener('click',()=>{
   if(active){
    active=false;location=null;
    update();setStatus('Location filter cleared. Search by venue, city or ZIP code instead.');refresh();
    return;
   }
   if(pending)return;
   if(!navigator.geolocation){
    setStatus('Location is not supported in this browser. Try a city or ZIP code search.');return;
   }
   pending=true;update();setStatus('Allow location access in your browser to find nearby karaoke. Your position will not be saved.');
   navigator.geolocation.getCurrentPosition(
    position=>{
     pending=false;
     const lat=Number(position?.coords?.latitude),lon=Number(position?.coords?.longitude);
     if(!Number.isFinite(lat)||!Number.isFinite(lon)){setStatus('Could not read your location. Try a city or ZIP code search.');update();return;}
     location={lat,lon};active=true;update();
     document.dispatchEvent(new Event('a2k-nearby-activated'));

     // Nearby mode is a new discovery request, not a filter on an old search term.
     search.value='';
     const state=$('region-filter'),city=$('city-filter');
     if(state&&state.value){state.value='';state.dispatchEvent(new Event('change',{bubbles:true}));}
     if(city&&city.value){city.value='';city.dispatchEvent(new Event('change',{bubbles:true}));}
     setStatus('Showing nearby karaoke within '+radius+' miles. Distances are approximate where venue coordinates are missing.');
     refresh();
     const count=$('no-results');
     if(count&&!count.hidden)setStatus('No karaoke listings found within '+radius+' miles. Try a larger radius or search by city or ZIP.');
    },
    error=>{
     pending=false;location=null;active=false;update();
     const denied=error&&error.code===1;
     setStatus(denied?'Location permission was denied. You can still search by city or ZIP code.':
       'Could not determine your location. Search by city or ZIP code instead.');
    },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  });
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();