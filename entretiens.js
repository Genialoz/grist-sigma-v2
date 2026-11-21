'use strict';
(function(){const C=window.SigmaEntretiensCore,$=id=>document.getElementById(id);const S={dossiers:null,entretiens:null,cr:null,busy:false,ready:false,selectedCR:null};
const text=(e,s)=>{e.textContent=String(s??'')};const writable=()=>window.SIGMA_ENTRETIENS_CONFIG?.TEST_WRITES_ENABLED===true;
function status(s,error=false){text($('status'),s);$('status').className=error?'error':'';}
function fill(id,options,placeholder){const el=$(id),old=el.value;el.replaceChildren();const opt=document.createElement('option');opt.value='';text(opt,placeholder);el.appendChild(opt);for(const item of options){const o=document.createElement('option');o.value=String(item.id);text(o,item.label);el.appendChild(o);}if(options.some(o=>String(o.id)===old))el.value=old;}
function render(){
 fill('e-dossier',(S.dossiers||[]).map(d=>({id:d.id,label:C.label(d)})),'— Choisir un dossier accessible —');
 fill('cr-entretien',(S.entretiens||[]).map(e=>({id:e.id,label:'Entretien #'+e.id+' — dossier '+C.label({id:Number(e.Dossier)})})),'— Choisir un entretien —');
 const h=$('history');h.replaceChildren();
 const detail=$('cr-detail');detail.hidden=true;text($('cr-detail-title'),'');text($('cr-detail-text'),'');
 if(!S.entretiens){text(h,'Table des entretiens non accessible : vérifier les ACL et les colonnes calculées.');$('e-save').disabled=true;$('cr-save').disabled=true;return;}
 for(const e of S.entretiens){
   const p=document.createElement('div');p.className='entry';
   const cr=C.versionsPourEntretien(S.cr,e.id);
   text(p,'Entretien #'+e.id+' · '+(e.Type||'')+' · '+cr.length+' version(s) accessible(s)');h.appendChild(p);
   for(const r of cr){
     const v=document.createElement('button');v.type='button';v.className='entry entry-button';
     text(v,'↳ Voir la version '+r.Version+' · '+(r.Etat||'Brouillon')+' · '+(r.Auteur_Email||'Auteur non renseigné'));
     v.setAttribute('aria-controls','cr-detail');
     v.addEventListener('click',()=>{S.selectedCR=r.id;showCR(r);});h.appendChild(v);
   }
 }
 if(!S.entretiens.length)text(h,'Aucun entretien accessible.');
 const can=writable()&&S.dossiers!==null&&S.entretiens!==null&&S.cr!==null&&!S.busy;
 $('e-save').disabled=!can;$('cr-save').disabled=!can;
 const selected=(S.cr||[]).find(r=>r.id===S.selectedCR);
 if(selected)showCR(selected);
}
function showCR(r){
 const d=$('cr-detail');d.hidden=false;
 text($('cr-detail-title'),'Entretien #'+r.Entretien+' · version '+r.Version+' · '+(r.Etat||'Brouillon'));
 text($('cr-detail-text'),r.Texte||'');
}

async function reload(){if(!S.ready)return;const arr=await Promise.allSettled(Object.values(C.TABLES).map(t=>grist.docApi.fetchTable(t)));[S.dossiers,S.entretiens,S.cr]=arr.map(r=>r.status==='fulfilled'?C.rows(r.value):null);render();status([['Dossiers',S.dossiers],['Entretiens',S.entretiens],['Comptes rendus',S.cr]].filter(([,v])=>v===null).map(([n])=>n).join(', ')||'Données chargées.');if([S.dossiers,S.entretiens,S.cr].some(x=>x===null))status('Tables absentes ou interdites : '+[['Dossiers',S.dossiers],['Entretiens',S.entretiens],['Comptes rendus',S.cr]].filter(([,v])=>v===null).map(([n])=>n).join(', '),true);}
async function saveEntretien(ev){ev.preventDefault();if(S.busy||!writable())return;try{const payload=C.entretien({Dossier:$('e-dossier').value,Date_Entretien:$('e-date').value,Type:$('e-type').value,EC_Email:$('e-ec').value,Modalite:$('e-modalite').value,Observation_Non_Nominative:$('e-observation').value},S.dossiers||[]);S.busy=true;render();await grist.docApi.applyUserActions([['AddRecord',C.TABLES.entretiens,null,payload]]);$('entretien-form').reset();await reload();status('Entretien enregistré dans Grist.');}catch(e){status('Enregistrement refusé : '+e.message,true);}finally{S.busy=false;render();}}
async function saveCR(ev){ev.preventDefault();if(S.busy||!writable())return;try{const payload=C.compteRendu({Entretien:$('cr-entretien').value,Auteur_Email:$('cr-auteur').value,Texte:$('cr-texte').value},S.entretiens||[],S.cr||[]);S.busy=true;render();await grist.docApi.applyUserActions([['AddRecord',C.TABLES.cr,null,payload]]);$('cr-form').reset();await reload();status('Nouvelle version de brouillon enregistrée.');}catch(e){status('Compte rendu non enregistré : '+e.message,true);}finally{S.busy=false;render();}}
function init(){if(!C||typeof grist==='undefined')return status('Ce module doit être ouvert dans Grist avec tous ses fichiers.',true);$('reload').addEventListener('click',()=>reload().catch(e=>status(e.message,true)));$('entretien-form').addEventListener('submit',saveEntretien);$('cr-form').addEventListener('submit',saveCR);grist.ready({requiredAccess:'full'});S.ready=true;reload().catch(e=>status(e.message,true));}window.addEventListener('DOMContentLoaded',init);
})();
