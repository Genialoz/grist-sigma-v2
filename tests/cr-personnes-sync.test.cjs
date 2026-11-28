const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const C=require('../espace-metier-core.js');
const D=require('../cr-destinataires.js');
const source=readFileSync(require('node:path').join(__dirname,'../espace-metier.js'),'utf8');
const code=['syncTransmissionPersons','loadPersons','savePerson'].map(name=>source.split('\n').find(line=>line.startsWith('function '+name+'(')||line.startsWith('async function '+name+'('))).join('\n');
const dossier={id:3}, e={id:2,Dossier:3}, cr={id:10,Entretien:2};
const fields=['Nom','Prenom','Courriel'];
function fixture(people=[],fail=false){
 const state={crPersons:[],entretiens:[e],cr:[cr],rapports:[]}, ui={tab:'dossiers',detailTab:'personnes',selected:3,busy:false};
 let stored=people, renders=[], controls={};
 const table=(rows,keys)=>Object.fromEntries(keys.map(k=>[k,rows.map(r=>r[k]??'')]));
 const personTable=()=>table(stored,['id','Dossier','Qualites','Createur_Email','Date_Creation',...fields]);
 const ctx={C,state,ui,personSeq:0,personRows:[],personLogs:[],personLoaded:false,personEdit:{id:0,dossier:3},PERSON_TABLE:'people',PERSON_LOG:'log',PERSON_FIELDS:fields.map(k=>[k]),selectedDossier:()=>dossier,clearPersons(){ctx.personSeq++;ctx.personRows=[];ctx.personLogs=[];ctx.personLoaded=false;},renderCombinedEntretiens(){renders.push(state.crPersons);},renderPersons(){},set(){},$:(id)=>controls[id]??(controls[id]={}),personWritable:()=>true,personConditional(){},personValidate:()=>true,readPersonFields:()=>({Qualites:['L','Déclarant'],Courriel:'new@example.invalid'}),personSnapshot:r=>r,closePerson(){ctx.personEdit=null;},grist:{docApi:{async fetchTable(t){if(t==='people'){if(fail)throw Error('ACL');return personTable();}if(t==='log')return {id:[],Personne:[]};return {id:[3]};},async applyUserActions(){stored=[{id:4,Dossier:3,Qualites:['L','Déclarant'],Courriel:'new@example.invalid'}];}}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,state,renders};
}
(async()=>{
 let f=fixture();await f.ctx.savePerson({preventDefault(){}});assert.equal(D.recipients(cr,[e],f.state.crPersons)[0].email,'new@example.invalid');assert.equal(f.renders[0],null);assert.equal(f.renders.at(-1)[0].id,4);console.log('OK ajout : invalidation puis nouvelle lecture et rendu');
 f=fixture([{id:4,Dossier:3,Qualites:['L','Déclarant'],Courriel:'changed@example.invalid'}]);f.state.crPersons=[{id:4,Dossier:3,Qualites:['L','Déclarant'],Courriel:'old@example.invalid'}];await f.ctx.loadPersons();assert.equal(D.recipients(cr,[e],f.state.crPersons)[0].email,'changed@example.invalid');console.log('OK modification : adresse fraîche');
 f=fixture([]);f.state.crPersons=[{id:4,Dossier:3,Qualites:['L','Déclarant'],Courriel:'old@example.invalid'}];await f.ctx.loadPersons();assert.equal(f.state.crPersons.length,0);assert.throws(()=>D.recipients(cr,[e],f.state.crPersons),/Aucun déclarant/);console.log('OK absence de déclarant : ancien cache écarté');
 f=fixture([],true);f.state.crPersons=[{id:4,Dossier:3,Qualites:['L','Déclarant'],Courriel:'old@example.invalid'}];await f.ctx.loadPersons();assert.equal(f.state.crPersons,null);assert.throws(()=>D.recipients(cr,[e],f.state.crPersons),/indisponibles/);console.log('OK refus de lecture : cache invalidé');
})().catch(e=>{console.error(e);process.exitCode=1});
