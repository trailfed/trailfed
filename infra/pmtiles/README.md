# PMTiles

TrailFed's frontend renders vector tiles from a self-hosted [PMTiles](https://protomaps.com/) file. If no file is present, the web page falls back to MapLibre's public demo tiles so `docker compose up` still works out of the box.

Drop a single `region.pmtiles` file into this directory and Caddy will serve it at `/tiles/region.pmtiles` with CORS and HTTP byte-range support (as required by the PMTiles protocol). The file itself is gitignored — every operator fetches their own.

## Quick start: Cyprus (~50–80 MB)

Cyprus is the reference region for the Phase 0 self-hosted PoC: small island, small file, relevant to the project's first users.

Option A — download a pre-built regional extract from the Protomaps builds server:

```bash
# Replace the date with a recent build from https://maps.protomaps.com/builds/
# and pick an extract for Cyprus (or any small region you prefer).
curl -L -o infra/pmtiles/region.pmtiles \
  "https://build.protomaps.com/YYYYMMDD.pmtiles"  # planet — large; prefer extract below
```

Option B — use the `pmtiles` CLI to extract Cyprus from the global Protomaps basemap without downloading the whole planet:

```bash
# Install: https://docs.protomaps.com/pmtiles/cli
# Cyprus bounding box: 32.2,34.5,34.7,35.8 (minLon,minLat,maxLon,maxLat)
pmtiles extract \
  "https://build.protomaps.com/20250401.pmtiles" \
  infra/pmtiles/region.pmtiles \
  --bbox=32.2,34.5,34.7,35.8 \
  --maxzoom=14
```

Either way, the final file must be named `region.pmtiles` and live in this directory. Restart Caddy (or the stack) to pick it up:

```bash
docker compose restart caddy
```

Verify the file is reachable and serves byte-range requests:

```bash
curl -sI -H 'Range: bytes=0-15' http://localhost:8090/tiles/region.pmtiles
# Expect: HTTP/1.1 206 Partial Content
```

## Other regions

Any small extract works. Replace the bounding box and filename to taste — the web frontend always loads `/tiles/region.pmtiles`, so the operator picks the region by naming.

## Full planet

Full planet PMTiles at zoom 0–15 is ~120 GB. Only if you have the disk.

## License

PMTiles content derived from OpenStreetMap is © OSM contributors under the [Open Database License](https://www.openstreetmap.org/copyright). Attribution is mandatory; the frontend includes it in the map footer.
