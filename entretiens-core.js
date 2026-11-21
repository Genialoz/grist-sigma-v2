(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaEntretiensCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const TABLES=Object.freeze({dossiers:'SIGMA_V2_DOSSIERS_TEST',entretiens:'SIGMA_V2_ENTRETIENS_TEST',cr:'SIGMA_V2_COMPTES_RENDUS_TEST'});
function rows(data){if(Array.isArray(data))return data;if(!data||!Array.isArray(data.id))throw Error('Réponse Grist invalide');return data.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(data).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));}
function ref(v,label){const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw Error(label+' invalide');return n;}
function date(v){if(!/^\d{4}-\d\d-\d\d$/.test(v||''))throw Error('Date obligatoire au format AAAA-MM-JJ');const d=new Date(v+'T00:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error('Date invalide');return Math.floor(d.getTime()/1000);}
function clean(v,max=250){const s=String(v??'').trim();if(s.length>max)throw Error('Texte trop long ('+max+' caractères)');return s;}
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function email(v,label){const s=clean(v,250).toLowerCase();if(!EMAIL.test(s))throw Error(label+' : adresse absente ou invalide');return s;}
function dossierAccessible(dossiers, id){const n=ref(id,'Dossier');const d=(dossiers||[]).find(r=>Number(r.id)===n);if(!d)throw Error('Dossier absent ou inaccessible');return d;}
function entretien(x,dossiers){const d=dossierAccessible(dossiers,x.Dossier);const type=clean(x.Type);if(!['Premier entretien','Entretien de suivi','Autre'].includes(type))throw Error('Type d’entretien invalide');return {Dossier:Number(d.id),Date_Entretien:date(x.Date_Entretien),Type:type,EC_Email:email(d.EC_Email,'EC affecté au dossier'),Modalite:clean(x.Modalite),Observation_Non_Nominative:clean(x.Observation_Non_Nominative,1000)};}
function compteRendu(x,entretiens,existants){const entretienId=ref(x.Entretien,'Entretien');const e=(entretiens||[]).find(r=>Number(r.id)===entretienId);if(!e)throw Error('Entretien absent ou inaccessible');const texte=clean(x.Texte,8000);if(!texte)throw Error('Texte du compte rendu obligatoire');const auteur=email(e.EC_Email_ACL,'EC actuellement affecté');const versions=(existants||[]).filter(r=>Number(r.Entretien)===entretienId).map(r=>Number(r.Version)||0);return {Entretien:entretienId,Version:Math.max(0,...versions)+1,Etat:'Brouillon',Auteur_Email:auteur,Texte:texte};}
function versionState(records,entretienId){
 const list=(records||[]).filter(r=>Number(r.Entretien)===Number(entretienId));
 const duplicateVersions=[];
 const nums=new Map();
 for(const r of list){const n=Number(r.Version);if(!Number.isSafeInteger(n)||n<=0)continue;nums.set(n,(nums.get(n)||0)+1);}
 for(const [number,count] of nums){if(count>1)duplicateVersions.push(number);}
 duplicateVersions.sort((a,b)=>a-b);
 const fingerprint=list.map(r=>String(r.id)+':'+String(r.Version)).sort().join('|');
 return {fingerprint,duplicateVersions,count:list.length,nextVersion:Math.max(0,...list.map(r=>Number(r.Version)||0))+1};
}
function prepareVersion(x,entretiens,existants,baseline){
 const id=ref(x.Entretien,'Entretien');
 const state=versionState(existants,id);
 if(state.duplicateVersions.length)throw Error('Numérotation en doublon sur cet entretien (versions '+state.duplicateVersions.join(', ')+') : suspendre les écritures et faire examiner les données.');
 if(baseline!==state.fingerprint)throw Error('Un autre enregistrement a été ajouté depuis le dernier chargement : actualiser avant de réessayer.');
 return compteRendu(x,entretiens,existants);
}
function versionsPourEntretien(compteRendus,entretienId){return (compteRendus||[]).filter(r=>Number(r.Entretien)===Number(entretienId)).slice().sort((a,b)=>Number(b.Version)-Number(a.Version));}
function label(d){return 'SIG-'+String(d.id).padStart(6,'0');}
return {TABLES,rows,date,entretien,compteRendu,versionState,prepareVersion,versionsPourEntretien,label};
});
