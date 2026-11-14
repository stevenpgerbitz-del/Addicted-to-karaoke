/* A2K Find Karaoke live theme comparison.
   Only changes presentation. Existing real venue data, filters, navigation and
   per-venue actions remain the same for Current and Vintage. */
(function(){
 'use strict';
 function selectStyle(style){
  const root=document.getElementById('find-screen');
  if(!root)return;
  const vintage=style==='vintage';
  root.classList.toggle('atk-vintage',vintage);
  root.dataset.findStyle=vintage?'vintage':'current';
  const switcher=root.querySelector('.atk-find-style-switch');
  if(switcher){
   switcher.querySelectorAll('button[data-find-style]').forEach(btn=>{
    const on=btn.dataset.findStyle===(vintage?'vintage':'current');
    btn.setAttribute('aria-pressed',String(on));
   });
  }
 }
 window.atkFindPreviewStyle=selectStyle;
 // Original design remains the default when the user first opens Find Karaoke.
 if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>selectStyle('current'),{once:true});
 }else{
  selectStyle('current');
 }
})();