"""Read official GTD XLSX files without modifying them; build an ignored local database."""
import argparse
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
import math
from pathlib import Path
import sqlite3
import time
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REQUIRED = {'eventid', 'iyear', 'imonth', 'iday', 'country', 'country_txt', 'city', 'latitude', 'longitude', 'nkill', 'nwound'}
OPTIONAL = {'specificity', 'approxdate'}
DESCRIPTION_FIELDS = {'summary', 'scite1', 'scite2', 'scite3', 'attacktype1_txt', 'target1'}
VERSION = '1.1.0'

def shared_strings(archive, wanted):
    values = {}
    if not wanted:
        return values
    with archive.open('xl/sharedStrings.xml') as stream:
        context = ET.iterparse(stream, events=('start', 'end'))
        _, root = next(context)
        index = 0
        for event, element in context:
            if event == 'end' and element.tag == NS + 'si':
                if index in wanted:
                    values[index] = ''.join(t.text or '' for t in element.iter(NS + 't'))
                index += 1
                element.clear()
                root.clear()
                if len(values) == len(wanted):
                    break
    if set(values) != wanted:
        raise ValueError('Unresolved XLSX shared strings')
    return values

def cell_value(cell):
    kind = cell.get('t')
    value = cell.findtext(NS + 'v')
    if kind == 's':
        return ('s', int(value))
    if kind == 'inlineStr':
        return ''.join(t.text or '' for t in cell.iter(NS + 't'))
    if kind == 'e':
        raise ValueError(f'Excel error in cell {cell.get("r")}')
    return value

def column_name(reference):
    return reference.rstrip('0123456789')

def read_workbook(path, description_countries=(167,)):
    # Resolve narratives only for the requested source country codes.
    with ZipFile(path) as archive:
        with archive.open('xl/worksheets/sheet1.xml') as stream:
            context = ET.iterparse(stream, events=('start', 'end'))
            _, root = next(context)
            for event, row in context:
                if event == 'end' and row.tag == NS + 'row':
                    raw_header = {column_name(c.get('r')): cell_value(c) for c in row}
                    break
        header_indices = {v[1] for v in raw_header.values() if isinstance(v, tuple)}
        strings = shared_strings(archive, header_indices)
        header = {col: strings[v[1]] if isinstance(v, tuple) else v for col, v in raw_header.items()}
        missing = REQUIRED - set(header.values())
        if missing:
            raise ValueError(f'{path.name}: missing required columns {sorted(missing)}')
        columns = {col: name for col, name in header.items() if name in REQUIRED | OPTIONAL}
        description_columns = {col:name for col,name in header.items() if name in DESCRIPTION_FIELDS}
        records, needed = [], set()
        with archive.open('xl/worksheets/sheet1.xml') as stream:
            context = ET.iterparse(stream, events=('start', 'end'))
            _, root = next(context)
            for event, row in context:
                if event != 'end' or row.tag != NS + 'row':
                    continue
                if int(row.get('r')) > 1:
                    record = {}
                    for cell in row:
                        field = columns.get(column_name(cell.get('r')))
                        if field:
                            value = cell_value(cell)
                            record[field] = value
                            if isinstance(value, tuple):
                                needed.add(value[1])
                    if record.get('country') is not None and not isinstance(record['country'], tuple) and int(float(record['country'])) in description_countries:
                        for cell in row:
                            field = description_columns.get(column_name(cell.get('r')))
                            if field:
                                value = cell_value(cell)
                                record[field] = value
                                if isinstance(value, tuple):
                                    needed.add(value[1])
                    if any(value is not None for value in record.values()):
                        if record.get('eventid') is None:
                            raise ValueError(f'{path.name}: row {row.get("r")} is missing eventid')
                        records.append(record)
                row.clear()
                root.clear()
        strings = shared_strings(archive, needed)
        for record in records:
            yield {key: strings[value[1]] if isinstance(value, tuple) else value for key, value in record.items()}

def numeric(raw):
    if raw is None or str(raw).strip() == '':
        return None
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise ValueError(f'Invalid number: {raw!r}')
    if not math.isfinite(value):
        raise ValueError(f'Non-finite number: {raw!r}')
    return value

def integer(raw):
    value = numeric(raw)
    if value is None or value != int(value):
        raise ValueError(f'Expected integer: {raw!r}')
    return int(value)

def event_identifier(raw):
    if raw is None:
        raise ValueError('Missing event identifier')
    try:
        value = Decimal(str(raw))
        if not value.is_finite() or value != value.to_integral_value() or value <= 0:
            raise ValueError('Invalid event identifier')
        return str(int(value))
    except InvalidOperation:
        raise ValueError('Invalid event identifier')

def normalize(record, issues):
    event_id = event_identifier(record.get('eventid'))
    year = integer(record.get('iyear'))
    if not 1900 <= year <= 2100:
        raise ValueError(f'{event_id}: invalid year')
    month, day = integer(record.get('imonth')), integer(record.get('iday'))
    if not 0 <= month <= 12 or not 0 <= day <= 31 or (month == 0 and day != 0):
        raise ValueError(f'{event_id}: invalid date components')
    if month and day:
        try:
            datetime(year, month, day)
        except ValueError:
            raise ValueError(f'{event_id}: impossible calendar date')
    country_code = integer(record.get('country'))
    country = str(record.get('country_txt') or '').strip()
    if not country or country_code <= 0:
        raise ValueError(f'{event_id}: missing country')
    city = str(record.get('city') or 'Unknown').strip() or 'Unknown'
    lat, lng = numeric(record.get('latitude')), numeric(record.get('longitude'))
    if lat is None or lng is None:
        issues['missing_coordinates'] += 1
        lat = lng = None
    elif abs(lat) > 90 or abs(lng) > 180:
        issues['invalid_coordinates'] += 1
        lat = lng = None
    values = []
    for field in ['nkill', 'nwound']:
        value = numeric(record.get(field))
        if value is not None and value < 0:
            # This release uses blanks for unknown casualty counts; unexpected negatives are errors.
            raise ValueError(f'{event_id}: unexpected negative {field}: {value}')
        if value is None:
            issues[f'unknown_{field}'] += 1
        values.append(value)
    specificity = numeric(record.get('specificity'))
    if specificity is not None and specificity not in (1, 2, 3, 4, 5):
        raise ValueError(f'{event_id}: invalid specificity')
    approxdate = record.get('approxdate') or None
    if not month or not day:
        issues['incomplete_dates'] += 1
    if lat is not None:
        mx = (lng + 180) / 360
        clipped = max(-85.05112878, min(85.05112878, lat))
        my = (1 - math.asinh(math.tan(math.radians(clipped))) / math.pi) / 2
    else:
        mx = my = None
    return (event_id, year, month, day, country_code, country, city, lat, lng, *values, specificity, approxdate, mx, my)

def checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def import_files(files, output, description_countries=(167,)):
    started = time.perf_counter()
    output.mkdir(parents=True, exist_ok=True)
    temp = output / 'gtd.importing.sqlite'
    temp.unlink(missing_ok=True)
    db = sqlite3.connect(temp)
    db.execute('''CREATE TABLE events (
        id TEXT PRIMARY KEY, year INTEGER NOT NULL, month INTEGER NOT NULL, day INTEGER NOT NULL,
        country_code INTEGER NOT NULL, country TEXT NOT NULL, city TEXT NOT NULL,
        lat REAL, lng REAL, fatalities REAL, injuries REAL, specificity INTEGER, approxdate TEXT,
        mx REAL, my REAL, source_file TEXT NOT NULL)''')
    db.execute('CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    db.execute('''CREATE TABLE event_descriptions (
        event_id TEXT PRIMARY KEY REFERENCES events(id), summary TEXT,
        attack_type TEXT, target TEXT, sources TEXT NOT NULL)''')
    sources = []
    try:
        for path in files:
            issues = Counter()
            count, years, months = 0, Counter(), Counter()
            print(f'Reading {path.name}...', flush=True)
            for raw in read_workbook(path, description_countries):
                record = normalize(raw, issues)
                try:
                    db.execute('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (*record, path.name))
                except sqlite3.IntegrityError:
                    raise ValueError(f'Duplicate event identifier: {record[0]} (import stopped)')
                if record[4] in description_countries:
                    text = lambda key: str(raw.get(key) or '').strip() or None
                    citations = list(dict.fromkeys(text(key) for key in ['scite1','scite2','scite3'] if text(key)))
                    db.execute('INSERT INTO event_descriptions VALUES (?,?,?,?,?)',
                               (record[0],text('summary'),text('attacktype1_txt'),text('target1'),json.dumps(citations)))
                count += 1
                years[record[1]] += 1
                months[record[2]] += 1
                if count % 50000 == 0:
                    print(f'  Validated {count:,} records', flush=True)
            sources.append({'filename':path.name, 'sha256':checksum(path), 'records':count,
                            'years':dict(sorted(years.items())), 'months':dict(sorted(months.items())),
                            'quality':dict(issues)})
            print(f'  Imported {count:,} records', flush=True)
        db.execute('CREATE INDEX events_filters ON events(year, country_code)')
        db.execute('CREATE INDEX events_country ON events(country_code, year)')
        db.execute('CREATE INDEX events_map ON events(mx, my)')
        year_counts = dict(db.execute('SELECT year, COUNT(*) FROM events GROUP BY year ORDER BY year'))
        manifest = {'import_version':VERSION, 'imported_at':datetime.now(timezone.utc).isoformat(),
                    'source':'START / University of Maryland', 'sources':sources,
                    'record_count':sum(year_counts.values()), 'years':year_counts,
                    'coverage_gaps':[1993] if min(year_counts) <= 1993 <= max(year_counts) else [],
                    'partial_years':{'2021':'January–June only'} if 2021 in year_counts else {},
                    'country_count':db.execute('SELECT COUNT(DISTINCT country_code) FROM events').fetchone()[0],
                    'descriptions':{'country_codes':list(description_countries),
                        'records':db.execute('SELECT COUNT(*) FROM event_descriptions').fetchone()[0],
                        'with_summary':db.execute('SELECT COUNT(*) FROM event_descriptions WHERE summary IS NOT NULL').fetchone()[0]},
                    'quality':dict(sum((Counter(s['quality']) for s in sources), Counter())),
                    'duration_seconds':round(time.perf_counter()-started,2)}
        db.execute('INSERT INTO metadata VALUES (?,?)', ('manifest',json.dumps(manifest)))
        db.commit()
        db.close()
        temp.replace(output / 'gtd.sqlite')
        (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        print(json.dumps({k:manifest[k] for k in ['record_count','country_count','quality','duration_seconds']}, indent=2), flush=True)
        return manifest
    except Exception:
        db.close()
        temp.unlink(missing_ok=True)
        raise

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_directory', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'local-data')
    parser.add_argument('--description-country', type=int, action='append',
                        help='GTD country code to import descriptions for; repeat for multiple countries. Default: 167 (Russia).')
    args = parser.parse_args()
    filenames = ['globalterrorismdb_0522dist.xlsx', 'globalterrorismdb_2021Jan-June_1222dist.xlsx']
    files = [args.source_directory / name for name in filenames if (args.source_directory / name).exists()]
    if not files:
        parser.error('No supported GTD workbooks found in the source directory')
    try:
        import_files(files, args.output, tuple(dict.fromkeys(args.description_country or [167])))
    except (ValueError, ET.ParseError) as error:
        parser.exit(1, f'Import failed: {error}\n')

if __name__ == '__main__':
    main()
