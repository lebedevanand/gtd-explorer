# GTD Explorer

An interactive map for exploring events recorded in the **Global Terrorism Database (GTD)**, with filters by year and country and separate figures for fatalities and injuries.

## Status

The local explorer supports official GTD workbooks supplied by the user. It also includes an explicitly separate demonstration mode with fictional fixtures. No GTD dataset or local database is included in this repository, and the website has not been publicly deployed.

All project documentation and interface text are in English. Project instructions are in [AGENTS.md](AGENTS.md).

## Features

- Map fills the main screen, with floating panels in a warm paper and burgundy palette.
- Transparent proportional bubbles for known fatalities or injuries, with separate zero and unknown markers.
- World map with zooming, spatial grouping, and selectable events.
- Filters for a single year or an inclusive year range and one or more countries.
- Collapsible country filters, year selectors and range controls, and a paginated event drawer.
- Group details with separate event counts and casualty totals, including events that share coordinates.
- Event details with available date precision, location, fatalities, injuries, GTD identifier, and coordinate specificity.
- Full-selection summaries of event counts and sums of known values, with unknown counts displayed.
- Explicit coverage warnings for 1993 and the partial 2021 supplement.
- Records without coordinates remain in the summaries and event list.
- Keyboard-accessible filters and event details, and responsive mobile layout.

## Run locally

Requires **Python 3.10 or later**. The importer and server use the Python standard library; no package installation is needed.

### 1. Obtain the data

Obtain the files through the [official GTD download form](https://www.start.umd.edu/gtd-download) and follow the applicable terms. Store the original workbooks outside this repository:

- `globalterrorismdb_0522dist.xlsx`: main release, 1970–2020.
- `globalterrorismdb_2021Jan-June_1222dist.xlsx`: optional January–June 2021 supplement.

### 2. Import

From the repository root, pass the directory containing those workbooks:

```sh
python3 scripts/import_gtd.py "/path/to/Global Terrorism Database"
```

The importer streams the necessary XLSX fields, preserves source files unchanged, checks required columns and identifiers, and produces:

- `local-data/gtd.sqlite`: local query database.
- `local-data/manifest.json`: source checksums, import timestamp, coverage, record counts, and quality report.

Both outputs are ignored by Git and kept outside the static website directory. Import stops on duplicate identifiers, malformed required values, or incompatible schemas. Invalid or missing coordinates are reported and excluded only from the map. Blank fatality and injury values stay unknown. To update the data, rerun the import with the supported official files. A failed validation leaves the previous database intact.

### 3. Start the explorer

```sh
python3 scripts/serve.py
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The server binds to the loopback interface and serves only the frontend and limited local query endpoints. Workbooks, the database, and local report files are not served. It does not expose a public service.

Without an imported database, the server uses clearly labeled fictional demonstration data. To explicitly inspect the demo while a database is present, open [http://127.0.0.1:4173/?demo=1](http://127.0.0.1:4173/?demo=1). Real and synthetic records are never combined. Request failures are shown as errors rather than silently switching to demonstration data.

Do not use a generic static server for the real-data mode; it requires the local query server. Avoid opening `index.html` directly, since JavaScript modules require an HTTP server.

## Architecture

The frontend uses buildless HTML, CSS, and JavaScript with [Leaflet 1.9.4](https://leafletjs.com/reference-1.9.4.html). SQLite queries run in the local Python server. The browser receives one event page at a time and a bounded set of spatial clusters rather than the full dataset. Map movement changes the visible clusters but leaves filtered totals unchanged.

Bubble area represents the selected sum of known fatalities or injuries for mapped events in each spatial group. The radius uses a square-root scale; positive marks have a 3-pixel minimum radius for visibility. Zero totals are hollow and entirely unknown totals are dashed. Unknown records within partially known groups appear in tooltips and details. The size scale adjusts to the visible map groups and is shown in the legend; compare numerical values rather than circle sizes across different views. The map tiles use a muted warm color treatment, with provider attribution retained.

Leaflet is loaded from a pinned CDN URL with an integrity check. Internet access is required for the map library and OpenStreetMap tiles. If the map fails, the event list and filters remain available. Attribution is displayed on the map. Follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/); this app does not implement offline downloads or tile prefetching.

- `dist/index.html` and `dist/styles.css`: interface and responsive layout.
- `dist/app.js`: dataset loading, filters, map interactions, and event details.
- `dist/model.js`: demonstration filtering, summaries, date labels, and grouping.
- `dist/demo.js`: explicitly fictional fixtures.
- `scripts/import_gtd.py`: validated XLSX-to-SQLite import.
- `scripts/serve.py`: local query endpoints and frontend server.
- `tests/`: synthetic calculation, import, and query tests.

The loopback server is for local use. Public hosting would require a separate architecture and review of how event records are delivered under the GTD terms.

## Data and methodology

Source: **START / University of Maryland**. The supplied main release covers 1970–2020; the supplement covers **January–June 2021 only**. The main database has a gap for **1993**. Neither the missing year nor the missing half of 2021 represents zero events. Historical country codes and labels are preserved, so the country list includes historical entities.

“All events” refers to records in the imported release, not every terrorist attack worldwide. The primary metric is **Fatalities reported by GTD** (`nkill`); injuries (`nwound`) are shown separately. Both include attackers. Totals are sums of known values, with missingness reported. Coordinates can represent settlement or administrative-region centroids rather than precise attack sites. Date components of zero remain unknown. The supplied August 2021 codebook documents these definitions; see also the [official methodology](https://www.start.umd.edu/using-gtd).

Classification follows GTD. This is a tool for exploring historical records, not a travel-safety assessment or risk forecast. Changes in source availability and collection methods affect comparisons over time.

## Data usage and attribution

The [GTD EULA](https://www.start.umd.edu/gtd-download) permits non-commercial research and analysis and expressly allows non-commercial analysis and visualization under its public-display exception. Redistribution of the underlying data remains restricted, and commercial use requires a separate agreement. Publishing application code does not grant rights to redistribute GTD data.

Do not commit raw workbooks, derived event datasets, local databases, or copies of GTD auxiliary materials. Public delivery of event records must respect the applicable terms and must not be treated as blanket permission to distribute the database.

Required main-release attribution:

> START (National Consortium for the Study of Terrorism and Responses to Terrorism). (2022). Global Terrorism Database, 1970 - 2020 [data file]. https://www.start.umd.edu/gtd

Supplement: `globalterrorismdb_2021Jan-June_1222dist.xlsx`, January–June 2021, December 2022 release. Copyright University of Maryland 2022.

## Validation

Run Python import/query tests and JavaScript model tests (Node.js 18 or later):

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test
```

Tests cover combined filters, inclusive year boundaries, zero versus unknown values, totals retaining unmapped events, invalid coordinates and dates, missing values, duplicate-import protection, bounded pagination, viewport filtering, date precision, and cluster membership. All committed test records are synthetic.

On the supplied full dataset, initial local measurements on October 6, 2026 were approximately 150 ms for an all-record summary and 180 ms for world-map clustering. These are database query measurements on the development machine, not public-hosting or cross-device benchmarks. The import took about 26 seconds. Local responsiveness targets are under 1 second for filtered query responses and no more than 1,000 rendered map groups per response; remeasure after material query changes.

## Next stages

1. Refine map clustering, exploration controls, and visual design with user feedback.
2. Extend validation and measure behavior on more devices and representative filter combinations.
3. Prepare a suitable hosting architecture and data-delivery approach before any public deployment.
