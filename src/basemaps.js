import L from 'leaflet';

const osmAttribution = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const canvasAttribution = `Tiles © <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, ${osmAttribution}, GIS user community`;
const styles = {
  light: { tiles: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attribution: canvasAttribution, maxNativeZoom: 13 },
  dark: { tiles: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attribution: canvasAttribution, maxNativeZoom: 13 },
  streets: { tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: osmAttribution, maxNativeZoom: 19 },
};

export function setupBasemaps(maps, notify) {
  const select = document.querySelector('#map-style');
  let current;
  let layers = [];

  function setStyle(name) {
    if (!Object.hasOwn(styles, name) || name === current) return;
    const style = styles[name];
    current = name;
    layers.forEach(layer => layer.remove());
    let failures = 0;
    layers = maps.map(map => L.tileLayer(style.tiles, {
      attribution: style.attribution,
      maxNativeZoom: style.maxNativeZoom,
      maxZoom: 19,
    }).on('tileerror', () => {
      if (++failures === 4) notify('This map style could not load. Try another style or check your connection.');
    }).addTo(map));
    select.value = name;
    document.querySelector('.map-stage').dataset.mapStyle = name;
    document.querySelector('#original-map').dataset.mapStyle = name;
    try { localStorage.setItem('elsewhere-map-style', name); } catch { /* Storage is optional. */ }
  }

  let preferred = 'light';
  try { preferred = localStorage.getItem('elsewhere-map-style') || preferred; } catch { /* Use the default. */ }
  setStyle(Object.hasOwn(styles, preferred) ? preferred : 'light');
  select.addEventListener('change', () => setStyle(select.value));
  return { setStyle, get style() { return current; } };
}
