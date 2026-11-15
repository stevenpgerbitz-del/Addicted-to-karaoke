/* A2K v183 — public venue suggestion form.
   Any visitor may submit. Only Founder can review; nothing is auto-published. */
(function(){
 'use strict';
 const byId=(id)=>document.getElementById(id);
 let busy=false,openedAt=0;
 function setStatus(message,error){
  const e=byId('atk-suggest-venue-status');
  if(!e)return;
  e.textContent=message||'';
  e.dataset.error=String(!!error);
 }
 function open(){
  const dialog=byId('atk-suggest-venue-dialog');
  if(!dialog)return;
  if(dialog.open)return;
  byId('atk-suggest-venue-form').reset();
  setStatus('',false);
  openedAt=Date.now();
  dialog.showModal();
  byId('atk-suggest-name')?.focus();
 }
 function close(){
  if(busy)return;
  const dialog=byId('atk-suggest-venue-dialog');
  if(dialog?.open)dialog.close();
 }
 function read(id){return String(byId(id)?.value||'').trim()}
 async function submit(event){
  event.preventDefault();
  if(busy)return;
  const name=read('atk-suggest-name'),city=read('atk-suggest-city'),
   state=read('atk-suggest-state').toUpperCase(),
   address=read('atk-suggest-address'),
   zip=read('atk-suggest-zip'),
   details=read('atk-suggest-details');
  if(read('atk-suggest-website')){setStatus('Thanks for helping the karaoke community!',false);return}
  if(name.length<3||name.length>120||city.length<2||city.length>90||
     !/^[A-Z]{2}$/.test(state)||address.length>180||
     (zip&&!/^\d{5}(?:-\d{4})?$/.test(zip))||details.length>800){
   setStatus('Please check the venue name, city, state, and ZIP code.',true);return;
  }
  if(Date.now()-openedAt<1500){
   setStatus('Please check the venue details before submitting.',true);return;
  }
  busy=true;
  const btn=byId('atk-suggest-venue-submit');
  if(btn)btn.disabled=true;
  setStatus('Submitting your venue suggestion…',false);
  try{
   const payload={
    name,city,state,
    address_line1:address||null,
    postal_code:zip||null,
    karaoke_details:details||null
   };
   // Supabase JS is initialized for both guests and signed-in visitors.
   // If the auth script is unavailable, use the existing publishable-key REST endpoint.
   if(typeof authClient!=='undefined'&&authClient){
    const {error}=await authClient.from('venue_suggestions').insert(payload);
    if(error)throw error;
   }else{
    const response=await fetch(SUPABASE_URL+'/rest/v1/venue_suggestions',{
     method:'POST',
     headers:{
      apikey:SUPABASE_PUBLISHABLE_KEY,
      Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,
      'Content-Type':'application/json',Prefer:'return=minimal'
     },
     body:JSON.stringify(payload)
    });
    if(!response.ok)throw Error('Submission unavailable ('+response.status+').');
   }
   byId('atk-suggest-venue-form').reset();
   setStatus('Thank you! Your venue was submitted for review. It will not appear publicly until approved.',false);
   const form=byId('atk-suggest-venue-form');
   form?.querySelectorAll('input:not([type="hidden"]),textarea').forEach(x=>x.disabled=true);
   if(btn){btn.textContent='Submitted ✓';btn.disabled=true;}
  }catch(error){
   const message=String(error?.message||'');
   const duplicate=/duplicate|unique|23505|already exists/i.test(message);
   setStatus(duplicate?
    'This venue may already be in our submission queue. Thank you for checking!':
    'We could not submit the venue. Please retry in a moment.',true);
  }finally{
   busy=false;
   if(btn&&btn.textContent!=='Submitted ✓')btn.disabled=false;
  }
 }
 function setup(){
  const openBtn=byId('atk-suggest-venue-entry');
  const form=byId('atk-suggest-venue-form');
  const cancel=byId('atk-suggest-venue-cancel');
  if(!openBtn||!form||!cancel)return;
  openBtn.addEventListener('click',()=>{
   form.querySelectorAll('input,textarea').forEach(x=>x.disabled=false);
   byId('atk-suggest-venue-submit').textContent='Submit Venue';
   byId('atk-suggest-venue-submit').disabled=false;
   open();
  });
  cancel.addEventListener('click',close);
  form.addEventListener('submit',submit);
  byId('atk-suggest-venue-dialog')?.addEventListener('cancel',(e)=>{
   if(busy)e.preventDefault();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();