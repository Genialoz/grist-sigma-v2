/* SIGMA V2.4.1 TEST — préparation des partages internes uniquement. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaPartagesCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const TABLES=Object.freeze({rapports:'SIGMA_V2_RAPPORTS_TEST',preparations:'SIGMA_V2_PARTAGES_PREPARATIONS_TEST',revocations:'SIGMA_V2_PARTAGES_REVOCATIONS_TEST'});
function rows(data){if(Array.isArray(data))return data;if(!data||!Array.isArray(data.id))throw Error('Réponse Grist invalide');return data.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(data).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));}
function ref(v,name){const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw Error(name+' invalide');return n;}
function email(v){const s=String(v||'').trim().toLowerCase();if(s.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw Error('Adresse du destinataire invalide');return s;}
function expiry(value,now=new Date()){if(!/^\d{4}-\d\d-\d\d$/.test(value||''))throw Error('Date d’expiration obligatoire');const d=new Date(value+'T00:00:00Z');if(Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==value)throw Error('Date d’expiration invalide');const today=now.toISOString().slice(0,10);if(value<=today)throw Error('Choisir une date d’expiration future');return Math.floor(d.valueOf()/1000);}
function revokedIds(events){return new Set((events||[]).map(r=>Number(r.Preparation)).filter(Number.isSafeInteger));}
function isExpired(p,now=new Date()){const ts=Number(p.Date_Expiration);return !Number.isFinite(ts)||!ts||ts*1000+86400000<=now.getTime();}
function state(p,events,now=new Date()){if(revokedIds(events).has(Number(p.id)))return 'Révoqué';if(isExpired(p,now))return 'Expiré';return 'Préparé — aucun accès externe';}
function prepare({reportId,dest,expiration},reports,preps,events,now=new Date()){
 const id=ref(reportId,'Rapport');const report=(reports||[]).find(x=>Number(x.id)===id);if(!report)throw Error('Rapport absent ou inaccessible');
 if(report.Etat!=='Brouillon'||report.EC_Habilite_ACL!==true)throw Error('Rapport non habilité ou non disponible en brouillon');
 const recipient=email(dest);const when=expiry(expiration,now);if((preps||[]).some(p=>Number(p.Rapport)===id&&String(p.Destinataire_Email||'').toLowerCase()===recipient&&state(p,events,now)==='Préparé — aucun accès externe'))throw Error('Une préparation active existe déjà pour ce rapport et ce destinataire');
 return {Rapport:id,Destinataire_Email:recipient,Date_Expiration:when,Action:'Preparation'};
}
function revoke(id,preps,events){const n=ref(id,'Préparation');const p=(preps||[]).find(x=>Number(x.id)===n);if(!p)throw Error('Préparation inaccessible');if(revokedIds(events).has(n))throw Error('Préparation déjà révoquée');if(p.EC_Habilite_ACL!==true)throw Error('Habilitation EC non valide');return {Preparation:n,Action:'Revocation'};}
return {TABLES,rows,prepare,revoke,state,expiry,email};
});
