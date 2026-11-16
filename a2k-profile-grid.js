/* A2K 224 — independent, balanced desktop profile columns.
   Wait for the Settings/Awards sections to be built before moving any cards.
   The original DOM nodes are moved, never copied, and restored for mobile. */
(function(){
 'use strict';
 function init(){
  const profile=document.getElementById('auth-profile');
  if(!profile)return;
  const breakpoint=window.matchMedia('(min-width:1024px)');
  let layout=null,slots=[],left=null,right=null,scheduled=false;
  const isCard=el=>el instanceof HTMLElement&&el.classList.contains('profile-nav-card');
  function assign(){
   if(!layout)return;
   const visible=slots.filter(x=>!x.card.hidden);
   const hidden=slots.filter(x=>x.card.hidden);
   visible.forEach((item,index)=>(index%2?right:left).append(item.card));
   hidden.forEach((item,index)=>(index%2?right:left).append(item.card));
  }
  function mount(){
   if(layout||!breakpoint.matches)return;
   const hero=Array.from(profile.children).find(el=>el.classList?.contains('member-hero'));
   const cards=Array.from(profile.children).filter(isCard);
   if(!hero||!cards.length)return;
   layout=document.createElement('div');
   layout.className='a2k-profile-independent-columns';
   left=document.createElement('div');left.className='a2k-profile-column a2k-profile-column-left';
   right=document.createElement('div');right.className='a2k-profile-column a2k-profile-column-right';
   layout.append(left,right);
   slots=cards.map((card,index)=>{
    const marker=document.createComment('A2K profile card position '+index);
    profile.insertBefore(marker,card);
    return {card,marker};
   });
   hero.insertAdjacentElement('afterend',layout);
   assign();
  }
  function unmount(){
   if(!layout)return;
   for(const {card,marker} of slots)marker.replaceWith(card);
   layout.remove();layout=null;left=null;right=null;slots=[];
  }
  function sync(){if(breakpoint.matches)mount();else unmount();}
  function schedule(){
   if(scheduled)return;scheduled=true;
   window.requestAnimationFrame(()=>{scheduled=false;if(layout)assign();else sync();});
  }
  // Role-specific cards can become visible or hidden after login or onboarding.
  // Rebalance without moving them out of their profile or duplicating anything.
  const observer=new MutationObserver(records=>{
   if(records.some(r=>r.type==='attributes'&&r.attributeName==='hidden'))schedule();
   if(layout&&records.some(r=>r.type==='childList'&&r.target===profile&&Array.from(r.addedNodes).some(isCard))){
    // New section added later; return to original positions and recapture all.
    unmount();schedule();
   }
  });
  observer.observe(profile,{subtree:true,attributes:true,attributeFilter:['hidden'],childList:true});
  if(breakpoint.addEventListener)breakpoint.addEventListener('change',sync);
  else breakpoint.addListener(sync);
  sync();
 }
 // The Settings module builds Awards and Settings on DOMContentLoaded;
 // do not mount before that callback runs.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();