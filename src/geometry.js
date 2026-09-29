// Work on unit vectors, so relocation is a rigid 3D rotation, not a Mercator translation.
const rad = Math.PI / 180;
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
export function vector([lat, lng]) {
  return [Math.cos(lat * rad) * Math.cos(lng * rad), Math.cos(lat * rad) * Math.sin(lng * rad), Math.sin(lat * rad)];
}
export function latLng(v) {
  return [Math.atan2(v[2], Math.hypot(v[0], v[1])) / rad, Math.atan2(v[1], v[0]) / rad];
}
function basis([lat, lng]) {
  return { up: vector([lat, lng]), east: [-Math.sin(lng * rad), Math.cos(lng * rad), 0], north: [-Math.sin(lat * rad) * Math.cos(lng * rad), -Math.sin(lat * rad) * Math.sin(lng * rad), Math.cos(lat * rad)] };
}
export function center(points) {
  return latLng(points.map(vector).reduce((sum, v) => sum.map((n, i) => n + v[i]), [0, 0, 0]));
}
export function relocate(points, origin, destination, degrees = 0) {
  const a = basis(origin), b = basis(destination), cos = Math.cos(degrees * rad), sin = Math.sin(degrees * rad);
  return points.map(p => {
    const v = vector(p), e = dot(v, a.east), n = dot(v, a.north), u = dot(v, a.up);
    const east = e * cos + n * sin, north = n * cos - e * sin;
    return latLng(b.up.map((x, i) => x * u + b.east[i] * east + b.north[i] * north));
  });
}
export function distance(a, b) {
  const [x, y] = [vector(a), vector(b)];
  const cross = [x[1]*y[2]-x[2]*y[1], x[2]*y[0]-x[0]*y[2], x[0]*y[1]-x[1]*y[0]];
  return 6371008.8 * Math.atan2(Math.hypot(...cross), dot(x, y));
}
// Keep adjacent vertices in the same world copy when crossing the date line.
export function unwrap(points, longitude = 0) {
  let previous = longitude;
  return points.map(([lat, lng]) => {
    const next = lng + 360 * Math.round((previous - lng) / 360);
    previous = next;
    return [lat, next];
  });
}
