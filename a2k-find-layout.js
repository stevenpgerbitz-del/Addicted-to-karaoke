/* A2K Find Karaoke — personal desktop venue layout, Build 237. */
(function(){
  'use strict';
  function init(){
    const screen=document.getElementById('find-screen');
    const results=document.getElementById('find-results');
    const count=document.getElementById('results-count');
    const profile=document.getElementById('auth-profile');
    if(!screen||!results||!count||document.getElementById('a2k-find-layout-bar'))return;
    const row=document.createElement('div');
    row.id='a2k-find-layout-bar';
    row.className='a2k-find-layout-bar';
    const choices=document.createElement('div');
    choices.className='a2k-find-layout-choices';
    choices.setAttribute('role','group');
    choices.setAttribute('aria-label','Venue cards per row');
    const heading=document.createElement('span');
    heading.className='a2k-find-layout-label';
    heading.textContent='View:';
    choices.append(heading);
    const buttons={};
    for(const cols of ['2','3']){
      const button=document.createElement('button');
      button.type='button';
      button.className='a2k-find-layout-button';
      button.dataset.columns=cols;
      button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-label',cols+' venues per row');
      button.title=cols+' across';
      const columns=document.createElement('span');
      columns.className='a2k-find-layout-icon';
      columns.setAttribute('aria-hidden','true');
      for(let i=0;i<Number(cols);i++)columns.append(document.createElement('i'));
      const label=document.createElement('span');
      label.textContent=cols+' across';
      button.append(columns,label);
      choices.append(button);
      buttons[cols]=button;
    }
    count.before(row);
    row.append(count,choices);
    // Keep submission available without using an oversized full-width banner.
    const submit=document.getElementById('a2k-community-submit-entry');
    if(submit)row.append(submit);
    const userKey=()=>{
      try{
        return (typeof authUser!=='undefined'&&authUser?.id)?authUser.id:'guest';
      }catch(e){return 'guest'}
    };
    const key=()=> 'a2k_find_columns_v1_'+userKey();
    let selected='2';
    function draw(){
      screen.dataset.venueLayout=selected;
      for(const cols of ['2','3']){
        buttons[cols].setAttribute('aria-pressed',String(selected===cols));
      }
    }
    function restore(){
      let saved=null;
      try{saved=localStorage.getItem(key())}catch(e){}
      selected=saved==='3'?'3':'2';
      draw();
    }
    for(const cols of ['2','3']){
      buttons[cols].addEventListener('click',()=>{
        selected=cols;
        try{localStorage.setItem(key(),cols)}catch(e){}
        draw();
      });
    }
    let activeUser=userKey();
    restore();
    // Re-read the preference when this browser switches between accounts.
    function syncAccount(){
      const next=userKey();
      if(next!==activeUser){activeUser=next;restore()}
    }
    if(profile)new MutationObserver(syncAccount).observe(profile,{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('visibilitychange',syncAccount);
    window.addEventListener('pageshow',syncAccount);
    window.addEventListener('storage',event=>{if(event.key===key())restore()});
    // Auth state updates can occur without a profile hidden change.
    if(typeof authClient!=='undefined'&&authClient?.auth?.onAuthStateChange){
      authClient.auth.onAuthStateChange(()=>queueMicrotask(syncAccount));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();