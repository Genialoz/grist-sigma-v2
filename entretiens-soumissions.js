/* SIGMA V2.3.0 — journal immuable des demandes de validation ; aucune signature. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaSoumissions=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const TABLE='SIGMA_V2_CR_SOUMISSIONS_TEST';
function related(rows,crId){return (rows||[]).filter(r=>Number(r.Compte_Rendu)===Number(crId)&&r.Action==='Soumission').sort((a,b)=>Number(a.id)-Number(b.id));}
function isSubmitted(rows,crId){return related(rows,crId).length>0;}
function prepare(cr,rows){if(!cr||!Number.isSafeInteger(Number(cr.id))||Number(cr.id)<=0)throw Error('Choisir une version de compte rendu.');if(cr.Etat!=='Brouillon')throw Error('Seuls les brouillons peuvent être soumis.');if(cr.EC_Habilite_ACL!==true)throw Error('Habilitation EC absente ou non valide.');if(isSubmitted(rows,cr.id))throw Error('Cette version a déjà été soumise.');return {Compte_Rendu:Number(cr.id),Action:'Soumission'};}
return {TABLE,related,isSubmitted,prepare};
});
