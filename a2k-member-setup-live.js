/* A2K setup wizard live bridge. Visual layout belongs to member-setup-preview.html. */
(function(){
'use strict';
var ownerId=null,manual=false,overlay=null,frame=null,busy=false,venues=[],opening=false;
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
 if(!manual&&document.getElementById('signin-screen')?.hidden&&typeof navigate==='function')navigate('signin');
 overlay=document.createElement('section');
 overlay.id='a2k-member-setup-live-overlay';
 Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'100001',background:'#210008',overflow:'hidden'});
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-label','A2K member setup');
 overlay.setAttribute('aria-modal','true');
 frame=document.createElement('iframe');
 frame.title='Addicted to Karaoke Member Setup Wizard';
 frame.src='member-setup-preview.html?live=1&v=255';
 frame.setAttribute('referrerpolicy','same-origin');
 Object.assign(frame.style,{border:'0',width:'100%',height:'100%',display:'block'});
 overlay.appendChild(frame);document.body.appendChild(overlay);opening=false;
}
async function initial(){
 if(!allowed())return;
 var id=ownerId;
 var data={profile:{stage_name:profile().stage_name||'',bio:profile().bio||'',karaoke_interests:profile().karaoke_interests||[],favorite_genres:profile().favorite_genres||[],directory_visible:profile().directory_visible!==false,song_visibility:profile().song_visibility||'private'},venues:[],details:{}};
 try{
   var results=await Promise.all([
     client().from('venues').select('id,name,city,state,postal_code,address_line1').eq('published',true).eq('publication_status','published').order('name').limit(300),
     client().from('member_setup_details').select('*').eq('user_id',id).maybeSingle()
   ]);
   if(!allowed()||id!==ownerId)return;
   if(!results[0].error)venues=results[0].data||[];
   if(!results[1].error)data.details=results[1].data||{};
   data.venues=venues;
 }catch(e){console.warn('A2K setup lookup incomplete:',e)}
 send('init',data);
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
 return {city:parts[0],state:(text(state,2)||parts[1]||'IA').toUpperCase().slice(0,2)};
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
 if(roles.includes('owner')&&s.ownerBusiness&&!text(s.ownerEmail)&&!text(s.ownerPhone)&&!user().email)throw Error('Venue owner contact requires an email or phone number.');
 var profileUpdate={stage_name:name,bio:text(s.bio,300),karaoke_interests:rls,
    favorite_genres:roles.includes('singer')?(s.singerGenres||[]).filter(x=>typeof x==='string').slice(0,30):old.favorite_genres||[],
    directory_visible:priv.directory!==false,
    song_visibility:priv.songs===true?'public':'private',updated_at:now};
 // Never grant verified identities or management roles from self-declared interests.
 // Hiding the profile name means the profile itself must not be publicly readable.
 if(priv.displayName===false)profileUpdate.profile_visibility='private';
 else if(old.profile_visibility==='private'&&priv.displayName!==false)profileUpdate.profile_visibility='members';
 var updated=fail(await client().from('member_profiles').update(profileUpdate).eq('user_id',id).select('*').single());
 if(!allowed())throw Error('Your login changed while saving.');
 Object.assign(old,updated);
 if(s.photo&&/^data:image\//.test(s.photo)){
   var blob=await photoDataUrl(s.photo),path=id+'/avatar.jpg';
   fail(await client().storage.from('member-avatars').upload(path,blob,{contentType:'image/jpeg',upsert:true,cacheControl:'60'}));
   var p=fail(await client().from('member_profiles').update({avatar_path:path,updated_at:now}).eq('user_id',id).select('avatar_path,updated_at').single());
   Object.assign(old,p);
 }
 if(roles.includes('kj')||roles.includes('owner')){
   var d={user_id:id,kj_business_name:roles.includes('kj')?text(s.kjBusiness,150):'',kj_hosts:roles.includes('kj')?[name,...(s.hosts||[])].filter(Boolean).slice(0,30):[],
    kj_email:roles.includes('kj')?text(s.kjEmail,254):'',kj_phone:roles.includes('kj')?text(s.kjPhone,40):'',
    kj_show_email:roles.includes('kj')&&priv.email===true,kj_show_phone:roles.includes('kj')&&priv.phone===true,
    venue_business_name:roles.includes('owner')?text(s.ownerBusiness,150):'',
    venue_email:roles.includes('owner')?text(s.ownerEmail||user().email,254):'',venue_phone:roles.includes('owner')?text(s.ownerPhone,40):'',
    venue_show_email:roles.includes('owner')&&priv.email===true,venue_show_phone:roles.includes('owner')&&priv.phone===true,updated_at:now};
   fail(await client().from('member_setup_details').upsert(d,{onConflict:'user_id'}));
 }
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
   var byVenue=new Map();
   for(var item of (s.schedule||[])){
     if(!item||!item.venue)continue;
     var existingGroup=byVenue.get(item.venue)||{weekly:[],oneTime:[]};
     if(item.tab==='weekly')for(var day of (item.days||[])){
       var idx=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(day);
       if(idx!==-1)existingGroup.weekly.push({day:idx,start:item.start,end:item.end});
     }else if(item.tab==='once')existingGroup.oneTime.push(item);
     byVenue.set(item.venue,existingGroup);
   }
   for(var entry of byVenue){
     var v=currentVenue(entry[0],payload.venueRecords),c=parseCity(v.city,v.state);
     if(entry[1].weekly.length){
       var sessions=entry[1].weekly.slice(0,7);
       fail(await client().from('kj_host_submissions').insert({user_id:id,venue_id:v.id||null,venue_name:text(v.name,150),venue_address:text(v.address_line1,240)||null,
         venue_city:c.city,venue_state:c.state,venue_postal_code:text(v.postal_code,15)||null,sessions:sessions,status:'pending',notes:'Submitted during member setup'}));
     }
     // One-time events are retained in the setup request for moderation, never silently published.
     if(entry[1].oneTime.length){
       if(!entry[1].weekly.length)throw Error('One-time KJ events need a separate approval flow. Please remove them for now and submit the weekly schedule, or skip this schedule step.');
     }
   }
 }
 if(roles.includes('owner')&&s.claimSubmitted&&s.ownerVenue){
   var choice=s.ownerVenue;
   if(choice.mode==='claim'){
     var candidate=currentVenue(choice.name,payload.venueRecords);
     if(!candidate.id)throw Error('The claimed venue is not in A2K. Please propose a new venue instead.');
     fail(await client().from('venue_claim_requests').insert({venue_id:candidate.id,claimant_user_id:id,contact_name:text(s.ownerBusiness,120)||name,
       contact_email:text(s.ownerEmail||user().email,254),contact_phone:text(s.ownerPhone,40)||null,relationship:'owner',
       verification_details:'Claim requested through A2K member setup. Venue preferences (pending verification): '+text((s.ownerGenres||[]).join(', '),200),status:'pending'}));
   }else{
     var city=parseCity(choice.city,'');
     fail(await client().from('venue_suggestions').insert({name:text(choice.name,150),city:city.city,state:city.state,status:'submitted',submitted_by:id,
      karaoke_details:'Owner-proposed venue via member setup. Business: '+text(s.ownerBusiness,120)+'; amenities: '+text((s.ownerAmenities||[]).join(', '),150)+'; genres: '+text((s.ownerGenres||[]).join(', '),150)+'; schedule posting: '+text(s.postPolicy,15)}));
   }
 }
 var complete=fail(await client().from('member_profiles').update({onboarding_completed_at:new Date().toISOString()}).eq('user_id',id).select('onboarding_completed_at').single());
 if(allowed())old.onboarding_completed_at=complete.onboarding_completed_at;
 if(typeof memberLoadedUser!=='undefined')memberLoadedUser=null;
 if(typeof memberLoad==='function')void memberLoad();
 if(typeof authStatus==='function')authStatus('Your A2K member setup was saved.');
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