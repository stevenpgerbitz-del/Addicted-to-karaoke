/* Desktop Members directory + read-only member profiles.
   Honors existing member_profiles / karaoke_songs RLS visibility policies.
   No emails, private profiles, or hidden song lists are exposed. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const elem=(tag,cls,text)=>{
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(text!==undefined)el.textContent=String(text);
   return el;
 };
 let request=0,lastSource='members';
 const client=()=>typeof authClient!=='undefined'?authClient:null;
 const signed=()=>typeof authUser!=='undefined'&&!!authUser?.id;
 let directoryState={role:'all',search:'',order:'newest',verifiedOnly:false};
 const directoryRoles=[
   {id:'all',label:'All Members',icon:'users'},
   {id:'singer',label:'Singers',role:'Singer',icon:'mic'},
   {id:'kj',label:'KJ / Hosts',role:'KJ / Host',icon:'headphones'},
   {id:'venue_owner',label:'Venue Staff',role:'Venue Staff',icon:'building'}
 ];
 function directoryIcon(name){
   const paths={
     users:['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M22 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
     mic:['M12 19v3','M8 22h8','M5 10a7 7 0 0 0 14 0'],
     headphones:['M3 14v-3a9 9 0 0 1 18 0v3','M3 14h4v7H5a2 2 0 0 1-2-2v-5z','M21 14h-4v7h2a2 2 0 0 0 2-2v-5z'],
     building:['M3 21h18','M5 21V7l7-4 7 4v14','M9 21v-5h6v5','M9 9h.01M15 9h.01M9 12h.01M15 12h.01'],
     calendar:['M8 2v4','M16 2v4','M3 10h18','M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z','M8 14h.01M12 14h.01M16 14h.01']
   };
   const ns='http://www.w3.org/2000/svg';
   const svg=document.createElementNS(ns,'svg');
   svg.setAttribute('viewBox','0 0 24 24');
   svg.setAttribute('width','20');svg.setAttribute('height','20');
   svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
   svg.setAttribute('stroke-width','1.8');
   svg.setAttribute('stroke-linecap','round');
   svg.setAttribute('stroke-linejoin','round');
   svg.setAttribute('aria-hidden','true');
   for(const d of paths[name]||paths.mic){
     const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path);
   }
   if(name==='users'){
     const circle=document.createElementNS(ns,'circle');
     circle.setAttribute('cx','9');circle.setAttribute('cy','7');circle.setAttribute('r','4');svg.append(circle);
   }else if(name==='mic'){
     const rect=document.createElementNS(ns,'rect');
     rect.setAttribute('x','9');rect.setAttribute('y','2');
     rect.setAttribute('width','6');rect.setAttribute('height','13');
     rect.setAttribute('rx','3');svg.append(rect);
   }
   return svg;
 }
 async function fetchRows(table,columns,configure){
   const connection=client();
   if(!connection)throw Error('Member directory is unavailable.');
   let q=connection.from(table).select(columns);
   if(configure)q=configure(q);
   const {data,error}=await q;
   if(error)throw error;
   return Array.isArray(data)?data:[];
 }
 function shell(){
   return $('a2k-d-directory');
 }
 function backButton(source){
   const b=elem('button','a2k-d-directory-back',
      '← Back to '+(source==='hosts'?'KJ Hosts':'Members'));
   b.type='button';
   b.onclick=()=>{
     if(source==='hosts'){
       $('a2k-desktop-sidebar')?.querySelector('[data-page="hosts"]')?.click();
     }else window.a2kOpenMembersDirectory?.(shell(),{restore:true});
   };
   return b;
 }
 function rolesOf(member){
   const roles=Array.isArray(member.karaoke_interests)?member.karaoke_interests:[];
   const mapping={singer:'Singer',kj:'KJ / Host',venue_owner:'Venue Staff'};
   return roles.map(x=>mapping[x]).filter(Boolean);
 }
 // Directory badges and blue checks use A2K's read-only privacy-scoped
 // database lookup; the KJ role is never mistaken for a verified KJ award.
 const featuredBadgeLabels={
   founder:'Founder',founding_tester:'Founding Tester',verified_kj:'Verified KJ',
   verified_venue_owner:'Verified Venue Staff',community_supporter:'Community Supporter',
   super_admin:'Super Admin',admin:'Admin',moderator:'Moderator',
   review_1:'Review Rookie',review_25:'Review Contributor',
   review_75:'Review Expert',review_100:'Review Master',
   song_1:'First Pick',song_25:'Song Collector',song_75:'Music Enthusiast',
   song_100:'Songbook Legend',venue_1:'Karaoke Scout',
   venue_10:'Karaoke Discoverer',venue_25:'Karaoke Pathfinder',
   venue_100:'Karaoke Pioneer',favorite_1:'Favorite Finder',
   favorite_5:'Favorite Explorer',favorite_10:'Favorite Enthusiast',
   favorite_25:'Favorite Superfan'
 };
 const badgeRarity={
   founder:'Legendary',founding_tester:'Legendary',review_100:'Legendary',
   song_100:'Legendary',venue_100:'Legendary',favorite_25:'Legendary',
   verified_kj:'Epic',verified_venue_owner:'Epic',community_supporter:'Epic',
   super_admin:'Epic',review_75:'Epic',song_75:'Epic',
   venue_25:'Epic',favorite_10:'Epic',
   admin:'Rare',moderator:'Rare',review_25:'Rare',song_25:'Rare',
   venue_10:'Rare',favorite_5:'Rare',
   review_1:'Uncommon',song_1:'Uncommon',venue_1:'Uncommon',
   favorite_1:'Uncommon'
 };
 async function fetchMemberEmblems(members){
   const map=new Map();
   if(!members?.length||!client())return map;
   try{
     const ids=members.map(m=>m.user_id).filter(Boolean).slice(0,200);
     const {data,error}=await client().rpc('a2k_public_member_emblems',{p_user_ids:ids});
     if(error)throw error;
     for(const row of data||[]){
       if(ids.includes(row.user_id))map.set(row.user_id,row);
     }
   }catch(error){console.warn('Public member badges unavailable',error)}
   return map;
 }
 function verifiedMark(){
   const check=elem('span','a2k-d-member-verified-mark','✓');
   check.setAttribute('role','img');
   check.setAttribute('aria-label','Verified account');
   check.title='Verified account';
   return check;
 }
 function featuredChip(code){
   const label=featuredBadgeLabels[code];
   if(!label)return null;
   const chip=elem('span','a2k-d-member-featured-chip a2k-d-icon-only-badge');
   const hint=label+' · '+(badgeRarity[code]||'Common')+' badge';
   chip.setAttribute('title',hint);
   chip.setAttribute('aria-label',hint);
   chip.setAttribute('role','img');
   const art=elem('img','a2k-d-member-featured-art');
   art.src='assets/badges/'+code+'.png?v=319';
   art.alt='';art.loading='lazy';
   art.onerror=()=>chip.remove();
   chip.append(art);
   return chip;
 }
 // The directory sidebar is the same component in the directory and
 // alongside each member profile. Only members visible under RLS and
 // their own directory/privacy settings are counted.
 async function visibleDirectoryMembers(){
   const rows=await fetchRows('member_profiles',
     'user_id,stage_name,profile_slug,bio,karaoke_interests,created_at,profile_visibility,avatar_path',
     q=>q.eq('directory_visible',true).order('stage_name',{ascending:true}).limit(200));
   const visible=rows.filter(m=>m.profile_visibility!=='private'&&
     (m.profile_visibility!=='members'||signed()));
   if(!visible.length)return visible;
   let preferences=[];
   try{preferences=await fetchRows('member_public_preferences',
     'user_id,show_photo,show_member_since,show_display_name',q=>q.in('user_id',visible.map(m=>m.user_id)).limit(200));}
   catch(error){console.warn('Member display settings unavailable; showing only basic profiles.',error);}
   const byId=new Map(preferences.map(p=>[p.user_id,p]));
   const emblems=await fetchMemberEmblems(visible);
   return visible.map(m=>({...m,_prefs:byId.get(m.user_id)||null,
     _emblems:emblems.get(m.user_id)||null}));
 }

 // Live member discovery belongs above the portraits, not in a left rail.
 function makeDirectoryTopControls(members,{role='all',search='',verified=false,onRole=()=>{},onSearch=()=>{},onVerified=()=>{}}={}){
   const panel=elem('section','a2k-d-directory-top-controls');
   panel.setAttribute('aria-label','Search and filter members');
   const input=elem('input','a2k-d-directory-top-search');
   input.type='search';input.placeholder='Search members…';input.maxLength=100;
   input.setAttribute('aria-label','Search members');input.value=search;
   input.addEventListener('input',()=>onSearch(input.value));
   panel.append(input);
   const options=elem('div','a2k-d-directory-top-tabs');
   options.setAttribute('role','group');options.setAttribute('aria-label','Filter by member role and verification');
   const roleButtons=new Map();
   for(const item of directoryRoles){
     const total=item.id==='all'?members.length:members.filter(m=>rolesOf(m).includes(item.role)).length;
     const button=elem('button','a2k-d-directory-top-filter');
     button.type='button';button.dataset.role=item.id;
     button.setAttribute('aria-pressed',String(item.id===role));
     button.append(directoryIcon(item.icon),elem('span','',item.label+' ('+total+')'));
     button.onclick=()=>onRole(item.id);
     options.append(button);roleButtons.set(item.id,button);
   }
   const verifiedCount=members.filter(m=>m._emblems?.is_verified===true).length;
   const verifiedButton=elem('button','a2k-d-directory-top-filter a2k-d-directory-top-verified');
   verifiedButton.type='button';
   verifiedButton.setAttribute('aria-pressed',String(verified));
   verifiedButton.append(elem('span','a2k-d-top-verified-icon','✓'),elem('span','','Verified ('+verifiedCount+')'));
   verifiedButton.onclick=onVerified;
   options.append(verifiedButton);
   panel.append(options);
   return {panel,input,roleButtons,verifiedButton};
 }
 function makeDirectorySidebar(members,{role='all',search='',onRole=()=>{},onSearch=()=>{}}={}){
   const sidebar=elem('aside','a2k-d-members-filters a2k-d-shared-members-sidebar');
   sidebar.setAttribute('aria-label','Find members and browse the directory');
   const mark=elem('div','a2k-d-member-directory-emblem');
   mark.setAttribute('aria-hidden','true');
   const artwork=elem('img','a2k-d-directory-microphone');
   artwork.src='assets/a2k-avatar-microphone-theatrical.png';
   artwork.alt='';artwork.decoding='async';
   mark.append(artwork);
   sidebar.append(mark,elem('h2','','Find Members'));
   const input=elem('input','a2k-d-directory-search');
   input.type='search';input.placeholder='Search members…';
   input.setAttribute('aria-label','Search members');input.value=search;
   input.addEventListener('input',()=>onSearch(input.value));
   const searchOrnament=elem('div','a2k-d-sidebar-flourish');
   searchOrnament.append(ornamentSvg());
   sidebar.append(input,searchOrnament);
   const stats=elem('div','a2k-d-directory-stats');
   stats.append(elem('h3','','Directory Stats'));
   if(Array.isArray(members)){
     const tally=directoryRoles.map(item=>({
       ...item,
       count:item.id==='all'?members.length:
         members.filter(m=>rolesOf(m).includes(item.role)).length
     }));
     for(const item of tally){
       const line=elem('div','a2k-d-directory-stat-row');
       const symbol=elem('span','a2k-d-directory-stat-icon');
       symbol.append(directoryIcon(item.icon));
       line.append(symbol,
         elem('span','a2k-d-directory-stat-label',item.id==='all'?'Total Members':item.label),
         elem('strong','a2k-d-directory-stat-value',item.count));
       stats.append(line);
     }
   }else stats.append(elem('p','a2k-d-member-sidebar-caption','Directory statistics unavailable.'));
   const statsOrnament=elem('div','a2k-d-sidebar-flourish');
   statsOrnament.append(ornamentSvg());
   sidebar.append(stats,statsOrnament);
   const browseTitle=elem('h3','a2k-d-directory-browse-title','Browse by Role');
   sidebar.append(browseTitle);
   const options=elem('div','a2k-d-member-role-options');
   options.setAttribute('role','group');options.setAttribute('aria-label','Browse by role');
   const roleButtons=new Map();
   for(const item of directoryRoles){
     const total=Array.isArray(members)?' ('+
       (item.id==='all'?members.length:members.filter(m=>rolesOf(m).includes(item.role)).length)+')':'';
     const button=elem('button','a2k-d-member-role-option');
     button.type='button';button.dataset.role=item.id;
     button.setAttribute('aria-pressed',String(item.id===role));
     const symbol=elem('span','a2k-d-member-role-icon');
     symbol.append(directoryIcon(item.icon));
     button.append(symbol,elem('span','',item.label+total));
     button.onclick=()=>onRole(item.id);
     options.append(button);roleButtons.set(item.id,button);
   }
   sidebar.append(options);
   return {sidebar,input,roleButtons};
 }
 function ornamentSvg(){
   const ns='http://www.w3.org/2000/svg';
   const svg=document.createElementNS(ns,'svg');
   svg.setAttribute('viewBox','0 0 64 20');
   svg.setAttribute('width','42');svg.setAttribute('height','17');
   svg.setAttribute('aria-hidden','true');
   svg.setAttribute('fill','none');svg.setAttribute('stroke','#eac083');
   svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');
   const curves=[
     'M32 11 C21 1 13 5 16 12 C19 18 27 13 23 10 C21 8 18 10 20 12',
     'M32 11 C43 1 51 5 48 12 C45 18 37 13 41 10 C43 8 46 10 44 12',
     'M32 3 C28 7 28 10 32 14 C36 10 36 7 32 3 Z'
   ];
   for(const d of curves){
     const p=document.createElementNS(ns,'path');p.setAttribute('d',d);svg.append(p);
   }
   const jewel=document.createElementNS(ns,'circle');
   jewel.setAttribute('cx','32');jewel.setAttribute('cy','10');
   jewel.setAttribute('r','1.4');jewel.setAttribute('fill','#f3d29a');svg.append(jewel);
   return svg;
 }
 function publicAvatar(member,large=false){
   const avatar=elem('span','a2k-d-member-avatar'+(large?' a2k-d-member-avatar-large':''),(member.stage_name||'M').trim().charAt(0).toUpperCase());
   avatar.setAttribute('aria-hidden','true');
   const path=member._prefs?.show_photo===false?null:member.avatar_path;
   if(typeof path==='string'&&path&&client()){
     try{
       const url=client().storage.from('member-avatars').getPublicUrl(path)?.data?.publicUrl;
       if(url){
         const photo=elem('img','a2k-d-member-avatar-image');
         photo.alt='';photo.loading='lazy';photo.decoding='async';photo.src=url;
         photo.onerror=()=>{photo.src='assets/a2k-avatar-microphone-theatrical.png';photo.onerror=null};
         avatar.append(photo);
       }
     }catch(error){console.warn('Could not display member photo',error)}
   }
   if(!avatar.querySelector('.a2k-d-member-avatar-image')){
     const fallback=elem('img','a2k-d-member-avatar-image');
     fallback.alt='';fallback.loading='lazy';fallback.src='assets/a2k-avatar-microphone-theatrical.png';
     avatar.replaceChildren(fallback);
   }
   return avatar;
 }
 function card(member){
   const box=elem('article','a2k-d-directory-card a2k-d-member-tile');
   const head=elem('div','a2k-d-member-tile-head');
   const avatar=publicAvatar(member);
   // Role on desktop portrait; existing mobile member role remains unchanged.
   avatar.append(elem('span','a2k-d-member-photo-tag',rolesOf(member).map(role=>role==='KJ / Host'?'KJ Host':role).join(' / ')||'Member'));
   const label=elem('div');
   const stage=elem('h3','',member.stage_name||'Karaoke Member');
   if(member._emblems?.is_verified)stage.append(verifiedMark());
   label.append(stage,elem('p','a2k-d-directory-meta',rolesOf(member).join(' · ')||'Member'));
   head.append(avatar,label);box.append(head);
   const featured=elem('div','a2k-d-directory-featured');
   const earned=(Array.isArray(member._emblems?.badge_codes)?member._emblems.badge_codes:[]).slice(0,4);
   for(const code of earned){
     const chip=featuredChip(code);
     if(chip)featured.append(chip);
   }
   // The selected KJ/Host role stays on the photo, not among earned badges.
   if(featured.childElementCount)box.append(featured);
   // Member biographies belong on the full profile, not in directory tiles.
   // This existing RPC enforces public/member/private profile visibility.
   const memberNumber=elem('p','a2k-d-member-number');
   memberNumber.hidden=true;
   box.append(memberNumber);
   if(typeof window.matchMedia==='function'&&window.matchMedia('(min-width:1024px)').matches&&client()){
     void client().rpc('a2k_public_member_number',{p_user_id:member.user_id})
       .then(({data,error})=>{
         if(error)throw error;
         if(data){
           memberNumber.textContent='Member #'+String(data);
           memberNumber.hidden=false;
         }
       }).catch(error=>console.warn('Public member number unavailable',error));
   }
   const since=member.created_at&&Number.isFinite(new Date(member.created_at).getTime())
     ? new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric'}).format(new Date(member.created_at))
     : null;
   if(since&&member._prefs?.show_member_since!==false)box.append(elem('p','a2k-d-member-since','Member since '+since));
   const view=elem('button','a2k-d-directory-action','View Profile');
   view.type='button';
   const featuredLabels=earned.map(code=>featuredBadgeLabels[code]).filter(Boolean);
   view.setAttribute('aria-label','View profile for '+(member.stage_name||'Karaoke Member')+
     (featuredLabels.length?'. Featured badges: '+featuredLabels.join(', '):''));
   if(featuredLabels.length)view.title=earned.map(code=>(featuredBadgeLabels[code]||code)+' ('+(badgeRarity[code]||'Common')+')').join(' · ');
   view.onclick=()=>window.a2kOpenMemberProfile(member.user_id,'members');
   box.append(view);
   return box;
 }
 window.a2kOpenMembersDirectory=async function(root,opts={}){
   const target=root||shell();
   if(!target)return;
   const serial=++request;lastSource='members';
   history.replaceState(null,'','#members');
   target.replaceChildren(elem('h1','','Members'),
     elem('p','a2k-d-directory-info','Loading member directory…'));
   try{
     const members=await visibleDirectoryMembers();
     if(serial!==request||!target.isConnected)return;
     const heading=elem('h1','','Members');
     const intro=elem('p','a2k-d-directory-intro','Browse member profiles shared with the karaoke community.');
     const layout=elem('div','a2k-d-members-layout');
     const initial=opts.restore?directoryState:opts;
     let selected=directoryRoles.some(item=>item.id===initial.role)?initial.role:'all';
     let order=['name','newest','oldest'].includes(initial.order)?initial.order:'newest';
     let verifiedOnly=initial.verifiedOnly===true;
     const {panel:topControls,input,roleButtons,verifiedButton}=makeDirectoryTopControls(members,{
       role:selected,search:String(initial.search||'').slice(0,100),verified:verifiedOnly,
       onRole:id=>{selected=id;draw();},
       onSearch:()=>draw(),
       onVerified:()=>{verifiedOnly=!verifiedOnly;draw();}
     });
     const results=elem('div','a2k-d-members-main');
     const toolbar=elem('div','a2k-d-members-toolbar');
     const count=elem('p','a2k-d-members-count');
     const sorter=elem('label','a2k-d-member-sort-label','Sort by');
     const select=elem('select','a2k-d-member-sort');
     select.setAttribute('aria-label','Sort members');
     for(const [value,name] of [['name','Name A–Z'],['newest','Newest'],['oldest','Oldest']]){
       const option=elem('option','',name);option.value=value;select.append(option);
     }
     select.value=order;
     sorter.append(select);toolbar.append(count,sorter);
     // Phone/tablet: a small search + role selector replaces the large
     // directory sidebar; keep the sidebar untouched on desktop.
     const mobileTools=elem('div','a2k-d-mobile-member-tools');
     mobileTools.setAttribute('aria-label','Find and filter members');
     const mobileSearch=elem('input','a2k-d-mobile-member-search');
     mobileSearch.type='search';
     mobileSearch.placeholder='Search members…';
     mobileSearch.setAttribute('aria-label','Search members');
     mobileSearch.value=input.value;
     const mobileRole=elem('select','a2k-d-mobile-member-role');
     mobileRole.setAttribute('aria-label','Filter members by role');
     for(const item of directoryRoles){
       const option=elem('option','',item.label);
       option.value=item.id;
       mobileRole.append(option);
     }
     mobileRole.value=selected;
     mobileSearch.addEventListener('input',()=>{
       input.value=mobileSearch.value;
       draw();
     });
     mobileRole.addEventListener('change',()=>{
       const roleButton=roleButtons.get(mobileRole.value);
       if(roleButton)roleButton.click();
     });
     const mobileVerified=elem('button','a2k-d-mobile-member-verified-filter','✓ Verified');
     mobileVerified.type='button';
     mobileVerified.setAttribute('aria-pressed',String(verifiedOnly));
     mobileVerified.onclick=()=>verifiedButton.click();
     mobileTools.append(mobileSearch,mobileRole,mobileVerified);
     const list=elem('div','a2k-d-directory-grid a2k-d-members-grid');
     const empty=elem('p','a2k-d-directory-info','No members match that search.');
     empty.id='a2k-d-members-empty';empty.hidden=true;
     const cards=members.map(member=>({member,element:card(member)}));
     const joined=m=>{
       const date=new Date(m.created_at).getTime();
       return Number.isFinite(date)?date:0;
     };
     function draw(){
       if(serial!==request||!list.isConnected)return;
       const term=input.value.toLocaleLowerCase().trim();
       const shown=cards.filter(({member})=>{
         const matchRole=selected==='all'||rolesOf(member).includes(directoryRoles.find(r=>r.id===selected)?.role);
         const searchText=[member.stage_name,member.bio,...rolesOf(member)].filter(Boolean).join(' ').toLocaleLowerCase();
         return matchRole&&(!verifiedOnly||member._emblems?.is_verified===true)&&
           (!term||searchText.includes(term));
       }).sort((a,b)=>order==='newest'?joined(b.member)-joined(a.member):
         order==='oldest'?joined(a.member)-joined(b.member):
         String(a.member.stage_name||'').localeCompare(String(b.member.stage_name||'')));
       list.replaceChildren(...shown.map(({element})=>element));
       count.textContent=shown.length+' member'+(shown.length===1?'':'s')+
         (selected==='all'&&!term?' in the directory':' matching');
       empty.hidden=shown.length!==0;
       empty.textContent=members.length?'No members match your search and filters.':'No member profiles are visible in the directory yet.';
       for(const [id,button] of roleButtons)button.setAttribute('aria-pressed',String(selected===id));
       verifiedButton.setAttribute('aria-pressed',String(verifiedOnly));
       mobileVerified.setAttribute('aria-pressed',String(verifiedOnly));
       mobileRole.value=selected;
       mobileSearch.value=input.value;
       directoryState={role:selected,search:input.value,order,verifiedOnly};
     }
     // Full-width approved directory: controls above the portrait cards.
     results.append(heading,intro,topControls,mobileTools,toolbar,list,empty);
     layout.append(results);
     target.replaceChildren(layout);
     select.addEventListener('change',()=>{order=select.value;draw()});
     draw();
   }catch(error){
     if(serial!==request)return;
     console.warn('Public members directory unavailable',error);
     target.replaceChildren(elem('h1','','Members'),
       elem('p','a2k-d-directory-info','Unable to load member profiles right now.'));
   }
 };
 window.a2kOpenMemberProfile=async function(memberRef,source='members'){
   const identifier=String(memberRef||'');
   const isId=/^[a-f0-9-]{36}$/i.test(identifier);
   if(!isId&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier))return;
   const target=shell();if(!target)return;
   const serial=++request;lastSource=source;
   target.replaceChildren(elem('p','a2k-d-directory-info','Loading member profile…'));
   const isCurrent=()=>serial===request&&target.isConnected;
   try{
     const members=await fetchRows('member_profiles',
       'user_id,stage_name,profile_slug,bio,created_at,karaoke_interests,favorite_genres,profile_visibility,song_visibility,avatar_path',
       q=>q.eq(isId?'user_id':'profile_slug',identifier).limit(1));
     if(!isCurrent())return;
     const member=members[0];
     const userId=member?.user_id;
     const isSelf=signed()&&String(authUser.id)===String(userId);
     if(!member||(member.profile_visibility==='private'&&!isSelf)||
       (member.profile_visibility==='members'&&!signed()&&!isSelf)){
       target.replaceChildren(backButton(source),elem('p','a2k-d-directory-info',
         signed()?'This member has not shared a profile with you.':'Sign in to view profiles shared with members.'));
       if(!signed()){
         const login=elem('button','a2k-d-directory-action','Sign In');
         login.type='button';login.onclick=()=>navigate('signin');target.append(login);
       }
       return;
     }
     let preferenceRows=[];
     try{preferenceRows=await fetchRows('member_public_preferences','*',q=>q.eq('user_id',userId).limit(1))}
     catch(error){console.warn('Public member preferences unavailable',error)}
     if(!isCurrent())return;
     member._prefs=preferenceRows[0]||null;
     const roles=rolesOf(member);
     // Keep the directory tools and live directory statistics visible
     // while displaying one selected member to their right.
     const visibleMembers=await visibleDirectoryMembers().catch(error=>{
       console.warn('Directory statistics unavailable on profile',error);
       return null;
     });
     if(!isCurrent())return;
     member._emblems=visibleMembers?.find(m=>m.user_id===userId)?._emblems||
       (await fetchMemberEmblems([member])).get(userId)||null;
     if(!isCurrent())return;
     // The database-assigned slug is permanent, even when a stage name changes.
     history.replaceState(null,'','#member/'+encodeURIComponent(member.profile_slug||userId));
     const profileLayout=elem('div','a2k-d-members-layout a2k-d-members-profile-layout');
     const profileResult=elem('div','a2k-d-members-main a2k-d-selected-member');
     const {sidebar:directorySidebar}=makeDirectorySidebar(visibleMembers,{
       onRole:id=>window.a2kOpenMembersDirectory?.(target,{role:id}),
       onSearch:value=>window.a2kOpenMembersDirectory?.(target,{role:'all',search:value})
     });
     profileLayout.append(directorySidebar,profileResult);
     const showProfile=()=>target.replaceChildren(profileLayout);
     const share=elem('button','a2k-d-directory-back a2k-d-profile-share','Share Profile');
     share.type='button';
     share.setAttribute('aria-label','Share member profile link');
     share.onclick=async()=>{
       const url=location.origin+location.pathname+'#member/'+encodeURIComponent(member.profile_slug||userId);
       try{
         if(navigator.share){
           await navigator.share({title:(member.stage_name||'Member')+' · Addicted to Karaoke',url});
           return;
         }
       }catch(error){if(error.name==='AbortError')return;}
       try{
         await navigator.clipboard.writeText(url);
         share.textContent='Link Copied!';
         window.setTimeout(()=>{if(share.isConnected)share.textContent='Share Profile'},2200);
       }catch(error){
         const selection=window.prompt('Copy member profile link:',url);
       }
     };
     const overview=elem('div','a2k-d-public-profile-overview');
     const side=elem('aside','a2k-d-public-profile-sidebar');
     side.setAttribute('aria-label','Member information and badges');
     const avatar=publicAvatar(member,true);
     const name=elem('h1','',member.stage_name||'Karaoke Member');
     if(member._emblems?.is_verified)name.append(verifiedMark());
     const role=elem('p','a2k-d-profile-role',roles.join(' · ')||'Member');
     side.append(avatar,name,role);
     const flourish=elem('div','a2k-d-profile-flourish');
     flourish.append(ornamentSvg());
     flourish.setAttribute('aria-hidden','true');
     side.append(flourish);
     const facts=elem('div','a2k-d-profile-facts');
     const membership=elem('div','a2k-d-profile-fact a2k-d-profile-number');
     membership.hidden=true;
     membership.append(elem('span','a2k-d-profile-fact-icon','#'),elem('span','a2k-d-profile-fact-value',''));
     facts.append(membership);
     const date=member.created_at?new Date(member.created_at):null;
     if(date&&Number.isFinite(date.getTime())&&member._prefs?.show_member_since!==false){
       const joined=elem('div','a2k-d-profile-fact a2k-d-profile-joined');
       const calendarIcon=elem('span','a2k-d-profile-fact-icon');
       calendarIcon.append(directoryIcon('calendar'));
       joined.append(calendarIcon,
         elem('span','a2k-d-profile-fact-value','Member since '+
         new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(date)));
       facts.append(joined);
     }
     side.append(facts);
     if(member._prefs?.published_email||member._prefs?.published_phone){
       const contact=elem('div','a2k-d-profile-facts');
       contact.append(elem('h2','','Public Contact'));
       if(member._prefs.published_email){
         const email=elem('a','',member._prefs.published_email);
         email.href='mailto:'+member._prefs.published_email;contact.append(email);
       }
       if(member._prefs.published_phone){
         const phone=elem('a','',member._prefs.published_phone);
         phone.href='tel:'+member._prefs.published_phone.replace(/[^\d+]/g,'');contact.append(phone);
       }
       side.append(contact);
     }
     // The database controls member numbers. Never derive them from directory order.
     void (async()=>{
       try{
         const response=await client().rpc('a2k_public_member_number',{p_user_id:userId});
         if(!isCurrent()||response.error||!response.data)return;
         membership.querySelector('.a2k-d-profile-fact-value').textContent='Member #'+response.data;
         membership.hidden=false;
       }catch(error){console.warn('Member number unavailable',error)}
     })();
     const awards=elem('section','a2k-d-public-profile-awards');
     awards.append(elem('h2','','Badges'));
     const badges=elem('div','a2k-d-public-badges');
     badges.append(elem('p','a2k-d-directory-intro','Loading badges…'));
     awards.append(badges);
     side.append(awards);
     const main=elem('div','a2k-d-public-profile-main');
     const about=elem('section','a2k-d-public-profile-section a2k-d-profile-about');
     about.append(elem('h2','','About Me'),
       elem('p','a2k-d-profile-story',member.bio?.trim()||'This member has not shared an About Me story yet.'));
     main.append(about);
     // Favorite music genres are separate from member roles. Never invent example
     // genres for a member who has not selected any.
     const genres=Array.isArray(member.favorite_genres)
       ?member.favorite_genres.filter(x=>typeof x==='string'&&x.trim()&&x.length<=40).slice(0,16):[];
     if((roles.length||genres.length)&&member._prefs?.show_genres!==false){
       const interests=elem('section','a2k-d-public-profile-section a2k-d-profile-interests');
       interests.append(elem('h2','','Karaoke Interests'));
       if(genres.length){
         const tiles=elem('div','a2k-d-profile-interest-tiles');
         for(const genre of genres)tiles.append(elem('span','a2k-d-profile-interest-tile',genre));
         interests.append(tiles);
       }else interests.append(elem('p','a2k-d-profile-muted',isSelf
         ?'Choose favorite music genres under Profile → Settings.'
         :'No favorite music genres shared yet.'));
       main.append(interests);
     }
     // One shared profile structure for singers, KJs and venue owners:
     // the identity sidebar is fixed; tabs swap only the right-hand panel.
     const contentRail=elem('div','a2k-d-profile-content-rail');
     contentRail.append(main);
     overview.append(side,contentRail);
     overview.classList.add('a2k-d-member-profile-pane');
     if(roles.includes('KJ / Host')&&member._prefs?.show_kj_schedule!==false){
       const tabs=elem('div','a2k-d-profile-tabs');
       tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Member profile sections');
       const profileTab=elem('button','a2k-d-profile-tab','Profile');
       const scheduleTab=elem('button','a2k-d-profile-tab','Karaoke Schedule');
       const schedulePanel=elem('section','a2k-d-profile-schedule-pane');
       schedulePanel.hidden=true;
       schedulePanel.append(elem('h2','a2k-d-schedule-title','Karaoke Schedule'),
         elem('p','a2k-d-schedule-intro','Approved public karaoke nights hosted by this member.'),
         elem('p','a2k-d-profile-muted','Loading published schedule…'));
       profileTab.type=scheduleTab.type='button';
       profileTab.setAttribute('role','tab');scheduleTab.setAttribute('role','tab');
       profileTab.id='a2k-d-profile-tab-main';scheduleTab.id='a2k-d-profile-tab-schedule';
       main.id='a2k-d-profile-main-pane';schedulePanel.id='a2k-d-profile-schedule-pane';
       profileTab.setAttribute('aria-controls',main.id);
       scheduleTab.setAttribute('aria-controls',schedulePanel.id);
       main.setAttribute('role','tabpanel');schedulePanel.setAttribute('role','tabpanel');
       function activate(which){
         const showSchedule=which==='schedule';
         profileTab.setAttribute('aria-selected',String(!showSchedule));
         scheduleTab.setAttribute('aria-selected',String(showSchedule));
         profileTab.tabIndex=showSchedule?-1:0;
         scheduleTab.tabIndex=showSchedule?0:-1;
         // Do not hide the grid: it holds the member's identity in both views.
         main.hidden=showSchedule;
         schedulePanel.hidden=!showSchedule;
       }
       profileTab.onclick=()=>activate('profile');
       scheduleTab.onclick=()=>activate('schedule');
       tabs.append(profileTab,scheduleTab);
       contentRail.prepend(tabs);
       contentRail.append(schedulePanel);
       profileResult.replaceChildren(backButton(source),share,overview);
       showProfile();
       activate('profile');
       void (async()=>{
         try{
           const response=await client().rpc('a2k_public_kj_schedule',{p_user_id:userId});
           if(!isCurrent())return;
           if(response.error)throw response.error;
           const rows=Array.isArray(response.data)?response.data:[];
           const body=elem('div','a2k-d-published-kj-sessions');
           if(!rows.length){
             body.append(elem('p','a2k-d-profile-muted',
               'No approved karaoke schedule has been published for this host yet.'));
           }
           const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
           const localClock=(time)=>{
             const match=/^([0-2][0-9]):([0-5][0-9])/.exec(String(time||''));
             if(!match)return 'Time not provided';
             const hour=Number(match[1]);
             return (hour%12||12)+':'+match[2]+' '+(hour<12?'AM':'PM');
           };
           const nextDate=(day,start)=>{
             const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
               timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',
               hour:'2-digit',minute:'2-digit',hourCycle:'h23'
             }).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
             const today=new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day));
             let delta=(days.indexOf(day)-today.getUTCDay()+7)%7;
             const startParts=String(start||'').split(':').map(Number);
             const nowMinutes=+parts.hour*60+(+parts.minute);
             if(delta===0&&(startParts[0]*60+startParts[1])<nowMinutes)delta=7;
             today.setUTCDate(today.getUTCDate()+delta);
             return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(today);
           };
           for(const session of rows){
             if(!days.includes(session.day))continue;
             const card=elem('article','a2k-d-profile-schedule-card');
             const icon=elem('span','a2k-d-profile-schedule-icon','♫');icon.setAttribute('aria-hidden','true');
             const copy=elem('div','a2k-d-profile-schedule-copy');
             copy.append(elem('strong','',session.venue_name||'Karaoke Venue'),
               elem('span','',[session.city,session.state].filter(Boolean).join(', ')),
               elem('small','','Every '+session.day+' · Next: '+nextDate(session.day,session.start_time)+' · '+
                 localClock(session.start_time)+' – '+localClock(session.end_time)));
             card.append(icon,copy);
             if(session.venue_id&&typeof window.atkFavoriteOpenVenue==='function'){
               const open=elem('button','a2k-d-profile-schedule-link','View Venue');
               open.type='button';open.onclick=()=>window.atkFavoriteOpenVenue(session.venue_id,session.venue_name);
               card.append(open);
             }
             body.append(card);
           }
           schedulePanel.replaceChildren(elem('h2','a2k-d-schedule-title','Karaoke Schedule'),
             elem('p','a2k-d-schedule-intro','Published weekly hosting nights and next dates.'),body);
         }catch(error){
           if(isCurrent())schedulePanel.replaceChildren(
             elem('h2','a2k-d-schedule-title','Karaoke Schedule'),
             elem('p','a2k-d-profile-muted','The published schedule could not be loaded right now.'));
           console.warn('Published KJ schedule unavailable',error);
         }
       })();
     }else{
       profileResult.replaceChildren(backButton(source),share,overview);
       showProfile();
     }
     const badgeArt=new Set(['song_1','song_25','song_75','song_100','favorite_1','favorite_5','favorite_10','favorite_25','review_1','review_25','review_75','review_100','venue_1','venue_10','venue_25','venue_100','founder','founding_tester','community_supporter','verified_kj','verified_venue_owner','super_admin','admin','moderator']);
     try{
       const [awarded,types]=await Promise.all([
         fetchRows('profile_badge_awards','badge_code',q=>q.eq('user_id',userId).limit(100)),
         fetchRows('profile_badge_types','code,label',q=>q.limit(200))
       ]);
       if(!isCurrent())return;
       const labels=new Map(types.map(item=>[item.code,item.label]));
       badges.replaceChildren();
       // All earned badges stay visible here, now ordered by rarity.
       const tierPoints={Legendary:5,Epic:4,Rare:3,Uncommon:2,Common:1};
       const rankedAwards=awarded.slice().sort((a,b)=>{
         const score=code=>tierPoints[badgeRarity[String(code||'')]]||1;
         return score(b.badge_code)-score(a.badge_code)||
           String(a.badge_code||'').localeCompare(String(b.badge_code||''));
       });
       for(const item of rankedAwards){
         const code=String(item.badge_code||'');
         const label=labels.get(code)||code.replace(/_/g,' ');
         const tier=badgeRarity[code]||'Common';
         const hint=label+' · '+tier+' badge';
         const emblem=elem('span','a2k-d-illustrated-badge');
         emblem.setAttribute('role','img');emblem.setAttribute('aria-label',hint);emblem.title=hint;
         if(badgeArt.has(code)){
           const img=elem('img');img.src='assets/badges/'+code+'.png?v=319';img.alt='';
           img.loading='lazy';emblem.append(img);
         }else emblem.append(elem('span','a2k-d-badge-fallback','★'));
         badges.append(emblem);
       }
       if(!awarded.length)badges.append(elem('p','a2k-d-profile-muted','No public badges to display yet.'));
     }catch(error){
       if(isCurrent())badges.replaceChildren(elem('p','a2k-d-profile-muted','Badges are not available to this viewer.'));
     }
     // The saved visibility choices are public / members / private.
     // A member can always see their own songs; others must pass both this gate and RLS.
     const songsAllowed=roles.includes('Singer')&&(isSelf||member._prefs?.show_songs!==false)&&
       (isSelf||member.song_visibility==='public'||(member.song_visibility==='members'&&signed()));
     if(songsAllowed){
       const section=elem('section','a2k-d-public-profile-section a2k-d-profile-songs');
       const header=elem('div','a2k-d-profile-section-heading');
       header.append(elem('h2','','My Karaoke Songs'));
       const list=elem('div','a2k-d-public-songs');
       section.append(header,list);main.append(section);
       try{
         const songs=await fetchRows('karaoke_songs','title,artist,list_type,favorite',
           q=>q.eq('user_id',userId).order('created_at',{ascending:false}).limit(150));
         if(!isCurrent())return;
         if(songs.length){
           const action=elem('button','a2k-d-songbook-more','View All Songs');
           action.type='button';
           let expanded=false;
           const search=elem('input','a2k-d-songbook-search');
           search.type='search';search.placeholder='Search songs or artists…';
           search.setAttribute('aria-label','Search shared karaoke songs');
           const count=elem('small','a2k-d-songbook-count');
           const tools=elem('div','a2k-d-songbook-controls');
           tools.append(search,count);
           header.append(action);
           const draw=()=>{
             const term=search.value.trim().toLocaleLowerCase();
             const found=songs.filter(x=>(String(x.title||'')+' '+String(x.artist||'')).toLocaleLowerCase().includes(term));
             const visible=expanded||term?found:found.slice(0,3);
             list.replaceChildren();
             for(const song of visible){
               const item=elem('article','a2k-d-songbook-item');
               item.append(elem('span','a2k-d-songbook-heart',song.favorite?'♥':'♫'));
               const detail=elem('div','a2k-d-songbook-copy');
               detail.append(elem('strong','',song.title||'Untitled song'),elem('small','',song.artist||''));
               item.append(detail);
               if(song.list_type==='want_to_sing'||song.list_type==='duets')
                 item.append(elem('span','a2k-d-songbook-type',song.list_type==='duets'?'Duet':'Want to Sing'));
               list.append(item);
             }
             if(!found.length)list.append(elem('p','a2k-d-profile-muted','No songs match your search.'));
             count.textContent=found.length+' shared song'+(found.length===1?'':'s');
             action.hidden=!!term;
             action.textContent=expanded?'Show Fewer Songs':'View All Songs →';
             if(expanded||term){
               if(!tools.isConnected)header.after(tools);
             }else tools.remove();
           };
           search.addEventListener('input',draw);
           action.addEventListener('click',()=>{expanded=!expanded;draw()});
           draw();
         }else list.append(elem('p','a2k-d-profile-muted','No karaoke songs shared yet.'));
       }catch(error){
         if(isCurrent())list.replaceChildren(elem('p','a2k-d-profile-muted','Shared songs are unavailable to this viewer.'));
       }
     }
     // Favorite venues have no public/member visibility control yet. Never
     // expose someone else's private favorites from a public directory profile.
     if(isSelf){
       try{
         const saved=await fetchRows('venue_favorites','venue_id,venues(id,name,city,state,published)',
           q=>q.eq('user_id',userId).order('created_at',{ascending:false}).limit(100));
         if(!isCurrent())return;
         const places=saved.map(x=>x.venues).filter(x=>x?.published);
         if(places.length){
           const section=elem('section','a2k-d-public-profile-section a2k-d-profile-favorite-venues');
           const header=elem('div','a2k-d-profile-section-heading');
           header.append(elem('h2','','Favorite Venues'));
           const action=elem('button','a2k-d-songbook-more a2k-d-favorites-more','View All Venues →');
           action.type='button';header.append(action);
           section.append(header,elem('p','a2k-d-profile-muted','Only visible to you.'));
           const list=elem('div','a2k-d-profile-venue-list');
           const details=elem('p','a2k-d-profile-muted a2k-d-favorites-count');
           details.hidden=true;
           let expanded=false;
           function drawFavorites(){
             list.replaceChildren();
             for(const v of (expanded?places:places.slice(0,3))){
               const entry=elem('button','a2k-d-profile-venue-item');
               entry.type='button';
               const icon=elem('span','a2k-d-venue-icon','⌂');
               icon.setAttribute('aria-hidden','true');
               const copy=elem('span','a2k-d-venue-copy');
               copy.append(elem('strong','',v.name),elem('small','',[v.city,v.state].filter(Boolean).join(', ')));
               entry.append(icon,copy);
               entry.onclick=()=>{
                 if(typeof window.atkFavoriteOpenVenue==='function')window.atkFavoriteOpenVenue(v.id,v.name);
               };
               list.append(entry);
             }
             action.textContent=expanded?'Show Fewer Venues':'View All Venues →';
             details.hidden=!expanded;
             details.textContent=expanded?'Showing all '+places.length+' saved venue'+(places.length===1?'':'s')+'.':'';
           }
           action.onclick=()=>{expanded=!expanded;drawFavorites();};
           drawFavorites();
           section.append(list,details);main.append(section);
         }
       }catch(error){/* Own favorites are optional and remain private. */}
     }
     // KJs use this same member profile: ratings live here and their
     // approved weekly hosting schedule lives in the tab above.
     if(roles.includes('KJ / Host')){
       const section=elem('section','a2k-d-public-profile-section a2k-d-profile-kj-reviews');
       section.append(elem('h2','','KJ Reviews'));
       const mount=elem('div','a2k-d-profile-kj-ratings');
       section.append(mount);main.append(section);
       if(typeof window.a2kMountKjRatings==='function'){
         void window.a2kMountKjRatings(userId,null,false,mount);
       }else mount.append(elem('p','a2k-d-profile-muted','KJ ratings are unavailable right now.'));
     }
   }catch(error){
     if(serial!==request)return;
     console.warn('Could not load member profile',error);
     target.replaceChildren(backButton(source),elem('p','a2k-d-directory-info',
       'This profile is not available to you or could not be loaded.'));
   }
 };

 // Shareable member URLs use the existing profile and its privacy checks.
 function openMemberLink(){
   const match=/^#member\/([a-z0-9-]{1,70})$/i.exec(location.hash);
   if(match){window.a2kDesktopOpenMemberRoute?.(match[1].toLowerCase());return;}
   if(location.hash==='#members')window.a2kOpenMembersLanding?.();
 }
 window.addEventListener('hashchange',openMemberLink);
 if(document.readyState==='loading')
   document.addEventListener('DOMContentLoaded',openMemberLink,{once:true});
 else openMemberLink();

})();