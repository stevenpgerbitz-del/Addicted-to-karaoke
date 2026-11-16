/* A2K 218: flexible first-sign-in karaoke setup. Never grants verified roles. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
 const c=()=>typeof authClient!=='undefined'?authClient:null;
 const user=()=>typeof authUser!=='undefined'?authUser:null;
 const profile=()=>typeof memberProfile!=='undefined'?memberProfile:null;
 const valid=()=>user()?.id&&user().id===profile()?.user_id;
 let data=null, step=0, isManual=false, busy=false, favoritesLoaded=false;
 let venues=[],venueError='',loadingDetails=false;
 const choices=[{id:'singer',name:'Singer',note:'Songs, favorite venues and reviews',icon:'♫'},
  {id:'kj',name:'KJ / Host',note:'Hosting details and your first karaoke night',icon:'🎤'},
  {id:'venue_owner',name:'Venue Owner',note:'Your venue and verification contacts',icon:'♛'}];
 const blank=()=>({roles:new Set(Array.isArray(profile()?.karaoke_interests)?profile().karaoke_interests:[]),
  photo:false,songTitle:'',songArtist:'',songType:'my_songs',songFavorite:false,
  favorites:new Set(),kjName:'',kjHosts:'',kjPhone:'',kjEmail:'',kjShowPhone:false,kjShowEmail:false,
  ownerName:'',ownerPhone:'',ownerEmail:'',ownerShowPhone:false,ownerShowEmail:false,openKj:false});
 const steps=()=>{
  const a=['interests'];
  if(data.roles.has('singer'))a.push('singer-photo','singer-songs','singer-favorites');
  if(data.roles.has('kj'))a.push('kj-details','kj-first-event');
  if(data.roles.has('venue_owner'))a.push('owner-details');
  a.push('finish');return a;
 };
 const stage=()=>steps()[Math.min(step,steps().length-1)];
 const note=(text,cls='a2k-setup-note')=>make('p',cls,text);
 function tile(title,description,active,action,icon){
  const b=make('button','a2k-setup-tile');b.type='button';b.setAttribute('aria-pressed',String(active));
  b.append(make('span','a2k-setup-tile-icon',icon),make('strong','',title));
  if(description)b.append(make('small','',description));
  b.onclick=action;return b;
 }
 function field(parent,title,key,opts={}){
  const label=make('label','a2k-setup-field',title);
  const input=make(opts.multiline?'textarea':'input');
  if(!opts.multiline)input.type=opts.type||'text';
  input.placeholder=opts.placeholder||'';input.maxLength=opts.max||120;
  input.value=data[key]||'';
  if(opts.multiline)input.rows=3;
  input.oninput=()=>data[key]=input.value;
  label.append(input);parent.append(label);return input;
 }
 function options(parent,label,keys){
  parent.append(note(label,'a2k-setup-caption'));
  const group=make('div','a2k-setup-choice-grid a2k-setup-privacy');
  for(const [key,title] of keys)group.append(tile(title,'',data[key],()=>{data[key]=!data[key];render()},data[key]?'◉':'○'));
  parent.append(group);
 }
 function render(){
  const dialog=$('atk-welcome-dialog');if(!dialog||!data)return;
  const body=$('atk-welcome-body'),title=$('atk-welcome-title'),status=$('atk-welcome-status');
  const next=$('atk-welcome-next'),skip=$('atk-welcome-skip');
  body.replaceChildren();status.textContent='';
  const current=stage(), all=steps();
  $('atk-welcome-progress').textContent='Step '+(step+1)+' of '+all.length;
  skip.textContent=current==='finish'?'Skip All':'Skip Step';
  next.textContent=current==='finish'?'Save & Finish':'Continue';
  skip.disabled=busy;next.disabled=busy;
  let skipAll=$('a2k-setup-skip-all');
  if(!skipAll){skipAll=make('button','a2k-setup-skip-all','Skip All');skipAll.id='a2k-setup-skip-all';skipAll.type='button';skipAll.onclick=()=>void save(true);$('atk-welcome-actions')?.append(skipAll);}
  skipAll.hidden=current==='finish';skipAll.disabled=busy;
  if(current==='interests'){
   title.textContent='My Karaoke Interests';
   body.append(note('First, how do you enjoy karaoke? Choose any that apply. You can change this later.'));
   const grid=make('div','a2k-setup-choice-grid');
   for(const x of choices)grid.append(tile(x.name,x.note,data.roles.has(x.id),()=>{
    if(data.roles.has(x.id))data.roles.delete(x.id);else data.roles.add(x.id);render();
   },x.icon));
   body.append(grid,note('These are interests, not verified roles or management permissions.'));
  }else if(current==='singer-photo'){
   title.textContent='Make Your Profile Yours';
   body.append(note('Add a profile photo, or come back to it whenever you like.'));
   const b=make('button','a2k-setup-action','Choose Profile Picture');b.type='button';
   b.onclick=()=>$('member-avatar-input')?.click();
   body.append(b,note('Your picture uses the existing profile-photo uploader.'));
  }else if(current==='singer-songs'){
   title.textContent='Add Your First Song';
   body.append(note('Start your karaoke songbook with a favorite song. Both fields can be left empty to skip.'));
   field(body,'Song title','songTitle',{placeholder:'Song title',max:200});
   field(body,'Artist','songArtist',{placeholder:'Artist',max:200});
   const row=make('div','a2k-setup-choice-grid');
   for(const [key,label] of [['my_songs','My Songs'],['want_to_sing','Want to Sing'],['duets','Duets']])
    row.append(tile(label,'',data.songType===key,()=>{data.songType=key;render()},'♫'));
   body.append(row);
   const favorite=tile('Mark as Favorite','',data.songFavorite,()=>{data.songFavorite=!data.songFavorite;render()},'♥');
   body.append(favorite);
  }else if(current==='singer-favorites'){
   title.textContent='Your Favorite Venues';
   body.append(note('Choose favorite karaoke places. You can choose more than one.'));
   const search=make('input','a2k-setup-search');search.type='search';search.placeholder='Search venues';
   search.setAttribute('aria-label','Search published venues');
   const list=make('div','a2k-setup-venue-list');
   const draw=()=>{
    list.replaceChildren();
    const q=search.value.trim().toLowerCase();
    const shown=venues.filter(v=>(v.name+' '+v.city).toLowerCase().includes(q)).slice(0,30);
    for(const v of shown)list.append(tile(v.name,v.city+', '+v.state,data.favorites.has(v.id),()=>{
     if(data.favorites.has(v.id))data.favorites.delete(v.id);else data.favorites.add(v.id);
     draw();
    },'☆'));
    if(!shown.length)list.append(note(venueError||'No matching venues.'));
   };
   search.oninput=draw;body.append(search,list);draw();
   if(!favoritesLoaded)void loadVenues();
  }else if(current==='kj-details'){
   title.textContent='Your KJ / Hosting Details';
   body.append(note('Only your business or KJ name is needed to continue. Contact information helps us verify hosts, but is optional.'));
   field(body,'KJ or business name','kjName',{placeholder:'Example: DJ Midnight',max:120});
   field(body,'Host names (one per line)','kjHosts',{multiline:true,placeholder:'You can list several hosts',max:500});
   field(body,'Contact email (optional)','kjEmail',{type:'email',placeholder:'you@example.com',max:254});
   field(body,'Contact phone (optional)','kjPhone',{type:'tel',placeholder:'Phone number',max:40});
   options(body,'After verification, what may be public?',[['kjShowEmail','Show my email'],['kjShowPhone','Show my phone']]);
   body.append(note('Contact details stay private for verification unless sharing is approved.'));
  }else if(current==='kj-first-event'){
   title.textContent='Set Up Your First KJ Night';
   body.append(note('We will help you find your venue, or suggest a new one, then add your hosting day and time.'));
   const b=make('button','a2k-setup-action','Set Up My First Event');
   b.type='button';b.onclick=()=>{data.openKj=true;step=steps().indexOf('finish');render();};
   body.append(b,note('The event will be submitted for approval, not published automatically.'));
  }else if(current==='owner-details'){
   title.textContent='Your Venue Owner Details';
   body.append(note('Enter your business or venue name. Phone and email are optional, but help our team verify ownership.'));
   field(body,'Venue or business name','ownerName',{placeholder:'Your business name',max:120});
   field(body,'Contact email (optional)','ownerEmail',{type:'email',placeholder:'you@example.com',max:254});
   field(body,'Contact phone (optional)','ownerPhone',{type:'tel',placeholder:'Phone number',max:40});
   options(body,'After verification, what may be public?',[['ownerShowEmail','Show my email'],['ownerShowPhone','Show my phone']]);
   body.append(note('Venue claims still need separate approval before any management access is granted.'));
  }else{
   title.textContent='Ready for the Spotlight!';
   body.append(note('You can change these interests and add more information later.'));
   body.append(note([...data.roles].map(x=>choices.find(c=>c.id===x)?.name).filter(Boolean).join(' · ')||'Just exploring for now','a2k-setup-summary'));
   if(data.openKj)body.append(note('Next: the first-hosting-event walkthrough opens when you finish.'));
  }
 }
 async function loadVenues(){
  if(!valid()||favoritesLoaded)return;
  favoritesLoaded=true;
  const r=await c().from('venues').select('id,name,city,state').eq('published',true).eq('publication_status','published').order('name').limit(200);
  if(r.error){venueError='Venues could not load. You can add favorites later.';}
  else venues=r.data||[];
  if(stage()==='singer-favorites')render();
 }
 async function loadPrivate(){
  if(loadingDetails||!valid())return;
  loadingDetails=true;const uid=user().id;
  const r=await c().from('member_setup_details').select('*').eq('user_id',uid).maybeSingle();
  if(!r.error&&r.data&&data&&uid===user()?.id){
   const v=r.data;
   Object.assign(data,{kjName:v.kj_business_name||'',kjHosts:(v.kj_hosts||[]).join('\n'),
    kjPhone:v.kj_phone||'',kjEmail:v.kj_email||'',kjShowPhone:!!v.kj_show_phone,kjShowEmail:!!v.kj_show_email,
    ownerName:v.venue_business_name||'',ownerPhone:v.venue_phone||'',ownerEmail:v.venue_email||'',
    ownerShowPhone:!!v.venue_show_phone,ownerShowEmail:!!v.venue_show_email});
   if(stage()==='kj-details'||stage()==='owner-details')render();
  }
  loadingDetails=false;
 }
 function start(manual=false){
  if(!valid())return;
  const dialog=$('atk-welcome-dialog');if(!dialog||dialog.open)return;
  isManual=!!manual;data=blank();step=0;busy=false;favoritesLoaded=false;venues=[];venueError='';
  if(typeof atkWelcomeDialogOwnerId!=='undefined')atkWelcomeDialogOwnerId=user().id;
  if(!manual&&$('signin-screen')?.hidden&&typeof navigate==='function')navigate('signin');
  dialog.showModal();
  // Use the original action row and add one accessible skip-all button.
  const actions=dialog.querySelector('.atk-welcome-actions');
  if(actions&&!actions.id)actions.id='atk-welcome-actions';
  render();void loadPrivate();
 }
 function mayStart(id,p){
  if(!p||p.onboarding_completed_at||user()?.id!==id)return;
  start(false);
 }
 function advance(){
  if(busy||!data)return;
  if(stage()==='kj-details'&&!data.kjName.trim()){
   $('atk-welcome-status').textContent='Enter a KJ/business name or choose Skip Step.';return;
  }
  if(stage()==='owner-details'&&!data.ownerName.trim()){
   $('atk-welcome-status').textContent='Enter a venue/business name or choose Skip Step.';return;
  }
  if(stage()==='singer-songs'&&Boolean(data.songTitle.trim())!==Boolean(data.songArtist.trim())){
   $('atk-welcome-status').textContent='Enter both a song title and artist, or leave both empty.';return;
  }
  if(stage()==='finish'){void save(false);return;}
  step=Math.min(step+1,steps().length-1);render();
 }
 function skip(){if(busy||!data)return;if(stage()==='finish'){void save(true);return;}step=Math.min(step+1,steps().length-1);render();}
 async function save(skipAll){
  if(busy||!valid()||!data)return;
  busy=true;$('atk-welcome-status').textContent='Saving your setup…';
  $('atk-welcome-next').disabled=true;$('atk-welcome-skip').disabled=true;
  const skipButton=$('a2k-setup-skip-all');if(skipButton)skipButton.disabled=true;
  const uid=user().id;
  try{
   const roles=[...data.roles].filter(x=>choices.some(v=>v.id===x));
   const detail={
     user_id:uid,kj_business_name:data.kjName.trim(),kj_hosts:data.kjHosts.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,12),
     kj_email:data.kjEmail.trim(),kj_phone:data.kjPhone.trim(),
     kj_show_email:!!data.kjShowEmail&&!!data.kjEmail.trim(),
     kj_show_phone:!!data.kjShowPhone&&!!data.kjPhone.trim(),
     venue_business_name:data.ownerName.trim(),venue_email:data.ownerEmail.trim(),venue_phone:data.ownerPhone.trim(),
     venue_show_email:!!data.ownerShowEmail&&!!data.ownerEmail.trim(),
     venue_show_phone:!!data.ownerShowPhone&&!!data.ownerPhone.trim(),
     updated_at:new Date().toISOString()
   };
   if(!skipAll&&[detail.kj_business_name,detail.venue_business_name,detail.kj_email,detail.kj_phone,detail.venue_email,detail.venue_phone].some(Boolean)){
    const x=await c().from('member_setup_details').upsert(detail,{onConflict:'user_id'});if(x.error)throw x.error;
   }
   if(!skipAll&&roles.includes('singer')&&data.songTitle.trim()&&data.songArtist.trim()){
    const r=await c().from('karaoke_songs').insert({user_id:uid,title:data.songTitle.trim(),
     artist:data.songArtist.trim(),list_type:data.songType,favorite:data.songFavorite});
    if(r.error)throw r.error;
   }
   if(!skipAll&&roles.includes('singer')&&data.favorites.size){
    const r=await c().from('venue_favorites').upsert([...data.favorites].map(venue_id=>({user_id:uid,venue_id})),
      {onConflict:'user_id,venue_id',ignoreDuplicates:true});if(r.error)throw r.error;
   }
   const r=await c().from('member_profiles')
     .update({karaoke_interests:roles,onboarding_completed_at:new Date().toISOString()})
     .eq('user_id',uid).select('karaoke_interests,onboarding_completed_at').single();
   if(r.error)throw r.error;
   if(!valid()||uid!==user()?.id)return;
   Object.assign(profile(),r.data);
   const label=$('member-karaoke-interests');
   if(label&&typeof atkWelcomeSummary==='function')label.textContent=atkWelcomeSummary(roles)||'Your karaoke stage';
   if(typeof profileInterestNavSync==='function')profileInterestNavSync();
   if(typeof memberInterestsRender==='function')memberInterestsRender();
   if(typeof memberLoad==='function'){if(typeof memberLoadedUser!=='undefined')memberLoadedUser=null;void memberLoad();}
   const openKj=!skipAll&&data.openKj&&roles.includes('kj');
   $('atk-welcome-dialog').close();
   if(typeof atkWelcomeDialogOwnerId!=='undefined')atkWelcomeDialogOwnerId=null;
   data=null;
   if(openKj&&typeof atkKjStart==='function')void atkKjStart(true);
  }catch(err){
   $('atk-welcome-status').textContent='Could not finish setup: '+(err.message||'Please try again.');
  }finally{
   busy=false;
   if($('atk-welcome-dialog')?.open){$('atk-welcome-next').disabled=false;$('atk-welcome-skip').disabled=false;if(skipButton)skipButton.disabled=false;}
  }
 }
 // The original first-sign-in flow calls these global functions directly.
 window.atkWelcomeStart=start;
 window.atkWelcomeMaybeStart=mayStart;
 window.atkWelcomeNext=advance;
 window.atkWelcomeSkip=skip;
 window.atkWelcomeRender=render;
 // An existing member can revisit onboarding without creating another account.
 function installReopen(){
  const host=$('member-about-interests')?.parentElement;
  if(!host||$('a2k-setup-reopen'))return;
  const button=make('button','a2k-setup-reopen','Run Setup Wizard');
  button.id='a2k-setup-reopen';button.type='button';
  button.onclick=()=>{
   if($('profile-section-dialog')?.open&&typeof profileCloseSection==='function')profileCloseSection();
   queueMicrotask(()=>start(true));
  };
  host.append(button);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installReopen,{once:true});
 else installReopen();
})();
