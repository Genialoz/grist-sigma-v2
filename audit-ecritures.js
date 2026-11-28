'use strict';
const C='SIGMA_V2_CONSULTATIONS_TEST', D='SIGMA_V2_DECISIONS_CR_TEST';
const prefix='AUDIT-6262-';
const cases=[['version','Version incorrecte',{Version:2}],['consent','Sans consentement',{Consentement:false}],['correction','Correction vide',{Decision:'Correction'}],['observations','Validation avec observations',{Observations:'TEST'}],['decision','Décision inconnue',{Decision:'TEST'}],['identifiant','Identifiant incorrect',{Identifiant_Document:'AUDIT-INVALIDE'}]];
function actions(id,ident,extra={}){return [['AddRecord',D,null,{Consultation:id,Identifiant_Document:ident,Version:1,Decision:'Valide',Consentement:true,Observations:'',...extra}]];}
function denied(e){const msg=typeof e==='string'?e:String(e?.message||'');return /blocked by (?:table|row|column) (?:create|update|delete|read|access) access rules\b/i.test(msg)||/\bACL_DENY\b/.test(msg)||e?.code==='ACL_DENY'||/^(?:access denied|permission denied|not authorized|forbidden)[.!]?$/i.test(msg.trim())||Number(e?.status||e?.statusCode)===403;}
function rows(raw){if(!raw||!Array.isArray(raw.id))throw Error('shape');return raw.id.map((id,i)=>Object.fromEntries(Object.entries(raw).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v[i]])));}
function fixture(rs,ident,email){const m=rs.filter(r=>r.Identifiant_Document===ident);if(m.length!==1||m[0].Destinataire_Email!==email||m[0].Version!==1||![true,1].includes(m[0].Acces_Actif_ACL)||m[0].Texte!=='AUDIT FICTIF 6262'||!Number.isSafeInteger(m[0].id)||m[0].id<=0)throw Error('fixture');return m[0];}
function ref(v){return Array.isArray(v)&&v[0]==='R'?v[2]:v;}
if(typeof module!=='undefined')module.exports={actions,denied,rows,fixture,cases,ref};
if(typeof window!=='undefined')window.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id);let busy=false;
 if(!window.grist)return;
 $('run-write').disabled=false;
 $('run-write').onclick=async()=>{
 if(busy||!$('write-confirm').checked||!$('confirm').checked)return;
 const email=$('identity').value.trim();const side= email==='destinatairea@yahoo.fr'?'A':email==='destinataireb@yahoo.fr'?'B':'';
 if(!side){$('write-status').textContent='Compte fictif A ou B uniquement.';return;}
 if(!confirm('Exécuter les écritures de recette exclusivement sur les témoins fictifs AUDIT-6262 ?'))return;
 busy=true;const controls=['run','run-consult','run-write','identity','confirm','write-confirm'];controls.forEach(id=>$(id).disabled=true);$('write-results').replaceChildren();
 const add=(name,state,detail)=>{const tr=document.createElement('tr');for(const v of [name,state,detail]){const td=document.createElement('td');td.textContent=v;tr.append(td);}tr.className=state;$('write-results').append(tr);};
 let ok=0;let stage='Précontrôle';
 async function reject(name,act){stage=name;try{await grist.docApi.applyUserActions(act);}catch(e){if(denied(e)){add(name,'OK','Refus explicite');ok++;return;}add(name,'INCONCLUSIF','Erreur non classée ; arrêt (aucun refus ACL reconnu)');throw Error('stop');}add(name,'KO','Écriture acceptée ; arrêt');throw Error('stop');}
 try{
 const rs=rows(await grist.docApi.fetchTable(C)), ds=rows(await grist.docApi.fetchTable(D));
 const base=prefix+side+'-';const f=fixture(rs,base+'ACTIF',email), g=fixture(rs,base+'DATE',email), h=fixture(rs,base+'AUTEUR',email);
 if([f,g,h].some(x=>ds.some(d=>ref(d.Consultation)===x.id)))throw Error('fixture');
 for(const [,name,extra] of cases)await reject(name,actions(f.id,f.Identifiant_Document,extra));
 await reject('Modification consultation témoin',[['UpdateRecord',C,f.id,{Texte:'AUDIT FICTIF 6262 MODIF'}]]);
 await reject('Création consultation fictive',[['AddRecord',C,null,{Identifiant_Document:base+'INTERDIT',Version:1,Texte:'AUDIT FICTIF 6262',Destinataire_Email:email,Date_Expiration:f.Date_Expiration,Actif:true}]]);
 // An explicitly supplied false author must be denied or replaced by the authenticated identity.
 stage='Usurpation auteur';let auteurEcrit=false;try{await grist.docApi.applyUserActions(actions(h.id,h.Identifiant_Document,{Auteur_Email:'audit-invalide@example.invalid'}));auteurEcrit=true;const rr=rows(await grist.docApi.fetchTable(D)).filter(d=>ref(d.Consultation)===h.id);if(rr.length!==1||rr[0].Auteur_Email!==email){add(stage,'KO','Identité non confirmée ; arrêt');throw Error('stop');}add(stage,'OK','Identité authentifiée imposée');ok++;}catch(e){if(!auteurEcrit&&denied(e)){add(stage,'OK','Refus explicite');ok++;}else throw e;}
 stage='Falsification date';let dateEcrite=false;try{await grist.docApi.applyUserActions(actions(g.id,g.Identifiant_Document,{Date_Decision:946684800}));dateEcrite=true;const rr=rows(await grist.docApi.fetchTable(D)).filter(d=>ref(d.Consultation)===g.id);let t=rr[0]?.Date_Decision;if(Array.isArray(t)&&['d','D'].includes(t[0]))t=t[1];if(t instanceof Date)t=t.getTime()/1000;if(rr.length!==1||rr[0].Auteur_Email!==email||typeof t!=='number'||Math.abs(Date.now()/1000-t)>300){add(stage,'KO','Date serveur non confirmée ; arrêt');throw Error('stop');}add(stage,'OK','Date récente imposée');ok++;}catch(e){if(!dateEcrite&&denied(e)){add(stage,'OK','Refus explicite');ok++;}else throw e;}
 stage='Décision légitime';await grist.docApi.applyUserActions(actions(f.id,f.Identifiant_Document));const found=rows(await grist.docApi.fetchTable(D)).filter(d=>ref(d.Consultation)===f.id);if(found.length!==1||found[0].Auteur_Email!==email||found[0].Decision!=='Valide')throw Error('confirmation');add(stage,'OK','Décision confirmée');ok++;
 await reject('Deuxième décision',actions(f.id,f.Identifiant_Document));await reject('Modification décision témoin',[['UpdateRecord',D,found[0].id,{Observations:'AUDIT TEST'}]]);await reject('Suppression décision témoin',[['RemoveRecord',D,found[0].id]]);
 $('write-status').textContent=`${ok}/14 contrôles conformes. Ne pas relancer avec les mêmes témoins.`;
 }catch(e){$('write-status').textContent=`Arrêt : ${stage}. ${ok}/14 conformes. Vérifier avec Owner avant toute relance. Aucun message brut affiché.`;}
 finally{busy=false;controls.forEach(id=>$(id).disabled=false);$('write-confirm').checked=false;}
 };
});
