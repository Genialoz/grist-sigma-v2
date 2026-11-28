const TABLES = [
  "Entretiens_et_comptes_rendus",
  "Espace_metier",
  "Organisation_des_cellules",
  "Partage_des_comptes_rendus",
  "Preparation_des_partages",
  "Rapports",
  "SIGMA_ACL_RC_CELLULES",
  "SIGMA_CELLULES",
  "SIGMA_CONVENTIONS",
  "SIGMA_ENTITES",
  "SIGMA_FICHES_ORGANISATION",
  "SIGMA_HABILITATIONS",
  "SIGMA_MEMBRES_CELLULE",
  "SIGMA_PROFILS",
  "SIGMA_UTILISATEURS",
  "SIGMA_V2_ADMINS_CENTRAUX_TEST",
  "SIGMA_V2_AFFECTATIONS_TEST",
  "SIGMA_V2_AUTORISATIONS_CR_TEST",
  "SIGMA_V2_BROUILLONS_TEST",
  "SIGMA_V2_COMPTES_RENDUS_TEST",
  "SIGMA_V2_CONSULTATIONS_TEST",
  "SIGMA_V2_CR_PARTAGES_REVOCATIONS_TEST",
  "SIGMA_V2_CR_PARTAGES_TEST",
  "SIGMA_V2_CR_SOUMISSIONS_TEST",
  "SIGMA_V2_DECISIONS_CR_TEST",
  "SIGMA_V2_DOSSIERS_HISTORIQUE_TEST",
  "SIGMA_V2_DOSSIERS_PARTAGES_TEST",
  "SIGMA_V2_DOSSIERS_TEST",
  "SIGMA_V2_EC_HABILITATIONS_TEST",
  "SIGMA_V2_ENTRETIENS_TEST",
  "SIGMA_V2_FAITS_DISCRIMINATION_TEST",
  "SIGMA_V2_FAITS_TEST",
  "SIGMA_V2_HABILITATIONS_JOURNAL_TEST",
  "SIGMA_V2_MEMBRES_HISTORIQUE_TEST",
  "SIGMA_V2_ORGANISATION_HISTORIQUE_TEST",
  "SIGMA_V2_PARTAGES_PREPARATIONS_TEST",
  "SIGMA_V2_PARTAGES_REVOCATIONS_TEST",
  "SIGMA_V2_PERSONNES_HISTORIQUE_TEST",
  "SIGMA_V2_PERSONNES_TEST",
  "SIGMA_V2_RAPPORTS_TEST",
  "SIGMA_V2_RC_AFFECTATIONS_CIBLES_TEST",
  "SIGMA_V2_RC_AFFECTATIONS_DEMANDES_TEST",
  "SIGMA_V2_RC_HABILITATIONS_TEST",
  "SIGMA_V2_RC_SYNTHESE_TEST",
  "SIGMA_V2_RDV_HISTORIQUE_TEST",
  "SIGMA_V2_RENDEZ_VOUS_TEST",
  "SIGMA_V2_TRANSFERTS_DEMANDES_TEST",
  "SIGMA_V2_UI_ACCES_CENTRAL_TEST",
  "SIGMA_V2_UTILISATEURS_TEST",
  "Signalements"
];
const EXTERNAL = new Set(['SIGMA_V2_CONSULTATIONS_TEST','SIGMA_V2_DECISIONS_CR_TEST']);
function classify(table, raw, email) {
  if (!raw || !Array.isArray(raw.id)) return {state:'INCONCLUSIF',detail:'Réponse non exploitable'};
  const n=raw.id.length;
  if (!EXTERNAL.has(table)) return {state:n?'KO':'OK',detail:n?`${n} ligne(s) accessible(s)`:'Aucune ligne visible'};
  const field=table==='SIGMA_V2_CONSULTATIONS_TEST'?'Destinataire_Email':'Auteur_Email';
  if (!n) return {state:'INCONCLUSIF',detail:'Aucune ligne témoin visible'};
  if (!Array.isArray(raw[field]) || raw[field].length!==n) return {state:'INCONCLUSIF',detail:'Identité non vérifiable'};
  if (raw[field].some(v=>v!==email)) return {state:'KO',detail:'Identité inattendue ou masquée'};
  return {state:'OK',detail:`${n} ligne(s), identité conforme`};
}
function classifyError(error) {
 const msg=String(error?.message||error||'');
 return /access denied|not authorized|permission denied|forbidden|blocked by|access rules|no access/i.test(msg)?{state:'REFUS',detail:'Refus explicite à examiner'}:{state:'INCONCLUSIF',detail:'Erreur technique ou accès non confirmé'};
}
if(typeof module!=='undefined') module.exports={TABLES,classify,classifyError};
if(typeof window!=='undefined') window.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id); let running=false;
 const add=(name,r)=>{const tr=document.createElement('tr'); for(const value of [name,r.state,r.detail]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tr.className=r.state; $('results').append(tr);};
 if(!window.grist){$('status').textContent='Ouvrez ce widget dans Grist TEST.';return;}
 grist.ready({requiredAccess:'full'});
 $('run').disabled=false;
 $('run').addEventListener('click',async()=>{
  if(running||!$('confirm').checked||!$('identity').value.trim())return;
  running=true;$('run').disabled=true;$('identity').disabled=true;$('confirm').disabled=true;$('results').replaceChildren();
  const email=$('identity').value.trim();const counts={OK:0,KO:0,REFUS:0,INCONCLUSIF:0};
  try{for(const [i,table] of TABLES.entries()){
   $('status').textContent=`Contrôle ${i+1}/${TABLES.length}`;
   let r;try{r=classify(table,await grist.docApi.fetchTable(table),email);}catch(e){r=classifyError(e);}
   counts[r.state]++;add(table,r);
  }}finally{running=false;$('run').disabled=false;$('identity').disabled=false;$('confirm').disabled=false; $('status').textContent=Object.entries(counts).map(([k,v])=>`${k} : ${v}`).join(' · ');}
 });
});
