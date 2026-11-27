'use strict';
(function(){const C=window.SigmaDossiersCore,$=id=>document.getElementById(id);const A=window.SigmaAffectations;const state={mode:'dossiers',dossiers:null,faits:null,cellules:null,affectations:null,selected:null,busy:false,ready:false};
const writable=()=>window.SIGMA_DOSSIERS_CONFIG?.TEST_WRITES_ENABLED===true;
const txt=(node,val)=>{node.textContent=String(val??'');};
function msg(s,isError=false){txt($('message'),s);$('message').className='message'+(isError?' error':'');}
async function reload(){if(!state.ready)return;try{const results=await Promise.allSettled([C.tables.dossiers,C.tables.faits,C.tables.cellules,A.TABLE].map(t=>grist.docApi.fetchTable(t)));[state.dossiers,state.faits,state.cellules,state.affectations]=results.map(r=>r.status==='fulfilled'?C.rows(r.value):null);state.selected=null;render();if(!state.dossiers||!state.faits)msg('Table absente ou accès refusé : vérifier les deux imports et les ACL. Aucune permission contournée.',true);else msg('Données actualisées. '+(!state.affectations?'Historique des affectations indisponible : réaffectation bloquée. ':'')+(writable()?'Écritures TEST autorisées par configuration locale ; les ACL Grist restent obligatoires.':'Écriture bloquée tant que les ACL Owner-only ne sont pas validées.'));}catch(e){msg('Erreur de chargement : '+e.message,true);}}
function setMode(mode){state.mode=mode;state.selected=null;$('query').value='';render();}
function childLabel(r,fallback){return typeof r?.Identifiant_Metier==='string'&&r.Identifiant_Metier.startsWith('SIG-')?r.Identifiant_Metier:fallback;}
function render(){const dossierMode=state.mode==='dossiers';$('nav-dossiers').classList.toggle('active',dossierMode);$('nav-faits').classList.toggle('active',!dossierMode);txt($('heading'),dossierMode?'Signalements':'Faits signalés');txt($('subheading'),dossierMode?'Dossiers à saisie progressive, sans identité de personnes':'Typologie multiple : une ligne par fait, liée à un dossier');const records=dossierMode?state.dossiers:state.faits,fields=dossierMode?C.dossierFields:C.faitFields;const list=$('records');list.replaceChildren();$('create').hidden=!dossierMode;$('create').disabled=!dossierMode||!writable()||!records||state.busy;$('query').disabled=!records;
if(!records){txt(list,'Table indisponible.');$('form').hidden=true;$('facts-panel').hidden=true;$('assignment-panel').hidden=true;return;}
const term=$('query').value.toLowerCase().trim();const matches=records.filter(r=>{const label=dossierMode?C.title(r)+' SIG-'+String(r.id).padStart(6,'0')+' '+String(r.Statut||'')+' '+String(r.Cellule||''):String(r.Categorie||'')+' '+String(r.Dossier||'');return label.toLowerCase().includes(term);});for(const rec of matches){const btn=document.createElement('button');btn.type='button';btn.className='record'+(state.selected===rec.id?' selected':'');txt(btn,dossierMode?C.title(rec)+' · '+(rec.Statut||'Nouveau'):childLabel(rec,'Fait #'+rec.id)+' · '+String(rec.Categorie||'Fait')+(rec.Retire===true?' · Retiré':'')+' · dossier #'+rec.Dossier);btn.addEventListener('click',()=>{state.selected=rec.id;render();});list.appendChild(btn);}if(!matches.length)txt(list,'Aucun enregistrement accessible.');
const current=records.find(r=>r.id===state.selected);$('form').hidden=false;txt($('editor-title'),current?(dossierMode?C.title(current):childLabel(current,'Fait #'+current.id)):dossierMode?'Nouveau dossier':'Nouveau fait');txt($('editor-help'),!dossierMode?'Consultation des faits. Pour ajouter, corriger ou retirer un fait et ses critères, utilisez Synthèse dans l’Espace métier.':writable()?'Saisie TEST ; l’autorisation réelle dépend des ACL Grist.':'Consultation uniquement. Pour autoriser un essai d’écriture, installer d’abord les ACL Owner-only.');const zone=$('fields');zone.replaceChildren();fields.forEach(field=>zone.appendChild(makeField(field,current)));if(!dossierMode)for(const el of zone.querySelectorAll('input,select,textarea'))el.disabled=true;$('save').hidden=!dossierMode||!writable();$('cancel').hidden=!dossierMode||!writable();$('save').disabled=state.busy;$('facts-panel').hidden=!dossierMode||!current;$('assignment-panel').hidden=!dossierMode||!current; if(dossierMode&&current){renderAssignments(current);const facts=$('facts-list');facts.replaceChildren();for(const f of (state.faits||[]).filter(f=>Number(f.Dossier)===current.id)){const p=document.createElement('p');txt(p,childLabel(f,'Fait #'+f.id)+' · '+(f.Categorie||'Fait')+(f.Retire===true?' · Retiré':'')+(f.Date_Fait?' · '+dateDisplay(f.Date_Fait):''));facts.appendChild(p);}if(!facts.childNodes.length)txt(facts,'Aucun fait associé.');}}
function dateDisplay(v){if(!v)return '';if(typeof v==='number')return new Date(v*1000).toISOString().slice(0,10);return String(v).slice(0,10);}
function makeField(f,row){const [id,label,type,required,options]=f,wrap=document.createElement('div');wrap.className='field';const lab=document.createElement('label');lab.htmlFor='s-'+id;txt(lab,label+(required?' *':''));wrap.appendChild(lab);let el;if(type==='select'||type==='reference'){el=document.createElement('select');const choices=type==='reference'?(id==='Cellule'?C.referenceChoices(state.cellules):(state.dossiers||[]).map(r=>({id:r.id,label:C.title(r)}))):options.map(x=>({id:x,label:x}));for(const item of [{id:'',label:'— Choisir —'},...choices]){const op=document.createElement('option');op.value=String(item.id);txt(op,item.label);el.appendChild(op);}if(row?.[id]&&!choices.some(c=>String(c.id)===String(row[id]))){const op=document.createElement('option');op.value=String(row[id]);txt(op,'Référence #'+row[id]+' (masquée par les ACL — conservée)');el.appendChild(op);}}else if(type==='textarea'){el=document.createElement('textarea');el.rows=3;}else{el=document.createElement('input');el.type=type==='checkbox'?'checkbox':type==='date'?'date':type==='email'?'email':'text';}
el.id='s-'+id;el.name=id;el.required=!!required;el.disabled=!writable()||state.busy||id==='EC_Email'||(type==='reference'&&!!row?.[id]&&(id==='Cellule'?!(state.cellules||[]).some(r=>String(r.id)===String(row[id])):!(state.dossiers||[]).some(r=>String(r.id)===String(row[id]))));if(type==='checkbox')el.checked=row?.[id]===true;else if(type==='date')el.value=dateDisplay(row?.[id]);else el.value=row?.[id]??'';wrap.appendChild(el);return wrap;}
async function save(ev){ev.preventDefault();if(state.mode==='faits'){msg('Utilisez l’Espace métier pour gérer les faits et leurs critères.',true);return;}if(!writable()||state.busy){msg('Écriture non autorisée dans cette version.',true);return;}const dossierMode=state.mode==='dossiers',fields=dossierMode?C.dossierFields:C.faitFields,records=dossierMode?state.dossiers:state.faits,table=dossierMode?C.tables.dossiers:C.tables.faits,old=(records||[]).find(r=>r.id===state.selected);const data={};for(const f of fields){const el=$('s-'+f[0]);data[f[0]]=f[2]==='checkbox'?el.checked:el.value;}try{const values=C.validate(fields,data); if(dossierMode&&old){values.EC_Email=String(old.EC_Email||'');}else if(dossierMode){values.EC_Email='';}const changes=old?C.changedValues(old,values):values;
 // La liste des cellules est filtrée par les ACL : une référence existante peut donc être invisible.
 // Ne contrôler la visibilité que lors d'une création ou d'un changement de référence.
 C.checkReferenceChange('Cellule',dossierMode,old,changes,state.cellules);
 C.checkReferenceChange('Dossier',!dossierMode,old,changes,state.dossiers);
 state.busy=true;render();
 if(old&&Object.keys(changes).length===0){state.busy=false;render();return msg('Aucun changement à enregistrer.');}
 const action=old?['UpdateRecord',table,old.id,changes]:['AddRecord',table,null,changes];
 await grist.docApi.applyUserActions([action]);await reload();msg('Enregistrement confirmé par Grist.');}catch(e){msg('Enregistrement refusé : '+e.message,true);}finally{state.busy=false;render();}}
function renderAssignments(dossier){
 const panel=$('assignment-panel'), history=$('assignment-history');history.replaceChildren();
 const list=A.related(state.affectations,dossier.id);
 if(state.affectations===null){txt(history,'Historique non disponible : vérifier la table et ses ACL.');}
 else if(!list.length)txt(history,'Aucune affectation enregistrée dans ce module.');
 else for(const h of list){const p=document.createElement('p');p.className='assignment-event';
   const dt=h.Date_Declaration?new Date(Number(h.Date_Declaration)*1000).toLocaleString('fr-FR'):'Date inconnue';
   txt(p,dt+' — '+(h.Ancien_EC||'Non affecté')+' → '+(h.Nouvel_EC||'Non affecté')+' — '+(h.Motif||''));history.appendChild(p);}
 $('assignment-current').textContent=dossier.EC_Email||'Aucun écoutant désigné';
 $('assignment-next').value=dossier.EC_Email||'';
 $('assignment-reason').value='';
 const ok=writable()&&state.affectations!==null&&!state.busy;
 $('assignment-next').disabled=!ok;$('assignment-reason').disabled=!ok;$('assignment-save').disabled=!ok;
 $('assignment-help').textContent=ok?'Écriture de test Owner uniquement : changement et ligne d’historique envoyés ensemble à Grist.':'Réaffectation bloquée : mode lecture seule ou historique non accessible.';
}
async function assign(ev){
 ev.preventDefault(); if(!writable()||state.busy||state.affectations===null)return msg('Affectation interdite : vérifier le mode TEST et les ACL.',true);
 const dossier=(state.dossiers||[]).find(r=>r.id===state.selected);
 try{
   const payload=A.prepare(dossier,$('assignment-next').value,$('assignment-reason').value,Date.now()/1000);
   if(!confirm('Confirmer le changement d’écoutant pour '+C.title(dossier)+' ?'))return;
   state.busy=true; $('assignment-save').disabled=true;
   await grist.docApi.applyUserActions([payload.update,payload.history]);
   await reload();msg('Affectation enregistrée et historique ajouté dans Grist.');
 }catch(e){msg('Affectation non confirmée : '+e.message+' Vérifier le dossier et l’historique avant de réessayer.',true);}
 finally{state.busy=false;if(state.dossiers)render();}
}
function init(){if(!C){msg('Fichier signalements-core.js absent.',true);return;}$('nav-dossiers').addEventListener('click',()=>setMode('dossiers'));$('nav-faits').addEventListener('click',()=>setMode('faits'));$('reload').addEventListener('click',reload);$('query').addEventListener('input',render);$('create').addEventListener('click',()=>{if(state.mode!=='dossiers')return;state.selected=null;render();});$('cancel').addEventListener('click',()=>{state.selected=null;render();});$('form').addEventListener('submit',save);$('assignment-form').addEventListener('submit',assign);if(typeof grist==='undefined'){msg('Ce widget fonctionne uniquement à l’intérieur de Grist.',true);return;}grist.ready({requiredAccess:'full'});state.ready=true;reload();}
window.addEventListener('DOMContentLoaded',init);
})();
