'use strict';
(()=>{
const $=id=>document.getElementById(id), TABLE='SIGMA_V2_LIAISON_TEST';
const role=new URLSearchParams(location.search).get('role');
const validRole=['principal','consultations'].includes(role), peer=role==='principal'?'consultations':'principal';
const hex=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
let channel=null, pending=null, busy=false, uncertain=false, epoch=0, seen=new Set();
const set=(id,t)=>{$(id).textContent=t;};
function controls(){ $('connect').disabled=!validRole||!!channel||busy; $('generate').disabled=!validRole||!!channel||busy; $('code').disabled=!!channel||busy; $('close').disabled=!channel||busy; $('send').disabled=!channel||busy; $('save').disabled=!channel||!pending||busy||uncertain; }
function close(){epoch++;if(channel)channel.close();channel=null;pending=null;seen.clear();uncertain=false;set('status','Canal fermé.');set('received','Aucun signal reçu.');controls();}
function receive(e){const m=e.data;if(!channel||!m||typeof m!=='object'||Object.keys(m).sort().join(',')!=='id,kind,role'||m.kind!=='SIGMA_TEST'||m.role!==peer||!hex(m.id)||seen.has(m.id))return;if(seen.size>=100){set('status','Limite de 100 signaux atteinte. Fermez et rouvrez le canal.');return;}seen.add(m.id);if(pending||busy||uncertain){set('status','Signal supplémentaire ignoré : traitez le signal en attente.');return;}pending=m.id;set('received','Signal fictif reçu de '+peer+' : '+m.id);controls();}
function connect(){if(!validRole||channel)return;const code=$('code').value.trim().toLowerCase();if(!hex(code)){set('status','Code invalide : 32 caractères hexadécimaux requis.');return;}try{channel=new BroadcastChannel('sigma-test-2922-'+code);channel.onmessage=receive;set('status','Canal ouvert. Attendez que les deux widgets soient connectés.');}catch(_){channel=null;set('status','BroadcastChannel indisponible ou interdit dans ce navigateur.');}controls();}
function send(){if(!channel||busy)return;try{channel.postMessage({kind:'SIGMA_TEST',role,id:random()});set('status','Signal fictif envoyé. Vérifiez l’autre widget.');}catch(_){set('status','Échec de l’envoi.');}}
async function save(){if(!channel||!pending||busy||uncertain)return;const id=pending,n=epoch;busy=true;controls();set('db','Vérification de la table de test…');try{const before=await grist.docApi.fetchTable(TABLE);if(n!==epoch)return;if(!Array.isArray(before.id)||!Array.isArray(before.Signal)||!Array.isArray(before.Origine)||before.id.length!==before.Signal.length||before.id.length!==before.Origine.length)throw Error('schema');if(before.Signal.includes(id)){set('db','Signal déjà présent : aucune nouvelle écriture.');pending=null;return;}await grist.docApi.applyUserActions([['AddRecord',TABLE,null,{Signal:id,Origine:peer}]]);const after=await grist.docApi.fetchTable(TABLE);if(n!==epoch)return;const count=after.Signal.filter((s,i)=>s===id&&after.Origine[i]===peer).length;if(count!==1)throw Error('confirmation');pending=null;set('db','Écriture confirmée dans la table de test.');}catch(_){if(n===epoch){uncertain=true;set('db','Écriture refusée ou non confirmée. Vérifiez les ACL et la table avant de rouvrir le canal.');}}finally{busy=false;controls();}}
$('generate').onclick=()=>{$('code').value=random();};$('connect').onclick=connect;$('close').onclick=close;$('send').onclick=send;$('save').onclick=save;
set('role',validRole?'Document '+role:'URL invalide : role=principal ou role=consultations');
if(!window.grist||!validRole){$('connect').disabled=true;$('generate').disabled=true;set('status','Ouvrez le widget configuré dans Grist.');return;}
grist.ready({requiredAccess:'full'});controls();window.addEventListener('pagehide',close);
})();
