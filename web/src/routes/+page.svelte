<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { onMount } from 'svelte';
  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer: HTMLDivElement;

  // Self-hosted PMTiles file, served by Caddy from infra/pmtiles/ (see
  // infra/pmtiles/README.md). If the file is missing we log a warning
  // and fall back to MapLibre's public demo tiles so the page still
  // renders for first-time contributors.
  const TILES_URL = '/tiles/region.pmtiles';

  async function hasLocalTiles(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-15' },
      });
      return res.ok; // 200 or 206
    } catch {
      return false;
    }
  }

  onMount(async () => {
    const maplibre = await import('maplibre-gl');
    const { Protocol } = await import('pmtiles');
    const protocol = new Protocol();
    maplibre.default.addProtocol('pmtiles', protocol.tile);

    const localTilesAvailable = await hasLocalTiles(TILES_URL);

    let style: unknown;
    let center: [number, number];
    let zoom: number;

    if (localTilesAvailable) {
      // Minimal raster-free vector style backed by the PMTiles file.
      // Production will ship a richer style; this PoC just proves the
      // map renders without any external tile request.
      style = {
        version: 8,
        sources: {
          protomaps: {
            type: 'vector',
            url: `pmtiles://${TILES_URL}`,
            attribution:
              '<a href="https://protomaps.com">Protomaps</a> · <a href="https://openstreetmap.org">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#f4f1ea' },
          },
          {
            id: 'earth',
            type: 'fill',
            source: 'protomaps',
            'source-layer': 'earth',
            paint: { 'fill-color': '#e8e4d7' },
          },
          {
            id: 'water',
            type: 'fill',
            source: 'protomaps',
            'source-layer': 'water',
            paint: { 'fill-color': '#a8c9e0' },
          },
          {
            id: 'roads',
            type: 'line',
            source: 'protomaps',
            'source-layer': 'roads',
            paint: { 'line-color': '#888', 'line-width': 0.6 },
          },
        ],
      };
      // Cyprus — reference region for the Phase 0 PoC.
      center = [33.2, 35.0];
      zoom = 8;
    } else {
      console.warn(
        `[trailfed] No local PMTiles file at ${TILES_URL} — falling back to MapLibre demo tiles. See infra/pmtiles/README.md to enable the self-hosted basemap.`,
      );
      style = 'https://demotiles.maplibre.org/style.json';
      center = [0, 30];
      zoom = 2;
    }

    new maplibre.default.Map({
      container: mapContainer,
      // Map constructor accepts a StyleSpecification object or a URL
      // string; we build one of each above depending on local tile
      // availability, so widen the type for the call site.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: style as any,
      center,
      zoom,
    });
  });
</script>

<main>
  <header>
    <h1>TrailFed</h1>
    <p>Federated geo-social protocol for travellers · <strong>Phase 0 scaffold</strong></p>
    <p>
      <a href="https://github.com/trailfed/trailfed">GitHub</a> ·
      <a href="/api/nodeinfo">NodeInfo</a>
    </p>
  </header>
  <div class="map" bind:this={mapContainer}></div>
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    height: 100%;
  }
  :global(body) {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  main {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #eee;
  }
  header h1 {
    margin: 0;
  }
  header p {
    margin: 0.25rem 0;
    color: #555;
  }
  .map {
    flex: 1;
    min-height: 400px;
  }
</style>
