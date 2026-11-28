/* SIGMA V2.9.3.1.1.1 TEST — tri et pagination des tâches déjà autorisées. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SigmaCRTasks=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const timestamp=v=>{const n=Array.isArray(v)&&['d','D'].includes(v[0])?v[1]:v;return typeof n==='number'&&Number.isFinite(n)&&n>0?n:0;};
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const sort=rows=>[...rows].sort((a,b)=>(timestamp(a.time)||Infinity)-(timestamp(b.time)||Infinity)||Number(a.r.id)-Number(b.r.id));
const filter=(rows,kind,q)=>rows.filter(t=>(kind==='all'||t.kind===kind)&&norm(t.label+' '+(t.r.Identifiant_Metier||'')+' version '+t.r.Version).includes(norm(q)));
function paginate(rows,page,size){size=[10,25,50].includes(size)?size:10;const pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(pages,Math.max(1,Number.isInteger(page)?page:1));return {page,pages,items:rows.slice((page-1)*size,page*size)};}
return {timestamp,sort,filter,paginate};});
