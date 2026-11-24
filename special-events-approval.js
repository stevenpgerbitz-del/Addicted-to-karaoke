/* A2K special event approvals: integrated in existing Approval Center. */
(function(){
 'use strict';
 let busy=false,root=null,opened=false;
 const el=(tag,cls,text)=>{
   const e=document.createElement(tag);
   if(cls)e.className=cls;
   if(text!==undefined)e.textContent=String(text);
   return e;
 };
 const date=iso=>new Intl.DateTimeFormat('en-US',{
   timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',year:'numeric',
   hour:'numeric',minute:'2-digit'
 }).format(new Date(iso));
 function setup(){
   if(root)return;
   const target=document.getElementById('atk-approval-results');
   if(!target)return;
   root=el('section','a2k-special-approval');
   root.id='a2k-special-event-approvals';
   root.append(el('h3','','Special Karaoke Event Submissions'));
   root.append(el('p','', 'Review one-time events before publishing. Choose a published venue to link each event.'));
   root.append(el('p','a2k-special-approval-count','Checking submissions…'));
   root.append(el('div','a2k-special-approval-list'));
   target.insertAdjacentElement('afterend',root);
 }
 async function render(){
   if(busy)return;
   setup();if(!root||!opened)return;
   if(typeof authClient==='undefined'||!authClient || typeof authUser==='undefined'||!authUser)return;
   busy=true;
   const list=root.querySelector('.a2k-special-approval-list');
   const count=root.querySelector('.a2k-special-approval-count');
   count.textContent='Checking submissions…';
   try{
     const [admin,suggestions,venues]=await Promise.all([
       authClient.rpc('is_platform_admin'),
       authClient.from('karaoke_event_suggestions')
         .select('id,venue_name,city,state,address,title,start_at,end_at,host_name,notes,source_url,created_at')
         .in('status',['submitted','under_review'])
         .order('created_at',{ascending:false}).limit(100),
       authClient.from('venues').select('id,name,city,publication_status')
         .eq('published',true).order('name')
     ]);
     if(admin.error||admin.data!==true){root.hidden=true;return;}
     if(suggestions.error)throw suggestions.error;
     if(venues.error)throw venues.error;
     root.hidden=false;list.replaceChildren();
     const entries=suggestions.data||[];
     count.textContent=entries.length?entries.length+' event'+(entries.length===1?'':'s')+' waiting for approval':'No special event submissions awaiting approval.';
     for(const row of entries){
       const card=el('article','a2k-special-approval-card');
       card.append(el('strong','',row.title));
       card.append(el('p','',row.venue_name+' · '+row.city+', '+(row.state||'IA')));
       card.append(el('p','',date(row.start_at)+' – '+date(row.end_at)));
       if(row.host_name)card.append(el('p','', 'KJ/Host: '+row.host_name));
       if(row.notes)card.append(el('p','',row.notes));
       if(row.source_url){
         const a=el('a','', 'View submitted source');a.href=row.source_url;
         a.target='_blank';a.rel='noopener noreferrer';
         card.append(a);
       }
       const label=el('label','','Link to published venue');
       const select=el('select');
       const placeholder=el('option','','Choose venue');placeholder.value='';select.append(placeholder);
       for(const venue of venues.data||[]){
         const opt=el('option','',venue.name+' · '+venue.city);
         opt.value=venue.id;
         if(venue.name.trim().toLowerCase()===row.venue_name.trim().toLowerCase()
             &&venue.city.trim().toLowerCase()===row.city.trim().toLowerCase())opt.selected=true;
         select.append(opt);
       }
       label.append(select);card.append(label);
       const actions=el('div','a2k-special-approval-buttons');
       const approve=el('button','','Approve');
       const reject=el('button','','Reject');
       approve.type='button';reject.type='button';
       const message=el('p','a2k-special-feedback','');
       const decide=async(decision)=>{
         if(!select.value && decision==='approve'){
           message.textContent='Select a published venue first. Add a new venue in Venue Management if necessary.';
           return;
         }
         if(decision==='reject'&&!window.confirm('Reject this event submission?'))return;
         approve.disabled=true;reject.disabled=true;message.textContent='Saving decision…';
         const saved=await authClient.rpc('founder_decide_special_event',{
           p_suggestion_id:row.id,
           p_venue_id:decision==='approve'?select.value:null,
           p_decision:decision
         });
         if(saved.error){message.textContent=saved.error.message||'Could not save decision.';approve.disabled=false;reject.disabled=false;return;}
         // An approved one-time event is immediately included in Find Karaoke.
         await renderAfterDecision();
       };
       approve.onclick=()=>decide('approve');reject.onclick=()=>decide('reject');
       actions.append(approve,reject);card.append(actions,message);list.append(card);
     }
   }catch(err){
     count.textContent='Could not load special events.';
     console.warn('Special event approvals unavailable',err);
   }finally{busy=false}
 }
 async function renderAfterDecision(){
   if(window.a2kSpecialEvents?.refresh)await window.a2kSpecialEvents.refresh();
   busy=false;await render();
 }
 function init(){
   setup();
   if(typeof window.approvalCenterOpen==='function'){
     const oldOpen=window.approvalCenterOpen;
     window.approvalCenterOpen=function(){
       opened=true;
       const result=oldOpen.apply(this,arguments);
       render();return result;
     };
   }
   if(typeof window.approvalCenterBack==='function'){
     const oldBack=window.approvalCenterBack;
     window.approvalCenterBack=function(){
       opened=false;return oldBack.apply(this,arguments);
     };
   }
   if(typeof window.approvalCenterRefresh==='function'){
     const oldRefresh=window.approvalCenterRefresh;
     window.approvalCenterRefresh=async function(){
       const result=await oldRefresh.apply(this,arguments);
       await render();return result;
     };
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();