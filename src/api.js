const cache = new Map();
let lastSearch = 0;
const searchBase = import.meta.env.VITE_GEOCODER_URL || 'https://nominatim.openstreetmap.org/search';
const routeBase = import.meta.env.VITE_ROUTER_URL || 'https://router.project-osrm.org/route/v1/driving/';
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(response.status === 429 ? 'The map service is busy. Please wait a moment and try again.' : 'The map service could not respond. Please try again.');
  return response.json();
}
export async function geocode(query) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  // Explicit submissions only; public Nominatim does not allow autocomplete.
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - lastSearch))));
  lastSearch = Date.now();
  const url = new URL(searchBase);
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' });
  const results = await json(url);
  if (!results.length) throw new Error(`Couldn't find “${query}”. Add a state or country and try again.`);
  const result = { name: results[0].display_name, coordinate: [Number(results[0].lat), Number(results[0].lon)] };
  cache.set(key, result);
  return result;
}
export async function drivingRoute(stops) {
  const coordinates = stops.map(s => `${s.coordinate[1]},${s.coordinate[0]}`).join(';');
  const data = await json(`${routeBase}${coordinates}?overview=full&geometries=geojson&steps=false`);
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route connects these stops. Check that they can be reached by road.');
  const route = data.routes[0];
  return { points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), distance: route.distance, duration: route.duration, stops };
}
