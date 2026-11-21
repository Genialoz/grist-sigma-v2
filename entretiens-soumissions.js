/* SIGMA V2.3.1 : lecture des événements historiques V2.3.0 ; écriture désactivée. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaSoumissions=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const TABLE='SIGMA_V2_CR_SOUMISSIONS_TEST';
function related(rows,crId){return (rows||[]).filter(r=>Number(r.Compte_Rendu)===Number(crId)&&r.Action==='Soumission').sort((a,b)=>Number(a.id)-Number(b.id));}
function isSubmitted(rows,crId){return related(rows,crId).length>0;}
/* Conservation pour compatibilité de tests anciens ; l'interface V2.3.1 ne l'appelle pas. */
function prepare(){throw Error('Soumission interne désactivée depuis SIGMA V2.3.1.');}
return {TABLE,related,isSubmitted,prepare};
});
