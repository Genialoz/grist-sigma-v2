/* V2.9.3.1.1 TEST — destinataire issu du dossier, jamais saisi librement. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./cr-partages-core.js'):root.SigmaCRPartagesCore,typeof module==='object'&&module.exports?require('./cr-publication-core.js'):root.SigmaCRPublication);if(typeof module==='object'&&module.exports)module.exports=api;else root.SigmaCRDestinataires=api;})(typeof window==='undefined'?globalThis:window,function(C,P){'use strict';
const PERSON='SIGMA_V2_PERSONNES_TEST',ENT='SIGMA_V2_ENTRETIENS_TEST',DOS='SIGMA_V2_DOSSIERS_TEST',DEC='SIGMA_V2_DECISIONS_CR_TEST';
const ref=v=>typeof v==='number'?v:Array.isArray(v)&&v[0]==='R'?v[2]:0;
const yes=v=>v===true||v===1;
function recipients(cr,ents,people,previous=null){
 if(!Array.isArray(ents)||!Array.isArray(people))throw Error('Fiches personnes indisponibles. Actualisez les données.');
 const e=ents.find(x=>x.id===ref(cr.Entretien));if(!e||!ref(e.Dossier))throw Error('Entretien ou dossier inaccessible.');
 const rows=people.filter(p=>ref(p.Dossier)===ref(e.Dossier)&&Array.isArray(p.Qualites)&&p.Qualites.includes('Déclarant'));
 if(!rows.length)throw Error('Aucun déclarant identifié dans la rubrique Personnes.');
 const out=rows.map(p=>{let email='';try{email=C.cleanEmail(p.Courriel);if(email==='anon@getgrist.com')email='';}catch{}return {id:p.id,email,label:[p.Prenom,p.Nom].filter(Boolean).join(' ')||'Déclarant #'+p.id};});
 const valid=out.filter(x=>x.email&&out.filter(y=>y.email===x.email).length===1&&(!previous||x.email===previous.Destinataire_Email));
 if(!valid.length)throw Error(previous?'Le courriel du déclarant initial est absent, modifié ou ambigu.':'Renseignez un courriel valide et unique dans la fiche du déclarant (rubrique Personnes).');
 return valid;
}
function candidate(data,expected,recipient,date,previous=null,now=new Date()){
 const [crs,preps,events,pubs,ds,ents,people,dossiers]=data;
 const cr=crs.find(x=>x.id===expected.id);if(!cr||['Identifiant_Metier','Version','Texte','Entretien'].some(k=>cr[k]!==expected[k]))throw Error('Compte rendu modifié. Actualisez.');
 const e=ents.find(x=>x.id===ref(cr.Entretien)),d=e&&dossiers.find(x=>x.id===ref(e.Dossier));
 if(!d||!yes(d.Referent_UI_ACL)||!yes(d.Gestion_UI_ACL)||!yes(d.EC_Habilite_ACL)||!cr.EC_Email_ACL||cr.EC_Email_ACL!==d.EC_Email)throw Error('Habilitation du référent indisponible.');
 const prior=P.history(cr,crs,pubs,ds);if(previous?(prior[0]?.pub.id!==previous.id||prior[0]?.pub.Destinataire_Email!==previous.Destinataire_Email):prior.length!==0)throw Error('Historique modifié. Actualisez.');
 if(!recipients(cr,ents,people,previous).some(x=>x.id===recipient.id&&x.email===recipient.email))throw Error('Fiche du déclarant modifiée. Actualisez.');
 const expiry=C.expiration(date,now);
 const active=preps.filter(p=>ref(p.Compte_Rendu)===cr.id&&C.state(p,events,now)==='Préparé — aucun lien externe');
 if(active.length>1||active.some(p=>p.Destinataire_Email!==recipient.email||Number(p.Date_Expiration)!==expiry))throw Error('Préparation existante différente : vérifiez ou révoquez-la avant de poursuivre.');
 const prep=active[0];if(prep&&prep.Createur_Email!==cr.EC_Email_ACL)throw Error('Préparation appartenant à un autre référent.');
 const draft=prep||{id:Number.MAX_SAFE_INTEGER,Compte_Rendu:cr.id,EC_Habilite_ACL:cr.EC_Habilite_ACL,Action:'Preparation',Createur_Email:cr.EC_Email_ACL,Destinataire_Email:recipient.email,Date_Expiration:expiry};
 const payload=P.prepare(draft,crs,prep?preps:[...preps,draft],events,pubs,now,ds);
 return {prep,payload,cr,expiry};
}
async function read(api){return Promise.all([...Object.values(C.TABLES),P.TABLE,DEC,ENT,PERSON,DOS].map(t=>api.fetchTable(t).then(C.rows)));}
async function send(api,expected,recipient,date,previous=null){let c=candidate(await read(api),expected,recipient,date,previous);if(!c.prep){await api.applyUserActions([['AddRecord',C.TABLES.preps,null,{Compte_Rendu:c.cr.id,Destinataire_Email:recipient.email,Date_Expiration:c.expiry,Action:'Preparation'}]]);c=candidate(await read(api),expected,recipient,date,previous);if(!c.prep)throw Error('Préparation non confirmée.');}await api.applyUserActions([['AddRecord',P.TABLE,null,c.payload]]);if(!P.confirmed(c.payload,C.rows(await api.fetchTable(P.TABLE))))throw Error('Publication non confirmée. Vérifiez avant toute nouvelle tentative.');return c.payload;}
return {recipients,candidate,send};});
