/* Build 142 — member review reporting without disrupting review cards or ratings. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const reasons=[
 ['spam','Spam / advertising'],
 ['scam','Scam / phishing'],
 ['abusive','Abusive language'],
 ['unrelated','Not about this venue'],
 ['fake','Fake / misleading'],
 ['other','Something else']
 ];
 let dialog=null,reportId=null,chosen='',saving=false;
 function el(tag,className,text){
  const e=document.createElement(tag);if(className)e.className=className;
  if(text!==undefined)e.textContent=String(text);return e;
 }
 function makeDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='atk-review-report-dialog';
  dialog.className='atk-review-report-dialog';
  dialog.setAttribute('aria-labelledby','atk-review-report-heading');
  const form=document.createElement('form');form.id='atk-review-report-form';
  const head=el('div','atk-review-report-heading');
  const title=el('h2','','Report Review');title.id='atk-review-report-heading';
  const subtitle=el('p','','Report a problem with this review.');subtitle.id='atk-review-report-subtitle';
  head.append(title,subtitle);
  const body=el('div','atk-review-report-body');
  body.append(el('p','atk-review-report-caption','What seems wrong?'));
  const options=el('div','atk-review-report-options');
  for(const [key,text] of reasons){
   const choice=el('button','atk-review-report-option',text);choice.type='button';
   choice.dataset.reason=key;choice.setAttribute('aria-pressed','false');
   choice.addEventListener('click',()=>{
    chosen=key;
    options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reason===key)));
    $('atk-review-report-feedback').textContent='';
   });
   options.append(choice);
  }
  const detailLabel=el('label','atk-review-report-label','Additional information (optional)');
  detailLabel.htmlFor='atk-review-report-detail';
  const detail=el('textarea');detail.id='atk-review-report-detail';detail.rows=3;detail.maxLength=800;
  detail.placeholder='Describe what you noticed. Required for Something else.';
  body.append(options,detailLabel,detail);
  const feedback=el('p','atk-review-report-feedback');feedback.id='atk-review-report-feedback';feedback.setAttribute('role','status');
  const footer=el('footer','atk-review-report-footer');
  const cancel=el('button','atk-review-report-cancel','Cancel');cancel.type='button';
  cancel.addEventListener('click',()=>dialog.close());
  const send=el('button','','Submit Report');send.type='submit';send.id='atk-review-report-submit';
  footer.append(cancel,send);
  form.append(head,body,feedback,footer);
  form.addEventListener('submit',sendReport);
  dialog.append(form);document.body.append(dialog);return dialog;
 }
 function openReport(review){
  if(!authClient||!authUser){
   message('Sign in to report a review.');
   if(typeof navigate==='function')navigate('signin');
   return;
  }
  if(!review?.id)return;
  const d=makeDialog();reportId=review.id;chosen='';
  d.querySelectorAll('[data-reason]').forEach(b=>b.setAttribute('aria-pressed','false'));
  $('atk-review-report-subtitle').textContent='Review by '+(review.display_name||'Member');
  $('atk-review-report-detail').value='';
  $('atk-review-report-feedback').textContent='';
  $('atk-review-report-submit').disabled=false;
  d.showModal();
 }
 async function sendReport(event){
  event.preventDefault();
  if(saving||!reportId)return;
  if(!chosen){$('atk-review-report-feedback').textContent='Please select a report reason.';return}
  const details=$('atk-review-report-detail').value.trim();
  if(chosen==='other'&&details.length<10){
   $('atk-review-report-feedback').textContent='Add at least 10 characters explaining this issue.';return;
  }
  const id=reportId;
  saving=true;$('atk-review-report-submit').disabled=true;
  $('atk-review-report-feedback').textContent='Submitting report…';
  try{
   const {data,error}=await authClient.rpc('report_venue_review',{
    p_review_id:id,p_reason:chosen,p_details:details
   });
   if(error)throw error;
   if(!data?.submitted)throw Error(data?.message||'Your report is already on file.');
   dialog.close();
   message('Review report submitted. Thank you for helping keep our community safe.');
  }catch(e){$('atk-review-report-feedback').textContent=e.message||'Unable to send report.'}
  finally{saving=false;$('atk-review-report-submit').disabled=false}
 }
 const previous=window.renderLiveReviews;
 if(typeof previous==='function'){
  window.renderLiveReviews=function(rows){
   const result=previous.apply(this,arguments);
   const cards=$('content')?.querySelectorAll('.review-card')||[];
   cards.forEach((card,i)=>{
    const review=rows?.[i],panel=card.querySelector('.review-breakdown');
    if(!review?.id||!panel)return;
    const button=el('button','atk-review-report-link','Report this review');
    button.type='button';
    button.addEventListener('click',event=>{
     event.preventDefault();event.stopPropagation();openReport(review);
    });
    panel.append(button);
   });
   return result;
  };
 }
})();
