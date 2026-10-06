"""Synthetic fixtures only: validate GTD import and local query semantics."""
from collections import Counter
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from import_gtd import event_identifier, import_files, normalize, read_workbook
from serve import filters, query_events, query_map, viewport_filter


def raw(event_id='197000000001', year=1970, country=1, lat=0, lng=0, deaths=0, injuries=None):
    return {'eventid':event_id, 'iyear':year, 'imonth':0, 'iday':0, 'country':country,
            'country_txt':f'Country {country}', 'city':'Example City', 'latitude':lat,
            'longitude':lng, 'nkill':deaths, 'nwound':injuries, 'specificity':1}


class ImportTests(unittest.TestCase):
    def test_known_zero_and_unknown_are_distinct(self):
        row = normalize(raw(), Counter())
        self.assertEqual(row[9], 0)
        self.assertIsNone(row[10])
        self.assertEqual(row[7:9], (0, 0))
        self.assertEqual(event_identifier('1.97000000001E+11'), '197000000001')

    def test_invalid_coordinates_are_reported_without_dropping_event(self):
        issues = Counter()
        row = normalize(raw(lat=91), issues)
        self.assertEqual(row[7:9], (None, None))
        self.assertEqual(issues['invalid_coordinates'], 1)

    def test_unexpected_negative_counts_stop_import(self):
        with self.assertRaisesRegex(ValueError, 'unexpected negative nkill'):
            normalize(raw(deaths=-99), Counter())

    def test_impossible_date_is_rejected(self):
        record = raw()
        record.update(imonth=2, iday=30)
        with self.assertRaisesRegex(ValueError, 'impossible calendar date'):
            normalize(record, Counter())

    def test_duplicate_id_does_not_replace_existing_database(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            output = root / 'local-data'
            output.mkdir()
            existing = output / 'gtd.sqlite'
            existing.write_bytes(b'keep previous database')
            source = root / 'source.xlsx'
            source.write_bytes(b'fixture')
            with patch('import_gtd.read_workbook', return_value=iter([raw(),raw()])), self.assertRaisesRegex(ValueError, 'Duplicate'):
                import_files([source], output)
            self.assertEqual(existing.read_bytes(), b'keep previous database')
            self.assertFalse((output / 'gtd.importing.sqlite').exists())

    def test_xlsx_reader_resolves_selected_columns_and_blank_values(self):
        fields = ['eventid','iyear','imonth','iday','country','country_txt','city','latitude','longitude','nkill','nwound']
        ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'fixture.xlsx'
            strings = fields + ['Example Country','Example City']
            shared = ET.Element('sst', xmlns=ns)
            for value in strings:
                ET.SubElement(ET.SubElement(shared,'si'),'t').text = value
            sheet = ET.Element('worksheet', xmlns=ns)
            data = ET.SubElement(sheet,'sheetData')
            header = ET.SubElement(data,'row', r='1')
            for i in range(len(fields)):
                ET.SubElement(ET.SubElement(header,'c',r=f'{chr(65+i)}1',t='s'),'v').text = str(i)
            for number in [2,3]:
                row = ET.SubElement(data,'row',r=str(number))
                vals = ['19700000000'+str(number),'1970','0','0','1','11','12','0','0','0',None]
                for i,value in enumerate(vals):
                    if value is None:
                        continue
                    attrs = {'r':f'{chr(65+i)}{number}'}
                    if i in [5,6]:
                        attrs['t'] = 's'
                    ET.SubElement(ET.SubElement(row,'c',attrs),'v').text = value
            with ZipFile(path,'w') as archive:
                archive.writestr('xl/sharedStrings.xml', ET.tostring(shared))
                archive.writestr('xl/worksheets/sheet1.xml', ET.tostring(sheet))
            rows = list(read_workbook(path))
            self.assertEqual(len(rows),2)
            self.assertEqual(rows[0]['city'],'Example City')
            self.assertNotIn('nwound',rows[0])
            self.assertEqual(normalize(rows[0],Counter())[9:11],(0,None))


class QueryTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.execute('CREATE TABLE events (id TEXT, year INTEGER, month INTEGER, day INTEGER, country_code INTEGER, country TEXT, city TEXT, lat REAL, lng REAL, fatalities REAL, injuries REAL, specificity INTEGER, approxdate TEXT, mx REAL, my REAL, source_file TEXT)')
        samples = [raw('197000000001',1970,1,0,0,0,None),
                   raw('200000000002',2000,2,None,None,None,4),
                   raw('202000000003',2020,1,20,30,5,0),
                   raw('202000000004',2020,3,20,30,2,3)]
        for sample in samples:
            self.db.execute('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (*normalize(sample,Counter()),'synthetic.xlsx'))

    def tearDown(self):
        self.db.close()

    def test_full_summary_keeps_unmapped_events_and_unknown_values(self):
        result = query_events(self.db,{})
        self.assertEqual(result['summary'],{'count':4,'fatalities':{'value':7,'unknown':1},'injuries':{'value':7,'unknown':1},'unmapped':1})
        self.assertEqual(len(result['events']),4)

    def test_combined_filters_include_both_boundaries_and_country_or(self):
        result = query_events(self.db,{'from':['2020'],'to':['2020'],'country':['1','3']})
        self.assertEqual(result['summary']['count'],2)
        self.assertEqual(result['summary']['fatalities']['value'],7)
        self.assertEqual(query_events(self.db,{'from':['2000'],'to':['2000'],'country':['1']})['summary']['count'],0)

    def test_gap_is_empty_and_all_unknown_is_not_zero(self):
        self.assertIsNone(query_events(self.db,{'from':['1993'],'to':['1993']})['summary']['fatalities']['value'])
        self.assertIsNone(query_events(self.db,{'from':['2000'],'to':['2000']})['summary']['fatalities']['value'])
        self.assertEqual(query_events(self.db,{'from':['1970'],'to':['1970']})['summary']['fatalities']['value'],0)

    def test_pagination_is_bounded_and_clamped(self):
        result = query_events(self.db,{'limit':['2'],'page':['99']})
        self.assertEqual(result['page'],1)
        self.assertEqual(len(result['events']),2)
        with self.assertRaises(ValueError):
            query_events(self.db,{'limit':['101']})

    def test_map_groups_preserve_mapped_count_and_group_membership(self):
        result = query_map(self.db,{'zoom':['9']})
        self.assertEqual(result['mappedInView'],3)
        group = next(g for g in result['groups'] if g['count']==2)
        params = {'zoom':['9'],'cell':[str(group['cell'])],'groupX':[str(group['x'])],'groupY':[str(group['y'])]}
        self.assertEqual(query_events(self.db,params)['summary']['count'],2)

    def test_viewport_does_not_affect_summary_and_dateline_wrap_is_supported(self):
        bounds = {'west':['25'],'east':['35'],'south':['15'],'north':['25'],'zoom':['9']}
        self.assertEqual(query_map(self.db,bounds)['mappedInView'],2)
        self.assertEqual(query_events(self.db,bounds)['summary']['count'],4)
        extra, values = viewport_filter({'west':['170'],'east':['190'],'south':['-10'],'north':['10']})
        self.assertIn('OR',extra)
        self.assertEqual(values[-2:],[170,-170])
        with self.assertRaises(ValueError):
            filters({'from':['2021'],'to':['2020']})


if __name__ == '__main__':
    unittest.main()
