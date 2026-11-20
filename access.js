/* SIGMA V2.0.4 — lecture et diagnostic des habilitations, sans activation de droits. */
(function(root,factory){const x=factory();if(typeof module==='object'&&module.exports)module.exports=x;root.SigmaAccess=x;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const TABLES={profils:'SIGMA_PROFILS',utilisateurs:'SIGMA_UTILISATEURS',habilitations:'SIGMA_HABILITATIONS'};
 const CODES=Object.freeze(['ATN','AN','RC','EC','AT','ST','DP']);
 function normalEmail(v){return String(v??'').trim().toLocaleLowerCase('fr');}
 function dateStamp(value){if(value==null||value==='')return null;if(typeof value==='number')return Number.isFinite(value)?value:null;const t=Date.parse(String(value).slice(0,10)+'T00:00:00Z');return Number.isFinite(t)?t/1000:null;}
 function validOn(row,now){if(row.Actif!==true&&row.Actif!==1)return false;const start=dateStamp(row.Debut),end=dateStamp(row.Fin);if(start===null||!Number.isFinite(now))return false;return start<=now&&(end===null||now<=end+86399);}
 function validate(records,org,now){const issues=[];const add=(level,message)=>issues.push({level,message});
  for(const [name,table] of Object.entries(TABLES))if(!Array.isArray(records[name]))add('indisponible','Table '+table+' absente ou inaccessible : contrôle incomplet.');
  const profils=records.profils,users=records.utilisateurs,habil=records.habilitations;
  if(Array.isArray(profils)){
   const seen=new Set();for(const p of profils){const code=String(p.Code||'').trim();if(!CODES.includes(code))add('erreur','Profil inconnu : '+code);if(seen.has(code))add('erreur','Profil en double : '+code);seen.add(code);}
   for(const code of CODES)if(!seen.has(code))add('attention','Profil officiel manquant : '+code);
  }
  if(Array.isArray(users)){
   const seen=new Set();for(const u of users){const mail=normalEmail(u.Email);if(!mail||!/^\S+@\S+\.\S+$/.test(mail))add('erreur','Adresse professionnelle absente ou invalide (utilisateur #'+u.id+').');else if(seen.has(mail))add('erreur','Adresse en double (utilisateur #'+u.id+').');else seen.add(mail);}
  }
  if(Array.isArray(habil)){
   const keys=new Set();for(const h of habil){const id='#'+h.id;const user=Array.isArray(users)?users.find(x=>Number(x.id)===Number(h.Utilisateur)):null;
    const prof=Array.isArray(profils)?profils.find(x=>Number(x.id)===Number(h.Profil)):null;
    if(!Number.isSafeInteger(Number(h.Utilisateur))||Number(h.Utilisateur)<1)add('erreur','Habilitation '+id+' : utilisateur non renseigné.');
    else if(Array.isArray(users)&&!user)add('attention','Habilitation '+id+' : utilisateur non visible ou introuvable.');
    if(!Number.isSafeInteger(Number(h.Profil))||Number(h.Profil)<1)add('erreur','Habilitation '+id+' : profil non renseigné.');
    else if(Array.isArray(profils)&&!prof)add('attention','Habilitation '+id+' : profil non visible ou introuvable.');
    const code=prof?.Code;
    if(!h.Debut||dateStamp(h.Debut)===null)add('erreur','Habilitation '+id+' : date de début invalide ou absente.');
    if(h.Fin&&dateStamp(h.Fin)===null)add('erreur','Habilitation '+id+' : date de fin invalide.');
    if(h.Fin&&dateStamp(h.Debut)!==null&&dateStamp(h.Fin)!==null&&dateStamp(h.Fin)<dateStamp(h.Debut))add('erreur','Habilitation '+id+' : fin antérieure au début.');
    const cell=Number(h.Cellule)||0;
    if(['RC','EC'].includes(code)&&!cell)add('attention','Habilitation '+id+' : profil local sans cellule.');
    if(cell&&Array.isArray(org?.cellules)&&!org.cellules.some(x=>Number(x.id)===cell))add('attention','Habilitation '+id+' : cellule non visible ou introuvable.');
    if(['ATN','AN','ST','DP'].includes(code)&&cell)add('attention','Habilitation '+id+' : périmètre du profil national/de contrôle à confirmer avec la MOA.');
    if(validOn(h,now)&&user?.Actif===false)add('attention','Habilitation '+id+' : utilisateur inactif avec habilitation active.');
    const key=[h.Utilisateur,h.Profil,cell,h.Debut,h.Fin].join('|');if(keys.has(key))add('attention','Habilitation '+id+' : doublon exact d’affectation.');keys.add(key);
   }
  }
  return issues;
 }
 function summarize(records,now){const users=records.utilisateurs,habil=records.habilitations;return {users:Array.isArray(users)?users.length:null,habilitations:Array.isArray(habil)?habil.length:null,active:Array.isArray(habil)?habil.filter(h=>validOn(h,now)).length:null};}
 return {TABLES,CODES,normalEmail,dateStamp,validOn,validate,summarize};
});
