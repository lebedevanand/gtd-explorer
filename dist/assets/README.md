# Background geography

`world-50m.json` is the unmodified `countries-50m.json` from **world-atlas 2.0.2**, containing Natural Earth 4.1.0 country polygons at 1:50 million scale. It is background cartography, separate from the licensed GTD event dataset.

Source: https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
Package documentation: https://github.com/topojson/world-atlas
Natural Earth terms: https://www.naturalearthdata.com/about/terms-of-use/

Natural Earth geographic data is public domain. The world-atlas package is ISC licensed; see the adjacent license. Source country names and geometry are preserved. These generalized boundaries are orientation aids, not historical boundaries or a basis for assigning GTD countries.

The frontend decodes TopoJSON arcs into polygons and computes label anchors from each country's largest polygon. It displays the vector background below zoom 5, then uses OpenStreetMap street tiles for closer inspection. Country labels are thinned by available screen space. No GTD events are contained in this file.
