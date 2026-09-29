# Elsewhere

What would your American road trip look like laid across Europe?

Elsewhere finds a driving route between your stops, then lets you pick up the whole route and drag or rotate it around the world. Same trip, same distance, different continent. Inspired by [The True Size](https://www.thetruesize.com/).

**This project was 100% vibe coded with Codex.** The human supplied the idea and follow-up prompts. The AI wrote the app, styling, route math, tests, and this README. That's the development process, on the record.

## The prompts

The original request, verbatim:

> i want to show my road trip in an interesting way. is there a tool like thetruesizeof.com where i can do a google maps style "give directions from x to y" and then take those roads and move/rotate them around the world?

After discussing existing tools, this was the prompt that kicked off the build:

> "here's what our American road trip would look like laid across Europe." is my use case, slop me up a solution

The map-style picker came from this follow-up:

> the map is a little busy, can you make the style choosable?

No elaborate specification. Just that conversation and some iteration.

## Run locally

```sh
npm install
npm run dev
```

Open the URL Vite prints, normally http://localhost:5173. Keep that terminal running while you use the app. If the site stops responding, start the dev server again.

No API keys or accounts to set up. It opens with a San Francisco → Denver → Chicago → New York example, so you can try moving a route immediately.

## Use it

1. Enter two to ten cities or addresses in travel order, then click **Map my trip**. Include a state or country for ambiguous names. Add intermediate stops to match the roads you actually took.
2. Pick Europe, Asia, or Australia, then drag the orange route wherever you want. Turn it with the rotation slider. **Back home** restores the original placement.
3. Choose **Light**, **Dark**, or **Street map** below the continent buttons. Both maps change together, and the app remembers your choice.

The small map shows the original trip. The big map shows its relocated shape. The orange line keeps its bends; it doesn't snap to roads in the new country.

## Save or share

**Save trip file** downloads the exact displayed route and its placement. **Open trip file** brings it back without looking up the route again. Map tiles still need an internet connection.

**Copy share link** puts your stops, placement, rotation, units, and map style in the URL. Opening a custom route link calculates the route again, so it can change if the routing provider changes. A localhost link only works on the computer running the app; host it at a reachable URL to share links with other people.

## How scale works

Moving a route rotates its coordinates as one piece on a spherical Earth. That preserves spherical distances between points, instead of stretching a flat line across a map. The Mercator projection still changes how the route looks at different latitudes, especially near the poles.

The display line is simplified with roughly 50 m tolerance to keep dragging responsive. Mileage and driving time come from the full driving route. Earth is modeled as a sphere, so treat this as a geographic comparison, not survey-grade measurement or navigation in the destination country.

## What's underneath

- Vanilla JavaScript and [Vite](https://vite.dev/) run the app.
- [Leaflet](https://leafletjs.com/) renders maps and paths.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) provides map tiles and data.
- [Esri](https://server.arcgisonline.com/ArcGIS/rest/services/Canvas) provides the Light and Dark Gray Canvas basemaps.
- [OSRM](https://project-osrm.org/) provides driving directions.
- [Nominatim](https://nominatim.org/) resolves entered places. Requests are serialized at least 1.1 seconds apart within each app instance and cached for the session; there is no autocomplete.

There is no application backend or analytics. New routes and map tiles require internet access. Building a route sends your entered places to Nominatim and the resulting coordinates to OSRM. Place search uses the first match; hover over a resolved input to see its full name.

The default endpoints use public services suitable for light personal use. Before a public launch, arrange appropriate tile, routing, and geocoding capacity. Nominatim's public limit is aggregate per application, so multiuser hosting needs a rate-limited proxy or a different provider. Configure compatible search and routing URLs via `VITE_GEOCODER_URL` and `VITE_ROUTER_URL`. Follow the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) and [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Validate and build

```sh
npm test
npm run build
npx playwright test
```

The geometry checks cover distance preservation, rotation, and date-line crossings. Browser tests cover dragging, route lookup and failures, sharing, saved files, and the mobile layout. They mock external services, so passing them doesn't guarantee those services are online.

Browser tests use Google Chrome at `/usr/bin/google-chrome` by default; set `CHROME_PATH` to another Chromium executable. The production build lands in `dist/` and can be served by any static host.

## Run on Lagoon

The repository includes [Lagoon configuration](https://docs.lagoon.sh/lagoonizing/) for one `nginx` service. The Dockerfile builds the frontend with Node 22, then copies `dist/` into Lagoon's NGINX image. The running container serves static files on port 8080 using the image's standard configuration. No Node server, database, or persistent storage is needed.

To try the production container locally:

```sh
docker compose up --build -d
```

Open http://localhost:8080. Set `ELSEWHERE_PORT` if that port is in use. Stop the container with `docker compose down`.

Run the browser checks against the production container instead of the Vite dev server:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npx playwright test
```

In Lagoon, connect a project to `git@github.com:rocketeerbkw/elsewhere.git`, set its production branch to `main`, and deploy that branch once these files are pushed. `.lagoon.yml` points to `docker-compose.yml`, which labels the service as `lagoon.type: nginx`. Lagoon supplies the autogenerated route and TLS termination; no custom domain is configured here.

For custom search and routing providers, set `VITE_GEOCODER_URL` and `VITE_ROUTER_URL` as Lagoon variables with **build** scope before deploying. Locally, export the variables before running `docker compose build`. These URLs are embedded in browser JavaScript, so they must be public endpoints and must not contain secrets. Changing them requires a rebuild; runtime environment variables won't change the bundle.
