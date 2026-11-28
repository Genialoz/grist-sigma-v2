/* V2.9.3.1 TEST — retransmission depuis l'espace métier. Les ACL Grist font autorité. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./cr-publication-core.js'):root.SigmaCRPublication,typeof module==='object'&&module.exports?require('./cr-partages-core.js'):root.SigmaCRPartagesCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.SigmaCRRetransmission=api;})(typeof window==='undefined'?globalThis:window,function(P,C){'use strict';
const DEC='SIGMA_V2_DECISIONS_CR_TEST';
async function read(api){return Promise.all([...Object.values(C.TABLES),P.TABLE,DEC].map(t=>api.fetchTable(t).then(C.rows)));}
function candidate(data,expected,previous,date,now=new Date()){
 const [crs,preps,events,pubs,ds]=data;
 const cr=crs.find(r=>r.id===expected.id);
 if(!cr||['Identifiant_Metier','Version','Texte','Entretien'].some(k=>cr[k]!==expected[k]))throw Error('Le compte rendu a changé. Actualisez.');
 const history=P.history(cr,crs,pubs,ds);if(!history.length||history[0].pub.id!==previous.id||history[0].pub.Destinataire_Email!==previous.Destinataire_Email)throw Error('Historique modifié. Actualisez.');
 const expiry=C.expiration(date,now);const recipient=previous.Destinataire_Email;
 const active=preps.filter(p=>Number(p.Compte_Rendu)===cr.id&&C.state(p,events,now)==='Préparé — aucun lien externe');
 if(active.length>1||active.some(p=>p.Destinataire_Email!==recipient||p.Date_Expiration!==expiry))throw Error('Préparation existante différente : vérifiez-la dans Partage des comptes rendus.');
 const prep=active[0];
 // Validate history, authorization hints and recipient before creating a preparation.
 const draft=prep||{id:Number.MAX_SAFE_INTEGER,Compte_Rendu:cr.id,EC_Habilite_ACL:cr.EC_Habilite_ACL,Action:'Preparation',Createur_Email:previous.Publie_Par,Destinataire_Email:recipient,Date_Expiration:expiry};
 const payload=P.prepare(draft,crs,prep?preps:[...preps,draft],events,pubs,now,ds);
 return {prep,payload,cr,recipient,expiry};
}
async function send(api,expected,previous,date){
 let c=candidate(await read(api),expected,previous,date);
 if(!c.prep){
  await api.applyUserActions([['AddRecord',C.TABLES.preps,null,{Compte_Rendu:c.cr.id,Destinataire_Email:c.recipient,Date_Expiration:c.expiry,Action:'Preparation'}]]);
  c=candidate(await read(api),expected,previous,date);
  if(!c.prep)throw Error('Préparation non confirmée.');
 }
 await api.applyUserActions([['AddRecord',P.TABLE,null,c.payload]]);
 if(!P.confirmed(c.payload,C.rows(await api.fetchTable(P.TABLE))))throw Error('Publication non confirmée.');
 return c.payload;
}
return {candidate,send};});
