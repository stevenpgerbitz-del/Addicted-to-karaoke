/* A2K Build 189 — Founder-only test reset, activated only by explicit site interaction. */
(function(){
 'use strict';
 function setup(){
  const home=document.getElementById('atk-backup-home');
  const management=document.getElementById('management-dialog');
  if(!home||!management||document.getElementById('a2k-reset-entry'))return;
  const entry=document.createElement('button');
  entry.type='button';
  entry.id='a2k-reset-entry';
  entry.className='management-entry';
  entry.append(document.createTextNode('Reset Test Data'));
  const detail=document.createElement('small');
  detail.textContent='Remove test venues, three other users, reviews and uploaded files. Keep Founder #000001.';
  entry.append(detail);
  home.append(entry);
  const overlay=document.createElement('div');
  overlay.id='a2k-test-reset-overlay';
  overlay.hidden=true;
  overlay.setAttribute('role','alertdialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','a2k-reset-title');
  overlay.innerHTML=`
   <div id="a2k-test-reset-card">
    <h3 id="a2k-reset-title">Reset Test Data</h3>
    <div class="a2k-reset-preserved">Keep Founder account, Member #000001 and Founder permissions</div>
    <p>This will permanently delete 8 test venues, 2 reviews, 3 KJ submissions, 10 uploaded test files, and the 3 other member accounts. Related test data and old Activity History will also be cleared.</p>
    <p>It will not remove your Founder account, change the website design, or activate Production Mode.</p>
    <div id="a2k-test-reset-status" role="status" aria-live="polite"></div>
    <div class="a2k-reset-actions">
     <button type="button" id="a2k-reset-run">Delete Test Data</button>
     <button type="button" id="a2k-reset-cancel">Cancel</button>
    </div>
   </div>`;
  management.append(overlay);
  const status=overlay.querySelector('#a2k-test-reset-status');
  const run=overlay.querySelector('#a2k-reset-run');
  const cancel=overlay.querySelector('#a2k-reset-cancel');
  let busy=false;
  let previousFocus=null;
  entry.onclick=()=>{
   if(busy)return;
   previousFocus=document.activeElement;
   status.textContent='';
   overlay.hidden=false;
   run.focus();
  };
  cancel.onclick=()=>{
   if(busy)return;
   overlay.hidden=true;
   previousFocus?.focus?.();
  };
  overlay.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();if(!busy)cancel.click()}
  });
  run.onclick=async()=>{
   if(busy)return;
   busy=true;run.disabled=true;cancel.disabled=true;
   status.textContent='Removing test data securely…';
   try{
    if(typeof authClient==='undefined'||!authClient?.functions?.invoke)throw Error('Please sign in to your Founder account again.');
    const {data:sessionData,error:sessionError}=await authClient.auth.getSession();
    if(sessionError||!sessionData?.session?.access_token)throw Error('Your Founder sign-in expired. Sign in again and retry.');
    const {data,error}=await authClient.functions.invoke('a2k-reset-test-data',{
     method:'POST',
     body:{confirmation:'RESET TEST DATA',preserve_founder:true}
    });
    if(error){
     let message=error.message||'The reset could not be completed.';
     try{const details=await error.context?.json();if(details?.error)message=details.error;}catch(_){}
     throw Error(message);
    }
    if(!data?.success||!data?.founder_preserved)throw Error('The reset was not verified. No success was assumed.');
    status.textContent='Reset complete! Founder #000001 preserved. The site will refresh so you can begin adding real venues.';
    run.textContent='Reset Complete';
    setTimeout(()=>window.location.reload(),1800);
   }catch(error){
    status.textContent=error?.message||'Test reset was not completed. Please review the status.';
    run.disabled=false;cancel.disabled=false;
    busy=false;
   }
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();