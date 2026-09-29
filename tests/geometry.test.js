import { test } from 'node:test';
import assert from 'node:assert/strict';
import { center, distance, relocate, unwrap } from '../src/geometry.js';

const points = [[37.7749,-122.4194],[39.7392,-104.9903],[41.8781,-87.6298],[40.7128,-74.006]];
test('relocation preserves every pairwise distance across hemispheres and rotations', () => {
  for (const anchor of [[49,13],[-25,134],[85,170],[-89,-179],[0,0]]) {
    for (const angle of [-180,-91,0,42,180]) {
      const moved = relocate(points, center(points), anchor, angle);
      for (let i=0;i<points.length;i++) for (let j=i+1;j<points.length;j++) {
        assert.ok(Math.abs(distance(points[i],points[j])-distance(moved[i],moved[j])) < .00001);
      }
    }
  }
});
test('a route returns to its original coordinates when placed back home', () => {
  const moved = relocate(points, center(points), center(points), 0);
  points.forEach((p,i) => assert.ok(distance(p,moved[i]) < .000001));
});
test('the chosen origin moves exactly to its destination', () => {
  assert.ok(distance(relocate([[41,-98]],[41,-98],[48,10],79)[0],[48,10]) < .000001);
});
test('a full turn restores the route, including near the poles', () => {
  const moved = relocate(points, center(points), center(points), 360);
  points.forEach((p,i) => assert.ok(distance(p,moved[i]) < .000001));
});
test('date-line crossings stay continuous instead of crossing the whole map', () => {
  assert.deepEqual(unwrap([[10,178],[11,-179],[12,-175]],180),[[10,178],[11,181],[12,185]]);
});
