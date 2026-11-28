const assert=require('node:assert/strict'),D=require('../cr-decision-core.js');
const p={id:1,Identifiant_Document:'CR-V01',Version:1,Destinataire_Email:'a@example.invalid'};
const d={Consultation:1,Identifiant_Document:p.Identifiant_Document,Version:1,Auteur_Email:p.Destinataire_Email,Consentement:true,Decision:'Signe',Observations:'',Date_Decision:1800000000};
let n=0;function t(name,fn){fn();console.log('OK '+name);n++;}
const run=(ds)=>D.describe(p,ds);
t('signature',()=>assert.match(run([d]).label,/Signé/));
t('correction',()=>assert.equal(run([{...d,Decision:'Correction',Observations:'Corriger'}]).observations,'Corriger'));
t('aucune décision',()=>assert.match(run([]).label,/Aucune/));
t('lecture impossible',()=>assert.match(run(null).label,/indisponibles/));
t('autre consultation',()=>assert.match(run([{...d,Consultation:2}]).label,/Aucune/));
t('référence encodée',()=>assert.match(run([{...d,Consultation:['R','T',1]}]).label,/Signé/));
t('doublon',()=>assert.match(run([d,d]).label,/incohérentes/));
for(const [key,val] of Object.entries({Auteur_Email:'b@example.invalid',Version:2,Identifiant_Document:'autre',Consentement:false,Decision:'Valide',Observations:'non vide'}))t('refus '+key,()=>assert.match(run([{...d,[key]:val}]).label,/incohérente/));
t('correction vide',()=>assert.match(run([{...d,Decision:'Correction'}]).label,/incohérente/));
console.log(n+' tests réussis');
