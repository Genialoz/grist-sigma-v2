/* V2.1.2 — Helpers purs, sans privilèges ni données sensibles. */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;root.SigmaAffectations=m;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const TABLE='SIGMA_V2_AFFECTATIONS_TEST';
 const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 function normalizeEmail(value){return String(value??'').trim().toLowerCase();}
 function prepare(dossier, nextEmail, motif, when){
   if(!dossier||!Number.isSafeInteger(Number(dossier.id))||Number(dossier.id)<=0)throw Error('Sélectionner un dossier existant.');
   const before=normalizeEmail(dossier.EC_Email), after=normalizeEmail(nextEmail);
   if(after&&!EMAIL.test(after))throw Error('Adresse du nouvel écoutant invalide.');
   if(before===after)throw Error('Aucun changement d’écoutant.');
   const reason=String(motif||'').trim();
   if(reason.length<8||reason.length>500)throw Error('Motif obligatoire : entre 8 et 500 caractères.');
   if(!Number.isFinite(when)||when<=0)throw Error('Date de déclaration invalide.');
   return {
     dossierId:Number(dossier.id),
     update:['UpdateRecord','SIGMA_V2_DOSSIERS_TEST',Number(dossier.id),{EC_Email:after}],
     history:['AddRecord',TABLE,null,{Dossier:Number(dossier.id),Ancien_EC:before,Nouvel_EC:after,Motif:reason,Date_Declaration:Math.floor(when)}]
   };
 }
 function related(history,dossierId){return (history||[]).filter(r=>Number(r.Dossier)===Number(dossierId)).sort((a,b)=>Number(b.Date_Declaration||0)-Number(a.Date_Declaration||0));}
 return {TABLE,normalizeEmail,prepare,related};
});
