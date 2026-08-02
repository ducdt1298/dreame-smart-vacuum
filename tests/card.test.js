/*
 * Headless tests for the pure logic inside dreame-vacuum-card.js: the
 * vacuum <-> image coordinate transform, the RLE room-mask decoder, room
 * hit testing and outline tracing.
 *
 * No dependencies and no build step - run it with:
 *     node tests/card.test.js
 *
 * The real card source is loaded and evaluated against a minimal DOM stub, so
 * these tests exercise shipped code rather than a copy of it.
 */

const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "custom_components",
    "dreame_vacuum",
    "frontend",
    "dreame-vacuum-card.js"
  ),
  "utf8"
);

const stubEl = () => ({
  appendChild() {},
  addEventListener() {},
  removeEventListener() {},
  setAttribute() {},
  getAttribute: () => null,
  toggleAttribute() {},
  querySelector: () => stubEl(),
  querySelectorAll: () => [],
  style: { setProperty() {} },
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  innerHTML: "",
  textContent: "",
  dataset: {},
});

const env = {
  HTMLElement: class {},
  customElements: { get: () => undefined, define: () => {} },
  window: { customCards: [], addEventListener() {}, removeEventListener() {} },
  document: { createElement: () => stubEl() },
  console: { info() {}, debug() {}, warn() {}, error() {} },
};

const factory = new Function(
  "HTMLElement",
  "customElements",
  "window",
  "document",
  "console",
  SRC + "\nreturn { Calibration, RoomGeometry, DreameVacuumCard, SUCTION, WATER, HUMID, MODE };"
);

const M = factory(
  env.HTMLElement,
  env.customElements,
  env.window,
  env.document,
  env.console
);

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("  PASS  " + name);
  } else {
    fail++;
    console.log("  FAIL  " + name + (extra ? "  -> " + extra : ""));
  }
}
function near(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

/* ---------------------------------------------------------------- *
 * 1. Calibration
 * ---------------------------------------------------------------- */
console.log("\n[Calibration]");

/* A realistic set: y is flipped and there is an offset, like the renderer emits. */
const cp = [
  { vacuum: { x: 0, y: 0 }, map: { x: 100, y: 500 } },
  { vacuum: { x: 1000, y: 0 }, map: { x: 200, y: 500 } },
  { vacuum: { x: 0, y: 1000 }, map: { x: 100, y: 400 } },
];
const c = new M.Calibration(cp);
ok("valid calibration is ok", c.ok);

const f0 = c.toImage(0, 0);
ok("origin maps to (100,500)", near(f0.x, 100) && near(f0.y, 500), JSON.stringify(f0));
const f1 = c.toImage(1000, 0);
ok("x axis maps to (200,500)", near(f1.x, 200) && near(f1.y, 500), JSON.stringify(f1));
const f2 = c.toImage(0, 1000);
ok("y axis maps to (100,400)", near(f2.x, 100) && near(f2.y, 400), JSON.stringify(f2));

/* Round trip a spread of points through forward then inverse. */
let worst = 0;
for (const [vx, vy] of [
  [0, 0],
  [2500, 1300],
  [-1800, 4200],
  [12345, -6789],
  [1, -1],
]) {
  const p = c.toImage(vx, vy);
  const back = c.toVacuum(p.x, p.y);
  worst = Math.max(worst, Math.abs(back.x - vx), Math.abs(back.y - vy));
}
ok("forward/inverse round trip exact", worst < 1e-6, "worst err " + worst);

/* The integration emits all-zero map points when there is no usable map. */
const degenerate = new M.Calibration([
  { vacuum: { x: 0, y: 0 }, map: { x: 0, y: 0 } },
  { vacuum: { x: 1000, y: 0 }, map: { x: 0, y: 0 } },
  { vacuum: { x: 0, y: 1000 }, map: { x: 0, y: 0 } },
]);
ok("degenerate calibration rejected", degenerate.ok === false);
ok("degenerate toVacuum returns null", degenerate.toVacuum(5, 5) === null);
ok("missing calibration rejected", new M.Calibration(null).ok === false);
ok("short calibration rejected", new M.Calibration([cp[0], cp[1]]).ok === false);

/* Rotated map: 90 degrees, so the vacuum x axis moves along image y. */
const rot = new M.Calibration([
  { vacuum: { x: 0, y: 0 }, map: { x: 300, y: 100 } },
  { vacuum: { x: 1000, y: 0 }, map: { x: 300, y: 200 } },
  { vacuum: { x: 0, y: 1000 }, map: { x: 400, y: 100 } },
]);
ok("rotated calibration ok", rot.ok);
const rp = rot.toVacuum(350, 150);
ok(
  "rotated inverse resolves",
  rp && near(rp.x, 500) && near(rp.y, 500),
  JSON.stringify(rp)
);

ok("sameAs detects identity", c.sameAs(new M.Calibration(cp)));
ok("sameAs detects difference", c.sameAs(rot) === false);

/* ---------------------------------------------------------------- *
 * 2. RoomGeometry - RLE decode + hit test
 * ---------------------------------------------------------------- */
console.log("\n[RoomGeometry: RLE]");

/* 10x10 grid, grid_size 50, origin at (1000, 2000).
   room 1 = columns 0..3 of rows 0..4
   room 2 = columns 5..9 of rows 0..4  (with a border-layer row to check 1xx)
   room 3 = an L shape in rows 6..9 */
function runsFor(cells) {
  /* cells: array of [x, y] -> emit one triple per cell (worst case RLE) */
  const out = [];
  for (const [x, y] of cells) out.push(x, y, 1);
  return out;
}

const room1 = [];
for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) room1.push([x, y]);
const room2 = [];
for (let y = 0; y < 5; y++) for (let x = 5; x < 10; x++) room2.push([x, y]);

/* L shape: rows 6-9 x 0-2, plus row 9 x 3-6 */
const room3 = [];
for (let y = 6; y <= 9; y++) for (let x = 0; x <= 2; x++) room3.push([x, y]);
for (let x = 3; x <= 6; x++) room3.push([x, 9]);

const geo = new M.RoomGeometry();
const built = geo.build({
  size: [1000, 2000, 1000, 2000, 10, 10, 50, 0, 0, 0],
  data: {
    1: runsFor(room1),
    102: runsFor([[4, 0], [4, 1]]), // border pixels of room 2 -> id 2
    2: runsFor(room2),
    3: runsFor(room3),
    512: runsFor([[0, 0]]), // carpet overlay must be ignored
    255: runsFor([[9, 9]]), // MapPixelType special must be ignored
    210: runsFor([[1, 1]]), // v3 wall class must be ignored
  },
});
ok("build() succeeded", built === true);
ok("dimensions captured", geo.width === 10 && geo.height === 10);
ok("origin captured", geo.left === 1000 && geo.top === 2000);
ok("grid captured", geo.grid === 50);

const cellId = (gx, gy) => geo.mask[gy * geo.width + gx];
ok("room 1 filled", cellId(0, 0) === 1 && cellId(3, 4) === 1);
ok("room 2 filled", cellId(5, 0) === 2 && cellId(9, 4) === 2);
ok("border layer 102 mapped to room 2", cellId(4, 0) === 2 && cellId(4, 1) === 2);
ok("carpet layer 512 ignored (cell stays room 1)", cellId(0, 0) === 1);
ok("special layer 255 ignored", cellId(9, 9) === 0);
ok("wall class 210 ignored (cell stays room 1)", cellId(1, 1) === 1);
ok("L shape present", cellId(0, 6) === 3 && cellId(6, 9) === 3);
ok("L shape notch empty", cellId(6, 6) === 0);

console.log("\n[RoomGeometry: hitTest]");
/* vacuum mm -> cell:  ix = (vx-left)/grid, iy = (vy-top)/grid */
const vm = (gx, gy) => [1000 + gx * 50 + 25, 2000 + gy * 50 + 25];
ok("hit centre of room 1", geo.hitTest(...vm(1, 1)) === 1);
ok("hit centre of room 2", geo.hitTest(...vm(7, 2)) === 2);
ok("hit L shape arm", geo.hitTest(...vm(5, 9)) === 3);
ok("empty notch spirals to a neighbour", [2, 3].includes(geo.hitTest(...vm(6, 6))));
ok(
  "far outside with tiny ring budget returns 0",
  geo.hitTest(999999, 999999, 2) === 0
);
/* Boundary: exactly on the left/top edge of the grid */
ok("left/top edge resolves", geo.hitTest(1000, 2000) === 1);
/* Negative coordinates must not read out of bounds */
ok("negative coords safe", geo.hitTest(-99999, -99999, 3) === 0);

console.log("\n[RoomGeometry: outlines]");
const o1 = geo.outlineFor(1);
ok("room 1 has one ring", Array.isArray(o1) && o1.length === 1, JSON.stringify(o1 && o1.length));
if (o1 && o1[0]) {
  const xs = o1[0].map((p) => p[0]);
  const ys = o1[0].map((p) => p[1]);
  /* room 1 spans cells x 0..3, y 0..4 -> mm 1000..1200, 2000..2250 */
  ok(
    "room 1 ring bounds correct",
    Math.min(...xs) === 1000 &&
      Math.max(...xs) === 1200 &&
      Math.min(...ys) === 2000 &&
      Math.max(...ys) === 2250,
    `x ${Math.min(...xs)}..${Math.max(...xs)} y ${Math.min(...ys)}..${Math.max(...ys)}`
  );
  ok(
    "rectangle simplified to few vertices",
    o1[0].length <= 6,
    "got " + o1[0].length + " vertices"
  );
}

const o3 = geo.outlineFor(3);
ok("L shape traced", Array.isArray(o3) && o3.length >= 1);
if (o3 && o3[0]) {
  ok(
    "L shape has a concave corner (more than 5 vertices)",
    o3[0].length >= 6,
    "got " + o3[0].length
  );
}
ok("outlines are cached", geo.outlineFor(1) === o1);

/* A room fully enclosing another produces two rings (outer + hole). */
const donut = new M.RoomGeometry();
const ring = [];
for (let y = 0; y < 5; y++)
  for (let x = 0; x < 5; x++) if (!(x === 2 && y === 2)) ring.push([x, y]);
donut.build({
  size: [0, 0, 0, 0, 5, 5, 10, 0, 0, 0],
  data: { 4: runsFor(ring), 5: runsFor([[2, 2]]) },
});
const od = donut.outlineFor(4);
ok("donut yields outer ring + hole", od.length === 2, "rings " + od.length);

/* Malformed payloads must not throw. */
const bad = new M.RoomGeometry();
ok("build() rejects missing size", bad.build({}) === false);
ok("build() rejects zero dims", bad.build({ size: [0, 0, 0, 0, 0, 0, 50] }) === false);
const odd = new M.RoomGeometry();
ok(
  "build() tolerates a truncated run triple",
  odd.build({ size: [0, 0, 0, 0, 4, 4, 50], data: { 1: [0, 0, 2, 1, 1] } }) === true
);
ok("truncated run still decoded the complete triple", odd.mask[0] === 1 && odd.mask[1] === 1);
const oob = new M.RoomGeometry();
oob.build({ size: [0, 0, 0, 0, 4, 4, 50], data: { 1: [2, 0, 99, 0, 99, 3] } });
ok("run clipped at row width", oob.mask[3] === 1 && oob.mask[4] === 0);
ok("hitTest on empty geometry returns 0", new M.RoomGeometry().hitTest(0, 0) === 0);
ok("outlineFor on empty geometry returns null", new M.RoomGeometry().outlineFor(1) === null);

/* ---------------------------------------------------------------- *
 * 3. End-to-end: tap coordinate -> room id
 * ---------------------------------------------------------------- */
console.log("\n[End to end: image px -> room]");
/* Build a calibration consistent with the 10x10 / grid 50 / origin (1000,2000)
   map, with the y flip the renderer applies: image y grows as vacuum y shrinks. */
const e2e = new M.Calibration([
  { vacuum: { x: 1000, y: 2000 }, map: { x: 0, y: 500 } },
  { vacuum: { x: 2000, y: 2000 }, map: { x: 100, y: 500 } },
  { vacuum: { x: 1000, y: 3000 }, map: { x: 0, y: 400 } },
]);
ok("e2e calibration ok", e2e.ok);
function roomAtImage(ix, iy) {
  const v = e2e.toVacuum(ix, iy);
  return geo.hitTest(v.x, v.y);
}
/* cell (1,1) centre = vacuum (1075, 2075) -> image (7.5, 492.5) */
const p11 = e2e.toImage(1075, 2075);
ok("room 1 reachable from image px", roomAtImage(p11.x, p11.y) === 1, JSON.stringify(p11));
const p72 = e2e.toImage(1000 + 7 * 50 + 25, 2000 + 2 * 50 + 25);
ok("room 2 reachable from image px", roomAtImage(p72.x, p72.y) === 2);
const p59 = e2e.toImage(1000 + 5 * 50 + 25, 2000 + 9 * 50 + 25);
ok("L arm reachable from image px", roomAtImage(p59.x, p59.y) === 3);

/* ---------------------------------------------------------------- *
 * 4. Enum maps match the backend
 * ---------------------------------------------------------------- */
console.log("\n[Enum maps]");
ok("SUCTION ordinals", M.SUCTION.quiet === 0 && M.SUCTION.turbo === 3);
ok("WATER ordinals start at 1", M.WATER.low === 1 && M.WATER.high === 3);
ok("HUMID shares WATER ordinals", M.HUMID.slightly_dry === 1 && M.HUMID.wet === 3);
ok(
  "MODE ordinals",
  M.MODE.sweeping === 0 &&
    M.MODE.mopping === 1 &&
    M.MODE.sweeping_and_mopping === 2 &&
    M.MODE.mopping_after_sweeping === 3
);

/* ---------------------------------------------------------------- *
 * 5. Cleaning sequence must be a COMPLETE ordering
 *
 * vacuum_set_cleaning_sequence is a whole-map write: the map editor gives
 * every segment missing from the list order 0 (v1) or shoves it to the tail
 * (v2), and persists that to the robot. Sending only the tapped rooms would
 * silently destroy the user's configured order for every other room.
 * ---------------------------------------------------------------- */
console.log("\n[Cleaning sequence]");

function cardWith(rooms, selection) {
  const c = Object.create(M.DreameVacuumCard.prototype);
  c._selection = selection.slice();
  c._rooms = () => rooms;
  return c;
}

const sixRooms = {
  1: { order: 1 }, 2: { order: 2 }, 3: { order: 3 },
  4: { order: 4 }, 5: { order: 5 }, 6: { order: 6 },
};

const seq = cardWith(sixRooms, [4, 2])._fullSequence();
ok("selection comes first, in tap order", seq[0] === 4 && seq[1] === 2, JSON.stringify(seq));
ok("every room is present", seq.length === 6, "len " + seq.length);
ok("no duplicates", new Set(seq).size === 6);
ok(
  "untapped rooms keep their relative order",
  JSON.stringify(seq.slice(2)) === JSON.stringify([1, 3, 5, 6]),
  JSON.stringify(seq)
);

/* Rooms with no stored order (0/absent) sort after those that have one. */
const mixed = { 1: { order: 0 }, 2: { order: 2 }, 3: {}, 4: { order: 1 } };
const seq2 = cardWith(mixed, [3])._fullSequence();
ok("tapped room first even without a stored order", seq2[0] === 3);
ok(
  "ordered rooms precede unordered ones",
  JSON.stringify(seq2) === JSON.stringify([3, 4, 2, 1]),
  JSON.stringify(seq2)
);

const seqAll = cardWith(sixRooms, [6, 5, 4, 3, 2, 1])._fullSequence();
ok(
  "selecting everything is a pure reorder",
  JSON.stringify(seqAll) === JSON.stringify([6, 5, 4, 3, 2, 1])
);

const seqNone = cardWith(sixRooms, [])._fullSequence();
ok(
  "empty selection preserves the existing order",
  JSON.stringify(seqNone) === JSON.stringify([1, 2, 3, 4, 5, 6])
);
ok("no rooms -> empty sequence", cardWith({}, [])._fullSequence().length === 0);

/* ---------------------------------------------------------------- *
 * 6. Zone minimum size
 *
 * device.py: size = grid_size * 2; w = side / size; rejects w <= 1.0.
 * So a side must be strictly MORE than 2 x grid_size.
 * ---------------------------------------------------------------- */
console.log("\n[Zone minimum size]");

function zoneCard(grid, calib) {
  const c = Object.create(M.DreameVacuumCard.prototype);
  c._calib = calib;
  c._geo = { grid };
  c._zones = [];
  return c;
}

const zc = zoneCard(50, c); // grid 50 -> backend needs side > 100
const toImg = (vx, vy) => c.toImage(vx, vy);

/* 90mm side: under the backend minimum, must be rejected. */
let z = zoneCard(50, c);
z._commitZone(toImg(0, 0), toImg(90, 90));
ok("side below 2x grid rejected", z._zones.length === 0, JSON.stringify(z._zones));

/* 110mm: over the backend minimum but under our 2.2x margin - still rejected,
   which is the safe direction (never send something the robot will bounce). */
z = zoneCard(50, c);
z._commitZone(toImg(0, 0), toImg(110, 110));
ok("side just over backend min is conservatively rejected", z._zones.length === 0);

/* 400mm: comfortably valid. */
z = zoneCard(50, c);
z._commitZone(toImg(1000, 2000), toImg(1400, 2400));
ok("large zone accepted", z._zones.length === 1, JSON.stringify(z._zones));
if (z._zones.length === 1) {
  const [x0, y0, x1, y1] = z._zones[0];
  ok("zone stored min-first", x0 < x1 && y0 < y1, JSON.stringify(z._zones[0]));
  ok(
    "zone side exceeds 2x grid",
    x1 - x0 > 100 && y1 - y0 > 100,
    `${x1 - x0} x ${y1 - y0}`
  );
}

/* Dragged bottom-right to top-left must normalise the same way. */
z = zoneCard(50, c);
z._commitZone(toImg(1400, 2400), toImg(1000, 2000));
ok("reversed drag normalised", z._zones.length === 1);
if (z._zones.length === 1) {
  const [x0, y0, x1, y1] = z._zones[0];
  ok("reversed drag min-first", x0 < x1 && y0 < y1, JSON.stringify(z._zones[0]));
}

/* Tapping inside a zone removes it. */
z = zoneCard(50, c);
z._commitZone(toImg(1000, 2000), toImg(1400, 2400));
z._removeZoneAt(toImg(1200, 2200));
ok("tap inside a zone removes it", z._zones.length === 0);

z = zoneCard(50, c);
z._commitZone(toImg(1000, 2000), toImg(1400, 2400));
z._removeZoneAt(toImg(5000, 5000));
ok("tap outside leaves the zone alone", z._zones.length === 1);

/* Degenerate calibration must not create zones. */
z = zoneCard(50, degenerate);
z._commitZone({ x: 0, y: 0 }, { x: 500, y: 500 });
ok("no zones without a usable calibration", z._zones.length === 0);

/* ---------------------------------------------------------------- *
 * 7. Wet control abstraction (select vs wetness number)
 * ---------------------------------------------------------------- */
console.log("\n[Wet control]");

const wetCard = Object.create(M.DreameVacuumCard.prototype);
const selWet = { id: "select.x", key: "mop_pad_humidity", map: M.HUMID, kind: "select" };
const numWet = { id: "number.x", key: "wetness_level", map: null, kind: "number" };

ok("select wet maps to its ordinal", wetCard._wetValue(selWet, "moist") === 2);
ok("select wet rejects an unknown key", wetCard._wetValue(selWet, "nope") === null);
ok("number wet parses its value", wetCard._wetValue(numWet, "16") === 16);
ok("number wet rejects junk", wetCard._wetValue(numWet, "abc") === null);
ok("null value stays null", wetCard._wetValue(selWet, null) === null);
ok("no wet entity stays null", wetCard._wetValue(null, "moist") === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
