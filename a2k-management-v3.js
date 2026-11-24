/* A2K Management Portal — System tab for Super Admins (management layer V3).
   Presentation layer only, following the V1/V2 layer pattern: it rearranges
   and restyles the existing portal panels and modules, and never changes how
   any action saves data. Desktop only (>=1024px, the same line the V1/V2
   layers use); the mobile dialog is untouched.

   Why this layer exists: the System tab's entry path is founder-gated end
   to end. managementBackupOpen() awaits managementBackupFounder() first, so
   for a Super Admin it throws before #management-backups is ever unhidden —
   and because the V1 tab switch derives the active tab from which section
   is visible, the tab never "switches" even though the hash already moved
   to #manage/system. managementHistoryOpen() has the same gate first, so
   the Activity Log is unreachable the same way.

   What it does, for a Super Admin (admin true, founder false):
   - The System tab OPENS: Backups area + Go Live row, exactly as for the
     Founder, minus the founder-only actions.
   - Backup / Restore / Inspect / Go Live / Activity History are locked
     inside the tab: their buttons are disabled with a Founder-only note.
     The Activity History section shows a short Founder-only note instead
     of the log, and management_read_audit_history is NEVER called.
   - The Founder path is untouched: the wrappers call the originals.
   - Server-side enforcement stays as-is. No RPC is widened; the layer only
     decides which client-side entry path to take, and the founder-only
     actions remain gated by managementBackupFounder() underneath. */
(function(){
 'use strict';
 if(window.__a2kMgmtV3)return;
 window.__a2kMgmtV3=true;

 function $(id){return document.getElementById(id);}
 function isDesktop(){
  return window.matchMedia('(min-width:1024px)').matches &&
   document.documentElement.classList.contains('a2k-desktop-live');
 }
 function el(tag,cls,text){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
 }

 /* Role, resolved once per page load. is_platform_founder is a read-only
    check (the same one the badge dialog uses to disable Save); it does not
    grant anything. */
 var rolePromise=null;
 function getRole(){
  if(rolePromise)return rolePromise;
  rolePromise=(async function(){
   try{
    var r=await Promise.all([
     authClient.rpc('is_platform_founder'),
     authClient.rpc('is_platform_admin')
    ]);
    return {founder:!r[0].error&&r[0].data===true,
            admin:!r[1].error&&r[1].data===true};
   }catch(e){return {founder:false,admin:false};}
  })();
  return rolePromise;
 }

 function hideChrome(){
  var tools=document.querySelector('#management-dialog>.management-tools');
  if(tools)tools.hidden=true;
  var t=$('management-title'); if(t)t.hidden=true;
  var p=document.querySelector('#management-dialog>p'); if(p)p.hidden=true;
 }

 /* Lock the founder-only entries inside the System tab: disable the
    buttons and add one shared note above the Backups area. Idempotent. */
 function lockSystemEntries(){
  var section=$('management-backups');
  if(!section)return;
  if(!section.querySelector('.mgmt-v3-founder-note')){
   var note=el('p','mgmt-v3-founder-note',
    'Backup, restore, inspect, Go Live and Activity History are Founder-only. '+
    'As a Super Admin you can view this page, but those actions stay with the Founder.');
   var home=$('atk-backup-home');
   if(home&&home.parentNode)home.parentNode.insertBefore(note,home);
   else section.insertBefore(note,section.firstChild);
  }
  Array.prototype.forEach.call(
   section.querySelectorAll('.management-entry'),function(btn){
    btn.disabled=true;
    btn.classList.add('mgmt-v3-locked');
    btn.setAttribute('title','Founder only');
   });
 }

 /* Show the Founder-only note in the Activity History section instead of
    the log. The filter UI is hidden by CSS while the section carries the
    mgmt-v3-history-locked class. Never calls management_read_audit_history. */
 function showHistoryNote(){
  var h=$('management-history');
  if(!h)return;
  h.hidden=false;
  h.classList.add('mgmt-v3-history-locked');
  var list=$('management-history-list');
  if(list){
   list.replaceChildren();
   list.append(el('p','mgmt-v3-founder-note',
    'Activity History is Founder-only. The read-only record of administrative '+
    'changes is available to the Founder.'));
  }
 }

 var origBackupOpen=null, origHistoryOpen=null, wrapped=false;

 function wrap(){
  if(wrapped)return true;
  if(typeof window.managementBackupOpen!=='function'||
     typeof window.managementHistoryOpen!=='function')return false;
  origBackupOpen=window.managementBackupOpen;
  origHistoryOpen=window.managementHistoryOpen;

  window.managementBackupOpen=async function(){
   if(!isDesktop()||typeof authClient==='undefined'||!authClient)
    return origBackupOpen.apply(this,arguments);
   var role=await getRole();
   if(role.founder||!role.admin)
    return origBackupOpen.apply(this,arguments);
   /* Super Admin: the same open the original does, minus the founder
      gate. managementBackupView('') / managementBackupStatus('') are
      local view helpers with no founder check. */
   managementResetNavigation();
   hideChrome();
   var b=$('management-backups'); if(b)b.hidden=false;
   var lp=$('atk-lifecycle-panel'); if(lp)lp.hidden=true;
   if(typeof managementBackupView==='function')managementBackupView('');
   if(typeof managementBackupStatus==='function')managementBackupStatus('');
   var d=$('management-dialog'); if(d)d.scrollTop=0;
   lockSystemEntries();
  };

  window.managementHistoryOpen=async function(){
   if(!isDesktop()||typeof authClient==='undefined'||!authClient)
    return origHistoryOpen.apply(this,arguments);
   var role=await getRole();
   if(role.founder||!role.admin)
    return origHistoryOpen.apply(this,arguments);
   /* Super Admin: show the note instead of the log. When this runs from
      the V2 System sync, #management-backups is already visible, so skip
      the reset and leave the Backups area showing beside the note. When
      it runs from the tools home, reset first like the original does. */
   var backups=$('management-backups');
   if(!backups||backups.hidden){
    managementResetNavigation();
    hideChrome();
   }
   showHistoryNote();
   var d=$('management-dialog'); if(d)d.scrollTop=0;
  };

  wrapped=true;
  return true;
 }

 function init(){
  /* The layer scripts load after the index inline script, so the entry
     functions normally exist already. Retry briefly if they do not yet,
     so a load-order surprise cannot silently leave the tab broken. */
  if(wrap())return;
  var tries=0;
  var iv=setInterval(function(){
   tries++;
   if(wrap()||tries>25)clearInterval(iv);
  },200);
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
