import L from 'leaflet';
import './style.css';
import { center, relocate, unwrap } from './geometry.js';
import { geocode, drivingRoute } from './api.js';
import demo from './demo.json';
import { setupBasemaps } from './basemaps.js';

const $ = selector => document.querySelector(selector);
const places = { europe: [49, 13], asia: [32, 107], australia: [-25, 134] };
let trip, origin, anchor = places.europe, rotation = 0, place = 'europe', metric = false, busy = false;
let overlay, halo, hitArea, pins = [], originalLayers = [], toastTimer;
const map = L.map('comparison-map', { zoomControl: false, minZoom: 2, maxZoom: 15 }).setView([48, 12], 4);
const originalMap = L.map('original-map', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false });
L.control.zoom({ position: 'topright' }).addTo(map);
L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);
const basemaps = setupBasemaps([map, originalMap], toast);
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
}
function status(message = '', error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function stopRow(value = '') {
  const row = document.createElement('div');
  row.className = 'stop-row';
  const letter = document.createElement('span');
  letter.className = 'stop-letter';
  const input = document.createElement('input');
  input.value = value; input.required = true; input.maxLength = 200; input.autocomplete = 'off';
  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'remove-stop'; remove.textContent = '×';
  remove.addEventListener('click', () => { row.remove(); updateStops(); });
  row.append(letter, input, remove);
  $('#stops').append(row);
  updateStops();
  return input;
}
function updateStops() {
  const rows = [...document.querySelectorAll('.stop-row')];
  rows.forEach((row, i) => {
    const name = i === 0 ? 'Starting point' : i === rows.length - 1 ? 'Destination' : `Stop ${i}`;
    row.querySelector('.stop-letter').textContent = String.fromCharCode(65 + i);
    row.querySelector('input').setAttribute('aria-label', name);
    row.querySelector('input').placeholder = name;
    row.querySelector('button').setAttribute('aria-label', `Remove ${name.toLowerCase()}`);
    row.querySelector('button').hidden = rows.length <= 2;
  });
  $('#add-stop').disabled = busy || rows.length >= 10;
}
function fillStops(stops) {
  $('#stops').replaceChildren();
  stops.forEach(stop => stopRow(stop.query || stop.name));
}
function stats() {
  $('#distance').textContent = Math.round(trip.distance / (metric ? 1000 : 1609.344)).toLocaleString();
  $('#distance-unit').textContent = metric ? 'kilometers of road' : 'miles of road';
  $('#duration').textContent = `${Math.round(trip.duration / 3600)} hrs`;
  $('#units').textContent = metric ? 'km / mi' : 'mi / km';
}
function pointLabel(text) { const el = document.createElement('span'); el.textContent = text; return el; }
function simplify(points) {
  // About 50 m tolerance at mid latitudes. Keep real bends without dragging 40,000 vertices.
  const cos = Math.max(.15, Math.cos(center(points)[0] * Math.PI / 180));
  return L.LineUtil.simplify(unwrap(points, points[0][1]).map(([lat,lng]) => L.point(lng*cos,lat)), .00045).map(p => [p.y,p.x/cos]);
}
function loadTrip(next, fit = true, preserveGeometry = false) {
  trip = { ...next, points: preserveGeometry ? next.points : simplify(next.points) };
  origin = center(trip.points);
  if (place === 'home') anchor = origin;
  originalLayers.forEach(layer => layer.remove());
  const points = unwrap(trip.points, origin[1]);
  const path = L.polyline(points, { color: '#d45b32', weight: 3, opacity: .95 }).addTo(originalMap);
  originalLayers = [path];
  for (const p of [points[0], points.at(-1)]) originalLayers.push(L.circleMarker(p, { radius: 3, color: '#fffdf7', weight: 1.5, fillColor: '#d45b32', fillOpacity: 1 }).addTo(originalMap));
  originalMap.fitBounds(path.getBounds(), { padding: [16, 16], animate: false });
  [overlay, halo, hitArea, ...pins].filter(Boolean).forEach(layer => layer.remove());
  halo = L.polyline([], { color: '#fffdf1', weight: 8, opacity: .9, interactive: false }).addTo(map);
  overlay = L.polyline([], { color: '#dc592e', weight: 4, opacity: 1, interactive: false }).addTo(map);
  hitArea = L.polyline([], { color: '#dc592e', weight: 28, opacity: 0, className: 'route-path' }).addTo(map);
  pins = [0, trip.points.length-1].map((index, i) => {
    const stop = i === 0 ? trip.stops[0] : trip.stops.at(-1);
    return L.marker([0,0], { icon: L.divIcon({ className: 'endpoint', iconSize: [12,12], iconAnchor: [6,6] }), interactive: false })
      .bindTooltip(pointLabel(stop.query || stop.name), { permanent: true, direction: i ? 'bottom' : 'top', offset: [0, i ? 10 : -10], className: 'route-label' }).addTo(map);
  });
  render();
  hitArea.getElement().addEventListener('pointerdown', startDrag);
  stats();
  if (fit) fitRoute();
}
function render() {
  if (!trip) return;
  const points = unwrap(relocate(trip.points, origin, anchor, rotation), anchor[1]);
  halo.setLatLngs(points); overlay.setLatLngs(points); hitArea.setLatLngs(points);
  pins[0].setLatLng(points[0]); pins[1].setLatLng(points.at(-1));
  $('#rotation').value = rotation;
  $('#angle').textContent = `${Math.round(rotation)}°`;
}
function fitRoute() {
  const mobile = window.innerWidth <= 800;
  map.fitBounds(overlay.getBounds(), { paddingTopLeft: [45, mobile ? 245 : 280], paddingBottomRight: [45, mobile ? 205 : 235], maxZoom: 9, animate: false });
}
function caption() {
  document.querySelectorAll('[data-place]').forEach(button => button.classList.toggle('selected', button.dataset.place === place));
  const title = { europe: 'Your road trip.\nA European perspective.', asia: 'Your road trip.\nA whole new continent.', australia: 'Your road trip.\nDown under.', home: 'Your road trip.\nRight where it happened.', anywhere: 'Your road trip.\nSomewhere else entirely.' }[place];
  $('#map-title').replaceChildren(...title.split('\n').flatMap((line, i) => i ? [document.createElement('br'), document.createTextNode(line)] : [document.createTextNode(line)]));
}
function selectPlace(next) {
  place = next; anchor = next === 'home' ? origin : [...places[next]]; rotation = 0;
  render(); caption(); fitRoute();
}
function bearing(a, b) {
  const r = Math.PI / 180, d = (b[1]-a[1])*r;
  return Math.atan2(Math.sin(d)*Math.cos(b[0]*r), Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos(d))/r;
}
function startDrag(event) {
  if (event.button !== 0 || busy) return;
  event.preventDefault(); event.stopPropagation();
  map.dragging.disable();
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId); target.classList.add('dragging');
  const start = map.mouseEventToLatLng(event);
  const reference = relocate([origin, [origin[0] + .01, origin[1]]], origin, anchor, rotation);
  function move(e) {
    const current = map.mouseEventToLatLng(e);
    const moved = relocate(reference, [start.lat,start.lng], [current.lat,current.lng]);
    anchor = moved[0]; rotation = bearing(moved[0], moved[1]);
    place = 'anywhere'; render(); caption();
  }
  function end() {
    map.dragging.enable(); target.classList.remove('dragging');
    target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); target.removeEventListener('pointercancel', end); target.removeEventListener('lostpointercapture', end);
  }
  target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end); target.addEventListener('lostpointercapture', end);
}
function setBusy(value) {
  busy = value;
  $('#route-form').querySelectorAll('input,button').forEach(el => { el.disabled = value; });
  $('#demo').disabled = value;
  $('#import').disabled = value;
  $('#build').firstChild.textContent = value ? 'Finding your roads… ' : 'Map my trip ';
  updateStops();
}
async function buildRoute(queries, knownStops) {
  if (busy) return;
  setBusy(true);
  try {
    const stops = [];
    for (let i=0; i<queries.length; i++) {
      status(`Finding ${queries[i]}…`);
      const known = knownStops?.[i];
      const resolved = known || await geocode(queries[i]);
      stops.push({ ...resolved, query: queries[i] });
    }
    status('Following the roads…');
    const result = await drivingRoute(stops);
    loadTrip(result); caption();
    status('Ready. Pick up the orange route.');
    [...document.querySelectorAll('.stop-row input')].forEach((input,i) => { input.title = stops[i].name; });
  } catch (error) {
    status(error.name === 'TimeoutError' || error instanceof TypeError ? 'Could not reach the map service. Check your connection and try again. Your current trip is still here.' : error.message, true);
  } finally { setBusy(false); }
}
$('#route-form').addEventListener('submit', event => {
  event.preventDefault();
  const queries = [...document.querySelectorAll('.stop-row input')].map(input => input.value.trim());
  if (queries.some(q => !q)) return status('Enter a city or address for every stop.', true);
  buildRoute(queries);
});
$('#add-stop').addEventListener('click', () => { if ($('#stops').children.length < 10) stopRow().focus(); });
$('#demo').addEventListener('click', () => { fillStops(demo.stops); place = 'europe'; anchor = [...places.europe]; rotation = 0; loadTrip(demo); caption(); status('Example: San Francisco → Denver → Chicago → New York.'); });
document.querySelectorAll('[data-place]').forEach(button => button.addEventListener('click', () => selectPlace(button.dataset.place)));
$('#rotation').addEventListener('input', event => { rotation = Number(event.target.value); render(); });
$('#reset').addEventListener('click', () => selectPlace(place === 'anywhere' ? 'europe' : place));
$('#fit').addEventListener('click', fitRoute);
$('#units').addEventListener('click', () => { metric = !metric; stats(); });
$('#about-button').addEventListener('click', () => $('#about').showModal());
$('.close-dialog').addEventListener('click', () => $('#about').close());
$('#about').addEventListener('click', event => { if (event.target === $('#about')) { const rect = $('#about').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#about').close(); } });

const validPoint = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 1080;
function validPlacement(data) {
  if (!validPoint(data.anchor) || !Number.isFinite(data.rotation) || Math.abs(data.rotation)>180) throw new Error('This trip has an invalid map position.');
}
function validStops(stops) {
  if (!Array.isArray(stops) || stops.length < 2 || stops.length > 10 || stops.some(s => !s || typeof s.name !== 'string' || s.name.length > 500 || (s.query !== undefined && (typeof s.query !== 'string' || s.query.length > 200)) || !validPoint(s.coordinate))) throw new Error('This trip has invalid stops.');
}
function placement() { return { anchor, rotation, place, metric, mapStyle: basemaps.style }; }
function restorePlacement(data) {
  anchor = data.anchor; rotation = data.rotation;
  place = Object.hasOwn(places, data.place) || data.place === 'home' ? data.place : 'anywhere';
  metric = data.metric === true;
  if (typeof data.mapStyle === 'string') basemaps.setStyle(data.mapStyle);
}
$('#share').addEventListener('click', async () => {
  const data = { v: 1, ...placement(), stops: trip.stops, demo: trip.id === demo.id };
  const url = new URL(location.href);
  url.hash = new URLSearchParams({ trip: JSON.stringify(data) }).toString();
  try { await navigator.clipboard.writeText(url.href); toast('Link copied. Your stops and placement travel with it.'); }
  catch { window.prompt('Copy this trip link:', url.href); }
});
$('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ v:1, ...placement(), trip })], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'my-trip-elsewhere.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Trip saved with its exact route and placement.');
});
$('#import').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 8000000) throw new Error('This file is too large. Open an Elsewhere trip file under 8 MB.');
    const data = JSON.parse(await file.text());
    if (data.v !== 1 || !data.trip) throw new Error('Choose a trip JSON file saved by Elsewhere.');
    validPlacement(data); validStops(data.trip.stops);
    if (!Array.isArray(data.trip.points) || data.trip.points.length < 2 || data.trip.points.length > 100000 || !data.trip.points.every(validPoint) || !Number.isFinite(data.trip.distance) || data.trip.distance < 0 || !Number.isFinite(data.trip.duration) || data.trip.duration < 0) throw new Error('This file does not contain a valid route.');
    restorePlacement(data); fillStops(data.trip.stops); loadTrip(data.trip, true, true); caption(); status('Saved trip opened.');
  } catch (error) { status(error instanceof SyntaxError ? 'That file is not valid JSON. Choose a saved Elsewhere trip.' : error.message, true); }
  event.target.value = '';
});

fillStops(demo.stops); loadTrip(demo); caption(); status('An example to get you started. Make it your own.');
async function restoreLink() {
  const raw = new URLSearchParams(location.hash.slice(1)).get('trip');
  if (!raw) return;
  try {
    if (raw.length > 20000) throw new Error('This share link is too large.');
    const data = JSON.parse(raw);
    if (data.v !== 1) throw new Error('This share link version is not supported.');
    validPlacement(data); validStops(data.stops);
    restorePlacement(data); fillStops(data.stops);
    if (data.demo && JSON.stringify(data.stops) === JSON.stringify(demo.stops)) { loadTrip(demo); caption(); status('Shared example loaded.'); }
    else await buildRoute(data.stops.map(s => s.query || s.name), data.stops);
  } catch (error) { status(`Could not open this share link. ${error.message}`, true); }
}
restoreLink();
window.addEventListener('hashchange', restoreLink);
let lastWidth = $('.map-stage').clientWidth;
new ResizeObserver(() => {
  map.invalidateSize(); originalMap.invalidateSize();
  const width = $('.map-stage').clientWidth;
  if (width !== lastWidth) { lastWidth = width; fitRoute(); }
}).observe($('.map-stage'));
