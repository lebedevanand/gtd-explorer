# GTD Explorer

An interactive map for exploring events recorded in the **Global Terrorism Database (GTD)**, with filters by year and country and separate figures for fatalities and injuries.

## Status

The first interactive prototype is available locally. It uses 24 explicitly fictional events across 16 countries and 2014–2023; these are not GTD records and must not be used for analysis. The GTD import pipeline and deployment have not been implemented. Project instructions are defined in [AGENTS.md](AGENTS.md).

## Prototype features

- World map with zooming, clustering, and selectable events.
- Filters for a single year or an inclusive year range and one or more countries.
- Event details with date, location, fatalities, injuries, and GTD identifier.
- Summaries of event counts and known fatality and injury values.
- Clear indicators for unknown values, coverage gaps, and events without usable coordinates.
- Accessible event list, keyboard controls, and mobile layout.

All project documentation and interface text are in English.

## Data and methodology

The source will be a lawfully obtained GTD release from **START / University of Maryland**. The selected release and its actual coverage period will be documented after import. “All events” refers to records in that release, not every terrorist attack worldwide.

- The primary metric is **Fatalities reported by GTD** (`nkill`). Injuries (`nwound`) are shown separately. Both fields include attackers, as explained in the [GTD codebook](https://www.start.umd.edu/sites/default/files/2024-10/Codebook.pdf).
- Unknown values are distinct from known zero values. Totals will be labeled as sums of known values, with missingness reported.
- The main GTD database has a coverage gap for **1993**; this must not be represented as zero events.
- Map coordinates can represent a settlement centroid rather than the precise attack location.

Classification follows GTD. This project is a tool for exploring historical records, not a travel-safety assessment or risk forecast.

## Data usage

Raw GTD data is not included in this repository. The [GTD FAQ](https://www.start.umd.edu/gtd-faqs) prohibits redistribution of raw data. Applicable terms must be checked before publishing event records or derived data files.

Obtain data through the [official GTD download page](https://www.start.umd.edu/gtd-download) and follow the terms for the selected release. Synthetic examples, if added, will be explicitly labeled and kept separate from GTD records.

## Roadmap

1. Confirm the dataset release, coverage, and permitted usage.
2. Select the architecture and document the data schema.
3. Build a reproducible import pipeline and data-quality report.
4. Implement the map, filters, event details, summaries, and accessible list.
5. Validate calculations, accessibility, and performance before deployment.

## Development

The prototype uses buildless HTML, CSS, and JavaScript, with [Leaflet 1.9.4](https://leafletjs.com/reference-1.9.4.html) loaded from a pinned CDN URL and OpenStreetMap tiles. Internet access is required for the map library and tiles; if the map fails, filters and the event list remain available. Attribution is displayed on the map. Tile requests follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/); no offline downloads or prefetching are implemented.

### Run locally

Requires Python 3. From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173. No dependency installation or build step is required. Avoid opening `index.html` directly: JavaScript modules require an HTTP server.

### Verify calculations

Requires Node.js 18 or later:

```sh
node --test
```

The tests cover combined filters, inclusive year boundaries, known zero versus unknown totals, missing coordinates, date precision, and shared-location grouping.

### Structure

- `dist/index.html` and `dist/styles.css`: interface and responsive layout.
- `dist/app.js`: UI state and map interactions.
- `dist/model.js`: filtering, summaries, date labels, and grouping.
- `dist/demo.js`: explicitly fictional fixtures.
- `tests/model.test.js`: calculation and data semantics checks.

For the full GTD dataset, the delivery architecture and performance budget must still be selected and measured. This small prototype is not a full-dataset performance validation.

Read [AGENTS.md](AGENTS.md) before contributing. Do not commit GTD exports, derived event datasets, credentials, or local configuration files.
