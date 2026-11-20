'use strict';
const $=id=>document.getElementById(id), C=window.SigmaCore, A=window.SigmaAccess;
const state={kind:'cellules',records:{},selected:null,ready:false,busy:false,access:{}};
const text=(el,s)=>{el.textContent=String(s??'');};
function message(msg,error=false){const el=$('alert');text(el,msg);el.className='alert '+(error?'error':'info');}
function readOnly(){return !window.SIGMA_CONFIG?.WRITE_ENABLED;}
async function refresh(){
 if(!state.ready)return;
 message('Chargement des données…');
 try {const data={};for(const kind of Object.keys(C.TABLES)){try{data[kind]=C.rows(await grist.docApi.fetchTable(C.TABLES[kind].table));}catch(e){data[kind]=null;}}
 state.records=data;const access={};for(const [name,table] of Object.entries(A.TABLES)){try{access[name]=C.rows(await grist.docApi.fetchTable(table));}catch(e){access[name]=null;}}state.access=access;render();const missing=Object.keys(data).filter(k=>data[k]===null);message(missing.length?'Tables absentes ou interdites : '+missing.map(k=>C.TABLES[k].table).join(', ')+'. Aucune permission contournée.':'Données actualisées. '+(readOnly()?'Écriture désactivée en attente de validation ACL.':''),!!missing.length);
 }catch(e){message('Erreur Grist : '+e.message,true);}}

function renderAccess(){
 const list=$('access-list'),summary=$('access-summary');if(!list||!summary){message('Interface habilitations incomplète : mettre à jour les fichiers du widget.',true);return;}
 list.replaceChildren();summary.replaceChildren();const now=Date.now()/1000, data=state.access;
 const counts=A.summarize(data,now);text(summary,`Utilisateurs : ${counts.users??'indisponible'} · Habilitations : ${counts.habilitations??'indisponible'} · Actives à ce jour : ${counts.active??'indisponible'}`);
 const issues=A.validate(data,state.records,now);const make=(parent,tag,s,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;text(el,s);parent.appendChild(el);return el;};
 const note=make(list,'div','Référentiel de préparation seulement : ni ces données ni les boutons du widget ne constituent un contrôle ACL.','access-note');
 const panels=[['Profils officiels','profils'],['Utilisateurs','utilisateurs'],['Affectations et habilitations','habilitations']];
 for(const [label,key] of panels){const section=document.createElement('section');section.className='access-block';make(section,'h3',label);const entries=data[key];if(!Array.isArray(entries)){make(section,'p','Table absente ou inaccessible. Importer le CSV correspondant dans SIGMA V2-TEST.');list.appendChild(section);continue;}
 if(!entries.length)make(section,'p','Aucun enregistrement.');
 for(const r of entries.slice(0,250)){let content='';if(key==='profils')content=String(r.Code||'')+' — '+String(r.Libelle||'');
 else if(key==='utilisateurs')content=String(r.Email||'')+' — '+String(r.Nom_Affiche||'')+(r.Actif===false?' (inactif)':'');
 else {const u=data.utilisateurs?.find(x=>Number(x.id)===Number(r.Utilisateur));const p=data.profils?.find(x=>Number(x.id)===Number(r.Profil));const c=state.records.cellules?.find(x=>Number(x.id)===Number(r.Cellule));content=(u?.Email||'Utilisateur #'+r.Utilisateur)+' · '+(p?.Code||'Profil #'+r.Profil)+' · '+(c?.Nom||(!r.Cellule?'Périmètre non local':'Cellule #'+r.Cellule))+' · '+(A.validOn(r,now)?'Active':'Non active')+' · '+String(r.Debut||'Date non définie');}
 make(section,'div',content,'access-item');}
 if(entries.length>250)make(section,'p','Affichage limité aux 250 premiers enregistrements.');list.appendChild(section);
 }
 const diag=document.createElement('section');diag.className='access-block';make(diag,'h3','Contrôles des habilitations');if(!issues.length)make(diag,'p','Aucune anomalie détectée dans les lignes accessibles (ne vaut pas validation de sécurité).');
 for(const issue of issues){make(diag,'div',issue.message,'audit-issue '+issue.level);}list.appendChild(diag);
}

function renderAudit(){
 const issues=C.audit(state.records);
 const summary=$('audit-summary'),list=$('audit-list');
 if(!summary||!list){message('Éléments du contrôle de cohérence absents : mettre à jour index.html.',true);return;}
 summary.replaceChildren();list.replaceChildren();
 const totals={erreur:0,attention:0,indisponible:0};issues.forEach(x=>totals[x.level]++);
 text(summary,`${totals.erreur} erreur(s) · ${totals.attention} point(s) à vérifier · ${totals.indisponible} contrôle(s) impossible(s)`);
 if(!issues.length){const p=document.createElement('p');text(p,'Aucune anomalie détectée dans les données accessibles. Cela ne prouve pas l’absence d’autres incohérences.');list.appendChild(p);return;}
 for(const issue of issues){const row=document.createElement('div');row.className='audit-issue '+issue.level;const name=document.createElement('strong');text(name,C.TABLES[issue.kind].table+(issue.id?' · ligne #'+issue.id:''));const detail=document.createElement('span');text(detail,issue.detail);row.append(name,detail);list.appendChild(row);}
}
function render(){
 const auditMode=state.kind==='controles', accessMode=state.kind==='habilitations';
 const auditPanel=$('audit-panel'), dataLayout=$('data-layout'), accessPanel=$('access-panel');
 if(!auditPanel||!dataLayout||!accessPanel){
  message('Interface incomplète : fichiers HTML/JS de versions différentes. Publiez index.html, app.js et core.js de la même archive, puis actualisez sans cache.',true);
  return;
 }
 auditPanel.hidden=!auditMode;accessPanel.hidden=!accessMode;dataLayout.hidden=auditMode||accessMode;
 if(accessMode){text($('title'),'Utilisateurs et habilitations');text($('subtitle'),'Préparation des rattachements — aucune attribution de droits actifs');document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.section==='habilitations'));renderAccess();return;}
 if(auditMode){text($('title'),'Contrôles de cohérence');text($('subtitle'),'Diagnostic de qualité sur les lignes visibles selon les droits Grist.');document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.section==='controles'));renderAudit();return;}
 const cfg=C.TABLES[state.kind];text($('title'),cfg.title);text($('subtitle'),cfg.description);document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.section===state.kind));const recs=state.records[state.kind];$('new').disabled=readOnly()||!recs||state.busy;$('search').disabled=!recs;const list=$('list');list.replaceChildren();if(!recs){text(list,'Table non accessible. Vérifier l’import et les ACL.');$('editor').hidden=true;return;}const matches=C.query(recs,$('search').value,cfg.key);for(const r of matches){const b=document.createElement('button');b.type='button';b.className='record'+(Number(r.id)===state.selected?' selected':'');text(b,`${C.displayValue(state.kind,cfg.key,r[cfg.key],state.records)||'Sans titre'} · #${r.id}`);b.addEventListener('click',()=>select(r.id));list.appendChild(b);}if(!matches.length)text(list,'Aucun élément.');renderForm();}
function select(id){state.selected=id;render();}
function fieldInput(f,current){const [key,label,type,required,options]=f;const wrap=document.createElement('div');wrap.className='field';const lab=document.createElement('label');lab.htmlFor='field-'+key;text(lab,label+(required?' *':''));wrap.appendChild(lab);let input;if(type==='reference'){input=document.createElement('select');const choices=C.referenceOptions(state.kind,key,state.records);for(const [v,l] of [['','— Sélectionner —'],...choices.map(x=>[String(x.id),x.label])]){const op=document.createElement('option');op.value=v;text(op,l);input.appendChild(op);}const id=current?.[key];if(id!==null&&id!==undefined&&id!==''&&!choices.some(x=>x.id===Number(id))){const op=document.createElement('option');op.value=String(id);text(op,'Référence #'+id+' (non accessible ou absente)');input.appendChild(op);}if(!choices.length&&!id){const op=document.createElement('option');op.value='';text(op,'Aucune donnée accessible dans la table liée');op.disabled=true;input.appendChild(op);}}else if(type==='select'){input=document.createElement('select');for(const [v,l] of [['','— Choisir —'],...options.map(x=>[x,x])]){const op=document.createElement('option');op.value=v;text(op,l);input.appendChild(op);}}else if(type==='textarea'){input=document.createElement('textarea');input.rows=3;}else{input=document.createElement('input');input.type=type==='reference'||type==='year'||type==='number'?'number':type==='checkbox'?'checkbox':type; if(type==='reference'){input.min='1';input.step='1';}if(type==='year'){input.min='2000';input.max='2100';}if(type==='number'){input.min='0';input.step='any';}}
 input.id='field-'+key;input.name=key;input.required=!!required;input.disabled=readOnly();if(type==='checkbox')input.checked=!!current?.[key];else if(type==='date'){const val=current?.[key];input.value=typeof val==='number'&&val>0?new Date(val*1000).toISOString().slice(0,10):String(val||'').slice(0,10);}else input.value=current?.[key]??'';wrap.appendChild(input);return wrap;}
function renderForm(){const recs=state.records[state.kind],cfg=C.TABLES[state.kind];if(!recs){$('editor').hidden=true;return;}const record=recs.find(r=>Number(r.id)===state.selected);$('editor').hidden=false;text($('formtitle'),record?'Détails · #'+record.id:'Nouvelle fiche');text($('formhelp'),readOnly()?'Lecture seule : activation après tests des ACL et habilitations.':'Les enregistrements sont contrôlés par les ACL de Grist. Les doublons sont vérifiés dans les lignes accessibles.');const area=$('fields');area.replaceChildren();for(const f of cfg.fields)area.appendChild(fieldInput(f,record));$('save').hidden=readOnly();$('cancel').hidden=readOnly();$('save').disabled=state.busy;}
async function save(event){event.preventDefault();if(readOnly()||state.busy)return message('Écriture désactivée.',true);const kind=state.kind,cfg=C.TABLES[kind];const old=(state.records[kind]||[]).find(r=>Number(r.id)===state.selected);const input={};for(const f of cfg.fields){const node=$('field-'+f[0]);input[f[0]]=f[2]==='checkbox'?node.checked:node.value;}try{const values=C.validate(kind,input);const duplicate=C.duplicateError(kind,values,state.records,old?.id);if(duplicate)throw Error(duplicate);state.busy=true;$('save').disabled=true;const action=old?['UpdateRecord',cfg.table,old.id,values]:['AddRecord',cfg.table,null,values];await grist.docApi.applyUserActions([action]);state.selected=null;await refresh();message('Enregistrement effectué dans Grist.');}catch(e){message('Enregistrement refusé : '+e.message,true);}finally{state.busy=false;render();}}
function init(){document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{state.kind=b.dataset.section;state.selected=null;$('search').value='';render();}));$('search').addEventListener('input',render);$('new').addEventListener('click',()=>{state.selected=null;render();$('fields').querySelector('input:not([type=checkbox])')?.focus();});$('cancel').addEventListener('click',()=>{state.selected=null;render();});$('refresh').addEventListener('click',refresh);$('editor').addEventListener('submit',save);if(typeof grist==='undefined'){message('Ouvrez ce widget depuis Grist. Aucune donnée locale simulée.',true);return;}grist.ready({requiredAccess:'full'});state.ready=true;refresh();}
window.addEventListener('DOMContentLoaded',init);
