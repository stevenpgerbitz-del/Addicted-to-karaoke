/* A2K Founder Badge Management — threshold editing without artwork changes. */
(function(){
'use strict';
const groups=[
['Song List','♫',[['song_1','First Pick'],['song_25','Song Collector'],['song_75','Music Enthusiast'],['song_100','Songbook Legend']]],
['Favorite Venues','♥',[['favorite_1','Favorite Finder'],['favorite_5','Favorite Explorer'],['favorite_10','Favorite Enthusiast'],['favorite_25','Favorite Superfan']]],
['Reviews','★',[['review_1','Review Rookie'],['review_25','Review Contributor'],['review_75','Review Expert'],['review_100','Review Master']]],
['Venue Contributions','⌖',[['venue_1','Karaoke Scout'],['venue_10','Karaoke Discoverer'],['venue_25','Karaoke Pathfinder'],['venue_100','Karaoke Pioneer']]]];
const $=id=>document.getElementById(id);
const node=(tag,cl,t)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(t!==undefined)e.textContent=t;return e};
let rules=new Map(),choice=null,busy=false;
const css='\
#abm-dialog{width:min(95vw,720px);max-height:92dvh;overflow:auto;border:2px solid #be925c;border-radius:15px;padding:0;background:#281317;color:#fff0db;box-shadow:0 12px 70px #000b}\
#abm-dialog::backdrop{background:#000b}\
#abm-dialog .abm-head{padding:18px;background:#531f27;text-align:center;border-bottom:1px solid #b89064}\
#abm-dialog h2{margin:0;color:#f4d5a6;font:700 27px Georgia,serif}\
#abm-dialog .abm-body{padding:15px;display:grid;gap:13px}\
#abm-dialog .abm-group{border:1px solid #865947;border-radius:10px;overflow:hidden;background:#371c20}\
#abm-dialog h3{margin:0;padding:12px 14px;font:700 17px Georgia,serif;color:#eac98b;background:#4b252a;border-bottom:1px solid #805642}\
#abm-dialog .abm-row{display:flex;align-items:center;gap:9px;padding:9px 12px;border-bottom:1px solid #65413d}\
#abm-dialog .abm-row:last-child{border-bottom:0}\
#abm-dialog .abm-symbol{font-size:22px;color:#f2c77f;width:29px}\
#abm-dialog .abm-name{flex:1;font-weight:bold;min-width:0;font-size:13px}\
#abm-dialog .abm-name small{display:block;margin-top:2px;font-size:11px;font-weight:normal;color:#d7baab}\
#abm-dialog input{width:78px;border:1px solid #bb8a55;border-radius:7px;background:#1b1012;padding:9px 3px;color:#fff;text-align:center}\
#abm-dialog button{border:1px solid #b88a62;border-radius:8px;padding:10px 12px;background:#932a30;color:#fff2de;font-weight:bold;cursor:pointer}\
#abm-dialog button:disabled{opacity:.45;cursor:default}\
#abm-dialog .abm-bottom{padding:5px 16px 17px;text-align:right}\
#abm-dialog .abm-preview{margin:4px 15px 12px;padding:14px;border:1px solid #c29b66;border-radius:10px;background:#4c2429}\
#abm-dialog .abm-preview p{line-height:1.5;font-size:13px}\
#abm-dialog .abm-status{margin:5px 15px;font-size:13px;color:#f4d1a4;min-height:20px}\
#abm-dialog .abm-footnote{font-size:12px;line-height:1.5;color:#d5b3a0;margin:0}\
@media(max-width:500px){#abm-dialog .abm-row{gap:5px;padding:9px 7px}#abm-dialog input{width:60px}#abm-dialog .abm-row button{font-size:11px;padding:9px 7px}}';
function ensure(){
 if($('abm-dialog'))return $('abm-dialog');
 const st=node('style');st.textContent=css;document.head.append(st);
 const d=node('dialog');d.id='abm-dialog';d.setAttribute('aria-label','Badge Management');
 const h=node('div','abm-head');h.append(node('h2','','Badge Management'),node('p','','Addicted to Karaoke · Founder-only achievement requirements'));
 const body=node('div','abm-body');body.id='abm-body';
 body.append(node('p','abm-footnote','Preview each change before saving. Existing awards are protected when requirements rise. New artwork and renamed badge labels are still awaiting approval; Favorite Venue awards remain inactive.'));
 const preview=node('section','abm-preview');preview.id='abm-preview';preview.hidden=true;
 const status=node('p','abm-status');status.id='abm-status';status.setAttribute('role','status');
 const foot=node('div','abm-bottom'),close=node('button','','Close');close.type='button';close.onclick=()=>d.close();foot.append(close);
 d.append(h,body,preview,status,foot);
 d.addEventListener('close',()=>{choice=null;preview.hidden=true;status.textContent=''});
 document.body.append(d);return d;
}
async function reload(){
 const body=$('abm-body'),status=$('abm-status');body.querySelectorAll('.abm-group').forEach(e=>e.remove());
 status.textContent='Loading badge requirements…';
 const {data,error}=await authClient.from('a2k_badge_rules').select('badge_code,threshold,enabled');
 if(error){status.textContent=error.message;return}
 rules=new Map((data||[]).map(r=>[r.badge_code,r]));
 groups.forEach(([title,symbol,items])=>{
  const group=node('section','abm-group');group.append(node('h3','',symbol+' '+title));
  items.forEach(([code,name])=>{
   const r=rules.get(code),row=node('div','abm-row');row.append(node('span','abm-symbol',symbol));
   const t=node('div','abm-name',name);t.append(node('small','',r?(r.enabled?r.threshold+' required':'Artwork pending · '+r.threshold+' planned'):'Not available'));row.append(t);
   const input=node('input');input.type='number';input.min='1';input.max='1000000';input.value=r?String(r.threshold):'';input.disabled=!r;input.setAttribute('aria-label',name+' requirement');
   const btn=node('button','','Review');btn.type='button';btn.disabled=!r;btn.onclick=()=>review(code,name,input.value);row.append(input,btn);group.append(row);
  });body.append(group);
 });
 status.textContent='Choose a requirement to review and change.';
}
async function review(code,name,raw){
 if(busy)return;
 const r=rules.get(code),value=Number(raw),preview=$('abm-preview'),status=$('abm-status');preview.hidden=true;
 if(!r||!Number.isSafeInteger(value)||value<1||value>1000000){status.textContent='Enter a whole number from 1 to 1,000,000.';return}
 if(value===r.threshold){status.textContent='No change to review.';return}
 busy=true;status.textContent='Calculating change preview…';
 try{
  const {data,error}=await authClient.rpc('founder_badge_rules_preview',{p_code:code,p_threshold:value});if(error)throw error;
  choice={code,name,value,old:r.threshold};preview.replaceChildren();
  preview.append(node('h3','','Review Requirement Change'),node('p','',name+': '+r.threshold+' → '+value),
   node('p','',!r.enabled?'Artwork pending: the requirement will be saved, but awards remain inactive.':
    value>r.threshold?'Members who already earned this badge keep it. New awards use the higher requirement.':
    'About '+data.new_awards_estimate+' additional members may qualify immediately.'));
  const buttons=node('div');buttons.style.cssText='display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap';
  const cancel=node('button','','Cancel');cancel.onclick=()=>{choice=null;preview.hidden=true;status.textContent='Canceled.'};
  const save=node('button','','Save Requirement');save.onclick=saveChoice;buttons.append(cancel,save);preview.append(buttons);preview.hidden=false;
  status.textContent='Confirm this change or cancel.';
 }catch(e){status.textContent='Could not preview: '+(e.message||'Unknown error')}
 finally{busy=false}
}
async function saveChoice(){
 if(!choice||busy)return;const current=choice;busy=true;$('abm-status').textContent='Saving…';$('abm-preview').querySelectorAll('button').forEach(b=>b.disabled=true);
 try{
  const {error}=await authClient.rpc('founder_badge_rule_update',{p_code:current.code,p_threshold:current.value});if(error)throw error;
  choice=null;$('abm-preview').hidden=true;await reload();
  $('abm-status').textContent=current.name+' saved at '+current.value+'. Change recorded in Activity History.';
 }catch(e){$('abm-status').textContent='Save failed: '+(e.message||'Try again');$('abm-preview').querySelectorAll('button').forEach(b=>b.disabled=false)}
 finally{busy=false}
}
async function open(){
 if(!authClient||!authUser)return;
 const {data,error}=await authClient.rpc('is_platform_founder');if(error||data!==true){alert('Founder authorization required.');return}
 const d=ensure();if(!d.open)d.showModal();await reload();
}
function init(){
 const tools=document.querySelector('#management-dialog > .management-tools');if(!tools||$('abm-launch'))return;
 const b=node('button','management-entry','✦ Badge Management');b.id='abm-launch';b.type='button';b.append(node('small','','Edit achievements and review requirement changes'));b.onclick=open;
 const before=[...tools.children].find(x=>x.textContent.includes('System Maintenance'));if(before)tools.insertBefore(b,before);else tools.append(b);
}
window.a2kBadgeManagementOpen=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();