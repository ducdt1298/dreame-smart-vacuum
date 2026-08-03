/*
 * Headless tests for the pure logic inside dreame-smart-vacuum-card.js: the
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
    "dreame_smart_vacuum",
    "frontend",
    "dreame-smart-vacuum-card.js"
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
  SRC +
    "\nreturn { Calibration, RoomGeometry, DreameSmartVacuumCard, SUCTION, WATER, HUMID, MODE," +
    " DOCK_ROWS, DOCK_TABS, DOCK_GROUPS, ICON };"
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
  const c = Object.create(M.DreameSmartVacuumCard.prototype);
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
  const c = Object.create(M.DreameSmartVacuumCard.prototype);
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

/* Degenerate calibration must not create zones. */
z = zoneCard(50, degenerate);
z._commitZone({ x: 0, y: 0 }, { x: 500, y: 500 });
ok("no zones without a usable calibration", z._zones.length === 0);

ok(
  "committing returns the new index",
  (() => {
    const q = zoneCard(50, c);
    return (
      q._commitZone(toImg(1000, 2000), toImg(1400, 2400)) === 0 &&
      q._commitZone(toImg(2000, 3000), toImg(2400, 3400)) === 1
    );
  })()
);
ok(
  "a rejected commit returns null",
  zoneCard(50, c)._commitZone(toImg(0, 0), toImg(90, 90)) === null
);

/* ---------------------------------------------------------------- *
 * 6b. Zone editing: hit test, select, move, resize, delete
 *
 * Tapping a zone used to delete it, which meant a stray tap on the map silently
 * destroyed work and there was no way to adjust a zone at all. Tap now selects;
 * deletion is explicit.
 * ---------------------------------------------------------------- */
console.log("\n[Zone editing]");

/* _moveZone and the chrome helpers consult the rendered image, so the fixture
   needs the same _el.img shape the card reads. */
/* `rendered` is the on-screen width; leaving it below `natural` is what exposes a
   scale bug. The stub must use _imageRect's real key names ({left, top, width,
   height}) - an earlier version invented {x, y, w, h} and hid exactly that bug. */
function editCard(grid, calib, natural, rendered) {
  const q = zoneCard(grid, calib);
  const nat = natural || { w: 1000, h: 1000 };
  const rw = rendered || nat.w;
  q._el = {
    img: { naturalWidth: nat.w, naturalHeight: nat.h },
  };
  q._imageRect = () => ({
    left: 0,
    top: 0,
    width: rw,
    height: (nat.h * rw) / nat.w,
  });
  q._zoneSel = null;
  return q;
}

let e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
ok("zone found under an inside point", e._zoneAt(toImg(1200, 2200)) === 0);
ok("no zone under an outside point", e._zoneAt(toImg(5000, 5000)) === null);

/* Overlapping zones: the later one paints on top, so it must also win the tap. */
e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1600, 2600));
e._commitZone(toImg(1200, 2200), toImg(1800, 2800));
ok("the topmost zone wins an overlap", e._zoneAt(toImg(1300, 2300)) === 1);

/* --- move --- */
e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._moveZone(0, 300, -200);
ok(
  "move shifts the whole zone",
  JSON.stringify(e._zones[0]) === JSON.stringify([1300, 1800, 1700, 2200]),
  JSON.stringify(e._zones[0])
);
const movedSize = e._zones[0][2] - e._zones[0][0];
ok("move preserves the size", movedSize === 400, String(movedSize));

/* The map is 1000x1000 image px; with this calibration that is 0..10000 vacuum in
   x and -5000..5000 in y, so a big push must stop at the edge, not sail past. */
e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
const before = e._zones[0][2] - e._zones[0][0];
e._moveZone(0, 999999, 0);
const b = e._mapBounds();
ok("map bounds are derived", !!b, JSON.stringify(b));
ok("move clamps at the map edge", e._zones[0][2] <= Math.round(b.maxX) + 1, JSON.stringify(e._zones[0]));
ok("clamping does not shrink the zone", e._zones[0][2] - e._zones[0][0] === before);

/* --- resize --- */
e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._resizeZone(0, "se", { x: 2000, y: 3000 });
ok(
  "dragging se grows the far corner only",
  JSON.stringify(e._zones[0]) === JSON.stringify([1000, 2000, 2000, 3000]),
  JSON.stringify(e._zones[0])
);

e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._resizeZone(0, "nw", { x: 800, y: 1800 });
ok(
  "dragging nw grows the near corner only",
  JSON.stringify(e._zones[0]) === JSON.stringify([800, 1800, 1400, 2400]),
  JSON.stringify(e._zones[0])
);

/* Collapsing a corner past its opposite must clamp to the robot's minimum, not
   invert the rectangle or produce something the robot rejects. */
e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._resizeZone(0, "nw", { x: 9999, y: 9999 });
const [rx0, ry0, rx1, ry1] = e._zones[0];
ok("resize never inverts the rect", rx0 < rx1 && ry0 < ry1, JSON.stringify(e._zones[0]));
ok(
  "resize clamps to the backend minimum",
  rx1 - rx0 >= 110 && ry1 - ry0 >= 110,
  `${rx1 - rx0} x ${ry1 - ry0}`
);

/* --- delete and selection bookkeeping --- */
e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._commitZone(toImg(2000, 3000), toImg(2400, 3400));
e._commitZone(toImg(3000, 4000), toImg(3400, 4400));
e._zoneSel = 2;
e._removeZone(2);
ok("deleting the selected zone clears the selection", e._zoneSel === null);
ok("deleting removes exactly one", e._zones.length === 2);

e._zoneSel = 1;
e._removeZone(0);
ok(
  "deleting below the selection shifts the index down",
  e._zoneSel === 0,
  String(e._zoneSel)
);

e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._commitZone(toImg(2000, 3000), toImg(2400, 3400));
e._zoneSel = 0;
e._removeZone(1);
ok("deleting above the selection leaves it alone", e._zoneSel === 0);

e._removeZone(99);
ok("deleting an out-of-range index is a no-op", e._zones.length === 1);

e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._zoneSel = 0;
e._clearZones();
ok("clear all empties the list", e._zones.length === 0);
ok("clear all drops the selection", e._zoneSel === null);

/* --- chrome geometry --- */
e = editCard(50, c);
e._commitZone(toImg(1000, 2000), toImg(1400, 2400));
e._zoneSel = 0;
const chrome = e._zoneChrome(0);
ok("chrome is produced for the selection", !!chrome);
ok(
  "grips sit on the corners",
  chrome &&
    chrome.corners.nw.x === chrome.rect.x &&
    chrome.corners.se.x === chrome.rect.x + chrome.rect.w
);
ok(
  "the delete badge sits above the top-right corner",
  chrome && chrome.badge.x === chrome.corners.ne.x && chrome.badge.y < chrome.corners.ne.y
);

/* The overlay clips to the image, so a zone against an edge must not have its only
   delete affordance cut in half. This calibration puts image y=0 at vacuum
   y=5000 and image x=1000 at vacuum x=9000, and the fixture image is 1000x1000. */
let edge = editCard(50, c);
edge._commitZone(toImg(1000, 4600), toImg(1600, 4990)); // hard against the top
edge._zoneSel = 0;
const topChrome = edge._zoneChrome(0);
ok(
  "the top-edge zone really is at the top",
  topChrome && topChrome.rect.y < 15,
  JSON.stringify(topChrome && topChrome.rect)
);
ok(
  "a top-edge badge is tucked inside the zone",
  topChrome && topChrome.badge.y - topChrome.badge.r >= 0,
  JSON.stringify(topChrome && topChrome.badge)
);
ok(
  "a top-edge badge stays hit-testable",
  edge._zoneChromeAt({ x: topChrome.badge.x, y: topChrome.badge.y }) === "delete"
);

edge = editCard(50, c);
edge._commitZone(toImg(8600, 1000), toImg(8990, 1600)); // hard against the right
edge._zoneSel = 0;
const rightChrome = edge._zoneChrome(0);
ok(
  "the right-edge zone really is at the right",
  rightChrome && rightChrome.rect.x + rightChrome.rect.w > 985,
  JSON.stringify(rightChrome && rightChrome.rect)
);
ok(
  "a right-edge badge is pulled inside the image",
  rightChrome && rightChrome.badge.x + rightChrome.badge.r <= 1000,
  JSON.stringify(rightChrome && rightChrome.badge)
);
ok(
  "the grab radius is more forgiving than the drawn one",
  chrome && chrome.grab > chrome.handle
);

/* Grips are sized for a finger, which is a client-space quantity drawn in image
   space: on a map painted at half size they must come out twice as big, or they
   end up unhittable on a big map in a small card. */
ok("scale is 1 when the map is painted at natural size", e._imgScale() === 1);
const halved = editCard(50, c, { w: 1000, h: 1000 }, 500);
halved._commitZone(toImg(1000, 2000), toImg(1400, 2400));
halved._zoneSel = 0;
ok("scale reflects the painted size", halved._imgScale() === 2, String(halved._imgScale()));
const halvedChrome = halved._zoneChrome(0);
ok(
  "a half-size map gets double-size grips",
  halvedChrome && halvedChrome.grab === chrome.grab * 2,
  `${halvedChrome && halvedChrome.grab} vs ${chrome.grab}`
);
ok("no chrome without a selection", e._zoneChrome(7) === null);

/* Hit priority: a corner grip overlaps the zone body, and must win. */
ok(
  "a corner grip beats the zone body",
  e._zoneChromeAt({ x: chrome.corners.nw.x, y: chrome.corners.nw.y }) === "nw"
);
ok(
  "the badge is hit above the corner",
  e._zoneChromeAt({ x: chrome.badge.x, y: chrome.badge.y }) === "delete"
);
ok(
  "the zone middle is not chrome",
  e._zoneChromeAt({
    x: chrome.rect.x + chrome.rect.w / 2,
    y: chrome.rect.y + chrome.rect.h / 2,
  }) === null
);
e._zoneSel = null;
ok("nothing is chrome without a selection", e._zoneChromeAt({ x: 0, y: 0 }) === null);

/* ---------------------------------------------------------------- *
 * 7. Wet control abstraction (select vs wetness number)
 * ---------------------------------------------------------------- */
console.log("\n[Wet control]");

const wetCard = Object.create(M.DreameSmartVacuumCard.prototype);
const selWet = { id: "select.x", key: "mop_pad_humidity", map: M.HUMID, kind: "select" };
const numWet = { id: "number.x", key: "wetness_level", map: null, kind: "number" };

ok("select wet maps to its ordinal", wetCard._wetValue(selWet, "moist") === 2);
ok("select wet rejects an unknown key", wetCard._wetValue(selWet, "nope") === null);
ok("number wet parses its value", wetCard._wetValue(numWet, "16") === 16);
ok("number wet rejects junk", wetCard._wetValue(numWet, "abc") === null);
ok("null value stays null", wetCard._wetValue(selWet, null) === null);
ok("no wet entity stays null", wetCard._wetValue(null, "moist") === null);

/* ---------------------------------------------------------------- *
 * 8. Dock sheet spec
 *
 * The sheet is data-driven, so a typo in DOCK_ROWS silently drops a row rather
 * than throwing. These assertions are the only thing standing between a wrong
 * key and a control that never appears on anyone's dashboard.
 * ---------------------------------------------------------------- */
console.log("\n[Dock spec]");

const KINDS = ["action", "toggle", "select", "number", "stat", "bar", "wear"];
const DOMS = ["button", "switch", "select", "number", "sensor"];

ok("dock rows exist", M.DOCK_ROWS.length > 0);
ok(
  "every row sits in a known tab",
  M.DOCK_ROWS.every((r) => M.DOCK_TABS.includes(r.tab)),
  M.DOCK_ROWS.filter((r) => !M.DOCK_TABS.includes(r.tab)).map((r) => r.k).join(",")
);
ok(
  "every row has a known kind",
  M.DOCK_ROWS.every((r) => KINDS.includes(r.kind)),
  M.DOCK_ROWS.filter((r) => !KINDS.includes(r.kind)).map((r) => r.k).join(",")
);
ok(
  "every row has a known domain",
  M.DOCK_ROWS.every((r) => DOMS.includes(r.dom)),
  M.DOCK_ROWS.filter((r) => !DOMS.includes(r.dom)).map((r) => r.k).join(",")
);
/* Upstream registers one key with the enum name still half-uppercased, so it is
   allowed by name here rather than by loosening the pattern for everything. */
const KEY_OK = (k) =>
  /^[a-z][a-z0-9_]*$/.test(k) || k === "DIRTY_WATER_CHANNEL_DIRTY_left";
ok(
  "translation keys look like keys, not enum names",
  M.DOCK_ROWS.every((r) => KEY_OK(r.k)),
  M.DOCK_ROWS.filter((r) => !KEY_OK(r.k)).map((r) => r.k).join(",")
);

/* Entities resolve into a map keyed "<dom>.<k>", so a duplicate pair would make
   one row quietly shadow the other. */
const seen = new Set();
const dupes = [];
for (const r of M.DOCK_ROWS) {
  const id = r.dom + "." + r.k;
  if (seen.has(id)) dupes.push(id);
  seen.add(id);
}
ok("no duplicate domain+key pairs", dupes.length === 0, dupes.join(","));

/* `self_clean` legitimately exists on two domains - that is the pair the keying
   scheme was designed for, so assert it survives rather than being deduped. */
ok(
  "same key on two domains is kept apart",
  seen.has("button.self_clean") && seen.has("switch.self_clean")
);

ok(
  "action rows carry a label key",
  M.DOCK_ROWS.filter((r) => r.kind === "action").every((r) => !!r.label)
);
ok(
  "wear rows carry a reset button",
  M.DOCK_ROWS.filter((r) => r.kind === "wear").every((r) => !!r.reset)
);
ok(
  "every reset target is a button row target",
  M.DOCK_ROWS.filter((r) => r.reset).every((r) => /^reset_[a-z_]+$/.test(r.reset))
);
ok(
  "every referenced icon exists",
  M.DOCK_ROWS.every((r) => !r.icon || r.icon in M.ICON),
  M.DOCK_ROWS.filter((r) => r.icon && !(r.icon in M.ICON)).map((r) => r.icon).join(",")
);
ok(
  "every group icon exists",
  M.DOCK_GROUPS.every(([, icon]) => icon in M.ICON)
);
/* A group with no rows renders nothing, so an unknown grp is a dead entry. */
const groupNames = M.DOCK_GROUPS.map(([g]) => g);
ok(
  "control rows only use declared groups",
  M.DOCK_ROWS.filter((r) => r.tab === "controls").every((r) =>
    groupNames.includes(r.grp)
  ),
  M.DOCK_ROWS.filter((r) => r.tab === "controls" && !groupNames.includes(r.grp))
    .map((r) => r.k)
    .join(",")
);
ok(
  "each tab has at least one row",
  M.DOCK_TABS.every((t) => M.DOCK_ROWS.some((r) => r.tab === t))
);

/* All icon paths must be parseable svg path data - a hand-drawn typo here shows
   up as an invisible or garbled glyph, which is easy to miss by eye. */
ok(
  "icon paths only use supported commands",
  Object.values(M.ICON).every((d) => /^[MmLlHhVvAaCcSsQqTtZz0-9,.\-\s]+$/.test(d)),
  Object.keys(M.ICON).filter(
    (k) => !/^[MmLlHhVvAaCcSsQqTtZz0-9,.\-\s]+$/.test(M.ICON[k])
  ).join(",")
);
ok(
  "icon paths start with a move and are non-trivial",
  Object.values(M.ICON).every((d) => /^M/.test(d) && d.length > 12)
);

/* ---------------------------------------------------------------- *
 * 8b. Dock entity resolution
 *
 * Reset buttons are named by a row's `reset` field rather than being rows, so
 * they are easy to forget in the resolver - which is exactly what happened, and
 * every supply row silently lost its Reset button.
 * ---------------------------------------------------------------- */
console.log("\n[Dock resolution]");

function resolverCard(entities) {
  const card = Object.create(M.DreameSmartVacuumCard.prototype);
  card._config = { entity: "vacuum.robot" };
  const registry = {
    "vacuum.robot": {
      entity_id: "vacuum.robot",
      device_id: "d1",
      platform: "dreame_smart_vacuum",
      translation_key: "vacuum",
    },
  };
  const states = { "vacuum.robot": { state: "docked", attributes: {} } };
  for (const [eid, key] of entities) {
    registry[eid] = {
      entity_id: eid,
      device_id: "d1",
      platform: "dreame_smart_vacuum",
      translation_key: key,
    };
    states[eid] = { state: "unknown", attributes: {} };
  }
  card._hass = { states, entities: registry, language: "en" };
  return card;
}

const rc = resolverCard([
  ["sensor.robot_detergent_left", "detergent_left"],
  ["button.robot_reset_detergent", "reset_detergent"],
  ["switch.robot_self_clean", "self_clean"],
  ["button.robot_self_clean", "self_clean"],
]);
const resolved = rc._resolveEntities();

ok(
  "a supply sensor resolves",
  resolved.dock["sensor.detergent_left"] === "sensor.robot_detergent_left"
);
ok(
  "its reset button resolves too",
  resolved.dock["button.reset_detergent"] === "button.robot_reset_detergent",
  JSON.stringify(resolved.dock)
);
ok(
  "the same key on two domains resolves to both",
  resolved.dock["switch.self_clean"] === "switch.robot_self_clean" &&
    resolved.dock["button.self_clean"] === "button.robot_self_clean"
);
ok(
  "absent hardware resolves to nothing",
  resolved.dock["sensor.hot_water_status"] === undefined
);

/* Every reset a row names must be resolvable in principle - i.e. it must be a
   button key, since that is the domain the resolver looks it up under. */
const rc2 = resolverCard(
  M.DOCK_ROWS.filter((r) => r.reset).map((r) => [
    "button.robot_" + r.reset,
    r.reset,
  ])
);
const resolved2 = rc2._resolveEntities();
ok(
  "every declared reset button resolves",
  M.DOCK_ROWS.filter((r) => r.reset).every(
    (r) => resolved2.dock["button." + r.reset]
  ),
  M.DOCK_ROWS.filter((r) => r.reset && !resolved2.dock["button." + r.reset])
    .map((r) => r.reset)
    .join(",")
);

/* ---------------------------------------------------------------- *
 * 9. Return-to-dock button state
 * ---------------------------------------------------------------- */
console.log("\n[Return button]");

const rb = Object.create(M.DreameSmartVacuumCard.prototype);
ok("docked disables the button", rb._isDocked({ state: "docked" }, {}) === true);
ok("cleaning enables it", rb._isDocked({ state: "cleaning" }, {}) === false);
ok("returning enables it", rb._isDocked({ state: "returning" }, {}) === false);
ok("paused mid-room enables it", rb._isDocked({ state: "paused" }, {}) === false);
ok(
  "washing on the dock disables it",
  rb._isDocked({ state: "cleaning" }, { washing: true }) === true
);
ok(
  "drying on the dock disables it",
  rb._isDocked({ state: "cleaning" }, { drying: true }) === true
);
ok("a missing vacuum disables it", rb._isDocked(null, null) === true);

/* ---------------------------------------------------------------- *
 * 10. Dock row labels
 * ---------------------------------------------------------------- */
console.log("\n[Dock labels]");

const dl = Object.create(M.DreameSmartVacuumCard.prototype);
dl._config = { entity: "vacuum.bot" };
dl._hass = { states: { "vacuum.bot": { attributes: { friendly_name: "Bot" } } } };
dl._t = (k) => "T:" + k;

ok(
  "explicit label wins",
  dl._dockLabel({ k: "drying_left", label: "st_drying_left" }, {}) ===
    "T:st_drying_left"
);
ok(
  "device name prefix is stripped",
  dl._dockLabel(
    { k: "dust_bag_status" },
    { attributes: { friendly_name: "Bot Dust bag status" } }
  ) === "Dust bag status"
);
ok(
  "an unprefixed name is left alone",
  dl._dockLabel(
    { k: "dust_bag_status" },
    { attributes: { friendly_name: "Dust bag status" } }
  ) === "Dust bag status"
);
ok(
  "a name equal to the device name is not blanked",
  dl._dockLabel({ k: "water_tank" }, { attributes: { friendly_name: "Bot" } }) ===
    "Bot"
);
ok(
  "no friendly_name falls back to the key",
  dl._dockLabel({ k: "clean_water_tank_status" }, { attributes: {} }) ===
    "clean water tank status"
);

/* ---------------------------------------------------------------- *
 * 13. Room chips survive a mode round trip
 *
 * Rooms -> All -> Rooms used to come back with an empty room list: leaving Rooms
 * dropped the chip map but kept its signature, so the rebuild was skipped and the
 * null map then threw, which also killed _renderActions and _renderHint for that
 * frame. Drive the real render, not a reimplementation of it.
 * ---------------------------------------------------------------- */
console.log("\n[Room chips across modes]");

function chipCard() {
  const card = Object.create(M.DreameSmartVacuumCard.prototype);
  const classes = new Set();
  const children = [];
  card._el = {
    roomList: {
      innerHTML: "",
      appendChild(n) {
        children.push(n);
      },
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      },
    },
  };
  card._classes = classes;
  card._children = children;
  card._mode = "rooms";
  card._selection = [];
  card._roomColors = null;
  card._t = (k) => k;
  card._rooms = () => ({ 1: { name: "Bếp" }, 2: { name: "Ngủ" }, 3: { name: "Khách" } });
  return card;
}

const cc = chipCard();
cc._renderRoomList();
const firstCount = cc._roomChips ? cc._roomChips.size : 0;
ok("chips build on first entry to Rooms", firstCount === 3, "got " + firstCount);
ok("list is visible in Rooms", !cc._classes.has("gone"));

cc._mode = "all";
cc._renderRoomList();
ok("chips torn down when leaving Rooms", cc._roomChips === null);
ok("signature cleared with them", cc._roomChipSig == null, String(cc._roomChipSig));
ok("list hidden outside Rooms", cc._classes.has("gone"));

cc._mode = "rooms";
let threw = null;
try {
  cc._renderRoomList();
} catch (err) {
  threw = err;
}
ok("coming back does not throw", threw === null, threw && threw.message);
ok(
  "chips are rebuilt on return",
  cc._roomChips && cc._roomChips.size === 3,
  "got " + (cc._roomChips ? cc._roomChips.size : "null")
);
ok("list visible again", !cc._classes.has("gone"));

/* A selection made before the round trip must still read correctly afterwards. */
const cc2 = chipCard();
cc2._selection = [2, 1];
cc2._renderRoomList();
cc2._mode = "all";
cc2._renderRoomList();
cc2._mode = "rooms";
cc2._selection = [2, 1];
cc2._renderRoomList();
ok("chips rebuilt with a live selection", cc2._roomChips.size === 3);

/* Same trip through Zones, and with the room set changing while away - the
   signature path and the map path must both hold. */
const cc3 = chipCard();
cc3._renderRoomList();
cc3._mode = "zones";
cc3._renderRoomList();
cc3._mode = "rooms";
cc3._rooms = () => ({ 4: { name: "Tắm" }, 5: { name: "Ban công" } });
cc3._renderRoomList();
ok(
  "a changed room set rebuilds to the new ids",
  cc3._roomChips.size === 2 && cc3._roomChips.has(4) && cc3._roomChips.has(5),
  "got " + (cc3._roomChips ? [...cc3._roomChips.keys()].join(",") : "null")
);

/* No map yet: hide, and stay safe on the way back. */
const cc4 = chipCard();
cc4._rooms = () => null;
cc4._renderRoomList();
ok("no rooms hides the list", cc4._classes.has("gone") && cc4._roomChips === null);
cc4._rooms = () => ({ 1: { name: "Bếp" } });
let threw4 = null;
try {
  cc4._renderRoomList();
} catch (err) {
  threw4 = err;
}
ok("rooms appearing later builds chips", threw4 === null && cc4._roomChips.size === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
