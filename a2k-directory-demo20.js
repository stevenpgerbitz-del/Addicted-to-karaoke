/* A2K member-directory density preview — 20 entirely fictional members.
   Founder-only visual simulation. No user accounts, member numbers, awards,
   auth records, or production statistics are created or modified. */
(function(){
 'use strict';
 const ROOT_ID='a2k-d-directory';
 const DEMO=[
  ['DJ Scarlet',['kj'],['verified_kj','founding_tester'],true,true,'Hosts retro karaoke across town.','80s Classics','2024-04-12'],
  ['Mic Drop Mike',['singer'],['song_25'],false,true,'Classic rock and big finales.','Classic Rock','2025-06-21'],
  ['The Velvet Voice',['singer'],['song_100','review_75'],true,true,'Ballads are my specialty.','Soul & R&B','2024-07-10'],
  ['Retro Rita',['singer'],['founding_tester'],false,false,'Always up for a duet.','80s Pop','2026-03-19'],
  ['DJ Echo',['kj','singer'],['verified_kj','community_supporter'],true,true,'Your host for Friday nights.','Country & Rock','2025-01-09'],
  ['Spotlight Sue',['venue_owner'],['verified_venue_owner'],true,true,'Helping singers feel at home.','All Genres','2024-09-30'],
  ['Jukebox Jordan',['kj'],[],false,true,'Hosting weekly karaoke parties.','Rock','2026-05-11'],
  ['Singalong Sally',['singer'],['favorite_25'],false,false,'If you know the chorus, sing it!','Singalongs','2026-02-16'],
  ['The Midnight Microphone',['singer','kj'],['review_100','song_75'],true,true,'Late nights and unforgettable songs.','90s Alternative','2024-12-01'],
  ['Piano Bar Pat',['singer'],['review_1'],false,true,'A little jazz makes everything better.','Jazz Standards','2026-08-21'],
  ['Karaoke Carrie',['singer'],['review_25','favorite_10'],true,true,'I love finding welcoming karaoke nights.','Pop','2025-05-15'],
  ['Soundcheck Sam',['kj'],['verified_kj'],true,false,'Making every mic sound its best.','Classic Rock','2025-11-03'],
  ['Golden Notes',['singer'],['song_75'],false,true,'Always discovering a new favorite.','Oldies','2025-08-17'],
  ['Vinyl & Velvet Entertainment',['kj','venue_owner'],['community_supporter','venue_10'],true,true,'Music, memories, and a packed room.','Disco & Funk','2024-01-26'],
  ['Encore Queen',['singer'],['favorite_5'],true,true,'One more song!','Pop & Dance','2026-06-23'],
  ['Stage Light Steve',['singer'],['founding_tester','song_1'],false,false,'Here for the great company.','Classic Country','2026-09-04'],
  ['Harmony Hall Manager',['venue_owner'],[],false,true,'Connecting the community with live music.','All Genres','2026-04-18'],
  ['DJ Northern Lights',['kj'],['verified_kj','venue_1'],true,true,'Songs for every generation.','Variety','2025-02-08'],
  ['The Karaoke Collector',['singer'],['song_100','favorite_25'],false,true,'My song list is never finished.','Rock & Pop','2024-11-19'],
  ['Preview Founder',['singer'],['founder'],true,true,'Example of the founder display.','80s & 90s','2023-07-07']
 ].map((v,i)=>({id:i+1,name:v[0],roles:v[1],badges:v[2],verified:v[3],
  portrait:v[4],about:v[5],music:v[6],joined:v[7]}));
 const LABELS={
  singer:'Singer',kj:'KJ / Host',venue_owner:'Venue Staff',
  founder:'Founder',founding_tester:'Founding Tester',
  verified_kj:'Verified KJ',verified_venue_owner:'Verified Venue Staff',
  community_supporter:'Community Supporter',song_1:'First Pick',
  song_25:'Song Collector',song_75:'Music Enthusiast',
  song_100:'Songbook Legend',review_1:'Review Rookie',
  review_25:'Review Contributor',review_75:'Review Expert',
  review_100:'Review Master',favorite_5:'Favorite Explorer',
  favorite_10:'Favorite Enthusiast',favorite_25:'Favorite Superfan',
  venue_1:'Karaoke Scout',venue_10:'Karaoke Discoverer'
 };
 const GROUPS=[
  ['all','All Members'],['singer','Singers'],['kj','KJ / Hosts'],
  ['venue_owner','Venue Staff']
 ];
 const BGS=['#6c3b32','#5b4337','#614532','#65342d','#4a3945','#60442f'];
 const SKINS=['#ddb18c','#a8644a','#e0c0a1','#87614b','#c28d6b','#e2b899'];
 const HAIR=['#2b1917','#7b4a28','#3f2924','#9c6548','#5d3222','#44332a'];
 const COATS=['#243d3d','#472c35','#343a57','#493d33','#3c4544','#53322e'];
 const byId=id=>document.getElementById(id);
 const create=(tag,cls,value)=>{
  const x=document.createElement(tag);if(cls)x.className=cls;
  if(value!==undefined)x.textContent=String(value);
  return x;
 };
 let previewOn=false,authUid=null,allowed=false,pendingAuth=null;
 const desktop=()=>typeof window.matchMedia==='function'&&
  window.matchMedia('(min-width:1024px)').matches&&
  document.documentElement.classList.contains('a2k-desktop-live');
 const currentUid=()=>{
  try{return typeof authUser!=='undefined'&&authUser?.id?authUser.id:null}
  catch{return null}
 };
 async function mayPreview(){
  const uid=currentUid();
  if(!desktop()||!uid||typeof authClient==='undefined'||!authClient)return false;
  if(authUid!==uid){authUid=uid;allowed=false;pendingAuth=null}
  if(allowed)return true;
  if(pendingAuth)return pendingAuth;
  pendingAuth=(async()=>{
   try{
    // A genuine server-side Founder check, not a claimed role in browser state.
    const {data,error}=await authClient.rpc('founder_beta_badge_status',{p_user_id:uid});
    allowed=!error&&data?.capacity===25;
    return allowed;
   }catch{return false}
   finally{pendingAuth=null}
  })();
  return pendingAuth;
 }
 function portraitSrc(index){
  const bg=BGS[index%BGS.length],skin=SKINS[index%SKINS.length];
  const hair=HAIR[(index*3+2)%HAIR.length],coat=COATS[(index*2+1)%COATS.length];
  const part=index%4,glasses=index%5===0;
  const hairShape=[
   '<path d="M70 132 Q55 43 136 38 Q216 37 211 134 Q199 92 176 83 Q125 101 81 87Z" fill="'+hair+'"/>',
   '<path d="M70 135 Q54 58 101 45 Q149 20 192 55 Q220 85 209 136 Q187 91 164 91 Q98 87 77 121Z" fill="'+hair+'"/>',
   '<path d="M72 131 Q51 80 86 48 Q126 25 188 47 Q221 71 209 132 L199 86 Q128 67 80 108Z" fill="'+hair+'"/>',
   '<path d="M72 120 Q70 50 133 41 Q195 35 210 115 Q172 71 133 82 Q94 80 72 120Z" fill="'+hair+'"/>'
  ][part];
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280">'
   +'<defs><radialGradient id="b"><stop stop-color="'+bg+'" offset="0"/><stop stop-color="#24100e" offset="1"/></radialGradient></defs>'
   +'<rect width="280" height="280" fill="url(#b)"/>'
   +'<circle cx="230" cy="47" r="38" fill="#cda16c" opacity=".12"/>'
   +'<path d="M21 280 Q38 213 100 208 Q140 227 177 208 Q241 214 260 280Z" fill="'+coat+'" stroke="#d5a877" stroke-width="3"/>'
   +'<path d="M114 210 L139 263 166 210" fill="#e8c49a" opacity=".5"/>'
   +'<rect x="119" y="186" width="42" height="39" rx="13" fill="'+skin+'"/>'
   +'<ellipse cx="140" cy="127" rx="65" ry="76" fill="'+skin+'" stroke="#654033" stroke-width="1.5"/>'
   +hairShape
   +'<path d="M93 128 Q106 122 119 128 M161 128 Q174 122 187 128" fill="none" stroke="#432a24" stroke-width="3" stroke-linecap="round"/>'
   +'<circle cx="107" cy="132" r="3.5" fill="#2e241e"/><circle cx="173" cy="132" r="3.5" fill="#2e241e"/>'
   +'<path d="M140 141 L135 158 Q141 162 148 158" fill="none" stroke="#885744" stroke-width="2"/>'
   +'<path d="M118 175 Q140 190 164 175" fill="none" stroke="#793c35" stroke-width="3" stroke-linecap="round"/>'
   +(glasses?'<rect x="87" y="117" width="41" height="32" rx="11" fill="none" stroke="#3a302b" stroke-width="4"/><rect x="152" y="117" width="41" height="32" rx="11" fill="none" stroke="#3a302b" stroke-width="4"/><path d="M128 127 H152" stroke="#3a302b" stroke-width="3"/>':'')
   +'<path d="M38 262 Q140 249 242 262" fill="none" stroke="#f1c68c" opacity=".18" stroke-width="3"/>'
   +'</svg>';
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
 }
 function verified(){
  const check=create('span','a2k-d-member-verified-mark','✓');
  check.setAttribute('role','img');
  check.setAttribute('aria-label','Sample verified account');
  check.title='Preview of verified account checkmark';return check;
 }
 function portrait(member,big=false){
  const frame=create('span','a2k-d-member-avatar'+(big?' a2k-d-member-avatar-large':''));
  frame.setAttribute('aria-hidden','true');
  if(member.portrait){
   const img=create('img','a2k-d-member-avatar-image');
   img.src=portraitSrc(member.id-1);img.alt='';
   frame.append(img);
  }
  if(!big){
   frame.append(create('span','a2k-d-member-photo-tag',LABELS[member.roles[0]]||'Member'));
  }
  return frame;
 }
 function award(code){
  const chip=create('span','a2k-d-member-featured-chip');
  chip.title=LABELS[code]||code;
  const img=create('img','a2k-d-member-featured-art');
  img.src='assets/badges/'+code+'.png?v=319';
  img.alt='';img.loading='lazy';img.onerror=()=>img.remove();
  chip.append(img,create('span','',LABELS[code]||code));
  return chip;
 }
 function card(m){
  const tile=create('article','a2k-d-directory-card a2k-d-member-tile a2k-d-demo-member-tile');
  const head=create('div','a2k-d-member-tile-head');
  const label=create('div');
  const name=create('h3','',m.name);
  if(m.verified)name.append(verified());
  label.append(name);
  head.append(portrait(m),label);tile.append(head);
  const awards=create('div','a2k-d-directory-featured');
  m.badges.slice(0,2).forEach(code=>awards.append(award(code)));
  if(!m.badges.length&&m.roles.includes('kj')){
   awards.append(create('span','a2k-d-member-role-chip','KJ / Host'));
  }
  if(awards.childElementCount)tile.append(awards);
  const number=create('p','a2k-d-member-number','Preview #'+String(m.id).padStart(2,'0'));
  tile.append(number);
  tile.append(create('p','a2k-d-member-since','Joined '+new Date(m.joined+'T12:00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'})));
  const view=create('button','a2k-d-directory-action','View sample profile');
  view.type='button';view.setAttribute('aria-label','View fictional sample profile of '+m.name);
  view.onclick=()=>profile(m);
  tile.append(view);return tile;
 }
 function banner(){
  const b=create('div','a2k-d-demo-notice');
  const tag=create('strong','','DEMO PREVIEW');
  const note=create('span','','20 fictional profiles · No actual members or accounts were created');
  b.append(tag,note);return b;
 }
 function back(){
  const b=create('button','a2k-d-demo-return','Return to Real Members');
  b.type='button';b.onclick=()=>{
   previewOn=false;
   const root=byId(ROOT_ID);
   if(root&&typeof window.a2kOpenMembersDirectory==='function'){
     void window.a2kOpenMembersDirectory(root,{restore:true});
   }
  };
  return b;
 }
 function show(){
  if(!desktop()||!allowed)return;
  const root=byId(ROOT_ID);if(!root)return;
  previewOn=true;
  const wrap=create('div','a2k-d-demo-preview');
  wrap.append(banner());
  const headline=create('div','a2k-d-demo-head');
  const title=create('div','');
  title.append(create('h1','','Members'),create('p','','How our directory could look with 20 different members'));
  headline.append(title,back());
  wrap.append(headline);
  const filters=create('section','a2k-d-demo-toolbar');
  filters.setAttribute('aria-label','Search and filter fictional members');
  const top=create('div','a2k-d-demo-toolbar-top');
  const search=create('input','a2k-d-demo-search');
  search.type='search';search.placeholder='Search members or badges…';
  search.setAttribute('aria-label','Search preview members');search.maxLength=100;
  const sort=create('select','a2k-d-demo-sort');
  sort.setAttribute('aria-label','Sort preview members');
  for(const [key,name] of [['name','Name A–Z'],['newest','Newest'],['oldest','Oldest']]){
   const option=create('option','',name);option.value=key;sort.append(option);
  }
  const totals=create('span','a2k-d-demo-total','20 sample members');
  top.append(search,totals,sort);
  const chips=create('div','a2k-d-demo-filter-tabs');
  const roleButtons=new Map();let role='all';
  for(const [id,label] of GROUPS){
   const n=DEMO.filter(m=>id==='all'||m.roles.includes(id)).length;
   const b=create('button','a2k-d-demo-filter',label+' ('+n+')');
   b.type='button';b.dataset.role=id;b.setAttribute('aria-pressed',String(id===role));
   b.onclick=()=>{role=id;draw()};
   chips.append(b);roleButtons.set(id,b);
  }
  filters.append(top,chips);wrap.append(filters);
  const grid=create('div','a2k-d-directory-grid a2k-d-members-grid a2k-d-demo-grid');
  const empty=create('p','a2k-d-demo-empty','No sample members match those filters.');
  empty.hidden=true;
  wrap.append(grid,empty);
  root.replaceChildren(wrap);
  history.replaceState(null,'','#members');
  function draw(){
   const q=search.value.toLocaleLowerCase().trim();
   const list=DEMO.filter(m=>(role==='all'||m.roles.includes(role))&&
    (!q||[m.name,m.about,m.music,m.roles.map(x=>LABELS[x]).join(' '),m.badges.map(x=>LABELS[x]).join(' ')]
     .join(' ').toLocaleLowerCase().includes(q)));
   if(sort.value==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
   else list.sort((a,b)=>sort.value==='oldest'?a.joined.localeCompare(b.joined):b.joined.localeCompare(a.joined));
   grid.replaceChildren(...list.map(card));
   empty.hidden=list.length!==0;
   totals.textContent=list.length+' of '+DEMO.length+' sample members';
   for(const [id,b] of roleButtons)b.setAttribute('aria-pressed',String(id===role));
  }
  search.addEventListener('input',draw);sort.addEventListener('change',draw);draw();
 }
 function profile(m){
  if(!previewOn)return;
  const root=byId(ROOT_ID);if(!root)return;
  const page=create('div','a2k-d-demo-preview a2k-d-demo-profile');
  page.append(banner());
  const backBtn=create('button','a2k-d-demo-return','← Back to 20 Samples');
  backBtn.type='button';backBtn.onclick=show;page.append(backBtn);
  const columns=create('div','a2k-d-demo-profile-columns');
  const side=create('section','a2k-d-demo-profile-side');
  side.append(portrait(m,true),create('h1','',m.name));
  if(m.verified)side.append(create('p','a2k-d-demo-verification','✓ Sample verified account'));
  side.append(create('p','',m.roles.map(r=>LABELS[r]).join(' · ')));
  side.append(create('p','', 'Preview #'+String(m.id).padStart(2,'0')));
  const awards=create('div','a2k-d-demo-profile-awards');
  m.badges.forEach(code=>awards.append(award(code)));
  side.append(awards);
  const main=create('div','a2k-d-demo-profile-main');
  const about=create('section','a2k-d-demo-profile-section');
  about.append(create('h2','','About '+m.name),create('p','',m.about));
  const details=create('section','a2k-d-demo-profile-section');
  details.append(create('h2','','Karaoke Profile'));
  details.append(create('p','','Member interests: '+m.roles.map(r=>LABELS[r]).join(', ')));
  details.append(create('p','','Favorite music: '+m.music));
  details.append(create('p','','Joined: '+new Date(m.joined+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})));
  const activity=create('section','a2k-d-demo-profile-section');
  activity.append(create('h2','','Community Activity'),create('p','','Illustrative section only — no songs, venue reviews, or schedules are stored for this fictional member.'));
  main.append(about,details,activity);columns.append(side,main);page.append(columns);
  root.replaceChildren(page);
 }
 async function ensureLaunch(){
  if(previewOn||!desktop())return;
  const root=byId(ROOT_ID),toolbar=root?.querySelector('.a2k-d-members-toolbar');
  if(!root||!toolbar||byId('a2k-d-demo-20-launch'))return;
  if(!await mayPreview()||!root.contains(toolbar)||previewOn)return;
  const btn=create('button','a2k-d-demo-launch','Preview 20 Members');
  btn.id='a2k-d-demo-20-launch';btn.type='button';
  btn.title='Founder-only, fictional 20-member layout preview';
  btn.addEventListener('click',show);
  toolbar.insertBefore(btn,toolbar.querySelector('.a2k-d-member-sort-label'));
 }
 function boot(){
  // Desktop Vintage creates #a2k-d-directory lazily when Members is opened.
  // Watch its permanent Find-screen parent, then watch the live directory root.
  const parent=byId('find-screen');
  let tracked=null,innerObserver=null;
  function attach(){
   const root=byId(ROOT_ID);
   if(root&&root!==tracked){
    innerObserver?.disconnect();
    tracked=root;
    innerObserver=new MutationObserver(()=>{
      // A real Members navigation replaces the demo contents. Reset the
      // preview flag so the founder can reopen the sample afterwards.
      if(previewOn&&!root.querySelector('.a2k-d-demo-preview'))previewOn=false;
      if(!previewOn)void ensureLaunch();
    });
    innerObserver.observe(root,{childList:true});
   }
   if(root&&!previewOn)void ensureLaunch();
  }
  if(parent){
   const outerObserver=new MutationObserver(attach);
   outerObserver.observe(parent,{childList:true});
  }
  attach();
  window.addEventListener('resize',()=>{
   if(previewOn&&!desktop()){
    previewOn=false;
    const root=byId(ROOT_ID);
    if(root)void window.a2kOpenMembersDirectory?.(root,{restore:true});
   }
  },{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
