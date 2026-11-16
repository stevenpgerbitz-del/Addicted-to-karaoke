/* A2K Build 242 — member-selected favorite music genres / eras.
   Separate from the Singer / KJ / Venue Owner interests used for navigation.
   Stored in member_profiles.favorite_genres, subject to existing owner-only RLS. */
(function(){
 'use strict';
 const options=['Classic Rock','80s','90s','Rock','Pop','Singalongs','Country','R&B','Hip-Hop','Oldies','Alternative','Metal','Jazz','Blues','Gospel','Indie','Duets','Show Tunes'];
 let saving=false;
 const el=(tag,cls,label)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(label!==undefined)node.textContent=String(label);
  return node;
 };
 const profile=()=>typeof memberProfile==='undefined'?null:memberProfile;
 const client=()=>typeof authClient==='undefined'?null:authClient;
 const user=()=>typeof authUser==='undefined'?null:authUser;
 function ensure(){
  const settingsPanel=document.querySelector('#a2k-profile-settings .a2k-profile-settings-panel');
  const roleChips=document.getElementById('member-about-interests');
  if(!settingsPanel&&!roleChips)return null;
  let block=document.getElementById('a2k-member-favorite-genres');
  if(block)return block;
  block=el('div','a2k-member-genres-block');
  block.id='a2k-member-favorite-genres';
  const heading=el('div','a2k-member-genres-heading');
  heading.append(el('strong','','Favorite Music & Eras'));
  const edit=el('button','profile-section-edit','Edit');
  edit.type='button';edit.id='a2k-member-genres-edit';
  edit.setAttribute('aria-label','Edit favorite music genres and eras');
  heading.append(edit);
  const saved=el('div','a2k-member-genres-chips');
  saved.id='a2k-member-genres-chips';
  saved.setAttribute('aria-label','Favorite music genres and eras');
  const editor=el('div','a2k-member-genres-editor');
  editor.id='a2k-member-genres-editor';editor.hidden=true;
  const choices=el('div','a2k-member-genres-choices');
  choices.id='a2k-member-genres-choices';choices.setAttribute('role','group');
  choices.setAttribute('aria-label','Choose favorite genres and eras');
  const help=el('p','a2k-member-genres-help','Select the music you enjoy singing. Choose up to 16.');
  const actions=el('div','profile-interests-buttons');
  const cancel=el('button','','Cancel');cancel.type='button';
  const save=el('button','','Save Changes');save.type='button';
  save.id='a2k-member-genres-save';
  actions.append(cancel,save);
  editor.append(help,choices,actions);
  const status=el('p','a2k-member-genres-status');
  status.id='a2k-member-genres-status';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  block.append(heading,saved,editor,status);
  // Keep the editable controls in Settings, not in the About Me role picker.
  // On mobile Settings moves into the normal modal without cloning this editor.
  if(settingsPanel){
    const contact=settingsPanel.querySelector('#a2k-contact-settings');
    settingsPanel.insertBefore(block,contact||null);
  }else roleChips.insertAdjacentElement('afterend',block);
  edit.addEventListener('click',()=>{
   if(saving||!profile()||!user()||profile().user_id!==user().id)return;
   const selected=new Set(Array.isArray(profile().favorite_genres)?profile().favorite_genres:[]);
   choices.replaceChildren();
   for(const value of options){
    const tile=el('button','a2k-member-genre-choice',value);
    tile.type='button';tile.dataset.genre=value;
    tile.setAttribute('aria-pressed',String(selected.has(value)));
    tile.addEventListener('click',()=>{
     const on=tile.getAttribute('aria-pressed')==='true';
     if(!on&&choices.querySelectorAll('[aria-pressed="true"]').length>=16){
      status.textContent='Choose up to 16 favorite genres.';return;
     }
     tile.setAttribute('aria-pressed',String(!on));status.textContent='';
    });
    choices.append(tile);
   }
   editor.hidden=false;edit.hidden=true;saved.hidden=true;status.textContent='';
   choices.querySelector('button')?.focus();
  });
  function closeEditor(){
   if(saving)return;
   editor.hidden=true;edit.hidden=false;saved.hidden=false;status.textContent='';
  }
  window.a2kGenresCancel=closeEditor;
  cancel.addEventListener('click',closeEditor);
  save.addEventListener('click',async()=>{
   if(saving||!client()||!user()||!profile()||profile().user_id!==user().id)return;
   const ownerId=user().id;
   const genres=Array.from(choices.querySelectorAll('[aria-pressed="true"]'))
    .map(tile=>tile.dataset.genre).filter(x=>options.includes(x)).slice(0,16);
   saving=true;save.disabled=true;cancel.disabled=true;status.textContent='Saving favorite genres…';
   try{
    const {data,error}=await client().from('member_profiles').update({favorite_genres:genres})
     .eq('user_id',ownerId).select('favorite_genres').single();
    if(error)throw error;
    if(user()?.id!==ownerId)return;
    profile().favorite_genres=Array.isArray(data?.favorite_genres)?data.favorite_genres:[];
    editor.hidden=true;edit.hidden=false;saved.hidden=false;
    render();
    status.textContent='Favorite genres saved.';
   }catch(error){
    status.textContent='Could not save favorite genres: '+(error?.message||'Please try again.');
   }finally{saving=false;save.disabled=false;cancel.disabled=false;}
  });
  return block;
 }
 function render(){
  const block=ensure();if(!block)return;
  const saved=document.getElementById('a2k-member-genres-chips');
  const genres=Array.isArray(profile()?.favorite_genres)?profile().favorite_genres.filter(x=>options.includes(x)):[];
  saved.replaceChildren();
  if(genres.length){
   for(const name of genres)saved.append(el('span','a2k-member-genre-chip',name));
  }else saved.append(el('span','a2k-member-genres-empty','No favorite genres selected yet.'));
  block.hidden=!(profile()&&user()&&profile().user_id===user().id);
 }
 window.a2kGenresRender=render;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
 else render();
})();
