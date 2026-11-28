/* SIGMA V2.9.2.7.1 TEST — Première publication directe. Les ACL Grist font autorité. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SigmaCRPublication=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TABLE='SIGMA_V2_CONSULTATIONS_TEST';
const yes=v=>v===true||v===1;
const id=v=>Number.isSafeInteger(v)&&v>0;
const ref=v=>id(v)?v:Array.isArray(v)&&v[0]==='R'&&id(v[2])?v[2]:0;
const date=v=>typeof v==='number'?v:Array.isArray(v)&&['d','D'].includes(v[0])&&typeof v[1]==='number'?v[1]:0;
function prepare(p,crs,preps,events,pubs,now=new Date()){
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
 if(pubs.some(x=>x.Preparation_Publication===p.id||x.Identifiant_Document===c.Identifiant_Metier||prepIds.has(x.Preparation_Publication)))throw Error('Une publication existe déjà pour cet entretien. Les retransmissions seront disponibles dans la prochaine version.');
 return {Preparation_Publication:p.id,Identifiant_Document:c.Identifiant_Metier,Version:c.Version,Texte:c.Texte,Destinataire_Email:p.Destinataire_Email,Date_Expiration:expiry,Actif:true};
}
function confirmed(payload,rows){const match=rows.filter(r=>r.Preparation_Publication===payload.Preparation_Publication);return match.length===1&&Object.entries(payload).every(([k,v])=>k==='Actif'?yes(match[0][k]):k==='Date_Expiration'?date(match[0][k])===v:match[0][k]===v)&&yes(match[0].Acces_Actif_ACL);}
return {TABLE,prepare,confirmed};});
