/* SIGMA V2.0.8 : modèle de simulation de sécurité, NON appliqué aux ACL. */
(function(root,factory){const mod=factory();if(typeof module==='object'&&module.exports)module.exports=mod;root.SigmaSecurity=mod;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const roles=Object.freeze(['ATN','AN','RC','EC','AT','ST','DP']);
const operations=Object.freeze(['organisation-modification','supervision','dossier-lecture','transmission-lecture','statistiques-pseudonymisees','statistiques-anonymisees']);
// Rien n'est acquis par le rôle seul : une habilitation active et un périmètre sont requis.
function decide(ctx){
 const x=ctx||{},role=String(x.role||''),op=String(x.operation||'');
 if(!roles.includes(role)||!operations.includes(op))return {allow:false,reason:'Profil ou opération non reconnu'};
 if(x.accountActive!==true||x.grantActive!==true)return {allow:false,reason:'Compte ou habilitation non actif'};
 if(op==='organisation-modification')return {allow:role==='RC'&&x.sameCell===true&&x.conflict!==true,reason:'RC habilité dans sa cellule uniquement'};
 if(op==='supervision')return {allow:role==='RC'&&x.sameCell===true&&x.conflict!==true,reason:'Métadonnées non nominatives uniquement'};
 if(op==='dossier-lecture'){
  if(role==='EC')return {allow:x.assigned===true&&x.sameCell===true&&x.conflict!==true,reason:'EC affecté ou explicitement partagé, sans déport'};
  if(role==='RC')return {allow:x.sameCell===true&&x.signedByDeclarant===true&&x.anonymityLifted===true&&x.conflict!==true,reason:'RC : signature du déclarant ET anonymat levé ET cellule concordante'};
  return {allow:false,reason:'Accès nominatif non accordé par ce profil courant'};
 }
 if(op==='transmission-lecture')return {allow:role==='AT'&&x.recipient===true&&x.transmissionActive===true,reason:'AT destinataire de la transmission active uniquement'};
 if(op==='statistiques-pseudonymisees')return {allow:role==='AN'||role==='ST',reason:'AN/ST : seulement des données pseudonymisées préparées séparément'};
 if(op==='statistiques-anonymisees')return {allow:role==='DP',reason:'DP : seulement données anonymisées préparées séparément'};
 return {allow:false,reason:'Interdit par défaut'};
}
const scenarios=Object.freeze([
 {name:'RC : avant signature',operation:'dossier-lecture',role:'RC',flags:{sameCell:true,anonymityLifted:true},allow:false},
 {name:'RC : signé mais toujours anonyme',operation:'dossier-lecture',role:'RC',flags:{sameCell:true,signedByDeclarant:true},allow:false},
 {name:'RC : signé et anonymat levé',operation:'dossier-lecture',role:'RC',flags:{sameCell:true,signedByDeclarant:true,anonymityLifted:true},allow:true},
 {name:'RC : autre cellule',operation:'dossier-lecture',role:'RC',flags:{signedByDeclarant:true,anonymityLifted:true},allow:false},
 {name:'RC : déport / conflit',operation:'dossier-lecture',role:'RC',flags:{sameCell:true,signedByDeclarant:true,anonymityLifted:true,conflict:true},allow:false},
 {name:'EC : dossier attribué',operation:'dossier-lecture',role:'EC',flags:{assigned:true,sameCell:true},allow:true},
 {name:'EC : dossier non attribué',operation:'dossier-lecture',role:'EC',flags:{sameCell:true},allow:false},
 {name:'EC : habilitation expirée',operation:'dossier-lecture',role:'EC',flags:{assigned:true,sameCell:true,grantActive:false},allow:false},
 {name:'RC : modification fiche de sa cellule',operation:'organisation-modification',role:'RC',flags:{sameCell:true},allow:true},
 {name:'EC : modification fiche de cellule',operation:'organisation-modification',role:'EC',flags:{sameCell:true},allow:false},
 {name:'RC : supervision locale',operation:'supervision',role:'RC',flags:{sameCell:true},allow:true},
 {name:'AT : transmission active destinée',operation:'transmission-lecture',role:'AT',flags:{recipient:true,transmissionActive:true},allow:true},
 {name:'AT : transmission révoquée',operation:'transmission-lecture',role:'AT',flags:{recipient:true},allow:false},
 {name:'AT : transmission destinée à autrui',operation:'transmission-lecture',role:'AT',flags:{transmissionActive:true},allow:false},
 {name:'AN : données pseudonymisées',operation:'statistiques-pseudonymisees',role:'AN',flags:{},allow:true},
 {name:'AN : dossier nominatif',operation:'dossier-lecture',role:'AN',flags:{sameCell:true},allow:false},
 {name:'DP : statistiques anonymisées',operation:'statistiques-anonymisees',role:'DP',flags:{},allow:true},
 {name:'DP : pseudonymisées',operation:'statistiques-pseudonymisees',role:'DP',flags:{},allow:false},
 {name:'ATN : accès technique ordinaire au dossier',operation:'dossier-lecture',role:'ATN',flags:{},allow:false},
 {name:'Compte désactivé',operation:'organisation-modification',role:'RC',flags:{sameCell:true,accountActive:false},allow:false}
]);
function runScenarios(){return scenarios.map(s=>{const actual=decide({accountActive:true,grantActive:true,role:s.role,operation:s.operation,...s.flags});return {...s,actual:actual.allow,pass:actual.allow===s.allow,reason:actual.reason};});}
return Object.freeze({roles,operations,decide,scenarios,runScenarios});
});
