/* SIGMA V2.9.2.8 TEST — lecture des décisions, ACL Grist obligatoires. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SigmaCRDecision=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TABLE='SIGMA_V2_DECISIONS_CR_TEST';
const ref=v=>Number.isSafeInteger(v)&&v>0?v:Array.isArray(v)&&v[0]==='R'&&Number.isSafeInteger(v[2])?v[2]:0;
function describe(pub,rows){
 const result=(label,observations='',date='')=>({label,observations,date});
 if(!pub||!Array.isArray(rows))return result('Décisions indisponibles — actualisez.');
 const ds=rows.filter(d=>ref(d.Consultation)===pub.id);
 if(!ds.length)return result('Aucune décision accessible.');
 if(ds.length!==1)return result('Décisions incohérentes — contrôle nécessaire.');
 const d=ds[0], obs=typeof d.Observations==='string'?d.Observations:'', consent=d.Consentement===true||d.Consentement===1;
 if(!consent||d.Identifiant_Document!==pub.Identifiant_Document||d.Version!==pub.Version||d.Auteur_Email!==pub.Destinataire_Email||!['Signe','Correction'].includes(d.Decision)||obs.length>4000||(d.Decision==='Signe'?!!obs.trim():!obs.trim()))return result('Décision incohérente — contrôle nécessaire.');
 const timestamp=typeof d.Date_Decision==='number'?d.Date_Decision:Array.isArray(d.Date_Decision)&&['d','D'].includes(d.Date_Decision[0])?d.Date_Decision[1]:0;
 const date=timestamp>0&&Number.isFinite(timestamp)&&Number.isFinite(+new Date(timestamp*1000))?new Date(timestamp*1000).toLocaleString('fr-FR',{timeZone:'Europe/Paris'}):'';
 return result(d.Decision==='Signe'?'Signé par le déclarant (TEST)':'Correction demandée — non signé',d.Decision==='Correction'?obs:'',date);
}
return {TABLE,describe};});
