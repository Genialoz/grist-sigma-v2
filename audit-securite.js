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
 const status=Number(error?.status||error?.statusCode||0);
 // Never echo arbitrary server messages: they may contain confidential values.
 if ([401,403].includes(status)||/access denied|not authorized|permission denied|forbidden|blocked by|access rules|no access/i.test(msg)) return {state:'REFUS',detail:'Refus explicite à examiner'};
 const patterns=[[/not found|unknown table|no such table/i,'Table introuvable'],[/censor|censored/i,'Valeur censurée'],[/date|datetime|invalid time/i,'Conversion de date'],[/cannot read|undefined|null/i,'Lecture de propriété impossible'],[/serializ|encod|decod|marshal|clone/i,'Encodage ou sérialisation'],[/timeout|timed out/i,'Délai dépassé'],[/network|connection|fetch failed/i,'Connexion ou transport'],[/not implemented|unsupported/i,'Opération non prise en charge'],[/access|permission|denied/i,'Erreur de droits non classée']];
 const match=patterns.find(([pattern])=>pattern.test(msg));
 const kind=error?.name==='TypeError'?'TypeError':error?.name==='RangeError'?'RangeError':'Erreur';
 return {state:'INCONCLUSIF',detail:`${kind} — ${match?match[1]:'Motif non reconnu'}${[400,404,409,429,500,502,503,504].includes(status)?' (HTTP '+status+')':''}`};
}
function sourceCheck(records,email){
 if(!Array.isArray(records)||!records.length)return {state:'INCONCLUSIF',detail:'Source sans ligne témoin'};
 if(records.some(r=>!r||!Object.prototype.hasOwnProperty.call(r,'Destinataire_Email')||!Object.prototype.hasOwnProperty.call(r,'Identifiant_Document')||!Object.prototype.hasOwnProperty.call(r,'Acces_Actif_ACL')))return {state:'INCONCLUSIF',detail:'Source non identifiable : sélectionner Consultations et toutes les variables'};
 return classify('SIGMA_V2_CONSULTATIONS_TEST',{id:records.map(r=>r.id),Destinataire_Email:records.map(r=>r.Destinataire_Email)},email);
}
if(typeof module!=='undefined') module.exports={TABLES,classify,classifyError,sourceCheck};
if(typeof window!=='undefined') window.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id); let running=false, source=null;
 const add=(name,r)=>{const tr=document.createElement('tr'); for(const value of [name,r.state,r.detail]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tr.className=r.state; $('results').append(tr);};
 if(!window.grist){$('status').textContent='Ouvrez ce widget dans Grist TEST.';return;}
 grist.ready({requiredAccess:'full'});
 // Retain only identifiers and the presence of expected columns, never document text.
 grist.onRecords(data=>{source=Array.isArray(data)?data.map(r=>r&&Object.fromEntries(['id','Destinataire_Email','Identifiant_Document','Acces_Actif_ACL'].filter(k=>Object.prototype.hasOwnProperty.call(r,k)).map(k=>[k,k==='Identifiant_Document'?true:r[k]]))):null;},{keepEncoded:true});
 for(const id of ['run','run-consult'])$(id).disabled=false;
 async function run(tables){
  if(running||!$('confirm').checked||!$('identity').value.trim())return;
  running=true;for(const id of ['run','run-consult','identity','confirm'])$(id).disabled=true;$('results').replaceChildren();$('source-status').textContent='';
  const email=$('identity').value.trim();const counts={OK:0,KO:0,REFUS:0,INCONCLUSIF:0};
  try{for(const [i,table] of tables.entries()){
   $('status').textContent=`Contrôle ${i+1}/${tables.length}`;
   let r;try{r=classify(table,await grist.docApi.fetchTable(table),email);}catch(e){r=classifyError(e);}
   counts[r.state]++;add(table,r);
  }
  const c=sourceCheck(source,email);$('source-status').textContent=`Source onRecords (hors compteurs) : ${c.state} — ${c.detail}`;
  }finally{running=false;for(const id of ['run','run-consult','identity','confirm'])$(id).disabled=false; $('status').textContent=Object.entries(counts).map(([k,v])=>`${k} : ${v}`).join(' · ');}
 }
 $('run').addEventListener('click',()=>run(TABLES));
 $('run-consult').addEventListener('click',()=>run(['SIGMA_V2_CONSULTATIONS_TEST']));
});
