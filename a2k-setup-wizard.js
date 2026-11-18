/* A2K 221 — one continuous, full-page setup wizard.
   Only self-declared interests are saved; no admin, verified KJ or venue ownership permissions are granted. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
 const client=()=>typeof authClient!=='undefined'?authClient:null;
 const currentUser=()=>typeof authUser!=='undefined'?authUser:null;
 const profile=()=>typeof memberProfile!=='undefined'?memberProfile:null;
 const authorized=()=>!!(client()&&currentUser()?.id&&profile()?.user_id===currentUser().id);
 const roles=[
  {id:'singer',label:'Singer',icon:'♫',description:'Songs, favorites and your favorite karaoke places'},
  {id:'kj',label:'KJ / Host',icon:'🎤',description:'Your hosting details and first karaoke night'},
  {id:'venue_owner',label:'Venue Staff',icon:'♛',description:'Your venue and verification contact details'}
 ];
 const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const formSteps=()=>{
  const list=['interests'];
  if(state.roles.has('singer'))list.push('photo','song','favorites');
  if(state.roles.has('kj'))list.push('kj-details','kj-night');
  if(state.roles.has('venue_owner'))list.push('owner-details');
  list.push('review');return list;
 };
 let state=null,step=0,manual=false,busy=false,venues=[],venuesReady=false,venueError='',draftUser=null,saved={},dirty=new Set(),scrollRestoration='';
 let host=null,content=null,status=null,heading=null,progress=null,previous=null,next=null,skip=null,skipAll=null,scroller=null;
 function build(){
  if(host)return;
  host=el('section','a2k-setup-fullpage');host.id='a2k-setup-fullpage';host.hidden=true;
  host.setAttribute('role','main');host.setAttribute('aria-label','Addicted to Karaoke setup wizard');
  host.innerHTML='<div class="a2k-setup-screen"><div class="a2k-setup-top"><div class="a2k-setup-brand"><strong>Addicted to <em>Karaoke</em></strong><small>Built for singers, powered by KJs</small></div><button type="button" class="a2k-setup-top-skip" id="a2k-setup-top-skip">Skip All</button></div><div class="a2k-setup-scroller" id="a2k-setup-scroller"><div class="a2k-setup-main"><h1>Set Up Your Addicted to Karaoke Profile</h1><p class="a2k-setup-intro">One easy step at a time. You can always update your profile later.</p><div class="a2k-setup-progress" id="a2k-setup-progress" aria-label="Setup progress"></div><div class="a2k-setup-panel"><p class="a2k-setup-step-name" id="a2k-setup-step-name"></p><h2 id="a2k-setup-heading"></h2><div class="a2k-setup-contents" id="a2k-setup-contents"></div><p class="a2k-setup-error" id="a2k-setup-error" role="status" aria-live="polite"></p><div class="a2k-setup-actions"><button type="button" id="a2k-setup-prev">Previous</button><button type="button" id="a2k-setup-skip">Skip Step</button><button type="button" id="a2k-setup-next">Next</button></div></div></div></div></div>';
  document.body.append(host);
  content=$('a2k-setup-contents');status=$('a2k-setup-error');heading=$('a2k-setup-heading');
  progress=$('a2k-setup-progress');scroller=$('a2k-setup-scroller');
  previous=$('a2k-setup-prev');next=$('a2k-setup-next');skip=$('a2k-setup-skip');skipAll=$('a2k-setup-top-skip');
  previous.onclick=goBack;next.onclick=advance;skip.onclick=skipStep;skipAll.onclick=()=>void skipEntireWizard();
 }
 function steps(){return formSteps()}
 function stage(){return steps()[Math.min(step,steps().length-1)]}
 function makeButton(label,action,cls='a2k-setup-button'){
  const b=el('button',cls,label);b.type='button';b.onclick=action;return b;
 }
 function textLine(value,cls='a2k-setup-help'){return el('p',cls,value)}
 function choice(label,detail,icon,selected,fn){
  const b=makeButton('',fn,'a2k-setup-choice');
  b.setAttribute('aria-pressed',String(!!selected));
  const symbol=el('span','a2k-setup-choice-icon',icon||'♫');
  symbol.setAttribute('aria-hidden','true');b.append(symbol,el('strong','',label));
  if(detail)b.append(el('small','',detail));
  return b;
 }
 function inputField(parent,label,key,opts={}){
  const wrap=el('label','a2k-setup-field');wrap.append(el('strong','',label));
  const field=el(opts.multiline?'textarea':'input');
  if(!opts.multiline){field.type=opts.type||'text';if(opts.inputMode)field.inputMode=opts.inputMode;}
  else field.rows=3;
  field.placeholder=opts.placeholder||'';field.maxLength=opts.max||120;
  field.autocomplete=opts.autocomplete||'off';field.value=state[key]||'';
  field.addEventListener('input',()=>{
   let value=field.value;
   if(opts.phone){value=formatPhone(value);field.value=value;}
   state[key]=value;dirty.add(key);
  });
  wrap.append(field);parent.append(wrap);return field;
 }
 function formatPhone(text){
  let n=String(text||'').replace(/\D/g,'');
  if(n.length===11&&n[0]==='1')n=n.slice(1);
  n=n.slice(0,10);
  if(!n)return '';
  if(n.length<4)return '('+n;
  if(n.length<7)return '('+n.slice(0,3)+') '+n.slice(3);
  return '('+n.slice(0,3)+') '+n.slice(3,6)+'-'+n.slice(6);
 }
 function visibility(label,emailKey,phoneKey){
  content.append(textLine(label,'a2k-setup-caption'));
  const row=el('div','a2k-setup-grid');
  row.append(choice('Show my email','', '✉',state[emailKey],()=>{state[emailKey]=!state[emailKey];render(true)}),
             choice('Show my phone','', '☎',state[phoneKey],()=>{state[phoneKey]=!state[phoneKey];render(true)}));
  content.append(row,textLine('Contact details stay private for verification unless sharing is approved.'));
 }
 function selectedLabel(){return [...state.roles].map(r=>roles.find(x=>x.id===r)?.label).filter(Boolean).join(' · ')||'Just exploring';}
 function prettyTime(v){
  if(!/^\d{2}:\d{2}$/.test(String(v)))return 'Not set';
  const [hour,minute]=v.split(':').map(Number);
  return (hour%12||12)+':'+String(minute).padStart(2,'0')+(hour<12?' AM':' PM');
 }
 function summaryLine(parent,label,value){
  const line=el('div','a2k-setup-summary-row');
  line.append(el('strong','',label),el('span','',value||'Not supplied'));
  parent.append(line);
 }
 function render(keepScroll=false){
  if(!host||host.hidden||!state)return;
  const scroll=keepScroll?scroller.scrollTop:0;
  content.replaceChildren();status.textContent='';
  const parts=steps(),phase=stage(),final=phase==='review';
  progress.replaceChildren();
  for(let i=0;i<parts.length;i++){
   const marker=el('div','a2k-setup-marker');
   marker.classList.toggle('is-current',i===step);
   marker.classList.toggle('is-complete',i<step);
   marker.append(el('span','',i<step?'✓':String(i+1)),el('small','',stepName(parts[i])));
   progress.append(marker);
  }
  $('a2k-setup-step-name').textContent='Step '+(step+1)+' of '+parts.length;
  previous.hidden=step===0;skip.hidden=final;skipAll.hidden=final;
  next.textContent=final?'Save & Finish':'Next';
  next.disabled=busy;previous.disabled=busy;skip.disabled=busy;skipAll.disabled=busy;
  if(phase==='interests'){
   heading.textContent='My Karaoke Interests';
   content.append(textLine('First, how do you enjoy karaoke? Choose any that apply. You can change this later.'));
   const choices=el('div','a2k-setup-grid');
   for(const r of roles)choices.append(choice(r.label,r.description,r.icon,state.roles.has(r.id),()=>{
    if(state.roles.has(r.id))state.roles.delete(r.id);else state.roles.add(r.id);
    render(true);
   }));
   content.append(choices,textLine('Interests do not grant verified badges, ownership, or management privileges.'));
  }else if(phase==='photo'){
   heading.textContent='Make Your Profile Yours';
   content.append(textLine('Add a profile picture or continue without one.'));
   content.append(makeButton('Choose Profile Picture',()=>{$('member-avatar-input')?.click()},'a2k-setup-feature-button'));
   content.append(textLine('You can also add or change your picture later.'));
  }else if(phase==='song'){
   heading.textContent='Add Your First Song';
   content.append(textLine('Add a song to your karaoke songbook, or skip this step.'));
   inputField(content,'Song title','songTitle',{placeholder:'Song title',max:200});
   inputField(content,'Artist','songArtist',{placeholder:'Artist',max:200});
   const group=el('div','a2k-setup-grid');
   for(const [key,label] of [['my_songs','My Songs'],['want_to_sing','Want to Sing'],['duets','Duets']])
    group.append(choice(label,'','♫',state.songType===key,()=>{state.songType=key;render(true)}));
   content.append(group,choice('Mark as Favorite','','♥',state.songFavorite,()=>{state.songFavorite=!state.songFavorite;render(true)}));
  }else if(phase==='favorites'){
   heading.textContent='Your Favorite Venues';
   content.append(textLine('Find and save a few favorite karaoke spots. This step is optional.'));
   const inp=el('input','a2k-setup-search');inp.type='search';inp.placeholder='Search published venues';
   inp.setAttribute('aria-label','Search favorite venues');inp.value=state.favoriteQuery;
   const list=el('div','a2k-setup-grid a2k-setup-results');
   const populate=()=>{
    list.replaceChildren();const q=state.favoriteQuery.trim().toLowerCase();
    const matches=venues.filter(v=>(v.name+' '+v.city).toLowerCase().includes(q)).slice(0,30);
    for(const v of matches)list.append(choice(v.name,v.city+', '+(v.state||'IA'),'☆',state.favorites.has(v.id),()=>{
     if(state.favorites.has(v.id))state.favorites.delete(v.id);else state.favorites.add(v.id);
     populate();
    }));
    if(!matches.length)list.append(textLine(venueError||(!venuesReady?'Loading venues…':'No matching venues.')));
   };
   inp.oninput=()=>{state.favoriteQuery=inp.value;populate()};
   content.append(inp,list);populate();void loadVenues();
  }else if(phase==='kj-details'){
   heading.textContent='Your KJ / Hosting Details';
   content.append(textLine('Your KJ or business name is the only required field on this step. Everything can be revisited later.'));
   inputField(content,'KJ or business name','kjName',{placeholder:'Example: DJ Midnight',max:120});
   inputField(content,'Host names (one per line)','kjHosts',{multiline:true,placeholder:'List multiple hosts if needed',max:500});
   inputField(content,'Contact email (optional)','kjEmail',{type:'email',placeholder:'you@example.com',max:254});
   inputField(content,'Contact phone (optional)','kjPhone',{type:'tel',inputMode:'tel',placeholder:'(515) 222-2222',max:14,phone:true});
   visibility('After verification, what may be public?','kjShowEmail','kjShowPhone');
  }else if(phase==='owner-details'){
   heading.textContent='Your Venue Staff Details';
   content.append(textLine('Enter your venue or business name. Contact information is optional and private until you choose to share it.'));
   inputField(content,'Venue or business name','ownerName',{placeholder:'Your business name',max:120});
   inputField(content,'Contact email (optional)','ownerEmail',{type:'email',placeholder:'you@example.com',max:254});
   inputField(content,'Contact phone (optional)','ownerPhone',{type:'tel',inputMode:'tel',placeholder:'(515) 222-2222',max:14,phone:true});
   visibility('After verification, what may be public?','ownerShowEmail','ownerShowPhone');
   content.append(textLine('Claiming a venue requires separate approval; this setup will not grant venue access.'));
  }else if(phase==='kj-night'){
   renderKjNight();
  }else if(phase==='review'){
   heading.textContent='Review & Finish';
   content.append(textLine('Check your setup before saving. Nothing will be published as a verified role.'));
   const block=el('div','a2k-setup-summary');
   summaryLine(block,'Karaoke interests',selectedLabel());
   if(state.roles.has('singer')){
    if(!state.skipped.has('song')&&state.songTitle.trim()&&state.songArtist.trim())
     summaryLine(block,'First song',state.songTitle.trim()+' — '+state.songArtist.trim());
    summaryLine(block,'Favorite venues',String(state.favorites.size)+' selected');
   }
   if(state.roles.has('kj')){
    summaryLine(block,'KJ / Business',state.skipped.has('kj-details')?'Skipped':state.kjName.trim()||'Not supplied');
    if(!state.skipped.has('kj-details')){
     summaryLine(block,'Host names',state.kjHosts.trim().replace(/\n/g,', '));
     summaryLine(block,'KJ contact phone',state.kjPhone);
     summaryLine(block,'KJ contact email',state.kjEmail);
     summaryLine(block,'Show KJ email / phone',(state.kjShowEmail?'Yes':'No')+' / '+(state.kjShowPhone?'Yes':'No'));
    }
    if(readyEvent()){
     summaryLine(block,'Hosting venue',state.kjVenueName);
     summaryLine(block,'Hosting nights',dayNames.filter((_,i)=>state.sessions.has(i))
      .map(day=>{const i=dayNames.indexOf(day),s=state.sessions.get(i);return day+' '+prettyTime(s.start)+'–'+prettyTime(s.end)}).join(' · '));
    }else summaryLine(block,'First hosting night','Not added yet');
   }
   if(state.roles.has('venue_owner')){
    summaryLine(block,'Venue business',state.skipped.has('owner-details')?'Skipped':state.ownerName||'Not supplied');
    if(!state.skipped.has('owner-details')){
     summaryLine(block,'Owner contact phone',state.ownerPhone);
     summaryLine(block,'Owner contact email',state.ownerEmail);
    }
   }
   content.append(block,textLine('Select Save & Finish to save your profile and any hosting night you entered.'));
  }
  scroller.scrollTop=scroll;
 }
 function stepName(key){
  return ({interests:'Interests',photo:'Profile Photo',song:'First Song',favorites:'Favorites','kj-details':'KJ Details','kj-night':'First KJ Night','owner-details':'Owner Details',review:'Finish'})[key]||key;
 }
 function renderKjNight(){
  heading.textContent='Set Up Your First KJ Night';
  content.append(textLine('Find a venue or add one that is missing, then select the days and digital start/end times. No additional setup window.'));
  const label=el('label','a2k-setup-field');label.append(el('strong','','Find a venue'));
  const search=el('input','a2k-setup-search');search.type='search';search.placeholder='Search existing karaoke venues';
  search.value=state.kjSearch;search.setAttribute('aria-label','Search existing venues');
  label.append(search);content.append(label);
  const list=el('div','a2k-setup-grid a2k-setup-results');
  const updateList=()=>{
   list.replaceChildren();
   const q=state.kjSearch.trim().toLowerCase();
   if(!q){list.append(textLine(state.kjVenueId?'Selected: '+state.kjVenueName:'Start typing to find an existing venue.'));return;}
   const matches=venues.filter(v=>(v.name+' '+v.city).toLowerCase().includes(q)).slice(0,8);
   for(const v of matches)list.append(choice(v.name,v.city+', '+(v.state||'IA'),'⌕',state.kjVenueId===v.id,()=>{
    state.kjVenueId=v.id;state.kjVenueName=v.name;state.kjAddress=v.address_line1||'';
    state.kjCity=v.city||'';state.kjState=v.state||'IA';state.kjPostal=v.postal_code||'';
    state.newVenue=false;state.kjSearch=v.name;render(true);
   }));
   if(!matches.length)list.append(textLine(!venuesReady?'Searching venues…':'No matching venues. Add a new one below.'));
  };
  search.oninput=()=>{state.kjSearch=search.value;state.kjVenueId=null;state.newVenue=false;updateList();};
  content.append(list);updateList();
  content.append(makeButton(state.newVenue?'Hide New Venue Fields':'My Venue Is Not Listed',()=>{
   state.newVenue=!state.newVenue;state.kjVenueId=null;
   if(state.newVenue&&!state.kjVenueName)state.kjVenueName=state.kjSearch;
   render(true);
  },'a2k-setup-link-button'));
  if(state.newVenue){
   const group=el('div','a2k-setup-new-venue');
   group.append(textLine('New venues are submitted with your hosting information.','a2k-setup-caption'));
   inputField(group,'Venue name','kjVenueName',{placeholder:'Venue or bar name',max:150});
   inputField(group,'Street address (recommended)','kjAddress',{placeholder:'Street address',max:240});
   inputField(group,'City','kjCity',{placeholder:'City',max:120});
   inputField(group,'State (2 letters)','kjState',{placeholder:'IA',max:2});
   inputField(group,'ZIP code (optional)','kjPostal',{placeholder:'ZIP',max:15});
   content.append(group);
  }else if(state.kjVenueId){
   content.append(textLine('Selected venue: '+state.kjVenueName+', '+state.kjCity+', '+state.kjState,'a2k-setup-picked'));
  }
  content.append(textLine('Choose your hosting days','a2k-setup-caption'));
  const days=el('div','a2k-setup-days');
  for(let i=0;i<7;i++)days.append(choice(dayNames[i],'','♫',state.sessions.has(i),()=>{
   if(state.sessions.has(i))state.sessions.delete(i);
   else state.sessions.set(i,{day:i,start:'20:00',end:'00:00'});
   render(true);
  }));
  content.append(days);
  if(state.sessions.size){
   content.append(textLine('Digital times are built into this page. New days start with example times of 8:00 PM–12:00 AM; please adjust them.','a2k-setup-help'));
   for(const i of [...state.sessions.keys()].sort((a,b)=>a-b)){
    const row=el('div','a2k-setup-night');
    row.append(el('h3','',dayNames[i]));
    const times=el('div','a2k-setup-time-pair');
    for(const key of ['start','end'])times.append(digitalClock(i,key));
    row.append(times);content.append(row);
   }
  }else content.append(textLine('No hosting nights selected. You can skip this step and add them later.'));
  content.append(textLine('Hosting schedules follow the existing venue approval rules. A new or unclaimed venue may be handled differently from a claimed venue.'));
  void loadVenues();
 }
 function digitalClock(day,key){
  const session=state.sessions.get(day);
  const box=el('div','a2k-setup-clock');
  const title=el('h4','',key==='start'?'Starts':'Ends');box.append(title);
  const [hour24,min]=session[key].split(':').map(Number);
  const hh=hour24%12||12,ampm=hour24<12?'AM':'PM';
  const display=el('div','a2k-setup-clock-display');
  function change(part,direction){
   const s=state.sessions.get(day);if(!s)return;
   let [h,m]=s[key].split(':').map(Number);
   const period=h>=12?12:0;
   if(part==='h'){const old=h%12||12;const value=(old-1+direction+12)%12+1;h=value%12+period;}
   else if(part==='m'){m=(m+direction*5+60)%60;}
   else {h=(h+12)%24;}
   s[key]=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
   render(true);
  }
  const blocks=[['h',String(hh).padStart(2,'0'),'Hour'],['m',String(min).padStart(2,'0'),'Minute'],['ampm',ampm,'AM / PM']];
  for(const [part,value,label] of blocks){
   const unit=el('div','a2k-setup-clock-unit');unit.append(el('small','',label));
   const up=makeButton('▲',()=>change(part,part==='ampm'?1:1),'a2k-setup-clock-arrow');
   const val=el('strong','',value);
   const down=makeButton('▼',()=>change(part,part==='ampm'?1:-1),'a2k-setup-clock-arrow');
   up.setAttribute('aria-label','Increase '+label+' for '+dayNames[day]+' '+(key==='start'?'start':'end'));
   down.setAttribute('aria-label','Decrease '+label+' for '+dayNames[day]+' '+(key==='start'?'start':'end'));
   unit.append(up,val,down);display.append(unit);
   if(part==='h'||part==='m')if(part==='h')display.append(el('span','a2k-setup-colon',':'));
  }
  box.append(display);
  const summary=el('div','a2k-setup-clock-summary',prettyTime(session[key]));box.append(summary);
  return box;
 }
 async function loadVenues(){
  if(venuesReady||!authorized())return;
  venuesReady=true;const request=draftUser;
  try{
   const r=await client().from('venues').select('id,name,city,state,address_line1,postal_code')
    .eq('published',true).eq('publication_status','published').order('name').limit(250);
   if(r.error)throw r.error;
   if(request!==draftUser||!state)return;
   venues=r.data||[];
  }catch(e){venueError='Venue search unavailable. You can enter a new venue manually.';}
  if(host&&!host.hidden&&(stage()==='favorites'||stage()==='kj-night'))render(true);
 }
 async function loadPrivate(){
  const uid=draftUser;
  try{
   const r=await client().from('member_setup_details').select('*').eq('user_id',uid).maybeSingle();
   if(r.error||!r.data||!state||uid!==draftUser)return;
   const row=r.data;
   const values={
    kjName:row.kj_business_name||'',kjHosts:(row.kj_hosts||[]).join('\n'),kjEmail:row.kj_email||'',
    kjPhone:formatPhone(row.kj_phone||''),kjShowEmail:!!row.kj_show_email,kjShowPhone:!!row.kj_show_phone,
    ownerName:row.venue_business_name||'',ownerEmail:row.venue_email||'',ownerPhone:formatPhone(row.venue_phone||''),
    ownerShowEmail:!!row.venue_show_email,ownerShowPhone:!!row.venue_show_phone
   };
   for(const [key,value] of Object.entries(values))if(!dirty.has(key))state[key]=value;
   if(['kj-details','owner-details'].includes(stage()))render(true);
  }catch(e){console.warn('Optional setup details unavailable',e)}
 }
 function initialDraft(){
  return {roles:new Set(Array.isArray(profile()?.karaoke_interests)?profile().karaoke_interests:[]),
   skipped:new Set(),songTitle:'',songArtist:'',songType:'my_songs',songFavorite:false,
   favorites:new Set(),favoriteQuery:'',kjName:'',kjHosts:'',kjPhone:'',kjEmail:'',
   kjShowPhone:false,kjShowEmail:false,ownerName:'',ownerPhone:'',ownerEmail:'',
   ownerShowEmail:false,ownerShowPhone:false,
   kjVenueId:null,kjVenueName:'',kjAddress:'',kjCity:'',kjState:'IA',kjPostal:'',kjSearch:'',
   newVenue:false,sessions:new Map()};
 }
 function open(manualOpen=false){
  if(!authorized())return;
  build();if(!host.hidden)return;
  manual=!!manualOpen;step=0;busy=false;dirty=new Set();saved={};
  venues=[];venuesReady=false;venueError='';draftUser=currentUser().id;
  state=initialDraft();scrollRestoration=document.body.style.overflow;
  document.body.style.overflow='hidden';host.hidden=false;
  if(typeof atkWelcomeDialogOwnerId!=='undefined')atkWelcomeDialogOwnerId=draftUser;
  if(!manual&&$('signin-screen')?.hidden&&typeof navigate==='function')navigate('signin');
  render();scroller.scrollTop=0;heading?.focus();
  void loadPrivate();
 }
 function maybeStart(id,record){if(record&&!record.onboarding_completed_at&&currentUser()?.id===id)open(false)}
 function close(){
  if(!host||host.hidden)return;
  host.hidden=true;document.body.style.overflow=scrollRestoration;
  if(typeof atkWelcomeDialogOwnerId!=='undefined')atkWelcomeDialogOwnerId=null;
  draftUser=null;state=null;busy=false;
 }
 function report(message){status.textContent=message;status.scrollIntoView({block:'nearest',behavior:'smooth'});}
 function validatePhone(value){
  return !value||value.replace(/\D/g,'').length===10;
 }
 function validateStep(key){
  if(key==='kj-details'){
   if(!state.kjName.trim())return 'Enter your KJ or business name, or choose Skip Step.';
   if(state.kjHosts.split(/\n/).filter(x=>x.trim()).length>12)return 'Please list up to 12 host names.';
   if(state.kjEmail&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.kjEmail.trim()))return 'Enter a valid email address.';
   if(!validatePhone(state.kjPhone))return 'Enter a 10-digit US phone number, or leave it blank.';
  }
  if(key==='owner-details'){
   if(!state.ownerName.trim())return 'Enter your venue or business name, or choose Skip Step.';
   if(state.ownerEmail&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.ownerEmail.trim()))return 'Enter a valid email address.';
   if(!validatePhone(state.ownerPhone))return 'Enter a 10-digit US phone number, or leave it blank.';
  }
  if(key==='song'&&Boolean(state.songTitle.trim())!==Boolean(state.songArtist.trim()))
   return 'Enter both song title and artist, or choose Skip Step.';
  if(key==='kj-night'&&state.sessions.size){
   if(!state.kjVenueId&&!state.newVenue)return 'Choose an existing venue or select My Venue Is Not Listed.';
   if(state.newVenue){
    if(state.kjVenueName.trim().length<3)return 'Enter a venue name of at least 3 characters.';
    if(state.kjCity.trim().length<2)return 'Enter a city for your new venue.';
    if(!/^[A-Za-z]{2}$/.test(state.kjState.trim()))return 'Use a two-letter state abbreviation.';
   }
   for(const s of state.sessions.values())if(s.start===s.end)return 'Start and end time must be different on '+dayNames[s.day]+'.';
  }
  return '';
 }
 function advance(){
  if(busy||!state)return;
  if(stage()==='review'){void save();return;}
  const error=validateStep(stage());if(error){report(error);return;}
  state.skipped.delete(stage());
  step=Math.min(step+1,steps().length-1);render();scroller.scrollTop=0;
 }
 function goBack(){if(!state||busy||step===0)return;step--;render();scroller.scrollTop=0;}
 function skipStep(){
  if(busy||!state||stage()==='review')return;
  state.skipped.add(stage());
  if(stage()==='kj-night')state.sessions.clear();
  if(stage()==='song'){state.songTitle='';state.songArtist='';}
  if(stage()==='interests')state.roles.clear();
  step=Math.min(step+1,steps().length-1);render();scroller.scrollTop=0;
 }
 async function skipEntireWizard(){
  if(busy||!authorized())return;
  if(manual){close();return;}
  busy=true;render(true);report('Skipping setup…');
  const uid=draftUser;
  try{
   const result=await client().from('member_profiles').update({onboarding_completed_at:new Date().toISOString()})
    .eq('user_id',uid).select('onboarding_completed_at').single();
   if(result.error)throw result.error;
   if(profile()&&profile().user_id===uid)profile().onboarding_completed_at=result.data.onboarding_completed_at;
   close();
  }catch(e){busy=false;render(true);report('Could not skip setup: '+(e.message||'Try again.'))}
 }
 function readyEvent(){return state.sessions.size>0&&!state.skipped.has('kj-night');}
 async function save(){
  if(!authorized()||busy||!state)return;
  busy=true;render(true);report('Saving your karaoke setup…');
  const uid=draftUser;const rolesSaved=[...state.roles].filter(x=>roles.some(r=>r.id===x));
  try{
   if(!saved.interests){
    const r=await client().from('member_profiles').update({karaoke_interests:rolesSaved}).eq('user_id',uid)
     .select('karaoke_interests').single();
    if(r.error)throw r.error;saved.interests=true;
   }
   const details={
    user_id:uid,kj_business_name:state.skipped.has('kj-details')?'':state.kjName.trim(),
    kj_hosts:state.skipped.has('kj-details')?[]:state.kjHosts.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,12),
    kj_email:state.skipped.has('kj-details')?'':state.kjEmail.trim(),
    kj_phone:state.skipped.has('kj-details')?'':state.kjPhone.trim(),
    kj_show_email:!state.skipped.has('kj-details')&&!!state.kjShowEmail&&!!state.kjEmail.trim(),
    kj_show_phone:!state.skipped.has('kj-details')&&!!state.kjShowPhone&&!!state.kjPhone.trim(),
    venue_business_name:state.skipped.has('owner-details')?'':state.ownerName.trim(),
    venue_email:state.skipped.has('owner-details')?'':state.ownerEmail.trim(),
    venue_phone:state.skipped.has('owner-details')?'':state.ownerPhone.trim(),
    venue_show_email:!state.skipped.has('owner-details')&&!!state.ownerShowEmail&&!!state.ownerEmail.trim(),
    venue_show_phone:!state.skipped.has('owner-details')&&!!state.ownerShowPhone&&!!state.ownerPhone.trim(),
    updated_at:new Date().toISOString()
   };
   const hasDetails=rolesSaved.includes('kj')||rolesSaved.includes('venue_owner');
   if(hasDetails&&!saved.details&&['kj_business_name','venue_business_name','kj_email','venue_email','kj_phone','venue_phone'].some(k=>!!details[k])){
    const x=await client().from('member_setup_details').upsert(details,{onConflict:'user_id'});
    if(x.error)throw x.error;saved.details=true;
   }
   if(rolesSaved.includes('singer')&&!state.skipped.has('song')&&state.songTitle.trim()&&state.songArtist.trim()&&!saved.song){
    const r=await client().from('karaoke_songs').insert({user_id:uid,title:state.songTitle.trim(),
      artist:state.songArtist.trim(),list_type:state.songType,favorite:!!state.songFavorite});
    if(r.error)throw r.error;saved.song=true;
   }
   if(rolesSaved.includes('singer')&&state.favorites.size&&!state.skipped.has('favorites')&&!saved.favorites){
    const r=await client().from('venue_favorites').upsert([...state.favorites].map(venue_id=>({user_id:uid,venue_id})),
      {onConflict:'user_id,venue_id',ignoreDuplicates:true});
    if(r.error)throw r.error;saved.favorites=true;
   }
   let eventStatus='';
   if(rolesSaved.includes('kj')&&readyEvent()&&!saved.event){
    const payload={user_id:uid,venue_id:state.kjVenueId||null,venue_name:state.kjVenueName.trim(),
     venue_address:state.kjAddress.trim()||null,venue_city:state.kjCity.trim(),venue_state:state.kjState.trim().toUpperCase(),
     venue_postal_code:state.kjPostal.trim()||null,sessions:[...state.sessions.values()].sort((a,b)=>a.day-b.day)
      .map(s=>({day:s.day,start:s.start,end:s.end})),notes:'Submitted during account setup'};
    const r=await client().from('kj_host_submissions').insert(payload).select('id,status').single();
    if(r.error)throw r.error;
    if(!r.data?.id)throw Error('Hosting request did not return a confirmation.');
    saved.event=true;eventStatus=r.data.status||'';
   }
   const finish=await client().from('member_profiles')
     .update({onboarding_completed_at:new Date().toISOString()})
     .eq('user_id',uid).select('karaoke_interests,onboarding_completed_at').single();
   if(finish.error)throw finish.error;
   if(!authorized()||uid!==draftUser)return;
   Object.assign(profile(),finish.data);
   if($('member-karaoke-interests')&&typeof atkWelcomeSummary==='function')
    $('member-karaoke-interests').textContent=atkWelcomeSummary(rolesSaved)||'Your karaoke stage';
   if(typeof profileInterestNavSync==='function')profileInterestNavSync();
   if(typeof memberInterestsRender==='function')memberInterestsRender();
   close();
   if(typeof memberLoadedUser!=='undefined')memberLoadedUser=null;
   if(typeof memberLoad==='function')void memberLoad();
   const message=eventStatus==='pending'?'Setup saved. Your hosting night is awaiting approval.':
      eventStatus==='approved'?'Setup saved. Your hosting night was added.':'Your karaoke setup was saved.';
   if(typeof authStatus==='function')authStatus(message);
  }catch(e){busy=false;render(true);report('Could not finish setup: '+(e.message||'Please retry.'));}
 }
 function installReopen(){
  // Keep the existing setup action in Settings, not About Me.
  const settings=$('a2k-profile-settings')?.querySelector('.a2k-profile-settings-panel');
  if(!settings)return;
  let b=$('a2k-setup-reopen');
  if(!b){
   b=makeButton('Run Setup Wizard',()=>{
    if($('profile-section-dialog')?.open&&typeof profileCloseSection==='function')profileCloseSection();
    queueMicrotask(()=>open(true));
   },'a2k-setup-reopen');
   b.id='a2k-setup-reopen';
  }
  let section=$('a2k-setup-settings-entry');
  if(!section){
   section=el('section','a2k-setup-settings-entry');
   section.id='a2k-setup-settings-entry';
   section.append(el('div','profile-section-top'));
   section.firstElementChild.append(el('strong','','Setup & Preferences'));
   section.append(el('p','a2k-setup-settings-description','Review your karaoke interests and profile setup.'));
  }
  section.append(b);
  // Never display the internal design sizing link in member Settings.
  $('a2k-wizard-size-demo-link')?.remove();
  settings.insertBefore(section,settings.firstElementChild);
 }
 // Settings can be mounted after this script's initial DOM readiness callback.
 function syncReopen(){
  installReopen();
  if(!$('a2k-setup-reopen')||!$('a2k-setup-settings-entry')){
   const root=$('auth-profile');
   if(root){
    const observer=new MutationObserver(()=>{
     if($('a2k-profile-settings')?.querySelector('.a2k-profile-settings-panel')){
      observer.disconnect();installReopen();
     }
    });
    observer.observe(root,{childList:true,subtree:true});
   }
  }
 }
 window.atkWelcomeStart=open;
 window.atkWelcomeMaybeStart=maybeStart;
 window.atkWelcomeRender=render;
 window.atkWelcomeNext=advance;
 window.atkWelcomeSkip=skipStep;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncReopen,{once:true});
 else syncReopen();
})();