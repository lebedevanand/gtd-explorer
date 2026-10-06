import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeCountries,labelAnchor} from '../dist/basemap.js';

test('shared reversed arcs decode into closed adjacent country polygons',()=>{
 const features=decodeCountries({transform:{scale:[1,1],translate:[0,0]},arcs:[[[0,0],[1,0],[0,1]],[[1,1],[-1,0],[0,-1]]],objects:{countries:{geometries:[{type:'Polygon',properties:{name:'Fixture'},arcs:[[0,1]]},{type:'Polygon',properties:{name:'Reversed'},arcs:[[-2,-1]]}]}}});
 assert.deepEqual(features[0].geometry.coordinates[0],[[0,0],[1,0],[1,1],[0,1],[0,0]]);
 assert.deepEqual(features[1].geometry.coordinates[0],[...features[0].geometry.coordinates[0]].reverse());
});
test('bundled background has finite coordinates and usable label anchors',()=>{
 const features=decodeCountries(JSON.parse(readFileSync(new URL('../dist/assets/world-50m.json',import.meta.url),'utf8')));
 assert.ok(features.length>200);
 for(const feature of features) {
  const anchor=labelAnchor(feature);
  assert.ok(anchor&&Number.isFinite(anchor.lat)&&Number.isFinite(anchor.lng),feature.properties.name);
  assert.ok(Math.abs(anchor.lat)<=90&&Math.abs(anchor.lng)<=180,feature.properties.name);
 }
});

test('antimeridian countries do not create a line across the world',()=>{
 const features=decodeCountries(JSON.parse(readFileSync(new URL('../dist/assets/world-50m.json',import.meta.url),'utf8')));
 const russia=features.find(feature=>feature.properties.name==='Russia');
 for(const polygon of russia.geometry.coordinates)for(const ring of polygon)for(let i=1;i<ring.length;i++)assert.ok(Math.abs(ring[i][0]-ring[i-1][0])<=180);
 const anchor=labelAnchor(russia);assert.ok(anchor.lng>30&&anchor.lng<160);
});
