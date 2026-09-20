'use strict';
// Serialize only public fields. Private labels, times, IDs and preferences never enter a link.
function publicEvents(source,choices){
 const personal=new Set(source.filter(e=>choices[e.id]==='personal').map(e=>e.date));
 return [...source.filter(e=>choices[e.id]==='show'&&!personal.has(e.date)).map(e=>({date:e.date,name:e.name,time:e.time})),...Array.from(personal,date=>({date,name:'Personal',time:'',allDay:true}))].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
}
function encodeShare(payload){return btoa(Array.from(new TextEncoder().encode(JSON.stringify(payload)),b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decodeShare(value){
 if(value.length>100000)throw Error('Link too long');
 const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='0100-01-01'&&s<='9999-12-31'&&dateKey(new Date(s+'T12:00:00'))===s;
 if(data.v!==1||typeof data.owner!=='string'||data.owner.length>60||!validDate(data.month)||!Array.isArray(data.events)||data.events.length>500)throw Error('Invalid calendar');
 for(const e of data.events)if(!validDate(e.date)||typeof e.name!=='string'||e.name.length>100||!(e.allDay===true&&e.name==='Personal'&&e.time===''||!e.allDay&&typeof e.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)))throw Error('Invalid event');
 return data;
}
let sharedView=location.hash.startsWith('#share='),sharedError=false;
if(sharedView){
 events=[];
 try{const data=decodeShare(location.hash.slice(7));events=data.events;const [y,m]=data.month.split('-').map(Number);view=new Date(y,m-1,1);document.querySelector('h1').textContent=`${data.owner || 'Shared'}’s calendar`;document.title=`${data.owner || 'Shared'}’s calendar — Veriy`;}catch{sharedError=true;document.querySelector('h1').textContent='This sharing link is invalid';$('status').textContent='Ask the sender for a new calendar link.';}
 $('add').hidden=true;$('share').hidden=true;document.querySelector('.bottomnote').textContent='Read-only snapshot · Personal means unavailable all day.';document.querySelector('.intro .eyebrow').textContent='SHARED CALENDAR';
}
const choices=Object.create(null);
function refreshShare(){
 $('link-result').hidden=true;$('share-status').textContent='';$('share-preview').replaceChildren();
 const visible=publicEvents(events,choices);
 if(!visible.length)$('share-preview').textContent='No events will be shared.';
 for(const e of visible){const row=document.createElement('p');row.textContent=`${e.date} · ${e.name} · ${e.allDay?'Unavailable all day':timeLabel(e.time)}`;$('share-preview').append(row);}
}
$('share').onclick=()=>{
 $('share-events').replaceChildren();
 for(const e of [...events].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))){
  if(!choices[e.id])choices[e.id]='personal';
  const row=document.createElement('label');row.className='share-row';const text=document.createElement('span');text.textContent=`${e.name} · ${e.date} · ${timeLabel(e.time)}`;const select=document.createElement('select');
  for(const [value,label] of [['personal','Personal — block day'],['show','Show name & time'],['hide','Hide completely']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.value=choices[e.id];select.onchange=()=>{choices[e.id]=select.value;refreshShare();};row.append(text,select);$('share-events').append(row);
 }
 refreshShare();$('share-dialog').showModal();
};
$('owner').oninput=refreshShare;$('share-close').onclick=()=>$('share-dialog').close();
$('make-link').onclick=()=>{
 const payload={v:1,owner:$('owner').value.trim(),month:dateKey(view),events:publicEvents(events,choices)};
 if(payload.events.length>500){$('share-status').textContent='Choose fewer than 501 events for this snapshot.';return;}
 const url=new URL('https://ilovecatinminecraft-sys.github.io/month-at-i-forgot/');url.hash='share='+encodeShare(payload);url.search='';
 if(url.href.length>16000){$('share-status').textContent='This calendar is too large for one link. Hide some events and try again.';return;}
 $('share-url').value=url.href;$('preview-link').href=url.href;$('link-result').hidden=false;
 $('share-status').textContent=['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname)||url.protocol==='file:'?'Preview link only: this site must be published at a shared web address before Brandon can open it on another device.':'Link ready. Only the details shown in the preview are included.';
};
$('copy-link').onclick=async()=>{try{await navigator.clipboard.writeText($('share-url').value);$('share-status').textContent='Link copied.';}catch{$('share-url').focus();$('share-url').select();$('share-status').textContent='Select and copy the link above.';}};
window.addEventListener('hashchange',()=>location.reload());
render();

