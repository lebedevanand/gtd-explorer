// Natural Earth geometry is used only for the background, never to classify GTD events.
export function decodeCountries(topology) {
 const {scale,translate}=topology.transform;
 const arcs=topology.arcs.map(arc=>{
  let x=0,y=0;
  return arc.map(point=>{x+=point[0];y+=point[1];return [x*scale[0]+translate[0],y*scale[1]+translate[1]];});
 });
 const ring=(indices,unwrap=true)=>{
  const joined=indices.flatMap((index,i)=>{
  const points=index<0?[...arcs[~index]].reverse():arcs[index];
  return i?points.slice(1):points;
  });
  if(!unwrap)return joined;
  let previous;
  return joined.map(([lng,lat])=>{
   if(previous!==undefined){while(lng-previous>180)lng-=360;while(lng-previous< -180)lng+=360;}
   previous=lng;return [lng,lat];
  });
 };
 const polygon=(rings,unwrap=true)=>rings.map(indices=>ring(indices,unwrap));
 return topology.objects.countries.geometries.map(country=>({
  type:'Feature',properties:country.properties,
  geometry:{type:country.type,coordinates:country.type==='Polygon'?polygon(country.arcs,country.properties.name!=='Antarctica'):country.arcs.map(rings=>polygon(rings,country.properties.name!=='Antarctica'))}
 }));
}
export function labelAnchor(feature) {
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 let best;
 for(const polygon of polygons) {
  const ring=polygon[0];let area=0,x=0,y=0;
  for(let i=0;i<ring.length-1;i++) {
   const a=ring[i],b=ring[i+1],cross=a[0]*b[1]-b[0]*a[1];
   area+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;
  }
  if(area&&(!best||Math.abs(area)>best.area))best={area:Math.abs(area),lng:((x/(3*area)+180)%360+360)%360-180,lat:y/(3*area)};
 }
 return best;
}
export async function addAtlasBasemap(map,L,onError) {
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 map.createPane('atlas');map.getPane('atlas').style.zIndex=150;
 map.getPane('atlas').style.pointerEvents='none';
 map.createPane('atlasLabels');map.getPane('atlasLabels').style.zIndex=350;
 map.getPane('atlasLabels').style.pointerEvents='none';
 const detail=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,minZoom:5,updateWhenIdle:true,keepBuffer:2,
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
 }).on('tileerror',()=>onError('Some detailed map tiles could not load. Filters and the event list remain available.'));
 try {
  const response=await fetch('assets/world-50m.json');
  if(!response.ok)throw new Error('Background unavailable');
  const features=decodeCountries(await response.json());
  const atlas=L.layerGroup().addTo(map),labels=L.layerGroup().addTo(map);
  const anchors=features.map(feature=>({...labelAnchor(feature),name:feature.properties.name})).filter(item=>item.area&&item.name!=='Antarctica').sort((a,b)=>b.area-a.area);
  for(const offset of [-360,0,360]) {
   L.geoJSON(features,{
    pane:'atlas',interactive:false,smoothFactor:.35,
    coordsToLatLng:coords=>L.latLng(coords[1],coords[0]+offset),
    style:{color:'#c7bfb0',weight:.65,opacity:.8,fillColor:'#f7f3eb',fillOpacity:1,lineJoin:'round',lineCap:'round'},
    attribution:'Made with <a href="https://www.naturalearthdata.com/">Natural Earth</a>'
   }).addTo(atlas);
  }
  function label(text,lat,lng,className) {
   const content=document.createElement('span');content.textContent=text;
   L.marker([lat,lng],{pane:'atlasLabels',interactive:false,keyboard:false,icon:L.divIcon({className,html:content,iconSize:[0,0]})}).addTo(labels);
  }
  function update() {
   const detailed=map.getZoom()>=5;
   if(detailed&&!map.hasLayer(detail))detail.addTo(map);
   if(!detailed&&map.hasLayer(detail))map.removeLayer(detail);
   map.getPane('atlasLabels').style.opacity=detailed?'0':'1';
   labels.clearLayers();if(detailed)return;
   const zoom=map.getZoom(),bounds=map.getBounds().pad(.15),occupied=[];
   for(const offset of [-360,0,360]) {
    for(const item of anchors) {
     if(item.area<180/2**(2*(zoom-2)))continue;
     const point=L.latLng(item.lat,item.lng+offset);if(!bounds.contains(point))continue;
     const screen=map.latLngToContainerPoint(point),width=Math.max(45,item.name.length*5.5);
     if(occupied.some(box=>Math.abs(screen.x-box.x)<(width+box.width)/2+15&&Math.abs(screen.y-box.y)<30))continue;
     occupied.push({x:screen.x,y:screen.y,width});label(item.name,item.lat,item.lng+offset,'atlas-country-label');
    }
    for(const [name,lat,lng] of [['ATLANTIC OCEAN',27,-37],['PACIFIC OCEAN',15,-140],['PACIFIC OCEAN',13,163],['INDIAN OCEAN',-24,77]]) {
     if(bounds.contains([lat,lng+offset]))label(name,lat,lng+offset,'atlas-ocean-label');
    }
   }
  }
  map.on('moveend',update);update();
  if(!reducedMotion)map.getPane('atlasLabels').style.transition='opacity 180ms ease';
 } catch {
  detail.options.minZoom=1;detail.addTo(map);
  onError('Atlas background could not load. Showing the detailed map instead.');
 }
}
