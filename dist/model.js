export function filterEvents(events, {from, to, countries}) {
 return events.filter(e => e.year >= from && e.year <= to && (!countries.size || countries.has(e.country)));
}
export function hasCoordinates(e) {
 return Number.isFinite(e.lat) && Number.isFinite(e.lng) && Math.abs(e.lat)<=90 && Math.abs(e.lng)<=180;
}
export function summarize(events) {
 const metric = key => {
  const known = events.filter(e => Number.isFinite(e[key]));
  return {value:known.length ? known.reduce((sum,e)=>sum+e[key],0):null,unknown:events.length-known.length};
 };
 return {count:events.length,fatalities:metric('fatalities'),injuries:metric('injuries'),unmapped:events.filter(e=>!hasCoordinates(e)).length};
}
export function dateLabel(e) {
 if(!e.month) return String(e.year);
 const month = new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(e.year,e.month-1,1)));
 return e.day ? `${e.day} ${month} ${e.year}` : `${month} ${e.year}`;
}
// Cluster nearby points in screen space; keep exact shared locations grouped at every zoom.
export function clusterEvents(events, project, zoom) {
 const cells = new Map();
 for(const e of events.filter(hasCoordinates)) {
  const p = project(e);
  const key = zoom < 5 ? `${Math.floor(p.x/48)}:${Math.floor(p.y/48)}` : `${e.lat}:${e.lng}`;
  if(!cells.has(key)) cells.set(key,[]);
  cells.get(key).push(e);
 }
 return [...cells.values()];
}
// Area follows the selected known total. Small positive marks have a visibility floor.
export function bubbleScale(groups, metric) {
 const maximum = Math.max(1,...groups.map(g=>g[metric].value ?? 0));
 return {maximum,factor:58/Math.sqrt(maximum)};
}
export function bubbleRadius(value, scale) {
 return value===null ? 6 : value===0 ? 4 : Math.max(3,Math.sqrt(value)*scale.factor);
}
// Keep citations as text; only explicitly recorded HTTP(S) URLs become links.
export function citationLinks(citation) {
 const matches=citation.match(/https?:\/\/[^\s<>"']+/g)||[];
 const links=[];
 for(const match of matches) {
  try {
   const url=new URL(match.replace(/[.,;:)\]]+$/,''));
   if(['http:','https:'].includes(url.protocol)&&url.hostname)links.push(url.href);
  } catch {}
 }
 return [...new Set(links)];
}
