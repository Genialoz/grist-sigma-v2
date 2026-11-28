const assert=require('node:assert/strict');const R=require('../cr-renouvellements.js');const now=new Date('2026-11-28T23:30:00Z');const ts=s=>Date.parse(s+'T00:00:00Z')/1000;
const r={id:1,Entretien:2,Version:2,Identifiant_Metier:'CR2',Texte:'fictif'};const p={id:3,Preparation_Publication:4,Version:2,Identifiant_Document:'CR2',Texte:'fictif',Actif:true,Publie_Par:'ec@example.test',Referent_Publication_ACL:'ec@example.test',Destinataire_Email:'a@example.test',Date_Expiration:ts('2026-11-25'),Date_Expiration_Effective:ts('2026-11-25'),Acces_Actif_ACL:false};const prep={id:4,Compte_Rendu:1,EC_Habilite_ACL:true,Action:'Preparation',Createur_Email:p.Publie_Par,Destinataire_Email:p.Destinataire_Email,Date_Expiration:p.Date_Expiration};
const info=(pub=p,ds=[],preps=[prep],events=[])=>R.info(r,[pub],ds,preps,events,now);
let n=0;function test(name,fn){fn();n++;console.log('OK '+name);}
test('date Paris après minuit',()=>assert.equal(R.today(now),'2026-11-29'));
test('date +30',()=>assert.equal(R.plus(30,now),'2026-12-29'));
test('expiration',()=>assert.equal(info().kind,'expired'));
test('expiration proche',()=>assert.equal(info({...p,Date_Expiration_Effective:ts('2026-12-03'),Acces_Actif_ACL:true}).kind,'expiring'));
test('attente normale',()=>assert.equal(info({...p,Date_Expiration_Effective:ts('2026-12-28'),Acces_Actif_ACL:true}).kind,'pending'));
test('révoqué',()=>assert.equal(info(p,[],[prep],[{Preparation:4}]),null));
test('décision existante',()=>assert.equal(info(p,[{Consultation:3}]),null));
test('préparation absente',()=>assert.equal(info(p,[],[]),null));
test('date effective absente',()=>assert.equal(info({...p,Date_Expiration_Effective:null}),null));
test('accès refusé non expiré',()=>assert.equal(info({...p,Date_Expiration_Effective:ts('2026-12-03')}),null));
test('date passée refusée',()=>assert.throws(()=>R.payload('2026-11-28','relance',now)));
test('motif vide refusé',()=>assert.throws(()=>R.payload('2026-12-03','   ',now)));
test('date impossible refusée',()=>assert.throws(()=>R.payload('2026-02-31','relance',now)));
const names=['SIGMA_V2_COMPTES_RENDUS_TEST','SIGMA_V2_CONSULTATIONS_TEST','SIGMA_V2_DECISIONS_CR_TEST','SIGMA_V2_CR_PARTAGES_TEST','SIGMA_V2_CR_PARTAGES_REVOCATIONS_TEST',R.TABLE,'SIGMA_V2_DOSSIERS_TEST','SIGMA_V2_ENTRETIENS_TEST'];
function mock({closed=false,changed=false,confirm=true}={}){const data=[[r],[{...p,Date_Expiration_Effective:changed?ts('2026-11-26'):p.Date_Expiration_Effective}],[],[prep],[],[],[{id:5,Statut:closed?'Clôturé':'En cours',Referent_UI_ACL:true,Gestion_UI_ACL:true,EC_Habilite_ACL:true,EC_Email:p.Publie_Par}],[{id:2,Dossier:5}]];let writes=0;return {get writes(){return writes},fetchTable:async t=>data[names.indexOf(t)],applyUserActions:async a=>{writes++;assert.equal(a[0][0],'AddRecord');assert.equal(a[0][1],R.TABLE);const x=a[0][3];assert.deepEqual(Object.keys(x).sort(),['Consultation','Motif','Nouvelle_Date_Expiration']);if(confirm){data[5].push({...x,id:9,Auteur_Email:p.Publie_Par,Renouvellement_Valide_ACL:true});data[1][0]={...p,Date_Expiration_Effective:x.Nouvelle_Date_Expiration,Acces_Actif_ACL:true};}}};}
(async()=>{let api=mock();const updated=await R.renew(api,r,info(),'2026-12-03','relance',now);assert.equal(updated.Date_Expiration,p.Date_Expiration);assert.equal(updated.Date_Expiration_Effective,ts('2026-12-03'));assert.equal(api.writes,1);console.log('OK renouvellement confirmé sans modification de publication');n++;
for(const [label,options,expectedWrites] of [['dossier clôturé',{closed:true},0],['date changée entre lectures',{changed:true},0],['écriture non confirmée',{confirm:false},1]]){api=mock(options);await assert.rejects(()=>R.renew(api,r,info(),'2026-12-03','relance',now));assert.equal(api.writes,expectedWrites);console.log('OK '+label);n++;}console.log(n+' tests réussis');})().catch(e=>{console.error(e);process.exitCode=1;});
