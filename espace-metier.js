'use strict';(function(){
const C=window.SigmaEspaceCore,E=window.SigmaEntretiensCore,$=id=>document.getElementById(id);
const state={dossiers:null,entretiens:null,cr:null,rapports:null,rc:null,rcCibles:null,rcDemandes:null,cellules:null,habilitations:null,affectations:null,rdv:null,rdvHist:null},ui={busy:false,tab:'accueil',selected:null,report:null};
const METIER_TABLES={cellules:'SIGMA_CELLULES',habilitations:'SIGMA_V2_EC_HABILITATIONS_TEST',affectations:'SIGMA_V2_AFFECTATIONS_TEST',rdv:'SIGMA_V2_RENDEZ_VOUS_TEST',rdvHist:'SIGMA_V2_RDV_HISTORIQUE_TEST'};
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
function nav(tab){ui.tab=tab;for(const n of document.querySelectorAll('[data-tab]')){const active=n.dataset.tab===tab;n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}for(const sec of document.querySelectorAll('.tab'))sec.hidden=sec.id!=='tab-'+tab;const names={accueil:['Vue d’ensemble','Synthèse des informations accessibles'],rc:['Supervision RC','Synthèse non nominative de la cellule autorisée'],dossiers:['Dossiers','Consultation des dossiers et de leurs éléments liés'],entretiens:['Entretiens et comptes rendus','Historique des entretiens et versions accessibles'],rapports:['Rapports internes','Consultation des rapports autorisés, en lecture seule'],outils:['Modules métier','Accéder aux actions disponibles dans SIGMA TEST'],nouveau:['Nouveau signalement','Création EC : attribution par formule Grist'],agenda:['Mon agenda','Rendez-vous liés aux dossiers autorisés']};set($('page-title'),names[tab][0]);set($('page-subtitle'),names[tab][1]);render();}
function visibleDossiers(){const ds=state.dossiers;if(!Array.isArray(ds))return null;const term=$('search').value.toLocaleLowerCase('fr').trim(),filter=$('status-filter').value;return C.sorted(ds).filter(d=>(!filter||String(d.Statut||'')===filter)&&(!term||[C.dossierLabel(d.id),d.id,d.Statut,d.Canal].map(x=>String(x??'')).join(' ').toLocaleLowerCase('fr').includes(term)));}
function showDossier(id){const d=(state.dossiers||[]).find(x=>Number(x.id)===Number(id));if(!d)return;ui.selected=d.id;nav('dossiers');renderDetail();$('dossier-detail').scrollIntoView?.({behavior:'smooth',block:'nearest'});}
function renderHome(){const m=$('metrics');m.replaceChildren();m.append(metric('Dossiers',count(state,'dossiers'),'Autorisés'),metric('Entretiens',count(state,'entretiens'),'Accessibles'),metric('Comptes rendus',count(state,'cr'),'Versions visibles'),metric('Rapports',count(state,'rapports'),'Internes visibles'));
renderUpcoming();const recent=$('recent-dossiers');recent.replaceChildren();if(state.dossiers===null)empty(recent,'Table dossiers inaccessible : ne pas déduire le nombre de dossiers de la cellule.');else if(!state.dossiers.length)empty(recent,'Aucun dossier accessible.');else for(const d of C.sorted(state.dossiers).slice(0,6))recent.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · EC : '+val(d.EC_Email,'Non affecté'),val(d.Statut,'Nouveau'),()=>showDossier(d.id)));
const area=$('status-stats');area.replaceChildren();const stats=C.stats(state);if(!stats){empty(area,'Statistiques indisponibles : accès à la table dossiers refusé.');return;}if(!stats.total){empty(area,'Aucune donnée accessible.');return;}for(const [key,value] of Object.entries(stats.byStatus)){const row=node('div','status-row');row.append(node('span',null,key));const bar=node('span','bar'),inner=document.createElement('i');inner.style.width=(100*value/stats.total)+'%';bar.append(inner);row.append(bar,node('span','value',value));area.append(row);}}
function renderDossiers(){const list=$('dossiers');list.replaceChildren();const rows=visibleDossiers();set($('dossier-counter'),rows===null?'Indisponible':rows.length+' dossier(s)');if(rows===null){empty(list,'Accès non autorisé à la table dossiers. Aucun contournement de la sécurité.');$('dossier-detail').hidden=true;return;}if(!rows.length)empty(list,'Aucun dossier pour ces critères.');for(const d of rows)list.append(item(C.dossierLabel(d.id),'Canal : '+val(d.Canal)+' · Référent : '+val(d.EC_Email,'Non affecté'),val(d.Statut,'Nouveau'),()=>showDossier(d.id)));renderDetail();}
function pill(label,value){return node('span',null,label+' : '+val(value));}
function renderDetail(){const section=$('dossier-detail');const d=(state.dossiers||[]).find(x=>x.id===ui.selected);section.hidden=!d;if(!d)return;set($('dossier-title'),C.dossierLabel(d.id));const props=$('dossier-meta');props.replaceChildren();props.append(pill('Statut',d.Statut),pill('Canal',d.Canal),pill('Date de saisine',C.formatDate(d.Date_Saisine)),pill('EC affecté',d.EC_Email));const related=C.relation(state,d.id);
const e=$('dossier-entretiens');e.replaceChildren();if(state.entretiens===null)empty(e,'Entretiens non accessibles.');else if(!related.entretiens.length)empty(e,'Aucun entretien accessible.');else for(const r of C.sorted(related.entretiens))e.append(item('Entretien #'+r.id,'Date : '+C.formatDate(r.Date_Entretien),val(r.Type,'Entretien')));
const cr=$('dossier-cr');cr.replaceChildren();if(state.cr===null||state.entretiens===null)empty(cr,'Versions de CR non accessibles.');else if(!related.cr.length)empty(cr,'Aucun CR accessible.');else for(const r of [...related.cr].sort((a,b)=>Number(b.Version)-Number(a.Version)))cr.append(item('CR #'+r.id+' · version '+val(r.Version),'Entretien #'+val(r.Entretien),val(r.Etat,'État inconnu')));
const rs=$('dossier-rapports');rs.replaceChildren();if(state.rapports===null)empty(rs,'Rapports non accessibles.');else if(!related.rapports.length)empty(rs,'Aucun rapport accessible.');else for(const r of [...related.rapports].sort((a,b)=>Number(b.Version)-Number(a.Version)))rs.append(item('Rapport v'+val(r.Version),val(r.Titre,'Sans titre'),val(r.Etat,'État inconnu'),()=>showReport(r.id)));
renderQuickEntry(d,related);renderTransfer(d);const act=$('dossier-actions');act.replaceChildren();for(const title of ['Dossiers et faits','Entretiens et comptes rendus','Préparations et révocations de CR','Rapports internes']){const link=configLink(title);if(link)act.append(makeLink('Ouvrir : '+title,link,'inline-link'));}}

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
// V2.6.4 : les ACL Grist restent la seule frontière de sécurité.
function localDate(d){const parts=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')];return parts.join('-');}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||''));}
function cellLabel(c){return String(c?.Nom||c?.Code||('Cellule #'+c?.id));}
function renderNewDossier(){
 const sel=$('new-cellule'),old=sel.value;sel.replaceChildren(new Option('— Choisir une cellule autorisée —',''));
 for(const c of state.cellules||[])sel.add(new Option(cellLabel(c),String(c.id)));
 if([...sel.options].some(o=>o.value===old))sel.value=old;
 const enabled=quickEnabled()&&Array.isArray(state.cellules)&&state.cellules.length>0&&Array.isArray(state.dossiers)&&!ui.busy;
 for(const id of ['new-date','new-canal','new-cellule','new-save'])$(id).disabled=!enabled;
 if(!enabled)set($('new-message'),'Création indisponible : vérifier SIGMA_CELLULES, les ACL et les écritures TEST.');
}
async function saveNewDossier(ev){ev.preventDefault();const msg=$('new-message');
 try{
  if(!quickEnabled()||ui.busy||!Array.isArray(state.cellules)||!Array.isArray(state.dossiers))throw Error('Tables ou droits indisponibles.');
  const cell=Number($('new-cellule').value);if(!Number.isSafeInteger(cell)||!state.cellules.some(c=>Number(c.id)===cell))throw Error('Cellule inaccessible.');
  const canal=$('new-canal').value,allowed=['Courriel','Téléphone','Présentiel','Courrier','Formulaire','Autre'];if(!allowed.includes(canal))throw Error('Canal invalide.');
  const ds=$('new-date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(ds))throw Error('Date de saisine obligatoire.');
  const time=new Date(ds+'T00:00:00Z');if(!Number.isFinite(time.getTime())||time.toISOString().slice(0,10)!==ds)throw Error('Date invalide.');
  if(!confirm('Créer un dossier fictif ? Grist attribuera le dossier à l’EC connecté, si l’ACL le permet.'))return;
  ui.busy=true;$('new-save').disabled=true;
  // Ne PAS envoyer EC_Email : formule déclenchée Grist = user.Email, non choisie par le widget.
  await grist.docApi.applyUserActions([['AddRecord','SIGMA_V2_DOSSIERS_TEST',null,{Cellule:cell,Date_Saisine:Math.floor(time.getTime()/1000),Canal:canal,Statut:'Nouveau',Anonyme:true}]]);
  $('new-dossier-form').reset();await reload();set(msg,'Création envoyée à Grist. Vérifiez le dossier créé et EC_Email (identité authentifiée), avant de poursuivre.');
 }catch(e){set(msg,'Création refusée : '+(e?.message||e));}finally{ui.busy=false;renderNewDossier();}
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
function render(){if(ui.tab==='accueil')renderHome();if(ui.tab==='rc'){renderRC();renderRCAffectations();}if(ui.tab==='dossiers')renderDossiers();if(ui.tab==='entretiens')renderEntretiens();if(ui.tab==='rapports')renderRapports();if(ui.tab==='outils')renderTools();if(ui.tab==='nouveau')renderNewDossier();if(ui.tab==='agenda')renderAgenda();}
function filters(){const select=$('status-filter'),prior=select.value;select.replaceChildren(new Option('Tous les statuts',''));for(const s of [...new Set((state.dossiers||[]).map(d=>String(d.Statut||'Non renseigné')))].sort())select.add(new Option(s,s));select.value=[...select.options].some(x=>x.value===prior)?prior:'';}
async function reload(){const keys=Object.keys(C.TABLES);$('reload').disabled=true;status('Actualisation des données autorisées…');try{const results=await Promise.allSettled([...keys.map(k=>grist.docApi.fetchTable(C.TABLES[k])),grist.docApi.fetchTable('SIGMA_V2_RC_SYNTHESE_TEST'),grist.docApi.fetchTable(RC_TABLES.cibles),grist.docApi.fetchTable(RC_TABLES.demandes),...Object.values(METIER_TABLES).map(t=>grist.docApi.fetchTable(t))]);for(let i=0;i<keys.length;i++){try{state[keys[i]]=results[i].status==='fulfilled'?C.rows(results[i].value):null;}catch{state[keys[i]]=null;}}try{state.rc=results[keys.length].status==='fulfilled'?C.rows(results[keys.length].value):null;}catch{state.rc=null;}for(const [index,key] of [[keys.length+1,'rcCibles'],[keys.length+2,'rcDemandes']]){try{state[key]=results[index].status==='fulfilled'?C.rows(results[index].value):null;}catch{state[key]=null;}}for(const [i,key] of Object.keys(METIER_TABLES).entries()){try{state[key]=results[keys.length+3+i].status==='fulfilled'?C.rows(results[keys.length+3+i].value):null;}catch{state[key]=null;}}filters();render();const failed=keys.filter(k=>state[k]===null);status(failed.length?'Accès indisponible ou refusé sur : '+failed.map(k=>C.TABLES[k]).join(', ')+'. Aucune élévation de droits.':'Données actualisées selon vos habilitations.',false);}catch(err){status('Actualisation impossible : '+(err?.message||err),true);}finally{$('reload').disabled=false;}}
function init(){if(!C||!E){status('Modules de calcul métier manquants. Vérifier leur chargement.',true);return;}for(const btn of document.querySelectorAll('[data-tab]'))btn.addEventListener('click',()=>nav(btn.dataset.tab));for(const btn of document.querySelectorAll('[data-goto]'))btn.addEventListener('click',()=>nav(btn.dataset.goto));$('search').addEventListener('input',renderDossiers);$('status-filter').addEventListener('change',renderDossiers);$('close-detail').addEventListener('click',()=>{ui.selected=null;renderDetail();});$('reload').addEventListener('click',reload);$('quick-cr-entretien').addEventListener('change',()=>{quickVersionHint();updateQuickControls();});$('rc-affectation-form').addEventListener('submit',submitRCAffectation);$('quick-entretien').addEventListener('submit',saveQuickEntretien);$('quick-cr').addEventListener('submit',saveQuickCR);$('new-dossier-form').addEventListener('submit',saveNewDossier);$('rdv-form').addEventListener('submit',saveRdv);$('rdv-reset').addEventListener('click',resetRdv);$('agenda-mode').addEventListener('change',renderAgenda);$('agenda-date').addEventListener('change',renderAgenda);$('agenda-prev').addEventListener('click',()=>shiftAgenda(-1));$('agenda-next').addEventListener('click',()=>shiftAgenda(1));$('agenda-today').addEventListener('click',()=>{$('agenda-date').value=localDate(new Date());renderAgenda();});$('transfer-form').addEventListener('submit',saveTransfer);if(typeof grist==='undefined'){status('Widget à ouvrir dans Grist. Aucune donnée distante chargée.',true);render();return;}grist.ready({requiredAccess:'full'});$('agenda-date').value=localDate(new Date());reload();}
window.addEventListener('DOMContentLoaded',init);
})();
