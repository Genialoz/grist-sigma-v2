'use strict';(function(){
const C=window.SigmaEspaceCore,E=window.SigmaEntretiensCore,$=id=>document.getElementById(id);
const state={dossiers:null,entretiens:null,cr:null,rapports:null,rc:null,rcCibles:null,rcDemandes:null,cellules:null,habilitations:null,affectations:null,rdv:null,rdvHist:null,faits:null,discriminations:null,rcHabilitations:null,habJournal:null,adminsCentraux:null,dossierPartages:null},ui={busy:false,tab:'accueil',selected:null,report:null,detailTab:"synthese",document:null,centralAllowed:false,techOwner:false};
const METIER_TABLES={cellules:'SIGMA_CELLULES',habilitations:'SIGMA_V2_EC_HABILITATIONS_TEST',affectations:'SIGMA_V2_AFFECTATIONS_TEST',rdv:'SIGMA_V2_RENDEZ_VOUS_TEST',rdvHist:'SIGMA_V2_RDV_HISTORIQUE_TEST',faits:'SIGMA_V2_FAITS_TEST',discriminations:'SIGMA_V2_FAITS_DISCRIMINATION_TEST',rcHabilitations:'SIGMA_V2_RC_HABILITATIONS_TEST',habJournal:'SIGMA_V2_HABILITATIONS_JOURNAL_TEST',corrections:'SIGMA_V2_DOSSIERS_HISTORIQUE_TEST',membres:'SIGMA_MEMBRES_CELLULE',membresHist:'SIGMA_V2_MEMBRES_HISTORIQUE_TEST'};
const DOSSIER_PARTAGES_TABLE='SIGMA_V2_DOSSIERS_PARTAGES_TEST';
const CENTRAL_ACCESS_TABLE='SIGMA_V2_UI_ACCES_CENTRAL_TEST';
const CENTRAL_ADMINS_TABLE='SIGMA_V2_ADMINS_CENTRAUX_TEST';
const CELL_ARCHIVE_FIELD='Archivee';
const CELL_DELETE=window.SigmaCellulesSuppression;
const cellActive=c=>c&&c[CELL_ARCHIVE_FIELD]!==true;
const SIGMA_FAITS_TABLE='SIGMA_V2_FAITS_TEST';
const SIGMA_DISCRIMINATION_TABLE='SIGMA_V2_FAITS_DISCRIMINATION_TEST';
const MOTIFS=Object.freeze(['Violences physiques','Violences verbales','Discrimination','Harcèlement moral','Agissement sexiste','Violences sexuelles','Violences intrafamiliales','Non précisé','Hors champ']);
const CRITERES=Object.freeze(['Origine','Sexe','Situation de famille','Grossesse','Apparence physique','Situation économique','État de santé','Handicap','Orientation sexuelle','Identité de genre','Âge','Activités syndicales','Appartenance ethnique','Prétendue race','Religion','Lanceur d’alerte']);
const RC_TABLES={cibles:"SIGMA_V2_RC_AFFECTATIONS_CIBLES_TEST",demandes:"SIGMA_V2_RC_AFFECTATIONS_DEMANDES_TEST"};
const val=(v,def='—')=>v===null||v===undefined||v===''?def:String(v);
function set(el,s){el.textContent=String(s??'');return el;}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)set(e,text);return e;}
function status(msg,error=false){set($('status'),msg);$('status').className='status'+(error?' error':'');}
function empty(parent,message){parent.appendChild(node('div','empty',message));}
function chip(s){const a=node('span','chip',s);if(s==='Nouveau')a.classList.add('st-new');else if(s==='En cours')a.classList.add('st-progress');else if(s==='Clôturé')a.classList.add('st-closed');return a;}
function item(title,desc,badge,action){const el=document.createElement(action?'button':'div');el.className='record'+(action?' actionable':'');if(action){el.type='button';el.addEventListener('click',action);}const left=node('span','record-main');left.append(node('strong',null,title),node('small',null,desc));el.append(left);if(badge){const right=node('span','record-aside');right.append(chip(badge));el.append(right);}return el;}
function count(data,key){return Array.isArray(data[key])?String(data[key].length):'—';}
function metric(title,count,detail){const el=node('div','metric');el.append(node('span','label',title),node('strong',null,count),node('small',null,detail));return el;}
function nav(tab){if(tab!=='dossiers')clearPersons();if(ui.tab==='composition'&&tab!=='composition'&&compositionEdit&&!ui.busy&&!confirm('Abandonner la fiche membre en cours ?'))return;if(ui.tab==='composition'&&tab!=='composition')closeComposition();if(tab==='administration'&&!ui.centralAllowed){status('Rubrique réservée à l’administration centrale. Accès non autorisé.',true);return;}ui.tab=tab;for(const n of document.querySelectorAll('[data-tab]')){const active=n.dataset.tab===tab;n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}for(const sec of document.querySelectorAll('.tab'))sec.hidden=sec.id!=='tab-'+tab;const names={composition:['Composition de ma cellule','Membres, fonctions, moyens et formations'],accueil:['Vue d’ensemble','Synthèse des informations accessibles'],rc:['Supervision RC','Synthèse non nominative de la cellule autorisée'],administration:['Administration centrale','Gestion des cellules et des responsables — habilitation centrale métier'], 'gestion-ec':['Gestion des écoutants','Habiliter les EC dans les cellules déléguées · RC'],dossiers:['Dossiers','Consultation des dossiers et de leurs éléments liés'],entretiens:['Entretiens','Créer et consulter les entretiens'],cr:['Comptes rendus','Consulter et préparer les versions accessibles'],rapports:['Rapports','Consulter et préparer les versions accessibles'],outils:['Modules métier','Accéder aux actions disponibles dans SIGMA TEST'],nouveau:['Nouveau signalement','Création RC ou EC : attribution par formule Grist'],agenda:['Mon agenda','Rendez-vous liés aux dossiers autorisés']};set($('page-title'),names[tab][0]);set($('page-subtitle'),names[tab][1]);render();}
// V2.7.0 : administration centrale pour Owner technique ou administrateurs
// métier explicitement habilités. Les ACL Grist restent la seule autorité.
function refreshCentralNavigation(){
 const allowed=ui.centralAllowed===true;
 for(const el of document.querySelectorAll('[data-tab="administration"], [data-goto="administration"]')){
   el.hidden=!allowed;
   el.disabled=!allowed;
   el.setAttribute('aria-hidden',String(!allowed));
 }
 if(!allowed){$('tab-administration').hidden=true;if(ui.tab==='administration')nav('accueil');}
}
// V2.8.0.4.4 : marqueurs de lecture filtrés par ACL, jamais une autorisation serveur.
const ownDossier=d=>Boolean(d&&(d.Referent_UI_ACL===true||ui.techOwner===true));
const manageDossier=d=>Boolean(d&&(ui.techOwner===true||d.Gestion_UI_ACL===true));
const collaborateDossier=d=>Boolean(d&&d.Collaboration_UI_ACL===true);
// Separate activity rights from general dossier management.
const activityWritable=d=>manageDossier(d)||Boolean(collaborateDossier(d)&&initialWritable(d));
const documentWritable=d=>manageDossier(d)||Boolean(collaborateDossier(d)&&initialWritable(d));
function documentSeriesWritable(d,rows,key,id){if(!documentWritable(d)||!Array.isArray(rows))return false;if(manageDossier(d))return true;const series=rows.filter(r=>sameId(r[key],id)).sort((a,b)=>Number(b.Version)-Number(a.Version));return !series.length||series[0].Etat==='Brouillon';}
const selectedDossier=()=> (state.dossiers||[]).find(d=>Number(d.id)===Number(ui.selected));
const dossierById=id=>(state.dossiers||[]).find(d=>Number(d.id)===Number(id));
function dossierScope(d){const scope=$('dossier-scope').value;return scope==='received'?!ownDossier(d):scope==='sent'?ownDossier(d)&&shareRows(d).length>0:ownDossier(d);}
function visibleDossiers(){const ds=state.dossiers;if(!Array.isArray(ds))return null;const term=$('search').value.toLocaleLowerCase('fr').trim(),filter=$('status-filter').value;return C.sorted(ds).filter(d=>dossierScope(d)&&(!filter||String(d.Statut||'')===filter)&&(!term||[C.dossierLabel(d.id),d.id,d.Statut,d.Canal].map(x=>String(x??'')).join(' ').toLocaleLowerCase('fr').includes(term)));}
function clearDrafts(){clearPersons();for(const id of ['quick-entretien','quick-cr','quick-report','transfer-form'])$(id).reset();}
function hasDraft(){return (ui.tab==='dossiers'&&Boolean($('rdv-debut').value||$('rdv-fin').value||$('rdv-note').value||$('rdv-lieu').value))|| ['quick-e-date','quick-e-modalite','quick-e-observation','quick-cr-texte','quick-r-title','quick-r-text','transfer-motif'].some(id=>$(id).value.trim());}
function selectDetail(tab){if(tab!=='personnes')clearPersons();ui.detailTab=tab;for(const p of document.querySelectorAll('[data-detail-pane]'))p.hidden=p.dataset.detailPane!==tab;for(const b of document.querySelectorAll('nav [data-detail-tab]'))b.setAttribute('aria-pressed',String(b.dataset.detailTab===tab));if(tab==='personnes')loadPersons();}
function showDossier(id,tab='synthese',discardConfirmed=false){const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(id));if(!d||(ui.busy&&Number(ui.selected)!==Number(id)))return false;if(Number(ui.selected)!==Number(id)){if(hasDraft()&&!discardConfirmed&&!confirm('Abandonner les saisies non enregistrées du dossier précédent ?'))return false;clearDrafts();resetRdv();$('dossier-share-form').reset();set($('dossier-share-message'),'');}ui.selected=d.id;ui.detailTab=tab; if(!dossierScope(d))$('dossier-scope').value=ownDossier(d)?'mine':'received';nav('dossiers');selectDetail(tab);$('dossier-detail').scrollIntoView?.({behavior:'smooth',block:'start'});return true;}
// V2.6.5 — Affichage des prochains RDV, toujours limité aux dossiers accessibles.
function renderUpcoming(){
 const root=$('upcoming-rdv');root.replaceChildren();
 if(!Array.isArray(state.dossiers)||!Array.isArray(state.rdv)){
  empty(root,'Prochains rendez-vous indisponibles : vérifier les tables et les ACL.');return;
 }
 const now=Math.floor(Date.now()/1000);
 const rows=sortRdv(state.rdv.filter(r=>appointmentAllowed(r)&&Number(r.Debut)>=now&&r.Statut!=='Annulé')).slice(0,5);
 if(!rows.length){empty(root,'Aucun rendez-vous à venir accessible.');return;}
 for(const r of rows){
  root.append(item(formatRdv(r.Debut),C.dossierLabel(r.Dossier)+' · '+val(r.Modalite)+' · '+rdvTrace(r),val(r.Statut,'Prévu'),()=>{nav('agenda');$('agenda-date').value=localDate(rdvDate(r.Debut));renderAgenda();}));
 }
}
function renderHome(){const m=$('metrics');m.replaceChildren();m.append(metric('Dossiers',count(state,'dossiers'),'Autorisés'),metric('Entretiens',count(state,'entretiens'),'Accessibles'),metric('Comptes rendus',count(state,'cr'),'Versions visibles'),metric('Rapports',count(state,'rapports'),'Internes visibles'));
renderUpcoming();const recent=$('recent-dossiers');recent.replaceChildren();if(state.dossiers===null)empty(recent,'Table dossiers inaccessible : ne pas déduire le nombre de dossiers de la cellule.');else if(!state.dossiers.length)empty(recent,'Aucun dossier accessible.');else for(const d of C.sorted(state.dossiers).slice(0,6))recent.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · EC : '+val(d.EC_Email,'Non affecté'),val(d.Statut,'Nouveau'),()=>showDossier(d.id)));
const area=$('status-stats');area.replaceChildren();const stats=C.stats(state);if(!stats){empty(area,'Statistiques indisponibles : accès à la table dossiers refusé.');return;}if(!stats.total){empty(area,'Aucune donnée accessible.');return;}for(const [key,value] of Object.entries(stats.byStatus)){const row=node('div','status-row');row.append(node('span',null,key));const bar=node('span','bar'),inner=document.createElement('i');inner.style.width=(100*value/stats.total)+'%';bar.append(inner);row.append(bar,node('span','value',value));area.append(row);}}
function renderDossiers(){set($('dossier-scope-note'),$('dossier-scope').value==='sent'?'Dossiers dont vous avez préparé un partage, y compris les partages révoqués.':$('dossier-scope').value==='received'?'Dossiers accessibles en consultation dont vous n’êtes pas identifié comme référent.':'Dossiers dont vous êtes le référent (ou accessibles en tant qu’Owner).');const list=$('dossiers');list.replaceChildren();const rows=visibleDossiers();set($('dossier-counter'),rows===null?'Indisponible':rows.length+' dossier(s)');if(rows===null){empty(list,'Accès non autorisé à la table dossiers. Aucun contournement de la sécurité.');$('dossier-detail').hidden=true;return;}if(!rows.length)empty(list,'Aucun dossier pour ces critères.');for(const d of rows)list.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · Référent : '+val(d.EC_Email,'Non affecté'),manageDossier(d)?val(d.Statut,'Nouveau'):collaborateDossier(d)?'Collaboration':'Lecture seule',()=>showDossier(d.id)));renderDetail();}
function pill(label,value){return node('span',null,label+' : '+val(value));}
function renderDetail(){const section=$('dossier-detail');const d=(state.dossiers||[]).find(x=>x.id===ui.selected);section.hidden=!d;if(!d)return;set($('dossier-title'),C.dossierLabel(d.id));const props=$('dossier-meta');props.replaceChildren();props.append(pill('Statut',d.Statut),pill('Canal',d.Canal),pill('Date de saisine',C.formatDate(d.Date_Saisine)),pill('EC affecté',d.EC_Email));$('initial-open').hidden=!initialWritable(d);for(const label of dossierTrace(d))props.append(node('span',null,label));props.append(pill('Heure de saisine',d.Heure_Saisine),pill('Auteur du contact',d.Auteur_Contact),pill('Objet initial',d.Objet_Initial));const related=C.relation(state,d.id);
const e=$('dossier-entretiens');e.replaceChildren();if(state.entretiens===null)empty(e,'Entretiens non accessibles.');else if(!related.entretiens.length)empty(e,'Aucun entretien accessible.');else for(const r of C.sorted(related.entretiens))e.append(item('Entretien #'+r.id,'Date : '+C.formatDate(r.Date_Entretien)+' · '+entretienTrace(r),val(r.Type,'Entretien'),()=>openEntretien(r.id)));
const cr=$('dossier-cr');renderCRGroups(cr,related.entretiens,related.cr);
const rs=$('dossier-rapports');rs.replaceChildren();if(state.rapports===null)empty(rs,'Rapports non accessibles.');else if(!related.rapports.length)empty(rs,'Aucun rapport accessible.');else for(const r of [...related.rapports].sort((a,b)=>Number(b.Version)-Number(a.Version)))rs.append(item('Rapport v'+val(r.Version),val(r.Titre,'Sans titre')+' · '+versionTrace(r),val(r.Etat,'État inconnu'),()=>openDocument('rapports',r.id)));
selectDetail(ui.detailTab);const writable=manageDossier(d);set($('dossier-access-mode'),writable?'Gestion du dossier':collaborateDossier(d)?'Collaboration · signalement, faits, rendez-vous, entretiens et documents':'Lecture seule');for(const id of ['transfer-section','dossier-share-form','dossier-actions','dossier-quick-actions'])$(id).hidden=!writable;$('quick-entretien').hidden=!activityWritable(d);for(const id of ['quick-cr','quick-report'])$(id).hidden=!documentWritable(d);for(const t of ['suivi','partages','historique']){const b=document.querySelector('nav [data-detail-tab="'+t+'"]');b.hidden=!writable&&!(t==='historique'&&collaborateDossier(d));}if(!writable&&(['suivi','partages'].includes(ui.detailTab)||(ui.detailTab==='historique'&&!collaborateDossier(d))))selectDetail('synthese');renderDossierRdv(d);renderFacts(d);renderCorrections(d);renderQuickEntry(d,related);renderTransfer(d);renderDossierPartages(d);const act=$('dossier-actions');act.replaceChildren();for(const title of ['Dossiers et faits','Entretiens et comptes rendus','Préparations et révocations de CR','Rapports internes']){const link=configLink(title);if(link)act.append(makeLink('Ouvrir : '+title,link,'inline-link'));}}

// V2.8.0.4.5.2 — journal métier des opérations effectuées dans cet espace.
const HISTORY_TABLE='SIGMA_V2_DOSSIERS_HISTORIQUE_TEST';
const HISTORY_LABELS={Date_Saisine:'Date de saisine',Heure_Saisine:'Heure de saisine',Canal:'Canal',Auteur_Contact:'Auteur du contact',Objet_Initial:'Objet initial',Categorie:'Qualification',Date_Fait:'Date du fait',Commentaire_Non_Nominatif:'Commentaire non nominatif',Criteres:'Critères de discrimination',Retire:'Retiré',Motif_Retrait:'Motif du retrait',Faits:'Faits initiaux',Date_Entretien:'Date de l’entretien',Type:'Type d’entretien',Modalite:'Modalité',Observation_Non_Nominative:'Observation non nominative'};
// V2.8.0.5.2.2 — attribution issue des données accessibles, jamais du référent par défaut.
function traceEmail(v){return typeof v==='string'&&/^[^\s@]+@[^\s@]+$/.test(v.trim())?v.trim():'Non tracé';}
function traceDate(v){const n=Number(v);return Number.isFinite(n)&&n>0&&Number.isFinite(new Date(n*1000).getTime())?formatRdv(n):'Date non tracée';}
function creationTrace(r,field='Createur_Email'){return 'Créé par : '+traceEmail(r[field])+' · '+traceDate(r.Date_Creation);}
function versionTrace(r){return 'Auteur de cette version : '+traceEmail(r.Createur_Email)+' · '+traceDate(r.Date_Creation);}
function entretienTrace(r){return creationTrace(r)+' · Dernière correction journalisée : '+traceEmail(r.Dernier_Modificateur_Email)+' · '+traceDate(r.Date_Derniere_Modification);}
function latestTrace(rows){return [...rows].sort((a,b)=>Number(b.Date_Action||0)-Number(a.Date_Action||0)||Number(b.id)-Number(a.id))[0];}
function rdvTrace(r){const last=latestTrace((state.rdvHist||[]).filter(x=>sameId(x.RDV,r.id)));return 'Créé par : '+traceEmail(r.Auteur_Email)+(last?' · Dernière modification journalisée : '+traceEmail(last.Auteur_Email)+' · '+traceDate(last.Date_Action):' · Modification non tracée');}
function dossierTrace(d){const rows=(state.corrections||[]).filter(x=>sameId(x.Dossier,d.id));const creation=latestTrace(rows.filter(x=>x.Action==='Création du signalement'));const last=latestTrace(rows.filter(x=>x.Action==='Correction du signalement'));return ['Création journalisée : '+traceEmail(creation?.Auteur_Email)+' · '+traceDate(creation?.Date_Action),'Dernière correction visible : '+traceEmail(last?.Auteur_Email)+' · '+traceDate(last?.Date_Action)];}
function factTrace(r){const last=latestTrace((state.corrections||[]).filter(x=>sameId(x.Dossier,r.Dossier)&&sameId(x.Fait_Numero,r.id)&&['Correction de fait','Retrait de fait'].includes(x.Action)));return 'Dernière correction/retrait visible : '+traceEmail(last?.Auteur_Email)+' · '+traceDate(last?.Date_Action);}
function entretienCorrectionAction(fresh,payload){const changes=Object.fromEntries(Object.entries(payload).filter(([k,v])=> (fresh[k]??'')!==(v??'')));if(!Object.keys(changes).length)return null;const action=historyAction(fresh.Dossier,"Correction d'entretien",Object.fromEntries(Object.keys(changes).map(k=>[k,fresh[k]??null])),changes);action[3].Entretien=fresh.id;return action;}
function historyReady(){return Array.isArray(state.corrections);}
function historyAction(dossier,action,before,after,fait=0){
 return ['AddRecord',HISTORY_TABLE,null,{Dossier:dossier,Action:action,Fait_Numero:fait,Avant_JSON:JSON.stringify(before),Apres_JSON:JSON.stringify(after)}];
}
function factHistorySnapshot(f,criteria){return f?{Categorie:f.Categorie,Date_Fait:f.Date_Fait??null,Commentaire_Non_Nominatif:f.Commentaire_Non_Nominatif??'',Criteres:criteria,Retire:f.Retire===true,Motif_Retrait:f.Motif_Retrait||''}:{};}
function factHistoryAction(dossier,data,fs,cs){
 const old=data.id===null?null:fs.find(r=>sameId(r.id,data.id));
 const before=factHistorySnapshot(old,old?criteriaOf(cs,old.id).filter(r=>r.Retire===false).map(r=>r.Critere):[]);
 const after=data.retire?{...before,Retire:true,Motif_Retrait:String(data.reason).trim(),Criteres:[]}:{Categorie:data.category,Date_Fait:data.date,Commentaire_Non_Nominatif:data.comment,Criteres:data.selected,Retire:false,Motif_Retrait:''};
 return historyAction(dossier,data.retire?'Retrait de fait':old?'Correction de fait':'Ajout de fait',before,after,old?old.id:0);
}
function historyValue(key,value){if(value===null||value===undefined||value==='')return '—';if(['Date_Saisine','Date_Fait','Date_Entretien'].includes(key))return C.formatDate(value);if(typeof value==='boolean')return value?'Oui':'Non';if(Array.isArray(value))return value.map(v=>typeof v==='object'?JSON.stringify(v):String(v)).join(' · ')||'—';return String(value);}
function historyObject(raw){try{const value=JSON.parse(raw);return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}}
function renderCorrections(d){
 const root=$('dossier-corrections');root.replaceChildren();if(!manageDossier(d)&&!collaborateDossier(d))return;
 if(!historyReady()){empty(root,'Journal indisponible : vérifier la table et les ACL. Les corrections dans cet espace sont suspendues.');return;}
 const rows=state.corrections.filter(r=>sameId(r.Dossier,d.id)).sort((a,b)=>Number(b.Date_Action)-Number(a.Date_Action)||b.id-a.id);
 if(!rows.length){empty(root,'Aucune opération journalisée depuis l’installation de cette version.');return;}
 for(const r of rows){const card=node('div','fact-card'),left=node('div','record-main');const dt=new Date(Number(r.Date_Action)*1000);left.append(node('strong',null,val(r.Action)+(r.Fait_Numero?' · Fait #'+r.Fait_Numero:'')+(r.Entretien?' · Entretien #'+r.Entretien:'')),node('small',null,(Number(r.Date_Action)>0&&Number.isFinite(dt.getTime())?dt.toLocaleString('fr-FR'):'Date indisponible')+' · '+val(r.Auteur_Email)));
 const before=historyObject(r.Avant_JSON),after=historyObject(r.Apres_JSON);if(!before||!after){left.append(node('small',null,'Détail indisponible ou invalide.'));}else{for(const key of new Set([...Object.keys(before),...Object.keys(after)])){if(JSON.stringify(before[key])===JSON.stringify(after[key]))continue;left.append(node('div',null,(HISTORY_LABELS[key]||key)+' : '+historyValue(key,before[key])+' → '+historyValue(key,after[key])));}}
 card.append(left);root.append(card);}
}

// V2.8.0.4.5 TEST — correction des informations initiales uniquement.
const initialFields=['Date_Saisine','Heure_Saisine','Canal','Auteur_Contact','Objet_Initial'];
const initialIds=['initial-date','initial-heure','initial-canal','initial-auteur','initial-objet'];
let initialEdit=null;
function initialWritable(d){return Boolean(d&&(manageDossier(d)||collaborateDossier(d))&&quickEnabled()&&d.EC_Habilite_ACL===true&&['Nouveau','En cours'].includes(d.Statut)&&d.Rapport_Signe_Declarant===false&&!d.Date_Cloture);}
function initialFingerprint(d){return JSON.stringify([...initialFields,'Cellule','EC_Email','Statut','Rapport_Signe_Declarant','Date_Cloture','EC_Habilite_ACL','Gestion_UI_ACL','Collaboration_UI_ACL'].map(k=>d[k]??null));}
function closeInitial(force=false){if(ui.busy&&!force)return;if(initialEdit?.dirty&&!force&&!confirm('Abandonner les modifications non enregistrées ?'))return;initialEdit=null;const dlg=$('initial-dialog');if(dlg.open)dlg.close();$('initial-form').reset();set($('initial-feedback'),'');}
function openInitial(){const d=selectedDossier();if(ui.busy||!initialWritable(d))return;initialEdit={id:d.id,fingerprint:initialFingerprint(d),dirty:false};const date=new Date(Number(d.Date_Saisine)*1000);$('initial-date').value=Number(d.Date_Saisine)>0&&Number.isFinite(date.getTime())?date.toISOString().slice(0,10):'';for(let i=1;i<initialFields.length;i++)$(initialIds[i]).value=d[initialFields[i]]||'';set($('initial-title'),'Modifier le signalement '+C.dossierLabel(d.id));set($('initial-feedback'),'Les faits et documents associés restent inchangés.');$('initial-dialog').showModal();}
function initialPayload(values){const [date,heure,canal,auteur,objet]=values;const stamp=isoToEpoch(date);if(!Number.isSafeInteger(stamp)||stamp<=0)throw Error('Date de saisine invalide.');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure))throw Error('Heure de saisine invalide.');if(!['Courriel','Téléphone','Présentiel','Courrier','Formulaire','Autre'].includes(canal))throw Error('Canal invalide.');if(!['Victime','Témoin','Autre'].includes(auteur))throw Error('Auteur du contact invalide.');if(!['Signalement','Demande d’écoute','Demande d’information','Demande d’orientation','Autre'].includes(objet))throw Error('Objet initial invalide.');return {Date_Saisine:stamp,Heure_Saisine:heure,Canal:canal,Auteur_Contact:auteur,Objet_Initial:objet};}
async function saveInitial(ev){ev.preventDefault();if(ui.busy||!initialEdit||!initialWritable(selectedDossier()))return;const snapshot=initialEdit;try{if(!historyReady())throw Error('Journal indisponible : correction non enregistrée.');const payload=initialPayload(initialIds.map(id=>$(id).value));ui.busy=true;$('initial-save').disabled=true;$('initial-fields').disabled=true;const fresh=C.rows(await grist.docApi.fetchTable(C.TABLES.dossiers)).find(d=>Number(d.id)===Number(snapshot.id));if(!initialWritable(fresh)||initialFingerprint(fresh)!==snapshot.fingerprint||Number(ui.selected)!==Number(snapshot.id))throw Error('Dossier ou droits modifiés depuis l’ouverture. Fermez puis actualisez.');const changes=Object.fromEntries(Object.entries(payload).filter(([k,v])=>fresh[k]!==v));if(!Object.keys(changes).length){closeInitial(true);status('Aucune modification à enregistrer.');return;}await grist.docApi.applyUserActions([['UpdateRecord',C.TABLES.dossiers,snapshot.id,changes],historyAction(snapshot.id,'Correction du signalement',Object.fromEntries(Object.keys(changes).map(k=>[k,fresh[k]??null])),changes)]);closeInitial(true);await reload();status('Informations initiales enregistrées. Les éléments associés sont conservés.');}catch(err){set($('initial-feedback'),'Modification refusée : '+(err?.message||err));}finally{ui.busy=false;$('initial-save').disabled=false;$('initial-fields').disabled=false;}}

// V2.8.0.4.5.1 — faits et critères, corrections atomiques et retrait logique.
let factEdit=null;
const sameId=(a,b)=>Number(a)===Number(b);
const factsOf=(rows,id)=>rows.filter(r=>sameId(r.Dossier,id));
const criteriaOf=(rows,id)=>rows.filter(r=>sameId(r.Fait,id));
const activeFacts=rows=>rows.filter(r=>r.Retire===false);
function factSchema(facts,criteria){return Array.isArray(facts)&&Array.isArray(criteria)&&facts.every(r=>typeof r.Retire==='boolean'&&(r.Motif_Retrait===null||typeof r.Motif_Retrait==='string'))&&criteria.every(r=>typeof r.Retire==='boolean');}
function factsWritable(d,facts=state.faits,criteria=state.discriminations){return initialWritable(d)&&factSchema(facts,criteria);}
function factFingerprint(d,facts,criteria){const f=factsOf(facts,d.id).sort((a,b)=>a.id-b.id);const ids=new Set(f.map(r=>Number(r.id)));return JSON.stringify([initialFingerprint(d),f.map(r=>[r.id,r.Categorie,r.Date_Fait??null,r.Commentaire_Non_Nominatif??'',r.Retire,r.Motif_Retrait]),criteria.filter(r=>ids.has(Number(r.Fait))).sort((a,b)=>a.id-b.id).map(r=>[r.id,r.Fait,r.Critere,r.Retire])]);}
function planFactActions({d,facts,criteria,id=null,category,date=null,comment='',selected=[],retire=false,reason=''}){
 if(!factsWritable(d,facts,criteria))throw Error('Dossier verrouillé ou configuration des faits indisponible.');
 const all=factsOf(facts,d.id),active=activeFacts(all),old=id===null?null:active.find(r=>sameId(r.id,id));
 if(id!==null&&!old)throw Error('Fait absent ou déjà retiré.');
 const previous=old?criteriaOf(criteria,old.id).filter(r=>r.Retire===false):[];
 if(retire){if(!old||active.length<=1)throw Error('Conservez au moins un fait actif. Corrigez le dernier fait si nécessaire.');reason=String(reason).trim();if(!reason||reason.length>500)throw Error('Motif de retrait obligatoire (500 caractères maximum).');return [['UpdateRecord',SIGMA_FAITS_TABLE,old.id,{Retire:true,Motif_Retrait:reason}],...previous.map(r=>['UpdateRecord',SIGMA_DISCRIMINATION_TABLE,r.id,{Retire:true}])];}
 if(!MOTIFS.includes(category))throw Error('Choisissez une qualification valide.');
 if(typeof comment!=='string'||comment.length>500)throw Error('Commentaire limité à 500 caractères.');
 if(date!==null&&!Number.isSafeInteger(date))throw Error('Date du fait invalide.');
 if(!Array.isArray(selected)||selected.some(x=>!CRITERES.includes(x))||new Set(selected).size!==selected.length)throw Error('Critères de discrimination invalides.');
 if(category==='Discrimination'&&!selected.length)throw Error('Précisez au moins un critère de discrimination.');
 if(category!=='Discrimination'&&selected.length)throw Error('Critères réservés aux faits de discrimination.');
 const others=active.filter(r=>!old||r.id!==old.id).map(r=>r.Categorie),categories=[...others,category];
 if(new Set(categories).size!==categories.length)throw Error('Cette qualification est déjà présente dans le dossier.');
 if(categories.length>1&&categories.some(x=>['Hors champ','Non précisé'].includes(x)))throw Error('Hors champ et Non précisé doivent être choisis seuls. Corrigez le fait existant.');
 const fields={Categorie:category,Date_Fait:date,Commentaire_Non_Nominatif:comment};
 const actions=[],fid=old?old.id:-1;
 if(old){const changes=Object.fromEntries(Object.entries(fields).filter(([k,v])=>(old[k]??(k==='Commentaire_Non_Nominatif'?'':null))!==v));if(Object.keys(changes).length)actions.push(['UpdateRecord',SIGMA_FAITS_TABLE,fid,changes]);}
 else actions.push(['AddRecord',SIGMA_FAITS_TABLE,fid,{Dossier:d.id,...fields,Retire:false,Motif_Retrait:''}]);
 const retained=new Set(),retired=[];
 for(const row of previous){if(selected.includes(row.Critere)&&!retained.has(row.Critere))retained.add(row.Critere);else retired.push(['UpdateRecord',SIGMA_DISCRIMINATION_TABLE,row.id,{Retire:true}]);}
 // Ajouter les remplacements avant de retirer les anciens critères : le dernier
 // critère d'une discrimination active ne doit pas disparaître, même transitoirement.
 for(const critere of selected)if(!retained.has(critere))actions.push(['AddRecord',SIGMA_DISCRIMINATION_TABLE,null,{Fait:fid,Critere:critere,Retire:false}]);
 return [...actions,...retired];
}
function renderFacts(d){const root=$('dossier-faits');root.replaceChildren();const writable=factsWritable(d);$('fact-add').hidden=!writable;if(!Array.isArray(state.faits)||!Array.isArray(state.discriminations)){empty(root,'Faits ou critères indisponibles : vérifier les ACL.');return;}
 const rows=factsOf(state.faits,d.id),schema=factSchema(state.faits,state.discriminations);if(!schema&&manageDossier(d))empty(root,'Configuration du retrait logique indisponible. Modification des faits désactivée.');
 const active=rows.filter(r=>r.Retire!==true),retired=rows.filter(r=>r.Retire===true);
 function card(r,archived){const el=node('div','fact-card');const left=node('div','record-main');left.append(node('strong',null,val(r.Categorie)),node('small',null,'Fait #'+r.id+' · '+C.formatDate(r.Date_Fait)),node('small',null,factTrace(r)));
 const cs=criteriaOf(state.discriminations,r.id).filter(x=>archived||x.Retire!==true).map(x=>val(x.Critere));if(cs.length)left.append(node('small',null,(archived?'Critères conservés : ':'Critères : ')+cs.join(', ')));if(!archived){const removed=criteriaOf(state.discriminations,r.id).filter(x=>x.Retire===true).map(x=>val(x.Critere));if(removed.length)left.append(node('small',null,'Critères retirés : '+removed.join(', ')));}if(r.Commentaire_Non_Nominatif)left.append(node('p','fact-comment',r.Commentaire_Non_Nominatif));if(archived)left.append(node('small',null,'Retiré · '+val(r.Motif_Retrait)));el.append(left);
 if(writable&&!archived){const tools=node('div','form-actions');const edit=node('button','btn btn-light','Modifier');edit.type='button';edit.addEventListener('click',()=>openFact(r.id));tools.append(edit);const remove=node('button','btn btn-light','Retirer');remove.type='button';remove.disabled=active.length<=1;remove.title=remove.disabled?'Le dernier fait doit être corrigé plutôt que retiré.':'';remove.addEventListener('click',()=>openFact(r.id,true));tools.append(remove);el.append(tools);}return el;}
 for(const r of active)root.append(card(r,false));if(!active.length)empty(root,'Aucun fait actif accessible.');if(retired.length){const details=node('details','facts-retired');details.append(node('summary',null,retired.length+' fait(s) retiré(s) — historique des retraits'));for(const r of retired)details.append(card(r,true));root.append(details);}}
function factToggleCriteria(){const visible=$('fact-category').value==='Discrimination';$('fact-criteria-box').hidden=!visible;}
function closeFact(force=false){if(ui.busy&&!force)return;if(factEdit?.dirty&&!force&&!confirm('Abandonner les modifications non enregistrées ?'))return;factEdit=null;const dlg=$('fact-dialog');if(dlg.open)dlg.close();$('fact-form').reset();set($('fact-feedback'),'');}
function openFact(id=null,retire=false){const d=selectedDossier();if(ui.busy||!factsWritable(d))return;const old=id===null?null:activeFacts(factsOf(state.faits,d.id)).find(r=>sameId(r.id,id));if(id!==null&&!old)return;if(retire&&(!old||activeFacts(factsOf(state.faits,d.id)).length<=1))return;
 factEdit={id,dossier:d.id,retire,fingerprint:factFingerprint(d,state.faits,state.discriminations),dirty:false};$('fact-form').reset();$('fact-fields').hidden=retire;$('fact-retire-box').hidden=!retire;$('fact-reason').required=retire;$('fact-category').required=!retire;
 const select=$('fact-category');select.replaceChildren(new Option('— Choisir —',''));for(const motif of MOTIFS)select.append(new Option(motif,motif));select.value=old?.Categorie||'';
 $('fact-date').value=old?.Date_Fait?new Date(Number(old.Date_Fait)*1000).toISOString().slice(0,10):'';$('fact-comment').value=old?.Commentaire_Non_Nominatif||'';
 const cs=$('fact-criteria');cs.replaceChildren();const existing=old?criteriaOf(state.discriminations,old.id).filter(r=>r.Retire===false).map(r=>r.Critere):[];for(const critere of CRITERES){const label=node('label','check-option'),input=document.createElement('input');input.type='checkbox';input.value=critere;input.checked=existing.includes(critere);label.append(input,node('span',null,critere));cs.append(label);}
 factToggleCriteria();set($('fact-title'),(retire?'Retirer le fait #'+id:id===null?'Ajouter un fait':'Modifier le fait #'+id)+' · '+C.dossierLabel(d.id));set($('fact-save'),retire?'Confirmer le retrait':'Enregistrer');set($('fact-feedback'),retire?'Le fait et ses critères seront conservés, marqués comme retirés.':existing.some(c=>!CRITERES.includes(c))?'Un ancien critère hors liste existe : vérifiez la sélection avant enregistrement.':'Les documents associés restent inchangés.');$('fact-dialog').showModal();}
async function saveFact(ev){ev.preventDefault();if(ui.busy||!factEdit)return;const snap=factEdit;try{const d=selectedDossier();if(!factsWritable(d)||!sameId(d.id,snap.dossier))throw Error('Dossier non modifiable.');const data={id:snap.id,retire:snap.retire,category:$('fact-category').value,date:isoToEpoch($('fact-date').value),comment:$('fact-comment').value.trim(),selected:$('fact-category').value==='Discrimination'?[...$('fact-criteria').querySelectorAll('input:checked')].map(e=>e.value):[],reason:$('fact-reason').value};ui.busy=true;$('fact-save').disabled=true;
 const [ds,fs,cs]=await Promise.all([C.TABLES.dossiers,SIGMA_FAITS_TABLE,SIGMA_DISCRIMINATION_TABLE].map(t=>grist.docApi.fetchTable(t))).then(xs=>xs.map(C.rows));const fresh=ds.find(r=>sameId(r.id,snap.dossier));if(!factsWritable(fresh,fs,cs)||factFingerprint(fresh,fs,cs)!==snap.fingerprint||!sameId(ui.selected,snap.dossier))throw Error('Données ou droits modifiés depuis l’ouverture. Fermez et actualisez.');
 const actions=planFactActions({d:fresh,facts:fs,criteria:cs,...data});if(!actions.length){closeFact(true);status('Aucune modification à enregistrer.');return;}if(!historyReady())throw Error('Journal indisponible : correction non enregistrée.');await grist.docApi.applyUserActions([...actions,factHistoryAction(fresh.id,data,fs,cs)]);closeFact(true);await reload();status(snap.retire?'Fait retiré, historique des lignes conservé.':'Fait et critères enregistrés ensemble.');}catch(err){set($('fact-feedback'),'Opération refusée : '+(err?.message||err));}finally{ui.busy=false;$('fact-save').disabled=false;}}

// V2.8.0.3.2 — consultation et modification ciblée, ACL Grist obligatoires.
const entretienFields=['Date_Entretien','Type','Modalite','Observation_Non_Nominative'];
let entretienEdit=null;
function entretienFingerprint(r){return JSON.stringify([...entretienFields,'Dossier','EC_Email','Createur_Email','Date_Creation','EC_Email_ACL','EC_Habilite_ACL','Modifiable_ACL'].map(k=>r[k]??null));}
function entretienWritable(r,d){return activityWritable(d)&&quickEnabled()&&!ui.busy&&r?.Modifiable_ACL===true&&r.EC_Habilite_ACL===true&&d?.EC_Habilite_ACL===true&&r.EC_Email_ACL===d.EC_Email&&!!d.EC_Email;}
function closeEntretien(force=false){if(ui.busy&&!force)return;const dlg=$('entretien-dialog');if(!force&&entretienEdit?.dirty){$('entretien-abandon').hidden=false;set($('entretien-feedback'),'Des modifications ne sont pas enregistrées. Confirmez leur abandon ou enregistrez.');return;}entretienEdit=null;if(dlg.open)dlg.close();$('entretien-edit-form').reset();$('entretien-abandon').hidden=true;set($('entretien-meta'),'');set($('entretien-feedback'),'');}
function openEntretien(id){if(ui.busy)return;const r=(state.entretiens||[]).find(x=>Number(x.id)===Number(id));const d=r&&(state.dossiers||[]).find(x=>Number(x.id)===Number(r.Dossier));if(!r||!d){status('Entretien ou dossier non accessible. Actualisez les données.',true);return;}if(entretienEdit?.dirty){set($('entretien-feedback'),'Enregistrez ou abandonnez la saisie en cours.');return;}closeEntretien(true);entretienEdit={id:r.id,dossier:d.id,fingerprint:entretienFingerprint(r),dirty:false};set($('entretien-title'),'Entretien #'+r.id);set($('entretien-meta'),C.dossierLabel(d.id)+' · '+C.formatDate(r.Date_Entretien)+' · '+entretienTrace(r));const date=new Date(Number(r.Date_Entretien)*1000);$('edit-e-date').value=Number(r.Date_Entretien)>0&&Number.isFinite(date.getTime())?date.toISOString().slice(0,10):'';$('edit-e-type').value=r.Type||'';$('edit-e-modalite').value=r.Modalite||'';$('edit-e-observation').value=r.Observation_Non_Nominative||'';const writable=entretienWritable(r,d);$('entretien-edit-fields').disabled=!writable;$('entretien-edit-save').hidden=!writable;set($('entretien-feedback'),writable?'Modifiez les champs puis enregistrez. Le dossier et les comptes rendus associés restent inchangés.':'Consultation seule : habilitation ou protection du document.');$('entretien-dialog').showModal();}
async function saveEntretienEdit(ev){ev.preventDefault();if(ui.busy||!entretienEdit||!quickEnabled())return;const snapshot=entretienEdit;const cached=(state.entretiens||[]).find(x=>Number(x.id)===Number(snapshot.id));const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(snapshot.dossier));if(!entretienWritable(cached,d)){set($('entretien-feedback'),'Modification non autorisée.');return;}const values={Dossier:String(d.id),Date_Entretien:$('edit-e-date').value,Type:$('edit-e-type').value,Modalite:$('edit-e-modalite').value,Observation_Non_Nominative:$('edit-e-observation').value};quickBusy(true);$('entretien-edit-save').disabled=true;$('entretien-edit-fields').disabled=true;try{const [ds,es]=await Promise.all([grist.docApi.fetchTable(E.TABLES.dossiers),grist.docApi.fetchTable(E.TABLES.entretiens)]);const fresh=E.rows(es).find(x=>Number(x.id)===Number(snapshot.id));const fd=E.rows(ds).find(x=>Number(x.id)===Number(snapshot.dossier));if(!fresh||!activityWritable(fd)||fresh.Modifiable_ACL!==true||fresh.EC_Habilite_ACL!==true||fd.EC_Habilite_ACL!==true||fresh.EC_Email_ACL!==fd.EC_Email||entretienFingerprint(fresh)!==snapshot.fingerprint){throw Error('Droits ou entretien modifiés depuis l’ouverture. Fermez puis actualisez avant de reprendre.');}const validated=E.entretien(values,[fd]);const payload=Object.fromEntries(entretienFields.map(k=>[k,validated[k]]));const entry=entretienCorrectionAction(fresh,payload);if(!entry){closeEntretien(true);status('Aucune modification à enregistrer.');return;}if(!historyReady()||!Object.prototype.hasOwnProperty.call(fresh,'Dernier_Modificateur_Email')||!Object.prototype.hasOwnProperty.call(fresh,'Date_Derniere_Modification'))throw Error('Configuration du journal des entretiens indisponible.');await grist.docApi.applyUserActions([['UpdateRecord',E.TABLES.entretiens,snapshot.id,payload],entry]);closeEntretien(true);await reload();status('Entretien mis à jour. Les comptes rendus associés sont conservés.');}catch(err){set($('entretien-feedback'),'Modification refusée : '+(err?.message||err));}finally{quickBusy(false);$('entretien-edit-save').disabled=false;$('entretien-edit-fields').disabled=false;}}

function quickEnabled(){return window.SIGMA_ESPACE_CONFIG?.TEST_WRITES_ENABLED===true && typeof grist!=='undefined' && typeof grist.docApi?.applyUserActions==='function';}
function quickMessage(message,error=false){const el=$('quick-entry-warning');set(el,message);el.classList.toggle('error',error);}
function quickBusy(busy){ui.busy=busy;updateQuickControls();}
function updateQuickControls(){const available=documentSeriesWritable(selectedDossier(),state.cr,'Entretien',$('quick-cr-entretien').value)&&quickEnabled()&&state.dossiers!==null&&state.entretiens!==null&&state.cr!==null&&!ui.busy&&ui.selected!==null;
 $('quick-r-save').disabled=!documentSeriesWritable(selectedDossier(),state.rapports,'Dossier',ui.selected)||!quickEnabled()||!window.SIGMA_RAPPORTS_CONFIG?.TEST_WRITES_ENABLED||!window.SigmaRapportsCore||!Array.isArray(state.rapports)||!Array.isArray(state.dossiers)||ui.busy||ui.selected===null;$('quick-e-save').disabled=!activityWritable(selectedDossier())||!quickEnabled()||!Array.isArray(state.entretiens)||!Array.isArray(state.cr)||ui.busy;const selected=Number($('quick-cr-entretien').value);$('quick-cr-save').disabled=!available||!Number.isSafeInteger(selected)||selected<1;
}
function renderQuickEntry(d,related){const select=$('quick-cr-entretien');const prior=select.value;select.replaceChildren(new Option('— Choisir un entretien de ce dossier —',''));
 for(const e of C.sorted(related.entretiens))select.add(new Option('Entretien #'+e.id+' · '+C.formatDate(e.Date_Entretien),String(e.id)));
 if(related.entretiens.some(e=>String(e.id)===prior))select.value=prior;
 const enabled=quickEnabled();
 if(!E){quickMessage('Module de validation entretiens-core.js indisponible. Saisie désactivée.',true);}else if(!enabled){quickMessage('Saisie désactivée. Activer explicitement les écritures TEST dans espace-metier-config.js après vérification des ACL.');}
 else if(state.entretiens===null||state.cr===null){quickMessage('Tables entretiens ou comptes rendus indisponibles : la saisie est désactivée.',true);}
 else if(!activityWritable(d)){quickMessage('Lecture seule : aucune écriture autorisée.');}else{quickMessage('Dossier '+C.dossierLabel(d.id)+' · EC affecté : '+val(d.EC_Email,'non renseigné')+'. Toute création reste soumise aux ACL Grist.');}
 ui.previousEntretien=select.value;updateQuickControls();quickVersionHint();
}
function quickVersionHint(){const id=Number($('quick-cr-entretien').value);const el=$('quick-cr-version');if(!id||!E||!state.cr){set(el,'Sélectionner un entretien pour créer une version.');return;}
 const v=E.versionState(state.cr,id);set(el,v.duplicateVersions.length?'ALERTE : versions en doublon, ne pas créer de nouvelle version.':'Prochaine version estimée : '+v.nextVersion+' (recontrôlée avant écriture).');}
async function saveQuickEntretien(ev){ev.preventDefault();if(ui.busy||!quickEnabled()||!E||ui.selected===null)return;
 const dossier=(state.dossiers||[]).find(d=>Number(d.id)===Number(ui.selected));if(!activityWritable(dossier))return;
 try{const payload=E.entretien({Dossier:String(dossier.id),Date_Entretien:$('quick-e-date').value,Type:$('quick-e-type').value,Modalite:$('quick-e-modalite').value,Observation_Non_Nominative:$('quick-e-observation').value},state.dossiers);
 quickBusy(true);quickMessage('Enregistrement de l’entretien…');await grist.docApi.applyUserActions([['AddRecord',E.TABLES.entretiens,null,payload]]);
 $('quick-entretien').reset();await reload();showDossier(dossier.id,'entretiens');quickMessage('Entretien créé. Identité du créateur et droits à contrôler dans Grist.');
 }catch(err){quickMessage('Entretien refusé : '+(err?.message||err),true);}finally{quickBusy(false);}}
async function saveQuickCR(ev){ev.preventDefault();if(ui.busy||!quickEnabled()||!E||!documentSeriesWritable(selectedDossier(),state.cr,'Entretien',$('quick-cr-entretien').value))return;
 const entretienId=Number($('quick-cr-entretien').value),e=(state.entretiens||[]).find(e=>Number(e.id)===entretienId);
 if(!e||!Number.isSafeInteger(entretienId)||entretienId<1||Number(e.Dossier)!==Number(ui.selected)){quickMessage('Entretien non accessible ou ne correspondant pas au dossier.',true);return;}
 const dossierId=Number(ui.selected);
 try{if(!Array.isArray(state.cr))throw Error('Comptes rendus non accessibles.');
 const baseline=E.versionState(state.cr,entretienId).fingerprint;quickBusy(true);quickMessage('Contrôle de la version la plus récente…');
 const [crData,dData,eData]=await Promise.all([grist.docApi.fetchTable(E.TABLES.cr),grist.docApi.fetchTable(E.TABLES.dossiers),grist.docApi.fetchTable(E.TABLES.entretiens)]);
 const fresh=E.rows(crData), ds=E.rows(dData), es=E.rows(eData);const fd=ds.find(x=>sameId(x.id,dossierId)),fe=es.find(x=>sameId(x.id,entretienId));if(!documentSeriesWritable(fd,fresh,'Entretien',entretienId)||!fe||!sameId(fe.Dossier,dossierId)||fe.EC_Habilite_ACL!==true||fe.EC_Email_ACL!==fd.EC_Email)throw Error('Droits ou entretien modifiés. Actualisez.');
 const payload=E.prepareVersion({Entretien:String(entretienId),Texte:$('quick-cr-texte').value},es,fresh,baseline);
 await grist.docApi.applyUserActions([['AddRecord',E.TABLES.cr,null,payload]]);
 $('quick-cr-texte').value='';await reload();showDossier(dossierId,'cr');
 const verified=E.versionState(state.cr||[],entretienId);quickMessage(verified.duplicateVersions.length?'ALERTE : doublons de versions détectés, suspendre les écritures.':'Compte rendu enregistré en brouillon — version '+payload.Version+'.',!!verified.duplicateVersions.length);
 }catch(err){quickMessage('Compte rendu refusé : '+(err?.message||err),true);}finally{quickBusy(false);}}
function fillEntry(kind){const s=$('entry-'+kind),prior=s.value;s.replaceChildren(new Option('— Choisir un dossier accessible —',''));for(const d of C.sorted(state.dossiers).filter(kind==='entretiens'?activityWritable:documentWritable))s.add(new Option(C.dossierLabel(d.id)+' · '+val(d.Statut),String(d.id)));if([...s.options].some(o=>o.value===prior))s.value=prior;const b=document.querySelector('[data-entry="'+kind+'"]');b.disabled=!quickEnabled()||!s.value||ui.busy;}
function documentRecord(kind,id){const r=(state[kind]||[]).find(x=>Number(x.id)===Number(id));if(!r)return null;const e=kind==='cr'?(state.entretiens||[]).find(x=>Number(x.id)===Number(r.Entretien)):null;const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(kind==='cr'?e?.Dossier:r.Dossier));return d?{r,d,e}:null;}
function documentCopyWritable(x,kind){return Boolean(x&&documentSeriesWritable(x.d,state[kind],kind==='cr'?'Entretien':'Dossier',kind==='cr'?x.e?.id:x.d.id)&&(manageDossier(x.d)||x.r.Etat==='Brouillon')&&x.d.EC_Habilite_ACL===true&&(kind!=='rapports'||window.SIGMA_RAPPORTS_CONFIG?.TEST_WRITES_ENABLED));}
function resetDocumentPrompt(){set($('document-feedback'),'');$('document-confirm-copy').hidden=true;}
function closeDocument(){ui.document=null;const dlg=$('document-dialog');if(dlg.open)dlg.close();resetDocumentPrompt();for(const id of ['document-title','document-meta','document-body'])set($(id),'');}
function openDocument(kind,id){const x=documentRecord(kind,id);if(!x){status('Document ou entretien lié non accessible. Actualisez les données.',true);return;}resetDocumentPrompt();ui.document={kind,id};set($('document-title'),(kind==='cr'?'Compte rendu':'Rapport')+' · version '+val(x.r.Version));set($('document-meta'),C.dossierLabel(x.d.id)+' · '+val(x.r.Etat)+(kind==='rapports'?' · '+val(x.r.Titre):' · Entretien #'+x.e.id)+' · '+versionTrace(x.r));set($('document-body'),x.r.Texte||'Aucun contenu accessible.');$('document-copy-version').hidden=!documentCopyWritable(x,kind);$('document-copy-version').disabled=!documentCopyWritable(x,kind)||!quickEnabled()||ui.busy;if(!$('document-dialog').open)$('document-dialog').showModal();}
function copyReportVersion(){const k=ui.document;if(!k)return;const x=documentRecord(k.kind,k.id);if(!x||ui.busy||!quickEnabled()||!documentCopyWritable(x,k.kind))return;if(Number(ui.selected)===Number(x.d.id)&&(k.kind==='cr'?$('quick-cr-texte').value:($('quick-r-title').value||$('quick-r-text').value))&&!confirm('Remplacer la saisie non enregistrée ?'))return;if(!showDossier(x.d.id,k.kind))return;closeDocument();if(k.kind==='cr'){$('quick-cr-entretien').value=String(x.e.id);ui.previousEntretien=String(x.e.id);$('quick-cr-texte').value=x.r.Texte||'';quickVersionHint();updateQuickControls();$('quick-cr-texte').focus();}else{$('quick-r-title').value=x.r.Titre||'';$('quick-r-text').value=x.r.Texte||'';$('quick-r-text').focus();}}
function copyDocumentVersion(confirmed=false){
 const k=ui.document;if(!k)return;if(k.kind!=='cr'){copyReportVersion();return;}
 const x=documentRecord('cr',k.id),feedback=$('document-feedback');
 if(!x||!x.e||ui.busy||!quickEnabled()||!documentCopyWritable(x,k.kind)){set(feedback,'Reprise indisponible : vérifiez les droits et actualisez les données.');return;}
 const different=Number(ui.selected)!==Number(x.d.id);
 if(!confirmed&&(different?hasDraft():$('quick-cr-texte').value.trim())){set(feedback,different?'Une saisie du dossier précédent sera abandonnée. Confirmer la reprise ?':'Le texte non enregistré sera remplacé. Confirmer la reprise ?');$('document-confirm-copy').hidden=false;return;}
 // Fermer la modale avant la navigation et le focus du formulaire.
 closeDocument();
 try{
 if(!showDossier(x.d.id,'cr',confirmed))throw Error('Le dossier ne peut pas être ouvert.');
 const select=$('quick-cr-entretien');
 if(!Array.from(select.options).some(o=>o.value===String(x.e.id)))throw Error('Entretien associé non proposé. Actualisez les données.');
 select.value=String(x.e.id);ui.previousEntretien=select.value;$('quick-cr-texte').value=x.r.Texte||'';quickVersionHint();updateQuickControls();
 quickMessage('Texte de la version '+val(x.r.Version)+' repris. Enregistrez pour créer une nouvelle version.');
 $('quick-cr').scrollIntoView?.({block:'start'});$('quick-cr-texte').focus();
 }catch(err){status('Reprise du compte rendu impossible : '+(err?.message||err),true);}
}
function renderCRGroups(root,entretiens,versions){
 root.replaceChildren();if(!Array.isArray(state.cr)||!Array.isArray(state.entretiens)){empty(root,'Versions de CR non accessibles.');return;}
 for(const e of C.sorted(entretiens)){
 const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(e.Dossier));if(!d)continue;
 const group=node('section','cr-history-group');group.append(node('h4',null,C.dossierLabel(d.id)+' · Entretien #'+e.id+' · '+C.formatDate(e.Date_Entretien)));
 const rows=versions.filter(r=>Number(r.Entretien)===Number(e.id)).sort((a,b)=>Number(b.Version)-Number(a.Version)||Number(b.id)-Number(a.id));
 if(!rows.length)empty(group,'Aucun compte rendu accessible pour cet entretien.');
 else for(const [i,r] of rows.entries())group.append(item('Version '+val(r.Version)+(i===0?' · Dernière version visible':' · Historique'),'Compte rendu #'+r.id+' · '+versionTrace(r),val(r.Etat,'État inconnu'),()=>openDocument('cr',r.id)));
 root.append(group);
 }if(!root.children.length)empty(root,'Aucun entretien accessible.');
}
function renderCR(){fillEntry('cr');renderCRGroups($('cr-list'),state.entretiens,state.cr||[]);}
async function saveQuickReport(ev){ev.preventDefault();const R=window.SigmaRapportsCore;if(ui.busy||!quickEnabled()||!window.SIGMA_RAPPORTS_CONFIG?.TEST_WRITES_ENABLED||!R||!Array.isArray(state.rapports))return;const id=Number(ui.selected),d=(state.dossiers||[]).find(x=>Number(x.id)===id);if(!documentSeriesWritable(d,state.rapports,'Dossier',id))return;try{const baseline=R.versionState(state.rapports,id).fingerprint;quickBusy(true);const fresh=R.rows(await grist.docApi.fetchTable(R.TABLES.rapports));const ds=R.rows(await grist.docApi.fetchTable(R.TABLES.dossiers));if(!documentSeriesWritable(ds.find(x=>Number(x.id)===id),fresh,'Dossier',id))throw Error('Dossier non modifiable ou dernière version protégée.');const payload=R.prepare({Dossier:String(id),Titre:$('quick-r-title').value,Texte:$('quick-r-text').value},ds,fresh,baseline);await grist.docApi.applyUserActions([['AddRecord',R.TABLES.rapports,null,payload]]);$('quick-report').reset();await reload();showDossier(id,'rapports');const duplicates=R.versionState(state.rapports||[],id).duplicates;quickMessage(duplicates.length?'ALERTE : versions en doublon. Suspendre les écritures.':'Rapport enregistré — version '+payload.Version,!!duplicates.length);}catch(e){quickMessage('Rapport refusé : '+(e?.message||e),true);}finally{quickBusy(false);}}
function renderEntretiens(){fillEntry('entretiens');const list=$('entretien-list');list.replaceChildren();const arr=state.entretiens;set($('entretien-counter'),arr===null?'Indisponible':arr.length+' entretien(s)');if(arr===null){empty(list,'Entretiens non accessibles.');return;}if(!arr.length){empty(list,'Aucun entretien accessible.');return;}for(const e of C.sorted(arr)){const versions=(state.cr||[]).filter(r=>Number(r.Entretien)===Number(e.id));list.append(item('Entretien #'+e.id+' · '+C.dossierLabel(e.Dossier),'Date : '+C.formatDate(e.Date_Entretien)+' · '+versions.length+' version(s) de CR visible(s) · '+entretienTrace(e),val(e.Type,'Entretien'),()=>openEntretien(e.id)));}}
function showReport(id){const r=(state.rapports||[]).find(x=>Number(x.id)===Number(id));if(!r)return;ui.report=id;nav('rapports');const detail=$('rapport-detail');detail.hidden=false;set($('rapport-titre'),'Rapport #'+r.id+' · version '+val(r.Version)+' · '+val(r.Titre,'Sans titre'));set($('rapport-texte'),r.Texte||'Aucun contenu accessible.');detail.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
function renderRapports(){fillEntry('rapports');const list=$('rapports-list');list.replaceChildren();const arr=state.rapports;set($('rapport-counter'),arr===null?'Indisponible':arr.length+' rapport(s)');if(arr===null){$('rapport-detail').hidden=true;empty(list,'Rapports non accessibles selon vos habilitations.');return;}if(!arr.length){$('rapport-detail').hidden=true;empty(list,'Aucun rapport accessible.');return;}for(const r of C.sorted(arr))list.append(item('Rapport #'+r.id+' · version '+val(r.Version),C.dossierLabel(r.Dossier)+' · '+val(r.Titre,'Sans titre')+' · '+versionTrace(r),val(r.Etat,'État inconnu'),()=>openDocument('rapports',r.id)));const selected=arr.find(x=>x.id===ui.report);if(selected){$('rapport-detail').hidden=false;set($('rapport-titre'),'Rapport #'+selected.id+' · version '+val(selected.Version)+' · '+val(selected.Titre,'Sans titre'));set($('rapport-texte'),selected.Texte||'Aucun contenu accessible.');}else $('rapport-detail').hidden=true;}
function configLink(title){const x=(window.SIGMA_ESPACE_CONFIG?.links||[]).find(x=>x.title===title);if(!x||typeof x.url!=='string')return null;try{const u=new URL(x.url);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function makeLink(title,url,cls){const a=node('a',cls,title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function renderTools(){const root=$('module-links');root.replaceChildren();for(const l of window.SIGMA_ESPACE_CONFIG?.links||[]){const url=configLink(l.title);const card=url?makeLink('',url,'tool'):node('div','tool unconfigured');card.append(node('strong',null,l.title),node('small',null,l.description||''),node('small',null,url?'Ouvrir le module ↗':'Lien non configuré dans espace-metier-config.js'));root.append(card);}if(!root.childNodes.length)empty(root,'Aucun module configuré.');}
function positiveCount(value){const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;}
function renderRC(){
 const root=$('rc-syntheses'),feedback=$('rc-feedback');root.replaceChildren();feedback.replaceChildren();
 const rows=state.rc;
 if(rows===null){empty(feedback,'Synthèses RC indisponibles ou interdites par les ACL. Importer et sécuriser SIGMA_V2_RC_SYNTHESE_TEST avant d’activer ce module pour les collègues.');return;}
 if(!rows.length){empty(feedback,'Aucune synthèse RC autorisée. Owner doit créer une ligne TEST avec le courriel du responsable habilité, sans données nominatives.');return;}
 // Les ACL Grist sont seules responsables du filtrage ; le navigateur ne sélectionne pas d’utilisateur à partir d’un paramètre d’URL.
 const unique=new Set();
 for(const r of [...rows].sort((a,b)=>Number(b.Date_MAJ||0)-Number(a.Date_MAJ||0))){
  const ident=String(r.Cellule_Code||'').trim();
  if(!ident||unique.has(ident))continue;unique.add(ident);
  const card=node('section','rc-cell');
  const title=node('h3',null,'Cellule '+ident);
  const last=node('p','hint','Situation déclarée au '+C.formatDate(r.Date_MAJ)+' · données TEST renseignées et vérifiées par Owner');
  card.append(title,last);
  const fields=[['Dossiers suivis','Nb_Dossiers'],['Nouveaux','Nb_Nouveaux'],['En cours','Nb_En_Cours'],['Clôturés','Nb_Clotures'],['Sans EC désigné','Nb_Sans_EC']];
  const metrics=node('div','rc-metrics');
  for(const [label,key] of fields){const count=positiveCount(r[key]);metrics.append(metric(label,count===null?'—':String(count),'Synthèse autorisée'));}
  card.append(metrics);
  const numbers=fields.map(([,key])=>positiveCount(r[key]));
  if(numbers[0]!==null&&numbers.slice(1,4).every(x=>x!==null)&&numbers.slice(1,4).reduce((a,v)=>a+v,0)!==numbers[0]){
   card.append(node('p','rc-alert','Attention : le total ne correspond pas à la somme des statuts ; vérifier la synthèse avant diffusion.'));
  }
  root.append(card);
 }
 if(!root.childNodes.length)empty(feedback,'Synthèse vide ou invalide. Vérifier le code de cellule.');
 const assign=$('rc-assignment-link');assign.replaceChildren();
 const a=configLink('Dossiers et faits');if(a)assign.append(makeLink('Ouvrir le module des dossiers',a,'inline-link'));else empty(assign,'Module à configurer dans espace-metier-config.js.');
 const org=$('rc-organisation-link');org.replaceChildren();
 const o=configLink('Organisation et habilitations');if(o)org.append(makeLink('Ouvrir le module organisation',o,'inline-link'));else empty(org,'Module à configurer dans espace-metier-config.js.');
}
// V2.6.6 — le référentiel RC est la source de délégation. La synthèse RC ne donne aucun droit.
function activeHabilitation(row){
 const today=Math.floor(Date.now()/86400000)*86400;
 return row&&row.Actif===true&&(!row.Date_Debut||Number(row.Date_Debut)<=today)&&(!row.Date_Fin||Number(row.Date_Fin)>=today);
}
function managedRcCells(){
 if(!Array.isArray(state.rcHabilitations)||!Array.isArray(state.cellules))return [];
 const active=state.rcHabilitations.filter(h=>h.Role==='RC'&&activeHabilitation(h));
 const ownerEmailSet=new Set(active.map(x=>String(x.Email||'').trim().toLowerCase()).filter(Boolean));
 // Un seul compte RC doit être visible via ses ACL. Pour Owner, affichage en consultation;
 // aucune délégation n'est inférée du rôle Owner dans cette fonction.
 if(ownerEmailSet.size!==1)return [];
 const ids=new Set(active.map(x=>Number(x.Cellule)));
 return state.cellules.filter(c=>cellActive(c)&&ids.has(Number(c.id)));
}
// V2.6.9 — création contrôlée d'une cellule par l'administration centrale.
// Le widget ne transmet que Code/Nom ; l'ACL Grist sur SIGMA_CELLULES reste obligatoire.
// V2.7.1 — référentiel cellules : code immuable, nom modifiable, archivage réversible.
// Ne jamais effacer une cellule référencée : l'archivage conserve les identifiants Grist.
function resetCentralCelluleEditor(){
 $('central-cellule-form').reset();$('central-cellule-edit-id').value='';
 $('central-cellule-code').readOnly=false;
 set($('central-cellule-save'),'Créer la cellule');
 $('central-cellule-cancel').hidden=true;
}
function editCentralCellule(c){
 if(!ui.centralAllowed||ui.busy)return;
 $('central-cellule-edit-id').value=String(c.id);
 $('central-cellule-code').value=String(c.Code||'');
 $('central-cellule-code').readOnly=true;
 $('central-cellule-nom').value=String(c.Nom||'');
 set($('central-cellule-save'),'Enregistrer le nom');
 $('central-cellule-cancel').hidden=false;
 $('central-cellule-nom').focus();
}
function renderCentralCellules(){
 const panel=$('central-cellules-panel'),list=$('central-cellules-list'),message=$('central-cellules-message');
 panel.hidden=!ui.centralAllowed;
 if(!ui.centralAllowed)return;
 const available=Array.isArray(state.cellules);
 $('central-cellule-save').disabled=ui.busy||!quickEnabled()||!available;
 list.replaceChildren();
 if(!available){empty(list,'Table SIGMA_CELLULES non accessible. Vérifier les ACL centrales et son existence.');return;}
 const records=[...state.cellules].sort((a,b)=>String(a.Code||'').localeCompare(String(b.Code||''),'fr'));
 for(const c of records){
  const code=String(c.Code||''),name=String(c.Nom||'');
  const el=node('div','record'),info=node('span','record-main');
  info.append(node('strong',null,code||'Code manquant'),node('small',null,(name||'Nom non renseigné')+(cellActive(c)?'':' · ARCHIVÉE')));el.append(info);
  const btn=node('button','btn btn-light','Modifier le nom');btn.type='button';btn.disabled=ui.busy||!quickEnabled();btn.addEventListener('click',()=>editCentralCellule(c));el.append(btn);
  const archive=node('button','btn btn-light',cellActive(c)?'Archiver':'Réactiver');archive.type='button';archive.disabled=ui.busy||!quickEnabled();archive.addEventListener('click',()=>setCelluleArchive(c,cellActive(c)));el.append(archive);
  // Droit de suppression exclusivement pour l'Owner technique. Un Editor AN
  // ne peut jamais obtenir D via une condition de dépendances côté widget.
  if(ui.techOwner){
   const del=node('button','btn btn-light','Supprimer définitivement');del.type='button';
   del.disabled=ui.busy||!quickEnabled()||!CELL_DELETE;
   del.addEventListener('click',()=>deleteCentralCellule(c));el.append(del);
  }
  list.append(el);
 }
 if(!records.length)empty(list,'Aucune cellule enregistrée.');
 if(!message.textContent.trim())set(message,'« Supprimer définitivement » est réservé au compte Owner et uniquement après vérification des dépendances. Sinon, archiver la cellule.');
}
async function saveCentralCellule(event){event.preventDefault();const message=$('central-cellules-message');
 try{
  if(!ui.centralAllowed||ui.busy||!quickEnabled()||!Array.isArray(state.cellules))throw Error('Administration centrale non autorisée ou référentiel cellules inaccessible.');
  const editId=Number($('central-cellule-edit-id').value||0),code=$('central-cellule-code').value.trim().toUpperCase(),nom=$('central-cellule-nom').value.trim();
  if(nom.length<3||nom.length>150)throw Error('Nom : entre 3 et 150 caractères.');
  const previous=editId?state.cellules.find(c=>Number(c.id)===editId):null;
  if(editId&&!previous)throw Error('Cellule à modifier introuvable : actualiser.');
  if(previous){
   if(code!==String(previous.Code||''))throw Error('Code de cellule immuable.');
   if(!cellActive(previous))throw Error('Réactiver la cellule avant de modifier son nom.');
   if(nom===String(previous.Nom||'')){set(message,'Nom inchangé.');return;}
   if(!confirm('Modifier le nom de '+code+' en « '+nom+' » ?'))return;
   ui.busy=true;
   await grist.docApi.applyUserActions([['UpdateRecord',METIER_TABLES.cellules,editId,{Nom:nom}]]);
  }else{
   if(!/^[A-Z][A-Z0-9_\-]{1,39}$/.test(code))throw Error('Code : 2 à 40 caractères, lettres A-Z, chiffres, _ ou -, débutant par une lettre.');
   if(state.cellules.some(c=>String(c.Code||'').trim().toUpperCase()===code))throw Error('Une cellule porte déjà ce code, même si elle est archivée.');
   if(!confirm('Créer la cellule « '+code+' — '+nom+' » dans SIGMA TEST ?'))return;
   ui.busy=true;
   await grist.docApi.applyUserActions([['AddRecord',METIER_TABLES.cellules,null,{Code:code,Nom:nom,Archivee:false}]]);
  }
  resetCentralCelluleEditor();await reload();set(message,previous?'Nom de cellule mis à jour.':'Cellule créée. Elle est disponible pour les habilitations RC.');
 }catch(e){set(message,'Enregistrement de cellule refusé : '+(e?.message||e));}
 finally{ui.busy=false;renderCentralCellules();}
}
async function setCelluleArchive(c,archive){const message=$('central-cellules-message');
 try{
  if(!ui.centralAllowed||ui.busy||!quickEnabled()||!Array.isArray(state.cellules))throw Error('Opération non autorisée.');
  if(!c||!Number.isSafeInteger(Number(c.id)))throw Error('Cellule invalide.');
  if(archive){
   // Empêcher l'archivage d'une cellule utilisée par un dossier/habilitation
   // visible. Un accès partiel aux données sensibles ne doit pas être interprété
   // comme une absence de dépendance.
   if(!Array.isArray(state.dossiers)||!Array.isArray(state.rcHabilitations)||!Array.isArray(state.habilitations))throw Error('Archivage bloqué : vérifier toutes les dépendances avec le compte technique Owner.');
   const tables=[state.dossiers,state.rcHabilitations,state.habilitations];
   if(tables.some(rows=>rows.some(r=>Number(r.Cellule)===Number(c.id))))throw Error('Archivage bloqué : cellule utilisée par un dossier ou une habilitation (même inactive).');
  }
  if(!confirm((archive?'Archiver':'Réactiver')+' '+String(c.Code||'')+' ? '+(archive?'La cellule disparaîtra des nouveaux choix, mais ses données seront conservées.':'Elle pourra être à nouveau sélectionnée.')))return;
  ui.busy=true;
  await grist.docApi.applyUserActions([['UpdateRecord',METIER_TABLES.cellules,Number(c.id),{Archivee:archive}]]);
  await reload();set(message,archive?'Cellule archivée sans suppression des données.':'Cellule réactivée.');
 }catch(e){set(message,'Changement de statut refusé : '+(e?.message||e));}
 finally{ui.busy=false;renderCentralCellules();}
}
async function deleteCentralCellule(c){
 const message=$('central-cellules-message');
 try{
  if(!ui.techOwner||!ui.centralAllowed||ui.busy||!quickEnabled()||!CELL_DELETE)
   throw Error('Suppression physique réservée à l’administration technique (Owner).');
  if(!c||!Number.isSafeInteger(Number(c.id))||Number(c.id)<=0)throw Error('Cellule invalide.');
  ui.busy=true;renderCentralCellules();
  let check;
  try{check=await CELL_DELETE.verify(grist.docApi,c);}
  catch(e){throw Error('Contrôle préalable impossible : '+(e?.message||e));}
  // Confirmation exigeant de recopier le code, pas un simple OK.
  const typed=prompt('Suppression DÉFINITIVE de « '+check.code+' ».\n'+
   'Contrôles effectués : '+check.checkedTables+' table(s), '+check.checkedColumns+' colonne(s) de dépendance.\n'+
   'Cette opération est irréversible et exige un examen des références.\nRecopier exactement le code pour confirmer :','');
  if(typed===null){set(message,'Suppression annulée.');return;}
  if(typed.trim()!==check.code)throw Error('Code de confirmation incorrect. Aucune suppression.');
  // Re-vérification juste avant l’action, réduction (non suppression) de la fenêtre de concurrence.
  await CELL_DELETE.verify(grist.docApi,c);
  await grist.docApi.applyUserActions([['RemoveRecord',METIER_TABLES.cellules,Number(c.id)]]);
  resetCentralCelluleEditor();await reload();
  set(message,'Cellule '+check.code+' supprimée définitivement dans SIGMA TEST.');
 }catch(e){set(message,'Suppression refusée : '+(e?.message||e));}
 finally{ui.busy=false;renderCentralCellules();}
}
function renderCentralHabilitations(){if(!ui.centralAllowed)return;
 const panel=$('central-habilitations-panel'),msg=$('central-rc-message'),sel=$('central-rc-cellule'),list=$('central-rc-list');
 const old=sel.value;sel.replaceChildren(new Option('— Choisir une cellule —',''));
 for(const c of (state.cellules||[]).filter(cellActive))sel.add(new Option(cellLabel(c),String(c.id)));
 if([...sel.options].some(o=>o.value===old))sel.value=old;
 panel.hidden=!Array.isArray(state.rcHabilitations)||!Array.isArray(state.cellules);
 $('central-rc-save').disabled=ui.busy||!quickEnabled()||!Array.isArray(state.rcHabilitations)||!Array.isArray(state.cellules);
 list.replaceChildren();
 if(!Array.isArray(state.rcHabilitations)){empty(list,'Référentiel RC absent ou non accessible.');return;}
 for(const r of state.rcHabilitations){
  const c=(state.cellules||[]).find(c=>Number(c.id)===Number(r.Cellule));
  const el=node('div','record'),info=node('span','record-main');
  info.append(node('strong',null,String(r.Email||'')),node('small',null,cellLabel(c)+' · '+(activeHabilitation(r)?'Active':'Inactive')));el.append(info);
  if(activeHabilitation(r)){const btn=node('button','btn btn-light','Révoquer RC');btn.type='button';btn.disabled=ui.busy||!quickEnabled();btn.addEventListener('click',()=>revokeCentralHabilitation(r));el.append(btn);}
  list.append(el);
 }
 if(!state.rcHabilitations.length)empty(list,'Aucun RC encore habilité.');
 set(msg,'Administration centrale : les administrateurs métier habilités peuvent créer et révoquer les RC selon les ACL Grist.');
}
async function saveCentralHabilitation(event){event.preventDefault();const msg=$('central-rc-message');
 try{
  if(!ui.centralAllowed||!quickEnabled()||ui.busy||!Array.isArray(state.rcHabilitations))throw Error('Administration centrale non autorisée ou référentiel RC indisponible.');
  const cell=Number($('central-rc-cellule').value),c=(state.cellules||[]).find(x=>Number(x.id)===cell&&cellActive(x)),email=$('central-rc-email').value.trim().toLowerCase();
  const motif=$('central-rc-motif').value.trim();
  if(!c||!validEmail(email)||motif.length<8||motif.length>500)throw Error('Cellule, adresse RC ou motif incorrect.');
  const debut=isoToEpoch($('central-rc-debut').value),fin=isoToEpoch($('central-rc-fin').value);
  if(debut&&fin&&debut>fin)throw Error('Dates incompatibles.');
  if(state.rcHabilitations.some(h=>Number(h.Cellule)===cell&&h.Role==='RC'&&String(h.Email||'').trim().toLowerCase()===email&&h.Actif===true&&(!h.Date_Fin||!debut||Number(h.Date_Fin)>=debut)&&(!fin||!h.Date_Debut||fin>=Number(h.Date_Debut))))throw Error('Ce responsable possède déjà une habilitation active sur une période qui se chevauche dans cette cellule.');
  if(!confirm('Habiliter '+email+' comme RC de '+cellLabel(c)+' ?'))return;
  ui.busy=true;
  await grist.docApi.applyUserActions([['AddRecord',METIER_TABLES.rcHabilitations,null,{Email:email,Cellule:cell,Role:'RC',Actif:true,Date_Debut:debut,Date_Fin:fin,Motif:motif}]]);
  $('central-rc-form').reset();await reload();set(msg,'Habilitation RC créée. Vérifier avec le compte concerné.');
 }catch(e){set(msg,'Habilitation centrale refusée : '+(e?.message||e));}finally{ui.busy=false;renderCentralHabilitations();}
}
async function revokeCentralHabilitation(h){const msg=$('central-rc-message');
 try{
  if(!ui.centralAllowed||ui.busy||!quickEnabled()||!activeHabilitation(h))throw Error('Révocation indisponible.');
  const motif=prompt('Motif de retrait du rôle RC (8 à 500 caractères) :','Fin de responsabilité sur la cellule');
  if(motif===null)return;
  if(motif.trim().length<8||motif.trim().length>500)throw Error('Motif de 8 à 500 caractères obligatoire.');
  if(!confirm('Révoquer '+h.Email+' ? Le RC ne pourra plus administrer les EC de cette cellule.'))return;
  ui.busy=true;
  // Les ACL Grist contrôlent U pour les administrateurs centraux habilités.
  // Le motif n'est pas un audit serveur infalsifiable.
  await grist.docApi.applyUserActions([['UpdateRecord',METIER_TABLES.rcHabilitations,Number(h.id),{Actif:false,Motif:motif.trim()}]]);
  await reload();set(msg,'Responsable révoqué. Recontrôler immédiatement les ACL et habilitations EC.');
 }catch(e){set(msg,'Révocation RC refusée : '+(e?.message||e));}finally{ui.busy=false;renderCentralHabilitations();}
}
// V2.7.0 — Le responsable technique peut déléguer la gestion centrale
// sans céder ses droits Owner Grist. La table des administrateurs est Owner-write.
// Gestion technique Owner : correction de motif, réactivation, changement d'adresse
// (avec confirmation forte). Suppression physique volontairement non proposée :
// une habilitation inactive peut être utile à l'audit des décisions passées.
function renderCentralAdmins(){
 const panel=$('central-admins-panel'),list=$('central-admins-list'),message=$('central-admins-message');
 panel.hidden=!ui.techOwner;
 if(!ui.techOwner)return;
 list.replaceChildren();
 const available=Array.isArray(state.adminsCentraux);
 $('central-admin-save').disabled=ui.busy||!quickEnabled()||!available;
 if(!available){empty(list,'Habilitations centrales inaccessibles. Vérifier la table et ses ACL.');return;}
 for(const a of state.adminsCentraux){
  const enabled=a.Actif===true&&a.Role==='AN';
  const el=node('div','record'),info=node('span','record-main');
  info.append(node('strong',null,String(a.Email||'')),node('small',null,enabled?'Administration centrale active':'Habilitation inactive'));
  el.append(info);
  const edit=node('button','btn btn-light','Modifier');edit.type='button';edit.disabled=ui.busy||!quickEnabled();edit.addEventListener('click',()=>editCentralAdmin(a));el.append(edit);
  const statusBtn=node('button','btn btn-light',enabled?'Désactiver':'Réactiver');statusBtn.type='button';statusBtn.disabled=ui.busy||!quickEnabled();statusBtn.addEventListener('click',()=>setCentralAdminStatus(a,!enabled));el.append(statusBtn);
  list.append(el);
 }
 if(!state.adminsCentraux.length)empty(list,'Aucun administrateur central métier habilité.');
 if(!message.textContent.trim())set(message,'Owner technique : modifier, désactiver et réactiver les administrateurs. L’historique est préservé (aucune suppression physique).');
}
function resetCentralAdminEditor(){
 $('central-admin-form').reset();$('central-admin-edit-id').value='';
 set($('central-admin-save'),'Habiliter l’administrateur central');
 $('central-admin-cancel').hidden=true;
}
function editCentralAdmin(a){
 if(!ui.techOwner||ui.busy)return;
 $('central-admin-edit-id').value=String(a.id);
 $('central-admin-email').value=String(a.Email||'');
 $('central-admin-motif').value=String(a.Motif||'');
 set($('central-admin-save'),'Enregistrer les modifications');
 $('central-admin-cancel').hidden=false;
 $('central-admin-motif').focus();
}
async function saveCentralAdmin(event){event.preventDefault();const msg=$('central-admins-message');
 try{
  if(!ui.techOwner||ui.busy||!quickEnabled()||!Array.isArray(state.adminsCentraux))throw Error('Administration technique non autorisée.');
  const editId=Number($('central-admin-edit-id').value||0),email=$('central-admin-email').value.trim().toLowerCase(),motif=$('central-admin-motif').value.trim();
  if(!validEmail(email))throw Error('Adresse professionnelle invalide.');
  if(motif.length<8||motif.length>500)throw Error('Motif obligatoire de 8 à 500 caractères.');
  const before=editId?state.adminsCentraux.find(x=>Number(x.id)===editId):null;
  if(editId&&!before)throw Error('Habilitation à modifier introuvable.');
  if(state.adminsCentraux.some(x=>Number(x.id)!==editId&&String(x.Email||'').trim().toLowerCase()===email))throw Error('Adresse déjà présente dans une autre habilitation.');
  if(before){
   const oldEmail=String(before.Email||'').trim().toLowerCase();
   if(oldEmail===email&&String(before.Motif||'')===motif){set(msg,'Aucune modification.');return;}
   if(!confirm('Modifier l’habilitation de '+oldEmail+' ?'+(oldEmail!==email?' ATTENTION : le changement d’adresse transfère immédiatement le rôle métier à '+email+'.':'')))return;
   ui.busy=true;
   await grist.docApi.applyUserActions([['UpdateRecord',CENTRAL_ADMINS_TABLE,editId,{Email:email,Motif:motif}]]);
  }else{
   if(!confirm('Accorder le profil administrateur central métier à '+email+' ?'))return;
   ui.busy=true;
   await grist.docApi.applyUserActions([['AddRecord',CENTRAL_ADMINS_TABLE,null,{Email:email,Role:'AN',Actif:true,Motif:motif}]]);
  }
  resetCentralAdminEditor();await reload();set(msg,before?'Habilitation centrale modifiée. Recontrôler les accès des comptes concernés.':'Administrateur central habilité. Accès Grist Editor requis.');
 }catch(e){set(msg,'Enregistrement du profil central refusé : '+(e?.message||e));}
 finally{ui.busy=false;renderCentralAdmins();}
}
async function setCentralAdminStatus(row,activate){const msg=$('central-admins-message');
 try{
  if(!ui.techOwner||ui.busy||!quickEnabled()||!row||row.Role!=='AN')throw Error('Gestion centrale non autorisée.');
  if(!confirm((activate?'Réactiver':'Désactiver')+' le rôle central de '+row.Email+' ? Les droits seront modifiés immédiatement.'))return;
  ui.busy=true;
  await grist.docApi.applyUserActions([['UpdateRecord',CENTRAL_ADMINS_TABLE,Number(row.id),{Actif:activate}]]);
  await reload();set(msg,activate?'Habilitation réactivée : vérifier les droits avec le compte concerné.':'Habilitation désactivée : vérifier immédiatement la perte de droits.');
 }catch(e){set(msg,'Changement de statut refusé : '+(e?.message||e));}
 finally{ui.busy=false;renderCentralAdmins();}
}
function renderRCHabilitations(){
 const box=$('rc-habilitations-panel'),sel=$('rc-hab-cellule'),list=$('rc-habilitations-list'),msg=$('rc-hab-message');
 const cells=managedRcCells();box.hidden=!cells.length;
 const prev=sel.value;sel.replaceChildren(new Option('— Choisir une cellule gérée —',''));
 for(const c of cells)sel.add(new Option(cellLabel(c),String(c.id)));
 if([...sel.options].some(o=>o.value===prev))sel.value=prev;
 if(cells.length===1)sel.value=String(cells[0].id);
 const enabled=quickEnabled()&&!ui.busy&&cells.length>0&&Array.isArray(state.habilitations)&&Array.isArray(state.habJournal);
 $('rc-hab-save').disabled=!enabled;list.replaceChildren();
 if(!Array.isArray(state.habilitations)){empty(list,'Habilitations EC indisponibles : vérifier leur lecture RC en ACL.');return;}
 const ids=new Set(cells.map(c=>Number(c.id)));
 const rows=state.habilitations.filter(h=>ids.has(Number(h.Cellule))&&h.Role==='EC');
 for(const h of rows){
  const el=node('div','record');const info=node('span','record-main');info.append(node('strong',null,String(h.Email||'')),node('small',null,cellLabel(state.cellules.find(c=>Number(c.id)===Number(h.Cellule)))+' · '+(activeHabilitation(h)?'Active':'Inactive')));el.append(info);
  if(activeHabilitation(h)){const btn=node('button','btn btn-light','Révoquer');btn.type='button';btn.disabled=!enabled;btn.addEventListener('click',()=>revokeRCHabilitation(h));el.append(btn);}
  list.append(el);
 }
 if(!rows.length)empty(list,'Aucun EC habilité visible dans les cellules gérées.');
 if(!cells.length)set(msg,'Aucune cellule déléguée à votre identité RC : vérifier les habilitations et les ACL.');
}
// V2.8.0.4.2 : une nouvelle période crée toujours une nouvelle ligne.
function ecPeriodConflict(rows,cell,email,debut,fin){
 return rows.some(h=>Number(h.Cellule)===cell&&String(h.Email||'').trim().toLowerCase()===email&&h.Role==='EC'&&h.Actif===true&&
  (!h.Date_Fin||Number(h.Date_Fin)>=debut)&&(!fin||!h.Date_Debut||Number(h.Date_Debut)<=fin));
}
async function saveRCHabilitation(ev){ev.preventDefault();const msg=$('rc-hab-message');
 try{
  if(ui.busy||!quickEnabled()||!Array.isArray(state.habilitations)||!Array.isArray(state.habJournal))throw Error('Référentiel, journal ou écriture indisponible.');
  const cell=Number($('rc-hab-cellule').value),c=managedRcCells().find(x=>Number(x.id)===cell);
  if(!c)throw Error('Cellule non déléguée au RC.');
  const email=$('rc-hab-email').value.trim().toLowerCase(),motif=$('rc-hab-motif').value.trim();
  if(!validEmail(email))throw Error('Adresse EC incorrecte.');
  if(motif.length<8||motif.length>500)throw Error('Motif obligatoire entre 8 et 500 caractères.');
  const today=isoToEpoch(localDate(new Date()));
  const debut=isoToEpoch($('rc-hab-debut').value)||today,fin=isoToEpoch($('rc-hab-fin').value);
  if(debut<today)throw Error('La nouvelle habilitation ne peut pas commencer avant aujourd’hui.');
  if(fin&&debut>fin)throw Error('Date de fin antérieure au début.');
  if(ecPeriodConflict(state.habilitations,cell,email,debut,fin))throw Error('Une habilitation EC active couvre déjà tout ou partie de cette période.');
  if(!confirm('Habiliter '+email+' sur '+cellLabel(c)+' ?'))return;
  ui.busy=true;
  // Relecture avant écriture ; le contrôle ACL Grist reste obligatoire.
  const fresh=C.rows(await grist.docApi.fetchTable(METIER_TABLES.habilitations));
  if(ecPeriodConflict(fresh,cell,email,debut,fin))throw Error('Une habilitation EC active couvre déjà tout ou partie de cette période. Actualisez les données.');
  // Ajout atomique habilitation + événement : référence temporaire Grist.
  await grist.docApi.applyUserActions([
   ['AddRecord',METIER_TABLES.habilitations,-1,{Email:email,Cellule:cell,Role:'EC',Actif:true,Date_Debut:debut,Date_Fin:fin,Motif:motif}],
   ['AddRecord',METIER_TABLES.habJournal,null,{Habilitation:-1,Action:'Creation',Motif:motif,Nouvel_Actif:true}]
  ]);
  $('rc-habilitation-form').reset();await reload();set(msg,'Nouvelle habilitation créée et journalisée. Les anciennes lignes sont conservées. Tester le compte EC authentifié.');
 }catch(e){set(msg,'Habilitation refusée : '+(e?.message||e));}
 finally{ui.busy=false;renderRCHabilitations();}
}
async function revokeRCHabilitation(h){const msg=$('rc-hab-message');
 try{
  if(ui.busy||!quickEnabled()||!activeHabilitation(h)||!managedRcCells().some(c=>Number(c.id)===Number(h.Cellule)))throw Error('Révocation non autorisée.');
  const motif=prompt('Motif de révocation (8 à 500 caractères) :','Fin de mission d’écoute');
  if(motif===null)return;
  if(motif.trim().length<8||motif.trim().length>500)throw Error('Motif requis entre 8 et 500 caractères.');
  if(!confirm('Révoquer '+h.Email+' ? Cette action doit couper ses droits sur la cellule.'))return;
  ui.busy=true;
  // Le journal widget ne remplace pas une preuve serveur obligatoire d’audit pour PROD.
  await grist.docApi.applyUserActions([
   ['UpdateRecord',METIER_TABLES.habilitations,Number(h.id),{Actif:false}],
   ['AddRecord',METIER_TABLES.habJournal,null,{Habilitation:Number(h.id),Action:'Revocation',Motif:motif.trim(),Ancien_Actif:true,Nouvel_Actif:false}]
  ]);
  await reload();set(msg,'Révocation enregistrée. Vérifier immédiatement la disparition des droits EC par API.');
 }catch(e){set(msg,'Révocation refusée : '+(e?.message||e));}finally{ui.busy=false;renderRCHabilitations();}
}
function renderRCAffectations(){
 const form=$('rc-affectation-form'),sel=$('rc-cible'),msg=$('rc-affectation-message'),history=$('rc-demandes');
 const selected=sel.value;sel.replaceChildren(new Option('— Choisir une affectation autorisée —',''));
 history.replaceChildren();
 if(state.rc===null||!state.rc.length){form.hidden=true;set(msg,'Espace réservé aux RC disposant d’une synthèse autorisée.');return;}
 form.hidden=false;
 if(state.rcCibles===null||state.rcDemandes===null){set(msg,'Tables de demandes indisponibles : import et ACL requis. Aucun droit n’est contourné.');$('rc-affectation-save').disabled=true;empty(history,'Historique indisponible.');return;}
 const knownCells=new Set(state.rc.map(x=>String(x.Cellule_Code||'').trim()));
 const candidates=state.rcCibles.filter(x=>x.Eligible===true&&knownCells.has(String(x.Cellule_Code||'').trim())&&Number.isSafeInteger(Number(x.Dossier_ID))&&Number(x.Dossier_ID)>0);
 for(const x of candidates){sel.add(new Option('Cellule '+x.Cellule_Code+' · '+C.dossierLabel(x.Dossier_ID)+' → '+val(x.EC_Email_Cible),String(x.id)));}
 if(candidates.some(x=>String(x.id)===selected))sel.value=selected;
 const can=!!window.SIGMA_ESPACE_CONFIG?.TEST_WRITES_ENABLED&&!ui.busy&&candidates.length>0;
 $('rc-affectation-save').disabled=!can;sel.disabled=!can;$('rc-motif').disabled=!can;
 if(!candidates.length)set(msg,'Aucune combinaison autorisée. Owner doit préparer la table des cibles, après contrôle des habilitations.');else if(msg.classList.contains('error')){}else set(msg,'Choisir une proposition. Owner devra ensuite appliquer ou refuser la demande dans le module de gestion existant.');
 for(const r of [...state.rcDemandes].sort((a,b)=>Number(b.id)-Number(a.id))){
   const cible=state.rcCibles.find(x=>Number(x.id)===Number(r.Cible));
   const desc=cible?'Cellule '+cible.Cellule_Code+' · '+C.dossierLabel(cible.Dossier_ID)+' → '+val(cible.EC_Email_Cible):'Cible non accessible (référence #'+val(r.Cible)+')';
   const wrapper=node('div','record');const left=node('span','record-main');left.append(node('strong',null,'Demande #'+r.id+' · '+desc),node('small',null,'Motif : '+val(r.Motif)+' · Créée par '+val(r.Createur_Email,'non tracé')));const badge=node('span','request-badge '+(r.Statut==='Appliquée'?'done':r.Statut==='Refusée'?'refused':''),val(r.Statut,'En attente'));
   wrapper.append(left,badge);history.append(wrapper);
 }
 if(!state.rcDemandes.length)empty(history,'Aucune demande enregistrée.');
}
async function submitRCAffectation(event){event.preventDefault();if(ui.busy)return;
 const msg=$('rc-affectation-message');msg.classList.remove('error');
 try{
  if(!Array.isArray(state.rc)||!state.rc.length||!Array.isArray(state.rcCibles)||!Array.isArray(state.rcDemandes))throw Error('Données RC indisponibles.');
  if(!window.SIGMA_ESPACE_CONFIG?.TEST_WRITES_ENABLED)throw Error('Écritures de test désactivées.');
  const id=Number($('rc-cible').value),cible=state.rcCibles.find(x=>Number(x.id)===id);
  if(!Number.isSafeInteger(id)||id<=0||!cible||cible.Eligible!==true||!state.rc.some(x=>String(x.Cellule_Code||'')===String(cible.Cellule_Code||'')))throw Error('Proposition non autorisée ou expirée.');
  const motif=$('rc-motif').value.trim();if(motif.length<8||motif.length>500)throw Error('Motif obligatoire entre 8 et 500 caractères.');
  if(state.rcDemandes.some(r=>Number(r.Cible)===id&&r.Statut==='En attente'))throw Error('Une demande en attente existe déjà pour cette proposition.');
  const fresh=C.rows(await grist.docApi.fetchTable(RC_TABLES.cibles));if(!fresh.some(x=>Number(x.id)===id&&x.Eligible===true))throw Error('Proposition désactivée entretemps. Actualiser.');
  if(!confirm('Envoyer cette demande d’affectation ? Le dossier ne sera pas modifié automatiquement.'))return;
  ui.busy=true;$('rc-affectation-save').disabled=true;
  await grist.docApi.applyUserActions([['AddRecord',RC_TABLES.demandes,null,{Cible:id,Motif:motif,Action:'Demande',Statut:'En attente'}]]);
  $('rc-affectation-form').reset();await reload();set(msg,'Demande enregistrée. L’affectation du dossier reste à appliquer par Owner après vérification.');
 }catch(e){msg.classList.add('error');set(msg,'Demande refusée : '+(e?.message||e));}finally{const message=msg.textContent,wasError=msg.classList.contains('error');ui.busy=false;renderRCAffectations();set(msg,message);msg.classList.toggle('error',wasError);}
}
// V2.6.5 : les ACL Grist restent la seule frontière de sécurité.
function localDate(d){const parts=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')];return parts.join('-');}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||''));}
function cellLabel(c){return String(c?.Nom||c?.Code||('Cellule #'+c?.id));}
function isoToEpoch(s){if(!s)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Date invalide.');const date=new Date(s+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==s)throw Error('Date invalide.');return Math.floor(date.getTime()/1000);}
function authorizedEcCells(){
 // Pour un compte métier non central, les lignes RC sont limitées à son identité par ACL.
 // Un RC voit aussi les habilitations des EC de sa cellule : ne jamais en déduire son identité.
 if(ui.centralAllowed||ui.techOwner)return [];
 if(!Array.isArray(state.rcHabilitations)||!Array.isArray(state.habilitations)||!Array.isArray(state.cellules))return null;
 const rc=state.rcHabilitations.filter(h=>h.Role==='RC');
 const ec=state.habilitations.filter(h=>h.Role==='EC');
 const source=rc.length?rc:ec;
 const emails=new Set(source.map(h=>String(h.Email||'')).filter(Boolean));
 if(emails.size!==1)return [];
 const email=[...emails][0];
 if(!validEmail(email))return [];
 const eligible=new Set();
 for(const rows of [rc,ec]){
  const counts=new Map();
  for(const h of rows){
   const id=Number(h.Cellule);
   if(h.Email!==email||!activeHabilitation(h)||!Number.isSafeInteger(id)||id<=0)continue;
   counts.set(id,(counts.get(id)||0)+1);
  }
  for(const [id,n] of counts)if(n===1)eligible.add(id);
 }
 return state.cellules.filter(c=>cellActive(c)&&eligible.has(Number(c.id)));
}
function initFirstContactChoices(){
 const facts=$('new-faits'),discrim=$('new-discriminations');
 if(facts.children.length)return;
 for(const [parent,values,name] of [[facts,MOTIFS,'motif'],[discrim,CRITERES,'critere']]){
  for(const value of values){const label=node('label','check-option');const input=document.createElement('input');input.type='checkbox';input.name=name;input.value=value;label.append(input,node('span',null,value));parent.append(label);}
 }
 facts.addEventListener('change',()=>{$('new-discrimination-box').hidden=!([...facts.querySelectorAll('input:checked')].some(x=>x.value==='Discrimination'));});
}
function renderNewDossier(){
 initFirstContactChoices();
 const sel=$('new-cellule'),old=sel.value;sel.replaceChildren(new Option('— Aucune cellule habilitée —',''));
 const eligible=authorizedEcCells();
 for(const c of eligible||[])sel.add(new Option(cellLabel(c),String(c.id)));
 if([...sel.options].some(o=>o.value===old))sel.value=old;
 if(eligible?.length===1)sel.value=String(eligible[0].id);
 $('new-cellule-wrap').hidden=false;
 set($('new-cellule-info'),eligible?.length===1?'Cellule attribuée automatiquement.':eligible?.length>1?'Plusieurs habilitations actives : sélectionne la cellule concernée.':'Aucune cellule habilitée disponible.');
 const enabled=quickEnabled()&&Array.isArray(eligible)&&eligible.length>0&&Array.isArray(state.dossiers)&&Array.isArray(state.faits)&&Array.isArray(state.discriminations)&&!ui.busy;
 for(const id of ['new-date','new-heure','new-canal','new-cellule','new-auteur','new-objet','new-save'])$(id).disabled=!enabled;
 sel.disabled=!enabled||eligible?.length===1;
 if(!enabled)set($('new-message'),'Création indisponible : vérifier vos habilitations personnelles RC/EC et les ACL. Le cumul avec un rôle central n’est pas encore pris en charge dans ce formulaire.');
}
function selectedValues(container){return [...$(container).querySelectorAll('input:checked')].map(x=>x.value);}
function firstContactActions({cell,stamp,heure,canal,auteur,objet,motifs,criteres,commentaire}){
 if(!Number.isSafeInteger(cell)||cell<1)throw Error('Cellule non autorisée.');
 if(!['Courriel','Téléphone','Présentiel','Courrier','Formulaire','Autre'].includes(canal))throw Error('Canal invalide.');
 if(!['Victime','Témoin','Autre'].includes(auteur))throw Error('Auteur du contact obligatoire.');
 if(!['Signalement','Demande d’écoute','Demande d’information','Demande d’orientation','Autre'].includes(objet))throw Error('Objet initial obligatoire.');
 if(!motifs.length||motifs.some(x=>!MOTIFS.includes(x)))throw Error('Sélectionner au moins un motif valide.');
 if(motifs.includes('Non précisé')&&motifs.length>1)throw Error('« Non précisé » doit être choisi seul.');
 if(motifs.includes('Hors champ')&&motifs.length>1)throw Error('« Hors champ » doit être choisi seul.');
 if(motifs.includes('Discrimination')&&(!criteres.length||criteres.some(x=>!CRITERES.includes(x))))throw Error('Préciser au moins un critère de discrimination.');
 if(!motifs.includes('Discrimination')&&criteres.length)throw Error('Critères de discrimination sans motif correspondant.');
 if(commentaire.length>500)throw Error('Description non nominative limitée à 500 caractères.');
 if(!Number.isSafeInteger(stamp)||stamp<=0)throw Error('Date invalide.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure))throw Error('Heure de saisine obligatoire.');
 const actions=[['AddRecord','SIGMA_V2_DOSSIERS_TEST',-1,{Cellule:cell,Date_Saisine:stamp,Heure_Saisine:heure,Canal:canal,Statut:'Nouveau',Anonyme:true,Auteur_Contact:auteur,Objet_Initial:objet}]];
 const factIds=new Map();
 motifs.forEach((motif,index)=>{
  const factId=-(index+2);factIds.set(motif,factId);
  actions.push(['AddRecord',SIGMA_FAITS_TABLE,factId,{Dossier:-1,Categorie:motif,Commentaire_Non_Nominatif:commentaire}]);
 });
 for(const critere of criteres)actions.push(['AddRecord',SIGMA_DISCRIMINATION_TABLE,null,{Fait:factIds.get('Discrimination'),Critere:critere}]);
 return actions;
}
async function saveNewDossier(ev){ev.preventDefault();const msg=$('new-message');
 try{
  if(!quickEnabled()||ui.busy||!Array.isArray(state.dossiers)||!Array.isArray(state.faits)||!Array.isArray(state.discriminations))throw Error('Tables ou droits indisponibles.');
  const cell=Number($('new-cellule').value),eligible=authorizedEcCells();
  if(!Array.isArray(eligible)||!eligible.some(c=>Number(c.id)===cell))throw Error('Cette cellule ne figure pas dans vos habilitations personnelles RC/EC.');
  const actions=firstContactActions({cell,stamp:isoToEpoch($('new-date').value),heure:$('new-heure').value,canal:$('new-canal').value,auteur:$('new-auteur').value,objet:$('new-objet').value,motifs:selectedValues('new-faits'),criteres:selectedValues('new-discriminations'),commentaire:$('new-faits-commentaire').value.trim()});
  if(!confirm('Créer un dossier TEST et ses '+(actions.filter(a=>a[1]===SIGMA_FAITS_TABLE).length)+' motif(s) ? L’identité du référent RC ou EC sera attribuée par Grist.'))return;
  ui.busy=true;$('new-save').disabled=true;
  // Transaction unique Grist avec IDs temporaires négatifs : aucune création partielle si l'une des ACL refuse.
  // Ne transmettre ni EC_Email ni auteur technique : déclenchement côté Grist sous l'identité réelle.
  if(!historyReady())throw Error('Journal indisponible : création non enregistrée.');
  const initial=Object.fromEntries(initialFields.map(k=>[k,actions[0][3][k]??null]));initial.Faits=actions.filter(a=>a[1]===SIGMA_FAITS_TABLE).map(a=>a[3].Categorie);initial.Criteres=actions.filter(a=>a[1]===SIGMA_DISCRIMINATION_TABLE).map(a=>a[3].Critere);
  await grist.docApi.applyUserActions([...actions,historyAction(-1,'Création du signalement',{},initial)]);
  $('new-dossier-form').reset();initFirstContactChoices();$('new-discrimination-box').hidden=true;
  await reload();set(msg,'Dossier et motifs enregistrés ensemble. Vérifier EC_Email et les faits créés en Grist.');
 }catch(e){set(msg,'Création refusée (aucune ACL ne doit être contournée) : '+(e?.message||e));}
 finally{ui.busy=false;renderNewDossier();}
}
// V2.8.0.4 TEST — préparation uniquement : aucune ACL de lecture du dossier n'est ouverte.
function shareEmails(v){return Array.isArray(v)?v.filter(x=>typeof x==='string'&&validEmail(x)):[];}
function shareIdentity(){
 if(ui.centralAllowed||ui.techOwner||!Array.isArray(state.rcHabilitations)||!Array.isArray(state.habilitations))return '';
 const rc=state.rcHabilitations.filter(h=>h.Role==='RC');
 const emails=[...new Set((rc.length?rc:state.habilitations.filter(h=>h.Role==='EC')).map(h=>h.Email).filter(validEmail))];
 return emails.length===1?emails[0]:'';
}
function shareCandidates(d){
 if(!manageDossier(d)||!d||ui.techOwner||d.EC_Habilite_ACL!==true||!authorizedEcCells()?.some(c=>Number(c.id)===Number(d.Cellule)))return null;
 const c=(state.cellules||[]).find(x=>Number(x.id)===Number(d.Cellule));
 if(!c||!cellActive(c))return null;
 return [...new Set([...shareEmails(c.RC_Emails_ACL),...shareEmails(c.EC_Emails_ACL)])].filter(e=>e!==d.EC_Email).sort();
}
function shareRows(d){return (state.dossierPartages||[]).filter(r=>Number(r.Dossier)===Number(d.id));}
function renderDossierPartages(d){
 const sel=$('dossier-share-email'),list=$('dossier-share-list'),old=sel.value;
 const candidates=shareCandidates(d),rows=shareRows(d),enabled=quickEnabled()&&!ui.busy&&candidates!==null&&Array.isArray(state.dossierPartages);
 sel.replaceChildren(new Option('— Choisir un destinataire —',''));list.replaceChildren();
 for(const email of candidates||[])if(!rows.some(r=>r.Candidat_Valide_ACL===true&&r.Destinataire_Email===email))sel.add(new Option(email,email));
 if([...sel.options].some(o=>o.value===old))sel.value=old;
 $('dossier-share-fields').disabled=!enabled;$('dossier-share-save').disabled=!enabled||sel.options.length<2;
 if(!enabled){empty(list,'Gestion indisponible : référent habilité et table des partages requis.');return;}
 if(!rows.length)empty(list,'Aucun partage préparé.');
 for(const r of C.sorted(rows)){
  const el=item(r.Destinataire_Email,(r.Droit==='Collaboration'?'Collaboration (signalement, faits, rendez-vous, entretiens et documents)':'Consultation')+' · expiration : '+C.formatDate(r.Date_Expiration)+' · '+creationTrace(r,'Auteur_Email')+' · révocation : '+C.formatDate(r.Date_Revocation),r.Actif!==true?'Révoqué':r.Valide_ACL===true?(shareEmails(d.Partages_Lecture_Effective_ACL).includes(r.Destinataire_Email)?'Accessible':'En attente des conditions'):'Invalide');
  if(r.Actif===true){const btn=node('button','btn btn-light','Révoquer');btn.type='button';btn.addEventListener('click',()=>revokeDossierPartage(d,r));el.append(btn);}list.append(el);
 }
}
async function saveDossierPartage(ev){ev.preventDefault();if(ui.busy)return;
 const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(ui.selected)),email=$('dossier-share-email').value,droit=$('dossier-share-right').value,msg=$('dossier-share-message');
 if(!quickEnabled()||!shareCandidates(d)?.includes(email)||!Array.isArray(state.dossierPartages))return;
 if(!['Consultation','Collaboration'].includes(droit)){set(msg,'Niveau d’accès invalide.');return;}
 try{const date=isoToEpoch($('dossier-share-expiration').value);if(date&&date<isoToEpoch(localDate(new Date())))throw Error('Expiration passée.');
 ui.busy=true;renderDossierPartages(d);
 const fresh=C.rows(await grist.docApi.fetchTable(DOSSIER_PARTAGES_TABLE));
 if(fresh.some(r=>Number(r.Dossier)===Number(d.id)&&r.Destinataire_Email===email&&r.Candidat_Valide_ACL===true))throw Error('Partage actif déjà présent.');
 await grist.docApi.applyUserActions([['AddRecord',DOSSIER_PARTAGES_TABLE,null,{Dossier:Number(d.id),Destinataire_Email:email,Droit:droit,Actif:true,Date_Expiration:date}]]);
 $('dossier-share-form').reset();await reload();set(msg,'Partage enregistré. L’accès dépend des conditions de confidentialité et des ACL Grist.');
 }catch(e){set(msg,'Création refusée : '+(e?.message||e));}finally{ui.busy=false;const current=(state.dossiers||[]).find(x=>Number(x.id)===Number(ui.selected));if(current)renderDossierPartages(current);}
}
async function revokeDossierPartage(d,r){if(ui.busy||!quickEnabled()||shareCandidates(d)===null||r.Actif!==true||Number(ui.selected)!==Number(d.id))return;
 if(!confirm('Révoquer le partage de '+r.Destinataire_Email+' ?'))return;
 const msg=$('dossier-share-message');try{ui.busy=true;renderDossierPartages(d);
 await grist.docApi.applyUserActions([['UpdateRecord',DOSSIER_PARTAGES_TABLE,Number(r.id),{Actif:false,Date_Revocation:Math.floor(Date.now()/1000)}]]);
 await reload();set(msg,'Partage révoqué.');
 }catch(e){set(msg,'Révocation refusée : '+(e?.message||e));}finally{ui.busy=false;const current=(state.dossiers||[]).find(x=>Number(x.id)===Number(ui.selected));if(current)renderDossierPartages(current);}
}
function eligibleTransferEmails(){
 // Le référentiel peut être invisible via ACL. Aucun email inventé ni paramètre de contournement.
 const list=state.habilitations;if(!Array.isArray(list))return [];
 const emails=new Set();
 for(const x of list){
  const mail=String(x.EC_Email||x.Email||'').trim().toLowerCase();
  if(!validEmail(mail))continue;
  // Aucun transfert sans champ de validation explicite fourni et contrôlé dans les ACL du référentiel.
  if(x.EC_Habilite_ACL!==true)continue;
  emails.add(mail);
 }
 return [...emails].sort();
}
function renderTransfer(d){const box=$('transfer-section'),sel=$('transfer-cible');box.hidden=!manageDossier(d);if(!manageDossier(d))return;
 const prev=sel.value;sel.replaceChildren(new Option('— Choisir un EC habilité —',''));
 // Le contrôle de cellule est obligatoirement coté Grist. Une liste visible n'autorise jamais un transfert.
 for(const mail of eligibleTransferEmails().filter(e=>e!==String(d.EC_Email||'').toLowerCase()))sel.add(new Option(mail,mail));
 if([...sel.options].some(o=>o.value===prev))sel.value=prev;
 const enabled=window.SIGMA_ESPACE_CONFIG?.ENABLE_DIRECT_TRANSFER_TEST===true&&quickEnabled()&&Array.isArray(state.affectations)&&!ui.busy&&sel.options.length>1;
 $('transfer-save').disabled=!enabled;
 set($('transfer-message'),enabled?'Transfert TEST soumis aux ACL Grist (dossier, EC cible, cellule et historique).':'Transfert direct désactivé jusqu’à validation des règles ACL spécifiques. Utiliser le circuit existant.');
}
async function saveTransfer(ev){ev.preventDefault();const msg=$('transfer-message');
 try{
  if(window.SIGMA_ESPACE_CONFIG?.ENABLE_DIRECT_TRANSFER_TEST!==true||!quickEnabled()||ui.busy)throw Error('Transfert TEST désactivé.');
  const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(ui.selected));if(!manageDossier(d))throw Error('Dossier non modifiable.');
  const target=$('transfer-cible').value.toLowerCase(),motif=$('transfer-motif').value.trim();
  if(!eligibleTransferEmails().includes(target))throw Error('Écoutant non proposé par le référentiel.');
  if(motif.length<8||motif.length>500)throw Error('Motif : 8 à 500 caractères.');
  if(!Array.isArray(state.affectations))throw Error('Historique inaccessible.');
  const fresh=C.rows(await grist.docApi.fetchTable('SIGMA_V2_DOSSIERS_TEST')).find(x=>Number(x.id)===Number(d.id));
  if(!fresh||fresh.EC_Email!==d.EC_Email)throw Error('Dossier modifié : actualiser.');
  if(!confirm('Transférer ce dossier au nouvel EC et enregistrer l’historique ?'))return;
  ui.busy=true;
  const payload=window.SigmaAffectations.prepare(fresh,target,motif,Date.now()/1000);
  await grist.docApi.applyUserActions([payload.update,payload.history]);
  $('transfer-form').reset();ui.selected=null;await reload();set(msg,'Transfert enregistré. Recontrôler les droits des deux EC.');
 }catch(e){set(msg,'Transfert refusé : '+(e?.message||e));}finally{ui.busy=false;const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(ui.selected));if(d)renderTransfer(d);}
}
function appointmentAllowed(r){return Array.isArray(state.dossiers)&&state.dossiers.some(d=>Number(d.id)===Number(r.Dossier));}
function rdvDate(t){return Number.isFinite(Number(t))&&Number(t)>0?new Date(Number(t)*1000):null;}
function formatRdv(t){const d=rdvDate(t);return d?d.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Paris'}):'Date invalide';}
function sortRdv(list){return [...list].sort((a,b)=>Number(a.Debut)-Number(b.Debut));}
function rdvContext(){return ui.tab==='dossiers' ? selectedDossier():null;}
function placeRdvForm(){const panel=$('rdv-editor-panel'),target=ui.tab==='dossiers'?$('dossier-rdv-editor'):$('agenda-rdv-editor');if(panel.parentElement!==target){resetRdv();target.append(panel);}}
function renderDossierRdv(d){placeRdvForm();const root=$('dossier-rdv-list');root.replaceChildren();const hist=$('dossier-rdv-history');hist.replaceChildren();const writable=activityWritable(d);$('dossier-rdv-editor').hidden=!writable;$('rdv-new-from-dossier').hidden=!writable;
 if(!Array.isArray(state.rdv)){empty(root,'Rendez-vous indisponibles.');return;}
 const rows=sortRdv(state.rdv.filter(r=>Number(r.Dossier)===Number(d.id)));if(!rows.length)empty(root,'Aucun rendez-vous.');
 for(const r of rows){root.append(item(formatRdv(r.Debut)+' – '+formatRdv(r.Fin),[r.Modalite,r.Lieu,r.Note_Non_Nominative,rdvTrace(r)].filter(Boolean).join(' · '),val(r.Statut),writable?()=>editRdv(r.id,true):undefined));for(const x of (state.rdvHist||[]).filter(x=>Number(x.RDV)===Number(r.id)))hist.append(item('RDV #'+r.id+' · '+val(x.Action),val(x.Ancien_Statut)+' → '+val(x.Nouveau_Statut)+' · '+formatRdv(x.Nouveau_Debut)+' · Auteur : '+traceEmail(x.Auteur_Email)+' · '+traceDate(x.Date_Action)));}
 if(!hist.children.length)empty(hist,Array.isArray(state.rdvHist)?'Aucun historique accessible.':'Historique indisponible.');
 if(!writable){resetRdv();}if(writable){if(ui.editRdv&&!rows.some(r=>Number(r.id)===Number(ui.editRdv)))resetRdv();renderAgenda();}
}
function resetRdv(){ui.editRdv=null;$('rdv-form').reset();set($('rdv-message'),'');set($('rdv-form-title'),'Nouveau rendez-vous');$('rdv-save').textContent='Enregistrer le rendez-vous';}
function editRdv(id,inDossier=false){const r=(state.rdv||[]).find(x=>Number(x.id)===Number(id));if(!r||!appointmentAllowed(r)||!activityWritable(dossierById(r.Dossier)))return;
 if(!inDossier)nav('agenda');ui.editRdv=id;$('rdv-dossier').value=String(r.Dossier);$('rdv-dossier').disabled=true;
 for(const [id,k] of [['rdv-modalite','Modalite'],['rdv-statut','Statut'],['rdv-lieu','Lieu'],['rdv-note','Note_Non_Nominative']])$(id).value=String(r[k]||'');
 const paris=(ts)=>{const d=rdvDate(ts);if(!d)return '';const x=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);return x.replace(' ','T');};
 $('rdv-debut').value=paris(r.Debut);$('rdv-fin').value=paris(r.Fin);
 set($('rdv-form-title'),'Modifier le rendez-vous #'+id);$('rdv-save').textContent='Enregistrer la modification';updateRdvSaveControl();$('rdv-form').scrollIntoView?.({block:'start',behavior:'smooth'});
}
function parisStamp(s){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))throw Error('Date/heure invalide.');
 const [year,month,day,hour,min]=s.match(/\d+/g).map(Number);
 const naive=Date.UTC(year,month-1,day,hour,min);if(!Number.isFinite(naive))throw Error('Date invalide.');
 const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const candidates=[1,2].map(offset=>naive-offset*3600000).filter(timestamp=>fmt.format(new Date(timestamp)).replace(' ','T')===s);
 if(candidates.length!==1)throw Error(candidates.length?'Heure ambiguë au passage à l’heure d’hiver. Choisir une autre heure.':'Heure inexistante ou date invalide à Paris.');
 return Math.floor(candidates[0]/1000);
}
function fmtParisDate(ts){const d=new Date(ts);return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short'}).format(d);}
function dateBounds(date,mode){let [y,m,d]=date.split('-').map(Number);let first=new Date(Date.UTC(y,m-1,d));if(Number.isNaN(first.getTime()))return null;
 if(mode==='semaine')first.setUTCDate(first.getUTCDate()-(first.getUTCDay()+6)%7);
 if(mode==='mois')first.setUTCDate(1);
 const last=new Date(first);if(mode==='jour')last.setUTCDate(last.getUTCDate()+1);else if(mode==='semaine')last.setUTCDate(last.getUTCDate()+7);else last.setUTCMonth(last.getUTCMonth()+1);
 const key=x=>x.toISOString().slice(0,10);
 return {begin:parisStamp(key(first)+'T00:00'),end:parisStamp(key(last)+'T00:00'),first:last&&first,last};
}

function updateRdvSaveControl(){const ds=$('rdv-dossier');$('rdv-save').disabled=!quickEnabled()||!Array.isArray(state.rdv)||!Array.isArray(state.rdvHist)||!Array.isArray(state.dossiers)||ui.busy||!activityWritable(dossierById(ds.value));}
function renderAgenda(){if(ui.tab==='agenda')placeRdvForm();const root=$('agenda-list');root.replaceChildren();const ds=$('rdv-dossier'),prev=ds.value;ds.replaceChildren(new Option('— Choisir un dossier accessible —',''));
 for(const d of (state.dossiers||[]).filter(d=>activityWritable(d)&&(!rdvContext()||Number(d.id)===Number(rdvContext().id))))ds.add(new Option(C.dossierLabel(d.id)+' · '+val(d.Statut),String(d.id)));
 if([...ds.options].some(o=>o.value===prev))ds.value=prev;
 if(ui.editRdv){const r=(state.rdv||[]).find(x=>Number(x.id)===Number(ui.editRdv));if(r)ds.value=String(r.Dossier);}
 if(rdvContext()&&activityWritable(rdvContext()))ds.value=String(rdvContext().id);ds.disabled=!!rdvContext()||!!ui.editRdv||!quickEnabled();updateRdvSaveControl();
 if(state.rdv===null){empty(root,'Table des rendez-vous indisponible : vérifier import et ACL.');return;}
 const date=$('agenda-date').value||localDate(new Date()),mode=$('agenda-mode').value;
 let range;try{range=dateBounds(date,mode);}catch(e){set($('agenda-period'),'Date invalide : '+e.message);return;}if(!range)return;
 const rows=sortRdv(state.rdv.filter(r=>appointmentAllowed(r)&&Number(r.Debut)<range.end&&Number(r.Fin)>=range.begin));
 set($('agenda-period'),fmtParisDate(range.begin)+' — '+fmtParisDate((range.end-1)*1000)+' · '+rows.length+' rendez-vous');
 if(!rows.length)empty(root,'Aucun rendez-vous accessible sur cette période.');
 for(const r of rows)root.append(item(formatRdv(r.Debut)+' → '+new Date(Number(r.Fin)*1000).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}),C.dossierLabel(r.Dossier)+' · '+(ownDossier(dossierById(r.Dossier))?'Personnel':collaborateDossier(dossierById(r.Dossier))?'Collaboration':'Consultation')+' · '+val(r.Modalite)+' · '+val(r.Lieu,'Lieu non précisé')+' · '+rdvTrace(r),val(r.Statut,'Prévu'),activityWritable(dossierById(r.Dossier))?()=>editRdv(r.id):()=>showDossier(r.Dossier,'rdv')));
}
function shiftAgenda(delta){const d=new Date(($('agenda-date').value||localDate(new Date()))+'T12:00:00');const mode=$('agenda-mode').value;if(mode==='jour')d.setDate(d.getDate()+delta);else if(mode==='semaine')d.setDate(d.getDate()+7*delta);else d.setMonth(d.getMonth()+delta);$('agenda-date').value=localDate(d);renderAgenda();}
async function saveRdv(ev){ev.preventDefault();const msg=$('rdv-message');
 try{if(!quickEnabled()||ui.busy||!Array.isArray(state.rdv)||!Array.isArray(state.rdvHist))throw Error('Rendez-vous/historique non accessibles.');
 const dossier=Number($('rdv-dossier').value);if(!Number.isSafeInteger(dossier)||!activityWritable(dossierById(dossier)))throw Error('Dossier non accessible.');
 const start=parisStamp($('rdv-debut').value),end=parisStamp($('rdv-fin').value);
 if(end<=start||end-start>12*3600)throw Error('Fin après début et durée maximale de 12 heures.');
 const modalite=$('rdv-modalite').value,statut=$('rdv-statut').value,validModes=['Présentiel','Téléphone','Visioconférence','Autre'],validStats=['Prévu','Confirmé','Reporté','Annulé','Terminé'];
 if(!validModes.includes(modalite)||!validStats.includes(statut))throw Error('Modalité ou statut invalide.');
 const lieu=$('rdv-lieu').value.trim(),note=$('rdv-note').value.trim();if(lieu.length>120||note.length>500)throw Error('Champ trop long.');
 const record={Dossier:dossier,Debut:start,Fin:end,Modalite:modalite,Statut:statut,Lieu:lieu,Note_Non_Nominative:note};
 const old=ui.editRdv?(state.rdv||[]).find(x=>Number(x.id)===Number(ui.editRdv)):null;
 if(ui.editRdv&&!old)throw Error('Rendez-vous modifié ou inaccessible.');
 if(old&&Number(old.Dossier)!==dossier)throw Error('Changement de dossier interdit.');
 if(old){const fresh=C.rows(await grist.docApi.fetchTable(METIER_TABLES.rdv)).find(r=>Number(r.id)===Number(old.id));
  if(!fresh||['Debut','Fin','Statut','Modalite','Dossier','Lieu','Note_Non_Nominative'].some(k=>String(fresh[k])!==String(old[k])))throw Error('Rendez-vous modifié entretemps : actualiser.');}
 if(!confirm(old?'Enregistrer le changement de rendez-vous et son historique ?':'Créer ce rendez-vous fictif ?'))return;
 ui.busy=true;
 const {Dossier:unchangedDossier,...changes}=record;
 const actions=old?[['UpdateRecord',METIER_TABLES.rdv,old.id,changes],['AddRecord',METIER_TABLES.rdvHist,null,{RDV:old.id,Action:'Modification',Ancien_Debut:Number(old.Debut),Ancien_Fin:Number(old.Fin),Ancien_Statut:String(old.Statut||''),Nouveau_Debut:start,Nouveau_Fin:end,Nouveau_Statut:statut}]]:[['AddRecord',METIER_TABLES.rdv,null,record]];
 await grist.docApi.applyUserActions(actions);resetRdv();await reload();set(msg,'Rendez-vous enregistré par Grist.');
 }catch(e){set(msg,'Rendez-vous refusé : '+(e?.message||e));}finally{ui.busy=false;renderAgenda();if(ui.tab==='dossiers'&&selectedDossier())renderDossierRdv(selectedDossier());}
}

// V2.8.0.5.4 — Composition : ACL Grist distinctes des habilitations d’accès.
const MEMBER_TABLE='SIGMA_MEMBRES_CELLULE', MEMBER_HISTORY='SIGMA_V2_MEMBRES_HISTORIQUE_TEST';
const memberFields=[
 ['Nom','Nom','text',true],['Prenom','Prénom','text',true],['Genre','Genre','select',false,['Femme','Homme','Non binaire','Non renseigné']],
 ['Fonction','Fonction','select',true,['Médecin/Infirmier','RH','Référent égalité','Psychologue','Assistant social','Autre']],['Role','Rôle dans la cellule','text',true],['Statut_Professionnel','Statut professionnel','text',false],['Email_Professionnel','Courriel professionnel','email',false],['Telephone_Professionnel','Téléphone professionnel','tel',false],
 ['Date_Entree','Date d’entrée','date',true],['Date_Sortie','Date de sortie (dernier jour inclus)','date',false],['Quotite','Temps consacré / quotité','number',false],['Unite_Quotite','Unité','select',false,['ETP','Heures/semaine','Jours/an','Autre']],['Periode_Quotite','Période de référence','text',false],['Formation_Recue','Formation reçue','checkbox',false],['Date_Formation_Prealable','Date de formation préalable','date',false],['Date_Derniere_Formation','Date de dernière formation continue','date',false],['Formations_Details','Formations suivies / précisions','textarea',false],['Besoins_Formation','Besoins de formation','textarea',false]
];
let compositionEdit=null;
function compositionCells(){return (state.cellules||[]).filter(c=>c.Archivee===false&&(ui.techOwner||c.Composition_Lecture_UI_ACL===true));}
function compositionCanWrite(c){return Boolean(c&&c.Archivee===false&&!ui.techOwner&&c.Composition_RC_UI_ACL===true&&quickEnabled()&&Array.isArray(state.membres)&&Array.isArray(state.membresHist));}
function refreshCompositionNavigation(){const allowed=compositionCells().length>0;const b=document.querySelector('[data-tab="composition"]');b.hidden=!allowed;b.disabled=!allowed;if(!allowed&&ui.tab==='composition'){closeComposition();nav('accueil');}}
function memberName(r){return [r.Prenom,r.Nom].filter(Boolean).join(' ')||r.Nom_Fonction||'Fiche à compléter';}
function memberStatus(r,today){if(!r.Nom||!r.Prenom||!r.Date_Entree)return 'À compléter';if(Number(r.Date_Entree)>today)return 'À venir';if(r.Date_Sortie&&Number(r.Date_Sortie)<today)return 'Ancien membre';return 'Actif';}
function memberSnapshot(r){return r?Object.fromEntries(['Cellule','Nom_Fonction',...memberFields.map(f=>f[0])].map(k=>[k,r[k]??null])):{};}
function memberFingerprint(r){return JSON.stringify(memberSnapshot(r));}
function memberDateInput(v){if(!v)return '';const d=new Date(Number(v)*1000);return Number.isFinite(d.valueOf())?d.toISOString().slice(0,10):'';}
function memberPayload(cell,values){const data={Cellule:Number(cell)};if(!Number.isSafeInteger(data.Cellule)||data.Cellule<=0)throw Error('Cellule invalide.');
 for(const [key,label,type,required,options] of memberFields){let v=values[key];if(type==='checkbox')v=v===true;else if(type==='date')v=isoToEpoch(String(v||''));else if(type==='number'){v=v===''||v==null?0:Number(v);if(!Number.isFinite(v)||v<0)throw Error('Quotité invalide.');}else{v=String(v??'').trim();if(v.length>(type==='textarea'?1000:200))throw Error(label+' trop long.');if(options&&v&&!options.includes(v))throw Error(label+' invalide.');if(type==='email'&&v&&!validEmail(v))throw Error('Courriel professionnel invalide.');}if(required&&!v)throw Error(label+' obligatoire.');data[key]=v;}
 if(data.Date_Sortie&&data.Date_Sortie<data.Date_Entree)throw Error('La date de sortie précède la date d’entrée.');
 if(data.Quotite>0&&!data.Unite_Quotite)throw Error('Préciser l’unité de quotité.');
 if(data.Unite_Quotite==='ETP'&&data.Quotite>1)throw Error('ETP compris entre 0 et 1 (ex. 0,2).');
 if(data.Date_Formation_Prealable&&data.Date_Derniere_Formation&&data.Date_Derniere_Formation<data.Date_Formation_Prealable)throw Error('Dates de formation incohérentes.');
 data.Nom_Fonction=data.Prenom+' '+data.Nom;return data;
}
function closeComposition(){compositionEdit=null;$('composition-editor').hidden=true;$('composition-fields').replaceChildren();}
function openComposition(row){const cell=compositionCells().find(c=>Number(c.id)===Number($('composition-cell').value));if(ui.busy||!compositionCanWrite(cell)||row&&Number(row.Cellule)!==Number(cell.id))return;if(compositionEdit&&!confirm('Abandonner la saisie en cours ?'))return;
 compositionEdit={cell:Number(cell.id),id:row?Number(row.id):null,fingerprint:row?memberFingerprint(row):null};const root=$('composition-fields');root.replaceChildren();set($('composition-title'),row?'Modifier la fiche membre #'+row.id:'Nouveau membre');
 for(const [key,label,type,required,options] of memberFields){const wrap=node('label','field',label+(required?' *':''));const el=node(type==='select'?'select':type==='textarea'?'textarea':'input');el.name=key;el.required=required;if(type==='select'){el.add(new Option('— Non renseigné —',''));for(const v of options)el.add(new Option(v,v));if(row?.[key]&&!options.includes(row[key]))el.add(new Option(row[key]+' (ancienne valeur)',row[key]));}else if(type==='textarea'){el.rows=3;el.maxLength=1000;}else{el.type=type;if(type==='number'){el.min='0';el.step='any';}else if(type!=='date'&&type!=='checkbox')el.maxLength=200;}
 if(type==='checkbox')el.checked=row?.[key]===true;else el.value=type==='date'?memberDateInput(row?.[key]):String(row?.[key]??'');wrap.append(el);root.append(wrap);}
 $('composition-editor').hidden=false;$('composition-editor').scrollIntoView?.({block:'start'});}
function renderComposition(){const cells=compositionCells(),sel=$('composition-cell'),prev=sel.value;sel.replaceChildren();for(const c of cells)sel.add(new Option(cellLabel(c),String(c.id)));if(cells.some(c=>String(c.id)===prev))sel.value=prev;const cell=cells.find(c=>Number(c.id)===Number(sel.value));const writable=compositionCanWrite(cell),root=$('composition-list'),hist=$('composition-history');root.replaceChildren();hist.replaceChildren();$('composition-metrics').replaceChildren();$('composition-new').hidden=!writable;$('composition-new').disabled=ui.busy;$('composition-history-panel').hidden=!cell||!(writable||ui.techOwner);set($('composition-mode'),writable?'Responsable de cellule · création et modification':cell?'Lecture seule · données autorisées':'Aucune cellule accessible.');
 if(!cell||!Array.isArray(state.membres)){empty(root,'Répertoire indisponible ou accès non autorisé.');return;}
 const today=isoToEpoch(localDate(new Date())),rows=state.membres.filter(r=>Number(r.Cellule)===Number(cell.id));const active=rows.filter(r=>memberStatus(r,today)==='Actif');$('composition-metrics').append(metric('Membres actifs',String(active.length),'À la date du jour'),metric('Formation reçue',String(active.filter(r=>r.Formation_Recue===true).length),'Membres actifs'),metric('Autres fiches visibles',String(rows.length-active.length),'Anciennes, futures ou incomplètes'));
 const term=$('composition-search').value.trim().toLocaleLowerCase('fr');const filtered=rows.filter(r=>[memberName(r),r.Fonction,r.Role].join(' ').toLocaleLowerCase('fr').includes(term));for(const r of filtered.sort((a,b)=>memberName(a).localeCompare(memberName(b),'fr'))){const el=node('div','record'),info=node('div','record-main');info.append(node('strong',null,memberName(r)),node('small',null,[r.Fonction,r.Role,r.Statut_Professionnel].filter(Boolean).join(' · ')||'Fonction non renseignée'),node('small',null,'Entrée : '+C.formatDate(r.Date_Entree)+' · Sortie : '+C.formatDate(r.Date_Sortie)),node('small',null,'Quotité : '+(r.Unite_Quotite?String(r.Quotite??0)+' '+r.Unite_Quotite:'Non renseignée')+(r.Periode_Quotite?' · '+r.Periode_Quotite:'')),node('small',null,'Formation : '+(r.Formation_Recue===true?'Oui':'Non renseignée ou non reçue')));const details=node('details');details.append(node('summary',null,'Informations complémentaires'));for(const [key,label,type] of memberFields){if(['Nom','Prenom','Fonction','Role','Statut_Professionnel','Date_Entree','Date_Sortie','Quotite','Unite_Quotite','Periode_Quotite','Formation_Recue'].includes(key))continue;details.append(node('small',null,label+' : '+(type==='date'?C.formatDate(r[key]):val(r[key]))));}info.append(details);el.append(info);const aside=node('div','record-aside');aside.append(chip(memberStatus(r,today)));if(writable){const b=node('button','btn btn-light','Modifier');b.type='button';b.disabled=ui.busy;b.addEventListener('click',()=>openComposition(r));aside.append(b);}el.append(aside);root.append(el);}if(!filtered.length)empty(root,'Aucun membre correspondant.');
 if(!$('composition-history-panel').hidden){if(!Array.isArray(state.membresHist)){empty(hist,'Journal indisponible : écriture bloquée.');return;}const logs=state.membresHist.filter(r=>Number(r.Cellule_ACL)===Number(cell.id)).sort((a,b)=>Number(b.id)-Number(a.id));for(const r of logs){const block=node('div','record'),info=node('div','record-main');info.append(node('strong',null,val(r.Action)+' · Membre #'+r.Membre),node('small',null,traceEmail(r.Auteur_Email)+' · '+traceDate(r.Date_Action)));const det=node('details');det.append(node('summary',null,'Valeurs avant / après'));try{const before=JSON.parse(r.Avant_JSON),after=JSON.parse(r.Apres_JSON);for(const [key,label,type] of memberFields){if(JSON.stringify(before[key]??null)===JSON.stringify(after[key]??null))continue;const fmt=v=>type==='date'?C.formatDate(v):typeof v==='boolean'?(v?'Oui':'Non'):val(v);det.append(node('small',null,label+' : '+fmt(before[key])+' → '+fmt(after[key])));}}catch{det.append(node('small',null,'Détail non lisible.'));}info.append(det);block.append(info);hist.append(block);}if(!logs.length)empty(hist,'Aucune modification journalisée.');}
}
async function saveComposition(ev){ev.preventDefault();if(ui.busy||!compositionEdit)return;const snapshot=compositionEdit,msg=$('composition-message');const cell=compositionCells().find(c=>Number(c.id)===snapshot.cell);if(!compositionCanWrite(cell)){set(msg,'Écriture non autorisée. Actualiser.');return;}try{const values=Object.fromEntries([...$('composition-fields').querySelectorAll('[name]')].map(el=>[el.name,el.type==='checkbox'?el.checked:el.value]));const data=memberPayload(snapshot.cell,values);ui.busy=true;$('composition-save').disabled=true;const [rawCells,rawMembers]=await Promise.all([grist.docApi.fetchTable('SIGMA_CELLULES'),grist.docApi.fetchTable(MEMBER_TABLE)]);const freshCell=C.rows(rawCells).find(c=>Number(c.id)===snapshot.cell);if(!compositionCanWrite(freshCell))throw Error('Habilitation RC ou cellule devenue indisponible.');const fresh=snapshot.id?C.rows(rawMembers).find(r=>Number(r.id)===snapshot.id):null;if(snapshot.id&&(!fresh||memberFingerprint(fresh)!==snapshot.fingerprint))throw Error('Fiche modifiée ou devenue inaccessible : actualiser avant de reprendre.');if(fresh&&memberFingerprint(fresh)===memberFingerprint(data)){set(msg,'Aucune modification.');return;}
 const {Cellule,...fields}=data;const id=snapshot.id||-1;const actions=[fresh?['UpdateRecord',MEMBER_TABLE,id,fields]:['AddRecord',MEMBER_TABLE,id,data],['AddRecord',MEMBER_HISTORY,null,{Membre:id,Action:fresh?'Correction':'Création',Avant_JSON:JSON.stringify(memberSnapshot(fresh)),Apres_JSON:JSON.stringify(memberSnapshot(data))}]];await grist.docApi.applyUserActions(actions);closeComposition();await reload();set(msg,'Fiche membre enregistrée et journalisée.');}catch(e){set(msg,'Enregistrement refusé : '+(e?.message||e));}finally{ui.busy=false;$('composition-save').disabled=false;renderComposition();}}
function initComposition(){$('composition-cell').addEventListener('change',()=>{closeComposition();set($('composition-message'),'');renderComposition();});$('composition-search').addEventListener('input',renderComposition);$('composition-new').addEventListener('click',()=>openComposition());$('composition-cancel').addEventListener('click',closeComposition);$('composition-form').addEventListener('submit',saveComposition);}


// V2.8.0.5.5 : identités séparées, chargées uniquement dans leur onglet.
const PERSON_TABLE='SIGMA_V2_PERSONNES_TEST', PERSON_LOG='SIGMA_V2_PERSONNES_HISTORIQUE_TEST';
const PERSON_ROLES=['Déclarant','Victime','Témoin','Personne mise en cause','Autre'];
const PERSON_FIELDS=[
 ['Nom','Nom','text',120],['Prenom','Prénom','text',120],
 ['Genre','Genre',['Femme','Homme','Autre (à préciser)','Non connue']],['Precision_Genre','Précision du genre','text',120],
 ['Categorie','Catégorie professionnelle',['A+','A','B','C','Autre (à préciser)','Non connue']],['Precision_Categorie','Précision de la catégorie','text',120],
 ['Qualite_Professionnelle','Qualité professionnelle',['Fonctionnaire','Contractuelle','Stagiaire','Apprenti','Retraitée',"Ancien personne ayant quitté le ministère depuis moins d'un an",'Étudiant/usager','Autre (à préciser)','Non connue']],['Precision_Qualite','Précision de la qualité','text',120],
 ['Age','Tranche d’âge',['<30 ans','30-39 ans','40-49 ans','50 et plus','Non connue']],
 ['Lieu_Activite','Lieu d’activité','text',250],['Departement','Département (code ou libellé)','text',100],
 ['Courriel','Courriel','email',254],['Telephone','Téléphone','tel',50],
 ['Relation_Hierarchique','Relation de la personne mise en cause',['Supérieur(e) hiérarchique','Collègue','Autre (à préciser)']],['Precision_Relation','Précision de la relation','text',120]
];
let personRows=[],personLogs=[],personSeq=0,personEdit=null,personLoaded=false;
const personList=v=>Array.isArray(v)?v.filter(x=>x!=='L'):[];
const personWritable=d=>Boolean(initialWritable(d));
function personSnapshot(r){return Object.fromEntries([['Qualites',PERSON_ROLES.filter(x=>personList(r?.Qualites).includes(x))],...PERSON_FIELDS.map(([k])=>[k,String(r?.[k]??'')])]);}
function personFingerprint(r){return JSON.stringify(personSnapshot(r));}
function personPayload(raw){const roles=PERSON_ROLES.filter(x=>personList(raw.Qualites).includes(x));if(!roles.length)throw Error('Sélectionnez au moins une qualité dans le dossier.');const out={Qualites:['L',...roles]};for(const [k,label,type,max] of PERSON_FIELDS){const v=String(raw[k]??'').trim();if(Array.isArray(type)){if(v&&!type.includes(v))throw Error(label+' : modalité invalide.');}else if(v.length>max)throw Error(label+' : longueur excessive.');out[k]=v;}if(!out.Genre)throw Error('Renseignez le genre ou Non connue.');for(const [k,p] of [['Genre','Precision_Genre'],['Categorie','Precision_Categorie'],['Qualite_Professionnelle','Precision_Qualite'],['Relation_Hierarchique','Precision_Relation']]){if(out[k]==='Autre (à préciser)'&&!out[p])throw Error('Précision obligatoire : '+k);if(out[k]!=='Autre (à préciser)')out[p]='';}if(!roles.includes('Personne mise en cause')){out.Relation_Hierarchique='';out.Precision_Relation='';}return out;}
function closePerson(){personEdit=null;const dlg=$('person-dialog');if(dlg.open)dlg.close();$('person-form').reset();set($('person-feedback'),'');}
function clearPersons(){personSeq++;personLoaded=false;personRows=[];personLogs=[];closePerson();$('person-list').replaceChildren();$('person-add').hidden=true;set($('person-status'),'');}
function renderPersons(){const root=$('person-list');root.replaceChildren();const d=selectedDossier();const writable=personLoaded&&personWritable(d);$('person-add').hidden=!writable;if(!personLoaded)return;for(const r of personRows){const card=node('div','record'),info=node('div','record-main');info.append(node('strong',null,'Personne #'+r.id+' · '+([r.Prenom,r.Nom].filter(Boolean).join(' ')||'Identité non renseignée')),node('small',null,personList(r.Qualites).join(' · ')));for(const [k,label] of PERSON_FIELDS){if(!['Nom','Prenom'].includes(k)&&r[k])info.append(node('small',null,label+' : '+r[k]));}info.append(node('small',null,'Créé par : '+traceEmail(r.Createur_Email)+' · '+traceDate(r.Date_Creation)));const log=personLogs.filter(x=>Number(x.Personne)===Number(r.id)&&x.Action==='Correction').sort((a,b)=>Number(b.id)-Number(a.id))[0];if(log)info.append(node('small',null,'Dernière correction journalisée : '+traceEmail(log.Auteur_Email)+' · '+traceDate(log.Date_Action)+' · '+val(log.Champs)));card.append(info);if(writable){const b=node('button','btn btn-light','Modifier');b.type='button';b.addEventListener('click',()=>openPerson(r));card.append(b);}root.append(card);}if(!personRows.length)empty(root,'Aucune fiche personne accessible. Une saisine peut rester anonyme.');}
async function loadPersons(){clearPersons();const d=selectedDossier();if(!d||ui.tab!=='dossiers'||ui.detailTab!=='personnes')return;const id=Number(d.id),seq=personSeq;set($('person-status'),'Chargement des informations autorisées…');try{const [ds,ps,ls]=await Promise.all([grist.docApi.fetchTable(C.TABLES.dossiers),grist.docApi.fetchTable(PERSON_TABLE),grist.docApi.fetchTable(PERSON_LOG)]);if(seq!==personSeq||ui.tab!=='dossiers'||ui.detailTab!=='personnes'||Number(ui.selected)!==id)return;const fresh=C.rows(ds).find(x=>Number(x.id)===id);if(!fresh)throw Error('Dossier inaccessible.');const fields=['Dossier','Qualites','Createur_Email','Date_Creation',...PERSON_FIELDS.map(x=>x[0])];if(fields.some(k=>!Array.isArray(ps[k])))throw Error('Configuration des personnes indisponible.');personRows=C.rows(ps).filter(r=>Number(r.Dossier)===id);personLogs=C.rows(ls).filter(r=>personRows.some(p=>Number(p.id)===Number(r.Personne)));personLoaded=true;set($('person-status'),'Informations nominatives protégées par les ACL. Ne pas les recopier dans les champs non nominatifs.');renderPersons();$('person-add').hidden=!personWritable(fresh);}catch(e){if(seq===personSeq){clearPersons();set($('person-status'),'Données indisponibles ou accès refusé. Vérifiez la configuration et les habilitations.');}}}
function openPerson(r=null){const d=selectedDossier();if(!personLoaded||!personWritable(d)||ui.busy)return;personEdit={id:r?.id||0,dossier:d.id,fingerprint:r?personFingerprint(r):''};$('person-form').reset();for(const el of $('person-fields').querySelectorAll('[name]')){if(el.name==='Qualites')el.checked=personList(r?.Qualites).includes(el.value);else el.value=String(r?.[el.name]??(el.name==='Genre'?'Non connue':''));}set($('person-feedback'),'');$('person-dialog').showModal();}
async function savePerson(ev){ev.preventDefault();if(ui.busy||!personEdit||!personWritable(selectedDossier()))return;const snap=personEdit;try{const raw={Qualites:[]};for(const el of $('person-fields').querySelectorAll('[name]')){if(el.name==='Qualites'){if(el.checked)raw.Qualites.push(el.value);}else raw[el.name]=el.value;}const payload=personPayload(raw);ui.busy=true;$('person-save').disabled=true;$('person-fields').disabled=true;const [ds,ps]=await Promise.all([grist.docApi.fetchTable(C.TABLES.dossiers),grist.docApi.fetchTable(PERSON_TABLE)]);const freshD=C.rows(ds).find(d=>Number(d.id)===Number(snap.dossier));if(!personWritable(freshD)||Number(ui.selected)!==Number(snap.dossier)||personEdit!==snap)throw Error('Droits ou dossier modifiés. Actualisez.');const fresh=snap.id?C.rows(ps).find(r=>Number(r.id)===Number(snap.id)&&Number(r.Dossier)===Number(snap.dossier)):null;if(snap.id&&(!fresh||personFingerprint(fresh)!==snap.fingerprint))throw Error('Fiche modifiée ou inaccessible. Actualisez.');const changes=Object.keys(payload).filter(k=>!fresh||JSON.stringify(personSnapshot(fresh)[k])!==JSON.stringify(personSnapshot(payload)[k]));if(!changes.length){closePerson();set($('person-status'),'Aucune modification.');return;}const id=snap.id||-1;const actions=[fresh?['UpdateRecord',PERSON_TABLE,id,Object.fromEntries(changes.map(k=>[k,payload[k]]))]:['AddRecord',PERSON_TABLE,id,{Dossier:snap.dossier,...payload}],['AddRecord',PERSON_LOG,null,{Personne:id,Action:fresh?'Correction':'Création',Champs:changes.join(', ')}]];await grist.docApi.applyUserActions(actions);closePerson();await loadPersons();}catch(e){set($('person-feedback'),'Enregistrement refusé. Vérifiez les droits et la saisie, puis actualisez si nécessaire.');}finally{ui.busy=false;$('person-save').disabled=false;$('person-fields').disabled=false;}}
function initPersons(){const fields=$('person-fields');const group=node('fieldset','motif-fieldset');group.append(node('legend',null,'Qualités dans le dossier (plusieurs possibles)'));for(const role of PERSON_ROLES){const label=node('label','field'),input=node('input');input.type='checkbox';input.name='Qualites';input.value=role;label.append(input,document.createTextNode(' '+role));group.append(label);}fields.append(group);for(const [key,title,type,max] of PERSON_FIELDS){const label=node('label','field',title),el=node(Array.isArray(type)?'select':'input');el.name=key;if(Array.isArray(type)){el.append(new Option('— Non renseigné —',''));for(const v of type)el.append(new Option(v,v));}else{el.type=type;el.maxLength=max;el.autocomplete='off';}label.append(el);fields.append(label);} $('person-add').addEventListener('click',()=>openPerson());$('person-close').addEventListener('click',()=>{if(!ui.busy)closePerson();});$('person-dialog').addEventListener('cancel',e=>{e.preventDefault();if(!ui.busy)closePerson();});$('person-form').addEventListener('submit',savePerson);}

function render(){if(ui.tab==='composition')renderComposition();if(ui.tab==='accueil')renderHome();if(ui.tab==='rc'){renderRC();renderRCAffectations();}if(ui.tab==='administration'){renderCentralAdmins();renderCentralCellules();renderCentralHabilitations();}if(ui.tab==='gestion-ec')renderRCHabilitations();if(ui.tab==='dossiers')renderDossiers();if(ui.tab==='entretiens')renderEntretiens();if(ui.tab==='rapports')renderRapports();if(ui.tab==='cr')renderCR();if(ui.tab==='outils')renderTools();if(ui.tab==='nouveau')renderNewDossier();if(ui.tab==='agenda')renderAgenda();}
function filters(){const select=$('status-filter'),prior=select.value;select.replaceChildren(new Option('Tous les statuts',''));for(const s of [...new Set((state.dossiers||[]).map(d=>String(d.Statut||'Non renseigné')))].sort())select.add(new Option(s,s));select.value=[...select.options].some(x=>x.value===prior)?prior:'';}
async function reload(){clearPersons();const keys=Object.keys(C.TABLES);$('reload').disabled=true;status('Actualisation des données autorisées…');try{const results=await Promise.allSettled([...keys.map(k=>grist.docApi.fetchTable(C.TABLES[k])),grist.docApi.fetchTable('SIGMA_V2_RC_SYNTHESE_TEST'),grist.docApi.fetchTable(RC_TABLES.cibles),grist.docApi.fetchTable(RC_TABLES.demandes),...Object.values(METIER_TABLES).map(t=>grist.docApi.fetchTable(t)),grist.docApi.fetchTable(DOSSIER_PARTAGES_TABLE),grist.docApi.fetchTable(CENTRAL_ACCESS_TABLE),grist.docApi.fetchTable(CENTRAL_ADMINS_TABLE)]);for(let i=0;i<keys.length;i++){try{state[keys[i]]=results[i].status==='fulfilled'?C.rows(results[i].value):null;}catch{state[keys[i]]=null;}}try{state.rc=results[keys.length].status==='fulfilled'?C.rows(results[keys.length].value):null;}catch{state.rc=null;}for(const [index,key] of [[keys.length+1,'rcCibles'],[keys.length+2,'rcDemandes']]){try{state[key]=results[index].status==='fulfilled'?C.rows(results[index].value):null;}catch{state[key]=null;}}for(const [i,key] of Object.keys(METIER_TABLES).entries()){try{state[key]=results[keys.length+3+i].status==='fulfilled'?C.rows(results[keys.length+3+i].value):null;}catch{state[key]=null;}}// Refus, table absente ou témoin absent => menu central invisible (fail closed).
 const shareResult=results[results.length-3];try{state.dossierPartages=shareResult.status==='fulfilled'?C.rows(shareResult.value):null;}catch{state.dossierPartages=null;}
 const accessResult=results[results.length-2],adminsResult=results[results.length-1];
 ui.techOwner=false;
 if(accessResult.status==='fulfilled'){
   try{ui.techOwner=C.rows(accessResult.value).some(r=>r.Autorisation==='ADMIN_CENTRAL');}catch{ui.techOwner=false;}
 }
 try{state.adminsCentraux=adminsResult.status==='fulfilled'?C.rows(adminsResult.value):null;}catch{state.adminsCentraux=null;}
 // Un administrateur métier ne doit voir que sa propre ligne active, imposée par les ACL.
 // En cas de refus, d'absence de ligne ou de table, l'interface reste fermée.
 ui.centralAllowed=ui.techOwner||(Array.isArray(state.adminsCentraux)&&state.adminsCentraux.some(r=>r.Role==='AN'&&r.Actif===true&&Boolean(r.Email)));

 closeComposition();closeFact(true);closeInitial(true);closeEntretien(true);closeDocument();ui.report=null;set($('rapport-texte'),'');for(const id of ['cr-list','entretien-list','rapports-list','dossier-cr','dossier-rapports','dossier-entretiens','dossier-faits'])$(id).replaceChildren();$('rapport-detail').hidden=true;if(ui.selected!==null&&!(state.dossiers||[]).some(d=>Number(d.id)===Number(ui.selected))){clearDrafts();resetRdv();ui.selected=null;$('dossier-detail').hidden=true;for(const id of ['dossier-meta','dossier-entretiens','dossier-cr','dossier-rapports','dossier-faits','dossier-corrections','dossier-rdv-list','dossier-rdv-history','dossier-title'])$(id).replaceChildren();}else if(ui.selected!==null){const selected=(state.dossiers||[]).find(d=>Number(d.id)===Number(ui.selected));if(!activityWritable(selected)){clearDrafts();resetRdv();}const eid=Number($('quick-cr-entretien').value);if(eid&&!(state.entretiens||[]).some(e=>Number(e.id)===eid&&Number(e.Dossier)===Number(ui.selected))){$('quick-cr').reset();}}refreshCentralNavigation();refreshCompositionNavigation();filters();render();const failed=keys.filter(k=>state[k]===null);status(failed.length?'Accès indisponible ou refusé sur : '+failed.map(k=>C.TABLES[k]).join(', ')+'. Aucune élévation de droits.':'Données actualisées selon vos habilitations.',false);}catch(err){status('Actualisation impossible : '+(err?.message||err),true);}finally{$('reload').disabled=false;}}
function init(){initPersons();initComposition();$('fact-add').addEventListener('click',()=>openFact());$('fact-category').addEventListener('change',factToggleCriteria);$('fact-form').addEventListener('input',()=>{if(factEdit)factEdit.dirty=true;});$('fact-form').addEventListener('submit',saveFact);$('fact-close').addEventListener('click',()=>closeFact());$('fact-dialog').addEventListener('cancel',ev=>{ev.preventDefault();closeFact();});$('initial-open').addEventListener('click',openInitial);$('initial-form').addEventListener('submit',saveInitial);$('initial-form').addEventListener('input',()=>{if(initialEdit)initialEdit.dirty=true;});$('initial-close').addEventListener('click',()=>closeInitial());$('initial-dialog').addEventListener('cancel',ev=>{ev.preventDefault();closeInitial();});$('dossier-share-form').addEventListener('submit',saveDossierPartage);$('entretien-edit-form').addEventListener('submit',saveEntretienEdit);$('entretien-edit-form').addEventListener('input',()=>{if(entretienEdit)entretienEdit.dirty=true;});$('entretien-close').addEventListener('click',()=>closeEntretien());$('entretien-abandon').addEventListener('click',()=>closeEntretien(true));$('entretien-dialog').addEventListener('cancel',ev=>{ev.preventDefault();closeEntretien();});refreshCentralNavigation();if(!C||!E){status('Modules de calcul métier manquants. Vérifier leur chargement.',true);return;}for(const btn of document.querySelectorAll('[data-tab]'))btn.addEventListener('click',()=>nav(btn.dataset.tab));for(const btn of document.querySelectorAll('[data-goto]'))btn.addEventListener('click',()=>nav(btn.dataset.goto));$('dossier-scope').addEventListener('change',()=>{if(hasDraft()&&!confirm('Abandonner la saisie en cours ?')){if(selectedDossier())$('dossier-scope').value=ownDossier(selectedDossier())?'mine':'received';return;}clearDrafts();resetRdv();ui.selected=null;renderDossiers();});$('rdv-new-from-dossier').addEventListener('click',()=>{if(!activityWritable(selectedDossier()))return;resetRdv();renderAgenda();$('rdv-form').scrollIntoView?.({block:'start'});});$('rdv-dossier').addEventListener('change',renderAgenda);$('search').addEventListener('input',renderDossiers);$('status-filter').addEventListener('change',renderDossiers);$('close-detail').addEventListener('click',()=>{if(ui.busy||(hasDraft()&&!confirm('Abandonner les saisies non enregistrées ?')))return;clearDrafts();resetRdv();ui.selected=null;renderDetail();});$('reload').addEventListener('click',()=>{if(!ui.busy)reload();});for(const b of document.querySelectorAll('[data-detail-tab]'))b.addEventListener('click',()=>selectDetail(b.dataset.detailTab));for(const kind of ['entretiens','cr','rapports']){$('entry-'+kind).addEventListener('change',()=>fillEntry(kind));document.querySelector('[data-entry="'+kind+'"]').addEventListener('click',()=>showDossier($('entry-'+kind).value,kind));}$('document-close').addEventListener('click',closeDocument);$('document-dialog').addEventListener('cancel',ev=>{ev.preventDefault();closeDocument();});$('document-copy-version').addEventListener('click',()=>copyDocumentVersion());$('document-confirm-copy').addEventListener('click',()=>copyDocumentVersion(true));$('quick-report').addEventListener('submit',saveQuickReport);$('quick-cr-entretien').addEventListener('change',()=>{if($('quick-cr-texte').value && !confirm('Abandonner le texte saisi pour cet entretien ?')){$('quick-cr-entretien').value=ui.previousEntretien||'';}else{$('quick-cr-texte').value='';}ui.previousEntretien=$('quick-cr-entretien').value;quickVersionHint();updateQuickControls();});$('rc-affectation-form').addEventListener('submit',submitRCAffectation);$('rc-habilitation-form').addEventListener('submit',saveRCHabilitation);$('central-rc-form').addEventListener('submit',saveCentralHabilitation);$('central-cellule-form').addEventListener('submit',saveCentralCellule);$('central-admin-form').addEventListener('submit',saveCentralAdmin);$('central-admin-cancel').addEventListener('click',resetCentralAdminEditor);$('central-cellule-cancel').addEventListener('click',resetCentralCelluleEditor);$('quick-entretien').addEventListener('submit',saveQuickEntretien);$('quick-cr').addEventListener('submit',saveQuickCR);$('new-dossier-form').addEventListener('submit',saveNewDossier);$('rdv-form').addEventListener('submit',saveRdv);$('rdv-reset').addEventListener('click',()=>{resetRdv();renderAgenda();});$('agenda-mode').addEventListener('change',renderAgenda);$('agenda-date').addEventListener('change',renderAgenda);$('agenda-prev').addEventListener('click',()=>shiftAgenda(-1));$('agenda-next').addEventListener('click',()=>shiftAgenda(1));$('agenda-today').addEventListener('click',()=>{$('agenda-date').value=localDate(new Date());renderAgenda();});$('transfer-form').addEventListener('submit',saveTransfer);if(typeof grist==='undefined'){status('Widget à ouvrir dans Grist. Aucune donnée distante chargée.',true);render();return;}grist.ready({requiredAccess:'full'});$('agenda-date').value=localDate(new Date());reload();}
window.addEventListener('DOMContentLoaded',init);
})();
