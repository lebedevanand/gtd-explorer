"""Loopback-only GTD Explorer server. Raw workbooks and database files are never served."""
import argparse
from contextlib import closing
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import sqlite3
from urllib.parse import parse_qs, unquote, urlsplit
from descriptions import make_description

ROOT = Path(__file__).resolve().parents[1]
EVENT_FIELDS = 'id, year, month, day, country_code AS countryCode, country, city, lat, lng, fatalities, injuries, specificity, approxdate'


def connect(path):
    db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    return db


def bounded_int(params, key, default, lower, upper):
    value = int(params.get(key, [str(default)])[0])
    if not lower <= value <= upper:
        raise ValueError(f'{key} must be between {lower} and {upper}')
    return value


def filters(params):
    start = bounded_int(params, 'from', 1970, 1900, 2100)
    end = bounded_int(params, 'to', 2021, 1900, 2100)
    if start > end:
        raise ValueError('The start year must not exceed the end year')
    parts, values = ['year BETWEEN ? AND ?'], [start, end]
    countries = params.get('country', [])
    if len(countries) > 250:
        raise ValueError('Too many country filters')
    if countries:
        codes = [int(c) for c in countries]
        parts.append('country_code IN (' + ','.join('?' for _ in codes) + ')')
        values.extend(codes)
    return ' AND '.join(parts), values


def viewport_filter(params):
    keys = ['west', 'east', 'south', 'north']
    if not any(key in params for key in keys):
        return '', []
    if not all(key in params for key in keys):
        raise ValueError('All four map bounds are required')
    west, east, south, north = [float(params[key][0]) for key in keys]
    if not all(math.isfinite(v) for v in [west, east, south, north]) or not -90 <= south <= north <= 90 or east < west:
        raise ValueError('Invalid map bounds')
    parts, values = ['lat BETWEEN ? AND ?'], [south, north]
    if east - west < 360:
        west, east = (west + 180) % 360 - 180, (east + 180) % 360 - 180
        if west <= east:
            parts.append('lng BETWEEN ? AND ?')
        else:
            parts.append('(lng >= ? OR lng <= ?)')
        values.extend([west, east])
    return ' AND ' + ' AND '.join(parts), values


def group_filter(params):
    if 'groupX' not in params and 'groupY' not in params:
        return '', []
    zoom = bounded_int(params, 'zoom', 1, 0, 18)
    cell = bounded_int(params, 'cell', 48, 24, 67108864)
    x = bounded_int(params, 'groupX', 0, 0, 3000000)
    y = bounded_int(params, 'groupY', 0, 0, 3000000)
    scale = 256 * 2**zoom
    return ' AND CAST(mx * ? / ? AS INTEGER) = ? AND CAST(my * ? / ? AS INTEGER) = ?', [scale, cell, x, scale, cell, y]


def summary(db, where, values):
    row = db.execute(f'''SELECT COUNT(*) AS count,
        SUM(fatalities) AS fatalities, COUNT(*) - COUNT(fatalities) AS unknown_fatalities,
        SUM(injuries) AS injuries, COUNT(*) - COUNT(injuries) AS unknown_injuries,
        SUM(CASE WHEN lat IS NULL OR lng IS NULL THEN 1 ELSE 0 END) AS unmapped
        FROM events WHERE {where}''', values).fetchone()
    return {'count':row['count'], 'fatalities':{'value':row['fatalities'], 'unknown':row['unknown_fatalities']},
            'injuries':{'value':row['injuries'], 'unknown':row['unknown_injuries']}, 'unmapped':row['unmapped'] or 0}


def query_events(db, params):
    where, values = filters(params)
    if 'groupX' in params or 'groupY' in params:
        extra, extra_values = viewport_filter(params)
        where += extra
        values.extend(extra_values)
        extra, extra_values = group_filter(params)
        where += extra
        values.extend(extra_values)
    totals = summary(db, where, values)
    limit = bounded_int(params, 'limit', 8, 1, 100)
    pages = max(1, math.ceil(totals['count'] / limit))
    page = min(bounded_int(params, 'page', 0, 0, 1000000), pages - 1)
    rows = db.execute(f'SELECT {EVENT_FIELDS} FROM events WHERE {where} ORDER BY year DESC, month DESC, day DESC, id DESC LIMIT ? OFFSET ?', [*values, limit, page * limit])
    return {'events':[dict(row) for row in rows], 'summary':totals, 'page':page, 'pages':pages}


def query_map(db, params):
    where, values = filters(params)
    extra, extra_values = viewport_filter(params)
    where += extra + ' AND lat IS NOT NULL AND lng IS NOT NULL'
    values.extend(extra_values)
    zoom = bounded_int(params, 'zoom', 1, 0, 18)
    scale, cell = 256 * 2**zoom, 80 if zoom < 3 else 48
    while True:
        rows = db.execute(f'''SELECT CAST(mx * ? / ? AS INTEGER) AS gx,
            CAST(my * ? / ? AS INTEGER) AS gy, COUNT(*) AS count,
            AVG(lat) AS center_lat, AVG(lng) AS center_lng,
            SUM(fatalities) AS sum_fatalities, COUNT(*) - COUNT(fatalities) AS missing_fatalities,
            SUM(injuries) AS sum_injuries, COUNT(*) - COUNT(injuries) AS missing_injuries,
            {EVENT_FIELDS}
            FROM events WHERE {where} GROUP BY gx, gy LIMIT 1001''', [scale, cell, scale, cell, *values]).fetchall()
        if len(rows) <= 1000:
            break
        cell *= 2
    groups = []
    for row in rows:
        group = {'lat':row['center_lat'], 'lng':row['center_lng'], 'count':row['count'],
                 'x':row['gx'], 'y':row['gy'], 'cell':cell, 'zoom':zoom,
                 'fatalities':{'value':row['sum_fatalities'], 'unknown':row['missing_fatalities']},
                 'injuries':{'value':row['sum_injuries'], 'unknown':row['missing_injuries']}}
        if row['count'] == 1:
            group['event'] = {key:row[key] for key in row.keys() if key not in ['gx','gy','count','center_lat','center_lng','sum_fatalities','missing_fatalities','sum_injuries','missing_injuries']}
        groups.append(group)
    return {'groups':groups, 'mappedInView':sum(g['count'] for g in groups), 'cell':cell}


def query_event(db, event_id):
    row = db.execute(f'SELECT {EVENT_FIELDS} FROM events WHERE id = ?', [event_id]).fetchone()
    if not row:
        return None
    event = dict(row)
    available = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='event_descriptions'").fetchone()
    if not available:
        description = {'kind':'unavailable','label':'Description unavailable',
                       'text':'Re-run the local import to load descriptions.','sources':[]}
    else:
        record = db.execute('SELECT * FROM event_descriptions WHERE event_id = ?', [event_id]).fetchone()
        description = make_description(event, record) if record else {
            'kind':'unavailable','label':'Description unavailable',
            'text':'Descriptions have not yet been imported for this country.','sources':[]}
    event['description'] = description
    return event


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, database, **kwargs):
        self.database = database
        super().__init__(*args, directory=str(ROOT / 'dist'), **kwargs)

    def allowed_request(self):
        host = self.headers.get('Host', '')
        origin = self.headers.get('Origin')
        allowed = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        return host in allowed and (not origin or origin in {f'http://{h}' for h in allowed})

    def do_GET(self):
        if not self.allowed_request():
            self.send_error(403, 'Only same-origin loopback requests are allowed')
            return
        path = urlsplit(self.path).path
        if path.startswith('/api/'):
            try:
                self.api(path, parse_qs(urlsplit(self.path).query))
            except (ValueError, KeyError) as error:
                self.json_response({'error':str(error)}, 400)
            except sqlite3.Error:
                self.json_response({'error':'Unable to read the local database. Re-run the import.'}, 500)
            return
        super().do_GET()

    def do_HEAD(self):
        if not self.allowed_request():
            self.send_error(403)
            return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def json_response(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def api(self, path, params):
        if not self.database.exists():
            if path == '/api/meta':
                self.json_response({'mode':'demo'})
            else:
                self.json_response({'error':'No local GTD dataset. Run the import first.'}, 404)
            return
        with closing(connect(self.database)) as db:
            if path == '/api/meta':
                manifest = json.loads(db.execute("SELECT value FROM metadata WHERE key='manifest'").fetchone()[0])
                countries = [dict(row) for row in db.execute('SELECT country_code AS code, country AS name, COUNT(*) AS count FROM events GROUP BY country_code, country ORDER BY country')]
                data = {'mode':'gtd', 'manifest':manifest, 'countries':countries}
            elif path == '/api/events':
                data = query_events(db, params)
            elif path == '/api/bounds':
                where, values = filters(params)
                row = db.execute(f'SELECT MIN(lat) AS south, MAX(lat) AS north, MIN(lng) AS west, MAX(lng) AS east FROM events WHERE {where} AND lat IS NOT NULL AND lng IS NOT NULL', values).fetchone()
                data = dict(row)
            elif path == '/api/map':
                data = query_map(db, params)
            elif path.startswith('/api/event/'):
                event_id = unquote(path.removeprefix('/api/event/'))
                data = query_event(db, event_id)
                if data is None:
                    self.json_response({'error':'Event not found'}, 404)
                    return
            else:
                self.json_response({'error':'Unknown endpoint'}, 404)
                return
            self.json_response(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--database', type=Path, default=ROOT / 'local-data' / 'gtd.sqlite')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, database=args.database))
    print(f'GTD Explorer: http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
