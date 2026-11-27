/* Fonctions métier pures ; indépendantes du DOM et de Grist. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaDossiersCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const tables=Object.freeze({dossiers:'SIGMA_V2_DOSSIERS_TEST',faits:'SIGMA_V2_FAITS_TEST',cellules:'SIGMA_CELLULES'});
 const dossierFields=[['Cellule','Cellule','reference',true],['Date_Saisine','Date de réception','date',true],['Canal','Canal de saisine','select',true,['Courriel','Téléphone','Présentiel','Courrier','Formulaire','Autre']],['Statut','Statut','select',true,['Nouveau','En cours','Clôturé']],['Anonyme','Saisine anonyme','checkbox',false],['EC_Email','Courriel professionnel EC référent','email',false],['Rapport_Signe_Declarant','Rapport signé par le déclarant (état déclaratif)','checkbox',false],['Anonymat_Leve','Levée d’anonymat constatée (état déclaratif)','checkbox',false],['Date_Cloture','Date de clôture','date',false]];
 const faitFields=[['Dossier','Dossier','reference',true],['Categorie','Catégorie de faits','select',true,['Harcèlement moral','Harcèlement sexuel','Agissement sexiste','Discrimination','Violence physique','Violence verbale','Autre']],['Date_Fait','Date du fait (si connue)','date',false],['Commentaire_Non_Nominatif','Précision non nominative (TEST)','textarea',false]];
 function rows(data){if(Array.isArray(data))return data;if(!data||!Array.isArray(data.id))throw Error('Réponse Grist inattendue');return data.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(data).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));}
 function dateStamp(s){if(!s)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Date invalide');const d=new Date(s+'T00:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('Date invalide');return Math.floor(d.getTime()/1000);}
 function validate(fields,input){const result={};for(const [id,label,type,required,opts] of fields){const raw=input[id]??(type==='checkbox'?false:'');if(required&&(raw===null||raw===undefined||raw===''))throw Error(label+' obligatoire');if(type==='reference'){const n=Number(raw);if(!Number.isSafeInteger(n)||n<=0)throw Error(label+' : référence invalide');result[id]=n;}else if(type==='date'){result[id]=dateStamp(raw);}else if(type==='checkbox'){result[id]=raw===true;}else {const val=String(raw).trim();if(type==='select'&&val&&!opts.includes(val))throw Error(label+' : valeur non autorisée');if(type==='email'&&val&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))throw Error('Adresse e-mail invalide');if(type==='textarea'&&val.length>500)throw Error('Précision trop longue (500 caractères max)');result[id]=val;}}
 if(fields===dossierFields){if(result.Statut==='Clôturé'&&!result.Date_Cloture)throw Error('Date de clôture obligatoire si clôturé');if(result.Statut!=='Clôturé'&&result.Date_Cloture)throw Error('Date de clôture réservée au statut Clôturé');if(result.Rapport_Signe_Declarant&&result.Anonyme) {/* La signature n’ouvre aucun droit automatiquement. */}}
 return result;}
 function changedValues(oldRecord, values){
   if(!oldRecord || !values || typeof values!=='object')throw Error('Comparaison impossible : enregistrement ou valeurs absents.');
   const out={};
   for(const [key,value] of Object.entries(values)){
     const before=oldRecord[key];
     const equal=(before===value)||(before==null&&value==null);
     if(!equal)out[key]=value;
   }
   return out;
 }
 function checkReferenceChange(field,applies,old,changes,visible){
   if(!applies)return;
   // Une référence inchangée ne doit pas être revalidée contre un référentiel
   // qui peut légitimement être masqué par les ACL du lecteur.
   if(old && !Object.prototype.hasOwnProperty.call(changes,field))return;
   const value=changes[field];
   if(!Array.isArray(visible)||!visible.some(r=>Number(r.id)===Number(value)))
     throw Error(field+' inexistante ou non accessible pour cette opération');
 }
 function referenceChoices(records){return (records||[]).map(r=>({id:r.id,label:r.Nom||('#'+r.id)})).sort((a,b)=>a.label.localeCompare(b.label,'fr'));}
 function rcEligible(d){return !!(d&&d.Rapport_Signe_Declarant===true&&d.Anonymat_Leve===true);}
 function title(d){const label=d.Identifiant_Dossier;return typeof label==='string'&&/^SIG-(?:[0-9]{8}-[0-9]{4,}|[0-9]{6,})$/.test(label)?label:'SIG-'+String(d.id).padStart(6,'0');}
 return {tables,dossierFields,faitFields,rows,validate,dateStamp,changedValues,checkReferenceChange,referenceChoices,rcEligible,title};
});
