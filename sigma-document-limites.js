/* SIGMA V2.8.2.5 TEST — limites documentaires communes. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaDocumentLimites=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const CR=Object.freeze({visible:100000,bytes:300000}),RAPPORT=Object.freeze({visible:200000,bytes:600000});
const RICH='[SIGMA-FORMAT-2]\n',LEGACY='[SIGMA-FORMAT-1]\n';
const limits=genre=>genre==='Rapport'?RAPPORT:CR;
const bytes=s=>new TextEncoder().encode(s).length;
function length(s){let n=0;for(const _ of s)n++;return n;}
function visibleText(raw){if(raw.startsWith(RICH)&&typeof document!=='undefined'){const t=document.createElement('template');t.innerHTML=raw.slice(RICH.length);return t.content.textContent||'';}if(raw.startsWith(LEGACY))return raw.slice(LEGACY.length);return raw;}
function measure(raw,genre,visible){const l=limits(genre);const s=String(raw??'');const count=length(visible===undefined?visibleText(s):visible);const size=bytes(s);const wire=bytes(JSON.stringify(s));return {count,size,wire,limits:l,valid:count<=l.visible&&size<=l.bytes&&wire<=800000};}
function valid(raw,genre,visible){return measure(raw,genre,visible).valid;}
function requireText(raw,genre){const s=String(raw??'').trim();if(!s)throw Error('Texte du document obligatoire');if(!valid(s,genre))throw Error('Limite documentaire dépassée (texte visible, formatage ou taille de transmission).');return s;}
return {limits,bytes,length,measure,valid,requireText};
});
