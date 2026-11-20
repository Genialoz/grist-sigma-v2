/* SIGMA V2.0.6 — décisions MOA du 20/11/2026. Documentation et simulation UNIQUEMENT.
 * NE PAS utiliser ces fonctions comme dispositif d'autorisation. Les ACL/serveur sont requis. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaMOA=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const decisions=Object.freeze([
 ['A01–A02','Cumul des profils et multi-cellules','Autorisés si habilitations explicites et distinctes.'],
 ['A03–A05','Affectation des EC','Arrivée/retrait : RC. Attribution initiale : EC d’accueil selon canal/cellule. Réaffectation en absence prolongée : RC.'],
 ['B06','Supervision du RC','Avant ouverture du dossier : uniquement identifiant, statut, dates, EC référent et délais.'],
 ['B07–B10','Signature et accès du RC','Rapport signé par le déclarant (auteur du signalement) ET anonymat levé, constaté par l’EC référent. Sans les deux : supervision seule.'],
 ['B11','Départ d’un EC','Retrait immédiat des accès aux anciens dossiers.'],
 ['C12–C14','Partage entre EC','EC référent et RC selon règles restant à préciser ; dossier entier sauf exclusions expresses ; révocation tracée.'],
 ['C15–C16','Déport et délégation','Déport approuvé par une autorité à désigner ; délégation formalisée à un EC habilité ou adjoint.'],
 ['D17–D20','Rapports et autorité','Validation selon rôle EC/RC autorisé ; une autorité destinataire ; pas de retransmission par l’AT.'],
 ['D21–D23','Suites de l’AT','Suites structurées, observations et pièces ; corrections historisées ; fin de droit à la clôture de la transmission.'],
 ['E24–E26','Comptes rendus','Visibles aux EC habilités ; corrections avec nouvelle validation ; visibilité des nouvelles versions à encadrer.'],
 ['E27–E29','Invitations externes','RC habilité gère les invitations ; exceptions au cloisonnement des commentaires à autoriser expressément.'],
 ['F30–F32','Statistiques et habilitations','RC : sa cellule ; données détaillées pseudonymisées selon profil ; gestion locale des droits sous contrôle.']
]);
const pending=Object.freeze([
 ['P1','B07','Signataire confirmé : le déclarant. À définir : vérification de son identité, procédé de signature, preuve, traitement des saisines anonymes.'],
 ['P1','C12','Définir précisément quels partages le RC peut faire avant accès au contenu.'],
 ['P1','C13','Lister les éléments exclus d’un partage complet entre EC.'],
 ['P1','C15','Désigner l’autorité du circuit de déport et les règles d’exclusion.'],
 ['P1','C16 / D17','Définir chaîne de validation, adjoint habilité et conditions de délégation.'],
 ['P1','D19','Préciser quoi faire si plusieurs autorités interviennent successivement.'],
 ['P1','E26','Confirmer si toute nouvelle version de rapport est diffusée, après validation, sans divulgation accidentelle.'],
 ['P1','E27','Définir les cas autorisant une conversation commune entre invités et le consentement/autorisation exigé.'],
 ['P1','F32','Désigner le contrôleur des habilitations, interdire auto-octroi et escalade de privilèges.'],
 ['P2','F33','Choisir les événements générant des notifications et leurs destinataires.'],
 ['P1','F34','Désigner l’autorité qui statue sur les accès exceptionnels.'],
 ['P1','DPO / DSI','Confirmer stratégie d’hébergement, cloisonnement des pièces jointes, journal de consultation et anti-réidentification.']
]);
function rcAccess({reportSigned=false,signerRole=null,anonymityLifted=false,cellMatch=false}={}){if(!cellMatch)return 'aucun';return reportSigned===true&&signerRole==='declarant'&&anonymityLifted===true?'dossier':'supervision';}
function ecAccess({activeInCell=false,assigned=false,shared=false,conflict=false}={}){return activeInCell===true&&conflict!==true&&(assigned===true||shared===true)?'dossier':'aucun';}
function atAccess({transmissionActive=false,reportExplicitlySent=false}={}){return transmissionActive===true&&reportExplicitlySent===true?'transmission':'aucun';}
return Object.freeze({decisions,pending,rcAccess,ecAccess,atAccess});
});
