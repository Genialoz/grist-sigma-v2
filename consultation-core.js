/* SIGMA V2.4.2 TEST — contrôle interne de consultation, sans accès externe. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaConsultationCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const TABLES=Object.freeze({rapports:'SIGMA_V2_RAPPORTS_TEST',preparations:'SIGMA_V2_PARTAGES_PREPARATIONS_TEST',revocations:'SIGMA_V2_PARTAGES_REVOCATIONS_TEST'});
function rows(data){if(Array.isArray(data))return data;if(!data||!Array.isArray(data.id))throw Error('Réponse Grist invalide');return data.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(data).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));}
function validId(x){const n=Number(x);return Number.isSafeInteger(n)&&n>0?n:null;}
function expiryMillis(p){const value=p?.Date_Expiration;if(typeof value==='number'&&Number.isFinite(value)&&value>0)return (value+86400)*1000;if(typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)){const d=new Date(value+'T00:00:00Z');if(!Number.isNaN(+d)&&d.toISOString().slice(0,10)===value)return +d+86400000;}return NaN;}
function isRevoked(prepId,events){return (events||[]).some(e=>validId(e.Preparation)===validId(prepId)&&e.Action==='Revocation');}
function assess(p,report,events,now=new Date()){
 const reasons=[];
 if(!p||!validId(p.id))reasons.push('Préparation absente');
 if(!report||validId(report.id)!==validId(p?.Rapport))reasons.push('Version du rapport indisponible');
 if(p?.Action!=='Preparation')reasons.push('Action de préparation incorrecte');
 if(p?.EC_Habilite_ACL!==true||report?.EC_Habilite_ACL!==true)reasons.push('Habilitation EC inactive');
 if(report&&p&&String(report.EC_Email_ACL||'').toLowerCase()!==String(p.EC_Email_ACL||'').toLowerCase())reasons.push('Incohérence EC rapport/préparation');
 if(report&&report.Etat!=='Brouillon')reasons.push('État du rapport non pris en charge');
 if(!String(p?.Destinataire_Email||'').trim())reasons.push('Destinataire manquant');
 const end=expiryMillis(p);if(!Number.isFinite(end))reasons.push('Date limite invalide');else if(+now>=end)reasons.push('Préparation expirée');
 if(p&&isRevoked(p.id,events))reasons.push('Préparation révoquée');
 return {eligible:reasons.length===0,reasons,expiration:end};
}
function available(preps,reports,events,now=new Date()){
 const byId=new Map((reports||[]).map(r=>[validId(r.id),r]));return (preps||[]).map(p=>({p,report:byId.get(validId(p.Rapport))||null,assessment:assess(p,byId.get(validId(p.Rapport)),events,now)})).sort((a,b)=>Number(b.p.id)-Number(a.p.id));
}
return {TABLES,rows,assess,available,expiryMillis,isRevoked};
});
