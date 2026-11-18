/* Approved 24 individual Addicted to Karaoke badge images, build 319.
   Redirects any legacy SVG image references to the approved PNG artwork. */
(function(){
'use strict';
const codes=new Set(['song_1','song_25','song_75','song_100','favorite_1','favorite_5','favorite_10','favorite_25','review_1','review_25','review_75','review_100','venue_1','venue_10','venue_25','venue_100','founder','founding_tester','community_supporter','verified_kj','verified_venue_owner','super_admin','admin','moderator']);
function apply(img,code){
 if(!img||!codes.has(code))return false;
 const src='assets/badges/'+code+'.png?v=319';
 if(img.getAttribute('src')===src)return true;
 img.setAttribute('src',src);
 img.dataset.a2kBadgeArt=code;
 img.style.objectFit='contain';img.style.objectPosition='center';
 return true;
}
function inspect(img){
 if(!(img instanceof HTMLImageElement))return;
 const src=img.getAttribute('src')||'';
 const m=src.match(/(?:^|\/)([a-z0-9_]+)\.svg(?:[?#].*)?$/i);
 if(m)apply(img,m[1]);
}
function scan(root){
 if(root instanceof HTMLImageElement)inspect(root);
 root?.querySelectorAll?.('img').forEach(inspect);
}
window.a2kBadgeArt={apply,available:code=>codes.has(code)};
function start(){
 scan(document);
 const observer=new MutationObserver(list=>{
  list.forEach(m=>{
   if(m.type==='attributes')inspect(m.target);
   else m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});
  });
 });
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();