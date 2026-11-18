/* A2K member-directory density preview — 1,000 entirely fictional members.
   Founder-only visual simulation. No user accounts, member numbers, awards,
   auth records, or production statistics are created or modified. */
(function(){
 'use strict';
 const ROOT_ID='a2k-d-directory';
 // A special opt-in preview URL can show fictional records without creating
 // accounts or requiring access to the real Founder management privileges.
 const demoLink=['members1000','members100','members50','members20'].includes(new URLSearchParams(location.search).get('a2k_demo'));
 let demoAutoOpened=false;
 const BASE_DEMO=[
  ['DJ Scarlet',['kj'],['verified_kj','founding_tester'],true,true,'Hosts retro karaoke across town.','80s Classics','2024-04-12'],
  ['Mic Drop Mike',['singer'],['song_25'],false,true,'Classic rock and big finales.','Classic Rock','2025-06-21'],
  ['The Velvet Voice',['singer'],['song_100','review_75'],true,true,'Ballads are my specialty.','Soul & R&B','2024-07-10'],
  ['Retro Rita',['singer'],['founding_tester','review_75','song_25'],false,false,'Always up for a duet.','80s Pop','2026-03-19'],
  ['DJ Echo',['kj','singer'],['verified_kj','community_supporter','review_75','song_100'],true,true,'Your host for Friday nights.','Country & Rock','2025-01-09'],
  ['Spotlight Sue',['venue_owner'],['verified_venue_owner'],true,true,'Helping singers feel at home.','All Genres','2024-09-30'],
  ['Jukebox Jordan',['kj'],[],false,true,'Hosting weekly karaoke parties.','Rock','2026-05-11'],
  ['Singalong Sally',['singer'],['favorite_25'],false,false,'If you know the chorus, sing it!','Singalongs','2026-02-16'],
  ['The Midnight Microphone',['singer','kj'],['review_100','song_75','favorite_10','venue_10'],true,true,'Late nights and unforgettable songs.','90s Alternative','2024-12-01'],
  ['Piano Bar Pat',['singer'],['review_1'],false,true,'A little jazz makes everything better.','Jazz Standards','2026-08-21'],
  ['Karaoke Carrie',['singer'],['review_25','favorite_10'],true,true,'I love finding welcoming karaoke nights.','Pop','2025-05-15'],
  ['Soundcheck Sam',['kj'],['verified_kj'],true,false,'Making every mic sound its best.','Classic Rock','2025-11-03'],
  ['Golden Notes',['singer'],['song_75'],false,true,'Always discovering a new favorite.','Oldies','2025-08-17'],
  ['Vinyl & Velvet Entertainment',['kj','venue_owner'],['community_supporter','venue_10','review_25','favorite_25'],true,true,'Music, memories, and a packed room.','Disco & Funk','2024-01-26'],
  ['Encore Queen',['singer'],['favorite_5'],true,true,'One more song!','Pop & Dance','2026-06-23'],
  ['Stage Light Steve',['singer'],['founding_tester','song_1'],false,false,'Here for the great company.','Classic Country','2026-09-04'],
  ['Harmony Hall Manager',['venue_owner'],[],false,true,'Connecting the community with live music.','All Genres','2026-04-18'],
  ['DJ Northern Lights',['kj'],['verified_kj','venue_1'],true,true,'Songs for every generation.','Variety','2025-02-08'],
  ['The Karaoke Collector',['singer'],['song_100','favorite_25','review_25','song_75'],false,true,'My song list is never finished.','Rock & Pop','2024-11-19'],
  ['Preview Founder',['singer'],['founder'],true,true,'Example of the founder display.','80s & 90s','2023-07-07'],
  ['Belt It Brenda',['singer'],['review_25','song_75'],true,true,'Making every chorus count.','Power Ballads','2025-03-12'],
  ['DJ Copper Mic',['kj'],['verified_kj','venue_10'],true,true,'Weekend host with a love for old-school hits.','Classic Hits','2024-02-25'],
  ['Neon-Free Nick',['singer'],['song_1'],false,false,'First song down, many more to go.','Rock','2026-11-01'],
  ['The Duet Department',['singer','kj'],['founding_tester','song_25','favorite_5'],false,true,'Two voices are better than one.','Duets','2025-10-14'],
  ['Velvet Lounge Crew',['venue_owner'],['verified_venue_owner','venue_25'],true,true,'Welcoming singers and hosts alike.','Variety','2024-06-05'],
  ['Country Roads Chris',['singer'],['song_100','favorite_25','review_75'],true,true,'Every night needs a little country.','Country','2024-08-08'],
  ['DJ Midnight Mix',['kj'],['verified_kj','community_supporter','review_100'],true,true,'Mixing unforgettable karaoke nights.','Dance & Pop','2023-12-01'],
  ['Harmony Hannah',['singer'],[],false,true,'New here and ready to sing!','Acoustic Pop','2026-10-03'],
  ['Backstage Ben',['singer','venue_owner'],['favorite_10','venue_1'],true,true,'Part singer, part event organizer.','Indie Rock','2025-07-19'],
  ['Miss Melody',['singer'],['song_25','review_1'],false,true,'Here for the music and the friendships.','Motown','2026-01-27'],
  ['DJ Silver Record',['kj'],['verified_kj','venue_100','review_25','song_75'],true,true,'Keeping microphones busy every weekend.','80s & 90s','2024-10-09'],
  ['The Longest Karaoke Stage Name Ever',['singer'],['review_100','favorite_10'],true,false,'A long name and an even longer song list.','Show Tunes','2025-02-14'],
  ['Sing It Again Samira',['singer'],['song_75','favorite_5'],false,true,'Still looking for the perfect encore.','R&B','2025-09-06'],
  ['Spotlight Shift Manager',['venue_owner'],['verified_venue_owner','community_supporter'],true,false,'Helping every performer find their spotlight.','All Genres','2024-03-29'],
  ['Open Mic Oliver',['singer'],['song_1','favorite_1'],false,true,'Just getting started.','Pop','2026-10-31'],
  ['DJ Heartland',['kj','singer'],['verified_kj','review_75','venue_10'],true,true,'Hosting karaoke across the heartland.','Country & Classic Rock','2025-04-16'],
  ['The Golden Era',['singer'],['song_100','review_100','favorite_25','venue_25'],true,true,'Oldies never go out of style.','50s & 60s','2023-09-22'],
  ['Stage Door Taylor',['venue_owner','singer'],['venue_1','favorite_5'],false,true,'Connecting singers and venues.','Indie Pop','2026-03-03'],
  ['Rockin Robin',['singer'],['song_25'],true,true,'Guitar solos welcome.','Classic Rock','2025-12-18'],
  ['MC Microphone Molly',['kj'],[],false,false,'Excited for my first hosting event.','Top 40','2026-11-06'],
  ['Last Call Legends',['kj','venue_owner'],['verified_kj','verified_venue_owner','community_supporter'],true,true,'Late-night karaoke is our favorite tradition.','Variety','2024-05-20'],
  ['Cassette Casey',['singer'],['founding_tester','review_25'],true,true,'Raised on mixtapes and singalongs.','80s','2025-11-12'],
  ['Soulful Simone',['singer'],['song_100','review_75','favorite_25'],false,true,'Give me a soulful harmony.','Soul','2024-11-30'],
  ['Des Moines DJ Collective',['kj'],['verified_kj','venue_25','review_100'],true,true,'Bringing hosts and venues together.','All Eras','2025-01-12'],
  ['Bluebird Bar Team',['venue_owner'],['verified_venue_owner','venue_10'],false,true,'A welcoming place for music lovers.','Country & Pop','2024-12-24'],
  ['Chorus Line Charlie',['singer'],['review_1'],false,false,'Always happy to cheer for another singer.','Broadway','2026-07-04'],
  ['Jazzy Jasmine',['singer'],['favorite_10','song_75'],true,true,'A little swing goes a long way.','Jazz','2025-06-07'],
  ['DJ Saturday Spotlight',['kj'],['verified_kj','founding_tester','review_75','venue_100'],true,true,'Saturday nights are for karaoke.','Party Anthems','2024-07-27'],
  ['Melody & Friends',['singer','kj'],['song_25','venue_1'],false,true,'Friends who sing together stay together.','Duets & Pop','2026-02-05'],
  ['Acoustic Avenue',['singer'],[],false,true,'Taking my first step into karaoke.','Acoustic','2026-11-14'],
  ["Riverside Rosie",["singer"],["song_25","favorite_5"],false,true,"Always up for a crowd-pleaser.","70s & 80s","2025-04-11"],
  ["DJ Prairie Thunder",["kj"],["verified_kj","review_75","venue_25"],true,true,"Hosting lively weekend karaoke.","Country Rock","2024-06-17"],
  ["Vinyl Vicki",["singer"],["founding_tester","favorite_25"],true,true,"Collector of singalong favorites.","Oldies","2024-09-09"],
  ["Corner Stage Crew",["venue_owner"],["verified_venue_owner","venue_10"],false,true,"Keeping the stage ready for everyone.","Variety","2025-10-02"],
  ["High Note Hector",["singer"],["song_75","review_25"],true,true,"Chasing the high notes.","Pop","2026-01-13"],
  ["DJ Spinning Gold",["kj","singer"],["verified_kj","song_100","community_supporter"],true,true,"Hosting with a little golden-era flair.","Disco","2024-02-22"],
  ["Midnight Marisol",["singer"],[],false,false,"Finding my karaoke voice.","Soul","2026-09-28"],
  ["The Copper Curtain",["venue_owner"],["venue_1"],false,true,"A neighborhood stage for karaoke fans.","All Genres","2026-03-06"],
  ["Duet Dan",["singer"],["song_1","favorite_1"],false,true,"Looking for my next duet partner.","Duets","2026-06-14"],
  ["DJ Vinyl Spin",["kj"],["verified_kj","venue_100","review_100","favorite_25"],true,true,"Experienced host and music lover.","Classic Hits","2023-11-05"],
  ["Silver Lining Sarah",["singer"],["review_75","song_25"],true,true,"Turning ordinary nights into great memories.","Ballads","2025-07-23"],
  ["Harmony House Staff",["venue_owner"],["verified_venue_owner","community_supporter"],true,false,"Helping make every karaoke night welcoming.","Pop & Rock","2024-05-30"],
  ["Microphone Maverick",["singer","kj"],["verified_kj","song_75"],true,true,"Sometimes I sing; sometimes I host.","Rock","2025-05-08"],
  ["Tina Two-Step",["singer"],["favorite_10"],false,true,"Country songs and dancing shoes.","Country","2025-12-02"],
  ["DJ Night Owl",["kj"],["verified_kj","review_25"],false,false,"Keeping the party going past midnight.","Dance","2026-04-17"],
  ["Willow Street Social",["venue_owner"],["venue_25","favorite_5"],true,true,"A meeting place for singers and friends.","Variety","2024-10-21"],
  ["Encore Eli",["singer"],["song_100","favorite_25","review_75"],true,true,"Never quite ready for the last song.","Rock Anthems","2023-09-14"],
  ["DJ Classic Cass",["kj"],["verified_kj","founding_tester"],true,true,"Sharing classic karaoke favorites.","80s","2024-12-16"],
  ["Singing Sunflower",["singer"],[],false,true,"Just happy to be here.","Acoustic","2026-11-10"],
  ["Sunset Tavern Staff",["venue_owner"],["verified_venue_owner","venue_10"],false,true,"Supporting local performers.","All Eras","2025-06-06"],
  ["The Chorus Captain",["singer","kj"],["song_25","review_100"],true,true,"Helping everyone find their big moment.","Pop","2025-02-02"],
  ["DJ Main Street",["kj"],["verified_kj","community_supporter","venue_10"],true,true,"From small-town stages to big singalongs.","Variety","2024-07-15"],
  ["Melody Mountain",["singer"],["favorite_5","review_1"],false,true,"Here for the joyful noise.","Indie","2026-02-21"],
  ["Gold Record Room",["venue_owner"],["venue_1"],false,false,"Testing our venue-team card layout.","All Genres","2026-07-12"],
  ["Samantha Sings",["singer"],["song_75","review_25"],true,true,"Never met a chorus I didn't love.","90s Pop","2025-08-10"],
  ["DJ Echo Valley",["kj"],["verified_kj","venue_25"],true,true,"A host with a passion for great sound.","Classic Country","2024-01-09"],
  ["The Backstage Trio",["singer"],["song_100","favorite_10"],false,true,"Three friends and one shared mic.","Harmony","2025-03-24"],
  ["Karaoke Corner Managers",["venue_owner"],["verified_venue_owner","venue_100","community_supporter"],true,true,"Building a welcoming local music scene.","All Genres","2023-08-19"],
  ["Rockstar Rafael",["singer"],["song_25","review_75","favorite_5"],true,true,"Every song deserves a guitar solo.","Hard Rock","2025-09-18"],
  ["DJ Red Curtain",["kj"],["verified_kj","review_100","venue_25"],true,true,"Showtime starts with the first note.","Show Tunes","2024-04-08"],
  ["The Quiet Singer",["singer"],[],false,false,"Working up the courage for my first song.","Acoustic","2026-11-17"],
  ["Main Stage Marcy",["venue_owner","singer"],["verified_venue_owner","song_1"],true,true,"Helping performers feel confident.","Pop","2025-01-29"],
  ["DJ Moonbeam",["kj"],["verified_kj","song_75","favorite_10"],false,true,"Hosting relaxed nights with big energy.","80s","2025-06-19"],
  ["Blue Sky Beth",["singer"],["founding_tester","review_1"],true,true,"Always cheering for the next singer.","Country","2025-10-30"],
  ["Stage Managers United",["venue_owner"],["venue_10","community_supporter"],false,true,"Coordinating karaoke for the neighborhood.","Variety","2026-08-27"],
  ["Ballad King Kevin",["singer"],["song_100","review_100","favorite_25","venue_25"],true,true,"A big fan of power ballads.","Ballads","2023-10-11"],
  ["DJ Jukebox Jenny",["kj","singer"],["verified_kj","song_25","review_25"],true,true,"A fun set list for every crowd.","Party Favorites","2024-09-01"],
  ["Country Harmony Club",["singer"],["favorite_25"],false,true,"Loving every heartfelt chorus.","Country","2025-11-25"],
  ["Candlelight Lounge Team",["venue_owner"],["verified_venue_owner","venue_25"],true,false,"Making room for the karaoke community.","Jazz & Soul","2024-08-07"],
  ["Mr. Mic Check",["kj"],["verified_kj","venue_1"],true,true,"Testing every microphone twice.","Rock","2026-03-13"],
  ["First Verse Fiona",["singer"],["song_1"],false,true,"One song at a time.","Pop","2026-10-04"],
  ["DJ Americana",["kj"],["verified_kj","review_75","venue_10"],true,true,"Keeping the music moving in every town.","Americana","2024-03-28"],
  ["Rhythm Room Operators",["venue_owner"],["venue_100","verified_venue_owner"],true,true,"Hosting singers of every experience level.","Variety","2023-06-02"],
  ["Sing It Loud Lucas",["singer"],["song_75","favorite_5"],false,true,"You can hear the chorus from outside.","Classic Rock","2025-12-14"],
  ["DJ Morning Star",["kj"],[],false,false,"New host learning the ropes.","Top 40","2026-11-07"],
  ["Twelve-Bar Blues Betty",["singer"],["review_25","song_25","favorite_10"],true,true,"Always ready for another blues song.","Blues","2025-05-27"],
  ["The Local Songbook",["singer","venue_owner"],["favorite_25","venue_10"],true,true,"Sharing music and making connections.","Oldies & Pop","2024-11-03"],
  ["DJ Big Chorus",["kj"],["verified_kj","community_supporter","review_100"],true,true,"Everyone joins the final chorus.","Singalongs","2024-02-12"],
  ["Golden Microphone Guest",["singer"],[],false,false,"An example of a brand-new member.","All Genres","2026-11-18"],
  ["The Final Encore Society",["singer","kj"],["verified_kj","song_100","review_75","favorite_25"],true,true,"Saving the best singalong for last.","Rock & Pop","2023-07-18"]
 ].map((v,i)=>({id:i+1,name:v[0],roles:v[1],badges:v[2],verified:v[3],
  portrait:v[4],about:v[5],music:v[6],joined:v[7]}));
 const DEMO=Array.from({length:1000},(_,i)=>{
  const original=BASE_DEMO[i%BASE_DEMO.length];
  const iteration=Math.floor(i/BASE_DEMO.length);
  return {...original,id:i+1,
   name:iteration?original.name+' · Encore '+(iteration+1):original.name,
   badges:iteration?original.badges.filter(b=>b!=='founder'&&b!=='founding_tester'):original.badges.slice()
  };
 });
 const PAGE_SIZE=40;
 const LABELS={
  singer:'Singer',kj:'KJ / Host',venue_owner:'Venue Staff',
  founder:'Founder',founding_tester:'Founding Tester',
  verified_kj:'Verified KJ',verified_venue_owner:'Verified Venue Staff',
  community_supporter:'Community Supporter',song_1:'First Pick',
  song_25:'Song Collector',song_75:'Music Enthusiast',
  song_100:'Songbook Legend',review_1:'Review Rookie',
  review_25:'Review Contributor',review_75:'Review Expert',
  review_100:'Review Master',favorite_1:'Favorite Finder',
  favorite_5:'Favorite Explorer',favorite_10:'Favorite Enthusiast',
  favorite_25:'Favorite Superfan',venue_1:'Karaoke Scout',
  venue_10:'Karaoke Discoverer',venue_25:'Karaoke Pathfinder',
  venue_100:'Karaoke Pioneer'
 };
 const GROUPS=[
  ['all','All Members'],['singer','Singers'],['kj','KJ / Hosts'],
  ['venue_owner','Venue Staff'],['verified','✓ Verified']
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
  if(demoLink&&desktop())return true;
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
   img.src=portraitSrc(member.id-1);img.alt='';img.loading='lazy';
   frame.append(img);
  }
  if(!big){
   frame.append(create('span','a2k-d-member-photo-tag',LABELS[member.roles[0]]||'Member'));
  }
  return frame;
 }

 const rarityRank={
  founder:5,founding_tester:5,review_100:5,song_100:5,venue_100:5,favorite_25:5,
  verified_kj:4,verified_venue_owner:4,community_supporter:4,super_admin:4,
  review_75:4,song_75:4,venue_25:4,favorite_10:4,
  admin:3,moderator:3,review_25:3,song_25:3,venue_10:3,favorite_5:3,
  review_1:2,song_1:2,venue_1:2,favorite_1:2
 };
 const rarityName={5:'Legendary',4:'Epic',3:'Rare',2:'Uncommon',1:'Common'};
 function sortedAwards(m){
  // The sample uses the same curated tiers as the real database, then
  // the number of sample badge holders as a tie-breaker.
  const holders=code=>DEMO.filter(x=>x.badges.includes(code)).length;
  return m.badges.slice().sort((a,b)=>
   (rarityRank[b]||1)-(rarityRank[a]||1) ||
   holders(a)-holders(b) || String(a).localeCompare(String(b)));
 }
 function award(code,showLabel=false){
  const label=LABELS[code]||code;
  const chip=create('span','a2k-d-member-featured-chip'+(showLabel?'':' a2k-d-icon-only-badge'));
  const hint=label+' · '+(rarityName[rarityRank[code]||1]||'Common')+' badge';
  chip.title=hint;chip.setAttribute('role','img');chip.setAttribute('aria-label',hint);
  const img=create('img','a2k-d-member-featured-art');
  img.src='assets/badges/'+code+'.png?v=319';
  img.alt='';img.loading='lazy';img.onerror=()=>chip.remove();
  chip.append(img);
  if(showLabel)chip.append(create('span','',label));
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
  sortedAwards(m).slice(0,4).forEach(code=>awards.append(award(code)));
  // Role is shown on the portrait; award row contains only earned badges.
  if(awards.childElementCount)tile.append(awards);
  const number=create('p','a2k-d-member-number','Preview #'+String(m.id).padStart(2,'0'));
  tile.append(number);
  tile.append(create('p','a2k-d-member-since','Joined '+new Date(m.joined+'T12:00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'})));
  const view=create('button','a2k-d-directory-action','View sample profile');
  view.type='button';view.setAttribute('aria-label','View fictional sample profile of '+m.name+
   (m.badges.length?'. Sample badges: '+sortedAwards(m).map(x=>LABELS[x]||x).join(', '):''));
  if(m.badges.length)view.title=sortedAwards(m).slice(0,4).map(code=>(LABELS[code]||code)+' ('+(rarityName[rarityRank[code]||1]||'Common')+')').join(' · ');
  view.onclick=()=>profile(m);
  tile.append(view);return tile;
 }
 function banner(){
  const b=create('div','a2k-d-demo-notice');
  const tag=create('strong','','DEMO PREVIEW');
  const note=create('span','','1,000 fictional profiles · No actual members or accounts were created');
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
  if(!desktop()||(!allowed&&!demoLink))return;
  const root=byId(ROOT_ID);if(!root)return;
  previewOn=true;
  const wrap=create('div','a2k-d-demo-preview');
  wrap.append(banner());
  const headline=create('div','a2k-d-demo-head');
  const title=create('div','');
  title.append(create('h1','','Members'),create('p','','How our directory could look with 1,000 different members'));
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
  const totals=create('span','a2k-d-demo-total','1,000 sample members');
  top.append(search,totals,sort);
  const chips=create('div','a2k-d-demo-filter-tabs');
  const roleButtons=new Map();let role='all',pageNumber=1;
  for(const [id,label] of GROUPS){
   const n=DEMO.filter(m=>id==='all'||(id==='verified'?m.verified:m.roles.includes(id))).length;
   const b=create('button','a2k-d-demo-filter'+(id==='verified'?' a2k-d-demo-verified-filter':''),label+' ('+n+')');
   b.type='button';b.dataset.role=id;b.setAttribute('aria-pressed',String(id===role));
   b.onclick=()=>{role=id;pageNumber=1;draw()};
   chips.append(b);roleButtons.set(id,b);
  }
   filters.append(top,chips);wrap.append(filters);
  const grid=create('div','a2k-d-directory-grid a2k-d-members-grid a2k-d-demo-grid');
  const empty=create('p','a2k-d-demo-empty','No sample members match those filters.');
  empty.hidden=true;
  wrap.append(grid,empty);
   const pagination=create('nav','a2k-d-demo-pagination');
   pagination.setAttribute('aria-label','Preview member pages');
   wrap.append(pagination);
  root.replaceChildren(wrap);
  history.replaceState(null,'','#members');
  function draw(){
   const q=search.value.toLocaleLowerCase().trim();
   const list=DEMO.filter(m=>(role==='all'||(role==='verified'?m.verified:m.roles.includes(role)))&&
    (!q||[m.name,m.about,m.music,m.roles.map(x=>LABELS[x]).join(' '),m.badges.map(x=>LABELS[x]).join(' ')]
     .join(' ').toLocaleLowerCase().includes(q)));
   if(sort.value==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
   else list.sort((a,b)=>sort.value==='oldest'?a.joined.localeCompare(b.joined):b.joined.localeCompare(a.joined));
   const totalPages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
    pageNumber=Math.min(pageNumber,totalPages);
    const offset=(pageNumber-1)*PAGE_SIZE;
    grid.replaceChildren(...list.slice(offset,offset+PAGE_SIZE).map(card));
    pagination.replaceChildren();
    if(list.length>PAGE_SIZE){
      const prev=create('button','a2k-d-demo-page-control','‹ Previous');
      prev.type='button';prev.disabled=pageNumber===1;
      prev.onclick=()=>turnPage(pageNumber-1);
      pagination.append(prev);
      const first=Math.max(1,Math.min(pageNumber-2,totalPages-4));
      const last=Math.min(totalPages,first+4);
      if(first>1){
        pagination.append(pageButton(1));
        if(first>2)pagination.append(create('span','a2k-d-demo-page-ellipsis','…'));
      }
      for(let n=first;n<=last;n++)pagination.append(pageButton(n));
      if(last<totalPages){
        if(last<totalPages-1)pagination.append(create('span','a2k-d-demo-page-ellipsis','…'));
        pagination.append(pageButton(totalPages));
      }
      const next=create('button','a2k-d-demo-page-control','Next ›');
      next.type='button';next.disabled=pageNumber===totalPages;
      next.onclick=()=>turnPage(pageNumber+1);
      pagination.append(next);
      const range=create('span','a2k-d-demo-page-summary',
        'Showing '+(offset+1)+'–'+Math.min(offset+PAGE_SIZE,list.length)+' of '+list.length+
        ' · Page '+pageNumber+' of '+totalPages);
      pagination.append(range);
    }
    function pageButton(n){
      const b=create('button','a2k-d-demo-page-control'+(n===pageNumber?' is-current':''),String(n));
      b.type='button';b.setAttribute('aria-label','Page '+n);
      if(n===pageNumber)b.setAttribute('aria-current','page');
      b.onclick=()=>turnPage(n);return b;
    }
    function turnPage(n){
      if(n<1||n>totalPages||n===pageNumber)return;
      pageNumber=n;draw();filters.scrollIntoView({block:'start',behavior:'auto'});
    }
   empty.hidden=list.length!==0;
   totals.textContent=list.length+' of '+DEMO.length+' sample members';
   for(const [id,b] of roleButtons)b.setAttribute('aria-pressed',String(id===role));

  }
  search.addEventListener('input',()=>{pageNumber=1;draw()});sort.addEventListener('change',()=>{pageNumber=1;draw()});draw();
 }
 function profile(m){
  if(!previewOn)return;
  const root=byId(ROOT_ID);if(!root)return;
  const page=create('div','a2k-d-demo-preview a2k-d-demo-profile');
  page.append(banner());
  const backBtn=create('button','a2k-d-demo-return','← Back to 1,000 Samples');
  backBtn.type='button';backBtn.onclick=show;page.append(backBtn);
  const columns=create('div','a2k-d-demo-profile-columns');
  const side=create('section','a2k-d-demo-profile-side');
  side.append(portrait(m,true),create('h1','',m.name));
  if(m.verified)side.append(create('p','a2k-d-demo-verification','✓ Sample verified account'));
  side.append(create('p','',m.roles.map(r=>LABELS[r]).join(' · ')));
  side.append(create('p','', 'Preview #'+String(m.id).padStart(2,'0')));
  const awards=create('div','a2k-d-demo-profile-awards');
  sortedAwards(m).forEach(code=>awards.append(award(code,true)));
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
  if(!root||!toolbar||byId('a2k-d-demo-100-launch'))return;
  if(!await mayPreview()||!root.contains(toolbar)||previewOn)return;
  if(demoLink&&!demoAutoOpened){
    demoAutoOpened=true;
    show();
    return;
  }
  const btn=create('button','a2k-d-demo-launch','Preview 1,000 Members');
  btn.id='a2k-d-demo-100-launch';btn.type='button';
  btn.title='Founder-only, fictional 1,000-member layout preview';
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
  // The URL is explicitly chosen for design review; do not depend on the
  // Founder's account login or on a previously mounted directory.
  if(demoLink&&desktop())window.a2kOpenMembersLanding?.();
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
