/* Desktop-only venue composition — build 217.
   Reuses approved venue content and handlers. Restores original DOM on
   phone/tablet so mobile layout and behavior remain untouched. */
(function(){
 'use strict';
 const mq=window.matchMedia('(min-width:1024px)');
 const parts=[
   ['.location','aside'],
   ['.atk-venue-community-actions','aside'],
   ['.tabs','main'],
   ['#content','main'],
   ['.actions','aside']
 ];
 let state=null;
 function shouldMount(){
   return mq.matches&&document.documentElement.classList.contains('a2k-desktop-live');
 }
 function mount(){
   const venue=document.getElementById('venue-screen');
   if(!venue||state)return;
   const nodes=parts.map(([selector,target])=>({node:venue.querySelector(selector),target}));
   if(nodes.some(x=>!x.node))return;
   const markers=nodes.map(x=>{
     const marker=document.createComment('Desktop venue position');
     x.node.parentNode.insertBefore(marker,x.node);
     return {node:x.node,marker,target:x.target};
   });
   const columns=document.createElement('div');
   columns.className='a2k-d-venue-columns';
   const main=document.createElement('section');
   main.className='a2k-d-venue-main';
   main.setAttribute('aria-label','Venue details');
   const aside=document.createElement('aside');
   aside.className='a2k-d-venue-rail';
   aside.setAttribute('aria-label','Venue actions and directions');
   const heading=document.createElement('h2');
   heading.className='a2k-d-visit-heading';
   heading.textContent='Plan Your Visit';
   aside.append(heading);
   for(const entry of markers){
     (entry.target==='main'?main:aside).append(entry.node);
   }
   columns.append(main,aside);
   venue.insertBefore(columns,venue.querySelector('.foot'));
   state={markers,columns};
 }
 function restore(){
   if(!state)return;
   for(const entry of state.markers){
     entry.marker.parentNode.insertBefore(entry.node,entry.marker.nextSibling);
     entry.marker.remove();
   }
   state.columns.remove();
   state=null;
 }
 function refresh(){
   if(shouldMount())mount();
   else restore();
 }
 const onReady=()=>requestAnimationFrame(refresh);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady,{once:true});
 else onReady();
 if(mq.addEventListener)mq.addEventListener('change',refresh);
 else if(mq.addListener)mq.addListener(refresh);
 window.addEventListener('resize',refresh,{passive:true});
})();