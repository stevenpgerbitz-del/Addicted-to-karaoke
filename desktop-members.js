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
     }else window.a2kOpenMembersDirectory?.(shell());
   };
   return b;
 }
 function rolesOf(member){
   const roles=Array.isArray(member.karaoke_interests)?member.karaoke_interests:[];
   const mapping={singer:'Singer',kj:'KJ / Host',venue_owner:'Venue Owner'};
   return roles.map(x=>mapping[x]).filter(Boolean);
 }
 function publicAvatar(member,large=false){
   const avatar=elem('span','a2k-d-member-avatar'+(large?' a2k-d-member-avatar-large':''),(member.stage_name||'M').trim().charAt(0).toUpperCase());
   avatar.setAttribute('aria-hidden','true');
   const path=member.avatar_path;
   if(typeof path==='string'&&path&&client()){
     try{
       const url=client().storage.from('member-avatars').getPublicUrl(path)?.data?.publicUrl;
       if(url){
         const photo=elem('img','a2k-d-member-avatar-image');
         photo.alt='';photo.loading='lazy';photo.decoding='async';photo.src=url;
         photo.onerror=()=>photo.remove();
         avatar.append(photo);
       }
     }catch(error){console.warn('Could not display member photo',error)}
   }
   return avatar;
 }
 function card(member){
   const box=elem('article','a2k-d-directory-card a2k-d-member-tile');
   const head=elem('div','a2k-d-member-tile-head');
   const avatar=publicAvatar(member);
   const label=elem('div');
   label.append(elem('h3','',member.stage_name||'Karaoke Member'),
     elem('p','a2k-d-directory-meta',rolesOf(member).join(' · ')||'Member'));
   head.append(avatar,label);box.append(head);
   const summary=elem('p','a2k-d-member-summary',member.bio||'');
   if(member.bio)box.append(summary);
   const since=member.created_at&&Number.isFinite(new Date(member.created_at).getTime())
     ? new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric'}).format(new Date(member.created_at))
     : null;
   if(since)box.append(elem('p','a2k-d-member-since','Member since '+since));
   const view=elem('button','a2k-d-directory-action','View Profile');
   view.type='button';view.onclick=()=>window.a2kOpenMemberProfile(member.user_id,'members');
   box.append(view);
   return box;
 }
 window.a2kOpenMembersDirectory=async function(root){
   const target=root||shell();
   if(!target)return;
   const serial=++request;lastSource='members';
   target.replaceChildren(elem('h1','','Members'),
     elem('p','a2k-d-directory-info','Loading member directory…'));
   try{
     const rows=await fetchRows('member_profiles',
       'user_id,stage_name,bio,karaoke_interests,created_at,profile_visibility,avatar_path',
       q=>q.eq('directory_visible',true).order('stage_name',{ascending:true}).limit(200));
     if(serial!==request||!target.isConnected)return;
     // In addition to database RLS, respect the member's stated visibility.
     const members=rows.filter(m=>m.profile_visibility!=='private'&&
       (m.profile_visibility!=='members'||signed()));
     const heading=elem('h1','','Members');
     const intro=elem('p','a2k-d-directory-intro','Browse member profiles shared with the karaoke community.');
     const layout=elem('div','a2k-d-members-layout');
     const filters=elem('aside','a2k-d-members-filters');
     filters.setAttribute('aria-label','Find members');
     filters.append(elem('h2','','Find Members'));
     const input=elem('input','a2k-d-directory-search');
     input.type='search';input.placeholder='Search members…';input.setAttribute('aria-label','Search members');
     filters.append(input);
     const roles=[
       {id:'all',label:'All Members'},
       {id:'singer',label:'Singers',role:'Singer'},
       {id:'kj',label:'KJ / Hosts',role:'KJ / Host'},
       {id:'venue_owner',label:'Venue Owners',role:'Venue Owner'}
     ];
     const options=elem('div','a2k-d-member-role-options');
     options.setAttribute('role','group');options.setAttribute('aria-label','Browse by role');
     const sidebarTitle=elem('h3','','Browse by Role');
     const totalLabel=elem('p','a2k-d-member-sidebar-caption','Members visible to you');
     const roleCounts=Object.fromEntries(roles.map(opt=>[opt.id,
       opt.id==='all'?members.length:members.filter(m=>rolesOf(m).includes(opt.role)).length]));
     const roleButtons=new Map();
     let selected='all',order='name';
     const results=elem('div','a2k-d-members-main');
     const toolbar=elem('div','a2k-d-members-toolbar');
     const count=elem('p','a2k-d-members-count');
     const sorter=elem('label','a2k-d-member-sort-label','Sort by');
     const select=elem('select','a2k-d-member-sort');
     select.setAttribute('aria-label','Sort members');
     for(const [value,name] of [['name','Name A–Z'],['newest','Newest'],['oldest','Oldest']]){
       const option=elem('option','',name);option.value=value;select.append(option);
     }
     sorter.append(select);toolbar.append(count,sorter);
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
         const matchRole=selected==='all'||rolesOf(member).includes(roles.find(r=>r.id===selected)?.role);
         const searchText=[member.stage_name,member.bio,...rolesOf(member)].filter(Boolean).join(' ').toLocaleLowerCase();
         return matchRole&&(!term||searchText.includes(term));
       }).sort((a,b)=>order==='newest'?joined(b.member)-joined(a.member):
         order==='oldest'?joined(a.member)-joined(b.member):
         String(a.member.stage_name||'').localeCompare(String(b.member.stage_name||'')));
       list.replaceChildren(...shown.map(({element})=>element));
       count.textContent=shown.length+' member'+(shown.length===1?'':'s')+
         (selected==='all'&&!term?' in the directory':' matching');
       empty.hidden=shown.length!==0;
       empty.textContent=members.length?'No members match your search and filters.':'No member profiles are visible in the directory yet.';
       for(const [id,button] of roleButtons)button.setAttribute('aria-pressed',String(selected===id));
     }
     for(const role of roles){
       const button=elem('button','a2k-d-member-role-option',role.label+' ('+roleCounts[role.id]+')');
       button.type='button';button.dataset.role=role.id;
       button.setAttribute('aria-pressed',String(role.id==='all'));
       button.onclick=()=>{selected=role.id;draw();};
       roleButtons.set(role.id,button);options.append(button);
     }
     filters.append(totalLabel,sidebarTitle,options);
     results.append(toolbar,list,empty);
     layout.append(filters,results);
     target.replaceChildren(heading,intro,layout);
     input.addEventListener('input',draw);
     select.addEventListener('change',()=>{order=select.value;draw()});
     draw();
   }catch(error){
     if(serial!==request)return;
     console.warn('Public members directory unavailable',error);
     target.replaceChildren(elem('h1','','Members'),
       elem('p','a2k-d-directory-info','Unable to load member profiles right now.'));
   }
 };
 window.a2kOpenMemberProfile=async function(userId,source='members'){
   if(!/^[a-f0-9-]{36}$/i.test(String(userId||'')))return;
   const target=shell();if(!target)return;
   const serial=++request;lastSource=source;
   target.replaceChildren(elem('p','a2k-d-directory-info','Loading member profile…'));
   const isCurrent=()=>serial===request&&target.isConnected;
   try{
     const members=await fetchRows('member_profiles',
       'user_id,stage_name,bio,created_at,karaoke_interests,favorite_genres,profile_visibility,song_visibility,avatar_path',
       q=>q.eq('user_id',userId).limit(1));
     if(!isCurrent())return;
     const member=members[0];
     const isSelf=signed()&&String(authUser.id)===String(userId);
     if(!member||(member.profile_visibility==='private'&&!isSelf)||
       (member.profile_visibility==='members'&&!signed()&&!isSelf)){
       target.replaceChildren(backButton(source),elem('p','a2k-d-directory-info',
         'This member has not shared a profile with you.'));
       return;
     }
     const roles=rolesOf(member);
     const overview=elem('div','a2k-d-public-profile-overview');
     const side=elem('aside','a2k-d-public-profile-sidebar');
     side.setAttribute('aria-label','Member information and badges');
     const avatar=publicAvatar(member,true);
     const name=elem('h1','',member.stage_name||'Karaoke Member');
     const role=elem('p','a2k-d-profile-role',roles.join(' · ')||'Member');
     side.append(avatar,name,role);
     const flourish=elem('div','a2k-d-profile-flourish','❦');
     flourish.setAttribute('aria-hidden','true');
     side.append(flourish);
     const facts=elem('div','a2k-d-profile-facts');
     const membership=elem('div','a2k-d-profile-fact a2k-d-profile-number');
     membership.hidden=true;
     membership.append(elem('span','a2k-d-profile-fact-icon','#'),elem('span','a2k-d-profile-fact-value',''));
     facts.append(membership);
     const date=member.created_at?new Date(member.created_at):null;
     if(date&&Number.isFinite(date.getTime())){
       const joined=elem('div','a2k-d-profile-fact a2k-d-profile-joined');
       joined.append(elem('span','a2k-d-profile-fact-icon','▦'),
         elem('span','a2k-d-profile-fact-value','Member since '+
         new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(date)));
       facts.append(joined);
     }
     side.append(facts);
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
     if(roles.length||genres.length){
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
     overview.append(side,main);
     overview.classList.add('a2k-d-member-profile-pane');
     if(roles.includes('KJ / Host')){
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
       overview.id='a2k-d-profile-main-pane';schedulePanel.id='a2k-d-profile-schedule-pane';
       profileTab.setAttribute('aria-controls',overview.id);
       scheduleTab.setAttribute('aria-controls',schedulePanel.id);
       function activate(which){
         const showSchedule=which==='schedule';
         profileTab.setAttribute('aria-selected',String(!showSchedule));
         scheduleTab.setAttribute('aria-selected',String(showSchedule));
         overview.hidden=showSchedule;schedulePanel.hidden=!showSchedule;
       }
       profileTab.onclick=()=>activate('profile');
       scheduleTab.onclick=()=>activate('schedule');
       tabs.append(profileTab,scheduleTab);
       target.replaceChildren(backButton(source),tabs,overview,schedulePanel);
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
     }else target.replaceChildren(backButton(source),overview);
     const badgeArt=new Set(['founder','super_admin','admin','moderator','founding_kj','member_10','member_100','member_1000','review_1','review_25','review_75','review_100','song_1','song_25','song_75','song_100','venue_1','venue_10','venue_25','venue_100']);
     try{
       const [awarded,types]=await Promise.all([
         fetchRows('profile_badge_awards','badge_code',q=>q.eq('user_id',userId).limit(100)),
         fetchRows('profile_badge_types','code,label',q=>q.limit(200))
       ]);
       if(!isCurrent())return;
       const labels=new Map(types.map(item=>[item.code,item.label]));
       badges.replaceChildren();
       for(const item of awarded){
         const code=String(item.badge_code||'');
         const label=labels.get(code)||code.replace(/_/g,' ');
         const emblem=elem('span','a2k-d-illustrated-badge');
         emblem.setAttribute('role','img');emblem.setAttribute('aria-label',label);emblem.title=label;
         if(badgeArt.has(code)){
           const img=elem('img');img.src='assets/badges/'+code+'.svg';img.alt='';
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
     const songsAllowed=roles.includes('Singer')&&
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
             for(const v of (expanded?places:places.slice(0,1))){
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
     // KJs use this same member profile; their schedule is a tab above.
     // Do not add a second "View KJ Host Profile" popup link.
   }catch(error){
     if(serial!==request)return;
     console.warn('Could not load member profile',error);
     target.replaceChildren(backButton(source),elem('p','a2k-d-directory-info',
       'This profile is not available to you or could not be loaded.'));
   }
 };

})();