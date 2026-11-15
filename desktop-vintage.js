/* A2K build 213 — desktop shell, with tablet-friendly pointer detection.
   Uses the existing A2K screens, authentication, listings and handlers.
   The approved phone/tablet UI remains unchanged below 1024 CSS pixels. */
(function(){
 'use strict';
 const breakpoint=window.matchMedia('(min-width:1024px)');
 const mouseInput=window.matchMedia('(hover: hover) and (pointer: fine)');
 const explicitPreview=new URLSearchParams(location.search).has('a2k_desktop_preview');
 const iconPaths={
   home:'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z',
   find:'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z',
   venues:'M3 9h18l-2-6H5L3 9ZM4 9v12h16V9M9 21v-8h6v8',
   hosts:'M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8',
   events:'M4 5h16v16H4zM7 3v5M17 3v5M4 10h16M8 14h3M14 14h3M8 18h3',
   community:'M9 10a3 3 0 1 0 0-6a3 3 0 0 0 0 6ZM3 20v-3a6 6 0 0 1 12 0v3H3ZM18 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1h-4',
   members:'M9 10a3 3 0 1 0 0-6a3 3 0 0 0 0 6ZM3 20v-3a6 6 0 0 1 12 0v3H3ZM18 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1h-4',
   about:'M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20ZM12 10v7M12 7h.01',
   profile:'M4 21c0-5 3.5-8 8-8s8 3 8 8'
 };
 let mounted=false;
 let tonightObserver=null;
 let selectedDesktopTab='home';
 function el(tag,cls,text){
   const node=document.createElement(tag);
   if(cls)node.className=cls;
   if(text!==undefined)node.textContent=String(text);
   return node;
 }
 function icon(kind){
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');
   svg.setAttribute('aria-hidden','true');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',iconPaths[kind]);
   svg.append(path);
   if(kind==='find'){
     const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
     ring.setAttribute('cx','12');ring.setAttribute('cy','10');ring.setAttribute('r','2.5');
     svg.append(ring);
   }
   if(kind==='profile'){
     const head=document.createElementNS('http://www.w3.org/2000/svg','circle');
     head.setAttribute('cx','12');head.setAttribute('cy','8');head.setAttribute('r','4');
     svg.append(head);
   }
   return svg;
 }
 function page(){
   const current=document.querySelector('#unified-nav button.active');
   const active=current?.getAttribute('data-page');
   if(active)return active;
   const hash=(location.hash||'#home').slice(1).split('/')[0];
   return hash==='venue'?'find':(['home','find','signin'].includes(hash)?hash:'home');
 }
 function activeMenu(){
   const current=page();
   const siblings={
     home:['home','about'],
     find:['find','events','hosts','members'],
     signin:['signin']
   };
   if(!(siblings[current]||[]).includes(selectedDesktopTab))selectedDesktopTab=current;
   const which=selectedDesktopTab;
   document.querySelectorAll('#a2k-desktop-sidebar .a2k-d-nav-btn').forEach(button=>{
     if(button.dataset.page===which)button.setAttribute('aria-current','page');
     else button.removeAttribute('aria-current');
   });
 }
 function clearDirectory(){
   const find=document.getElementById('find-screen');
   if(find)find.classList.remove('a2k-d-directory-active');
 }
 function go(pageName){
   clearDirectory();
   if(typeof window.navigate==='function')window.navigate(pageName);
   else window.location.hash='#'+pageName;
   activeMenu();
 }
 function makeDesktopHeader(app){
   const hero=el('div','a2k-desktop-header');
   hero.id='a2k-desktop-header';
   hero.setAttribute('role','banner');
   const brand=el('button','a2k-desktop-brand');
   brand.type='button';brand.setAttribute('aria-label','Addicted to Karaoke Home');
   brand.addEventListener('click',()=>{selectedDesktopTab='home';go('home')});
   hero.append(brand);
   const member=el('div','a2k-desktop-member');
   const signin=el('button','a2k-d-signin');
   signin.type='button';
   const join=el('button','a2k-d-join');
   join.type='button';
   function buttonLabel(button,label,type){
     button.replaceChildren();
     const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
     svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
     svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
     svg.setAttribute('stroke-width','1.85');
     svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
     const path=document.createElementNS('http://www.w3.org/2000/svg','path');
     path.setAttribute('d',type==='person'?'M4 21v-2a8 8 0 0 1 16 0v2 M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8':
       type==='manage'?'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z':
       'M16 20v-2a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v2 M9 10a4 4 0 1 0 0-8a4 4 0 0 0 0 8 M18 8v8 M14 12h8');
     svg.append(path);
     button.append(svg,document.createTextNode(label));
     button.setAttribute('aria-label',label);
   }
   signin.addEventListener('click',()=>{
     selectedDesktopTab='signin';go('signin');
     if(document.getElementById('auth-profile')?.hidden&&typeof window.authMode==='function')window.authMode('login');
   });
   join.addEventListener('click',()=>{
     if(!document.getElementById('auth-profile')?.hidden){
       if(!document.getElementById('management-open')?.hidden&&typeof window.managementOpen==='function')window.managementOpen();
       else{selectedDesktopTab='signin';go('signin')}
       return;
     }
     selectedDesktopTab='signin';go('signin');
     if(typeof window.authMode==='function')window.authMode('register');
   });
   member.append(signin,join);
   hero.append(member);
   app.insertAdjacentElement('afterbegin',hero);
   const profile=document.getElementById('auth-profile');
   const management=document.getElementById('management-open');
   const sync=()=>{
     const signed=!!profile&&!profile.hidden;
     const manager=signed&&!!management&&!management.hidden;
     buttonLabel(signin,signed?'My Profile':'Sign In','person');
     buttonLabel(join,signed?'Management':'Join','manage');
     if(!signed)buttonLabel(join,'Join','group');
     join.hidden=signed&&!manager;
     member.classList.toggle('a2k-d-member-signed',signed);
     member.classList.toggle('a2k-d-member-manager',manager);
   };
   sync();
   if(profile)new MutationObserver(sync).observe(profile,{attributes:true,attributeFilter:['hidden']});
   if(management)new MutationObserver(sync).observe(management,{attributes:true,attributeFilter:['hidden']});
   window.addEventListener('pageshow',sync);
 }
 function showAbout(){
   let dialog=document.getElementById('a2k-d-about-dialog');
   if(!dialog){
     dialog=el('dialog','a2k-d-about-dialog');
     dialog.id='a2k-d-about-dialog';
     const title=el('h2','','About Addicted to Karaoke');
     const slogan=el('p','','Built for singers, powered by KJs, and bringing the karaoke community together.');
     const note=el('p','','Find local karaoke nights, discover venues and hosts, and share your karaoke experiences with the community.');
     const close=el('button','a2k-d-about-close','Close');
     close.type='button';close.onclick=()=>dialog.close();
     const build=el('p','a2k-d-build','Build: '+(document.querySelector('[data-build-version]')?.textContent||'Unavailable'));
     build.setAttribute('aria-label','Troubleshooting build version');
     dialog.append(title,slogan,note,build,close);
     document.body.append(dialog);
   }
   if(!dialog.open)dialog.showModal();
 }

 function directoryView(){
   const find=document.getElementById('find-screen');
   if(!find)return null;
   let shell=document.getElementById('a2k-d-directory');
   if(!shell){
     shell=el('section','a2k-d-directory');
     shell.id='a2k-d-directory';
     shell.setAttribute('aria-live','polite');
     find.append(shell);
   }
   return shell;
 }
 async function getPublishedRows(url){
   if(typeof window.supabaseRead==='function')return window.supabaseRead(url);
   if(typeof supabaseRead==='function')return supabaseRead(url);
   throw Error('Venue database is not available.');
 }
 function directoryCard(title,subtitle,body){
   const card=el('article','a2k-d-directory-card');
   const heading=el('h3','',title);
   card.append(heading);
   if(subtitle)card.append(el('p','a2k-d-directory-meta',subtitle));
   if(body)card.append(el('p','',body));
   return card;
 }
 function dateAndTime(value){
   const date=new Date(value);
   if(Number.isNaN(date.getTime()))return 'Time to be announced';
   return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',
     weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date);
 }
 async function drawDirectory(kind){
   const shell=directoryView();if(!shell)return;
   const headline=kind==='hosts'?'KJ Hosts':'Upcoming Karaoke Events';
   const intro=kind==='hosts'?'Meet the karaoke hosts in our community. Only published hosts are listed.':
      'Special karaoke nights and one-time events coming up soon.';
   shell.replaceChildren(el('h1','',headline),el('p','a2k-d-directory-intro',intro));
   const search=el('input','a2k-d-directory-search');
   search.type='search';search.placeholder=kind==='hosts'?'Search KJ hosts':'Search upcoming events';
   search.setAttribute('aria-label',search.placeholder);
   shell.append(search);
   const list=el('div','a2k-d-directory-grid');
   list.append(el('p','a2k-d-directory-info','Loading published listings…'));
   shell.append(list);
   let cards=[];
   search.addEventListener('input',()=>{
     const query=search.value.toLocaleLowerCase().trim();
     let found=0;
     for(const card of cards){
       const matches=card.textContent.toLocaleLowerCase().includes(query);
       card.hidden=!matches;if(matches)found++;
     }
     let empty=shell.querySelector('.a2k-d-directory-filter-empty');
     if(!empty){empty=el('p','a2k-d-directory-filter-empty','No matches found.');shell.append(empty)}
     empty.hidden=found!==0||!cards.length;
   });
   try{
     if(kind==='hosts'){
       const data=await Promise.all([
         getPublishedRows('kj_review_hosts?select=user_id,stage_name,enabled&enabled=eq.true&order=stage_name.asc'),
         getPublishedRows('kjs?select=id,display_name,bio,published&published=eq.true&order=display_name.asc')
       ]);
       if(!shell.isConnected||selectedDesktopTab!==kind)return;
       const reviewHosts=Array.isArray(data[0])?data[0]:[];
       const published=Array.isArray(data[1])?data[1]:[];
       const seen=new Set();
       const profiles=[];
       for(const host of reviewHosts){
         if(!host?.stage_name)continue;
         const name=String(host.stage_name);
         seen.add(name.toLocaleLowerCase().trim());
         profiles.push({name,userId:host.user_id});
       }
       for(const host of published){
         if(!host?.display_name)continue;
         const name=String(host.display_name);
         if(seen.has(name.toLocaleLowerCase().trim()))continue;
         profiles.push({name,bio:host.bio||''});
       }
       profiles.sort((x,y)=>x.name.localeCompare(y.name));
       const ratings=new Map();
       // Only public, approved KJ ratings count. Do not count pending
       // moderation items or display sample reviews as real ratings.
       try{
         const publishedScores=await getPublishedRows(
           'kj_review_scores?select=host_user_id,review_count,average_score');
         for(const item of Array.isArray(publishedScores)?publishedScores:[]){
           ratings.set(item.host_user_id,item);
         }
       }catch(err){
         console.warn('KJ public rating summaries unavailable',err);
       }
       for(const host of profiles){
         const card=directoryCard(host.name,'Karaoke host',host.bio||'');
         const rating=el('div','a2k-d-kj-list-rating');
         const score=el('strong');
         const context=el('small');
         if(host.name==='DJ Copper Mic (Demo)'){
           const sample=window.a2kKjDemoRating?.();
           if(sample?.count){
             score.textContent='🎤 '+sample.average.toFixed(1)+' / 5';
             context.textContent=sample.count+' sample reviews · DEMO ONLY';
           }else{
             score.textContent='🎤 Demo rating unavailable';
             context.textContent='Demo profile — not a verified rating';
           }
           rating.classList.add('a2k-d-kj-list-rating-demo');
         }else{
           const publishedRating=host.userId?ratings.get(host.userId):null;
           const count=Number(publishedRating?.review_count)||0;
           const average=Number(publishedRating?.average_score);
           if(count>0&&Number.isFinite(average)){
             score.textContent='🎤 '+average.toFixed(1)+' / 5';
             context.textContent=count+' approved review'+(count===1?'':'s');
           }else{
             score.textContent='🎤 Not rated yet';
             context.textContent='No approved KJ reviews';
           }
         }
         rating.append(score,context);
         card.append(rating);
         if(host.userId&&typeof window.a2kOpenKjHostProfile==='function'){
           const action=el('button','a2k-d-directory-action','View KJ Profile');
           action.type='button';action.onclick=()=>window.a2kOpenKjHostProfile(host.userId,'','');
           card.append(action);
           const memberProfile=el('button','a2k-d-directory-action a2k-d-profile-action','View Member Profile');
           memberProfile.type='button';
           memberProfile.onclick=()=>void window.a2kOpenMemberProfile?.(host.userId,'hosts');
           card.append(memberProfile);
         }
         cards.push(card);
       }
       list.replaceChildren(...cards);
       if(!cards.length)list.append(el('p','a2k-d-directory-info','No published KJ host profiles yet. Hosts will appear here when their listings are approved.'));
     }else{
       const now=encodeURIComponent(new Date().toISOString());
       const events=await getPublishedRows('karaoke_special_events?select=id,venue_id,title,start_at,end_at,host_name,description,status&status=eq.published&end_at=gt.'+now+'&order=start_at.asc&limit=150');
       if(!shell.isConnected||selectedDesktopTab!==kind)return;
       const rows=Array.isArray(events)?events:[];
       for(const event of rows){
         const venue=typeof sampleVenues==='undefined'?null:sampleVenues.find(v=>String(v.databaseId)===String(event.venue_id)&&v.publication_status==='published');
         const city=venue?[venue.name,venue.city,venue.state].filter(Boolean).join(' · '):'Published karaoke event';
         const card=directoryCard(event.title||'Karaoke Event',dateAndTime(event.start_at)+' · '+city,event.description||'');
         card.classList.add('a2k-d-directory-event-card');
         const dateObj=new Date(event.start_at);
         if(!Number.isNaN(dateObj.getTime())){
           const local=(opts)=>new Intl.DateTimeFormat('en-US',Object.assign({timeZone:'America/Chicago'},opts)).format(dateObj);
           const dateTile=el('div','a2k-event-date-tile');
           dateTile.append(
             el('strong','',local({month:'short'}).toUpperCase()),
             el('b','',local({day:'numeric'})),
             el('small','',local({year:'numeric'}))
           );
           const copy=el('div','a2k-d-event-info');
           copy.replaceChildren(...Array.from(card.childNodes));
           card.append(dateTile,copy);
         }
         if(event.host_name)card.querySelector('.a2k-d-event-info, .a2k-d-directory-card')?.append(el('p','a2k-d-directory-meta','Host: '+event.host_name));
         if(venue&&typeof openVenue==='function'){
           const action=el('button','a2k-d-directory-action','View Venue');
           action.type='button';action.onclick=()=>openVenue(venue.id);
           card.append(action);
         }
         cards.push(card);
       }
       list.replaceChildren(...cards);
       if(!cards.length)list.append(el('p','a2k-d-directory-info','No published upcoming special events right now. Check again soon.'));
     }
     search.dispatchEvent(new Event('input'));
   }catch(error){
     console.warn('Could not load desktop '+kind+' directory',error);
     list.replaceChildren(el('p','a2k-d-directory-info','Unable to load listings right now. Please try again.'));
   }
 }
 function sidebarGo(key){
   if(key==='about'){showAbout();return}
   if(key==='hosts'||key==='events'||key==='members'){
     go('find');selectedDesktopTab=key;
     const find=document.getElementById('find-screen');
     if(find)find.classList.add('a2k-d-directory-active');
     activeMenu();
     if(key==='members')void window.a2kOpenMembersDirectory?.(directoryView());
     else void drawDirectory(key);
     return;
   }
   selectedDesktopTab=key;go(key);
   activeMenu();
 }
 function makeSidebar(app){
   const sidebar=el('aside','a2k-desktop-sidebar');
   sidebar.id='a2k-desktop-sidebar';
   sidebar.setAttribute('aria-label','Desktop navigation');
   const items=[
     ['home','Home'],['find','Find Karaoke'],
     ['hosts','KJ Hosts'],['events','Events'],['members','Members'],['about','About']
   ];
   for(const [key,label] of items){
     const button=el('button','a2k-d-nav-btn');
     button.type='button';button.dataset.page=key;
     button.append(icon(key),document.createTextNode(label));
     button.addEventListener('click',()=>sidebarGo(key));
     sidebar.append(button);
   }
   const pages=document.getElementById('unified-pages');
   app.insertBefore(sidebar,pages);
   activeMenu();
   const existingNav=document.getElementById('unified-nav');
   if(existingNav){
     const navObserver=new MutationObserver(activeMenu);
     navObserver.observe(existingNav,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
   }
   window.addEventListener('hashchange',activeMenu);
 }
 function makeUpcoming(){
   const home=document.querySelector('#home-screen .a2k-b-home');
   if(!home||document.getElementById('a2k-desktop-upcoming'))return;
   const panel=el('section','a2k-desktop-upcoming');
   panel.id='a2k-desktop-upcoming';
   panel.setAttribute('aria-labelledby','a2k-d-upcoming-title');
   const row=el('div','a2k-d-upcoming-heading');
   const title=el('h2','','Karaoke Tonight');
   title.id='a2k-d-upcoming-title';
   const viewAll=el('button','a2k-d-view-all','View All ›');
   viewAll.type='button';viewAll.onclick=()=>go('find');
   row.append(title,viewAll);
   const list=el('div','a2k-d-upcoming-list');
   list.setAttribute('aria-live','polite');
   panel.append(row,list);
   home.append(panel);
   const original=document.getElementById('a2k-b-tonight');
   function refresh(){
     if(!original||!list.isConnected)return;
     list.replaceChildren();
     const sources=[...original.querySelectorAll(':scope > button')].slice(0,2);
     if(!sources.length){
       list.append(el('p','a2k-d-upcoming-empty','Published karaoke nights will appear here when available.'));
       return;
     }
     for(const source of sources){
       const button=el('button','a2k-d-upcoming-item');
       button.type='button';
       const photo=source.querySelector('img');
       if(photo){
         const img=el('img');
         img.src=photo.currentSrc||photo.src;
         img.alt=photo.alt||'Venue photo';
         img.loading='lazy';
         button.append(img);
       }else{
         const fallback=el('div','','🎤');
         fallback.style.cssText='width:88px;min-height:80px;display:grid;place-items:center;font-size:28px';
         button.append(fallback);
       }
       const copy=el('span','a2k-d-upcoming-copy');
       const name=source.querySelector('.a2k-b-tonight-body strong')?.textContent||'Browse venues';
       copy.append(el('strong','',name));
       const details=[...source.querySelectorAll('.a2k-b-tonight-body small')].slice(0,2);
       for(const small of details)copy.append(el('small','',small.textContent));
       button.append(copy);
       button.setAttribute('aria-label','Open '+name);
       button.onclick=()=>source.click();
       list.append(button);
     }
   }
   refresh();
   if(original){
     tonightObserver=new MutationObserver(refresh);
     tonightObserver.observe(original,{childList:true,subtree:true,characterData:true});
   }
 }
 function switchLayout(){
   document.documentElement.classList.toggle('a2k-desktop-live',breakpoint.matches&&(mouseInput.matches||explicitPreview));
 }
 function init(){
   if(mounted)return;
   const app=document.querySelector('.app');
   const pages=document.getElementById('unified-pages');
   if(!app||!pages)return;
   mounted=true;
   makeDesktopHeader(app);
   makeSidebar(app);
   makeUpcoming();
   switchLayout();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 if(typeof breakpoint.addEventListener==='function')breakpoint.addEventListener('change',switchLayout);
 else if(typeof breakpoint.addListener==='function')breakpoint.addListener(switchLayout);
 if(typeof mouseInput.addEventListener==='function')mouseInput.addEventListener('change',switchLayout);
 else if(typeof mouseInput.addListener==='function')mouseInput.addListener(switchLayout);
})();