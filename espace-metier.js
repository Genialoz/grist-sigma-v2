'use strict';(function(){
const C=window.SigmaEspaceCore,E=window.SigmaEntretiensCore,$=id=>document.getElementById(id);
const state={dossiers:null,entretiens:null,cr:null,rapports:null,rc:null,rcCibles:null,rcDemandes:null},ui={busy:false,tab:'accueil',selected:null,report:null};
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
function nav(tab){ui.tab=tab;for(const n of document.querySelectorAll('[data-tab]')){const active=n.dataset.tab===tab;n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}for(const sec of document.querySelectorAll('.tab'))sec.hidden=sec.id!=='tab-'+tab;const names={accueil:['Vue d’ensemble','Synthèse des informations accessibles'],rc:['Supervision RC','Synthèse non nominative de la cellule autorisée'],dossiers:['Dossiers','Consultation des dossiers et de leurs éléments liés'],entretiens:['Entretiens et comptes rendus','Historique des entretiens et versions accessibles'],rapports:['Rapports internes','Consultation des rapports autorisés, en lecture seule'],outils:['Modules métier','Accéder aux actions disponibles dans SIGMA TEST']};set($('page-title'),names[tab][0]);set($('page-subtitle'),names[tab][1]);render();}
function visibleDossiers(){const ds=state.dossiers;if(!Array.isArray(ds))return null;const term=$('search').value.toLocaleLowerCase('fr').trim(),filter=$('status-filter').value;return C.sorted(ds).filter(d=>(!filter||String(d.Statut||'')===filter)&&(!term||[C.dossierLabel(d.id),d.id,d.Statut,d.Canal].map(x=>String(x??'')).join(' ').toLocaleLowerCase('fr').includes(term)));}
function showDossier(id){const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(id));if(!d)return;ui.selected=d.id;nav('dossiers');renderDetail();$('dossier-detail').scrollIntoView?.({behavior:'smooth',block:'nearest'});}
function renderHome(){const m=$('metrics');m.replaceChildren();m.append(metric('Dossiers',count(state,'dossiers'),'Autorisés'),metric('Entretiens',count(state,'entretiens'),'Accessibles'),metric('Comptes rendus',count(state,'cr'),'Versions visibles'),metric('Rapports',count(state,'rapports'),'Internes visibles'));
const recent=$('recent-dossiers');recent.replaceChildren();if(state.dossiers===null)empty(recent,'Table dossiers inaccessible : ne pas déduire le nombre de dossiers de la cellule.');else if(!state.dossiers.length)empty(recent,'Aucun dossier accessible.');else for(const d of C.sorted(state.dossiers).slice(0,6))recent.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · EC : '+val(d.EC_Email,'Non affecté'),val(d.Statut,'Nouveau'),()=>showDossier(d.id)));
const area=$('status-stats');area.replaceChildren();const stats=C.stats(state);if(!stats){empty(area,'Statistiques indisponibles : accès à la table dossiers refusé.');return;}if(!stats.total){empty(area,'Aucune donnée accessible.');return;}for(const [key,value] of Object.entries(stats.byStatus)){const row=node('div','status-row');row.append(node('span',null,key));const bar=node('span','bar'),inner=document.createElement('i');inner.style.width=(100*value/stats.total)+'%';bar.append(inner);row.append(bar,node('span','value',value));area.append(row);}}
function renderDossiers(){const list=$('dossiers');list.replaceChildren();const rows=visibleDossiers();set($('dossier-counter'),rows===null?'Indisponible':rows.length+' dossier(s)');if(rows===null){empty(list,'Accès non autorisé à la table dossiers. Aucun contournement de la sécurité.');$('dossier-detail').hidden=true;return;}if(!rows.length)empty(list,'Aucun dossier pour ces critères.');for(const d of rows)list.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · Référent : '+val(d.EC_Email,'Non affecté'),val(d.Statut,'Nouveau'),()=>showDossier(d.id)));renderDetail();}
function pill(label,value){return node('span',null,label+' : '+val(value));}
function renderDetail(){const section=$('dossier-detail');const d=(state.dossiers||[]).find(x=>x.id===ui.selected);section.hidden=!d;if(!d)return;set($('dossier-title'),C.dossierLabel(d.id));const props=$('dossier-meta');props.replaceChildren();props.append(pill('Statut',d.Statut),pill('Canal',d.Canal),pill('Date de saisine',C.formatDate(d.Date_Saisine)),pill('EC affecté',d.EC_Email));const related=C.relation(state,d.id);
const e=$('dossier-entretiens');e.replaceChildren();if(state.entretiens===null)empty(e,'Entretiens non accessibles.');else if(!related.entretiens.length)empty(e,'Aucun entretien accessible.');else for(const r of C.sorted(related.entretiens))e.append(item('Entretien #'+r.id,'Date : '+C.formatDate(r.Date_Entretien),val(r.Type,'Entretien')));
const cr=$('dossier-cr');cr.replaceChildren();if(state.cr===null||state.entretiens===null)empty(cr,'Versions de CR non accessibles.');else if(!related.cr.length)empty(cr,'Aucun CR accessible.');else for(const r of [...related.cr].sort((a,b)=>Number(b.Version)-Number(a.Version)))cr.append(item('CR #'+r.id+' · version '+val(r.Version),'Entretien #'+val(r.Entretien),val(r.Etat,'État inconnu')));
const rs=$('dossier-rapports');rs.replaceChildren();if(state.rapports===null)empty(rs,'Rapports non accessibles.');else if(!related.rapports.length)empty(rs,'Aucun rapport accessible.');else for(const r of [...related.rapports].sort((a,b)=>Number(b.Version)-Number(a.Version)))rs.append(item('Rapport v'+val(r.Version),val(r.Titre,'Sans titre'),val(r.Etat,'État inconnu'),()=>showReport(r.id)));
renderQuickEntry(d,related);const act=$('dossier-actions');act.replaceChildren();for(const title of ['Dossiers et faits','Entretiens et comptes rendus','Préparations et révocations de CR','Rapports internes']){const link=configLink(title);if(link)act.append(makeLink('Ouvrir : '+title,link,'inline-link'));}}

function quickEnabled(){return window.SIGMA_ESPACE_CONFIG?.TEST_WRITES_ENABLED===true && typeof grist!=='undefined' && typeof grist.docApi?.applyUserActions==='function';}
function quickMessage(message,error=false){const el=$('quick-entry-warning');set(el,message);el.classList.toggle('error',error);}
function quickBusy(busy){ui.busy=busy;updateQuickControls();}
function updateQuickControls(){const available=quickEnabled()&&state.dossiers!==null&&state.entretiens!==null&&state.cr!==null&&!ui.busy&&ui.selected!==null;
 $('quick-e-save').disabled=!available;const selected=Number($('quick-cr-entretien').value);$('quick-cr-save').disabled=!available||!Number.isSafeInteger(selected)||selected<1;
}
function renderQuickEntry(d,related){const select=$('quick-cr-entretien');const prior=select.value;select.replaceChildren(new Option('— Choisir un entretien de ce dossier —',''));
 for(const e of C.sorted(related.entretiens))select.add(new Option('Entretien #'+e.id+' · '+C.formatDate(e.Date_Entretien),String(e.id)));
 if(related.entretiens.some(e=>String(e.id)===prior))select.value=prior;
 const enabled=quickEnabled();
 if(!E){quickMessage('Module de validation entretiens-core.js indisponible. Saisie désactivée.',true);}else if(!enabled){quickMessage('Saisie désactivée. Activer explicitement les écritures TEST dans espace-metier-config.js après vérification des ACL.');}
 else if(state.entretiens===null||state.cr===null){quickMessage('Tables entretiens ou comptes rendus indisponibles : la saisie est désactivée.',true);}
 else{quickMessage('Dossier '+C.dossierLabel(d.id)+' · EC affecté : '+val(d.EC_Email,'non renseigné')+'. Toute création reste soumise aux ACL Grist.');}
 updateQuickControls();quickVersionHint();
}
function quickVersionHint(){const id=Number($('quick-cr-entretien').value);const el=$('quick-cr-version');if(!id||!E||!state.cr){set(el,'Sélectionner un entretien pour créer une version.');return;}
 const v=E.versionState(state.cr,id);set(el,v.duplicateVersions.length?'ALERTE : versions en doublon, ne pas créer de nouvelle version.':'Prochaine version estimée : '+v.nextVersion+' (recontrôlée avant écriture).');}
async function saveQuickEntretien(ev){ev.preventDefault();if(ui.busy||!quickEnabled()||!E||ui.selected===null)return;
 const dossier=(state.dossiers||[]).find(d=>Number(d.id)===Number(ui.selected));if(!dossier)return;
 try{const payload=E.entretien({Dossier:String(dossier.id),Date_Entretien:$('quick-e-date').value,Type:$('quick-e-type').value,Modalite:$('quick-e-modalite').value,Observation_Non_Nominative:$('quick-e-observation').value},state.dossiers);
 quickBusy(true);quickMessage('Enregistrement de l’entretien…');await grist.docApi.applyUserActions([['AddRecord',E.TABLES.entretiens,null,payload]]);
 $('quick-entretien').reset();await reload();showDossier(dossier.id);quickMessage('Entretien créé. Identité du créateur et droits à contrôler dans Grist.');
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
 $('quick-cr-texte').value='';await reload();showDossier(dossierId);
 const verified=E.versionState(state.cr||[],entretienId);quickMessage(verified.duplicateVersions.length?'ALERTE : doublons de versions détectés, suspendre les écritures.':'Compte rendu enregistré en brouillon — version '+payload.Version+'.',!!verified.duplicateVersions.length);
 }catch(err){quickMessage('Compte rendu refusé : '+(err?.message||err),true);}finally{quickBusy(false);}}
function renderEntretiens(){const list=$('entretien-list');list.replaceChildren();const arr=state.entretiens;set($('entretien-counter'),arr===null?'Indisponible':arr.length+' entretien(s)');if(arr===null){empty(list,'Entretiens non accessibles.');return;}if(!arr.length){empty(list,'Aucun entretien accessible.');return;}for(const e of C.sorted(arr)){const versions=(state.cr||[]).filter(r=>Number(r.Entretien)===Number(e.id));list.append(item('Entretien #'+e.id+' · '+C.dossierLabel(e.Dossier),'Date : '+C.formatDate(e.Date_Entretien)+' · '+versions.length+' version(s) de CR visible(s)',val(e.Type,'Entretien'),()=>showDossier(e.Dossier)));}}
function showReport(id){const r=(state.rapports||[]).find(x=>Number(x.id)===Number(id));if(!r)return;ui.report=id;nav('rapports');const detail=$('rapport-detail');detail.hidden=false;set($('rapport-titre'),'Rapport #'+r.id+' · version '+val(r.Version)+' · '+val(r.Titre,'Sans titre'));set($('rapport-texte'),r.Texte||'Aucun contenu accessible.');detail.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
function renderRapports(){const list=$('rapports-list');list.replaceChildren();const arr=state.rapports;set($('rapport-counter'),arr===null?'Indisponible':arr.length+' rapport(s)');if(arr===null){$('rapport-detail').hidden=true;empty(list,'Rapports non accessibles selon vos habilitations.');return;}if(!arr.length){$('rapport-detail').hidden=true;empty(list,'Aucun rapport accessible.');return;}for(const r of C.sorted(arr))list.append(item('Rapport #'+r.id+' · version '+val(r.Version),C.dossierLabel(r.Dossier)+' · '+val(r.Titre,'Sans titre'),val(r.Etat,'État inconnu'),()=>showReport(r.id)));const selected=arr.find(x=>x.id===ui.report);if(selected){$('rapport-detail').hidden=false;set($('rapport-titre'),'Rapport #'+selected.id+' · version '+val(selected.Version)+' · '+val(selected.Titre,'Sans titre'));set($('rapport-texte'),selected.Texte||'Aucun contenu accessible.');}else $('rapport-detail').hidden=true;}
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
function render(){if(ui.tab==='accueil')renderHome();if(ui.tab==='rc'){renderRC();renderRCAffectations();}if(ui.tab==='dossiers')renderDossiers();if(ui.tab==='entretiens')renderEntretiens();if(ui.tab==='rapports')renderRapports();if(ui.tab==='outils')renderTools();}
function filters(){const select=$('status-filter'),prior=select.value;select.replaceChildren(new Option('Tous les statuts',''));for(const s of [...new Set((state.dossiers||[]).map(d=>String(d.Statut||'Non renseigné')))].sort())select.add(new Option(s,s));select.value=[...select.options].some(x=>x.value===prior)?prior:'';}
async function reload(){const keys=Object.keys(C.TABLES);$('reload').disabled=true;status('Actualisation des données autorisées…');try{const results=await Promise.allSettled([...keys.map(k=>grist.docApi.fetchTable(C.TABLES[k])),grist.docApi.fetchTable('SIGMA_V2_RC_SYNTHESE_TEST'),grist.docApi.fetchTable(RC_TABLES.cibles),grist.docApi.fetchTable(RC_TABLES.demandes)]);for(let i=0;i<keys.length;i++){try{state[keys[i]]=results[i].status==='fulfilled'?C.rows(results[i].value):null;}catch{state[keys[i]]=null;}}try{state.rc=results[keys.length].status==='fulfilled'?C.rows(results[keys.length].value):null;}catch{state.rc=null;}for(const [index,key] of [[keys.length+1,'rcCibles'],[keys.length+2,'rcDemandes']]){try{state[key]=results[index].status==='fulfilled'?C.rows(results[index].value):null;}catch{state[key]=null;}}filters();render();const failed=keys.filter(k=>state[k]===null);status(failed.length?'Accès indisponible ou refusé sur : '+failed.map(k=>C.TABLES[k]).join(', ')+'. Aucune élévation de droits.':'Données actualisées selon vos habilitations.',false);}catch(err){status('Actualisation impossible : '+(err?.message||err),true);}finally{$('reload').disabled=false;}}
function init(){if(!C||!E){status('Modules de calcul métier manquants. Vérifier leur chargement.',true);return;}for(const btn of document.querySelectorAll('[data-tab]'))btn.addEventListener('click',()=>nav(btn.dataset.tab));for(const btn of document.querySelectorAll('[data-goto]'))btn.addEventListener('click',()=>nav(btn.dataset.goto));$('search').addEventListener('input',renderDossiers);$('status-filter').addEventListener('change',renderDossiers);$('close-detail').addEventListener('click',()=>{ui.selected=null;renderDetail();});$('reload').addEventListener('click',reload);$('quick-cr-entretien').addEventListener('change',()=>{quickVersionHint();updateQuickControls();});$('rc-affectation-form').addEventListener('submit',submitRCAffectation);$('quick-entretien').addEventListener('submit',saveQuickEntretien);$('quick-cr').addEventListener('submit',saveQuickCR);if(typeof grist==='undefined'){status('Widget à ouvrir dans Grist. Aucune donnée distante chargée.',true);render();return;}grist.ready({requiredAccess:'full'});reload();}
window.addEventListener('DOMContentLoaded',init);
})();
