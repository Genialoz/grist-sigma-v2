/* SIGMA V2.6.3 TEST — vues métier pures, sans autorisation locale. */
(function(root,factory){'use strict';const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;root.SigmaEspaceCore=m;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TABLES=Object.freeze({dossiers:'SIGMA_V2_DOSSIERS_TEST',entretiens:'SIGMA_V2_ENTRETIENS_TEST',cr:'SIGMA_V2_COMPTES_RENDUS_TEST',rapports:'SIGMA_V2_RAPPORTS_TEST'});
function rows(x){if(!x||!Array.isArray(x.id))throw Error('Réponse Grist invalide');return x.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(x).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));}
function dossierLabel(id){const n=Number(id);return Number.isSafeInteger(n)&&n>0?'SIG-'+String(n).padStart(6,'0'):'Dossier inconnu';}
function relation(data,id){const d=Number(id),ent=(data.entretiens||[]).filter(e=>Number(e.Dossier)===d);const set=new Set(ent.map(e=>Number(e.id)));return {entretiens:ent,cr:(data.cr||[]).filter(c=>set.has(Number(c.Entretien))),rapports:(data.rapports||[]).filter(r=>Number(r.Dossier)===d)};}
function tally(data){return Object.fromEntries(Object.keys(TABLES).map(k=>[k,Array.isArray(data[k])?data[k].length:null]));}
function stats(data){const ds=data.dossiers;if(!Array.isArray(ds))return null;const byStatus={};for(const d of ds){const s=String(d.Statut||'Non renseigné');byStatus[s]=(byStatus[s]||0)+1;}return {total:ds.length,byStatus};}
function sorted(rows){return [...(rows||[])].sort((a,b)=>Number(b.id)-Number(a.id));}
function formatDate(v){if(v===null||v===undefined||v==='')return '—';const n=Number(v);if(!Number.isFinite(n)||n<1)return '—';const d=new Date(n*1000);return Number.isNaN(d.valueOf())?'—':d.toLocaleDateString('fr-FR',{timeZone:'UTC'});}
return {TABLES,rows,dossierLabel,relation,tally,stats,sorted,formatDate};});
