'use strict';(function(){
const C=window.SigmaEspaceCore,E=window.SigmaEntretiensCore,$=id=>document.getElementById(id);
const state={dossiers:null,entretiens:null,cr:null,rapports:null,rc:null,rcCibles:null,rcDemandes:null,cellules:null,habilitations:null,affectations:null,rdv:null,rdvHist:null,faits:null,discriminations:null,rcHabilitations:null,habJournal:null,adminsCentraux:null},ui={busy:false,tab:'accueil',selected:null,report:null,detailTab:"synthese",document:null,centralAllowed:false,techOwner:false};
const METIER_TABLES={cellules:'SIGMA_CELLULES',habilitations:'SIGMA_V2_EC_HABILITATIONS_TEST',affectations:'SIGMA_V2_AFFECTATIONS_TEST',rdv:'SIGMA_V2_RENDEZ_VOUS_TEST',rdvHist:'SIGMA_V2_RDV_HISTORIQUE_TEST',faits:'SIGMA_V2_FAITS_TEST',discriminations:'SIGMA_V2_FAITS_DISCRIMINATION_TEST',rcHabilitations:'SIGMA_V2_RC_HABILITATIONS_TEST',habJournal:'SIGMA_V2_HABILITATIONS_JOURNAL_TEST'};
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
function nav(tab){if(tab==='administration'&&!ui.centralAllowed){status('Rubrique réservée à l’administration centrale. Accès non autorisé.',true);return;}ui.tab=tab;for(const n of document.querySelectorAll('[data-tab]')){const active=n.dataset.tab===tab;n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}for(const sec of document.querySelectorAll('.tab'))sec.hidden=sec.id!=='tab-'+tab;const names={accueil:['Vue d’ensemble','Synthèse des informations accessibles'],rc:['Supervision RC','Synthèse non nominative de la cellule autorisée'],administration:['Administration centrale','Gestion des cellules et des responsables — habilitation centrale métier'], 'gestion-ec':['Gestion des écoutants','Habiliter les EC dans les cellules déléguées · RC'],dossiers:['Dossiers','Consultation des dossiers et de leurs éléments liés'],entretiens:['Entretiens','Créer et consulter les entretiens'],cr:['Comptes rendus','Consulter et préparer les versions accessibles'],rapports:['Rapports','Consulter et préparer les versions accessibles'],outils:['Modules métier','Accéder aux actions disponibles dans SIGMA TEST'],nouveau:['Nouveau signalement','Création EC : attribution par formule Grist'],agenda:['Mon agenda','Rendez-vous liés aux dossiers autorisés']};set($('page-title'),names[tab][0]);set($('page-subtitle'),names[tab][1]);render();}
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
function visibleDossiers(){const ds=state.dossiers;if(!Array.isArray(ds))return null;const term=$('search').value.toLocaleLowerCase('fr').trim(),filter=$('status-filter').value;return C.sorted(ds).filter(d=>(!filter||String(d.Statut||'')===filter)&&(!term||[C.dossierLabel(d.id),d.id,d.Statut,d.Canal].map(x=>String(x??'')).join(' ').toLocaleLowerCase('fr').includes(term)));}
function clearDrafts(){for(const id of ['quick-entretien','quick-cr','quick-report','transfer-form'])$(id).reset();}
function hasDraft(){return ['quick-e-date','quick-e-modalite','quick-e-observation','quick-cr-texte','quick-r-title','quick-r-text','transfer-motif'].some(id=>$(id).value.trim());}
function selectDetail(tab){ui.detailTab=tab;for(const p of document.querySelectorAll('[data-detail-pane]'))p.hidden=p.dataset.detailPane!==tab;for(const b of document.querySelectorAll('nav [data-detail-tab]'))b.setAttribute('aria-pressed',String(b.dataset.detailTab===tab));}
function showDossier(id,tab='synthese',discardConfirmed=false){const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(id));if(!d||(ui.busy&&Number(ui.selected)!==Number(id)))return false;if(Number(ui.selected)!==Number(id)){if(hasDraft()&&!discardConfirmed&&!confirm('Abandonner les saisies non enregistrées du dossier précédent ?'))return false;clearDrafts();}ui.selected=d.id;ui.detailTab=tab;nav('dossiers');selectDetail(tab);$('dossier-detail').scrollIntoView?.({behavior:'smooth',block:'start'});return true;}
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
  root.append(item(formatRdv(r.Debut),C.dossierLabel(r.Dossier)+' · '+val(r.Modalite),val(r.Statut,'Prévu'),()=>{nav('agenda');$('agenda-date').value=localDate(rdvDate(r.Debut));renderAgenda();}));
 }
}
function renderHome(){const m=$('metrics');m.replaceChildren();m.append(metric('Dossiers',count(state,'dossiers'),'Autorisés'),metric('Entretiens',count(state,'entretiens'),'Accessibles'),metric('Comptes rendus',count(state,'cr'),'Versions visibles'),metric('Rapports',count(state,'rapports'),'Internes visibles'));
renderUpcoming();const recent=$('recent-dossiers');recent.replaceChildren();if(state.dossiers===null)empty(recent,'Table dossiers inaccessible : ne pas déduire le nombre de dossiers de la cellule.');else if(!state.dossiers.length)empty(recent,'Aucun dossier accessible.');else for(const d of C.sorted(state.dossiers).slice(0,6))recent.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · EC : '+val(d.EC_Email,'Non affecté'),val(d.Statut,'Nouveau'),()=>showDossier(d.id)));
const area=$('status-stats');area.replaceChildren();const stats=C.stats(state);if(!stats){empty(area,'Statistiques indisponibles : accès à la table dossiers refusé.');return;}if(!stats.total){empty(area,'Aucune donnée accessible.');return;}for(const [key,value] of Object.entries(stats.byStatus)){const row=node('div','status-row');row.append(node('span',null,key));const bar=node('span','bar'),inner=document.createElement('i');inner.style.width=(100*value/stats.total)+'%';bar.append(inner);row.append(bar,node('span','value',value));area.append(row);}}
function renderDossiers(){const list=$('dossiers');list.replaceChildren();const rows=visibleDossiers();set($('dossier-counter'),rows===null?'Indisponible':rows.length+' dossier(s)');if(rows===null){empty(list,'Accès non autorisé à la table dossiers. Aucun contournement de la sécurité.');$('dossier-detail').hidden=true;return;}if(!rows.length)empty(list,'Aucun dossier pour ces critères.');for(const d of rows)list.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · Référent : '+val(d.EC_Email,'Non affecté'),val(d.Statut,'Nouveau'),()=>showDossier(d.id)));renderDetail();}
function pill(label,value){return node('span',null,label+' : '+val(value));}
function renderDetail(){const section=$('dossier-detail');const d=(state.dossiers||[]).find(x=>x.id===ui.selected);section.hidden=!d;if(!d)return;set($('dossier-title'),C.dossierLabel(d.id));const props=$('dossier-meta');props.replaceChildren();props.append(pill('Statut',d.Statut),pill('Canal',d.Canal),pill('Date de saisine',C.formatDate(d.Date_Saisine)),pill('EC affecté',d.EC_Email));const related=C.relation(state,d.id);
const e=$('dossier-entretiens');e.replaceChildren();if(state.entretiens===null)empty(e,'Entretiens non accessibles.');else if(!related.entretiens.length)empty(e,'Aucun entretien accessible.');else for(const r of C.sorted(related.entretiens))e.append(item('Entretien #'+r.id,'Date : '+C.formatDate(r.Date_Entretien),val(r.Type,'Entretien')));
const cr=$('dossier-cr');renderCRGroups(cr,related.entretiens,related.cr);
const rs=$('dossier-rapports');rs.replaceChildren();if(state.rapports===null)empty(rs,'Rapports non accessibles.');else if(!related.rapports.length)empty(rs,'Aucun rapport accessible.');else for(const r of [...related.rapports].sort((a,b)=>Number(b.Version)-Number(a.Version)))rs.append(item('Rapport v'+val(r.Version),val(r.Titre,'Sans titre'),val(r.Etat,'État inconnu'),()=>openDocument('rapports',r.id)));
selectDetail(ui.detailTab);const facts=$('dossier-faits');facts.replaceChildren();for(const r of (state.faits||[]).filter(x=>Number(x.Dossier)===Number(d.id)))facts.append(item(val(r.Categorie),'Fait #'+r.id));if(!facts.children.length)empty(facts,'Aucun fait accessible.');renderQuickEntry(d,related);renderTransfer(d);const act=$('dossier-actions');act.replaceChildren();for(const title of ['Dossiers et faits','Entretiens et comptes rendus','Préparations et révocations de CR','Rapports internes']){const link=configLink(title);if(link)act.append(makeLink('Ouvrir : '+title,link,'inline-link'));}}

function quickEnabled(){return window.SIGMA_ESPACE_CONFIG?.TEST_WRITES_ENABLED===true && typeof grist!=='undefined' && typeof grist.docApi?.applyUserActions==='function';}
function quickMessage(message,error=false){const el=$('quick-entry-warning');set(el,message);el.classList.toggle('error',error);}
function quickBusy(busy){ui.busy=busy;updateQuickControls();}
function updateQuickControls(){const available=quickEnabled()&&state.dossiers!==null&&state.entretiens!==null&&state.cr!==null&&!ui.busy&&ui.selected!==null;
 $('quick-r-save').disabled=!quickEnabled()||!window.SIGMA_RAPPORTS_CONFIG?.TEST_WRITES_ENABLED||!window.SigmaRapportsCore||!Array.isArray(state.rapports)||!Array.isArray(state.dossiers)||ui.busy||ui.selected===null;$('quick-e-save').disabled=!available;const selected=Number($('quick-cr-entretien').value);$('quick-cr-save').disabled=!available||!Number.isSafeInteger(selected)||selected<1;
}
function renderQuickEntry(d,related){const select=$('quick-cr-entretien');const prior=select.value;select.replaceChildren(new Option('— Choisir un entretien de ce dossier —',''));
 for(const e of C.sorted(related.entretiens))select.add(new Option('Entretien #'+e.id+' · '+C.formatDate(e.Date_Entretien),String(e.id)));
 if(related.entretiens.some(e=>String(e.id)===prior))select.value=prior;
 const enabled=quickEnabled();
 if(!E){quickMessage('Module de validation entretiens-core.js indisponible. Saisie désactivée.',true);}else if(!enabled){quickMessage('Saisie désactivée. Activer explicitement les écritures TEST dans espace-metier-config.js après vérification des ACL.');}
 else if(state.entretiens===null||state.cr===null){quickMessage('Tables entretiens ou comptes rendus indisponibles : la saisie est désactivée.',true);}
 else{quickMessage('Dossier '+C.dossierLabel(d.id)+' · EC affecté : '+val(d.EC_Email,'non renseigné')+'. Toute création reste soumise aux ACL Grist.');}
 ui.previousEntretien=select.value;updateQuickControls();quickVersionHint();
}
function quickVersionHint(){const id=Number($('quick-cr-entretien').value);const el=$('quick-cr-version');if(!id||!E||!state.cr){set(el,'Sélectionner un entretien pour créer une version.');return;}
 const v=E.versionState(state.cr,id);set(el,v.duplicateVersions.length?'ALERTE : versions en doublon, ne pas créer de nouvelle version.':'Prochaine version estimée : '+v.nextVersion+' (recontrôlée avant écriture).');}
async function saveQuickEntretien(ev){ev.preventDefault();if(ui.busy||!quickEnabled()||!E||ui.selected===null)return;
 const dossier=(state.dossiers||[]).find(d=>Number(d.id)===Number(ui.selected));if(!dossier)return;
 try{const payload=E.entretien({Dossier:String(dossier.id),Date_Entretien:$('quick-e-date').value,Type:$('quick-e-type').value,Modalite:$('quick-e-modalite').value,Observation_Non_Nominative:$('quick-e-observation').value},state.dossiers);
 quickBusy(true);quickMessage('Enregistrement de l’entretien…');await grist.docApi.applyUserActions([['AddRecord',E.TABLES.entretiens,null,payload]]);
 $('quick-entretien').reset();await reload();showDossier(dossier.id,'entretiens');quickMessage('Entretien créé. Identité du créateur et droits à contrôler dans Grist.');
 }catch(err){quickMessage('Entretien refusé : '+(err?.message||err),true);}finally{quickBusy(false);}}
async function saveQuickCR(ev){ev.preventDefault();if(ui.busy||!quickEnabled()||!E)return;
 const entretienId=Number($('quick-cr-entretien').value),e=(state.entretiens||[]).find(e=>Number(e.id)===entretienId);
 if(!e||!Number.isSafeInteger(entretienId)||entretienId<1||Number(e.Dossier)!==Number(ui.selected)){quickMessage('Entretien non accessible ou ne correspondant pas au dossier.',true);return;}
 const dossierId=Number(ui.selected);
 try{if(!Array.isArray(state.cr))throw Error('Comptes rendus non accessibles.');
 const baseline=E.versionState(state.cr,entretienId).fingerprint;quickBusy(true);quickMessage('Contrôle de la version la plus récente…');
 const fresh=E.rows(await grist.docApi.fetchTable(E.TABLES.cr));
 const payload=E.prepareVersion({Entretien:String(entretienId),Texte:$('quick-cr-texte').value},state.entretiens,fresh,baseline);
 await grist.docApi.applyUserActions([['AddRecord',E.TABLES.cr,null,payload]]);
 $('quick-cr-texte').value='';await reload();showDossier(dossierId,'cr');
 const verified=E.versionState(state.cr||[],entretienId);quickMessage(verified.duplicateVersions.length?'ALERTE : doublons de versions détectés, suspendre les écritures.':'Compte rendu enregistré en brouillon — version '+payload.Version+'.',!!verified.duplicateVersions.length);
 }catch(err){quickMessage('Compte rendu refusé : '+(err?.message||err),true);}finally{quickBusy(false);}}
function fillEntry(kind){const s=$('entry-'+kind),prior=s.value;s.replaceChildren(new Option('— Choisir un dossier accessible —',''));for(const d of C.sorted(state.dossiers))s.add(new Option(C.dossierLabel(d.id)+' · '+val(d.Statut),String(d.id)));if([...s.options].some(o=>o.value===prior))s.value=prior;const b=document.querySelector('[data-entry="'+kind+'"]');b.disabled=!quickEnabled()||!s.value||ui.busy;}
function documentRecord(kind,id){const r=(state[kind]||[]).find(x=>Number(x.id)===Number(id));if(!r)return null;const e=kind==='cr'?(state.entretiens||[]).find(x=>Number(x.id)===Number(r.Entretien)):null;const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(kind==='cr'?e?.Dossier:r.Dossier));return d?{r,d,e}:null;}
function resetDocumentPrompt(){set($('document-feedback'),'');$('document-confirm-copy').hidden=true;}
function closeDocument(){ui.document=null;const dlg=$('document-dialog');if(dlg.open)dlg.close();resetDocumentPrompt();for(const id of ['document-title','document-meta','document-body'])set($(id),'');}
function openDocument(kind,id){const x=documentRecord(kind,id);if(!x){status('Document ou entretien lié non accessible. Actualisez les données.',true);return;}resetDocumentPrompt();ui.document={kind,id};set($('document-title'),(kind==='cr'?'Compte rendu':'Rapport')+' · version '+val(x.r.Version));set($('document-meta'),C.dossierLabel(x.d.id)+' · '+val(x.r.Etat)+(kind==='rapports'?' · '+val(x.r.Titre):' · Entretien #'+x.e.id));set($('document-body'),x.r.Texte||'Aucun contenu accessible.');$('document-copy-version').disabled=!quickEnabled()||ui.busy||x.d.EC_Habilite_ACL!==true||(kind==='rapports'&&!window.SIGMA_RAPPORTS_CONFIG?.TEST_WRITES_ENABLED);if(!$('document-dialog').open)$('document-dialog').showModal();}
function copyReportVersion(){const k=ui.document;if(!k)return;const x=documentRecord(k.kind,k.id);if(!x||ui.busy||!quickEnabled()||x.d.EC_Habilite_ACL!==true)return;if(Number(ui.selected)===Number(x.d.id)&&(k.kind==='cr'?$('quick-cr-texte').value:($('quick-r-title').value||$('quick-r-text').value))&&!confirm('Remplacer la saisie non enregistrée ?'))return;if(!showDossier(x.d.id,k.kind))return;closeDocument();if(k.kind==='cr'){$('quick-cr-entretien').value=String(x.e.id);ui.previousEntretien=String(x.e.id);$('quick-cr-texte').value=x.r.Texte||'';quickVersionHint();updateQuickControls();$('quick-cr-texte').focus();}else{$('quick-r-title').value=x.r.Titre||'';$('quick-r-text').value=x.r.Texte||'';$('quick-r-text').focus();}}
function copyDocumentVersion(confirmed=false){
 const k=ui.document;if(!k)return;if(k.kind!=='cr'){copyReportVersion();return;}
 const x=documentRecord('cr',k.id),feedback=$('document-feedback');
 if(!x||!x.e||ui.busy||!quickEnabled()||x.d.EC_Habilite_ACL!==true){set(feedback,'Reprise indisponible : vérifiez les droits et actualisez les données.');return;}
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
 else for(const [i,r] of rows.entries())group.append(item('Version '+val(r.Version)+(i===0?' · Dernière version visible':' · Historique'),'Consulter le compte rendu #'+r.id,val(r.Etat,'État inconnu'),()=>openDocument('cr',r.id)));
 root.append(group);
 }if(!root.children.length)empty(root,'Aucun entretien accessible.');
}
function renderCR(){fillEntry('cr');renderCRGroups($('cr-list'),state.entretiens,state.cr||[]);}
async function saveQuickReport(ev){ev.preventDefault();const R=window.SigmaRapportsCore;if(ui.busy||!quickEnabled()||!window.SIGMA_RAPPORTS_CONFIG?.TEST_WRITES_ENABLED||!R||!Array.isArray(state.rapports))return;const id=Number(ui.selected),d=(state.dossiers||[]).find(x=>Number(x.id)===id);if(!d)return;try{const baseline=R.versionState(state.rapports,id).fingerprint;quickBusy(true);const fresh=R.rows(await grist.docApi.fetchTable(R.TABLES.rapports));const ds=R.rows(await grist.docApi.fetchTable(R.TABLES.dossiers));const payload=R.prepare({Dossier:String(id),Titre:$('quick-r-title').value,Texte:$('quick-r-text').value},ds,fresh,baseline);await grist.docApi.applyUserActions([['AddRecord',R.TABLES.rapports,null,payload]]);$('quick-report').reset();await reload();showDossier(id,'rapports');const duplicates=R.versionState(state.rapports||[],id).duplicates;quickMessage(duplicates.length?'ALERTE : versions en doublon. Suspendre les écritures.':'Rapport enregistré — version '+payload.Version,!!duplicates.length);}catch(e){quickMessage('Rapport refusé : '+(e?.message||e),true);}finally{quickBusy(false);}}
function renderEntretiens(){fillEntry('entretiens');const list=$('entretien-list');list.replaceChildren();const arr=state.entretiens;set($('entretien-counter'),arr===null?'Indisponible':arr.length+' entretien(s)');if(arr===null){empty(list,'Entretiens non accessibles.');return;}if(!arr.length){empty(list,'Aucun entretien accessible.');return;}for(const e of C.sorted(arr)){const versions=(state.cr||[]).filter(r=>Number(r.Entretien)===Number(e.id));list.append(item('Entretien #'+e.id+' · '+C.dossierLabel(e.Dossier),'Date : '+C.formatDate(e.Date_Entretien)+' · '+versions.length+' version(s) de CR visible(s)',val(e.Type,'Entretien'),()=>showDossier(e.Dossier,'entretiens')));}}
function showReport(id){const r=(state.rapports||[]).find(x=>Number(x.id)===Number(id));if(!r)return;ui.report=id;nav('rapports');const detail=$('rapport-detail');detail.hidden=false;set($('rapport-titre'),'Rapport #'+r.id+' · version '+val(r.Version)+' · '+val(r.Titre,'Sans titre'));set($('rapport-texte'),r.Texte||'Aucun contenu accessible.');detail.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
function renderRapports(){fillEntry('rapports');const list=$('rapports-list');list.replaceChildren();const arr=state.rapports;set($('rapport-counter'),arr===null?'Indisponible':arr.length+' rapport(s)');if(arr===null){$('rapport-detail').hidden=true;empty(list,'Rapports non accessibles selon vos habilitations.');return;}if(!arr.length){$('rapport-detail').hidden=true;empty(list,'Aucun rapport accessible.');return;}for(const r of C.sorted(arr))list.append(item('Rapport #'+r.id+' · version '+val(r.Version),C.dossierLabel(r.Dossier)+' · '+val(r.Titre,'Sans titre'),val(r.Etat,'État inconnu'),()=>openDocument('rapports',r.id)));const selected=arr.find(x=>x.id===ui.report);if(selected){$('rapport-detail').hidden=false;set($('rapport-titre'),'Rapport #'+selected.id+' · version '+val(selected.Version)+' · '+val(selected.Titre,'Sans titre'));set($('rapport-texte'),selected.Texte||'Aucun contenu accessible.');}else $('rapport-detail').hidden=true;}
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
  if(state.rcHabilitations.some(h=>Number(h.Cellule)===cell&&h.Role==='RC'&&activeHabilitation(h)))throw Error('Une habilitation RC active existe déjà pour cette cellule : la révoquer d’abord en central.');
  if(!confirm('Habiliter '+email+' comme RC de '+cellLabel(c)+' ?'))return;
  ui.busy=true;
  await grist.docApi.applyUserActions([['AddRecord',METIER_TABLES.rcHabilitations,null,{Email:email,Cellule:cell,Role:'RC',Actif:true,Date_Debut:debut,Date_Fin:fin,Motif:motif}]]);
  $('central-rc-form').reset();await reload();set(msg,'Habilitation RC créée. Vérifier avec le compte Céline.');
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
 if(!cells.length)set(msg,'Aucune habilitation RC active et unique : l’administration centrale doit d’abord habiliter le RC.');
}
async function saveRCHabilitation(ev){ev.preventDefault();const msg=$('rc-hab-message');
 try{
  if(ui.busy||!quickEnabled()||!Array.isArray(state.habilitations)||!Array.isArray(state.habJournal))throw Error('Référentiel, journal ou écriture indisponible.');
  const cell=Number($('rc-hab-cellule').value),c=managedRcCells().find(x=>Number(x.id)===cell);
  if(!c)throw Error('Cellule non déléguée au RC.');
  const email=$('rc-hab-email').value.trim().toLowerCase(),motif=$('rc-hab-motif').value.trim();
  if(!validEmail(email))throw Error('Adresse EC incorrecte.');
  if(motif.length<8||motif.length>500)throw Error('Motif obligatoire entre 8 et 500 caractères.');
  const debut=isoToEpoch($('rc-hab-debut').value),fin=isoToEpoch($('rc-hab-fin').value);
  if(debut&&fin&&debut>fin)throw Error('Date de fin antérieure au début.');
  if(state.habilitations.some(h=>Number(h.Cellule)===cell&&String(h.Email||'').trim().toLowerCase()===email&&h.Role==='EC'))throw Error('Une habilitation existe déjà pour cet EC et cette cellule. Réactivation à traiter dans une évolution contrôlée.');
  if(!confirm('Habiliter '+email+' sur '+cellLabel(c)+' ?'))return;
  ui.busy=true;
  // Ajout atomique habilitation + événement : référence temporaire Grist.
  await grist.docApi.applyUserActions([
   ['AddRecord',METIER_TABLES.habilitations,-1,{Email:email,Cellule:cell,Role:'EC',Actif:true,Date_Debut:debut,Date_Fin:fin,Motif:motif}],
   ['AddRecord',METIER_TABLES.habJournal,null,{Habilitation:-1,Action:'Creation',Motif:motif,Nouvel_Actif:true}]
  ]);
  $('rc-habilitation-form').reset();await reload();set(msg,'Habilitation créée et journalisée. Tester le compte EC authentifié.');
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
 // Aucune liste globale de cellules : uniquement les lignes d'habilitation que les ACL Grist rendent visibles.
 // Si plusieurs identités EC sont visibles, bloquer plutôt que supposer l'identité de l'utilisateur connecté.
 const rows=state.habilitations;
 if(!Array.isArray(rows))return null;
 const today=Math.floor(Date.now()/86400000)*86400;
 const active=rows.filter(h=>h.Role==='EC'&&h.Actif===true&&Number.isSafeInteger(Number(h.Cellule))&&Number(h.Cellule)>0&&(!h.Date_Debut||Number(h.Date_Debut)<=today)&&(!h.Date_Fin||Number(h.Date_Fin)>=today));
 const distinctEmails=new Set(active.map(h=>String(h.Email||'').trim().toLowerCase()).filter(Boolean));
 if(distinctEmails.size!==1)return [];
 const ids=new Set(active.map(h=>Number(h.Cellule)));
 return (state.cellules||[]).filter(c=>cellActive(c)&&ids.has(Number(c.id)));
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
 $('new-cellule-wrap').hidden=eligible?.length===1;
 set($('new-cellule-info'),eligible?.length>1?'Plusieurs habilitations actives : sélectionne la cellule concernée.':'');
 const enabled=quickEnabled()&&Array.isArray(eligible)&&eligible.length>0&&Array.isArray(state.dossiers)&&Array.isArray(state.faits)&&Array.isArray(state.discriminations)&&!ui.busy;
 for(const id of ['new-date','new-heure','new-canal','new-cellule','new-auteur','new-objet','new-save'])$(id).disabled=!enabled;
 if(!enabled)set($('new-message'),'Création indisponible : vérifier les habilitations EC visibles, les ACL et la table SIGMA_V2_FAITS_DISCRIMINATION_TEST. Une seule identité EC doit être visible.');
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
  if(!Array.isArray(eligible)||!eligible.some(c=>Number(c.id)===cell))throw Error('Cette cellule ne figure pas dans les habilitations EC accessibles.');
  const actions=firstContactActions({cell,stamp:isoToEpoch($('new-date').value),heure:$('new-heure').value,canal:$('new-canal').value,auteur:$('new-auteur').value,objet:$('new-objet').value,motifs:selectedValues('new-faits'),criteres:selectedValues('new-discriminations'),commentaire:$('new-faits-commentaire').value.trim()});
  if(!confirm('Créer un dossier TEST et ses '+(actions.filter(a=>a[1]===SIGMA_FAITS_TABLE).length)+' motif(s) ? L’identité EC sera attribuée par Grist.'))return;
  ui.busy=true;$('new-save').disabled=true;
  // Transaction unique Grist avec IDs temporaires négatifs : aucune création partielle si l'une des ACL refuse.
  // Ne transmettre ni EC_Email ni auteur technique : déclenchement côté Grist sous l'identité réelle.
  await grist.docApi.applyUserActions(actions);
  $('new-dossier-form').reset();initFirstContactChoices();$('new-discrimination-box').hidden=true;
  await reload();set(msg,'Dossier et motifs enregistrés ensemble. Vérifier EC_Email et les faits créés en Grist.');
 }catch(e){set(msg,'Création refusée (aucune ACL ne doit être contournée) : '+(e?.message||e));}
 finally{ui.busy=false;renderNewDossier();}
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
function renderTransfer(d){const box=$('transfer-section'),sel=$('transfer-cible');box.hidden=!d;if(!d)return;
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
  const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(ui.selected));if(!d)throw Error('Dossier non accessible.');
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
function resetRdv(){ui.editRdv=null;$('rdv-form').reset();set($('rdv-form-title'),'Nouveau rendez-vous');$('rdv-save').textContent='Enregistrer le rendez-vous';}
function editRdv(id){const r=(state.rdv||[]).find(x=>Number(x.id)===Number(id));if(!r||!appointmentAllowed(r))return;
 ui.editRdv=id;nav('agenda');$('rdv-dossier').value=String(r.Dossier);$('rdv-dossier').disabled=true;
 for(const [id,k] of [['rdv-modalite','Modalite'],['rdv-statut','Statut'],['rdv-lieu','Lieu'],['rdv-note','Note_Non_Nominative']])$(id).value=String(r[k]||'');
 const paris=(ts)=>{const d=rdvDate(ts);if(!d)return '';const x=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);return x.replace(' ','T');};
 $('rdv-debut').value=paris(r.Debut);$('rdv-fin').value=paris(r.Fin);
 set($('rdv-form-title'),'Modifier le rendez-vous #'+id);$('rdv-save').textContent='Enregistrer la modification';$('rdv-form').scrollIntoView?.({block:'start',behavior:'smooth'});
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

function renderAgenda(){const root=$('agenda-list');root.replaceChildren();const ds=$('rdv-dossier'),prev=ds.value;ds.replaceChildren(new Option('— Choisir un dossier accessible —',''));
 for(const d of state.dossiers||[])ds.add(new Option(C.dossierLabel(d.id)+' · '+val(d.Statut),String(d.id)));
 if([...ds.options].some(o=>o.value===prev))ds.value=prev;
 if(ui.editRdv){const r=(state.rdv||[]).find(x=>Number(x.id)===Number(ui.editRdv));if(r)ds.value=String(r.Dossier);}
 ds.disabled=!!ui.editRdv||!quickEnabled();$('rdv-save').disabled=!quickEnabled()||!Array.isArray(state.rdv)||!Array.isArray(state.rdvHist)||!Array.isArray(state.dossiers)||ui.busy;
 if(state.rdv===null){empty(root,'Table des rendez-vous indisponible : vérifier import et ACL.');return;}
 const date=$('agenda-date').value||localDate(new Date()),mode=$('agenda-mode').value;
 let range;try{range=dateBounds(date,mode);}catch(e){set($('agenda-period'),'Date invalide : '+e.message);return;}if(!range)return;
 const rows=sortRdv(state.rdv.filter(r=>appointmentAllowed(r)&&Number(r.Debut)<range.end&&Number(r.Fin)>=range.begin));
 set($('agenda-period'),fmtParisDate(range.begin)+' — '+fmtParisDate((range.end-1)*1000)+' · '+rows.length+' rendez-vous');
 if(!rows.length)empty(root,'Aucun rendez-vous accessible sur cette période.');
 for(const r of rows)root.append(item(formatRdv(r.Debut)+' → '+new Date(Number(r.Fin)*1000).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}),C.dossierLabel(r.Dossier)+' · '+val(r.Modalite)+' · '+val(r.Lieu,'Lieu non précisé'),val(r.Statut,'Prévu'),()=>editRdv(r.id)));
}
function shiftAgenda(delta){const d=new Date(($('agenda-date').value||localDate(new Date()))+'T12:00:00');const mode=$('agenda-mode').value;if(mode==='jour')d.setDate(d.getDate()+delta);else if(mode==='semaine')d.setDate(d.getDate()+7*delta);else d.setMonth(d.getMonth()+delta);$('agenda-date').value=localDate(d);renderAgenda();}
async function saveRdv(ev){ev.preventDefault();const msg=$('rdv-message');
 try{if(!quickEnabled()||ui.busy||!Array.isArray(state.rdv)||!Array.isArray(state.rdvHist))throw Error('Rendez-vous/historique non accessibles.');
 const dossier=Number($('rdv-dossier').value);if(!Number.isSafeInteger(dossier)||!state.dossiers.some(d=>Number(d.id)===dossier))throw Error('Dossier non accessible.');
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
  if(!fresh||['Debut','Fin','Statut','Modalite','Dossier','Lieu'].some(k=>String(fresh[k])!==String(old[k])))throw Error('Rendez-vous modifié entretemps : actualiser.');}
 if(!confirm(old?'Enregistrer le changement de rendez-vous et son historique ?':'Créer ce rendez-vous fictif ?'))return;
 ui.busy=true;
 const actions=old?[['UpdateRecord',METIER_TABLES.rdv,old.id,record],['AddRecord',METIER_TABLES.rdvHist,null,{RDV:old.id,Action:'Modification',Ancien_Debut:Number(old.Debut),Ancien_Fin:Number(old.Fin),Ancien_Statut:String(old.Statut||''),Nouveau_Debut:start,Nouveau_Fin:end,Nouveau_Statut:statut}]]:[['AddRecord',METIER_TABLES.rdv,null,record]];
 await grist.docApi.applyUserActions(actions);resetRdv();await reload();set(msg,'Rendez-vous enregistré par Grist.');
 }catch(e){set(msg,'Rendez-vous refusé : '+(e?.message||e));}finally{ui.busy=false;renderAgenda();}
}
function render(){if(ui.tab==='accueil')renderHome();if(ui.tab==='rc'){renderRC();renderRCAffectations();}if(ui.tab==='administration'){renderCentralAdmins();renderCentralCellules();renderCentralHabilitations();}if(ui.tab==='gestion-ec')renderRCHabilitations();if(ui.tab==='dossiers')renderDossiers();if(ui.tab==='entretiens')renderEntretiens();if(ui.tab==='rapports')renderRapports();if(ui.tab==='cr')renderCR();if(ui.tab==='outils')renderTools();if(ui.tab==='nouveau')renderNewDossier();if(ui.tab==='agenda')renderAgenda();}
function filters(){const select=$('status-filter'),prior=select.value;select.replaceChildren(new Option('Tous les statuts',''));for(const s of [...new Set((state.dossiers||[]).map(d=>String(d.Statut||'Non renseigné')))].sort())select.add(new Option(s,s));select.value=[...select.options].some(x=>x.value===prior)?prior:'';}
async function reload(){const keys=Object.keys(C.TABLES);$('reload').disabled=true;status('Actualisation des données autorisées…');try{const results=await Promise.allSettled([...keys.map(k=>grist.docApi.fetchTable(C.TABLES[k])),grist.docApi.fetchTable('SIGMA_V2_RC_SYNTHESE_TEST'),grist.docApi.fetchTable(RC_TABLES.cibles),grist.docApi.fetchTable(RC_TABLES.demandes),...Object.values(METIER_TABLES).map(t=>grist.docApi.fetchTable(t)),grist.docApi.fetchTable(CENTRAL_ACCESS_TABLE),grist.docApi.fetchTable(CENTRAL_ADMINS_TABLE)]);for(let i=0;i<keys.length;i++){try{state[keys[i]]=results[i].status==='fulfilled'?C.rows(results[i].value):null;}catch{state[keys[i]]=null;}}try{state.rc=results[keys.length].status==='fulfilled'?C.rows(results[keys.length].value):null;}catch{state.rc=null;}for(const [index,key] of [[keys.length+1,'rcCibles'],[keys.length+2,'rcDemandes']]){try{state[key]=results[index].status==='fulfilled'?C.rows(results[index].value):null;}catch{state[key]=null;}}for(const [i,key] of Object.keys(METIER_TABLES).entries()){try{state[key]=results[keys.length+3+i].status==='fulfilled'?C.rows(results[keys.length+3+i].value):null;}catch{state[key]=null;}}// Refus, table absente ou témoin absent => menu central invisible (fail closed).
 const accessResult=results[results.length-2],adminsResult=results[results.length-1];
 ui.techOwner=false;
 if(accessResult.status==='fulfilled'){
   try{ui.techOwner=C.rows(accessResult.value).some(r=>r.Autorisation==='ADMIN_CENTRAL');}catch{ui.techOwner=false;}
 }
 try{state.adminsCentraux=adminsResult.status==='fulfilled'?C.rows(adminsResult.value):null;}catch{state.adminsCentraux=null;}
 // Un administrateur métier ne doit voir que sa propre ligne active, imposée par les ACL.
 // En cas de refus, d'absence de ligne ou de table, l'interface reste fermée.
 ui.centralAllowed=ui.techOwner||(Array.isArray(state.adminsCentraux)&&state.adminsCentraux.some(r=>r.Role==='AN'&&r.Actif===true&&Boolean(r.Email)));

 closeDocument();ui.report=null;set($('rapport-texte'),'');for(const id of ['cr-list','entretien-list','rapports-list','dossier-cr','dossier-rapports','dossier-entretiens','dossier-faits'])$(id).replaceChildren();$('rapport-detail').hidden=true;if(ui.selected!==null&&!(state.dossiers||[]).some(d=>Number(d.id)===Number(ui.selected))){clearDrafts();ui.selected=null;$('dossier-detail').hidden=true;for(const id of ['dossier-meta','dossier-entretiens','dossier-cr','dossier-rapports','dossier-faits','dossier-title'])$(id).replaceChildren();}else if(ui.selected!==null){const selected=(state.dossiers||[]).find(d=>Number(d.id)===Number(ui.selected));if(selected?.EC_Habilite_ACL!==true&&!ui.techOwner)clearDrafts();const eid=Number($('quick-cr-entretien').value);if(eid&&!(state.entretiens||[]).some(e=>Number(e.id)===eid&&Number(e.Dossier)===Number(ui.selected))){$('quick-cr').reset();}}refreshCentralNavigation();filters();render();const failed=keys.filter(k=>state[k]===null);status(failed.length?'Accès indisponible ou refusé sur : '+failed.map(k=>C.TABLES[k]).join(', ')+'. Aucune élévation de droits.':'Données actualisées selon vos habilitations.',false);}catch(err){status('Actualisation impossible : '+(err?.message||err),true);}finally{$('reload').disabled=false;}}
function init(){refreshCentralNavigation();if(!C||!E){status('Modules de calcul métier manquants. Vérifier leur chargement.',true);return;}for(const btn of document.querySelectorAll('[data-tab]'))btn.addEventListener('click',()=>nav(btn.dataset.tab));for(const btn of document.querySelectorAll('[data-goto]'))btn.addEventListener('click',()=>nav(btn.dataset.goto));$('search').addEventListener('input',renderDossiers);$('status-filter').addEventListener('change',renderDossiers);$('close-detail').addEventListener('click',()=>{if(ui.busy||(hasDraft()&&!confirm('Abandonner les saisies non enregistrées ?')))return;clearDrafts();ui.selected=null;renderDetail();});$('reload').addEventListener('click',()=>{if(!ui.busy)reload();});for(const b of document.querySelectorAll('[data-detail-tab]'))b.addEventListener('click',()=>selectDetail(b.dataset.detailTab));for(const kind of ['entretiens','cr','rapports']){$('entry-'+kind).addEventListener('change',()=>fillEntry(kind));document.querySelector('[data-entry="'+kind+'"]').addEventListener('click',()=>showDossier($('entry-'+kind).value,kind));}$('document-close').addEventListener('click',closeDocument);$('document-dialog').addEventListener('cancel',ev=>{ev.preventDefault();closeDocument();});$('document-copy-version').addEventListener('click',()=>copyDocumentVersion());$('document-confirm-copy').addEventListener('click',()=>copyDocumentVersion(true));$('quick-report').addEventListener('submit',saveQuickReport);$('quick-cr-entretien').addEventListener('change',()=>{if($('quick-cr-texte').value && !confirm('Abandonner le texte saisi pour cet entretien ?')){$('quick-cr-entretien').value=ui.previousEntretien||'';}else{$('quick-cr-texte').value='';}ui.previousEntretien=$('quick-cr-entretien').value;quickVersionHint();updateQuickControls();});$('rc-affectation-form').addEventListener('submit',submitRCAffectation);$('rc-habilitation-form').addEventListener('submit',saveRCHabilitation);$('central-rc-form').addEventListener('submit',saveCentralHabilitation);$('central-cellule-form').addEventListener('submit',saveCentralCellule);$('central-admin-form').addEventListener('submit',saveCentralAdmin);$('central-admin-cancel').addEventListener('click',resetCentralAdminEditor);$('central-cellule-cancel').addEventListener('click',resetCentralCelluleEditor);$('quick-entretien').addEventListener('submit',saveQuickEntretien);$('quick-cr').addEventListener('submit',saveQuickCR);$('new-dossier-form').addEventListener('submit',saveNewDossier);$('rdv-form').addEventListener('submit',saveRdv);$('rdv-reset').addEventListener('click',resetRdv);$('agenda-mode').addEventListener('change',renderAgenda);$('agenda-date').addEventListener('change',renderAgenda);$('agenda-prev').addEventListener('click',()=>shiftAgenda(-1));$('agenda-next').addEventListener('click',()=>shiftAgenda(1));$('agenda-today').addEventListener('click',()=>{$('agenda-date').value=localDate(new Date());renderAgenda();});$('transfer-form').addEventListener('submit',saveTransfer);if(typeof grist==='undefined'){status('Widget à ouvrir dans Grist. Aucune donnée distante chargée.',true);render();return;}grist.ready({requiredAccess:'full'});$('agenda-date').value=localDate(new Date());reload();}
window.addEventListener('DOMContentLoaded',init);
})();
