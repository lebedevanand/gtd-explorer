import {demoEvents} from './demo.js';
import {filterEvents,summarize,hasCoordinates,dateLabel,clusterEvents} from './model.js';
const $ = id => document.getElementById(id);
const fmt = n => n === null ? 'No data' : n.toLocaleString('en');
const years = [...new Set(demoEvents.map(e=>e.year))].sort((a,b)=>a-b);
const countryNames = [...new Set(demoEvents.map(e=>e.country))].sort();
const state = {from:years[0],to:years.at(-1),countries:new Set(),page:0};
const pageSize=8;
let filtered=[],map,layers;
for(const id of ['from','to']) {
 $(id).replaceChildren(...years.map(y=>new Option(String(y),String(y))));
 $(id).value=String(state[id]);
 $(id).addEventListener('change',()=>{
  state[id]=Number($(id).value);
  if(state.from>state.to){const other=id==='from'?'to':'from';state[other]=state[id];$(other).value=String(state[other]);}
  state.page=0;render();
 });
}
function renderCountries(){
 const search=$('country-search').value.trim().toLowerCase();
 const visible=countryNames.filter(c=>c.toLowerCase().includes(search));
 $('countries').replaceChildren(...visible.map(country=>{
  const label=document.createElement('label');label.className='country';
  const input=document.createElement('input');input.type='checkbox';input.checked=state.countries.has(country);
  input.addEventListener('change',()=>{if(input.checked)state.countries.add(country);else state.countries.delete(country);state.page=0;render(false);});
  const name=document.createElement('span');name.textContent=country;
  const count=document.createElement('small');count.textContent=String(demoEvents.filter(e=>e.country===country).length);
  label.append(input,name,count);return label;
 }));
 $('country-empty').hidden=visible.length>0;
 $('country-count').textContent=state.countries.size?`${state.countries.size} selected`:'All';
}
$('country-search').addEventListener('input',renderCountries);
function reset(){state.from=years[0];state.to=years.at(-1);state.countries.clear();state.page=0;$('from').value=String(state.from);$('to').value=String(state.to);$('country-search').value='';render();if(map)map.setView([15,15],1);}
$('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);
function openEvent(event){
 const body=$('event-detail');body.replaceChildren();
 const badge=document.createElement('span');badge.className='badge';badge.textContent='FICTIONAL EVENT';
 const title=document.createElement('h2');title.textContent=`${event.city}, ${event.country}`;
 const date=document.createElement('p');date.textContent=`${dateLabel(event)} · ${event.id}`;
 const stats=document.createElement('div');stats.className='detail-stats';
 for(const [label,key] of [['Fatalities','fatalities'],['Injuries','injuries']]){const box=document.createElement('div');const value=document.createElement('strong');value.textContent=fmt(event[key]);const caption=document.createElement('span');caption.textContent=label;box.append(value,caption);stats.append(box);}
 const note=document.createElement('p');note.textContent=hasCoordinates(event)?'Illustrative settlement coordinates. This point is not an actual attack location.':'No coordinates available. This record is included in the list and summary.';
 const disclaimer=document.createElement('p');disclaimer.textContent='Synthetic record for testing only. Counts do not describe a real incident.';
 body.append(badge,title,date,stats,note,disclaimer);$('event-dialog').showModal();
}
function openGroup(events){
 if(events.length===1){openEvent(events[0]);return;}
 const detail=$('event-detail');detail.replaceChildren();
 const title=document.createElement('h2');title.textContent=`${events.length} fictional events`;
 const note=document.createElement('p');note.textContent='Grouped by map proximity. Select an event to see its details. This number counts events, not fatalities.';
 detail.append(title,note);
 events.forEach(e=>{const p=document.createElement('p');const b=document.createElement('button');b.textContent=`${dateLabel(e)} · ${e.city} · ${e.id}`;b.addEventListener('click',()=>{$('event-dialog').close();openEvent(e);});p.append(b);detail.append(p);});
 $('event-dialog').showModal();
}
function renderMap(){
 if(!map)return;
 layers.clearLayers();
 const groups=clusterEvents(filtered,e=>map.project([e.lat,e.lng]),map.getZoom());
 for(const group of groups){
  if(group.length>1){
   const lat=group.reduce((s,e)=>s+e.lat,0)/group.length,lng=group.reduce((s,e)=>s+e.lng,0)/group.length;
   const marker=L.marker([lat,lng],{icon:L.divIcon({className:'cluster-icon',html:`<span class="cluster-button">${group.length}</span>`,iconSize:[34,34],iconAnchor:[17,17]}),title:`${group.length} fictional events`,alt:`${group.length} fictional events`}).addTo(layers);
   marker.on('click',()=>openGroup(group));
  }else{
   const e=group[0];
   const marker=L.circleMarker([e.lat,e.lng],{radius:e.fatalities===null?7:e.fatalities===0?5:Math.min(18,5+Math.sqrt(e.fatalities)*1.7),color:e.fatalities===null?'#64776b':e.fatalities===0?'#456b52':'#99542e',fillColor:e.fatalities===0?'#ffffff':'#b86b42',fillOpacity:e.fatalities===null?0:.65,weight:1.5,dashArray:e.fatalities===null?'3 3':null}).addTo(layers);
   marker.bindTooltip(`${e.city} · ${dateLabel(e)} · ${fmt(e.fatalities)} fatalities`,{direction:'top'});
   marker.on('click',()=>openEvent(e));
  }
 }
}
function renderList(){
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));state.page=Math.min(state.page,pages-1);
 $('event-rows').replaceChildren(...filtered.slice(state.page*pageSize,(state.page+1)*pageSize).map(e=>{
  const tr=document.createElement('tr');
  const values=[dateLabel(e),e.city,e.country,fmt(e.fatalities),fmt(e.injuries),e.id];
  values.forEach((value,index)=>{const td=document.createElement('td');if(index===1){const b=document.createElement('button');b.textContent=value;b.setAttribute('aria-label',`View fictional event ${e.id} in ${e.city}`);b.addEventListener('click',()=>openEvent(e));td.append(b);}else td.textContent=value;if(index===3||index===4)td.className='numeric';tr.append(td);});return tr;
 }));
 $('empty').hidden=filtered.length!==0;
 $('list-count').textContent=`${filtered.length} fictional events`;
 $('page-label').textContent=filtered.length?`Page ${state.page+1} of ${pages}`:'0 events';
 $('prev').disabled=state.page===0;$('next').disabled=state.page>=pages-1;
}
$('prev').addEventListener('click',()=>{state.page--;renderList();});$('next').addEventListener('click',()=>{state.page++;renderList();});
function render(updateCountries=true){
 filtered=filterEvents(demoEvents,state).sort((a,b)=>b.year-a.year||b.month-a.month||b.day-a.day);
 const summary=summarize(filtered);
 $('total').textContent=fmt(summary.count);$('unmapped').textContent=`${summary.unmapped} without coordinates`;
 for(const key of ['fatalities','injuries']){$(key).textContent=fmt(summary[key].value);$(`${key}-note`).textContent=`Sum of known values · ${summary[key].unknown} unknown`;}
 const countries=state.countries.size?[...state.countries].sort().join(', '):'All countries';
 $('selection').textContent=`${countries} · ${state.from===state.to?state.from:`${state.from}–${state.to}`}`;
 $('selection').title=$('selection').textContent;
 if(updateCountries)renderCountries();
 $('country-count').textContent=state.countries.size?`${state.countries.size} selected`:'All';
 $('fit').disabled=!map||!filtered.some(hasCoordinates);
 renderList();renderMap();
}
for(const id of ['about','methodology'])$(id).addEventListener('click',()=>$('info-dialog').showModal());
for(const dialog of document.querySelectorAll('dialog')){
 dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
try {
 if(!window.L)throw new Error('Map library unavailable');
 map=L.map('map',{zoomControl:true,minZoom:1,maxZoom:12,worldCopyJump:true}).setView([15,15],1);
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
 tiles.on('tileerror',()=>{$('map-error').textContent='Some map tiles could not load. Filters and the event list remain available.';$('map-error').hidden=false;});
 layers=L.layerGroup().addTo(map);map.on('zoomend',renderMap);
}catch(error){$('map-error').textContent='Map unavailable. Check your connection or explore the event list below.';$('map-error').hidden=false;}
$('fit').addEventListener('click',()=>{if(!map)return;const points=filtered.filter(hasCoordinates).map(e=>[e.lat,e.lng]);if(points.length)map.fitBounds(points,{padding:[50,60],maxZoom:6});});
$('fit').disabled=!map;
render();
