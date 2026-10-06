import {addAtlasBasemap} from './basemap.js';
import {demoEvents} from './demo.js';
import {filterEvents,summarize,hasCoordinates,dateLabel,clusterEvents,bubbleScale,bubbleRadius,citationLinks} from './model.js';

const $ = id => document.getElementById(id);
const fmt = n => n === null ? 'No data' : n.toLocaleString('en');
const pageSize = 8;
const state = {from:0, to:0, countries:new Set(), page:0, metric:'fatalities'};
let mode = 'loading', manifest, countries = [], years = [], ready = false;
let pageEvents = [], currentSummary, map, layers, renderVersion = 0, mapVersion = 0;
let resultController, mapController, detailController;
const demoSorted = [...demoEvents].sort(sortEvents);
const specificityLabels = {
 1:'Coordinates identify the city, village, or town, generally its centroid.',
 2:'Coordinates identify the centroid of the smallest known subnational region; settlement coordinates were unavailable.',
 3:'The event was outside a settlement. Coordinates identify the centroid of the smallest known subnational region.',
 4:'Coordinates identify the center of a first-order administrative region.',
 5:'GTD could not identify a first-order region; coordinates are unknown.'
};
function sortEvents(a,b) { return b.year-a.year || b.month-a.month || b.day-a.day || b.id.localeCompare(a.id); }
function node(tag,text,className) {
 const element = document.createElement(tag);
 if(text !== undefined) element.textContent = text;
 if(className) element.className = className;
 return element;
}
function queryParams(page = state.page) {
 const params = new URLSearchParams({from:state.from,to:state.to,page,limit:pageSize});
 for(const country of state.countries) params.append('country',country);
 return params;
}
async function request(path,signal) {
 const response = await fetch(path,{signal,cache:'no-store'});
 if(!response.ok) {
  const data = await response.json().catch(()=>({}));
  throw new Error(data.error || `Request failed (${response.status})`);
 }
 return response.json();
}
function demoResults(page=state.page) {
 const events = filterEvents(demoSorted,state);
 const pages = Math.max(1,Math.ceil(events.length/pageSize));
 page = Math.min(page,pages-1);
 return {events:events.slice(page*pageSize,(page+1)*pageSize),summary:summarize(events),page,pages};
}
function renderCountries() {
 const search = $('country-search').value.trim().toLowerCase();
 const visible = countries.filter(c=>c.name.toLowerCase().includes(search));
 $('countries').replaceChildren(...visible.map(country=>{
  const label = node('label',undefined,'country');
  const input = document.createElement('input');
  input.type = 'checkbox';input.checked = state.countries.has(String(country.code));
  input.addEventListener('change',()=>{
   if(input.checked) state.countries.add(String(country.code));
   else state.countries.delete(String(country.code));
   state.page = 0;render();
  });
  label.append(input,node('span',country.name),node('small',fmt(country.count)));
  return label;
 }));
 $('country-empty').hidden = visible.length > 0;
}
function updateSelection() {
 $('from-range').value = state.from;$('to-range').value = state.to;
 $('country-count').textContent = state.countries.size ? `${state.countries.size} selected` : 'All';
 const selected = countries.filter(c=>state.countries.has(String(c.code))).map(c=>c.name).join(', ') || 'All countries';
 $('selection').textContent = `${selected} · ${state.from===state.to ? state.from : `${state.from}–${state.to}`}`;
 $('selection').title = $('selection').textContent;
 if(mode==='gtd') {
  const notes = [];
  if(state.from<=1993 && state.to>=1993) notes.push('1993: no event-level coverage');
  if(state.from<=2021 && state.to>=2021) notes.push('2021: January–June only');
  $('coverage-warning').textContent = notes.join(' · ');
  $('coverage-warning').hidden = !notes.length;
 }
}
function updateSummary(summary) {
 currentSummary = summary;
 const gapOnly = mode==='gtd' && state.from===1993 && state.to===1993;
 $('total').textContent = gapOnly ? 'No coverage' : fmt(summary.count);
 $('total').classList.toggle('non-numeric',gapOnly);
 $('unmapped').textContent = gapOnly ? '1993 records are unavailable' : `${fmt(summary.unmapped)} without coordinates`;
 for(const key of ['fatalities','injuries']) {
  $(key).textContent = fmt(summary[key].value);
  $(key).classList.toggle('non-numeric',summary[key].value===null);
  $(`${key}-note`).textContent = gapOnly ? 'No event-level coverage' : `Sum of known values · ${fmt(summary[key].unknown)} unknown`;
 }
 $('fit').disabled = !map || summary.count===summary.unmapped;
}
function renderList(result) {
 pageEvents = result.events;state.page = result.page;
 $('event-rows').replaceChildren(...pageEvents.map(event=>{
  const row = node('tr');
  const values = [dateLabel(event),event.city,event.country,fmt(event.fatalities),fmt(event.injuries),event.id];
  values.forEach((value,index)=>{
   const cell = node('td');
   if(index===1) {
    const button = node('button',value);
    button.setAttribute('aria-label',`View ${mode==='demo'?'fictional ':''}event ${event.id} in ${event.city}`);
    button.addEventListener('click',()=>openEvent(event));cell.append(button);
   } else cell.textContent = value;
   if(index===3 || index===4) cell.className = 'numeric';
   row.append(cell);
  });
  return row;
 }));
 const gapOnly = mode==='gtd' && state.from===1993 && state.to===1993;
 $('empty-title').textContent = gapOnly ? 'No event-level coverage for 1993' : 'No events found';
 $('empty-note').textContent = gapOnly ? 'GTD records for this year are unavailable. This does not mean no attacks occurred.' : 'Try another period or country selection.';
 $('empty').hidden = result.summary.count!==0;
 $('list-count').textContent = `${fmt(result.summary.count)} ${mode==='demo'?'fictional ':''}events`;
 if(gapOnly) $('list-count').textContent = 'No coverage';
 $('page-label').textContent = gapOnly ? 'Year unavailable' : result.summary.count ? `Page ${fmt(result.page+1)} of ${fmt(result.pages)}` : '0 events';
 $('prev').disabled = result.page===0;
 $('next').disabled = result.page>=result.pages-1;
}
async function render() {
 const version = ++renderVersion;
 resultController?.abort();mapController?.abort();++mapVersion;
 resultController = new AbortController();
 layers?.clearLayers();
 $('size-legend').textContent='Loading map…';
 updateSelection();
 $('results-status').textContent = 'Loading filtered results…';
 $('results-status').classList.remove('error');
 $('event-rows').replaceChildren();$('empty').hidden = true;
 for(const id of ['total','fatalities','injuries']) $(id).textContent = '…';
 for(const id of ['prev','next','fit']) $(id).disabled = true;
 try {
  const result = mode==='demo' ? demoResults() : await request(`/api/events?${queryParams()}`,resultController.signal);
  if(version!==renderVersion) return;
  updateSummary(result.summary);renderList(result);
  $('results-status').textContent = mode==='demo' ? 'Demonstration dataset · fictional records' : 'Local GTD dataset · filters apply to the full selection';
  await renderMap();
 } catch(error) {
  if(error.name==='AbortError' || version!==renderVersion) return;
  $('results-status').textContent = `Could not load results: ${error.message}. Change a filter or use Reset to retry.`;
  $('results-status').classList.add('error');
  for(const id of ['total','fatalities','injuries']) $(id).textContent = '—';
  $('list-count').textContent = 'Results unavailable';$('page-label').textContent = '';
 }
}
async function openEvent(event) {
 detailController?.abort();detailController=new AbortController();
 const body = $('event-detail');body.replaceChildren();
 const title = node('h2',`${event.city}, ${event.country}`);
 const stats = node('div',undefined,'detail-stats');
 for(const [label,key] of [['Fatalities','fatalities'],['Injuries','injuries']]) {
  const box = node('div');box.append(node('strong',fmt(event[key])),node('span',label));stats.append(box);
 }
 const note = hasCoordinates(event)
  ? mode==='demo' ? 'Illustrative settlement coordinates, not an actual attack location.' : (specificityLabels[event.specificity] || 'Coordinate precision is not recorded. Do not interpret this point as an exact attack site.')
  : 'No usable coordinates. This record remains in the event list and summary.';
 body.append(node('span',mode==='demo'?'FICTIONAL EVENT':'GTD RECORD','badge'),title,
  node('p',`${dateLabel(event)} · ${event.id}`),stats);
 const description=node('section',undefined,'event-description');
 description.append(node('h3','What happened'),node('p',mode==='demo'?'Description unavailable for this fictional fixture.':'Loading description…','description-status'));
 body.append(description,node('p',note));
 if(event.approxdate) body.append(node('p',`Approximate date information from GTD: ${event.approxdate}`));
 body.append(node('p',mode==='demo'?'Synthetic record for testing only.':'Fatalities and injuries include attackers. Classification and counts follow GTD.'));
 if(!$('event-dialog').open) $('event-dialog').showModal();
 if(mode==='demo')return;
 try {
  const detail=await request(`/api/event/${encodeURIComponent(event.id)}`,detailController.signal);
  if(!description.isConnected||!$('event-dialog').open)return;
  const value=detail.description;
  description.replaceChildren(node('h3','What happened'),node('span',value.label,'description-label'));
  if(value.excerpt&&value.excerpt!==value.text) {
   const preview=node('p',value.excerpt,'description-excerpt');description.append(preview);
   const more=node('details',undefined,'full-description'),toggle=node('summary','Read full description');
   more.append(toggle,node('p',value.text));
   more.addEventListener('toggle',()=>{preview.hidden=more.open;toggle.textContent=more.open?'Show less':'Read full description';});
   description.append(more);
  } else description.append(node('p',value.text,'description-excerpt'));
  if(value.sources.length) {
   const sources=node('details',undefined,'event-sources');sources.append(node('summary',`Sources · ${value.sources.length}`));
   const list=node('ol');
   value.sources.forEach(citation=>{
    const item=node('li');item.append(node('p',citation));
    citationLinks(citation).forEach(url=>{
     const link=node('a','Open source ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';item.append(link);
    });list.append(item);
   });
   sources.append(list);description.append(sources);
  } else if(value.kind!=='unavailable')description.append(node('p','No source citation is recorded for this event.','source-note'));
 } catch(error) {
  if(error.name==='AbortError'||!description.isConnected)return;
  description.replaceChildren(node('h3','What happened'),node('p','Could not load the description.','description-status'));
  const retry=node('button','Retry');retry.addEventListener('click',()=>openEvent(event));description.append(retry);
 }
}
async function openGroup(group,params) {
 if(group.event) {openEvent(group.event);return;}
 const dialog = $('event-dialog');const detail = $('event-detail');
 detail.replaceChildren(node('h2',`${fmt(group.count)} ${mode==='demo'?'fictional ':''}events`),
  node('p','Grouped by map proximity. Counts include attackers.'),
  node('p',`${fmt(group.fatalities.value)} known fatalities · ${fmt(group.fatalities.unknown)} unknown records. ${fmt(group.injuries.value)} known injuries · ${fmt(group.injuries.unknown)} unknown records.`,'group-summary'));
 const list = node('div');const navigation = node('div',undefined,'group-pagination');
 const prev = node('button','← Previous'),next = node('button','Next →'),label = node('span');
 navigation.append(prev,label,next);detail.append(list,navigation);
 dialog.showModal();
 let page = 0;
 const load = async()=>{
  list.textContent = 'Loading events…';prev.disabled = next.disabled = true;
  try {
   let result;
   if(mode==='demo') {
    const pages = Math.ceil(group.events.length/pageSize);
    result = {events:group.events.slice(page*pageSize,(page+1)*pageSize),pages,page};
   } else {
    const query = new URLSearchParams(params);
    query.set('groupX',group.x);query.set('groupY',group.y);query.set('cell',group.cell);query.set('zoom',group.zoom);query.set('page',page);
    result = await request(`/api/events?${query}`);
   }
   if(!dialog.open || !list.isConnected) return;
   page = result.page;
   list.replaceChildren(...result.events.map(event=>{
    const p = node('p');const b = node('button',`${dateLabel(event)} · ${event.city} · ${event.id}`);
    b.addEventListener('click',()=>openEvent(event));p.append(b);return p;
   }));
   label.textContent = `${fmt(page+1)} / ${fmt(result.pages)}`;
   prev.disabled = page===0;next.disabled = page>=result.pages-1;
  } catch(error) { list.textContent = `Could not load this group: ${error.message}`; }
 };
 prev.addEventListener('click',()=>{page--;load();});next.addEventListener('click',()=>{page++;load();});
 await load();
}
function mapParams() {
 const params = queryParams(0);const bounds = map.getBounds();
 params.set('zoom',Math.floor(map.getZoom()));params.set('west',bounds.getWest());params.set('east',bounds.getEast());
 params.set('south',Math.max(-90,bounds.getSouth()));params.set('north',Math.min(90,bounds.getNorth()));
 return params;
}
async function renderMap() {
 if(!map || !ready) return;
 const version = ++mapVersion;mapController?.abort();mapController = new AbortController();
 const params = mapParams();
 try {
  let groups;
  if(mode==='demo') groups = clusterEvents(filterEvents(demoSorted,state),e=>map.project([e.lat,e.lng]),map.getZoom()).map(events=>({events,...summarize(events),lat:events.reduce((s,e)=>s+e.lat,0)/events.length,lng:events.reduce((s,e)=>s+e.lng,0)/events.length,event:events.length===1?events[0]:null}));
  else groups = (await request(`/api/map?${params}`,mapController.signal)).groups;
  if(version!==mapVersion) return;
  layers.clearLayers();$('map-data-error').hidden = true;
  const scale = bubbleScale(groups,state.metric);
  $('legend-title').textContent = `Known ${state.metric}`;
  const legendValues = groups.some(g=>g[state.metric].value>0) ? [.01,.04,.16].map(f=>Math.max(1,Math.round(scale.maximum*f))) : [];
  $('size-legend').replaceChildren(...[...new Set(legendValues)].map(value=>{
   const item=node('span');const circle=node('i');
   const diameter=bubbleRadius(value,scale)*2;
   circle.style.width=circle.style.height=`${diameter}px`;
   item.append(circle,node('span',fmt(value)));return item;
  }));
  if(!legendValues.length) $('size-legend').textContent=groups.length?'No positive known totals':'No mapped events';
  for(const group of groups) {
   const metric=group[state.metric],value=metric.value;
   const marker=L.circleMarker([group.lat,group.lng],{
    radius:bubbleRadius(value,scale),color:'#71303d',fillColor:'#863747',className:'gtd-bubble',
    fillOpacity:value===null||value===0?0:.23,opacity:.92,weight:1,
    dashArray:value===null?'3 3':null
   }).addTo(layers);
   const tooltip=node('div');
   tooltip.append(node('strong',group.event?`${group.event.city} · ${dateLabel(group.event)}`:`${fmt(group.count)} grouped events`),
    node('div',`${fmt(value)} known ${state.metric} · ${fmt(metric.unknown)} unknown records`));
   marker.bindTooltip(tooltip,{direction:'top'}).on('click',()=>openGroup(group,params));
  }
 } catch(error) {
  if(error.name==='AbortError' || version!==mapVersion) return;
  layers.clearLayers();$('map-data-error').textContent = `Could not load map events: ${error.message}. The event list remains available.`;$('map-data-error').hidden = false;
 }
}
function reset() {
 state.from = years[0];state.to = years.at(-1);state.countries.clear();state.page = 0;
 state.metric='fatalities';updateMetricButtons();
 $('from').value = String(state.from);$('to').value = String(state.to);$('country-search').value = '';
 renderCountries();render();map?.setView([18,15],mobileLayout.matches?1:2);
}
function setupMap() {
 try {
  if(!window.L) throw new Error('Map library unavailable');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  map = L.map('map',{preferCanvas:false,minZoom:1,maxZoom:12,worldCopyJump:true,zoomControl:false,zoomSnap:.5,zoomDelta:.5,wheelPxPerZoomLevel:100,zoomAnimation:!reducedMotion,fadeAnimation:!reducedMotion}).setView([18,15],mobileLayout.matches?1:2);
  L.control.zoom({position:'topright'}).addTo(map);
  layers = L.layerGroup().addTo(map);
  addAtlasBasemap(map,L,message=>{$('map-error').textContent=message;$('map-error').hidden=false;});
  map.on('moveend',renderMap);
 } catch(error) {$('map-error').textContent = 'Map unavailable. Check your connection or explore the event list below.';$('map-error').hidden = false;}
}
function setDatasetText() {
 if(mode==='demo') {
  document.title = 'GTD Explorer · Demonstration';
  $('dataset-badge').textContent = 'DEMONSTRATION';
  $('dataset-title').textContent = 'Fictional events. Real interactions.';
  $('dataset-description').textContent = 'No GTD records in this mode. Locations and counts are synthetic examples.';
  $('coverage-label').textContent = 'Demo coverage: 2014–2023';
  $('record-label').textContent = '24 fictional records · 16 countries';
  $('map-source').textContent = 'Synthetic dataset · Counts include all people in each example';
  $('map').setAttribute('aria-label','Interactive map of fictional events');
  return;
 }
 document.title = 'GTD Explorer · Local dataset';
 $('dataset-badge').textContent = 'LOCAL GTD DATA';
 $('dataset-title').textContent = 'Historical records. In context.';
 $('dataset-description').textContent = '1970–2020 + January–June 2021. Includes a coverage gap for 1993.';
 $('coverage-label').textContent = 'GTD coverage: 1970–Jun 2021';
 $('record-label').textContent = `${fmt(manifest.record_count)} records · ${manifest.country_count} country codes`;
 $('map').setAttribute('aria-label','Interactive map of GTD events');
 $('map-source').textContent = 'Source: START / University of Maryland · Counts include attackers';
 $('page-edition').textContent = '/ Local dataset';
 $('info-content').replaceChildren(node('p','SOURCE & CONTEXT','eyebrow'),node('h2','About this dataset'),
  node('p',`${fmt(manifest.record_count)} GTD records from the May 2022 main release and the December 2022 January–June 2021 supplement. Original files are kept unchanged, and only fields needed for this explorer are imported.`),
  node('h3','Coverage and missing values'),node('p','The main data covers 1970–2020, excluding 1993. The 2021 supplement covers January–June only; it is not a complete year. Differences in data collection methods affect comparisons over time.'),
  node('p',`${fmt(manifest.quality.missing_coordinates || 0)} records lack coordinates. They remain in summaries and the event list. Blank fatality and injury values stay unknown; totals sum known values and display unknown counts. These measures include attackers.`),
  node('p','Coordinates may identify settlement or administrative-region centroids. Marker locations are not necessarily exact attack sites. Bubble area represents the selected sum of known fatalities or injuries, including attackers. Groups aggregate nearby events. The scale adjusts to the map view; use the legend and tooltips to compare values. Small positive totals have a minimum visible radius. Hollow circles show zero; dashed circles show entirely unknown totals. Map movement changes visible groups but does not change filtered totals.'),
  node('h3','Source and usage'),node('p','START (National Consortium for the Study of Terrorism and Responses to Terrorism). (2022). Global Terrorism Database, 1970–2020 [data file]. January–June 2021 supplement: globalterrorismdb_2021Jan-June_1222dist.xlsx.'),
  node('p','Copyright University of Maryland 2022. This local explorer is for non-commercial research and analysis. GTD files and the local database are not included in the public repository. Classification follows GTD.'));
 const link = node('a','GTD source and methodology ↗');link.href = 'https://www.start.umd.edu/data-tools/GTD';link.target = '_blank';link.rel = 'noopener';$('info-content').append(link);
}
async function start() {
 $('results-status').textContent = 'Loading dataset…';
 for(const id of ['from','to','from-range','to-range','metric-fatalities','metric-injuries','country-search','reset','fit','prev','next']) $(id).disabled = true;
 try {
  const meta = new URLSearchParams(location.search).get('demo')==='1' ? {mode:'demo'} : await request('/api/meta');
  mode = meta.mode;
  if(mode==='gtd') {
   manifest = meta.manifest;countries = meta.countries;
   const present = Object.keys(manifest.years).map(Number).sort((a,b)=>a-b);
   years = Array.from({length:present.at(-1)-present[0]+1},(_,i)=>present[0]+i);
  } else {
   years = [...new Set(demoEvents.map(e=>e.year))].sort((a,b)=>a-b);
   countries = [...new Set(demoEvents.map(e=>e.country))].sort().map(name=>({code:name,name,count:demoEvents.filter(e=>e.country===name).length}));
  }
  state.from = years[0];state.to = years.at(-1);
  for(const id of ['from-range','to-range']) {
   $(id).min=years[0];$(id).max=years.at(-1);$(id).step=1;
   $(id).value=state[id==='from-range'?'from':'to'];
   $(id).disabled=false;
   $(id).addEventListener('input',()=>{
    const key=id==='from-range'?'from':'to',other=key==='from'?'to':'from';
    state[key]=Number($(id).value);
    if(state.from>state.to)state[other]=state[key];
    $('from').value=state.from;$('to').value=state.to;
    updateSelection();
   });
   $(id).addEventListener('change',()=>{state.page=0;render();});
  }
  $('range-min').textContent=years[0];$('range-max').textContent=years.at(-1);
  $('range-gap').textContent=mode==='gtd'?'1993: no coverage':'Fictional records';
  for(const id of ['from','to']) {
   $(id).replaceChildren(...years.map(year=>new Option(`${year}${mode==='gtd'&&year===1993?' — no coverage':mode==='gtd'&&year===2021?' — Jan–Jun':''}`,String(year))));
   $(id).value = String(state[id]);$(id).disabled = false;
   $(id).addEventListener('change',()=>{
    state[id] = Number($(id).value);
    if(state.from>state.to) {const other=id==='from'?'to':'from';state[other]=state[id];$(other).value=String(state[other]);}
    state.page = 0;render();
   });
  }
  for(const id of ['country-search','reset']) $(id).disabled = false;
  setDatasetText();renderCountries();setupMap();ready = true;
  $('metric-fatalities').disabled=$('metric-injuries').disabled=false;
  await render();
 } catch(error) {
  $('dataset-badge').textContent = 'DATA UNAVAILABLE';
  $('dataset-title').textContent = 'Start the local explorer server';
  $('dataset-description').textContent = 'The dataset could not be loaded. Follow the local startup instructions in README.';
  $('results-status').textContent = `Dataset unavailable: ${error.message}`;
  $('results-status').classList.add('error');
 }
}
function updateMetricButtons() {
 for(const key of ['fatalities','injuries']) $('metric-'+key).setAttribute('aria-pressed',String(state.metric===key));
}
for(const key of ['fatalities','injuries']) $('metric-'+key).addEventListener('click',()=>{
 state.metric=key;updateMetricButtons();renderMap();
});
function setFiltersVisible(visible) {
 $('filter-panel').hidden=!visible;
 $('filters-toggle').setAttribute('aria-expanded',String(visible));
 document.querySelector('.workspace').classList.toggle('filters-collapsed',!visible);
}
const mobileLayout=window.matchMedia('(max-width:760px)');
setFiltersVisible(!mobileLayout.matches);
mobileLayout.addEventListener('change',()=>setFiltersVisible(!mobileLayout.matches));
$('filters-toggle').addEventListener('click',()=>setFiltersVisible($('filter-panel').hidden));
function setListVisible(visible) {
 $('events').hidden=!visible;$('show-events').setAttribute('aria-expanded',String(visible));
 if(visible) $('events').focus();else $('show-events').focus();
}
$('show-events').addEventListener('click',()=>setListVisible($('events').hidden));
$('hide-events').addEventListener('click',()=>setListVisible(false));
$('skip-events').addEventListener('click',event=>{event.preventDefault();setListVisible(true);});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!document.querySelector('dialog[open]')) {
  if(!$('events').hidden)setListVisible(false);
  else if(mobileLayout.matches&&!$('filter-panel').hidden){setFiltersVisible(false);$('filters-toggle').focus();}
 }
});
$('country-search').addEventListener('input',renderCountries);
$('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);
$('prev').addEventListener('click',()=>{state.page--;render();});$('next').addEventListener('click',()=>{state.page++;render();});
$('fit').addEventListener('click',()=>{
 if(!map) return;
 const padding={paddingTopLeft:[mobileLayout.matches||$('filter-panel').hidden?30:300,120],paddingBottomRight:[55,180],maxZoom:6};
 if(mode==='demo') {
  const points = filterEvents(demoSorted,state).filter(hasCoordinates).map(e=>[e.lat,e.lng]);
  if(points.length) map.fitBounds(points,padding);
 } else {
  const version = renderVersion;
  request(`/api/bounds?${queryParams(0)}`).then(result=>{
   if(version===renderVersion && result.south!==null) map.fitBounds([[result.south,result.west],[result.north,result.east]],padding);
  }).catch(error=>{$('map-data-error').textContent = `Could not fit events: ${error.message}`;$('map-data-error').hidden = false;});
 }
});
for(const id of ['about','methodology']) $(id).addEventListener('click',()=>$('info-dialog').showModal());
for(const dialog of document.querySelectorAll('dialog')) {
 dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog) return;
  const r = dialog.getBoundingClientRect();
  if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) dialog.close();
 });
}
start();
