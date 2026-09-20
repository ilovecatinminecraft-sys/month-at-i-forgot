'use strict';
const $=id=>document.getElementById(id);
const now=new Date(); let view=new Date(now.getFullYear(),now.getMonth(),1),editing=null,events=[];
const key='daylight.events.v1';
const dateKey=d=>`${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let dark=typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches;
try{const saved=localStorage.getItem('veriy.theme');if(saved)dark=saved==='dark';}catch{}
function applyTheme(){document.documentElement.dataset.theme=dark?'dark':'light';$('theme').textContent=dark?'Light mode':'Dark mode';$('theme').setAttribute('aria-pressed',String(dark));}
$('theme').onclick=()=>{dark=!dark;applyTheme();try{localStorage.setItem('veriy.theme',dark?'dark':'light');}catch{}};
applyTheme();
$('year').onchange=()=>{const year=Number($('year').value);if(!Number.isInteger(year)||year<100||year>9999){$('year').value=view.getFullYear();$('status').textContent='Choose a year between 100 and 9999.';return;}view=new Date(year,view.getMonth(),1);render();};
// Current U.S. federal holiday rules, projected for planning rather than historical records.
function holidaysForYear(year){
 const result=[];
 const add=(name,date,observed=false)=>{result.push({name,date:dateKey(date)});if(observed&&[0,6].includes(date.getDay())){const shifted=new Date(date);shifted.setDate(date.getDate()+(date.getDay()===6?-1:1));result.push({name:`${name} (observed)`,date:dateKey(shifted)});}};
 const fixed=(name,month,day)=>add(name,new Date(year,month,day),true);
 const nth=(name,month,weekday,n)=>{const first=new Date(year,month,1);add(name,new Date(year,month,1+(weekday-first.getDay()+7)%7+7*(n-1)));};
 fixed('New Year’s Day',0,1);nth('Martin Luther King Jr. Day',0,1,3);nth('Washington’s Birthday',1,1,3);
 const lastMay=new Date(year,5,0);lastMay.setDate(lastMay.getDate()-(lastMay.getDay()+6)%7);add('Memorial Day',lastMay);
 fixed('Juneteenth',5,19);fixed('Independence Day',6,4);nth('Labor Day',8,1,1);nth('Columbus Day',9,1,2);fixed('Veterans Day',10,11);nth('Thanksgiving Day',10,4,4);fixed('Christmas Day',11,25);
 return result;
}
try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(stored))events=stored.filter(e=>e&&typeof e.id==='string'&&typeof e.name==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&/^\d{2}:\d{2}$/.test(e.time));}catch{$('status').textContent='Saved plans could not be loaded. New plans can still be added.';}
function timeLabel(t){const [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function persist(message){try{localStorage.setItem(key,JSON.stringify(events));$('status').textContent=message;}catch{$('status').textContent='Your plan is shown, but browser storage is unavailable. It will be lost when you close this page.';}}
function render(){
 $('month').textContent=view.toLocaleDateString('en-US',{month:'long'});$('year').value=view.getFullYear();$('grid').replaceChildren();
 $('previous').disabled=view.getFullYear()===100&&view.getMonth()===0;$('next').disabled=view.getFullYear()===9999&&view.getMonth()===11;
 const holidays=[view.getFullYear()-1,view.getFullYear(),view.getFullYear()+1].flatMap(holidaysForYear);
 const offset=(view.getDay()+6)%7,days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate(),cells=Math.ceil((offset+days)/7)*7;
 for(let i=0;i<cells;i++){
  const day=new Date(view.getFullYear(),view.getMonth(),i-offset+1),date=dateKey(day),cell=document.createElement('div');cell.className='day'+(day.getMonth()!==view.getMonth()?' outside':'')+(date===dateKey(now)?' current':'');
  const button=document.createElement(sharedView?'span':'button');button.className='date-button';button.textContent=day.getDate();button.setAttribute('aria-label',`${sharedView?'': 'Add event on '}${day.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}`);if(date===dateKey(now))button.setAttribute('aria-current','date');button.onclick=()=>openForm(date);cell.append(button);
  const plus=document.createElement('span');plus.className='day-add';plus.textContent='+';plus.setAttribute('aria-hidden','true');cell.append(plus);
  holidays.filter(h=>h.date===date).forEach(h=>{const label=document.createElement('div');label.className='holiday';label.textContent=h.name;cell.append(label);});
  events.filter(e=>e.date===date).sort((a,b)=>a.time.localeCompare(b.time)).forEach(e=>{const item=document.createElement(sharedView?'div':'button');item.className=e.allDay?'event personal-block':'event';if(e.allDay)cell.classList.add('blocked-day');item.setAttribute('aria-label',`${e.name}, ${e.allDay?'Unavailable all day':timeLabel(e.time)}${sharedView?'':'. Edit event'}`);const title=document.createElement('span');title.textContent=e.name;const time=document.createElement('time');time.textContent=e.allDay?'Unavailable all day':timeLabel(e.time);time.dateTime=`${e.date}T${e.time}`;item.append(title,time);item.onclick=()=>openForm(date,e);cell.append(item);});
  cell.onclick=e=>{if(!e.target.closest('button'))openForm(date);};$('grid').append(cell);
 }
 const prefix=dateKey(view).slice(0,7),count=events.filter(e=>e.date.startsWith(prefix)).length;$('count').textContent=`${count} ${count===1?'plan':'plans'} this month`;
}
function openForm(date,event){if(sharedView)return;editing=event?.id||null;$('form').reset();$('form-title').textContent=editing?'Edit event':'Add an event';$('delete').hidden=!editing;$('name').value=event?.name||'';$('date').value=date;$('time').value=event?.time||'';$('dialog').showModal();$('name').focus();}
$('add').onclick=()=>openForm(view.getMonth()===now.getMonth()&&view.getFullYear()===now.getFullYear()?dateKey(now):dateKey(view));
$('previous').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);render();};$('next').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render();};$('today').onclick=()=>{view=new Date(now.getFullYear(),now.getMonth(),1);render();};
$('close').onclick=()=>$('dialog').close();$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('dialog').close();}});
$('name').oninput=()=>$('name').setCustomValidity('');
$('form').onsubmit=e=>{e.preventDefault();const name=$('name').value.trim();if(!name){$('name').setCustomValidity('Enter an event name.');$('name').reportValidity();return;}const event={id:editing||crypto.randomUUID(),name,date:$('date').value,time:$('time').value};if(editing)events=events.map(x=>x.id===editing?event:x);else events.push(event);const [y,m]=event.date.split('-').map(Number);view=new Date(y,m-1,1);persist(editing?'Event updated.':'Event added.');$('dialog').close();render();};
$('delete').onclick=()=>{events=events.filter(e=>e.id!==editing);persist('Event deleted.');$('dialog').close();render();};


