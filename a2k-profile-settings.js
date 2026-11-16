/* A2K 222: profile organization — plain interests, separate awards, real settings panel. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,label)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=String(label);return n};
let settingsPanel=null,contactLoaded=false,contactRecord=null,original={},editing={},contactBusy=false,contactUser=null,profileHooked=false;
const signedIn=()=>typeof authClient!=='undefined'&&typeof authUser!=='undefined'&&
  typeof memberProfile!=='undefined'&&authUser?.id&&memberProfile?.user_id===authUser.id;
function detailsCard(id,label,description){
 const d=el('details','profile-nav-card a2k-settings-nav');d.id=id;
 const s=el('summary');s.innerHTML='<span class="profile-nav-title"></span><small></small>';
 s.querySelector('.profile-nav-title').textContent=label;
 s.querySelector('small').textContent=description;
 d.append(s);return {details:d,summary:s};
}
function setup(){
 const about=$('atk-about-profile-entry'),profile=$('auth-profile');
 const badges=profile?.querySelector('.profile-about-awards'),privacy=profile?.querySelector('.profile-about-privacy');
 if(!about||!profile||!badges||!privacy||$('a2k-profile-settings'))return;
 const awardCard=detailsCard('a2k-profile-awards','🏅 Awards & Achievements','Your illustrated badges and earned awards');
 const awardPanel=el('div','member-panel member-about a2k-profile-awards-panel');
 awardPanel.append(badges);awardCard.details.append(awardPanel);
 awardCard.summary.onclick=event=>typeof profileSectionTap==='function'?profileSectionTap(event,awardCard.summary):true;
 const settingsCard=detailsCard('a2k-profile-settings','⚙ Settings','Privacy, contact visibility and notifications');
 settingsPanel=el('div','member-panel member-about a2k-profile-settings-panel');
 privacy.classList.add('a2k-settings-privacy');
 settingsPanel.append(privacy);
 const contact=el('section','a2k-contact-settings');
 contact.id='a2k-contact-settings';
 contact.innerHTML='<div class="profile-section-top"><strong>Contact Visibility</strong></div><p class="a2k-settings-explain">Choose which KJ or Venue Owner contact details may be shown after verification. Your private details stay protected until public display is approved.</p><div id="a2k-contact-settings-fields"></div><p id="a2k-contact-settings-status" role="status" aria-live="polite"></p><div class="a2k-settings-actions" id="a2k-contact-settings-actions" hidden><button type="button" id="a2k-contact-settings-cancel">Cancel</button><button type="button" id="a2k-contact-settings-save">Save Changes</button></div>';
 settingsPanel.append(contact);
 const notices=el('section','a2k-notification-settings');
 notices.innerHTML='<div class="profile-section-top"><strong>Notifications</strong></div><p class="a2k-settings-explain">Notification preferences are planned for upcoming karaoke events, favorite venues, hosting requests and account updates.</p><p class="a2k-settings-not-active">Push notifications are not yet enabled. Notification switches will appear here when delivery is supported and tested.</p>';
 settingsPanel.append(notices);
 settingsCard.details.append(settingsPanel);
 settingsCard.summary.onclick=event=>{
  void loadContacts();
  return typeof profileSectionTap==='function'?profileSectionTap(event,settingsCard.summary):true;
 };
 settingsCard.details.addEventListener('toggle',()=>{if(settingsCard.details.open)void loadContacts()});
 about.insertAdjacentElement('afterend',awardCard.details);
 awardCard.details.insertAdjacentElement('afterend',settingsCard.details);
 $('a2k-contact-settings-cancel').onclick=()=>{editing={...original};renderContacts();};
 $('a2k-contact-settings-save').onclick=()=>void saveContacts();
}
function phoneFormat(text){
 let digits=String(text||'').replace(/\D/g,'');
 if(digits.length===11&&digits[0]==='1')digits=digits.slice(1);
 digits=digits.slice(0,10);
 if(!digits)return '';
 if(digits.length<4)return '('+digits;
 if(digits.length<7)return '('+digits.slice(0,3)+') '+digits.slice(3);
 return '('+digits.slice(0,3)+') '+digits.slice(3,6)+'-'+digits.slice(6);
}
function fromRecord(record){
 const r=record||{};
 return {
  kj_email:r.kj_email||'',kj_phone:phoneFormat(r.kj_phone||''),
  kj_show_email:!!r.kj_show_email,kj_show_phone:!!r.kj_show_phone,
  venue_email:r.venue_email||'',venue_phone:phoneFormat(r.venue_phone||''),
  venue_show_email:!!r.venue_show_email,venue_show_phone:!!r.venue_show_phone
 };
}
function roles(){
 const v=typeof memberProfile!=='undefined'&&memberProfile?memberProfile.karaoke_interests:[];
 return new Set(Array.isArray(v)?v:[]);
}
function changeStatus(str){const status=$('a2k-contact-settings-status');if(status)status.textContent=str;}
async function loadContacts(){
 if(!signedIn()||!settingsPanel)return;
 const uid=authUser.id;contactUser=uid;contactLoaded=false;changeStatus('Loading contact preferences…');
 const {data,error}=await authClient.from('member_setup_details')
  .select('kj_email,kj_phone,kj_show_email,kj_show_phone,venue_email,venue_phone,venue_show_email,venue_show_phone')
  .eq('user_id',uid).maybeSingle();
 if(uid!==contactUser||!signedIn()||authUser.id!==uid)return;
 if(error){changeStatus('Could not load settings: '+(error.message||'Please try again.'));return;}
 contactRecord=data;original=fromRecord(data);editing={...original};contactLoaded=true;
 changeStatus('');renderContacts();
}
function contactGroup(container,title,prefix){
 const block=el('div','a2k-settings-contact-group');
 block.append(el('h3','',title));
 const email=prefix+'_email',phone=prefix+'_phone',showEmail=prefix+'_show_email',showPhone=prefix+'_show_phone';
 for(const [label,key,type] of [['Contact email',email,'email'],['Contact phone',phone,'tel']]){
  const field=el('label','a2k-settings-field');
  field.append(el('strong','',label));
  const input=el('input');input.type=type;input.value=editing[key]||'';
  input.placeholder=type==='tel'?'(515) 222-2222':'you@example.com';
  input.autocomplete='off';input.maxLength=type==='tel'?14:254;
  if(type==='tel')input.inputMode='tel';
  input.oninput=()=>{let val=input.value;if(type==='tel'){val=phoneFormat(val);input.value=val;}editing[key]=val};
  field.append(input);block.append(field);
 }
 block.append(el('p','a2k-settings-helper','Allow public display after your profile/contact information is approved:'));
 const tiles=el('div','a2k-settings-tile-grid');
 for(const [key,label,symbol] of [[showEmail,'Show my email','✉'],[showPhone,'Show my phone','☎']]){
  const button=el('button','a2k-settings-tile');button.type='button';button.setAttribute('aria-pressed',String(!!editing[key]));
  button.append(el('span','a2k-settings-tile-symbol',symbol),el('strong','',label));
  button.onclick=()=>{editing[key]=!editing[key];button.setAttribute('aria-pressed',String(editing[key]))};
  tiles.append(button);
 }
 block.append(tiles);container.append(block);
}
function renderContacts(){
 const dest=$('a2k-contact-settings-fields'),actions=$('a2k-contact-settings-actions');
 if(!dest||!actions||!contactLoaded)return;
 dest.replaceChildren();const selected=roles();
 const any=selected.has('kj')||selected.has('venue_owner');
 actions.hidden=!any;
 if(selected.has('kj'))contactGroup(dest,'KJ / Host Contact','kj');
 if(selected.has('venue_owner'))contactGroup(dest,'Venue Owner Contact','venue');
 if(!any)dest.append(el('p','a2k-settings-explain','Contact visibility is available when you select KJ / Host or Venue Owner in My Karaoke Interests. Your sign-in email is never automatically published.'));
}
async function saveContacts(){
 if(!contactLoaded||!signedIn()||contactBusy)return;
 const uid=authUser.id;const active=roles();
 const payload={updated_at:new Date().toISOString()};
 for(const kind of ['kj','venue']){
  const enabled=kind==='kj'?active.has('kj'):active.has('venue_owner');
  if(!enabled)continue;
  const email=(editing[kind+'_email']||'').trim(),phone=(editing[kind+'_phone']||'').trim();
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){changeStatus('Please enter a valid contact email.');return;}
  if(phone&&phone.replace(/\D/g,'').length!==10){changeStatus('Please enter a 10-digit US phone number.');return;}
  payload[kind+'_email']=email;payload[kind+'_phone']=phone;
  payload[kind+'_show_email']=!!editing[kind+'_show_email']&&!!email;
  payload[kind+'_show_phone']=!!editing[kind+'_show_phone']&&!!phone;
 }
 contactBusy=true;const b=$('a2k-contact-settings-save');if(b)b.disabled=true;
 changeStatus('Saving contact preferences…');
 try{
  const query=contactRecord?
   authClient.from('member_setup_details').update(payload).eq('user_id',uid):
   authClient.from('member_setup_details').insert({user_id:uid,...payload});
  const {error}=await query;
  if(error)throw error;
  if(!signedIn()||authUser.id!==uid)return;
  contactRecord={...(contactRecord||{}),...payload};
  original=fromRecord(contactRecord);editing={...original};
  renderContacts();
  changeStatus('Contact preferences saved. Public contact display still requires the appropriate verification.');
 }catch(e){changeStatus('Could not save contact preferences: '+(e.message||'Please retry.'))}
 finally{contactBusy=false;if(b)b.disabled=false;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
})();
