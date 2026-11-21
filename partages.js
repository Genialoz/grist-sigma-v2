'use strict';
(function(){
const C=window.SigmaPartagesCore,$=id=>document.getElementById(id);
const S={reports:null,preps:null,events:null,ready:false,busy:false};
const text=(el,s)=>{el.textContent=String(s??'');};
function status(s,err=false){text($('status'),s);$('status').className=err?'error':'';}
const enabled=()=>window.SIGMA_PARTAGES_CONFIG?.TEST_PREPARATIONS_ENABLED===true&&window.SIGMA_PARTAGES_CONFIG?.EXTERNAL_ACCESS_ENABLED===false;
function dateText(v){if(!v)return '—';const d=typeof v==='number'?new Date(v*1000):new Date(v);return Number.isNaN(d.valueOf())?'Date non exploitable':d.toLocaleDateString('fr-FR');}
function render(){
 const select=$('report'),previous=select.value;select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';text(placeholder,'— Choisir une version accessible —');select.appendChild(placeholder);
 for(const r of S.reports||[]){const opt=document.createElement('option');opt.value=String(r.id);text(opt,'Dossier #'+r.Dossier+' · version '+r.Version+' · '+(r.Titre||'Sans titre'));select.appendChild(opt);}if((S.reports||[]).some(r=>String(r.id)===previous))select.value=previous;
 const allOK=S.reports!==null&&S.preps!==null&&S.events!==null;
 $('save').disabled=!enabled()||!allOK||S.busy;
 const history=$('history');history.replaceChildren();if(!allOK){text(history,'Une table est absente ou interdite. Vérifier la configuration et les ACL.');return;}
 const now=new Date();for(const p of [...S.preps].sort((a,b)=>Number(b.id)-Number(a.id))){const r=S.reports.find(r=>Number(r.id)===Number(p.Rapport));if(!r)continue;const state=C.state(p,S.events,now);const item=document.createElement('div');item.className='entry';const info=document.createElement('p');text(info,'Préparation #'+p.id+' · rapport #'+p.Rapport+' / version '+r.Version+' · destinataire '+p.Destinataire_Email+' · expiration '+dateText(p.Date_Expiration)+' · '+state);item.appendChild(info);const audit=document.createElement('small');text(audit,'Préparée le '+dateText(p.Date_Creation)+' par '+(p.Createur_Email||'auteur non tracé'));item.appendChild(audit);
 if(state==='Préparé — aucun accès externe'&&p.EC_Habilite_ACL===true){const btn=document.createElement('button');btn.type='button';btn.className='secondary';text(btn,'Révoquer cette préparation');btn.disabled=S.busy;btn.addEventListener('click',()=>revoke(p.id));item.appendChild(btn);}history.appendChild(item);}
 if(!history.childNodes.length)text(history,'Aucune préparation accessible.');
}
async function reload(){if(!S.ready)return;const names=Object.values(C.TABLES);const rs=await Promise.allSettled(names.map(t=>grist.docApi.fetchTable(t)));[S.reports,S.preps,S.events]=rs.map(x=>x.status==='fulfilled'?C.rows(x.value):null);render();const missing=names.filter((_,i)=>rs[i].status!=='fulfilled');status(missing.length?'Tables indisponibles : '+missing.join(', '):'Données chargées. Aucun accès externe n’est ouvert.',missing.length>0);}
async function save(ev){ev.preventDefault();if(S.busy||!enabled())return;try{if(S.reports===null||S.preps===null||S.events===null)throw Error('Données incomplètes');S.busy=true;render();const [reports,preps,events]=await Promise.all([C.TABLES.rapports,C.TABLES.preparations,C.TABLES.revocations].map(t=>grist.docApi.fetchTable(t).then(C.rows)));const payload=C.prepare({reportId:$('report').value,dest:$('dest').value,expiration:$('expiry').value},reports,preps,events);await grist.docApi.applyUserActions([['AddRecord',C.TABLES.preparations,null,payload]]);$('share-form').reset();await reload();status('Préparation enregistrée. Aucun lien envoyé, aucun accès externe créé.');}catch(e){status('Préparation refusée : '+(e.message||e),true);}finally{S.busy=false;render();}}
async function revoke(id){if(S.busy||!enabled())return;if(!confirm('Révoquer la préparation #'+id+' ? L’événement sera conservé dans Grist.'))return;try{S.busy=true;render();const [preps,events]=await Promise.all([C.TABLES.preparations,C.TABLES.revocations].map(t=>grist.docApi.fetchTable(t).then(C.rows)));const payload=C.revoke(id,preps,events);await grist.docApi.applyUserActions([['AddRecord',C.TABLES.revocations,null,payload]]);await reload();status('Révocation enregistrée.');}catch(e){status('Révocation refusée : '+(e.message||e),true);}finally{S.busy=false;render();}}
function init(){if(!C||typeof grist==='undefined')return status('Ouvrir ce widget dans Grist.',true);$('reload').addEventListener('click',()=>reload().catch(e=>status(e.message,true)));$('share-form').addEventListener('submit',save);grist.ready({requiredAccess:'full'});S.ready=true;reload().catch(e=>status(e.message,true));}
window.addEventListener('DOMContentLoaded',init);
})();
