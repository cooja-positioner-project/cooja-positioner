# Vendored Leaflet 1.9.4

`leaflet.css`, `leaflet.js`, and `images/` are vendored copies of Leaflet 1.9.4,
previously loaded from `unpkg.com` at runtime. Fetched from:

- https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
- https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
- https://unpkg.com/leaflet@1.9.4/dist/images/{marker-icon,marker-icon-2x,marker-shadow,layers,layers-2x}.png

Verified byte-identical to the previously-used CDN version before vendoring,
by matching the SRI hashes that were on the `<link>`/`<script>` tags:

- `leaflet.css` sha256: `p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=`
- `leaflet.js` sha256: `20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=`

Vendored (instead of CDN-loaded) so the app works offline and so the
long-term artifact archive doesn't depend on unpkg.com staying up. No source
changes were made — same license (BSD-2-Clause, see leaflet.js header) and
same behavior as the CDN version.

To upgrade: download the new version's `dist/leaflet.css`, `dist/leaflet.js`,
and `dist/images/*.png` from https://unpkg.com/leaflet@<version>/dist/ (or
https://leafletjs.com/download.html) into this folder, replacing these files.
