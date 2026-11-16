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
 function card(member){
   const box=elem('article','a2k-d-directory-card a2k-d-member-tile');
   const head=elem('div','a2k-d-member-tile-head');
   const avatar=elem('span','a2k-d-member-avatar',(member.stage_name||'M').trim().charAt(0).toUpperCase());
   avatar.setAttribute('aria-hidden','true');
   const label=elem('div');
   label.append(elem('h3','',member.stage_name||'Karaoke Member'),
     elem('p','a2k-d-directory-meta',rolesOf(member).join(' · ')||'Member'));
   head.append(avatar,label);box.append(head);
   if(member.bio)box.append(elem('p','a2k-d-member-summary',member.bio));
   const view=elem('button','a2k-d-directory-action','View Member Profile');
   view.type='button';view.onclick=()=>window.a2kOpenMemberProfile(member.user_id,'members');
   box.append(view);
   return box;
 }
 window.a2kOpenMembersDirectory=async function(root){
   const target=root||shell();
   if(!target)return;
   const serial=++request;lastSource='members';
   target.replaceChildren(elem('h1','','Members'),
     elem('p','a2k-d-directory-intro','Browse member profiles shared with the karaoke community. Private profiles are not shown.'),
     elem('p','a2k-d-directory-info','Loading members…'));
   try{
     const members=await fetchRows('member_profiles',
       'user_id,stage_name,bio,karaoke_interests,created_at,profile_visibility',
       q=>q.eq('directory_visible',true).order('stage_name',{ascending:true}).limit(200));
     if(serial!==request||!target.isConnected)return;
     const input=elem('input','a2k-d-directory-search');
     input.type='search';input.placeholder='Search members';
     input.setAttribute('aria-label','Search members');
     const list=elem('div','a2k-d-directory-grid a2k-d-members-grid');
     const cards=members.map(card);list.replaceChildren(...cards);
     input.oninput=()=>{
       const term=input.value.toLocaleLowerCase().trim();
       let shown=0;
       cards.forEach(item=>{item.hidden=!item.textContent.toLocaleLowerCase().includes(term);if(!item.hidden)shown++});
       const noMatches=$('a2k-d-members-empty');
       if(noMatches)noMatches.hidden=shown>0;
     };
     const empty=elem('p','a2k-d-directory-info',members.length?'No members match that search.':'No members have shared their profiles with you yet.');
     empty.id='a2k-d-members-empty';empty.hidden=members.length>0;
     target.replaceChildren(elem('h1','','Members'),
       elem('p','a2k-d-directory-intro','Browse member profiles shared with the karaoke community.'),
       input,list,empty);
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
       'user_id,stage_name,bio,created_at,karaoke_interests,profile_visibility,song_visibility',
       q=>q.eq('user_id',userId).limit(1));
     if(serial!==request)return;
     const member=members[0];
     if(!member){
       target.replaceChildren(elem('p','a2k-d-directory-info',
         'This member has not shared a profile with you.'));
       return;
     }
     const hero=elem('section','a2k-d-public-profile-hero');
     const avatar=elem('span','a2k-d-member-avatar a2k-d-member-avatar-large',
       (member.stage_name||'M').trim().charAt(0).toUpperCase());
     avatar.setAttribute('aria-hidden','true');
     const details=elem('div');
     details.append(elem('h1','',member.stage_name||'Karaoke Member'),
       elem('p','a2k-d-directory-meta',
         (rolesOf(member).join(' · ')||'Member')+' · Member since '+
         new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(member.created_at))),
       elem('p','',member.bio||'This member has not shared an About Me story yet.'));
     hero.append(avatar,details);
     target.replaceChildren(hero);
     const badges=elem('section','a2k-d-public-profile-section');
     badges.append(elem('h2','','Badges'));
     const badgeRow=elem('div','a2k-d-public-badges');badges.append(badgeRow);
     target.append(badges);
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