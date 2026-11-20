/* Fonctions pures testables avec Node, sans dépendance navigateur. */
(function(root,factory){const x=factory();if(typeof module==='object'&&module.exports)module.exports=x;root.SigmaCore=x;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const TABLES={
  entites:{table:'SIGMA_ENTITES',title:'Entités',key:'Nom',description:'Référentiel institutionnel (national, académique, établissement).',fields:[['Code','Code stable','text',true],['Nom','Nom de l’entité','text',true],['Type_Entite','Type de structure','select',true,['Académie','Administration centrale','Établissement ESR','Établissement public national','Jeunesse et sports','Autre']],['Ministere','Périmètre ministériel','select',true,['Éducation nationale','Enseignement supérieur et recherche','Jeunesse et sports','Multi-ministériel']],['Territoire','Territoire','text',false],['Actif','Entité active','checkbox',false]]},
  cellules:{table:'SIGMA_CELLULES',title:'Cellules d’écoute',key:'Nom',description:'Une cellule peut être associée à une entité par son identifiant Grist.',fields:[['Code','Code de la cellule','text',true],['Nom','Nom de la cellule','text',true],['Entite','Entité de rattachement (ID Grist)','reference',true],['Date_Creation','Date de création','date',false],['Date_Service','Mise en service','date',false],['Perimetre','Périmètre territorial','text',false],['Responsable_Email','Courriel professionnel du responsable','email',false],['Supplant_Email','Courriel professionnel du suppléant','email',false],['Active','Cellule active','checkbox',false]]},
  membres:{table:'SIGMA_MEMBRES_CELLULE',title:'Membres des cellules',key:'Nom_Fonction',description:'Données professionnelles uniquement. Les droits sont appliqués par Grist, pas par ce formulaire.',fields:[['Cellule','Cellule (ID Grist)','reference',true],['Nom_Fonction','Nom ou identifiant professionnel','text',true],['Fonction','Fonction','select',true,['Médecin/Infirmier','RH','Référent égalité','Psychologue','Assistant social','Autre']],['Role','Rôle dans la cellule','text',false],['Date_Entree','Date d’entrée','date',false],['Date_Sortie','Date de sortie','date',false],['Quotite','Quotité','number',false],['Unite_Quotite','Unité de quotité','select',false,['ETP','Heures/semaine','Jours/an','Autre']],['Formation_Recue','Formation reçue','checkbox',false]]},
  conventions:{table:'SIGMA_CONVENTIONS',title:'Conventions',key:'Objet',description:'Suivi descriptif des conventions : aucune pièce jointe n’est exposée dans ce premier lot.',fields:[['Cellule','Cellule (ID Grist)','reference',true],['Objet','Objet de la convention','text',true],['Type_Convention','Type','select',true,['Mutualisation entre entités','Mutualisation avec établissement','Association','Prestataire']],['Partenaire','Partenaire','text',false],['Date_Signature','Date de signature','date',false],['Date_Effet','Date d’effet','date',false],['Date_Echeance','Échéance','date',false],['Etat','État','select',false,['En projet','En vigueur','Suspendue','Terminée']]]},
  fiche:{table:'SIGMA_FICHES_ORGANISATION',title:'Fiche d’organisation',key:'Exercice',description:'Une fiche par cellule et exercice. La modification doit être réservée au RC par ACL Grist.',fields:[['Cellule','Cellule (ID Grist)','reference',true],['Exercice','Année de référence','year',true],['Dispositif_Existe','Dispositif existant','checkbox',false],['Conformite_2023','Conformité déclarée à l’arrêté de 2023','checkbox',false],['Canaux_Saisine','Canaux de saisine','textarea',false],['Organisation_Entretiens','Organisation des entretiens','textarea',false],['Procedure_Locale','Procédure locale','textarea',false],['Frequence_Reunions','Fréquence des réunions','select',false,['Hebdomadaire','Tous les 15 jours','Mensuelle','Deux fois par mois','Trois fois ou plus par mois','Pas de réunion régulière']],['Campagne_Information','Campagne annuelle d’information','checkbox',false],['Difficultes','Difficultés et besoins','textarea',false]]}
 };
 function rows(raw){if(Array.isArray(raw))return raw;if(!raw||!Array.isArray(raw.id))throw Error('Format des données Grist inattendu');return raw.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(raw).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));}
 function value(field,input){const type=field[2];if(type==='checkbox')return !!input;if(type==='reference'){const n=Number(input);if(!Number.isSafeInteger(n)||n<=0)throw Error(field[1]+' : identifiant invalide');return n;}if(type==='year'){const n=Number(input);if(!Number.isInteger(n)||n<2000||n>2100)throw Error('Année invalide');return n;}if(type==='number'){if(input==='')return null;const n=Number(input);if(!Number.isFinite(n)||n<0)throw Error(field[1]+' : nombre invalide');return n;}if(type==='date'){if(!input)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(input)||Number.isNaN(Date.parse(input)))throw Error('Date invalide');return Math.floor(Date.parse(input+'T00:00:00Z')/1000);}return String(input??'').trim().slice(0,type==='textarea'?4000:250);}
 function validate(kind,source){const cfg=TABLES[kind];if(!cfg)throw Error('Rubrique inconnue');const fields={};for(const f of cfg.fields){const raw=source[f[0]]??(f[2]==='checkbox'?false:'');if(f[3]&&(raw===''||raw===null||raw===undefined))throw Error(f[1]+' est obligatoire');fields[f[0]]=value(f,raw);if(f[2]==='select'&&fields[f[0]]&&!f[4].includes(fields[f[0]]))throw Error('Option non autorisée : '+f[1]);}return fields;}
 const REFERENCES={cellules:{Entite:'entites'},membres:{Cellule:'cellules'},conventions:{Cellule:'cellules'},fiche:{Cellule:'cellules'}};
 function referenceKind(kind,field){return REFERENCES[kind]?.[field]||null;}
 function referenceOptions(kind,field,records){const target=referenceKind(kind,field);if(!target)return [];
  const rows=records?.[target];if(!Array.isArray(rows))return [];
  const labelKey=TABLES[target].key;
  return rows.filter(r=>Number.isSafeInteger(Number(r.id))&&Number(r.id)>0)
   .map(r=>({id:Number(r.id),label:String(r[labelKey]||r.Code||'Enregistrement '+r.id)}))
   .sort((a,b)=>a.label.localeCompare(b.label,'fr'));
 }
 function displayValue(kind,key,val,records){const target=referenceKind(kind,key);
  if(target && val!==null && val!==undefined && val!==''){
   const opt=referenceOptions(kind,key,records).find(r=>r.id===Number(val));
   return opt?opt.label:'Référence #'+String(val)+' (non accessible ou absente)';
  }
  return val??'';
 }
 function duplicateError(kind,values,records,excludeId){const existing=records?.[kind]||[];
  const same=(a,b)=>String(a??'').trim().toLocaleLowerCase('fr')===String(b??'').trim().toLocaleLowerCase('fr');
  if(kind==='entites'||kind==='cellules'){
   if(existing.some(r=>Number(r.id)!==Number(excludeId)&&same(r.Code,values.Code)))return 'Ce code existe déjà dans cette table.';
  }
  if(kind==='fiche'&&existing.some(r=>Number(r.id)!==Number(excludeId)&&Number(r.Cellule)===Number(values.Cellule)&&Number(r.Exercice)===Number(values.Exercice)))return 'Une fiche existe déjà pour cette cellule et cet exercice.';
  return null;
 }
 function audit(records){
  const findings=[];
  const push=(level,kind,id,detail)=>findings.push({level,kind,id,detail});
  for(const [kind,cfg] of Object.entries(TABLES)){
   const dataset=records?.[kind];
   if(!Array.isArray(dataset)){push('indisponible',kind,null,'Table non accessible : contrôles impossibles.');continue;}
   const seen=new Map();
   for(const row of dataset){
    for(const field of cfg.fields){
     const [column,,type,required]=field, val=row[column];
     if(required&&(val===null||val===undefined||val===''||(type==='reference'&&Number(val)<=0))){push('erreur',kind,row.id,'Champ obligatoire vide : '+column);}
     const target=referenceKind(kind,column);
     if(target&&val!==null&&val!==undefined&&val!==''&&Number(val)!==0){
      if(!Number.isSafeInteger(Number(val))||Number(val)<1){push('erreur',kind,row.id,'Référence invalide : '+column);}
      else if(Array.isArray(records[target])&&!records[target].some(r=>Number(r.id)===Number(val))){push('attention',kind,row.id,'Référence '+column+' non retrouvée parmi les enregistrements visibles (absente ou filtrée par ACL).');}
      else if(!Array.isArray(records[target])){push('indisponible',kind,row.id,'Référence '+column+' non vérifiable : table liée inaccessible.');}
     }
    }
    const uniq=(kind==='entites'||kind==='cellules')?String(row.Code??'').trim().toLocaleLowerCase('fr'):(kind==='fiche'?String(row.Cellule??'')+'|'+String(row.Exercice??''):'');
    if(uniq&&uniq!=='|'&&uniq!=='0|0'){
     if(seen.has(uniq))push('erreur',kind,row.id,'Doublon avec la ligne #'+seen.get(uniq));
     else seen.set(uniq,row.id);
    }
    const pairs=kind==='membres'?[['Date_Entree','Date_Sortie']]:kind==='conventions'?[['Date_Signature','Date_Echeance'],['Date_Effet','Date_Echeance']]:kind==='cellules'?[['Date_Creation','Date_Service']]:[];
    for(const [a,b] of pairs){const first=dateOrder(row[a]),last=dateOrder(row[b]);if(first!==null&&last!==null&&first>last)push('attention',kind,row.id,'Chronologie à vérifier : '+a+' postérieure à '+b);}
    if(kind==='membres'&&row.Quotite!==null&&row.Quotite!==undefined&&row.Quotite!==''&&Number(row.Quotite)<0)push('erreur',kind,row.id,'Quotité négative');
    if(kind==='fiche'&&row.Exercice!==null&&row.Exercice!==undefined&&row.Exercice!==''&&(!Number.isInteger(Number(row.Exercice))||Number(row.Exercice)<2000||Number(row.Exercice)>2100))push('erreur',kind,row.id,'Exercice invalide');
   }
  }
  return findings;
 }
 function dateOrder(v){if(v===null||v===undefined||v==='')return null;if(typeof v==='number'&&Number.isFinite(v))return v;const t=Date.parse(String(v));return Number.isFinite(t)?t/1000:null;}
 function query(rows,txt,key){const s=String(txt||'').trim().toLocaleLowerCase('fr');return rows.filter(r=>!s||Object.values(r).some(v=>String(v??'').toLocaleLowerCase('fr').includes(s))).sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''),'fr'));}
 return {TABLES,rows,value,validate,query,referenceKind,referenceOptions,displayValue,duplicateError,audit};
});
