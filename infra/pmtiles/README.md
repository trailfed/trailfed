# PMTiles

TrailFed's frontend can render vector tiles from a self-hosted [PMTiles](https://protomaps.com/) file. Phase 0 uses MapLibre's public demo tiles (low-res, rate-limited) so that `docker compose up` works out of the box — we swap in a real PMTiles file in Phase 3.

## Regional extract (recommended for self-hosters)

```bash
# Example: a Europe-sized extract runs about 5–15 GB.
wget -O europe.pmtiles https://build.protomaps.com/20250401.pmtiles
mv europe.pmtiles /home/vanlife/trailfed/infra/pmtiles/region.pmtiles
```

Then point `web/` at the local file by setting `PUBLIC_TILES_URL=/tiles/region.pmtiles` in `.env` and exposing the file through Caddy:

```
handle /tiles/* {
    root * /srv/pmtiles
    file_server
    header Access-Control-Allow-Origin *
}
```

## Full planet

Full planet PMTiles at zoom 0–15 is ~120 GB. Only run this if you have the disk.

## License

PMTiles content derived from OpenStreetMap is © OSM contributors under the [Open Database License](https://www.openstreetmap.org/copyright). Attribution is mandatory; the frontend includes it in the map footer.
