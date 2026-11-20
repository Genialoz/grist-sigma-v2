/* SIGMA V2.0.7 — Console des habilitations : consultation et simulation locale sans écriture. */
(function(root,factory){const ui=factory(root);if(typeof module==='object'&&module.exports)module.exports=ui;root.SigmaAccessUI=ui;})(typeof window!=='undefined'?window:globalThis,function(root){
'use strict';
const A=root.SigmaAccess || (typeof require==='function'?require('./access.js'):null);
const modes=Object.freeze(['utilisateurs','affectations','profils','diagnostic','simulation','moa','matrice']);
const model={mode:'utilisateurs',search:'',status:'tous',draft:null};
const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;};
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const match=(text,search)=>norm(text).includes(norm(search).trim());
const find=(rows,id)=>Array.isArray(rows)?rows.find(x=>Number(x.id)===Number(id)):null;
const label=(rows,id,key,prefix)=>find(rows,id)?.[key]||(`${prefix} #${id||'?'}`);
const formatDate=v=>{const t=A.dateStamp(v);return t===null?'—':new Date(t*1000).toLocaleDateString('fr-FR',{timeZone:'UTC'});};
function status(h,now){if(h.Actif!==true&&h.Actif!==1)return 'Désactivée';const begin=A.dateStamp(h.Debut),end=A.dateStamp(h.Fin);if(begin===null)return 'À vérifier';if(now<begin)return 'À venir';if(end!==null&&now>end+86399)return 'Expirée';return 'Active (déclarative)';}
function validateDraft(d,records,org){const issues=[];const u=find(records.utilisateurs,d.user),p=find(records.profils,d.profile),c=find(org.cellules,d.cell);
 if(!u)issues.push('Sélectionner un utilisateur existant et accessible.');
 if(u&&u.Actif!==true&&u.Actif!==1)issues.push('Utilisateur marqué inactif.');
 if(!p||!A.CODES.includes(p.Code))issues.push('Sélectionner un des sept profils officiels.');
 if(p&&p.Actif!==true&&p.Actif!==1)issues.push('Profil marqué inactif.');
 if(!d.begin||A.dateStamp(d.begin)===null)issues.push('Renseigner une date de début valide.');
 if(d.end&&A.dateStamp(d.end)===null)issues.push('Date de fin invalide.');
 if(d.end&&A.dateStamp(d.begin)!==null&&A.dateStamp(d.end)<A.dateStamp(d.begin))issues.push('La date de fin est antérieure à la date de début.');
 if(p&&['RC','EC'].includes(p.Code)&&!c)issues.push('Une cellule est nécessaire pour ce profil local.');
 if(d.cell&&!c)issues.push('Cellule inconnue ou non accessible.');
 if(p&&['ATN','AN','ST','DP'].includes(p.Code)&&d.cell)issues.push('Le périmètre des profils nationaux doit être arbitré par la MOA.');
 if(Array.isArray(records.habilitations)&&records.habilitations.some(h=>Number(h.Utilisateur)===Number(d.user)&&Number(h.Profil)===Number(d.profile)&&Number(h.Cellule||0)===Number(d.cell||0)&&A.dateStamp(h.Debut)===A.dateStamp(d.begin)&&A.dateStamp(h.Fin)===A.dateStamp(d.end)))issues.push('Une affectation identique existe déjà.');
 return issues;
}
function render(rootEl,summary,records,org){rootEl.replaceChildren();summary.replaceChildren();const now=Date.now()/1000;
 const counts=A.summarize(records,now);summary.textContent=`${counts.users??'—'} utilisateur(s) · ${counts.habilitations??'—'} habilitation(s) · ${counts.active??'—'} déclarée(s) active(s)`;
 const warning=node('p','access-note','Préparation uniquement — accès complet au document TEST requis par le widget actuel. Les données du référentiel ne constituent pas des droits ACL. Ne pas saisir de données réelles.');rootEl.appendChild(warning);
 const toolbar=node('div','access-toolbar');rootEl.appendChild(toolbar);
 for(const [id,name] of [['utilisateurs','Utilisateurs'],['affectations','Affectations'],['profils','Profils'],['diagnostic','Diagnostics'],['simulation','Simuler une affectation'],['moa','Décisions MOA'],['matrice','Matrice des droits']]){const b=node('button','access-tab'+(model.mode===id?' selected':''),name);b.type='button';b.setAttribute('aria-pressed',String(model.mode===id));b.addEventListener('click',()=>{model.mode=id;render(rootEl,summary,records,org);});toolbar.appendChild(b);}
 const content=node('div','access-view');rootEl.appendChild(content);
 if(model.mode==='matrice'){
  const matrix=root.SigmaRightsMatrix;
  if(!matrix||!matrix.validate()){content.appendChild(node('p','access-note','Matrice non disponible ou invalide : vérifier rights-matrix.js.'));return;}
  content.appendChild(node('h3',null,'Droits métier par profil — matrice préparatoire'));
  content.appendChild(node('p','access-note','Les décisions métier ci-dessous ne sont pas des ACL effectives. « Autorisé » signifie autorisé SOUS conditions et non accès immédiat. Aucun accès sensible nouveau ne doit être accordé via cette interface.'));
  const controls=node('div','access-filters');content.appendChild(controls);
  const area=node('select');area.setAttribute('aria-label','Filtrer par domaine');
  const areas=['Tous les domaines',...new Set(matrix.rows.map(r=>r.area))];for(const a of areas){const op=node('option',null,a);op.value=a;area.appendChild(op);}controls.appendChild(area);
  const prof=node('select');prof.setAttribute('aria-label','Filtrer par profil');
  for(const [code,label] of [['','Tous les profils'],...matrix.profiles]){const opt=node('option',null,code?code+' — '+label:label);opt.value=code;prof.appendChild(opt);}controls.appendChild(prof);
  const result=node('div','matrix-results');content.appendChild(result);
  function drawMatrix(){result.replaceChildren();const chosen=prof.value;const selected=chosen?matrix.profiles.filter(p=>p[0]===chosen):matrix.profiles;
   const wrap=node('div','matrix-scroll');const table=node('table','rights-table');const thead=node('thead');const top=node('tr');for(const h of ['Action / périmètre',...selected.map(p=>p[0])])top.appendChild(node('th',null,h));thead.appendChild(top);table.appendChild(thead);const tbody=node('tbody');
   for(const r of matrix.rows.filter(x=>area.value==='Tous les domaines'||x.area===area.value)){const tr=node('tr');const summary=node('td');summary.appendChild(node('strong',null,r.area+' — '+r.action));summary.appendChild(node('small',null,r.ref+' · '+r.condition));tr.appendChild(summary);
    for(const [code] of selected){const td=node('td');const value=r.rights[code];const chip=node('span','right-state right-'+value,matrix.states[value]);td.appendChild(chip);tr.appendChild(td);}tbody.appendChild(tr);}table.appendChild(tbody);wrap.appendChild(table);result.appendChild(wrap);
   const note=node('p','muted','Légende : droits limités = conditions particulières ; « à arbitrer » = accès non accordé à ce stade. Les profils et règles restent soumis aux ACL, contrôles serveur, validation métier et tests multi-comptes.');result.appendChild(note);
  }
  area.addEventListener('change',drawMatrix);prof.addEventListener('change',drawMatrix);drawMatrix();return;
 }
 if(model.mode==='moa'){
  const policy=root.SigmaMOA;
  if(!policy){content.appendChild(node('p','access-note','Module des décisions MOA indisponible. Vérifier moa-rules.js.'));return;}
  content.appendChild(node('h3',null,'Règles métier communiquées par la MOA'));
  content.appendChild(node('p','access-note','Synthèse documentaire. Ces règles ne sont PAS appliquées comme habilitations dans cette version et ne remplacent pas les ACL.'));
  for(const [ref,title,desc] of policy.decisions){const item=node('div','access-card');item.appendChild(node('strong',null,ref+' — '+title));item.appendChild(node('small',null,desc));content.appendChild(item);}
  content.appendChild(node('h3',null,'Arbitrages nécessaires avant l’ouverture des accès sensibles'));
  for(const [priority,ref,desc] of policy.pending){const item=node('div','audit-issue attention');item.textContent=priority+' · '+ref+' — '+desc;content.appendChild(item);}
  return;
 }
 if(model.mode==='simulation')return renderSimulation(content,rootEl,summary,records,org);
 if(model.mode==='diagnostic'){const issues=A.validate(records,org,now);const h=node('h3',null,`Anomalies détectées (${issues.length})`);content.appendChild(h);if(!issues.length)content.appendChild(node('p','muted','Aucune anomalie détectée sur les enregistrements accessibles. Ce résultat ne vaut pas audit de sécurité.'));for(const issue of issues)content.appendChild(node('div','audit-issue '+issue.level,issue.message));return;}
 const controls=node('div','access-filters');content.appendChild(controls);const search=node('input');search.type='search';search.placeholder='Rechercher dans cette rubrique';search.setAttribute('aria-label','Rechercher');search.value=model.search;controls.appendChild(search);
 if(model.mode==='affectations'){const sel=node('select');sel.setAttribute('aria-label','Filtrer par état');for(const v of ['tous','Active (déclarative)','À venir','Expirée','Désactivée','À vérifier']){const o=node('option',null,v==='tous'?'Tous les états':v);o.value=v;sel.appendChild(o);}sel.value=model.status;sel.addEventListener('change',()=>{model.status=sel.value;draw();});controls.appendChild(sel);}
 const list=node('div','access-results');content.appendChild(list);
 function draw(){list.replaceChildren();let items=[];let available=true;
 if(model.mode==='utilisateurs'){available=Array.isArray(records.utilisateurs);items=(records.utilisateurs||[]).map(u=>({title:u.Nom_Affiche||u.Email||`Utilisateur #${u.id}`,desc:`${u.Email||'Sans courriel'} · ${u.Actif===true||u.Actif===1?'Actif':'Inactif'} · ${Array.isArray(records.habilitations)?records.habilitations.filter(h=>Number(h.Utilisateur)===Number(u.id)).length:'?'} affectation(s)`}));}
 if(model.mode==='profils'){available=Array.isArray(records.profils);items=(records.profils||[]).map(p=>({title:`${p.Code||'?'} — ${p.Libelle||''}`,desc:`${p.Description||'Description non renseignée'} · ${p.Actif===true||p.Actif===1?'Actif':'Inactif'}`}));}
 if(model.mode==='affectations'){available=Array.isArray(records.habilitations);items=(records.habilitations||[]).map(h=>({title:label(records.utilisateurs,h.Utilisateur,'Email','Utilisateur')+' · '+label(records.profils,h.Profil,'Code','Profil'),desc:`${h.Cellule?label(org.cellules,h.Cellule,'Nom','Cellule'):'Périmètre non local'} · Du ${formatDate(h.Debut)} au ${formatDate(h.Fin)} · ${status(h,now)}`,status:status(h,now)})).filter(x=>model.status==='tous'||x.status===model.status);}
 if(!available){list.appendChild(node('p','access-note','Cette table est absente ou inaccessible. Aucun contournement des permissions.'));return;}
 const visible=items.filter(x=>match(x.title+' '+x.desc,model.search));const limit=300;for(const x of visible.slice(0,limit)){const item=node('div','access-card');item.appendChild(node('strong',null,x.title));item.appendChild(node('small',null,x.desc));list.appendChild(item);}if(!visible.length)list.appendChild(node('p','muted','Aucun résultat.'));if(visible.length>limit)list.appendChild(node('p','muted',`Affichage limité à ${limit} enregistrements sur ${visible.length}.`));
 }
 search.addEventListener('input',()=>{model.search=search.value;draw();});draw();
}
function renderSimulation(content,rootEl,summary,records,org){content.appendChild(node('h3',null,'Préparer une affectation (simulation locale)'));content.appendChild(node('p','muted','Les valeurs saisies restent uniquement dans cet écran. Aucun enregistrement, aucun droit ni fichier ne sont créés.'));
 if(!Array.isArray(records.utilisateurs)||!Array.isArray(records.profils)||!Array.isArray(org.cellules)){content.appendChild(node('p','access-note','Les tables utilisateurs, profils et cellules doivent être accessibles pour simuler une affectation.'));return;}
 const form=node('form','access-draft');form.setAttribute('autocomplete','off');content.appendChild(form);
 const createSelect=(key,title,items)=>{const box=node('label','access-field',title);const sel=node('select');sel.name=key;sel.appendChild(new Option('— Choisir —',''));for(const [id,name] of items)sel.appendChild(new Option(name,String(id)));box.appendChild(sel);form.appendChild(box);return sel;};
 const u=createSelect('user','Utilisateur',records.utilisateurs.map(x=>[x.id,x.Email||`#${x.id}`]));
 const p=createSelect('profile','Profil',records.profils.map(x=>[x.id,`${x.Code||'?'} — ${x.Libelle||''}`]));
 const c=createSelect('cell','Cellule (selon profil)',[['','Sans cellule'],...org.cellules.map(x=>[x.id,x.Nom||`#${x.id}`])]);
 const dates={};for(const [key,title] of [['begin','Début'],['end','Fin (facultative)']]){const labelEl=node('label','access-field',title);const input=node('input');input.type='date';input.name=key;labelEl.appendChild(input);form.appendChild(labelEl);dates[key]=input;}
 if(model.draft){u.value=model.draft.user;p.value=model.draft.profile;c.value=model.draft.cell;dates.begin.value=model.draft.begin;dates.end.value=model.draft.end;}
 const btn=node('button','access-preview','Vérifier la proposition');btn.type='submit';form.appendChild(btn);const result=node('div','access-draft-result');content.appendChild(result);
 form.addEventListener('submit',ev=>{ev.preventDefault();const d={user:u.value,profile:p.value,cell:c.value,begin:dates.begin.value,end:dates.end.value};model.draft=d;result.replaceChildren();const issues=validateDraft(d,records,org);if(issues.length){result.appendChild(node('strong',null,`${issues.length} point(s) à corriger / arbitrer`));issues.forEach(x=>result.appendChild(node('div','audit-issue attention',x)));}else result.appendChild(node('p','access-note','Proposition cohérente au regard des vérifications locales. Aucune habilitation n’a été enregistrée ni accordée. La validation métier et les ACL restent nécessaires.'));});
}
return {render,validateDraft,status,formatDate};
});
