# GTD Explorer

An interactive map for exploring events recorded in the **Global Terrorism Database (GTD)**, with filters by year and country and separate figures for fatalities and injuries.

## Status

The project is in the planning stage. Project instructions are defined in [AGENTS.md](AGENTS.md). The application, data import pipeline, and deployment have not been implemented, and no GTD dataset is included.

## Planned features

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

The technology stack has not yet been selected. Installation and startup instructions will be added when implementation begins.

Read [AGENTS.md](AGENTS.md) before contributing. Do not commit GTD exports, derived event datasets, credentials, or local configuration files.
