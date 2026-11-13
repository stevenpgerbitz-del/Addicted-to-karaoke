/* A2K Build 154 — Google's official button, directly exchanged for a Supabase session.
 * The previous Supabase OAuth redirect remains available as a fallback while testing.
 * No secret keys or identity tokens are persisted or logged by this module.
 */
(function(){
 'use strict';
 const GOOGLE_CLIENT_ID='75179673314-lknpg32ss1aakbrqoovohlvfvtld6ift.apps.googleusercontent.com';
 const modes=['auth-login','auth-register'];
 const slots=new Map();
 let freshNonce=null;
 let used=false;
 let busy=false;
 let ready=false;

 for(const id of modes){
  const mode=document.getElementById(id);
  const original=mode?.querySelector('button.auth-google[onclick="authGoogle()"]');
  if(!mode||!original)continue;
  const mount=document.createElement('div');
  mount.className='atk-google-direct';
  mount.setAttribute('aria-label','Sign in securely with Google');
  original.before(mount);
  slots.set(id,{mode,mount,original,rendered:false});
 }
 if(!slots.size)return;

 // Google sends the SHA-256 hex hash. Supabase checks against the raw nonce.
 async function generateNonce(){
  const bytes=new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw=btoa(String.fromCharCode(...bytes));
  const encoded=new TextEncoder().encode(raw);
  const digest=await crypto.subtle.digest('SHA-256',encoded);
  const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return {raw,hash};
 }

 function status(message){
  if(typeof window.authStatus==='function')window.authStatus(message);
  else {
   const display=document.getElementById('auth-status');
   if(display)display.textContent=message||'';
  }
 }
 function fallback(slot){
  slot.original.classList.remove('atk-google-legacy');
  slot.original.replaceChildren();
  const glyph=document.createElement('span');
  glyph.className='google-g';glyph.textContent='G';
  slot.original.append(glyph,document.createTextNode(' Continue with Google'));
  slot.mount.replaceChildren();
  slot.rendered=false;
 }
 function revealFallback(slot){
  slot.original.classList.add('atk-google-legacy');
  slot.original.replaceChildren(document.createTextNode('Use previous Google sign-in'));
 }
 function renderVisible(){
  if(!ready||!window.google?.accounts?.id)return;
  for(const slot of slots.values()){
   if(slot.rendered||slot.mode.hidden)continue;
   if(!slot.mode.isConnected)continue;
   try{
    // Render only visible authentication modes; Google cannot measure hidden tabs.
    const width=Math.floor(slot.mode.getBoundingClientRect().width||0);
    if(width<220)continue;
    slot.mount.replaceChildren();
    google.accounts.id.renderButton(slot.mount,{
     type:'standard',
     theme:'outline',
     size:'large',
     shape:'rectangular',
     text:'continue_with',
     logo_alignment:'left',
     width:Math.min(400,Math.max(220,width-8))
    });
    if(slot.mount.children.length===0)continue;
    slot.rendered=true;
    revealFallback(slot);
   }catch(error){
    console.warn('Google sign-in button unavailable; keeping existing login.',error);
    fallback(slot);
   }
  }
 }

 async function onGoogleCredential(response){
  if(busy||used||!freshNonce||!response?.credential)return;
  // authClient is a top-level lexical variable declared in index.html.
  // Top-level 'let' bindings are not properties of window.
  if(typeof authClient==='undefined'||!authClient?.auth?.signInWithIdToken){
   status('Sign-in service is not ready. Use the previous Google sign-in link.');
   return;
  }
  busy=true;
  used=true; // A provider credential is accepted at most once per page session.
  status('Finishing secure Google sign-in…');
  try{
   const {data,error}=await authClient.auth.signInWithIdToken({
    provider:'google',
    token:response.credential,
    nonce:freshNonce
   });
   freshNonce=null;
   if(error)throw error;
   if(!data?.user?.id)throw Error('Google sign-in did not return a member account.');
   // Supabase's existing onAuthStateChange handler refreshes member identity,
   // permissions, navigation and profile using the trusted auth UUID.
   status('Signed in with Google.');
  }catch(error){
   freshNonce=null;
   console.warn('Google ID-token exchange failed; the old sign-in method is still available.');
   status('Could not complete Google sign-in: '+(error?.message||'Please try the previous Google sign-in below.')+
    ' You can use the previous Google sign-in link below, or reload to retry.');
   // Do not reuse a spent nonce; keep the fallback, never auto-sign-in.
   for(const slot of slots.values()){
    if(slot.rendered){
     slot.mount.replaceChildren();
     slot.original.classList.remove('atk-google-legacy');
     slot.original.replaceChildren(document.createTextNode('Continue with Google (previous method)'));
     slot.rendered=false;
    }
   }
  }finally{busy=false}
 }

 async function setup(){
  if(!window.crypto?.subtle||!window.crypto?.getRandomValues){
   // Older/insecure browsers retain the original Supabase OAuth login button.
   return;
  }
  try{
   const nonce=await generateNonce();
   freshNonce=nonce.raw;
   const script=document.createElement('script');
   script.async=true;
   script.src='https://accounts.google.com/gsi/client';
   script.onerror=()=>{
    freshNonce=null;
    console.warn('Google sign-in library could not load; previous method stays available.');
   };
   script.onload=()=>{
    try{
     if(!window.google?.accounts?.id)throw Error('Google identity service not available');
     google.accounts.id.initialize({
      client_id:GOOGLE_CLIENT_ID,
      callback:onGoogleCredential,
      nonce:nonce.hash,
      ux_mode:'popup',
      use_fedcm_for_button:true,
      auto_select:false
     });
     ready=true;
     renderVisible();
    }catch(error){
     freshNonce=null;
     console.warn('Google identity initialization failed; previous method stays available.',error);
    }
   };
   document.head.appendChild(script);
  }catch(error){
   console.warn('Secure Google sign-in initialization unavailable; using previous method.',error);
  }
 }

 const originalAuthMode=window.authMode;
 if(typeof originalAuthMode==='function'){
  window.authMode=function(){
   const value=originalAuthMode.apply(this,arguments);
   // Layout must complete before Google measures the registration form.
   requestAnimationFrame(renderVisible);
   return value;
  };
 }
 // The app defaults to Home. Google cannot measure a sign-in form while
 // its page is hidden, so render the button after navigating to Sign In.
 const previousNavigate=window.navigate;
 if(typeof previousNavigate==='function'){
  window.navigate=function(){
   const result=previousNavigate.apply(this,arguments);
   if(arguments[0]==='signin')requestAnimationFrame(renderVisible);
   return result;
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else void setup();
})();