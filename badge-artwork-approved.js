/* Approved Addicted to Karaoke badge artwork — build 316.
   Source is the explicitly approved 24-shield collection poster.
   Each shield is extracted in the browser from the original approved pixels;
   old SVG files remain a fallback until asset validation is complete. */
(function(){
'use strict';
const posterUrl='assets/badges/approved-collection.png?v=316';
const codes=[
 'song_1','song_25','song_75','song_100',
 'favorite_1','favorite_5','favorite_10','favorite_25',
 'review_1','review_25','review_75','review_100',
 'venue_1','venue_10','venue_25','venue_100',
 'founder','founding_tester','community_supporter','verified_kj',
 'verified_venue_owner','super_admin','admin','moderator'
];
const xs=[[42,182],[229,182],[411,178],[591,180],[783,183],[972,180],[1151,184],[1340,170]];
const ys=[[180,211],[449,212],[719,215]];
const positions=new Map(codes.map((c,i)=>[c,[xs[i%8][0],ys[Math.floor(i/8)][0],xs[i%8][1],ys[Math.floor(i/8)][1]]]));
const cache=new Map();
const image=new Image();
let sourceReady=false,failed=false;
image.onload=()=>{sourceReady=true;scan(document)};
image.onerror=()=>{failed=true};
image.src=posterUrl;
function badgeData(code){
 if(cache.has(code))return cache.get(code);
 const p=positions.get(code);
 if(!p||!sourceReady)return null;
 const [x,y,w,h]=p;
 const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
 const ctx=canvas.getContext('2d');
 if(!ctx)return null;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);
 const data=canvas.toDataURL('image/png');cache.set(code,data);return data;
}
function apply(img,code){
 if(!(img instanceof HTMLImageElement)||!positions.has(code))return false;
 if(img.dataset.a2kBadgeArt===code)return true;
 if(!sourceReady){if(!failed)image.addEventListener('load',()=>apply(img,code),{once:true});return false}
 const src=badgeData(code);if(!src)return false;
 img.dataset.a2kBadgeArt=code;img.src=src;
 img.style.objectFit='contain';img.style.objectPosition='center';return true;
}
function scan(root){
 if(root instanceof HTMLImageElement)inspect(root);
 if(root?.querySelectorAll)root.querySelectorAll('img').forEach(inspect);
}
function inspect(img){
 if(img.dataset.a2kBadgeArt)return;
 const src=img.getAttribute('src')||'';
 const found=src.match(/(?:^|\/)([a-z0-9_]+)\.svg(?:[?#].*)?$/i);
 if(found)apply(img,found[1]);
}
function init(){
 scan(document);
 const obs=new MutationObserver(mutations=>{
  for(const m of mutations){
   if(m.type==='attributes')inspect(m.target);
   else for(const node of m.addedNodes)if(node.nodeType===1)scan(node);
  }
 });
 obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
}
window.a2kBadgeArt={apply,data:badgeData,available:code=>positions.has(code)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();