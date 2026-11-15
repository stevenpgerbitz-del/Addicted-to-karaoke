/* A2K build 213 — desktop shell, with tablet-friendly pointer detection.
   Uses the existing A2K screens, authentication, listings and handlers.
   The approved phone/tablet UI remains unchanged below 1024 CSS pixels. */
(function(){
 'use strict';
 const breakpoint=window.matchMedia('(min-width:1024px)');
 const mouseInput=window.matchMedia('(hover: hover) and (pointer: fine)');
 const explicitPreview=new URLSearchParams(location.search).has('a2k_desktop_preview');
 const iconPaths={
   home:'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z',
   find:'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z',
   profile:'M4 21c0-5 3.5-8 8-8s8 3 8 8'
 };
 let mounted=false;
 let tonightObserver=null;
 function el(tag,cls,text){
   const node=document.createElement(tag);
   if(cls)node.className=cls;
   if(text!==undefined)node.textContent=String(text);
   return node;
 }
 function icon(kind){
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');
   svg.setAttribute('aria-hidden','true');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',iconPaths[kind]);
   svg.append(path);
   if(kind==='find'){
     const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
     ring.setAttribute('cx','12');ring.setAttribute('cy','10');ring.setAttribute('r','2.5');
     svg.append(ring);
   }
   if(kind==='profile'){
     const head=document.createElementNS('http://www.w3.org/2000/svg','circle');
     head.setAttribute('cx','12');head.setAttribute('cy','8');head.setAttribute('r','4');
     svg.append(head);
   }
   return svg;
 }
 function page(){
   const current=document.querySelector('#unified-nav button.active');
   const active=current?.getAttribute('data-page');
   if(active)return active;
   const hash=(location.hash||'#home').slice(1).split('/')[0];
   return hash==='venue'?'find':(['home','find','signin'].includes(hash)?hash:'home');
 }
 function activeMenu(){
   const which=page();
   document.querySelectorAll('#a2k-desktop-sidebar .a2k-d-nav-btn').forEach(button=>{
     if(button.dataset.page===which)button.setAttribute('aria-current','page');
     else button.removeAttribute('aria-current');
   });
 }
 function go(pageName){
   if(typeof window.navigate==='function')window.navigate(pageName);
   else window.location.hash='#'+pageName;
   activeMenu();
 }
 function makeDesktopHeader(app){
   const hero=el('div','a2k-desktop-header');
   hero.id='a2k-desktop-header';
   hero.setAttribute('role','banner');
   const brand=el('button','a2k-desktop-brand');
   brand.type='button';brand.setAttribute('aria-label','A2K Home');
   brand.addEventListener('click',()=>go('home'));
   const approved=document.querySelector('#home-screen .a2k-b-hero .approved-logo');
   if(approved){
     const image=el('img');
     image.alt='Addicted to Karaoke — Built for singers, powered by KJs, and bringing the karaoke community together';
     image.src=approved.src;
     brand.append(image);
   }else brand.textContent='Addicted to Karaoke';
   hero.append(brand);
   const member=el('div','a2k-desktop-member');
   const memberButton=el('button','','Profile / Sign In');
   memberButton.type='button';
   memberButton.addEventListener('click',()=>go('signin'));
   member.append(memberButton);
   hero.append(member);
   app.insertAdjacentElement('afterbegin',hero);
 }
 function makeSidebar(app){
   const sidebar=el('aside','a2k-desktop-sidebar');
   sidebar.id='a2k-desktop-sidebar';
   sidebar.setAttribute('aria-label','Desktop navigation');
   sidebar.append(el('p','a2k-d-nav-caption','Explore A2K'));
   const items=[['home','Home'],['find','Find Karaoke'],['signin','Profile']];
   for(const [key,label] of items){
     const button=el('button','a2k-d-nav-btn');
     button.type='button';button.dataset.page=key;
     button.append(icon(key==='signin'?'profile':key),document.createTextNode(label));
     button.addEventListener('click',()=>go(key));
     sidebar.append(button);
   }
   sidebar.append(el('p','a2k-d-nav-note','The same venue listings, host profiles, and reviews as our mobile website.'));
   const pages=document.getElementById('unified-pages');
   app.insertBefore(sidebar,pages);
   activeMenu();
   const existingNav=document.getElementById('unified-nav');
   if(existingNav){
     const navObserver=new MutationObserver(activeMenu);
     navObserver.observe(existingNav,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
   }
   window.addEventListener('hashchange',activeMenu);
 }
 function makeUpcoming(){
   const home=document.querySelector('#home-screen .a2k-b-home');
   if(!home||document.getElementById('a2k-desktop-upcoming'))return;
   const panel=el('section','a2k-desktop-upcoming');
   panel.id='a2k-desktop-upcoming';
   panel.setAttribute('aria-labelledby','a2k-d-upcoming-title');
   const row=el('div','a2k-d-upcoming-heading');
   const title=el('h2','','Karaoke Tonight');
   title.id='a2k-d-upcoming-title';
   const viewAll=el('button','a2k-d-view-all','View All ›');
   viewAll.type='button';viewAll.onclick=()=>go('find');
   row.append(title,viewAll);
   const list=el('div','a2k-d-upcoming-list');
   list.setAttribute('aria-live','polite');
   panel.append(row,list);
   home.append(panel);
   const original=document.getElementById('a2k-b-tonight');
   function refresh(){
     if(!original||!list.isConnected)return;
     list.replaceChildren();
     const sources=[...original.querySelectorAll(':scope > button')].slice(0,2);
     if(!sources.length){
       list.append(el('p','a2k-d-upcoming-empty','Published karaoke nights will appear here when available.'));
       return;
     }
     for(const source of sources){
       const button=el('button','a2k-d-upcoming-item');
       button.type='button';
       const photo=source.querySelector('img');
       if(photo){
         const img=el('img');
         img.src=photo.currentSrc||photo.src;
         img.alt=photo.alt||'Venue photo';
         img.loading='lazy';
         button.append(img);
       }else{
         const fallback=el('div','','🎤');
         fallback.style.cssText='width:88px;min-height:80px;display:grid;place-items:center;font-size:28px';
         button.append(fallback);
       }
       const copy=el('span','a2k-d-upcoming-copy');
       const name=source.querySelector('.a2k-b-tonight-body strong')?.textContent||'Browse venues';
       copy.append(el('strong','',name));
       const details=[...source.querySelectorAll('.a2k-b-tonight-body small')].slice(0,2);
       for(const small of details)copy.append(el('small','',small.textContent));
       button.append(copy);
       button.setAttribute('aria-label','Open '+name);
       button.onclick=()=>source.click();
       list.append(button);
     }
   }
   refresh();
   if(original){
     tonightObserver=new MutationObserver(refresh);
     tonightObserver.observe(original,{childList:true,subtree:true,characterData:true});
   }
 }
 function switchLayout(){
   document.documentElement.classList.toggle('a2k-desktop-live',breakpoint.matches&&(mouseInput.matches||explicitPreview));
 }
 function init(){
   if(mounted)return;
   const app=document.querySelector('.app');
   const pages=document.getElementById('unified-pages');
   if(!app||!pages)return;
   mounted=true;
   makeDesktopHeader(app);
   makeSidebar(app);
   makeUpcoming();
   switchLayout();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 if(typeof breakpoint.addEventListener==='function')breakpoint.addEventListener('change',switchLayout);
 else if(typeof breakpoint.addListener==='function')breakpoint.addListener(switchLayout);
 if(typeof mouseInput.addEventListener==='function')mouseInput.addEventListener('change',switchLayout);
 else if(typeof mouseInput.addListener==='function')mouseInput.addListener(switchLayout);
})();