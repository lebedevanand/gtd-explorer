import {demoEvents} from './demo.js';
import {filterEvents,summarize,hasCoordinates,dateLabel as formatDate,clusterEvents,bubbleScale,bubbleRadius,citationLinks} from './model.js';

import {language,setLanguage,t,countryLabel,cityLabel,fieldDescription} from './i18n.js';

const $ = id => document.getElementById(id);
let savedLanguage;try {savedLanguage=localStorage.getItem('gtd-language');} catch {}
const urlLanguage=new URLSearchParams(location.search).get('lang');
setLanguage(['ru','en'].includes(urlLanguage)?urlLanguage:savedLanguage||'ru');
const dateLabel=event=>formatDate(event,language);
const fmt = n => n === null ? t('noData') : n.toLocaleString(language);
const pageSize = 8;
const state = {from:0, to:0, countries:new Set(), page:0, metric:'fatalities'};
let mode = 'loading', manifest, countries = [], years = [], ready = false;
let pageEvents = [], currentSummary, map, layers, renderVersion = 0, mapVersion = 0;
let resultController, mapController, detailController, activeEvent, activeGroup;
const demoSorted = [...demoEvents].sort(sortEvents);
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
  throw new Error(language==='en'&&data.error?data.error:t('requestError',{status:response.status}));
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
 const visible = countries.filter(c=>c.name.toLowerCase().includes(search)||countryLabel(c.name,'ru').toLowerCase().includes(search)).sort((a,b)=>countryLabel(a.name).localeCompare(countryLabel(b.name),language));
 $('countries').replaceChildren(...visible.map(country=>{
  const label = node('label',undefined,'country');
  const input = document.createElement('input');
  input.type = 'checkbox';input.checked = state.countries.has(String(country.code));
  input.addEventListener('change',()=>{
   if(input.checked) state.countries.add(String(country.code));
   else state.countries.delete(String(country.code));
   state.page = 0;render();
  });
  label.append(input,node('span',countryLabel(country.name)),node('small',fmt(country.count)));
  return label;
 }));
 $('country-empty').hidden = visible.length > 0;
}
function updateSelection() {
 $('from-range').value = state.from;$('to-range').value = state.to;
 $('country-count').textContent = state.countries.size ? t('selected',{n:fmt(state.countries.size)}) : t('all');
 const selected = countries.filter(c=>state.countries.has(String(c.code))).map(c=>countryLabel(c.name)).join(', ') || t('allCountries');
 $('selection').textContent = `${selected} · ${state.from===state.to ? state.from : `${state.from}–${state.to}`}`;
 $('selection').title = $('selection').textContent;
 if(mode==='gtd') {
  const notes = [];
  if(state.from<=1993 && state.to>=1993) notes.push(t('gapLabel'));
  if(state.from<=2021 && state.to>=2021) notes.push(t('partialLabel'));
  $('coverage-warning').textContent = notes.join(' · ');
  $('coverage-warning').hidden = !notes.length;
 }
}
function updateSummary(summary) {
 currentSummary = summary;
 const gapOnly = mode==='gtd' && state.from===1993 && state.to===1993;
 $('total').textContent = gapOnly ? t('noCoverage') : fmt(summary.count);
 $('total').classList.toggle('non-numeric',gapOnly);
 $('unmapped').textContent = gapOnly ? t('gapRecords') : t('unmapped',{n:fmt(summary.unmapped)});
 for(const key of ['fatalities','injuries']) {
  $(key).textContent = fmt(summary[key].value);
  $(key).classList.toggle('non-numeric',summary[key].value===null);
  $(`${key}-note`).textContent = gapOnly ? t('noCoverage') : t('knownSum',{n:fmt(summary[key].unknown)});
 }
 $('fit').disabled = !map || summary.count===summary.unmapped;
}
function renderList(result) {
 pageEvents = result.events;state.page = result.page;
 $('event-rows').replaceChildren(...pageEvents.map(event=>{
  const row = node('tr');
  const values = [dateLabel(event),cityLabel(event.city),countryLabel(event.country),fmt(event.fatalities),fmt(event.injuries),event.id];
  values.forEach((value,index)=>{
   const cell = node('td');
   if(index===1) {
    const button = node('button',value);
    button.setAttribute('aria-label',t(mode==='demo'?'viewDemoEvent':'viewEvent',{id:event.id,city:cityLabel(event.city)}));
    button.addEventListener('click',()=>openEvent(event));cell.append(button);
   } else cell.textContent = value;
   if(index===3 || index===4) cell.className = 'numeric';
   row.append(cell);
  });
  return row;
 }));
 const gapOnly = mode==='gtd' && state.from===1993 && state.to===1993;
 $('empty-title').textContent = gapOnly ? t('gapTitle') : t('noEvents');
 $('empty-note').textContent = gapOnly ? t('gapNote') : t('tryFilters');
 $('empty').hidden = result.summary.count!==0;
 $('list-count').textContent = t(mode==='demo'?'demoListCount':'listCount',{n:fmt(result.summary.count)});
 if(gapOnly) $('list-count').textContent = t('noCoverage');
 $('page-label').textContent = gapOnly ? t('unavailableYear') : result.summary.count ? t('page',{page:fmt(result.page+1),pages:fmt(result.pages)}) : t('listCount',{n:fmt(0)});
 $('prev').disabled = result.page===0;
 $('next').disabled = result.page>=result.pages-1;
}
async function render() {
 const version = ++renderVersion;
 resultController?.abort();mapController?.abort();++mapVersion;
 resultController = new AbortController();
 layers?.clearLayers();
 $('size-legend').textContent=t('loadingMap');
 updateSelection();
 $('results-status').textContent = t('loadingResults');
 $('results-status').classList.remove('error');
 $('event-rows').replaceChildren();$('empty').hidden = true;
 for(const id of ['total','fatalities','injuries']) $(id).textContent = '…';
 for(const id of ['prev','next','fit']) $(id).disabled = true;
 try {
  const result = mode==='demo' ? demoResults() : await request(`/api/events?${queryParams()}`,resultController.signal);
  if(version!==renderVersion) return;
  updateSummary(result.summary);renderList(result);
  $('results-status').textContent = mode==='demo' ? t('demoStatus') : t('localStatus');
  await renderMap();
 } catch(error) {
  if(error.name==='AbortError' || version!==renderVersion) return;
  $('results-status').textContent = t('resultsError',{error:error.message});
  $('results-status').classList.add('error');
  for(const id of ['total','fatalities','injuries']) $(id).textContent = '—';
  $('list-count').textContent = t('resultsUnavailable');$('page-label').textContent = '';
 }
}
async function openEvent(event) {
 activeEvent=event;activeGroup=null;
 detailController?.abort();detailController=new AbortController();
 const body = $('event-detail');body.replaceChildren();
 const title = node('h2',`${cityLabel(event.city)}, ${countryLabel(event.country)}`);
 const stats = node('div',undefined,'detail-stats');
 for(const [label,key] of [[t('fatalities'),'fatalities'],[t('injuries'),'injuries']]) {
  const box = node('div');box.append(node('strong',fmt(event[key])),node('span',label));stats.append(box);
 }
 const note = hasCoordinates(event)
  ? mode==='demo' ? t('syntheticPoint') : (([1,2,3,4,5].includes(event.specificity)?t('precision'+event.specificity):t('precisionUnknown')))
  : t('noCoordinates');
 body.append(node('span',mode==='demo'?t('fictionalBadge'):t('gtdBadge'),'badge'),title,
  node('p',`${dateLabel(event)} · ${event.id}`),stats);
 const description=node('section',undefined,'event-description');
 description.append(node('h3',t('happened')),node('p',mode==='demo'?t('demoDescription'):t('loadingDescription'),'description-status'));
 body.append(description,node('p',note));
 if(event.approxdate) body.append(node('p',t('approximateDate',{date:event.approxdate})));
 body.append(node('p',mode==='demo'?t('syntheticNote'):t('countsNote')));
 if(!$('event-dialog').open) $('event-dialog').showModal();
 if(mode==='demo')return;
 try {
  const detail=await request(`/api/event/${encodeURIComponent(event.id)}`,detailController.signal);
  if(!description.isConnected||!$('event-dialog').open)return;
  const original=detail.description;
  const text=original.kind==='fields'&&language==='ru'?fieldDescription(detail,original.fields||{}):
   original.kind==='unavailable'?t(original.reason==='not-imported'?'importDescriptions':'noDescriptionCountry'):original.text;
  const value={...original,text,excerpt:original.kind==='gtd'?original.excerpt:text};
  const textLanguage=value.kind==='gtd'?'en':language;
  description.replaceChildren(node('h3',t('happened')),node('span',t(value.kind==='gtd'?'gtdDescription':value.kind==='fields'?'fieldsDescription':'descriptionUnavailable'),'description-label'));
  if(value.excerpt&&value.excerpt!==value.text) {
   const preview=node('p',value.excerpt,'description-excerpt');preview.lang=textLanguage;description.append(preview);
   const more=node('details',undefined,'full-description'),toggle=node('summary',t('readFull'));
   const full=node('p',value.text);full.lang=textLanguage;more.append(toggle,full);
   more.addEventListener('toggle',()=>{preview.hidden=more.open;toggle.textContent=more.open?t('showLess'):t('readFull');});
   description.append(more);
  } else {const paragraph=node('p',value.text,'description-excerpt');paragraph.lang=textLanguage;description.append(paragraph);}
  if(value.sources.length) {
   const sources=node('details',undefined,'event-sources');sources.append(node('summary',t('sources',{n:fmt(value.sources.length)})));
   const list=node('ol');
   value.sources.forEach(citation=>{
    const item=node('li');item.append(node('p',citation));
    citationLinks(citation).forEach(url=>{
     const link=node('a',t('openSource'));link.href=url;link.target='_blank';link.rel='noopener noreferrer';item.append(link);
    });list.append(item);
   });
   sources.append(list);description.append(sources);
  } else if(value.kind!=='unavailable')description.append(node('p',t('noSources'),'source-note'));
 } catch(error) {
  if(error.name==='AbortError'||!description.isConnected)return;
  description.replaceChildren(node('h3',t('happened')),node('p',t('descriptionError'),'description-status'));
  const retry=node('button',t('retry'));retry.addEventListener('click',()=>openEvent(event));description.append(retry);
 }
}
async function openGroup(group,params) {
 if(group.event) {openEvent(group.event);return;}
 activeEvent=null;activeGroup={group,params};
 const dialog = $('event-dialog');const detail = $('event-detail');
 detail.replaceChildren(node('h2',t(mode==='demo'?'demoGroupCount':'groupCount',{n:fmt(group.count)})),
  node('p',t('groupNote')),
  node('p',t('groupSummary',{fatalities:fmt(group.fatalities.value),fu:fmt(group.fatalities.unknown),injuries:fmt(group.injuries.value),iu:fmt(group.injuries.unknown)}),'group-summary'));
 const list = node('div');const navigation = node('div',undefined,'group-pagination');
 const prev = node('button',t('previous')),next = node('button',t('next')),label = node('span');
 navigation.append(prev,label,next);detail.append(list,navigation);
 if(!dialog.open)dialog.showModal();
 let page = 0;
 const load = async()=>{
  list.textContent = t('loadingEvents');prev.disabled = next.disabled = true;
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
    const p = node('p');const b = node('button',`${dateLabel(event)} · ${cityLabel(event.city)} · ${event.id}`);
    b.addEventListener('click',()=>openEvent(event));p.append(b);return p;
   }));
   label.textContent = `${fmt(page+1)} / ${fmt(result.pages)}`;
   prev.disabled = page===0;next.disabled = page>=result.pages-1;
  } catch(error) { list.textContent = t('groupError',{error:error.message}); }
 };
 prev.addEventListener('click',()=>{page--;load();});next.addEventListener('click',()=>{page++;load();});
 await load();
}
function mapParams() {
 const params = queryParams(0);const bounds = map.getBounds();
 params.set('zoom',map.getZoom());params.set('west',bounds.getWest());params.set('east',bounds.getEast());
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
  $('legend-title').textContent = t(state.metric==='fatalities'?'knownFatalities':'knownInjuries');
  const legendValues = groups.some(g=>g[state.metric].value>0) ? [.01,.04,.16].map(f=>Math.max(1,Math.round(scale.maximum*f))) : [];
  $('size-legend').replaceChildren(...[...new Set(legendValues)].map(value=>{
   const item=node('span');const circle=node('i');
   const diameter=bubbleRadius(value,scale)*2;
   circle.style.width=circle.style.height=`${diameter}px`;
   item.append(circle,node('span',fmt(value)));return item;
  }));
  if(!legendValues.length) $('size-legend').textContent=groups.length?t('noPositive'):t('noMapped');
  for(const group of groups) {
   const metric=group[state.metric],value=metric.value;
   const marker=L.circleMarker([group.lat,group.lng],{
    radius:bubbleRadius(value,scale),color:'#71303d',fillColor:'#863747',className:'gtd-bubble',
    fillOpacity:value===null||value===0?0:.23,opacity:.92,weight:1,
    dashArray:value===null?'3 3':null
   }).addTo(layers);
   const tooltip=node('div');
   tooltip.append(node('strong',group.event?`${cityLabel(group.event.city)} · ${dateLabel(group.event)}`:t('groupCount',{n:fmt(group.count)})),
    node('div',t('tooltipMetric',{value:fmt(value),metric:t(state.metric),n:fmt(metric.unknown)})));
   marker.bindTooltip(tooltip,{direction:'top'}).on('click',()=>openGroup(group,params));
  }
 } catch(error) {
  if(error.name==='AbortError' || version!==mapVersion) return;
  layers.clearLayers();$('map-data-error').textContent = t('mapEventsError',{error:error.message});$('map-data-error').hidden = false;
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
  map = L.map('map',{preferCanvas:false,minZoom:1,maxZoom:12,worldCopyJump:true,zoomControl:false}).setView([18,15],mobileLayout.matches?1:2);
  L.control.zoom({position:'topright',zoomInTitle:t('zoomIn'),zoomOutTitle:t('zoomOut')}).addTo(map);
  layers = L.layerGroup().addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map)
   .on('tileerror',()=>{$('map-error').textContent = t('tileError');$('map-error').hidden = false;});
  map.on('moveend',renderMap);
 } catch(error) {$('map-error').textContent = t('mapUnavailable');$('map-error').hidden = false;}
}
function setDatasetText() {
 if(mode==='demo') {
  document.title = t('demoTitle');
  $('dataset-badge').textContent = t('demoBadge');
  $('dataset-title').textContent = t('demoHeading');
  $('dataset-description').textContent = t('demoExplanation');
  $('coverage-label').textContent = t('demoCoverage');
  $('record-label').textContent = t('demoRecords');
  $('map-source').textContent = t('demoSource');
  $('map').setAttribute('aria-label',t('demoMap'));
  $('info-content').replaceChildren(node('p',t('sourceContext'),'eyebrow'),node('h2',t('demoInfo')),
   node('p',t('demoInfoText')),node('p',t('bubbleMethod')),node('p',t('sourceDescriptionNote')));
  return;
 }
 document.title = t('localTitle');
 $('dataset-badge').textContent = t('localBadge');
 $('dataset-title').textContent = t('localHeading');
 $('dataset-description').textContent = t('localExplanation');
 $('coverage-label').textContent = t('localCoverage');
 $('record-label').textContent = t('localRecords',{records:fmt(manifest.record_count),countries:fmt(manifest.country_count)});
 $('map').setAttribute('aria-label',t('localMap'));
 $('map-source').textContent = t('localSource');
 $('page-edition').textContent = t('localEdition');
 $('info-content').replaceChildren(node('p',t('sourceContext'),'eyebrow'),node('h2',t('datasetInfo')),
  node('p',t('datasetIntro',{n:fmt(manifest.record_count)})),
  node('h3',t('coverageInfo')),node('p',t('coverageText')),
  node('p',t('missingText',{n:fmt(manifest.quality.missing_coordinates||0)})),
  node('p',t('bubbleMethod')),
  node('h3',t('sourceUsage')),node('p','START (National Consortium for the Study of Terrorism and Responses to Terrorism). (2022). Global Terrorism Database, 1970–2020 [data file]. January–June 2021 supplement: globalterrorismdb_2021Jan-June_1222dist.xlsx.'),
  node('p',t('usageText')));
 $('info-content').append(node('p',t('sourceDescriptionNote')));
 const link = node('a',t('sourceLink'));link.href = 'https://www.start.umd.edu/data-tools/GTD';link.target = '_blank';link.rel = 'noopener';$('info-content').append(link);
}
async function start() {
 $('results-status').textContent = t('loadingData');
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
  $('range-gap').textContent=mode==='gtd'?t('gapRange'):t('demoRange');
  for(const id of ['from','to']) {
   $(id).replaceChildren(...years.map(year=>new Option(`${year}${mode==='gtd'&&year===1993?t('noCoverageOption'):mode==='gtd'&&year===2021?t('partialOption'):''}`,String(year))));
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
  $('dataset-badge').textContent = t('unavailableBadge');
  $('dataset-title').textContent = t('startServer');
  $('dataset-description').textContent = t('startHelp');
  $('results-status').textContent = t('datasetError',{error:error.message});
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
  }).catch(error=>{$('map-data-error').textContent = t('fitError',{error:error.message});$('map-data-error').hidden = false;});
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
function translateDirectText(selector,key) {
 const element=document.querySelector(selector);
 const text=[...element.childNodes].find(child=>child.nodeType===Node.TEXT_NODE&&child.textContent.trim());
 if(text)text.textContent=t(key)+' ';
}
function applyStaticTranslations() {
 document.documentElement.lang=language;
 $('legend-title').textContent=t(state.metric==='fatalities'?'knownFatalities':'knownInjuries');
 if(!ready){$('country-count').textContent=t('all');$('page-edition').textContent=t('localEdition');}

 $('language').value=language;$('language').setAttribute('aria-label',t('language'));
 document.querySelector('meta[name="description"]').content=t('heading');
 const labels={
  '#skip-events':'skip','.edition':'edition','#filters-toggle':'filters','#about':'about','h1':'heading',
  '.stats>div:nth-child(1)>span':'events','.stats>div:nth-child(2)>span':'knownFatalities','.stats>div:nth-child(3)>span':'knownInjuries',
  '#fit':'fit','.timebar-head .eyebrow':'period','#show-events':'showEvents','#methodology':'methodology',
  '.section-head .eyebrow':'explore','.section-head h2':'places','#reset':'reset','#metric-fatalities':'fatalities','#metric-injuries':'injuries',
  '#country-empty':'noCountries','.list-heading .eyebrow':'behind','.list-heading h2':'eventList',
  'th:nth-child(1)':'date','th:nth-child(2)':'location','th:nth-child(3)':'country','th:nth-child(4)':'fatalities','th:nth-child(5)':'injuries','th:nth-child(6)':'record',
  '#empty-reset':'reset','#prev':'previous','#next':'next','table caption':'tableCaption'
 };
 for(const [selector,key] of Object.entries(labels))document.querySelector(selector).textContent=t(key);
 translateDirectText('fieldset legend','countries');
 translateDirectText('.year-inputs label:nth-of-type(1)','from');translateDirectText('.year-inputs label:nth-of-type(2)','to');
 translateDirectText('.symbol-legend>span:nth-child(1)','zero');translateDirectText('.symbol-legend>span:nth-child(2)','unknown');
 document.querySelector('.legend>small').replaceChildren(document.createTextNode(t('legendScale')),node('br'),document.createTextNode(t('legendFloor')));
 $('country-search').placeholder=t('search');$('country-search').setAttribute('aria-label',t('search'));
 const aria={'#hide-events':'closeList','#info-dialog .close':'closeInfo','#event-dialog .close':'closeEvent','.explorer':'mapResults','#filter-panel':'eventFilters','.metric-toggle':'measure','#events':'filteredList','.pagination':'listPages'};
 for(const [selector,key] of Object.entries(aria))document.querySelector(selector).setAttribute('aria-label',t(key));
 document.querySelector('label[for="from-range"]').textContent=t('startYear');
 document.querySelector('label[for="to-range"]').textContent=t('endYear');
 for(const [selector,key] of [['.leaflet-control-zoom-in','zoomIn'],['.leaflet-control-zoom-out','zoomOut']]) {
  const control=document.querySelector(selector);if(control){control.title=t(key);control.setAttribute('aria-label',t(key));}
 }
 if(!ready) {
  for(const [id,key] of [['dataset-badge','loadingData'],['dataset-title','loadingData'],['dataset-description','loadingData'],['coverage-label','loadingCoverage'],['record-label','loadingRecords'],['selection','loadingSelection'],['unmapped','loadingData'],['fatalities-note','loadingData'],['injuries-note','loadingData'],['map-source','sourceContext']])$(id).textContent=t(key);
 }
}
function updateYearOptions() {
 for(const id of ['from','to']) {
  $(id).replaceChildren(...years.map(year=>new Option(`${year}${mode==='gtd'&&year===1993?t('noCoverageOption'):mode==='gtd'&&year===2021?t('partialOption'):''}`,String(year))));
  $(id).value=state[id];
 }
 $('range-gap').textContent=t(mode==='gtd'?'gapRange':'demoRange');
}
$('language').addEventListener('change',()=>{
 setLanguage($('language').value);try{localStorage.setItem('gtd-language',language);}catch{}
 applyStaticTranslations();
 if(ready) {
  setDatasetText();updateYearOptions();renderCountries();render();
  if($('event-dialog').open) {
   if(activeEvent)openEvent(activeEvent);else if(activeGroup)openGroup(activeGroup.group,activeGroup.params);
  }
 }
});
applyStaticTranslations();
start();
