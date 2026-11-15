/* A2K 198 — upcoming one-time karaoke events, integrated with Find Karaoke */
(function () {
  'use strict';
  const TIME_ZONE='America/Chicago';
  let rows=[], mode='all', loaded=false, detailsDialog=null, submitDialog=null, busy=false;
  const byId=id=>document.getElementById(id);
  const node=(tag,className,text)=>{
    const item=document.createElement(tag);
    if(className)item.className=className;
    if(text!==undefined)item.textContent=String(text);
    return item;
  };

  // State and City filters replace the old Iowa-only region buckets.
  const US_STATES=[
    ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],
    ['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],
    ['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],
    ['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],
    ['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
    ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],
    ['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],
    ['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],
    ['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],
    ['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
    ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],
    ['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],
    ['WI','Wisconsin'],['WY','Wyoming'],['DC','District of Columbia']
  ];
  function syncStates(){
    const state=byId('region-filter');if(!state)return;
    const places=typeof sampleVenues!=='undefined'&&Array.isArray(sampleVenues)?sampleVenues:[];
    // Only publicly listed venues contribute state choices.
    const present=new Set(places.map(v=>String(v.state||'').trim().toUpperCase()).filter(Boolean));
    const available=US_STATES.filter(([code])=>present.has(code));
    const signature=available.map(([code])=>code).join('|');
    if(state.dataset.signature===signature)return;
    const previous=state.value;
    state.replaceChildren();
    if(available.length!==1){
      const all=node('option','',available.length?'All States':'No States Available');
      all.value='';state.append(all);
    }
    for(const [code,name] of available){
      const opt=node('option','',name);opt.value=code;state.append(opt);
    }
    state.value=available.length===1?available[0][0]:
      available.some(([code])=>code===previous)?previous:'';
    state.dataset.signature=signature;
    if(previous!==state.value){
      const city=byId('city-filter');
      if(city){city.value='';city.dataset.signature='';}
    }
    state.dispatchEvent(new Event('a2k-update-label'));
  }
  function syncCities(){
    const city=byId('city-filter'),state=byId('region-filter')?.value||'';
    if(!city)return;
    const places=typeof sampleVenues!=='undefined'&&Array.isArray(sampleVenues)?sampleVenues:[];
    const cities=[...new Set(places.filter(v=>!state||String(v.state||'').toUpperCase()===state)
      .map(v=>String(v.city||'').trim()).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b));
    const signature=state+'|'+cities.join('|');
    if(city.dataset.signature===signature)return;
    const selected=city.value;
    city.replaceChildren(node('option','','All Cities'));
    city.options[0].value='';
    for(const name of cities){
      const option=node('option','',name);option.value=name;city.append(option);
    }
    city.value=cities.includes(selected)?selected:'';
    city.dataset.signature=signature;
    city.dispatchEvent(new Event('a2k-update-label'));
  }
  function installLocationFilters(){
    const state=byId('region-filter');if(!state||byId('city-filter'))return;
    const label=state.closest('label');
    if(label?.firstChild?.nodeType===3)label.firstChild.textContent='State';
    state.replaceChildren();
    const cityLabel=node('label','a2k-city-filter-label','City');
    const city=node('select');city.id='city-filter';
    cityLabel.append(city);label.insertAdjacentElement('afterend',cityLabel);
    state.onchange=()=>{syncCities();window.filterVenues()};
    city.onchange=()=>window.filterVenues();
    syncStates();syncCities();
  }
  /* Android native option menus cannot be styled. The original selects still
     drive search; an accessible vintage dialog replaces only their appearance. */
  function enhanceFindSelect(select){
    if(!select||select.dataset.a2kEnhanced==='yes')return;
    select.dataset.a2kEnhanced='yes';
    const title=select.closest('label')?.childNodes[0]?.textContent?.trim()||'Filter';
    const trigger=node('button','a2k-vintage-select-trigger');
    trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-label','Choose '+title);
    // Plain text avoids the site's older ".filterline span" pill styling.
    const update=()=>{trigger.textContent=select.selectedOptions[0]?.textContent||'Choose';};
    select.addEventListener('change',update);
    select.addEventListener('a2k-update-label',update);
    select.insertAdjacentElement('afterend',trigger);
    select.classList.add('a2k-native-filter-hidden');
    select.tabIndex=-1;select.setAttribute('aria-hidden','true');
    trigger.onclick=()=>openVintagePicker(select,title);
    update();
  }
  function openVintagePicker(select,title){
    const dialog=node('dialog','a2k-vintage-picker');
    const shell=node('div','a2k-vintage-picker-shell');
    const heading=node('h2','', 'Choose '+title);
    shell.append(heading);
    const options=[...select.options].filter(opt=>!opt.disabled);
    const list=node('div','a2k-vintage-picker-list');
    if(options.length>8){
      const search=node('input','a2k-vintage-picker-search');
      search.type='search';search.placeholder='Search '+title.toLowerCase();
      search.setAttribute('aria-label','Search '+title.toLowerCase());
      search.oninput=()=>{
        const q=search.value.trim().toLowerCase();
        for(const button of list.children)button.hidden=!button.textContent.toLowerCase().includes(q);
      };
      shell.append(search);
    }
    for(const option of options){
      const button=node('button','a2k-vintage-picker-option',option.textContent);
      button.type='button';button.dataset.selected=String(option.value===select.value);
      button.setAttribute('aria-pressed',String(option.value===select.value));
      button.onclick=()=>{
        select.value=option.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        dialog.close();
      };
      list.append(button);
    }
    shell.append(list);
    const close=node('button','a2k-vintage-picker-close','Close');
    close.type='button';close.onclick=()=>dialog.close();
    shell.append(close);dialog.append(shell);document.body.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.showModal();
    list.querySelector('[data-selected="true"]')?.scrollIntoView({block:'nearest'});
  }
  function enhanceFindFilters(){
    for(const id of ['region-filter','city-filter','genre-filter','review-filter'])
      enhanceFindSelect(byId(id));
  }
  const fmt=(value,opts)=>new Intl.DateTimeFormat('en-US',Object.assign({timeZone:TIME_ZONE},opts)).format(new Date(value));
  const dayDate=value=>fmt(value,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  const time=value=>fmt(value,{hour:'numeric',minute:'2-digit',hour12:true}).replace(':00 ',' ');
  const venue=event=>{
    if(typeof sampleVenues==='undefined')return null;
    return sampleVenues.find(v=>v.databaseId===event.venue_id)||null;
  };
  function dateLine(event){
    const a=fmt(event.start_at,{year:'numeric',month:'2-digit',day:'2-digit'});
    const b=fmt(event.end_at,{year:'numeric',month:'2-digit',day:'2-digit'});
    return dayDate(event.start_at)+' · '+time(event.start_at)+'–'+(a!==b?'Next day ':'')+time(event.end_at);
  }

  function installCompactSearchFilters(){
    const line=document.querySelector('#find-screen .filterline');
    if(!line||byId('a2k-search-filters'))return;
    const details=node('details','a2k-search-filters');
    details.id='a2k-search-filters';
    const header=node('summary','a2k-search-filters-toggle');
    const title=node('strong','a2k-search-filters-title','Filter results');
    const caption=node('span','a2k-search-filters-caption','State · City · Genre · Reviews');
    header.append(title,caption);
    line.insertAdjacentElement('beforebegin',details);
    details.append(header,line);
    const setCaption=()=>{
      const state=byId('region-filter');
      const city=byId('city-filter');
      const genre=byId('genre-filter');
      const review=byId('review-filter');
      const parts=[
        state?.selectedOptions[0]?.textContent||'All States',
        city?.selectedOptions[0]?.textContent||'All Cities'
      ];
      if(genre?.value)parts.push(genre.selectedOptions[0].textContent);
      if(review?.value&&review.value!=='0')parts.push(review.selectedOptions[0].textContent);
      caption.textContent=parts.join(' · ');
    };
    for(const id of ['region-filter','city-filter','genre-filter','review-filter']){
      const select=byId(id);
      select?.addEventListener('change',setCaption);
      select?.addEventListener('a2k-update-label',setCaption);
    }
    setCaption();
  }
  function buildSubmitChoice(){
    let dialog=byId('a2k-submit-choice-dialog');
    if(dialog)return dialog;
    dialog=node('dialog','a2k-submit-choice-dialog');
    dialog.id='a2k-submit-choice-dialog';
    const shell=node('div','a2k-submit-choice-shell');
    const title=node('h2','','What would you like to submit?');
    const note=node('p','','Anyone can suggest a place or a special karaoke night. Submissions are reviewed before appearing publicly.');
    const options=node('div','a2k-submit-choice-options');
    const venueChoice=node('button','a2k-submit-choice-option');
    venueChoice.type='button';
    venueChoice.append(node('strong','','Karaoke Venue'),node('small','','Add a place that hosts karaoke'));
    venueChoice.onclick=()=>{
      dialog.close();
      // Preserve the existing guest submission form and its approval process.
      byId('atk-suggest-venue-entry')?.click();
    };
    const eventChoice=node('button','a2k-submit-choice-option');
    eventChoice.type='button';
    eventChoice.append(node('strong','','One-Time Event'),node('small','','Share a special date and time'));
    eventChoice.onclick=()=>{
      dialog.close();
      buildSubmit();
      if(!submitDialog.open)submitDialog.showModal();
    };
    options.append(venueChoice,eventChoice);
    const close=node('button','a2k-submit-choice-close','Close');
    close.type='button';close.onclick=()=>dialog.close();
    shell.append(title,note,options,close);
    dialog.append(shell);
    document.body.append(dialog);
    return dialog;
  }
  function createFilter(){
    if(!byId('find-results')||byId('a2k-event-filter'))return;
    const search=byId('venue-search');
    if(search)search.placeholder='Search venues, cities, events or KJs';
    const searchLabel=document.querySelector('label[for="venue-search"]');
    if(searchLabel)searchLabel.textContent='Search karaoke venues and events';
    const filter=node('div','a2k-event-filter');
    filter.id='a2k-event-filter';
    filter.setAttribute('role','group');
    filter.setAttribute('aria-label','Show karaoke venues or special events');
    for(const [key,title] of [['all','All Karaoke'],['venues','Venues'],['events','Special Events']]){
      const b=node('button','',title);
      b.type='button';b.dataset.mode=key;
      b.setAttribute('aria-pressed',String(mode===key));
      b.onclick=()=>{
        mode=key;
        for(const sibling of filter.children)sibling.setAttribute('aria-pressed',String(sibling.dataset.mode===mode));
        window.filterVenues();
      };
      filter.append(b);
    }
    byId('results-count').insertAdjacentElement('beforebegin',filter);
    installLocationFilters();enhanceFindFilters();installCompactSearchFilters();
    const originalVenueSubmit=document.querySelector('#find-screen .atk-suggest-venue-cta');
    if(originalVenueSubmit)originalVenueSubmit.classList.add('a2k-submit-source-hidden');
    const submitEntry=node('button','a2k-community-submit-entry','＋ Submit Karaoke');
    submitEntry.id='a2k-community-submit-entry';
    submitEntry.type='button';
    submitEntry.setAttribute('aria-haspopup','dialog');
    submitEntry.onclick=()=>{
      const chooser=buildSubmitChoice();
      if(!chooser.open)chooser.showModal();
    };
    byId('find-results').insertAdjacentElement('beforebegin',submitEntry);
  }
  // Present submitted ALL-CAPS event titles in the same style as ordinary titles.
  // Keep the original title in the database and in searchable text.
  function displayEventTitle(title){
    const raw=String(title||'').trim();
    if(!raw||raw!==raw.toLocaleUpperCase('en-US'))return raw;
    return raw.toLocaleLowerCase('en-US')
      .replace(/(^|[\\s-])([a-z])/g,(_match,sep,letter)=>sep+letter.toLocaleUpperCase('en-US'))
      .replace(/\\b(Kj|Dj|Usa|A2k)\\b/g,word=>word.toLocaleUpperCase('en-US'));
  }
  function makeCard(event){
    const card=node('button','a2k-event-card');
    card.type='button';card.dataset.eventId=event.id;
    card.setAttribute('aria-label','View '+displayEventTitle(event.title)+' on '+dayDate(event.start_at));
    const date=node('div','a2k-event-date-tile');
    date.append(
      node('strong','',fmt(event.start_at,{month:'short'}).toUpperCase()),
      node('b','',fmt(event.start_at,{day:'numeric'})),
      node('small','',fmt(event.start_at,{year:'numeric'}))
    );
    const copy=node('div','a2k-event-card-copy'),v=venue(event);
    copy.append(
      node('span','a2k-event-tag','✦ ONE-TIME EVENT'),
      node('b','',displayEventTitle(event.title)),
      node('small','',(v?v.name+' · ':'')+(v?.city||'Iowa')+', '+(v?.state||'IA')),
      node('span','',time(event.start_at)+'–'+time(event.end_at)+(event.host_name?' · '+event.host_name:''))
    );
    card.append(date,copy);
    card.onclick=()=>openDetails(event.id);
    return card;
  }
  function draw(){
    const parent=byId('find-results');if(!parent)return;
    parent.querySelectorAll('.a2k-event-card').forEach(el=>el.remove());
    for(const event of rows.slice().reverse())parent.prepend(makeCard(event));
    if(typeof window.filterVenues==='function')window.filterVenues();
    renderVenueEvents();
  }
  // Next upcoming occurrence of each published weekly schedule.
  // Use Iowa local calendar days and actual timestamps, including after-midnight
  // finishes, instead of sorting by weekday text or venue name.
  const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const nextCache={minute:-1,byId:new Map()};
  function chicagoDateKey(when){
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(when);
    const part=type=>parts.find(p=>p.type===type)?.value;
    return part('year')+'-'+part('month')+'-'+part('day');
  }
  function addDays(day,offset){
    const d=new Date(day+'T12:00:00Z');
    d.setUTCDate(d.getUTCDate()+offset);
    return d.toISOString().slice(0,10);
  }
  function nextKaraoke(venueItem,now){
    const schedule=Array.isArray(venueItem?.karaokeSchedule)?venueItem.karaokeSchedule:[];
    if(!schedule.length || venueItem.specialEventsOnly)return null;
    const currentMinute=Math.floor(now.getTime()/60000);
    if(nextCache.minute!==currentMinute){
      nextCache.minute=currentMinute;nextCache.byId.clear();
    }
    if(nextCache.byId.has(venueItem.id))return nextCache.byId.get(venueItem.id);
    const today=chicagoDateKey(now);
    let next=null;
    for(let offset=-1;offset<=7;offset++){
      const date=addDays(today,offset);
      const weekday=DAY_NAMES[new Date(date+'T12:00:00Z').getUTCDay()];
      for(const slot of schedule){
        if(String(slot?.day||'').toLowerCase()!==weekday.toLowerCase())continue;
        const start=String(slot.start||''),end=String(slot.end||'');
        if(!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end)||start===end)continue;
        let startAt,endAt;
        try{
          startAt=new Date(toIso(date,start));
          endAt=new Date(toIso(end<=start?addDays(date,1):date,end));
        }catch(_){continue}
        if(endAt<=now||endAt<=startAt)continue;
        if(!next||startAt<next.startAt)next={startAt,endAt,ongoing:startAt<=now};
      }
    }
    nextCache.byId.set(venueItem.id,next);
    return next;
  }
  function whenLabel(session){
    if(!session)return 'Karaoke times not confirmed';
    const day=datePart=>fmt(datePart,{weekday:'short',month:'short',day:'numeric'});
    const endsNextDay=chicagoDateKey(session.startAt)!==chicagoDateKey(session.endAt);
    return (session.ongoing?'🎤 Happening now · ':'🎤 Next: ')+
      day(session.startAt)+' · '+time(session.startAt)+'–'+
      (endsNextDay?'next day ':'')+time(session.endAt);
  }
  function filterCombined(){
    const parent=byId('find-results');if(!parent)return;
    const q=(byId('venue-search')?.value||'').trim().toLowerCase();
    syncStates();syncCities();
    const state=byId('region-filter')?.value||'';
    const city=byId('city-filter')?.value||'';
    const genre=byId('genre-filter')?.value||'';
    const rating=Number(byId('review-filter')?.value||0);
    const now=new Date();
    let shownVenues=0,shownEvents=0,unscheduled=0;
    const byCard=new Map();
    parent.querySelectorAll('.venue-teaser').forEach(card=>{
      const place=typeof sampleVenues!=='undefined'?
        sampleVenues.find(v=>v.id===card.dataset.venue):null;
      const next=place?nextKaraoke(place,now):null;
      const label=card.querySelector('.teaser-copy');
      if(place&&label){
        let nextText=label.querySelector('.a2k-next-session');
        if(!nextText){
          nextText=node('span','a2k-next-session');
          label.append(nextText);
        }
        nextText.textContent=whenLabel(next)+
          (next&&place.publication_status==='under_review'?' · Schedule under review':'');
      }
      // Search applies to dates and weekdays as well as venue details.
      // All existing region, genre and review filters are preserved.
      const text=[place?.name,place?.city,place?.state,place?.address,place?.region,
        ...(place?.genres||[]),
        ...(place?.karaokeSchedule||[]).map(slot=>slot.day),
        next?dayDate(next.startAt):''].filter(Boolean).join(' ').toLowerCase();
      const matchesText=!q||text.includes(q);
      const matchesState=!state||String(place?.state||'').toUpperCase()===state;
      const matchesCity=!city||place?.city===city;
      const matchesGenre=!genre||(place?.genres||[]).includes(genre);
      const matchesRating=rating===0||(Number.isFinite(place?.rating)&&place.rating>=rating);
      // Venues added solely for one-time events are represented by their event
      // cards and can still be opened from those cards.
      card.hidden=mode==='events'||!place||place.specialEventsOnly||
        !matchesText||!matchesState||!matchesCity||!matchesGenre||!matchesRating;
      if(!card.hidden){
        shownVenues++;
        if(!next)unscheduled++;
      }
      byCard.set(card,next?next.startAt.getTime():Infinity);
    });
    parent.querySelectorAll('.a2k-event-card').forEach(card=>{
      const event=rows.find(item=>item.id===card.dataset.eventId);
      const place=event&&venue(event);
      if(!event){card.hidden=true;return}
      const corpus=[event.title,event.description,event.host_name,dayDate(event.start_at),
        place?.name,place?.city,place?.state,place?.address]
        .filter(Boolean).join(' ').toLowerCase();
      const matches=!q||corpus.includes(q);
      const matchesState=!state||String(place?.state||'').toUpperCase()===state;
      const matchesCity=!city||place?.city===city;
      const matchesGenre=!genre||(place?.genres||[]).includes(genre);
      const matchesRating=rating===0||(Number.isFinite(place?.rating)&&place.rating>=rating);
      // Already-ended events are excluded both by the database query and here,
      // in case the user leaves this page open until the event passes.
      card.hidden=mode==='venues'||new Date(event.end_at)<=now||
        !matches||!matchesState||!matchesCity||!matchesGenre||!matchesRating;
      if(!card.hidden)shownEvents++;
      byCard.set(card,new Date(event.start_at).getTime());
    });
    // Every visible result is in one chronological list: ongoing sessions first,
    // then the soonest weekly show or one-time event. Unscheduled venues come last.
    // Sorting DOM nodes retains their existing click, keyboard and profile handlers.
    const cards=Array.from(parent.querySelectorAll('.venue-teaser, .a2k-event-card'));
    cards.sort((a,b)=>{
      const aa=byCard.get(a)??Infinity,bb=byCard.get(b)??Infinity;
      if(aa!==bb)return aa-bb;
      return a.textContent.localeCompare(b.textContent);
    });
    parent.append(...cards);
    byId('no-results').hidden=shownVenues+shownEvents>0;
    const count=byId('results-count');
    if(count){
      count.textContent=
        (mode==='events'?'Upcoming special events: '+shownEvents:
         mode==='venues'?'Showing '+shownVenues+' venues':
         'Coming up: '+(shownVenues-unscheduled+shownEvents)+' scheduled nights')+
         (unscheduled&&mode!=='events'?' · '+unscheduled+' more venues':'');
    }
  }
  async function refresh(){
    if(busy)return;
    busy=true;
    try{
      // Only events published by the venue or Founder and still in the future.
      const now=encodeURIComponent(new Date().toISOString());
      const url='karaoke_special_events?select=id,venue_id,title,start_at,end_at,host_name,description,status,source_url'
        +'&status=eq.published&end_at=gt.'+now+'&order=start_at.asc&limit=250';
      const data=await supabaseRead(url);
      if(!Array.isArray(data))throw Error('Could not read special events.');
      rows=data;loaded=true;draw();
    }catch(error){
      console.warn('Special karaoke events currently unavailable',error);
      if(!loaded){rows=[];draw()}
    }finally{busy=false}
  }
  function buildDetails(){
    if(detailsDialog)return;
    detailsDialog=node('dialog','a2k-special-dialog');
    detailsDialog.id='a2k-special-event-dialog';
    detailsDialog.innerHTML='<div class="a2k-special-shell">'+
      '<div class="a2k-special-status">✦ ONE-TIME KARAOKE EVENT</div>'+
      '<h2 id="a2k-special-detail-title"></h2>'+
      '<p class="a2k-event-datetime" id="a2k-special-detail-datetime"></p>'+
      '<h3 id="a2k-special-detail-venue"></h3>'+
      '<p id="a2k-special-detail-address"></p>'+
      '<p id="a2k-special-detail-host"></p>'+
      '<p id="a2k-special-detail-description"></p>'+
      '<div class="a2k-special-actions">'+
      '<button type="button" id="a2k-special-view-venue">View Venue</button>'+
      '<button type="button" id="a2k-special-detail-close">Close</button>'+
      '</div></div>';
    document.body.append(detailsDialog);
    byId('a2k-special-detail-close').onclick=()=>detailsDialog.close();
    byId('a2k-special-view-venue').onclick=()=>{
      const place=typeof sampleVenues==='undefined'?null:
        sampleVenues.find(v=>v.databaseId===detailsDialog.dataset.venueId);
      detailsDialog.close();
      if(place)openVenue(place.id);
    };
  }
  function openDetails(id){
    const event=rows.find(row=>row.id===id);if(!event)return;
    buildDetails();
    const place=venue(event);
    detailsDialog.dataset.venueId=event.venue_id;
    byId('a2k-special-detail-title').textContent=displayEventTitle(event.title);
    byId('a2k-special-detail-datetime').textContent=dateLine(event);
    byId('a2k-special-detail-venue').textContent=place?.name||'Karaoke venue';
    byId('a2k-special-detail-address').textContent=
      place?[place.address,place.city,place.state||'IA'].filter(Boolean).join(', '):'';
    byId('a2k-special-detail-host').textContent=event.host_name?'Host: '+event.host_name:'Host not listed';
    byId('a2k-special-detail-description').textContent=event.description||'Contact the venue for details.';
    byId('a2k-special-view-venue').hidden=!place;
    if(!detailsDialog.open)detailsDialog.showModal();
  }
  function makeVenueSection(){
    if(byId('a2k-venue-special-events'))return;
    const anchor=document.querySelector('#venue-screen .actions');
    if(!anchor)return;
    const section=node('section','a2k-venue-events');
    section.id='a2k-venue-special-events';section.hidden=true;
    section.append(node('h3','', 'Upcoming Special Events'),node('div','a2k-venue-events-items'));
    anchor.insertAdjacentElement('afterend',section);
  }
  function renderVenueEvents(){
    const section=byId('a2k-venue-special-events');if(!section)return;
    const place=typeof sampleVenues==='undefined'?null:sampleVenues.find(v=>v.id===selectedVenue);
    const list=section.querySelector('.a2k-venue-events-items');list.replaceChildren();
    if(!place?.databaseId){section.hidden=true;return}
    const matches=rows.filter(event=>event.venue_id===place.databaseId);
    section.hidden=matches.length===0;
    for(const event of matches){
      const button=node('button','','✦ '+dayDate(event.start_at)+' · '+time(event.start_at)+' · '+displayEventTitle(event.title));
      button.type='button';button.onclick=()=>openDetails(event.id);list.append(button);
    }
  }
  function toIso(date,time){
    const dateTime=date+'T'+time+':00';
    const naive=new Date(dateTime+'Z');
    if(Number.isNaN(naive.getTime()))throw Error('Invalid date');
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:TIME_ZONE,timeZoneName:'shortOffset'}).formatToParts(naive);
    const tz=parts.find(p=>p.type==='timeZoneName')?.value||'GMT-6';
    const m=tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    const offset=m?(m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3]||0)):-360;
    return new Date(naive.getTime()-offset*60000).toISOString();
  }
  function incrementDate(date){
    const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);
    return d.toISOString().slice(0,10);
  }
  function buildSubmit(){
    if(submitDialog)return;
    submitDialog=node('dialog','a2k-special-dialog');
    submitDialog.id='a2k-special-submit-dialog';
    submitDialog.innerHTML='<form id="a2k-special-form" class="a2k-special-shell">'+
      '<h2>Submit a Special Karaoke Event</h2>'+
      '<p>Guests and members can suggest a one-time event. Every submission is reviewed before appearing publicly.</p>'+
      '<label>Event title<input name="title" required maxlength="180" minlength="5" placeholder="e.g. Holiday Karaoke"></label>'+
      '<label>Venue name<input name="venue_name" required maxlength="150"></label>'+
      '<label>City<input name="city" required maxlength="100"></label>'+
       '<label>State (two-letter code)<input name="state" required minlength="2" maxlength="2" pattern="[A-Za-z]{2}" value="IA" autocapitalize="characters" autocomplete="address-level1"></label>'+
      '<label>Street address (optional)<input name="address" maxlength="220"></label>'+
      '<label>Date<input type="date" name="day" required></label>'+
      '<label>Starts<input type="time" name="start" required></label>'+
      '<label>Ends<input type="time" name="end" required></label>'+
      '<label>KJ or host (optional)<input name="host_name" maxlength="100"></label>'+
      '<label>Event details (optional)<textarea name="notes" maxlength="900"></textarea></label>'+
      '<label>Source link (optional)<input name="source_url" type="url" maxlength="500" placeholder="https://"></label>'+
      '<p>If an event ends after midnight, just select its end time; the next date is automatic.</p>'+
      '<p class="a2k-special-feedback" id="a2k-special-feedback" role="status"></p>'+
      '<div class="a2k-special-actions">'+
      '<button type="submit" id="a2k-special-save">Submit for Review</button>'+
      '<button type="button" id="a2k-special-cancel">Cancel</button>'+
      '</div></form>';
    document.body.append(submitDialog);
    byId('a2k-special-cancel').onclick=()=>submitDialog.close();
    byId('a2k-special-form').addEventListener('submit',submitSuggestion);
  }
  async function submitSuggestion(e){
    e.preventDefault();
    const form=e.currentTarget;
    if(!form.reportValidity())return;
    const data=new FormData(form),day=String(data.get('day')||''),
      start=String(data.get('start')||''),end=String(data.get('end')||''),
      status=byId('a2k-special-feedback'),button=byId('a2k-special-save');
    let start_at,end_at;
    try{
      start_at=toIso(day,start);
      end_at=toIso(end<=start?incrementDate(day):day,end);
    }catch(_){status.textContent='Choose a valid event date and time.';return}
    const payload={
      title:String(data.get('title')||'').trim(),
      venue_name:String(data.get('venue_name')||'').trim(),
      city:String(data.get('city')||'').trim(),state:String(data.get('state')||'').trim().toUpperCase(),
      address:String(data.get('address')||'').trim()||null,
      start_at,end_at,
      host_name:String(data.get('host_name')||'').trim()||null,
      notes:String(data.get('notes')||'').trim(),
      source_url:String(data.get('source_url')||'').trim()||null
    };
    if(!payload.title||payload.venue_name.length<2||payload.city.length<2){
      status.textContent='Please fill in the title, venue, and city.';return;
    }
    if(!US_STATES.some(([code])=>code===payload.state)){
      status.textContent='Enter a valid two-letter U.S. state code.';return;
    }
    if(new Date(end_at)-new Date(start_at)>86400000){
      status.textContent='One-time events must be less than 24 hours.';return;
    }
    if(typeof authClient==='undefined'||!authClient){
      status.textContent='Submission is temporarily unavailable.';return;
    }
    button.disabled=true;status.textContent='Submitting…';
    try{
      const result=await authClient.from('karaoke_event_suggestions').insert(payload);
      if(result.error)throw result.error;
      form.reset();
      status.textContent='Thanks! Your event was submitted for approval.';
    }catch(err){
      status.textContent=err?.message||'Could not submit the event. Please try again.';
    }finally{button.disabled=false}
  }
  function init(){
    if(!byId('find-screen')||!byId('find-results'))return;
    createFilter();makeVenueSection();
    const originalFilter=window.filterVenues;
    if(typeof originalFilter==='function'){
      window.filterVenues=function(){
        const result=originalFilter.apply(this,arguments);
        filterCombined();return result;
      };
    }
    const originalOpen=window.openVenue;
    if(typeof originalOpen==='function'){
      window.openVenue=function(){
        const result=originalOpen.apply(this,arguments);
        renderVenueEvents();return result;
      };
    }
    // Returning to Find Karaoke updates the list after time passes.
    const oldNavigate=window.navigate;
    if(typeof oldNavigate==='function'){
      window.navigate=function(page){
        const result=oldNavigate.apply(this,arguments);
        if(page==='find'){
          if(typeof window.filterVenues==='function')window.filterVenues();
          refresh();
        }
        return result;
      };
    }
    Promise.resolve(window.liveVenueLoadPromise).then(refresh,refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.a2kSpecialEvents={refresh,open:openDetails};
})();