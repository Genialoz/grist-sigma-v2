/* SIGMA V2.9.3.1 TEST — Publication et retransmission. Les ACL Grist font autorité. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SigmaCRPublication=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TABLE='SIGMA_V2_CONSULTATIONS_TEST';
const yes=v=>v===true||v===1;
const id=v=>Number.isSafeInteger(v)&&v>0;
const ref=v=>id(v)?v:Array.isArray(v)&&v[0]==='R'&&id(v[2])?v[2]:0;
const date=v=>typeof v==='number'?v:Array.isArray(v)&&['d','D'].includes(v[0])&&typeof v[1]==='number'?v[1]:0;
function history(c,crs,pubs,decisions){
 if(![crs,pubs,decisions].every(Array.isArray))throw Error('Historique indisponible.');
 const series=crs.filter(x=>ref(x.Entretien)===ref(c.Entretien));
 if(series.some(x=>!id(x.Version)||x.Version>c.Version)||new Set(series.map(x=>x.Version)).size!==series.length)throw Error('Sélectionnez la dernière version du compte rendu.');
 const prior=[];
 for(const v of series){
  const matches=pubs.filter(x=>x.Identifiant_Document===v.Identifiant_Metier);
  if(matches.length>1)throw Error('Publications incohérentes.');
  if(!matches.length)continue;
  const pub=matches[0];
  if(v.id===c.id)throw Error('Cette version est déjà publiée.');
  if(!yes(pub.Actif)||!id(pub.id)||!id(pub.Preparation_Publication)||pub.Version!==v.Version||pub.Texte!==v.Texte||!pub.Destinataire_Email)throw Error('Historique de publication incohérent.');
  const ds=decisions.filter(d=>ref(d.Consultation)===pub.id);
  if(ds.length!==1)throw Error('La version précédente doit faire l’objet d’une demande de correction.');
  const d=ds[0];
  if(d.Decision!=='Correction'||!yes(d.Consentement)||d.Auteur_Email!==pub.Destinataire_Email||d.Identifiant_Document!==pub.Identifiant_Document||d.Version!==pub.Version||typeof d.Observations!=='string'||!d.Observations.trim()||d.Observations.length>4000)throw Error('La version précédente ne permet pas de retransmission.');
  prior.push({v,pub,d});
 }
 prior.sort((a,b)=>b.v.Version-a.v.Version);
 if(prior.some(x=>x.pub.Destinataire_Email!==prior[0].pub.Destinataire_Email))throw Error('Destinataires historiques incohérents.');
 return prior;
}
function prepare(p,crs,preps,events,pubs,now=new Date(),decisions=[]){
 if(![crs,preps,events,pubs].every(Array.isArray)||!p||!id(p.id))throw Error('Données de publication indisponibles.');
 const c=crs.find(x=>x.id===ref(p.Compte_Rendu));
 if(!c||!id(ref(c.Entretien))||!id(c.Version)||c.Etat!=='Brouillon'||!yes(c.EC_Habilite_ACL)||!yes(p.EC_Habilite_ACL)||p.Action!=='Preparation'||!yes(c.Taille_Texte_Valide_ACL))throw Error('Compte rendu ou préparation non éligible.');
 if(typeof c.Identifiant_Metier!=='string'||!c.Identifiant_Metier.trim()||typeof c.Texte!=='string'||!c.Texte.trim()||new TextEncoder().encode(c.Texte).length>300000)throw Error('Identifiant ou texte invalide.');
 if(typeof p.Destinataire_Email!=='string'||p.Destinataire_Email!==p.Destinataire_Email.trim().toLowerCase()||!/^\S+@\S+\.\S+$/.test(p.Destinataire_Email)||p.Destinataire_Email==='anon@getgrist.com')throw Error('Destinataire invalide.');
 const expiry=date(p.Date_Expiration);
 if(!expiry||!Number.isFinite(expiry)||new Date(expiry*1000).toISOString().slice(0,10)<new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris'}).format(now))throw Error('Préparation expirée.');
 if(events.some(e=>ref(e.Preparation)===p.id))throw Error('Préparation révoquée.');
 const series=crs.filter(x=>ref(x.Entretien)===ref(c.Entretien));
 if(series.some(x=>!id(x.Version)||x.Version>c.Version)||series.filter(x=>x.Version===c.Version).length!==1)throw Error('Sélectionnez la dernière version du compte rendu.');
 const seriesIds=new Set(series.map(x=>x.id));
 const prepIds=new Set(preps.filter(x=>seriesIds.has(ref(x.Compte_Rendu))).map(x=>x.id));
 if(pubs.some(x=>x.Preparation_Publication===p.id||x.Identifiant_Document===c.Identifiant_Metier))throw Error('Cette version est déjà publiée.');
 const prior=history(c,crs,pubs,decisions);
 const priorIds=new Set(prior.map(x=>x.pub.Preparation_Publication));
 if(pubs.some(x=>prepIds.has(x.Preparation_Publication)&&!priorIds.has(x.Preparation_Publication)))throw Error('Historique de publication incohérent.');
 for(const x of prior){const previous=preps.find(z=>z.id===x.pub.Preparation_Publication);if(!previous||ref(previous.Compte_Rendu)!==x.v.id||previous.Destinataire_Email!==p.Destinataire_Email||x.pub.Destinataire_Email!==p.Destinataire_Email||previous.Createur_Email!==p.Createur_Email||x.pub.Publie_Par!==p.Createur_Email||date(x.pub.Date_Expiration)!==date(previous.Date_Expiration)||events.some(e=>ref(e.Preparation)===previous.id))throw Error('Destinataire modifié ou préparation précédente révoquée.');}
 return {Preparation_Publication:p.id,Identifiant_Document:c.Identifiant_Metier,Version:c.Version,Texte:c.Texte,Destinataire_Email:p.Destinataire_Email,Date_Expiration:expiry,Actif:true};
}
function confirmed(payload,rows){const match=rows.filter(r=>r.Preparation_Publication===payload.Preparation_Publication);return match.length===1&&Object.entries(payload).every(([k,v])=>k==='Actif'?yes(match[0][k]):k==='Date_Expiration'?date(match[0][k])===v:match[0][k]===v)&&yes(match[0].Acces_Actif_ACL);}
return {TABLE,history,prepare,confirmed};});
