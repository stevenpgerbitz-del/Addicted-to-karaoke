/* A2K desktop management workspace, build 216.
   Preserves the existing Founder authorization and all mobile dialogs. */
(function(){
 'use strict';
 let marker=null;
 let dialog=null;
 let workspace=null;
 let restoring=false;
 const isDesktop=()=>window.matchMedia('(min-width:1024px)').matches&&
   document.documentElement.classList.contains('a2k-desktop-live');
 function ensureWorkspace(){
   const pages=document.getElementById('unified-pages');
   dialog=document.getElementById('management-dialog');
   if(!pages||!dialog)return false;
   if(!marker){
     marker=document.createComment('Original management dialog position');
     dialog.parentNode.insertBefore(marker,dialog);
   }
   workspace=document.getElementById('a2k-desktop-management-workspace');
   if(!workspace){
     workspace=document.createElement('section');
     workspace.id='a2k-desktop-management-workspace';
     workspace.setAttribute('aria-label','Management workspace');
     workspace.hidden=true;
     pages.appendChild(workspace);
   }
   if(dialog.parentNode!==workspace)workspace.appendChild(dialog);
   return true;
 }
 function returnDialog(){
   if(restoring)return;
   restoring=true;
   document.body.classList.remove('a2k-desktop-management-active');
   if(workspace)workspace.hidden=true;
   if(marker?.parentNode&&dialog&&dialog.parentNode!==marker.parentNode){
     marker.parentNode.insertBefore(dialog,marker.nextSibling);
   }
   restoring=false;
 }
 function closeWorkspace(){
   const current=dialog||document.getElementById('management-dialog');
   if(current?.open&&document.body.classList.contains('a2k-desktop-management-active'))
     current.close();
   returnDialog();
 }
 function open(){
   if(!isDesktop())return false;
   if(!ensureWorkspace())return false;
   // A venue page hides unified-pages; return to the member page first.
   if(document.getElementById('unified-pages')?.hidden&&typeof window.navigate==='function')
     window.navigate('signin');
   // Preserve managementOpen()'s existing server-side Founder check.
   document.body.classList.add('a2k-desktop-management-active');
   workspace.hidden=false;
   if(!dialog.open)dialog.show(); // Non-modal: render in the central column.
   window.scrollTo({top:0,behavior:'instant'});
   return true;
 }
 window.a2kDesktopManagementOpen=open;
 window.a2kDesktopManagementClose=closeWorkspace;
 function init(){
   const current=document.getElementById('management-dialog');
   if(!current)return;
   dialog=current;
   dialog.addEventListener('close',returnDialog);
   // Page navigation should not leave the admin panel floating over other pages.
   document.querySelectorAll('#a2k-desktop-sidebar .a2k-d-nav-btn')
     .forEach(button=>button.addEventListener('click',()=>{
       if(document.body.classList.contains('a2k-desktop-management-active'))closeWorkspace();
     }));
   // Keep the main section's top visible when switching tools.
   const targets=['management-approvals','management-reviews','management-history',
     'management-backups','management-venues','management-users',
     'management-venue-details','management-member-details'];
   const observer=new MutationObserver(()=>{
     if(!document.body.classList.contains('a2k-desktop-management-active'))return;
     // This observer reads only; never invokes management actions.
     if(workspace&&workspace.hidden)workspace.hidden=false;
   });
   for(const id of targets){
     const section=document.getElementById(id);
     if(section)observer.observe(section,{attributes:true,attributeFilter:['hidden']});
   }
   const media=window.matchMedia('(min-width:1024px)');
   const adjust=()=>{if(!isDesktop()&&document.body.classList.contains('a2k-desktop-management-active'))closeWorkspace()};
   if(media.addEventListener)media.addEventListener('change',adjust);
   else if(media.addListener)media.addListener(adjust);
   window.addEventListener('resize',adjust,{passive:true});
   window.addEventListener('hashchange',()=>{
     if(!document.body.classList.contains('a2k-desktop-management-active'))return;
     // Management has no own hash: a real change to a different page closes it.
     if(!document.getElementById('management-dialog')?.open)returnDialog();
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();