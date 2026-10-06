import test from 'node:test';
import assert from 'node:assert/strict';
import {messages,t,countryLabel,cityLabel,fieldDescription} from '../dist/i18n.js';
import {dateLabel} from '../dist/model.js';

test('translations preserve interpolation values in both languages',()=>{
 for(const [key,pair] of Object.entries(messages)) {
  const placeholders=text=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
  assert.deepEqual(placeholders(pair[0]),placeholders(pair[1]),key);
 }
 assert.equal(t('selected',{n:2},'ru'),'Выбрано: 2');
 assert.equal(t('selected',{n:2},'en'),'2 selected');
});
test('display translations retain distinct historical countries and unknown places',()=>{
 assert.equal(countryLabel('Russia','ru'),'Россия');
 assert.equal(countryLabel('Russia','en'),'Russia');
 assert.notEqual(countryLabel('East Germany (GDR)','ru'),countryLabel('West Germany (FRG)','ru'));
 assert.equal(cityLabel('Unknown','ru'),'Неизвестное место');
 assert.equal(cityLabel('Moscow','ru'),'Moscow');
});
test('localized descriptions preserve unknown counts and known zero',()=>{
 const result=fieldDescription({country:'Russia',city:'Unknown',fatalities:0,injuries:null},{attack_type:'Armed Assault',target:'Source target'},'ru');
 assert.match(result,/Россия/);assert.match(result,/Вооружённое нападение/);
 assert.match(result,/Погибшие по GTD: 0/);assert.match(result,/Раненые: нет данных/);
 assert.match(result,/Source target/);
});
test('Russian date formatting keeps incomplete dates incomplete',()=>{
 const event={year:2014,month:2,day:0};
 assert.match(dateLabel(event,'ru'),/фев/);
 assert.equal(dateLabel({...event,month:0},'ru'),'2014');
});
