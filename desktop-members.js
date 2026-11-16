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
   // Desktop sidebar handles navigation.
   target.replaceChildren(elem('p','a2k-d-directory-info','Loading member profile…'));
   try{
     const members=await fetchRows('member_profiles',
       'user_id,stage_name,bio,created_at,karaoke_interests,profile_visibility,song_visibility,avatar_path',
       q=>q.eq('user_id',userId).limit(1));
     if(serial!==request)return;
     const member=members[0];
     if(!member){
       target.replaceChildren(elem('p','a2k-d-directory-info',
         'This member has not shared a profile with you.'));
       return;
     }
     const hero=elem('section','a2k-d-public-profile-hero');
     const avatar=publicAvatar(member,true);
     const details=elem('div');
     details.append(elem('h1','',member.stage_name||'Karaoke Member'),
       elem('p','a2k-d-directory-meta',
         (rolesOf(member).join(' · ')||'Member')+' · Member since '+
         new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(member.created_at))),
       elem('p','',member.bio||'This member has not shared an About Me story yet.'));
     hero.append(avatar,details);
     const overview=elem('div','a2k-d-public-profile-overview');
     overview.append(hero);
     target.replaceChildren(backButton(source),overview);
     const badges=elem('section','a2k-d-public-profile-section a2k-d-public-profile-awards');
     badges.append(elem('h2','','Badges'));
     const badgeRow=elem('div','a2k-d-public-badges');badges.append(badgeRow);
     overview.append(badges);
     try{
       const awards=await fetchRows('profile_badge_awards','badge_code',
         q=>q.eq('user_id',userId).limit(100));
       if(serial!==request)return;
       const types=await fetchRows('profile_badge_types','code,label',
         q=>q.limit(200));
       if(serial!==request)return;
       const labels=new Map(types.map(item=>[item.code,item.label]));
       const badgeArt=new Set(['founder','super_admin','admin','moderator','founding_kj','member_10','member_100','member_1000','review_1','review_25','review_75','review_100','song_1','song_25','song_75','song_100','venue_1','venue_10','venue_25','venue_100']);
       for(const item of awards){
        const code=String(item.badge_code||'');
        const label=labels.get(code)||code.replace(/_/g,' ');
        const emblem=elem('span','a2k-d-illustrated-badge');
        emblem.setAttribute('role','img');emblem.setAttribute('aria-label',label);emblem.title=label;
        if(badgeArt.has(code)){
         const img=elem('img');img.src='assets/badges/'+code+'.svg';img.alt='';img.loading='lazy';emblem.append(img);
        }else emblem.append(elem('span','a2k-d-badge-fallback','★'));
        badgeRow.append(emblem);
       }
       if(!awards.length)badgeRow.append(elem('p','a2k-d-directory-intro','No public badges to display yet.'));
     }catch(error){
       badgeRow.append(elem('p','a2k-d-directory-intro',
         'Badge details are available to signed-in members.'));
     }
     if(rolesOf(member).includes('Singer')&&member.song_visibility!=='private'&&
       (member.song_visibility==='public'||signed())){
       const section=elem('section','a2k-d-public-profile-section');
       section.append(elem('h2','','Shared Karaoke Songs'));
       const list=elem('div','a2k-d-public-songs');
       section.append(list);target.append(section);
       try{
         const songs=await fetchRows('karaoke_songs','title,artist,list_type,favorite',
           q=>q.eq('user_id',userId).order('created_at',{ascending:false}).limit(150));
         if(serial!==request)return;
         if(songs.length){
          let showAll=false;
          const tools=elem('div','a2k-d-songbook-controls');
          const search=elem('input','a2k-d-songbook-search');search.type='search';search.placeholder='Search songs or artists';
          search.setAttribute('aria-label','Search shared karaoke songs');
          const count=elem('small','a2k-d-songbook-count');
          const more=elem('button','a2k-d-directory-action a2k-d-songbook-more','View All Songs');more.type='button';
          tools.append(search,count);section.insertBefore(tools,list);
          const draw=()=>{
           const term=search.value.trim().toLocaleLowerCase();
           const found=songs.filter(x=>(x.title+' '+x.artist).toLocaleLowerCase().includes(term));
           list.replaceChildren();
           for(const song of showAll||term?found:found.slice(0,6)){
            const item=elem('article','a2k-d-songbook-item');
            item.append(elem('span','a2k-d-songbook-heart',song.favorite?'♥':'♫'));
            const detail=elem('div','a2k-d-songbook-copy');
            detail.append(elem('strong','',song.title),elem('small','',song.artist));item.append(detail);
            if(song.list_type==='want_to_sing'||song.list_type==='duets')
             item.append(elem('span','a2k-d-songbook-type',song.list_type==='duets'?'Duet':'Want to Sing'));
            list.append(item);
           }
           if(!found.length)list.append(elem('p','a2k-d-directory-intro','No matching songs.'));
           count.textContent=found.length+' shared song'+(found.length===1?'':'s');
           more.hidden=!!term||found.length<=6;
           more.textContent=showAll?'Show Fewer Songs':'View All Songs';
           if(!more.isConnected)section.append(more);
          };
          search.oninput=draw;more.onclick=()=>{showAll=!showAll;draw();};draw();
         }else list.append(elem('p','a2k-d-directory-intro','No songs have been shared with you.'));
       }catch(error){
         list.replaceChildren(elem('p','a2k-d-directory-intro','Shared songs unavailable.'));
       }
     }
     if(rolesOf(member).includes('KJ / Host')){
       try{
         const hosts=await fetchRows('kj_review_hosts','user_id,stage_name,enabled',
           q=>q.eq('user_id',userId).eq('enabled',true).limit(1));
         if(hosts.length&&typeof window.a2kOpenKjHostProfile==='function'){
           const profile=elem('button','a2k-d-directory-action','View KJ Host Profile');
           profile.type='button';profile.onclick=()=>window.a2kOpenKjHostProfile(userId,'','');
           target.append(profile);
         }
       }catch(error){console.warn('KJ host profile unavailable',error)}
     }
   }catch(error){
     if(serial!==request)return;
     console.warn('Could not load member profile',error);
     target.replaceChildren(elem('p','a2k-d-directory-info',
       'This profile is not available to you or could not be loaded.'));
   }
 };
})();