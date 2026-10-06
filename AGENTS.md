# Project instructions: GTD event map

## Project identity

- Repository name: `gtd-explorer`.
- Display name: **GTD Explorer**.
- Verify the GitHub owner and remote URL when connecting the repository; the selected name alone does not establish a remote.

## Goal and scope

Build an interactive map of events from the Global Terrorism Database (GTD), showing fatalities and injuries with filters by year and country.

“All events” means all records in the selected GTD release, not every terrorist attack worldwide. Display the source, release, and actual coverage period. Do not claim coverage through the current year without supporting data.

The current stage is a local GTD explorer using the official workbooks supplied by the user. The public GitHub repository is `https://github.com/lebedevanand/gtd-explorer`; publish code and documentation there, never the GTD files or local database. Public website deployment has not been requested.

## Language, communication, and workflow

- Use English for all project materials: these instructions, documentation, interface text, labels, messages, code identifiers, comments, tests, commit messages, and pull request descriptions. Preserve source data and original names as provided; do not translate or rewrite source records merely to enforce this rule.
- Conversation with the user may be in Russian or English. Follow the language of the user's message unless they request otherwise. Explain results, material decisions, and limitations in plain language.
- Read these instructions and existing documentation before making changes. Preserve the user's work.
- Complete authorized work independently. Ask for clarification only when a decision materially changes the goal, metric definitions, or publication rights.
- A connected GitHub account does not identify the intended repository. Verify the repository and its remote before operating on it.
- Keep code, instructions, and permitted test fixtures in Git. Do not commit secrets, local dataset exports, or large data files.
- Review changes before committing. Do not publish the site or change repository access without a corresponding user request.

## Source and usage rights

The primary source is START / University of Maryland. Verify a received dataset against documentation for its release rather than relying on an arbitrary online copy.

Official references checked on October 6, 2026:

- [GTD: data access and terms of use](https://www.start.umd.edu/gtd-download).
- [GTD: FAQ](https://www.start.umd.edu/gtd-faqs).
- [GTD Codebook, August 2021](https://www.start.umd.edu/sites/default/files/2024-10/Codebook.pdf). Check its applicability when using another release.

The GTD EULA permits non-commercial research and analysis and expressly excludes non-commercial analysis and visualization from its restriction on public display. Raw dataset redistribution remains restricted. A public site must respect these distinctions; do not treat permission for visualization as permission to distribute the database. Commercial use requires an additional agreement.

Until the terms are checked, work locally with a lawfully obtained dataset or clearly labeled synthetic examples. Do not bypass registration or access restrictions.

When setting up import, exclude raw and derived data, local settings, and secrets from Git. Also inspect files included in the site build: an unlisted URL does not make data private.

## Metric definitions

Rules from the GTD codebook:

- `nkill` records fatalities, including attackers; `nwound` records injuries, also including attackers.
- `nkillter` records attacker fatalities. Subtract it only when both values are known and compatible; do not label the result civilian fatalities.
- Do not turn unknown months or days into exact dates.
- Coordinates may represent a settlement centroid. Respect `specificity`; do not promise an exact attack location.
- The main database has a gap for 1993. Do not present it as a year with zero events.

Project defaults, which the user may change:

- The main map metric is “Fatalities reported by GTD.” Show injuries separately in event details and summaries.
- Avoid the ambiguous term “victims” for the sum of fatalities and injuries. If a combined metric is needed, label its components explicitly and document the calculation.
- Explain in the interface that the main metric includes attackers.
- Store unknown values as `null` and display “No data.” Zero means a known zero value.
- Convert missing-value codes according to the field and release documentation; do not apply a blanket replacement to all negative values.
- Label totals “Sum of known values” and show the number of records with unknown values. If all values are unknown, display “No data.”
- Do not infer missing values from titles, descriptions, or unsupported assumptions.

## Data preparation and quality

- Preserve the original file unchanged. Imports and transformations must be reproducible.
- Record the release, filename, acquisition date, checksum, coverage period, record count, and transformation version in a local dataset manifest.
- During import, validate required fields: `eventid`, `iyear`, `imonth`, `iday`, `country`, `country_txt`, `city`, `latitude`, `longitude`, `nkill`, and `nwound`. Add other fields as needed by the interface.
- Preserve `eventid` as a string identifier. Detect and investigate duplicate identifiers rather than silently dropping records. Matching dates and coordinates are not sufficient grounds for deduplication.
- Separate source reading, normalization, filtering, statistical calculations, and rendering.
- Validate coordinate ranges, numeric formats, required fields, and identifier uniqueness. Do not replace missing coordinates with `(0, 0)`; that pair is not a universal missing-value code.
- Account for invalid records in a quality report. Required schema errors must stop import with a clear message.
- Keep events without usable coordinates in the filtered dataset and summary, and show how many events cannot be mapped.
- Preserve source country codes and names. Do not automatically merge historical countries into modern ones. Keep display-name mappings separate and document their rules.
- Do not silently exclude records based on fatalities, attack success, or classification uncertainty. If these filters are added later, make their state visible.

## Map and filters: first version

- Provide a world map with panning, zooming, and event selection.
- Allow selection of a single year or an inclusive year range. Derive limits from the imported release and explicitly mark coverage gaps.
- Support searching and selecting one or more countries. Start with all countries and the full available period.
- Apply years and countries together: the year is in range AND the country is selected. Use OR between selected countries.
- A reset button restores the initial state. Keep active filters visible.
- Event details show the available date precision, country, settlement, fatalities, injuries, GTD identifier, and coordinate precision explanation.
- The summary shows filtered event count, sums of known values, metric missingness, and events without coordinates. Panning the map does not change this summary unless a separate mode is explicitly enabled.
- Use clustering or an appropriate aggregation layer at low zoom levels. Label cluster event counts and fatality totals separately.
- Marker size may encode fatalities; explain the scale in the legend. Keep zero and unknown values visible and distinguishable.
- Make events sharing coordinates individually accessible. Do not shift points in a way that misrepresents their locations.
- Provide loading, import error, missing dataset, and empty filter-result states. “No events found” does not mean “No attacks occurred.”

## Design and accessibility

- The entire interface must be in English. Use a restrained visual presentation and neutral wording, without effects that turn events into a game.
- Display the source and coverage near the map, and make methodology and data-quality explanations accessible from the interface.
- Attribute event classification to GTD. Do not present the map as a travel-safety assessment or risk forecast.
- Do not infer comparative country danger solely from absolute counts.
- Filters and event details must support keyboard interaction. Do not convey meaning only through color; provide readable text, contrast, and mobile usability.
- Provide an accessible alternative to the map, such as a paginated event list.
- Preserve map-provider attribution and check map-layer usage terms.

## Technical decisions

The current architecture is a buildless HTML/CSS/JavaScript frontend with Leaflet 1.9.4 and a loopback-only Python standard-library server backed by a local SQLite database. The server provides paginated event results, full-selection summaries, and bounded map clusters; it never serves source workbooks or database files. Reassess architecture and usage terms before public hosting. Do not add accounts or paid services without a concrete need.

- Check current official documentation, licenses, and limitations before selecting libraries.
- Do not create a separate page element for every record in a large dataset. Use efficient rendering and measure behavior on the full dataset.
- Do not send the entire source file to the browser by default. Choose data delivery after checking rights and performance.
- Do not store private keys in client code. Configure restrictions for public map-service keys according to provider documentation.
- Synthetic examples must be an explicit demonstration mode and must not be mixed with GTD records.
- During implementation, document installation, local startup, obtaining the permitted dataset, and data updates in the README.

## Validation

Validate calculation semantics and user scenarios, not just build success:

- Known zero, unknown, and nonzero values produce distinct results.
- Single-year, range, and multiple-country filters work at boundaries and in combination; reset restores the initial selection.
- The map, list, and summary use the same filtered dataset. Differences between point and event counts are explained by missing coordinates or clustering.
- Totals match an independent calculation on a small synthetic dataset with predefined expected results.
- The 1993 coverage gap, incomplete dates, shared coordinates, duplicate identifiers, and schema errors are explicitly handled.
- Loading time and filter responsiveness are measured on the full permitted dataset, with measurement conditions documented. Set a performance budget when selecting the architecture.
- Mobile layout, keyboard interaction, loading, error, and empty-result states have been checked.
- At the end of each stage, report what is complete, what was verified, and any actual remaining limitations.

## Next stages

1. Select the GitHub repository and decide whether the project is local or public.
2. Obtain a permitted GTD file and verify its release, coverage, and usage terms.
3. Document the schema and architecture; prepare import and the data-quality report.
4. Implement the map, event details, filters, and summary.
5. Validate calculations, accessibility, and performance, then prepare the agreed hosting approach.

## Supplied release coverage

- Main workbook: `globalterrorismdb_0522dist.xlsx`, covering 1970–2020.
- Supplement: `globalterrorismdb_2021Jan-June_1222dist.xlsx`, covering January–June 2021 only.
- 1993 is a coverage gap; 2021 is a partial year. Keep both visible in the interface.
- Import output and quality/provenance reports belong in ignored `local-data/`, outside the static `dist/` directory.
- Use synthetic fixtures for committed tests. Do not commit snapshots of actual event responses.
