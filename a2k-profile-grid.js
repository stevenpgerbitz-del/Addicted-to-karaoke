/* A2K 223 — independent desktop profile columns.
   Moves the original cards (never clones them), so expanded cards
   don't produce large blank rows next to their taller neighbor. */
(function(){
 'use strict';
 const profile=document.getElementById('auth-profile');
 if(!profile)return;
 const mq=window.matchMedia('(min-width:1024px)');
 let layout=null,slots=[];
 const isCard=node=>node instanceof HTMLElement&&node.matches(':scope.profile-nav-card');
 function key(card){
  const name=(card.querySelector('summary .profile-nav-title')?.textContent||card.querySelector('.profile-nav-title')?.textContent||'').trim().toLowerCase();
  if(card.id==='atk-about-profile-entry'||name.includes('about me'))return 'about';
  if(card.id==='a2k-profile-awards'||name.includes('awards'))return 'awards';
  if(name.includes('favorite venues'))return 'favorites';
  if(name==='account')return 'account';
  if(card.id==='atk-singer-songs-entry'||name.includes('karaoke songs'))return 'songs';
  if(card.id==='a2k-profile-settings'||name==='settings')return 'settings';
  if(name.includes('my reviews'))return 'reviews';
  if(name.includes('hosting'))return 'hosting';
  if(name==='my venues')return 'owner';
  return 'other';
 }
 const order={about:0,awards:1,favorites:2,account:3,songs:0,settings:1,reviews:2,hosting:3,owner:4,other:5};
 function mount(){
  if(layout||!mq.matches)return;
  const hero=profile.querySelector(':scope>.member-hero');
  if(!hero)return;
  const cards=Array.from(profile.children).filter(isCard);
  if(!cards.length)return;
  layout=document.createElement('div');layout.className='a2k-profile-independent-columns';
  const left=document.createElement('div'),right=document.createElement('div');
  left.className='a2k-profile-column a2k-profile-column-left';
  right.className='a2k-profile-column a2k-profile-column-right';
  layout.append(left,right);
  slots=cards.map((card,index)=>{
   const marker=document.createComment('A2K profile original card '+index);
   card.parentNode.insertBefore(marker,card);
   return {card,marker,index,key:key(card)};
  });
  hero.insertAdjacentElement('afterend',layout);
  const leftKeys=new Set(['about','awards','favorites','account']);
  const sort=(a,b)=>(order[a.key]??9)-(order[b.key]??9)||a.index-b.index;
  slots.filter(x=>leftKeys.has(x.key)).sort(sort).forEach(x=>left.append(x.card));
  slots.filter(x=>!leftKeys.has(x.key)).sort(sort).forEach(x=>right.append(x.card));
 }
 function unmount(){
  if(!layout)return;
  for(const {card,marker} of slots){marker.replaceWith(card);}
  layout.remove();layout=null;slots=[];
 }
 function sync(){if(mq.matches)mount();else unmount();}
 mq.addEventListener?.('change',sync);
 sync();
})();
