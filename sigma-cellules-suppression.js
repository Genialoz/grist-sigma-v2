/* SIGMA V2.7.2 — vérification conservatrice des références avant suppression.
   Les contrôles côté widget ne sont PAS une garantie transactionnelle.
   L'ACL D doit rester réservée au compte Owner technique. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaCellulesSuppression=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function rows(data){
  if(Array.isArray(data))return data;
  if(!data||!Array.isArray(data.id))throw Error('Métadonnées Grist illisibles.');
  return data.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(data).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));
 }
 function references(value,id,referenceList){
  if(referenceList){const ids=Array.isArray(value)?(value[0]==='L'?value.slice(1):value):[];return ids.some(v=>Number(v)===id);}
  return Number(value)===id;
 }
 function dependencyColumns(metaTables,metaColumns){
  const tables=rows(metaTables),columns=rows(metaColumns);
  if(!tables.length||!columns.length)throw Error('Inventaire des tables/colonnes vide : suppression bloquée.');
  const names=new Map(tables.map(t=>[Number(t.id),String(t.tableId||'')]));
  if(![...names.values()].includes('SIGMA_CELLULES'))throw Error('SIGMA_CELLULES absente du catalogue.');
  const deps=[];
  for(const c of columns){
   const table=names.get(Number(c.parentId));
   if(!table||table.startsWith('_grist_')||table==='SIGMA_CELLULES')continue;
   const type=String(c.type||'');
   const id=String(c.colId||'');
   if((type==='Ref:SIGMA_CELLULES'||type==='RefList:SIGMA_CELLULES')||(id==='Cellule_Code')){
    deps.push({table,column:id,kind:id==='Cellule_Code'?'code':type.startsWith('RefList:')?'list':'ref'});
   }
  }
  return deps;
 }
 async function verify(docApi,cellule){
  if(!docApi||!cellule||!Number.isSafeInteger(Number(cellule.id))||Number(cellule.id)<=0)throw Error('Cellule invalide.');
  const id=Number(cellule.id),code=String(cellule.Code||'').trim();
  if(!code)throw Error('Code de cellule absent.');
  // Relecture au moment du clic, pas confiance dans le cache du widget.
  const current=rows(await docApi.fetchTable('SIGMA_CELLULES'));
  const present=current.find(r=>Number(r.id)===id);
  if(!present||String(present.Code||'').trim()!==code)throw Error('Cellule modifiée depuis le chargement : actualiser.');
  const [tables,columns]=await Promise.all([docApi.fetchTable('_grist_Tables'),docApi.fetchTable('_grist_Tables_column')]);
  const deps=dependencyColumns(tables,columns);
  // Absence de droit de lecture sur UNE table liée => refus, jamais une preuve d'absence.
  const cache=new Map();
  for(const dep of deps){
   if(!cache.has(dep.table))cache.set(dep.table,rows(await docApi.fetchTable(dep.table)));
   const data=cache.get(dep.table);
   if(data.some(r=>dep.kind==='code'?String(r[dep.column]||'').trim()===code:references(r[dep.column],id,dep.kind==='list')))
    throw Error('Suppression bloquée : référence dans '+dep.table+' ('+dep.column+'). Utiliser « Archiver ».');
  }
  return {id,code,checkedTables:cache.size,checkedColumns:deps.length};
 }
 return {rows,references,dependencyColumns,verify};
});
