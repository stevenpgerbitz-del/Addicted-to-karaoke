/* A2K Build 326 — approved mobile Member Directory + tabbed profile.
   Mobile-only presentation of existing, permission-filtered member content.
   Does not change desktop layout, profile access rules, or badge awards. */
(function(){
  'use strict';
  const MOBILE='(max-width:1023px)';
  const mobile=window.matchMedia(MOBILE);
  const directory=()=>document.getElementById('a2k-d-directory');
  const el=(tag,cls,txt)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=txt;
    return n;
  };

  function decorateDirectory(root){
    const results=root.querySelector('.a2k-d-members-layout:not(.a2k-d-members-profile-layout) .a2k-d-members-main');
    if(!results)return;
    const title=results.querySelector('h1');
    const count=results.querySelector('.a2k-d-members-count');
    if(!title||!count)return;
    let total=title.querySelector('.a2k-d-mobile-member-total');
    if(!total){
      total=el('span','a2k-d-mobile-member-total');
      title.append(total);
    }
    const amount=/^\s*(\d+)/.exec(count.textContent||'');
    const label=amount?amount[1]+' Members':'';
    if(total.textContent!==label)total.textContent=label;
    for(const tile of results.querySelectorAll('.a2k-d-member-tile')){
      const action=tile.querySelector('.a2k-d-directory-action');
      const name=tile.querySelector('h3')?.textContent;
      if(action&&name){
        const label='View '+name+' profile';
        if(action.getAttribute('aria-label')!==label)action.setAttribute('aria-label',label);
      }
    }
  }

  function decorateProfile(root){
    const selected=root.querySelector('.a2k-d-members-profile-layout .a2k-d-selected-member');
    const side=selected?.querySelector('.a2k-d-public-profile-sidebar');
    const rail=selected?.querySelector('.a2k-d-profile-content-rail');
    const main=rail?.querySelector('.a2k-d-public-profile-main');
    const awards=side?.querySelector('.a2k-d-public-profile-awards');
    if(!selected||!side||!main||!awards)return;

    if(!side.querySelector('.a2k-d-mobile-featured-badge')){
      const badge=el('span','a2k-d-mobile-featured-badge');
      badge.setAttribute('aria-label','Founder badge');
      badge.hidden=true;
      const role=side.querySelector('.a2k-d-profile-role');
      if(role)role.after(badge);
    }

    let mobileHeading=awards.querySelector('.a2k-d-mobile-badge-heading');
    if(!mobileHeading){
      mobileHeading=el('div','a2k-d-mobile-badge-heading');
      const title=el('h2','a2k-d-mobile-badge-title','My Badges');
      const expand=el('button','a2k-d-mobile-badge-expand','View All →');
      expand.type='button';
      expand.hidden=true;
      expand.setAttribute('aria-expanded','false');
      expand.onclick=()=>{
        const list=awards.querySelector('.a2k-d-public-badges');
        if(!list)return;
        const expanded=list.classList.toggle('a2k-d-mobile-badges-expanded');
        expand.textContent=expanded?'Show Less ↑':'View All →';
        expand.setAttribute('aria-expanded',String(expanded));
      };
      mobileHeading.append(title,expand);
      awards.insertBefore(mobileHeading,awards.querySelector('.a2k-d-public-badges'));
    }
    const badges=awards.querySelector('.a2k-d-public-badges');
    if(badges){
      const emblems=Array.from(badges.querySelectorAll('.a2k-d-illustrated-badge'));
      const title=mobileHeading.querySelector('.a2k-d-mobile-badge-title');
      const nextTitle='My Badges ('+emblems.length+')';
      if(title.textContent!==nextTitle)title.textContent=nextTitle;
      const expand=mobileHeading.querySelector('button');
      if(expand)expand.hidden=emblems.length<=5;
      const founder=emblems.find(n=>{
        const src=n.querySelector('img')?.getAttribute('src')||'';
        return /\/founder\.png(?:[?#]|$)/.test(src);
      });
      const slot=side.querySelector('.a2k-d-mobile-featured-badge');
      const src=founder?.querySelector('img')?.getAttribute('src');
      if(slot){
        if(src){
          side.classList.add('a2k-d-mobile-has-featured');
          slot.hidden=false;
          if(slot.firstElementChild?.getAttribute('src')!==src){
            const img=el('img');
            img.src=src;
            img.alt='Founder';
            img.decoding='async';
            slot.replaceChildren(img);
          }
        }else{
          side.classList.remove('a2k-d-mobile-has-featured');
          slot.hidden=true;
          if(slot.childNodes.length)slot.replaceChildren();
        }
      }
    }

    let nav=rail.querySelector('.a2k-d-mobile-profile-tabs');
    if(!nav){
      nav=el('nav','a2k-d-mobile-profile-tabs');
      nav.setAttribute('aria-label','Member profile sections');
      const older=rail.querySelector('.a2k-d-profile-tabs');
      if(older)older.after(nav);
      else rail.prepend(nav);
      main.dataset.a2kMobileView='about';
      nav.dataset.selected='about';

      const apply=(target)=>{
        nav.dataset.selected=target;
        main.dataset.a2kMobileView=target;
        for(const button of nav.querySelectorAll('[data-mobile-tab]')){
          button.setAttribute('aria-pressed',String(button.dataset.mobileTab===target));
        }
        if(mobile.matches){
          main.hidden=false;
          const schedule=rail.querySelector('.a2k-d-profile-schedule-pane');
          if(schedule){
            schedule.hidden=target!=='schedule';
            selected.dataset.a2kMobileScheduleUsed='true';
          }
        }
      };
      nav.addEventListener('click',event=>{
        const button=event.target.closest('button[data-mobile-tab]');
        if(!button||!nav.contains(button))return;
        apply(button.dataset.mobileTab);
      });
      const resize=()=>{
        if(!selected.isConnected){
          mobile.removeEventListener?.('change',resize);
          return;
        }
        if(mobile.matches){
          apply(nav.dataset.selected||'about');
        }else if(selected.dataset.a2kMobileScheduleUsed==='true'){
          const schedule=rail.querySelector('.a2k-d-profile-schedule-pane');
          if(schedule)schedule.hidden=true;
          main.hidden=false;
          const oldTabs=rail.querySelectorAll('.a2k-d-profile-tabs [role="tab"]');
          oldTabs.forEach((button,index)=>{
            button.setAttribute('aria-selected',String(index===0));
            button.tabIndex=index===0?0:-1;
          });
          delete selected.dataset.a2kMobileScheduleUsed;
        }
      };
      if(mobile.addEventListener)mobile.addEventListener('change',resize);
      else mobile.addListener(resize);
      nav._a2kApply=apply;
    }

    const definitions=[
      ['about','♙','About',!!main.querySelector('.a2k-d-profile-about')],
      ['songs','♫','Songs',!!main.querySelector('.a2k-d-profile-songs')],
      ['venues','⌖','Venues',!!main.querySelector('.a2k-d-profile-favorite-venues')],
      ['schedule','▦','Schedule',!!rail.querySelector('.a2k-d-profile-schedule-pane')],
      ['reviews','★','Reviews',!!main.querySelector('.a2k-d-profile-kj-reviews')]
    ];
    for(const [code,symbol,label,present] of definitions){
      if(!present||nav.querySelector('[data-mobile-tab="'+code+'"]'))continue;
      const button=el('button','a2k-d-mobile-profile-tab');
      button.type='button';
      button.dataset.mobileTab=code;
      button.setAttribute('aria-pressed','false');
      const icon=el('span','a2k-d-mobile-tab-icon',symbol);
      icon.setAttribute('aria-hidden','true');
      button.append(icon,el('span','',label));
      nav.append(button);
    }
    nav.classList.toggle('a2k-d-mobile-tabs-many',nav.querySelectorAll('button').length>3);
    const current=nav.dataset.selected||'about';
    nav._a2kApply?.(current);
  }

  let scheduled=false;
  function decorate(){
    scheduled=false;
    const root=directory();
    if(!root||root.hidden)return;
    decorateDirectory(root);
    decorateProfile(root);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    window.requestAnimationFrame(decorate);
  }
  function start(){
    const find=document.getElementById('find-screen');
    if(!find)return;
    new MutationObserver(schedule).observe(find,{
      childList:true,subtree:true,characterData:true
    });
    schedule();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else start();
})();