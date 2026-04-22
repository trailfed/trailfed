<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { onMount } from 'svelte';
  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer: HTMLDivElement;

  onMount(async () => {
    const maplibre = await import('maplibre-gl');
    const { Protocol } = await import('pmtiles');
    const protocol = new Protocol();
    maplibre.default.addProtocol('pmtiles', protocol.tile);

    // Using demo tiles from MapLibre — replace with self-hosted PMTiles later.
    // See infra/pmtiles/README.md for how to fetch a regional extract.
    new maplibre.default.Map({
      container: mapContainer,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 30],
      zoom: 2,
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
