# Elsewhere

Enter a road trip, then move and rotate its route over Europe or anywhere else on Earth.

## Run locally

```sh
npm install
npm run dev
```

Open the URL Vite prints, normally http://localhost:5173. The included San Francisco → Denver → Chicago → New York example loads without a routing request.

## Use it

- Enter two to ten cities or addresses in travel order. Include the state or country to disambiguate names. Add stops to steer the route through the roads you traveled.
- Select **Map my trip**. Search happens only on submission; the first matching place is used. Hover over a resolved input to see its full place name.
- Choose a destination continent, drag the orange line, and use the rotation slider. **Back home** restores its original position; the crosshair fits it in view.
- Choose **Map style** below the continent buttons: Light, Dark, or the detailed Street map. Both maps update together. Your preference is remembered in this browser and included in share links and saved trip files. The quieter canvas maps show only key geographic labels; choose Street map for close-up road detail.
- **Copy share link** includes stops, coordinates, position, and rotation in the URL fragment. A custom route is calculated again on opening, so provider updates may change it. Links work for other people after the app is hosted at a URL they can access.
- **Save trip file** saves the exact displayed geometry and placement. **Open trip file** restores it without geocoding or routing.

## How scale works

Each route vertex is represented as a unit vector on a spherical Earth. Relocation changes its local east/north/up basis, and rotation turns that basis around the destination. This is a rigid 3D rotation, preserving spherical distances between every pair of vertices, including bends. The Mercator map can change the apparent shape near the poles. Geometry within a few degrees of the poles is outside the useful range of this basemap.

Display geometry is simplified with roughly 50 m tolerance for responsive dragging. Mileage and driving time come from OSRM's full route, not the simplified display line. This is an illustrative comparison, not navigation guidance for the destination continent. Earth is modeled as a sphere, not an ellipsoid.

## Services

- [Leaflet](https://leafletjs.com/) renders maps and paths.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) provides map tiles and data.
- [Esri](https://server.arcgisonline.com/ArcGIS/rest/services/Canvas) provides the Light and Dark Gray Canvas basemaps.
- [OSRM](https://project-osrm.org/) provides driving directions.
- [Nominatim](https://nominatim.org/) resolves entered places. Requests are serialized at least 1.1 seconds apart within each app instance and cached for the session; there is no autocomplete.

Internet access is required for map tiles and new routes. There are no API keys, accounts, analytics, or application backend. Stops are sent to the place-search and routing services when building a route. The app reports errors without deleting the existing trip.

The default endpoints use public services suitable for light personal use. Before a public launch, arrange appropriate tile, routing, and geocoding capacity. Nominatim's public limit is aggregate per application, so multiuser hosting needs a rate-limited proxy or a different provider. Configure compatible search and routing URLs via `VITE_GEOCODER_URL` and `VITE_ROUTER_URL`. Follow the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) and [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Validate and build

```sh
npm test
npm run build
npx playwright test
```

Browser tests use Google Chrome at `/usr/bin/google-chrome` by default; set `CHROME_PATH` to another Chromium executable. They mock network services for deterministic interaction/error checks. The production build is in `dist/` and can be served by any static host.
