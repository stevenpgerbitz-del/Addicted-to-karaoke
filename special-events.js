/* A2K 195 — upcoming one-time karaoke events, integrated with Find Karaoke */
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
    const suggest=node('button','a2k-special-entry','＋ Submit a Special Event');
    suggest.id='a2k-special-submit-entry';suggest.type='button';
    suggest.onclick=()=>{buildSubmit();submitDialog.showModal()};
    const oldSuggest=document.querySelector('#find-screen .atk-suggest-venue-cta');
    if(oldSuggest)oldSuggest.insertAdjacentElement('afterend',suggest);
    else byId('find-results').insertAdjacentElement('beforebegin',suggest);
  }
  function makeCard(event){
    const card=node('button','a2k-event-card');
    card.type='button';card.dataset.eventId=event.id;
    card.setAttribute('aria-label','View '+event.title+' on '+dayDate(event.start_at));
    const date=node('div','a2k-event-date-tile');
    date.append(
      node('strong','',fmt(event.start_at,{month:'short'}).toUpperCase()),
      node('b','',fmt(event.start_at,{day:'numeric'})),
      node('small','',fmt(event.start_at,{year:'numeric'}))
    );
    const copy=node('div','a2k-event-card-copy'),v=venue(event);
    copy.append(
      node('span','a2k-event-tag','✦ ONE-TIME EVENT'),
      node('b','',event.title),
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
  function filterCombined(){
    const parent=byId('find-results');if(!parent)return;
    const q=(byId('venue-search')?.value||'').trim().toLowerCase();
    const region=byId('region-filter')?.value||'';
    const genre=byId('genre-filter')?.value||'';
    const rating=Number(byId('review-filter')?.value||0);
    let shownVenues=0,shownEvents=0;
    parent.querySelectorAll('.venue-teaser').forEach(card=>{
      if(mode==='events')card.hidden=true;
      if(!card.hidden)shownVenues++;
    });
    parent.querySelectorAll('.a2k-event-card').forEach(card=>{
      const event=rows.find(item=>item.id===card.dataset.eventId);
      const place=event&&venue(event);
      if(!event){card.hidden=true;return}
      const corpus=[event.title,event.description,event.host_name,place?.name,place?.city,place?.state,place?.address]
        .filter(Boolean).join(' ').toLowerCase();
      const matches=!q||corpus.includes(q);
      const matchesRegion=!region||(place?.region===region);
      const matchesGenre=!genre||(place?.genres||[]).includes(genre);
      const matchesRating=rating===0||(Number.isFinite(place?.rating)&&place.rating>=rating);
      card.hidden=mode==='venues'||!matches||!matchesRegion||!matchesGenre||!matchesRating;
      if(!card.hidden)shownEvents++;
    });
    byId('no-results').hidden=shownVenues+shownEvents>0;
    const count=byId('results-count');
    if(count)count.textContent='Showing '+shownVenues+' venues · '+shownEvents+' upcoming events';
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
    byId('a2k-special-detail-title').textContent=event.title;
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
      const button=node('button','','✦ '+dayDate(event.start_at)+' · '+time(event.start_at)+' · '+event.title);
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
      city:String(data.get('city')||'').trim(),state:'IA',
      address:String(data.get('address')||'').trim()||null,
      start_at,end_at,
      host_name:String(data.get('host_name')||'').trim()||null,
      notes:String(data.get('notes')||'').trim(),
      source_url:String(data.get('source_url')||'').trim()||null
    };
    if(!payload.title||payload.venue_name.length<2||payload.city.length<2){
      status.textContent='Please fill in the title, venue, and city.';return;
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
    Promise.resolve(window.liveVenueLoadPromise).then(refresh,refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.a2kSpecialEvents={refresh,open:openDetails};
})();