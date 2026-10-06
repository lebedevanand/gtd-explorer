import test from 'node:test';
import assert from 'node:assert/strict';
import {filterEvents,summarize,hasCoordinates,dateLabel,clusterEvents,bubbleScale,bubbleRadius} from '../dist/model.js';
const fixtures=[
 {id:'a',year:2014,month:0,day:0,country:'A',fatalities:0,injuries:null,lat:0,lng:0},
 {id:'b',year:2015,month:2,day:0,country:'B',fatalities:null,injuries:4,lat:null,lng:null},
 {id:'c',year:2016,month:3,day:12,country:'A',fatalities:5,injuries:0,lat:20,lng:30},
 {id:'d',year:2016,month:4,day:1,country:'C',fatalities:2,injuries:3,lat:20,lng:30},
];
test('inclusive year boundaries and OR between countries, AND with year',()=>{
 assert.deepEqual(filterEvents(fixtures,{from:2015,to:2016,countries:new Set(['A','C'])}).map(e=>e.id),['c','d']);
 assert.equal(filterEvents(fixtures,{from:2014,to:2014,countries:new Set()}).length,1);
 assert.equal(filterEvents(fixtures,{from:2014,to:2016,countries:new Set()}).length,4);
 assert.equal(filterEvents(fixtures,{from:2015,to:2015,countries:new Set(['A'])}).length,0);
});
test('totals distinguish zero, unknown, and partially known data',()=>{
 assert.deepEqual(summarize(fixtures),{count:4,fatalities:{value:7,unknown:1},injuries:{value:7,unknown:1},unmapped:1});
 assert.equal(summarize([fixtures[0]]).fatalities.value,0);
 assert.equal(summarize([fixtures[1]]).fatalities.value,null);
 assert.equal(summarize([]).fatalities.value,null);
});
test('missing coordinates stay out of map; zero coordinates are valid',()=>{
 assert.equal(hasCoordinates(fixtures[0]),true);assert.equal(hasCoordinates(fixtures[1]),false);
 assert.equal(hasCoordinates({lat:91,lng:30}),false);
});
test('incomplete dates retain precision',()=>{
 assert.equal(dateLabel(fixtures[0]),'2014');assert.equal(dateLabel(fixtures[1]),'Feb 2015');assert.equal(dateLabel(fixtures[2]),'12 Mar 2016');
});
test('shared coordinates remain grouped at high zoom without losing events',()=>{
 const groups=clusterEvents(fixtures,e=>({x:e.lng,y:e.lat}),9);
 assert.deepEqual(groups.map(g=>g.length),[1,2]);assert.equal(groups.flat().length,3);
});
test('bubble area follows the selected metric and preserves zero versus unknown',()=>{
 const groups=[{fatalities:{value:100},injuries:{value:400}},{fatalities:{value:25},injuries:{value:100}}];
 const scale=bubbleScale(groups,'fatalities');
 assert.equal(bubbleRadius(100,scale)**2/bubbleRadius(25,scale)**2,4);
 assert.equal(bubbleScale(groups,'injuries').maximum,400);
 assert.equal(bubbleRadius(null,scale),6);
 assert.equal(bubbleRadius(0,scale),4);
 assert.equal(bubbleRadius(.001,scale),3);
});
