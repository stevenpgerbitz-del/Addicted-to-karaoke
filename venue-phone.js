/* Build 130 — venue contact-number format validation.
   Validates plausible dialing format, not whether a number is active or reachable. */
(function(){
 'use strict';
 function invalid(){
  return {valid:false,formatted:null,
   message:'Enter a valid phone number, such as (515) 555-0123, or +44 20 7946 0958.'};
 }
 function validate(raw){
  const value=String(raw??'').trim();
  if(!value)return {valid:true,formatted:'',empty:true};
  // Reject letters, extensions and unintended punctuation rather than silently
  // stripping them and treating the remaining digits as a valid phone number.
  if(!/^[+0-9().\s-]+$/.test(value))return invalid();
  if(value.includes('+')&&(!value.startsWith('+')||value.slice(1).includes('+')))return invalid();
  const digits=value.replace(/\D/g,'');
  const plus=value.startsWith('+');
  // NANP: optional leading country code 1, 10 digits, area and exchange start 2-9.
  if((digits.length===10&&!plus)||(digits.length===11&&digits.startsWith('1'))){
   const national=digits.length===11?digits.slice(1):digits;
   if(!/^[2-9]\d{2}[2-9]\d{6}$/.test(national))return invalid();
   return {valid:true,empty:false,
    formatted:'('+national.slice(0,3)+') '+national.slice(3,6)+'-'+national.slice(6)};
  }
  // Non-NANP international numbers: canonical +E.164, 8–15 digits.
  // We can't claim a number is assigned or reachable without carrier verification.
  if(plus&&!digits.startsWith('1')&&/^[2-9]\d{7,14}$/.test(digits)){
   return {valid:true,empty:false,formatted:'+'+digits};
  }
  return invalid();
 }
 window.atkVenuePhone={validate};
})();
