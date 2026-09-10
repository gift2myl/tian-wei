import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scenes, simulateEvent, views } from '../lib/home.ts';
const model = fs.readFileSync(
  new URL('../public/assets/qingyu.glb', import.meta.url),
);
assert.equal(model.toString('ascii', 0, 4), 'glTF');
assert.equal(model.readUInt32LE(4), 2);
assert.equal(model.readUInt32LE(8), model.length);
const len = model.readUInt32LE(12),
  g = JSON.parse(model.toString('utf8', 20, 20 + len));
const meta = JSON.parse(
  fs.readFileSync(
    new URL('../public/assets/model.json', import.meta.url),
    'utf8',
  ),
);
assert.equal(meta.units, 'meters');
assert.equal(g.nodes.length, 728);
assert.equal(g.meshes.length, 719);
const roles = Object.groupBy(
  g.nodes.filter((n) => n.extras?.role),
  (n) => n.extras.role,
);
for (const role of [
  'ceiling',
  'curtain_living',
  'curtain_bedroom',
  'screen',
  'cutwall',
  'valve',
])
  assert.ok(roles[role]?.length, role);
assert.equal(roles.curtain_living.length, 2);
assert.equal(roles.screen.length, 1);
for (const image of g.images) {
  assert.notEqual(image.bufferView, undefined);
  assert.ok(g.bufferViews[image.bufferView].byteLength > 0);
}
let checked = 0,
  maxError = 0;
for (const n of g.nodes) {
  const source = meta.objects.find((o) => o.name === n.name);
  if (!source) continue;
  const pos = n.translation || [0, 0, 0];
  let err = Math.hypot(...source.position.map((v, i) => v - pos[i]));
  assert.ok(err < 0.00001, `${n.name} translation changed ${err}`);
  maxError = Math.max(maxError, err);
  checked++;
}
assert.ok(checked >= 700);
assert.equal(new Set(scenes.map((s) => s.id)).size, 6);
for (const scene of scenes) {
  for (const key of [
    'living',
    'dining',
    'bedroom',
    'path',
    'curtain',
    'bedCurtain',
    'daylight',
    'screen',
    'vent',
  ])
    assert.ok(scene.values[key] >= 0 && scene.values[key] <= 100);
  assert.equal(typeof scene.values.valve, 'boolean');
}
const home = scenes.find((s) => s.id === 'home').values;
const cinema = scenes.find((s) => s.id === 'cinema').values;
assert.equal(cinema.screen, 100);
assert.equal(cinema.curtain, 0);
assert.equal(cinema.daylight, 0);
const leak = simulateEvent('leak', home);
assert.equal(leak.values.valve, false);
assert.equal(leak.values.alarm, true);
assert.equal(home.valve, true);
const clear = simulateEvent('clear', leak.values);
assert.equal(clear.values.valve, true);
assert.equal(clear.values.alarm, false);
const air = simulateEvent('air', home);
assert.equal(air.values.vent, 100);
assert.equal(air.values.co2, 1400);
assert.equal(simulateEvent('entry', leak.values).scene, 'home');
const night = simulateEvent('presence', home);
assert.equal(night.values.living, 0);
assert.equal(night.values.path, 65);
for (const view of views) {
  if (view.camera) assert.ok(meta.cameras[view.camera]);
  assert.ok(
    fs.existsSync(new URL('../public/assets/' + view.file, import.meta.url)),
  );
}
const report = {
  result: 'passed',
  nodes: g.nodes.length,
  meshes: g.meshes.length,
  embeddedTextures: g.images.length,
  sourceTranslationsChecked: checked,
  maxTranslationErrorMeters: maxError,
  dynamicRoles: Object.fromEntries(
    Object.entries(roles).map(([r, n]) => [r, n.length]),
  ),
  scenePresets: scenes.length,
  eventChecks: 5,
  views: views.length,
  limitations:
    'WebGL appearance is not pixel-identical to Cycles; native browser interaction was not automated.',
};
console.log(JSON.stringify(report, null, 2));
