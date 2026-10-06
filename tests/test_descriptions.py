"""Synthetic descriptions only; no GTD event narrative fixtures."""
from collections import Counter
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile
import xml.etree.ElementTree as ET

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from descriptions import excerpt, make_description
from import_gtd import import_files, read_workbook
from serve import query_event, query_events

def event(country=167):
    return {'eventid':'200001010001','iyear':2000,'imonth':1,'iday':1,
            'country':country,'country_txt':'Example Country','city':'Example City',
            'latitude':1,'longitude':2,'nkill':0,'nwound':None}

class DescriptionTests(unittest.TestCase):
    def test_original_summary_and_citations_are_preserved(self):
        text='An explicitly synthetic event description. '+('Additional documented detail. '*30)
        result=make_description({'city':'City','country':'Country','fatalities':0,'injuries':None},
            {'summary':text,'attack_type':None,'target':None,'sources':json.dumps(['Example newspaper, 2000.'])})
        self.assertEqual(result['kind'],'gtd')
        self.assertEqual(result['text'],text.strip())
        self.assertTrue(text.startswith(result['excerpt']))
        self.assertLessEqual(len(result['excerpt']),360)
        self.assertEqual(result['sources'],['Example newspaper, 2000.'])

    def test_structured_fallback_never_turns_unknown_into_zero(self):
        result=make_description({'city':'Unknown','country':'Country','fatalities':0,'injuries':None},
            {'summary':None,'attack_type':'Unknown','target':'Example target','sources':'[]'})
        self.assertEqual(result['kind'],'fields')
        self.assertIn('Fatalities reported by GTD: 0.',result['text'])
        self.assertIn('Injuries are not recorded.',result['text'])
        self.assertNotIn('Unknown',result['text'])
        self.assertNotIn('Attack type',result['text'])
        self.assertIn('Target recorded by GTD: Example target.',result['text'])

    def test_excerpt_ends_at_sentence_or_word_boundary(self):
        self.assertEqual(excerpt('Short description.'),'Short description.')
        text=('Long illustrative sentence with documented facts. '*20)
        self.assertTrue(excerpt(text).endswith('.'))
        text='word '*100
        self.assertTrue(excerpt(text).endswith('word…'))

    def test_import_scope_and_detail_endpoint_do_not_inflate_event_pages(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'source.xlsx';source.write_bytes(b'synthetic')
            scoped=event();scoped.update(summary='Synthetic GTD description.',scite1='Example citation.',scite2='Example citation.')
            other=event(1);other['eventid']='200001010002';other['summary']='Do not import this narrative.'
            with patch('import_gtd.read_workbook',return_value=iter([scoped,other])):
                manifest=import_files([source],root/'local-data')
            db=sqlite3.connect(root/'local-data/gtd.sqlite');db.row_factory=sqlite3.Row
            self.assertEqual(manifest['descriptions'],{'country_codes':[167],'records':1,'with_summary':1})
            detail=query_event(db,scoped['eventid'])
            self.assertEqual(detail['description']['text'],'Synthetic GTD description.')
            self.assertEqual(detail['description']['sources'],['Example citation.'])
            self.assertEqual(query_event(db,other['eventid'])['description']['kind'],'unavailable')
            self.assertIsNone(query_event(db,'missing'))
            self.assertTrue(all('description' not in item for item in query_events(db,{})['events']))
            db.close()

    def test_xlsx_narratives_are_resolved_only_for_selected_country(self):
        fields=['eventid','iyear','imonth','iday','country','country_txt','city','latitude','longitude','nkill','nwound','summary','scite1','attacktype1_txt','target1']
        strings=fields+['Example Country','Example City','Synthetic narrative.','Example citation.','Example attack type','Example target']
        ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
        shared=ET.Element('sst',xmlns=ns)
        for value in strings:
            ET.SubElement(ET.SubElement(shared,'si'),'t').text=value
        sheet=ET.Element('worksheet',xmlns=ns);data=ET.SubElement(sheet,'sheetData')
        header=ET.SubElement(data,'row',r='1')
        for i in range(len(fields)):
            ET.SubElement(ET.SubElement(header,'c',r=f'{chr(65+i)}1',t='s'),'v').text=str(i)
        for number,code in [(2,167),(3,1)]:
            row=ET.SubElement(data,'row',r=str(number))
            values=[str(200001010000+number),'2000','1','1',str(code),'15','16','1','2','0',None,'17','18','19','20']
            for i,value in enumerate(values):
                if value is None:continue
                attrs={'r':f'{chr(65+i)}{number}'}
                if i in [5,6,11,12,13,14]:attrs['t']='s'
                ET.SubElement(ET.SubElement(row,'c',attrs),'v').text=value
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'synthetic.xlsx'
            with ZipFile(path,'w') as archive:
                archive.writestr('xl/sharedStrings.xml',ET.tostring(shared))
                archive.writestr('xl/worksheets/sheet1.xml',ET.tostring(sheet))
            rows=list(read_workbook(path))
            self.assertEqual(rows[0]['summary'],'Synthetic narrative.')
            self.assertNotIn('summary',rows[1])
            other=list(read_workbook(path,(1,)))
            self.assertNotIn('summary',other[0])
            self.assertEqual(other[1]['scite1'],'Example citation.')

if __name__=='__main__':
    unittest.main()
