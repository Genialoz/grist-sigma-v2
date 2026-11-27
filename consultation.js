'use strict';
(function(){
const C=window.SigmaConsultationCore,$=id=>document.getElementById(id);
const S={rapports:null,preparations:null,revocations:null,selected:null,busy:false};
function text(el,v){el.textContent=String(v??'');}
function status(v,err=false){text($('status'),v);$('status').className=err?'error':'';}
function readableDate(raw){const d=typeof raw==='number'?new Date(raw*1000):new Date(raw);return Number.isNaN(+d)?'Non renseignée':d.toLocaleDateString('fr-FR');}
function clearPreview(){text($('preview-title'),'Aucune version sélectionnée');text($('preview-meta'),'');text($('preview-content'),'');text($('preview-dest'),'');text($('preview-state'),'');$('preview-wrap').hidden=true;}
function show(entry){clearPreview();if(!entry)return;const {p,report,assessment}=entry;S.selected=p.id;
 if(!assessment.eligible){text($('preview-state'),'Prévisualisation bloquée : '+assessment.reasons.join(' · '));$('preview-state').className='blocked';return;}
 // ACL Grist limitent les données retournées. Le rendu DOM est strictement textuel.
 text($('preview-title'),report.Titre||'Rapport sans titre');
 text($('preview-meta'),(report.Identifiant_Metier||'Rapport #'+report.id+' · version '+report.Version+' · dossier #'+report.Dossier));
 text($('preview-dest'),'Destinataire prévu : '+p.Destinataire_Email+' · date limite : '+readableDate(p.Date_Expiration));
 window.SigmaRedaction ? SigmaRedaction.render($('preview-content'),report.Texte||'') : text($('preview-content'),report.Texte||'');
 text($('preview-state'),'Contrôles internes satisfaits — aucun accès externe activé');$('preview-state').className='ok';
 $('preview-wrap').hidden=false;
}
function render(){const area=$('entries');area.replaceChildren();clearPreview();const ready=[S.rapports,S.preparations,S.revocations].every(x=>x!==null);if(!ready){text(area,'Chargement incomplet : accès refusé ou table absente.');return;}
 const items=C.available(S.preparations,S.rapports,S.revocations);
 for(const item of items){const div=document.createElement('div');div.className='entry';const heading=document.createElement('strong');text(heading,'Préparation #'+item.p.id+' — '+(item.report?(item.report.Identifiant_Metier||'Rapport v'+item.report.Version):'Rapport inaccessible'));div.appendChild(heading);
 const line=document.createElement('p');text(line,'Destinataire '+(item.p.Destinataire_Email||'—')+' · expiration '+readableDate(item.p.Date_Expiration));div.appendChild(line);
 const message=document.createElement('small');message.className=item.assessment.eligible?'ok':'blocked';text(message,item.assessment.eligible?'Contrôles OK (interne)':'Bloquée : '+item.assessment.reasons.join(' · '));div.appendChild(message);
 const b=document.createElement('button');b.type='button';text(b,'Prévisualiser');b.disabled=!item.assessment.eligible;b.addEventListener('click',()=>show(item));div.appendChild(b);area.appendChild(div);}
 if(!items.length)text(area,'Aucune préparation accessible pour ce compte.');
 if(S.selected!==null){const item=items.find(x=>x.p.id===S.selected);if(item)show(item);}
}
async function reload(){if(S.busy)return;S.busy=true;status('Actualisation en cours…');try{const names=Object.values(C.TABLES);const replies=await Promise.allSettled(names.map(name=>grist.docApi.fetchTable(name)));[S.rapports,S.preparations,S.revocations]=replies.map(r=>r.status==='fulfilled'?C.rows(r.value):null);render();const unavailable=names.filter((_,i)=>replies[i].status!=='fulfilled');status(unavailable.length?'Tables indisponibles / ACL : '+unavailable.join(', '):'Consultation interne uniquement — aucun accès externe.',unavailable.length>0);}catch(err){S.rapports=S.preparations=S.revocations=null;render();status('Lecture impossible : '+(err?.message||String(err)),true);}finally{S.busy=false;}}
function init(){if(typeof grist==='undefined'||!C)return status('Widget SIGMA à ouvrir depuis Grist.',true);if(window.SIGMA_CONSULTATION_CONFIG?.EXTERNAL_ACCESS_ENABLED!==false||window.SIGMA_CONSULTATION_CONFIG?.WRITE_ENABLED!==false)return status('Configuration non sûre : fonctionnalités bloquées.',true);$('reload').addEventListener('click',reload);grist.ready({requiredAccess:'read table'});reload();}
window.addEventListener('DOMContentLoaded',init);
})();
