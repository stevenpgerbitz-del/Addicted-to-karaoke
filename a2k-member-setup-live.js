/* Addicted to Karaoke setup wizard live bridge. Visual layout belongs to member-setup-preview.html. */
(function(){
'use strict';
var ownerId=null,manual=false,overlay=null,frame=null,busy=false,venues=[],opening=false;
const originalWizardStart=window.atkWelcomeStart;
function client(){return typeof authClient!=='undefined'?authClient:null}
function user(){return typeof authUser!=='undefined'?authUser:null}
function profile(){return typeof memberProfile!=='undefined'?memberProfile:null}
function allowed(){return !!(client()&&user()&&profile()&&ownerId===user().id&&profile().user_id===ownerId)}
function send(type,payload){if(frame&&frame.contentWindow)frame.contentWindow.postMessage({source:'a2k-live-parent',type:type,payload:payload||{}},location.origin)}
function fail(response){if(response&&response.error)throw response.error;return response&&response.data}
function text(v,max){return String(v||'').trim().slice(0,max||240)}
function close(){
 if(overlay){overlay.remove();overlay=null;frame=null;}
 document.body.style.overflow=previousOverflow;
 ownerId=null;busy=false;opening=false;
 if(typeof atkWelcomeDialogOwnerId!=='undefined')atkWelcomeDialogOwnerId=null;
}
var previousOverflow='';
function open(isManual){
 if(opening||overlay||!client()||!user()||!profile()||user().id!==profile().user_id)return;
 opening=true;manual=!!isManual;ownerId=user().id;
 previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 if(typeof atkWelcomeDialogOwnerId!=='undefined')atkWelcomeDialogOwnerId=ownerId;
 // Keep the user's current site section visible behind this modal; do not navigate.
 overlay=document.createElement('section');
 overlay.id='a2k-member-setup-live-overlay';
 Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'100001',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(22,0,7,.65)',backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)',overflow:'hidden'});
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-label','Addicted to Karaoke member setup');
 overlay.setAttribute('aria-modal','true');
 frame=document.createElement('iframe');
 frame.title='Addicted to Karaoke Member Setup Wizard';
 frame.src='member-setup-preview.html?live=1&v=356';
 frame.setAttribute('referrerpolicy','same-origin');
 frame.onerror=function(){
   var m=manual;close();
   if(typeof originalWizardStart==='function')originalWizardStart(m);
   else if(typeof authStatus==='function')authStatus('Could not open setup. Please refresh the page and try again.');
 };
 // Keep the iframe the size of the wizard, not the whole viewport:
 // browsers may paint an opaque white iframe canvas even when its
 // document background is transparent. The parent site is now visible
 // all around the real modal. Mobile remains full-screen.
 const sizing=document.createElement('style');
 sizing.textContent='#a2k-member-setup-live-overlay iframe{width:min(920px,calc(100vw - 20px));height:min(630px,calc(100dvh - 20px));max-width:100%;max-height:100%;}' +
  '@media(max-width:760px){#a2k-member-setup-live-overlay iframe{width:100%;height:100%;}}';
 Object.assign(frame.style,{border:'0',display:'block',background:'transparent'});
 overlay.append(sizing,frame);document.body.appendChild(overlay);opening=false;
}
async function initial(){
 if(!allowed())return;
 var id=ownerId;
 var data={profile:{stage_name:profile().stage_name||'',bio:profile().bio||'',karaoke_interests:profile().karaoke_interests||[],favorite_genres:profile().favorite_genres||[],directory_visible:profile().directory_visible!==false,song_visibility:profile().song_visibility||'private',profile_visibility:profile().profile_visibility||'members'},venues:[],details:{},publicPrefs:{}};
 try{
   var results=await Promise.all([
     client().from('venues').select('id,name,city,state,postal_code,address_line1').eq('published',true).eq('publication_status','published').order('name').limit(300),
     client().from('member_setup_details').select('*').eq('user_id',id).maybeSingle(),
     client().from('member_public_preferences').select('*').eq('user_id',id).maybeSingle()
   ]);
   if(!allowed()||id!==ownerId)return;
   if(!results[0].error)venues=results[0].data||[];
   if(!results[1].error)data.details=results[1].data||{};
   if(!results[2].error)data.publicPrefs=results[2].data||{};
   data.venues=venues;
 }catch(e){console.warn('Addicted to Karaoke setup lookup incomplete:',e)}
 send('init',data);
}
async function presetPhotoBlob(kind){
 var src=kind==='male'?'assets/a2k-avatar-male-theatrical.png':'assets/a2k-avatar-female-theatrical.png';
 var image=new Image();image.src=src;await image.decode();
 var canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;
 canvas.getContext('2d').drawImage(image,0,0,400,400);
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare selected illustration.')),'image/jpeg',0.9));
}
async function photoDataUrl(dataUrl){
 var encoded=String(dataUrl||'');
 if(!/^data:image\/(png|jpe?g|webp);base64,/.test(encoded))throw Error('Please choose a JPEG, PNG or WebP profile photo.');
 var response=await fetch(encoded),blob=await response.blob();
 if(blob.size>8*1024*1024)throw Error('Please select a photo smaller than 8 MB.');
 var image=await createImageBitmap(blob),canvas=document.createElement('canvas');
 canvas.width=400;canvas.height=400;
 var ctx=canvas.getContext('2d'),side=Math.min(image.width,image.height);
 ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,400,400);
 image.close();
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not resize photo.')),'image/jpeg',0.84));
}
function currentVenue(name,fromChild){
 var matching=venues.filter(v=>v.name===name);
 if(matching.length===1)return matching[0];
 var maybe=(fromChild||[]).find(v=>v.name===name);
 if(maybe&&matching.length===0)return {name:text(maybe.name,150),city:text(maybe.city,120),state:text(maybe.state||'IA',2).toUpperCase(),id:null,address_line1:null,postal_code:null};
 throw Error('Please select a specific venue for '+text(name,70)+'.');
}
function parseCity(city,state){
 var parts=text(city,120).split(',').map(x=>x.trim());
 var region=(text(state,2)||parts[1]||'IA').toUpperCase().slice(0,2);
 if(!/^[A-Z]{2}$/.test(region))throw Error('Please enter a two-letter state abbreviation.');
 return {city:parts[0],state:region};
}
function localIso(date,clock,nextDayIfEarlier,firstClock){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))
   throw Error('Please enter a valid one-time event date and time.');
 var dateParts=date.split('-').map(Number);
 var day=new Date(Date.UTC(dateParts[0],dateParts[1]-1,dateParts[2],12));
 if(day.getUTCFullYear()!==dateParts[0]||day.getUTCMonth()!==dateParts[1]-1||day.getUTCDate()!==dateParts[2])
   throw Error('Please enter a valid calendar date.');
 if(nextDayIfEarlier&&clock<=firstClock)day.setUTCDate(day.getUTCDate()+1);
 var year=day.getUTCFullYear(),month=String(day.getUTCMonth()+1).padStart(2,'0'),number=String(day.getUTCDate()).padStart(2,'0');
 var offsetName=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',timeZoneName:'shortOffset'})
   .formatToParts(day).find(x=>x.type==='timeZoneName')?.value||'GMT-6';
 var raw=offsetName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
 if(!raw)throw Error('Could not determine the venue time zone.');
 var offset=raw[1]+raw[2].padStart(2,'0')+':'+(raw[3]||'00');
 return year+'-'+month+'-'+number+'T'+clock+':00'+offset;
}
async function save(payload){
 if(!allowed())throw Error('Your login changed. Please sign in and run setup again.');
 var id=ownerId,old=profile(),now=new Date().toISOString();
 if(payload.skipAll){
   if(manual){close();return}
   var done=fail(await client().from('member_profiles').update({onboarding_completed_at:now}).eq('user_id',id).select('onboarding_completed_at').single());
   if(allowed())old.onboarding_completed_at=done.onboarding_completed_at;
   send('saved',{});return;
 }
 var s=payload.state||{},roles=Array.isArray(s.roles)?s.roles.filter(v=>['singer','kj','owner'].includes(v)):[],
     rls=roles.map(v=>v==='owner'?'venue_owner':v),priv=s.privacy||{};
 var name=text(s.name,30);
 if(name.length<3)throw Error('Please enter a display name with at least three characters.');
 if(roles.includes('kj')&&s.kjBusiness&&!text(s.kjEmail)&&!text(s.kjPhone))throw Error('KJ business requires an email or phone number.');
 if(roles.includes('owner')&&s.ownerBusiness&&!text(s.ownerEmail)&&!text(s.ownerPhone)&&!user().email)throw Error('Venue staff contact requires an email or phone number.');
 var profileUpdate={stage_name:name,bio:text(s.bio,500),karaoke_interests:rls,
    favorite_genres:roles.includes('singer')?(s.singerGenres||[]).filter(x=>typeof x==='string').slice(0,16):old.favorite_genres||[],
    song_visibility:priv.songs===true?'public':'private',updated_at:now};
 // Never grant verified identities or management roles from self-declared interests.
 if(['public','members','private'].includes(priv.audience)&&!payload.skipPrivacy){
   profileUpdate.profile_visibility=priv.audience;
   profileUpdate.directory_visible=priv.audience!=='private'&&priv.directory===true;
 }
 var updated=fail(await client().from('member_profiles').update(profileUpdate).eq('user_id',id).select('*').single());
 if(!allowed())throw Error('Your login changed while saving.');
 Object.assign(old,updated);
 if(s.avatarChanged){
   if(s.avatarPreset==='mic'&&!s.photo){
     var reset=fail(await client().from('member_profiles').update({avatar_path:null,updated_at:now})
       .eq('user_id',id).select('avatar_path,updated_at').single());
     Object.assign(old,reset);
   }else{
     var blob=s.photo&&/^data:image\//.test(s.photo)?
       await photoDataUrl(s.photo):await presetPhotoBlob(s.avatarPreset==='female'?'female':'male');
     var path=id+'/avatar.jpg';
     fail(await client().storage.from('member-avatars').upload(path,blob,{contentType:'image/jpeg',upsert:true,cacheControl:'60'}));
     var p=fail(await client().from('member_profiles').update({avatar_path:path,updated_at:now})
       .eq('user_id',id).select('avatar_path,updated_at').single());
     Object.assign(old,p);
   }
   if(typeof memberShowAvatar==='function')memberShowAvatar();
 }
 if(roles.includes('kj')||roles.includes('owner')){
   var d={user_id:id,kj_business_name:roles.includes('kj')?text(s.kjBusiness,120):'',kj_hosts:roles.includes('kj')?[name,...(s.hosts||[])].filter(Boolean).slice(0,12):[],
    kj_email:roles.includes('kj')?text(s.kjEmail,254):'',kj_phone:roles.includes('kj')?text(s.kjPhone,40):'',
    kj_show_email:roles.includes('kj')&&priv.email===true,kj_show_phone:roles.includes('kj')&&priv.phone===true,
    venue_business_name:roles.includes('owner')?text(s.ownerBusiness,120):'',
    venue_email:roles.includes('owner')?text(s.ownerEmail||user().email,254):'',venue_phone:roles.includes('owner')?text(s.ownerPhone,40):'',
    venue_show_email:roles.includes('owner')&&priv.email===true,venue_show_phone:roles.includes('owner')&&priv.phone===true,updated_at:now};
   fail(await client().from('member_setup_details').upsert(d,{onConflict:'user_id'}));
 }
 /* V85: save the location typed in the wizard. It was collected for months
    and silently dropped — only the show_location flag was ever written.
    Unconditional: singers never enter the kj/owner block above, and Steven
    himself is singer-only. location_text lives in member_setup_details
    (migration member_location_and_member_reports_v84); display is gated
    server-side by a2k_public_member_location + show_location. */
 fail(await client().from('member_setup_details').upsert(
   {user_id:id,location_text:text(s.location,120)||null,updated_at:now},{onConflict:'user_id'}));

 // Persist optional visibility controls; never store unselected contact data in a publicly readable row.
 // V86 (dedup, Steven Nov 24 2026): song_visibility is the single songs
 // gate — show_songs is no longer written here (and no longer read by
 // desktop-members.js). show_reviews / show_venues were written but
 // never read anywhere; they are dropped too. No show_songs toggle is
 // added anywhere.
 var publishEmail=priv.email===true?text(s.kjEmail||s.ownerEmail||user().email,254):null;
 var publishPhone=priv.phone===true?text(s.kjPhone||s.ownerPhone,40):null;
 fail(await client().from('member_public_preferences').upsert({
   user_id:id,show_display_name:priv.displayName!==false,show_photo:priv.photo!==false,
   show_location:priv.location!==false,show_member_since:priv.memberSince!==false,
   show_genres:priv.genres!==false,
   show_kj_schedule:priv.kjSchedule!==false,
   published_email:publishEmail||null,published_phone:publishPhone||null,
   updated_at:now
 },{onConflict:'user_id'}));
 if(roles.includes('singer')){
   var catalog=Array.isArray(payload.songCatalog)?payload.songCatalog:[],selected=Array.isArray(s.selectedSongs)?s.selectedSongs:[];
   var existing=fail(await client().from('karaoke_songs').select('title,artist').eq('user_id',id).limit(500))||[];
   var newSongs=[];
   for(var title of selected.slice(0,50)){
     title=text(title,200);if(!title)continue;
     var item=catalog.find(x=>Array.isArray(x)&&x[0]===title);
     var artist=text(item?item[1]:'Artist not specified',200);
     if(existing.some(x=>x.title.toLowerCase()===title.toLowerCase()&&x.artist.toLowerCase()===artist.toLowerCase()))continue;
     newSongs.push({user_id:id,title:title,artist:artist,list_type:'my_songs',favorite:true});
   }
   if(newSongs.length)fail(await client().from('karaoke_songs').insert(newSongs));
   var favorites=[];
   for(var venueName of (s.selectedVenues||[])){
     var v=currentVenue(venueName,payload.venueRecords);
     if(v.id)favorites.push({user_id:id,venue_id:v.id});
   }
   if(favorites.length)fail(await client().from('venue_favorites').upsert(favorites,{onConflict:'user_id,venue_id',ignoreDuplicates:true}));
 }
 if(roles.includes('kj')){
   var normEnd=function(e){return e==='close'?'close':(e?String(e).slice(0,5):null)};
  var byVenue=new Map();
   for(var item of (s.schedule||[])){
     if(!item||!item.venue)continue;
     var existingGroup=byVenue.get(item.venue)||{weekly:[],oneTime:[]};
     if(item.tab==='weekly')for(var day of (item.days||[])){
       var idx=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(day);
       if(idx!==-1)existingGroup.weekly.push({day:idx,start:item.start,end:normEnd(item.end)});
     }else if(item.tab==='once')existingGroup.oneTime.push(item);
     byVenue.set(item.venue,existingGroup);
   }
   for(var entry of byVenue){
     var v=currentVenue(entry[0],payload.venueRecords),c=parseCity(v.city,v.state);
     if(entry[1].weekly.length){
       var sessions=entry[1].weekly.slice(0,7);
       var existing=fail(await client().from('kj_host_submissions')
         .select('id,venue_name,sessions,status').eq('user_id',id).in('status',['pending','approved']).limit(200))||[];
       var sameSessions=(rows)=>JSON.stringify((rows||[]).map(item=>[Number(item.day),String(item.start).slice(0,5),normEnd(item.end)]).sort((a,b)=>a[0]-b[0]));
       var duplicate=existing.some(x=>x.venue_name===v.name&&sameSessions(x.sessions)===sameSessions(sessions));
       if(!duplicate)fail(await client().from('kj_host_submissions').insert({
         user_id:id,venue_id:v.id||null,venue_name:text(v.name,150),venue_address:text(v.address_line1,240)||null,
         venue_city:c.city,venue_state:c.state,venue_postal_code:text(v.postal_code,15)||null,
         sessions:sessions,status:'pending',notes:'Submitted during member setup'}));
     }
     for(var event of entry[1].oneTime){
       var title=text(event.title,180);
       if(title.length<5)throw Error('Please enter an event name of at least five characters.');
       if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date||''))throw Error('Please choose a valid date for the one-time event.');
       var start=localIso(event.date,event.start||'20:00'),end=localIso(event.date,event.end||'23:00',true,event.start||'20:00');
       var startDate=new Date(start),endDate=new Date(end);
       if(!(startDate>new Date(Date.now()-12*3600000))||endDate-startDate<=0||endDate-startDate>=24*3600000)
         throw Error('One-time events must be in the future and shorter than 24 hours.');
       var fingerprint='a2k-setup-event:'+id+':'+v.name+':'+event.date+':'+title+':'+start;
       if(localStorage.getItem(fingerprint)==='submitted')continue;
       fail(await client().from('karaoke_event_suggestions').insert({
         submitted_by:null,venue_name:text(v.name,150),city:text(c.city,100),state:c.state,
         address:text(v.address_line1,220)||null,title:title,start_at:start,end_at:end,
         host_name:text(s.kjBusiness||name,100),notes:'Submitted by KJ during Addicted to Karaoke member setup. Member account: '+id+'. Awaiting founder review.',status:'submitted'
       }));
       localStorage.setItem(fingerprint,'submitted');
     }
   }
 }
 if(roles.includes('owner')&&s.claimSubmitted&&s.ownerVenue&&!s.skipped.includes('owner_confirm')){
   var choice=s.ownerVenue;
   if(choice.mode==='claim'){
     if(!['owner','manager','authorized_representative'].includes(s.ownerRelationship))throw Error('Select your position at the venue before requesting access.');
     var candidate=currentVenue(choice.name,payload.venueRecords);
     if(!candidate.id)throw Error('The claimed venue is not in Addicted to Karaoke. Please propose a new venue instead.');
     var oldClaims=fail(await client().from('venue_claim_requests').select('id').eq('claimant_user_id',id).eq('venue_id',candidate.id).eq('status','pending').limit(1))||[];
     if(!oldClaims.length)fail(await client().from('venue_claim_requests').insert({
       venue_id:candidate.id,claimant_user_id:id,contact_name:text(s.ownerBusiness,120)||name,
       contact_email:text(s.ownerEmail||user().email,254),contact_phone:text(s.ownerPhone,40)||null,relationship:s.ownerRelationship,
       verification_details:'Claim requested through Addicted to Karaoke member setup.',status:'pending'
     }));
   }else{
     var city=parseCity(choice.city,'');
     var newVenueKey='a2k-setup-venue:'+id+':'+text(choice.name,120)+':'+city.city;
     if(localStorage.getItem(newVenueKey)!=='submitted'){
       fail(await client().from('venue_suggestions').insert({
         name:text(choice.name,120),city:city.city,state:city.state,status:'submitted',submitted_by:id,
         karaoke_details:'Venue Staff-proposed venue via member setup. Business: '+text(s.ownerBusiness,120)
       }));
       localStorage.setItem(newVenueKey,'submitted');
     }
   }
 }
 var complete=fail(await client().from('member_profiles').update({onboarding_completed_at:new Date().toISOString()}).eq('user_id',id).select('onboarding_completed_at').single());
 if(allowed())old.onboarding_completed_at=complete.onboarding_completed_at;
 if(typeof memberLoadedUser!=='undefined')memberLoadedUser=null;
 if(typeof memberLoad==='function')void memberLoad();
 if(typeof authStatus==='function')authStatus('Your Addicted to Karaoke member setup was saved.');
 send('saved',{});
}
window.addEventListener('message',function(event){
 if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow||!event.data||event.data.source!=='a2k-live-child')return;
 if(event.data.type==='ready'){void initial();return}
 if(event.data.type==='close'){if(!busy)close();return}
 if(event.data.type==='save'){
   if(busy)return;busy=true;
   save(event.data.payload||{}).catch(function(error){send('save-error',{message:error.message||'Please try again.'})}).finally(function(){busy=false});
 }
});
function maybeStart(id,record){if(record&&!record.onboarding_completed_at&&user()&&user().id===id)open(false)}
function installReopen(){
 var b=document.getElementById('a2k-setup-reopen');
 if(!b||b.dataset.a2kLive==='1')return;
 var replacement=b.cloneNode(true);replacement.dataset.a2kLive='1';
 b.parentNode.replaceChild(replacement,b);
 replacement.addEventListener('click',function(){
   if(document.getElementById('profile-section-dialog')?.open&&typeof profileCloseSection==='function')profileCloseSection();
   open(true);
 });
}
window.atkWelcomeStart=open;
window.atkWelcomeMaybeStart=maybeStart;
window.atkWelcomeRender=function(){};
window.atkWelcomeNext=function(){};
window.atkWelcomeSkip=function(){};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installReopen,{once:true});
else installReopen();
})();