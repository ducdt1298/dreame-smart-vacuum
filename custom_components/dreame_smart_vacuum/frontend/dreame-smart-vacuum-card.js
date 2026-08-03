/*!
 * Dreame Smart Vacuum Card
 * A "daily driver" Lovelace card for the dreame_smart_vacuum custom integration.
 *
 * Design goal: mirror the official Dreame mobile app for the one thing people do
 * every day - pick where to clean and press start. The header stays deliberately
 * quiet (battery + status only); everything else lives behind a sheet.
 *
 * Zero build step, zero dependencies. Plain custom element + shadow DOM.
 * lit is bundled/minified inside the HA frontend and is NOT reachable at runtime,
 * so we do our own build-once / patch-on-update rendering.
 */

const CARD_VERSION = "1.0.0";
const INTEGRATION = "dreame_smart_vacuum";

/* ------------------------------------------------------------------ *
 * 0. Icons (inline mdi path data - no icon-set dependency)
 * ------------------------------------------------------------------ */

const ICON = {
  play: "M8,5.14V19.14L19,12.14L8,5.14Z",
  pause: "M14,19H18V5H14M6,19H10V5H6V19Z",
  home: "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
  chevron:
    "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  autorenew:
    "M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z",
  broom:
    "M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z",
  water:
    "M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",
  fan: "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.75C16.78,13.75 15.72,13.31 14.79,13.13C14.59,13.61 14.28,14.03 13.88,14.36C15.87,18.06 15.08,22.04 11.5,22.04C7,22.04 6.91,18.47 9.25,17.29C10.25,16.79 10.69,15.73 10.87,14.8C10.39,14.6 9.97,14.29 9.65,13.89C5.95,15.89 1.97,15.1 1.97,11.5C1.97,7 5.54,6.91 6.72,9.26C7.22,10.26 8.28,10.7 9.21,10.88C9.41,10.4 9.72,9.98 10.12,9.66C8.12,5.96 8.91,2 12.5,2Z",
  autofix:
    "M7.5,5.6L5,7L6.4,4.5L5,2L7.5,3.4L10,2L8.6,4.5L10,7L7.5,5.6M19.5,15.4L22,14L20.6,16.5L22,19L19.5,17.6L17,19L18.4,16.5L17,14L19.5,15.4M22,2L20.6,4.5L22,7L19.5,5.6L17,7L18.4,4.5L17,2L19.5,3.4L22,2M13.34,12.78L15.78,10.34L13.66,8.22L11.22,10.66L13.34,12.78M14.37,7.29L16.71,9.63C17.1,10 17.1,10.65 16.71,11.04L5.04,22.71C4.65,23.1 4,23.1 3.63,22.71L1.29,20.37C0.9,20 0.9,19.35 1.29,18.96L12.96,7.29C13.35,6.9 14,6.9 14.37,7.29Z",
  close:
    "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
  layers:
    "M12,16L19.36,10.27L21,9L12,2L3,9L4.63,10.27M12,18.54L4.62,12.81L3,14.07L12,21.07L21,14.07L19.37,12.8L12,18.54Z",
  repeat:
    "M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z",
  /* Dock sheet. Hand-drawn rather than pulled from mdi so the geometry stays
     simple enough to eyeball at 17px. */
  station:
    "M5,3H19A2,2 0 0,1 21,5V15A2,2 0 0,1 19,17H14V19H17V21H7V19H10V17H5A2,2 0 0,1 3,15V5A2,2 0 0,1 5,3M5,5V15H19V5H5Z",
  dry: "M4,6H14V8H4V6M4,11H20V13H4V11M4,16H11V18H4V16Z",
  bag: "M8,3H16L17,7H7L8,3M6,9H18L16.8,20A1,1 0 0,1 15.8,21H8.2A1,1 0 0,1 7.2,20L6,9Z",
  bottle:
    "M10,2H14V4H15A2,2 0 0,1 17,6V20A2,2 0 0,1 15,22H9A2,2 0 0,1 7,20V6A2,2 0 0,1 9,4H10V2M9,10V20H15V10H9Z",
  chart:
    "M4,18H20V20H4V18M6,13H8V17H6V13M10,9H12V17H10V9M14,5H16V17H14V5M18,11H20V17H18V11Z",
  plus: "M11,5H13V11H19V13H13V19H11V13H5V11H11V5Z",
  minus: "M5,11H19V13H5V11Z",
};

/* ------------------------------------------------------------------ *
 * 0b. Dock sheet contents
 *
 * `k` is the entity's translation_key. entity.py sets
 * `_attr_translation_key = description.key`, and description.key falls back to
 * PROPERTY_TO_NAME[prop][0], so these strings are exactly what the registry
 * carries and what _resolveEntities matches on.
 *
 * Every row is optional: the integration gates each entity behind a device
 * capability, so a machine without a wash base simply resolves fewer of them and
 * the row - and an empty tab - disappears. Never assume a row exists.
 * ------------------------------------------------------------------ */

const DOCK_ROWS = [
  /* --- Controls: one-shot actions ---------------------------------- */
  { tab: "controls", grp: "wash", kind: "action", dom: "button", k: "self_clean", label: "act_wash_now", icon: "water" },
  { tab: "controls", grp: "wash", kind: "action", dom: "button", k: "base_station_cleaning", label: "act_clean_station", icon: "autorenew" },
  { tab: "controls", grp: "wash", kind: "action", dom: "button", k: "base_station_self_repair", label: "act_self_repair", icon: "autofix" },
  { tab: "controls", grp: "dry", kind: "action", dom: "button", k: "manual_drying", label: "act_dry_now", icon: "dry" },
  { tab: "controls", grp: "dry", kind: "action", dom: "button", k: "manual_dust_bag_drying", label: "act_dry_bag", icon: "bag" },
  { tab: "controls", grp: "empty", kind: "action", dom: "button", k: "start_auto_empty", label: "act_empty_now", icon: "bag" },
  { tab: "controls", grp: "water", kind: "action", dom: "button", k: "water_tank_draining", label: "act_drain", icon: "water" },
  { tab: "controls", grp: "water", kind: "action", dom: "button", k: "empty_water_tank", label: "act_empty_tank", icon: "water" },

  /* --- Controls: washing ------------------------------------------- */
  { tab: "controls", grp: "wash", kind: "toggle", dom: "switch", k: "self_clean" },
  { tab: "controls", grp: "wash", kind: "toggle", dom: "switch", k: "smart_mop_washing" },
  { tab: "controls", grp: "wash", kind: "toggle", dom: "switch", k: "hot_washing" },
  { tab: "controls", grp: "wash", kind: "toggle", dom: "switch", k: "ultra_clean_mode" },
  { tab: "controls", grp: "wash", kind: "toggle", dom: "switch", k: "water_electrolysis" },
  { tab: "controls", grp: "wash", kind: "toggle", dom: "switch", k: "self_clean_by_zone" },
  { tab: "controls", grp: "wash", kind: "select", dom: "select", k: "washing_mode" },
  /* Upstream translates both washing_mode and mop_wash_level as "Chế độ giặt giẻ
     lau", which puts two identically-titled pickers next to each other. Name this
     one for what it actually picks. */
  { tab: "controls", grp: "wash", kind: "select", dom: "select", k: "mop_wash_level", label: "wash_level" },
  { tab: "controls", grp: "wash", kind: "select", dom: "select", k: "mop_clean_frequency" },
  { tab: "controls", grp: "wash", kind: "select", dom: "select", k: "self_clean_frequency" },
  { tab: "controls", grp: "wash", kind: "select", dom: "select", k: "auto_rewashing" },
  { tab: "controls", grp: "wash", kind: "select", dom: "select", k: "scraper_frequency" },
  { tab: "controls", grp: "wash", kind: "number", dom: "number", k: "self_clean_area" },
  { tab: "controls", grp: "wash", kind: "number", dom: "number", k: "self_clean_time" },
  { tab: "controls", grp: "wash", kind: "number", dom: "number", k: "mop_cleaning_remainder" },

  /* --- Controls: drying -------------------------------------------- */
  { tab: "controls", grp: "dry", kind: "toggle", dom: "switch", k: "auto_drying" },
  { tab: "controls", grp: "dry", kind: "toggle", dom: "switch", k: "smart_drying" },
  { tab: "controls", grp: "dry", kind: "toggle", dom: "switch", k: "silent_drying" },
  { tab: "controls", grp: "dry", kind: "toggle", dom: "switch", k: "dust_bag_drying" },
  { tab: "controls", grp: "dry", kind: "select", dom: "select", k: "drying_time" },
  { tab: "controls", grp: "dry", kind: "number", dom: "number", k: "drying_time" },

  /* --- Controls: auto-empty ---------------------------------------- */
  { tab: "controls", grp: "empty", kind: "toggle", dom: "switch", k: "auto_dust_collecting" },
  { tab: "controls", grp: "empty", kind: "toggle", dom: "switch", k: "dnd_disable_auto_empty" },
  { tab: "controls", grp: "empty", kind: "select", dom: "select", k: "auto_empty_mode" },
  { tab: "controls", grp: "empty", kind: "select", dom: "select", k: "auto_empty_frequency" },
  { tab: "controls", grp: "empty", kind: "number", dom: "number", k: "auto_empty_area" },

  /* --- Controls: detergent ----------------------------------------- */
  { tab: "controls", grp: "detergent", kind: "toggle", dom: "switch", k: "auto_add_detergent" },
  { tab: "controls", grp: "detergent", kind: "toggle", dom: "switch", k: "mopping_with_detergent" },
  { tab: "controls", grp: "detergent", kind: "toggle", dom: "switch", k: "mop_washing_with_detergent" },

  /* --- Status ------------------------------------------------------- */
  { tab: "status", kind: "stat", dom: "sensor", k: "self_wash_base_status" },
  { tab: "status", kind: "bar", dom: "sensor", k: "drying_progress", label: "st_drying_progress" },
  { tab: "status", kind: "stat", dom: "sensor", k: "drying_left", label: "st_drying_left" },
  { tab: "status", kind: "stat", dom: "sensor", k: "auto_empty_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "dust_collection" },
  { tab: "status", kind: "stat", dom: "sensor", k: "dust_bag_drying_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "dust_bag_drying_left", label: "st_bag_drying_left" },
  { tab: "status", kind: "stat", dom: "sensor", k: "clean_water_tank_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "dirty_water_tank_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "dust_bag_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "detergent_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "hot_water_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "station_drainage_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "drainage_status" },
  { tab: "status", kind: "stat", dom: "sensor", k: "water_tank" },
  { tab: "status", kind: "stat", dom: "sensor", k: "mop_pad" },
  { tab: "status", kind: "stat", dom: "sensor", k: "low_water_warning" },

  /* --- Supplies: percentage left, each with its own reset ----------- */
  { tab: "supplies", kind: "wear", dom: "sensor", k: "detergent_left", reset: "reset_detergent" },
  { tab: "supplies", kind: "wear", dom: "sensor", k: "squeegee_left", reset: "reset_squeegee" },
  { tab: "supplies", kind: "wear", dom: "sensor", k: "onboard_dirty_water_tank_left", reset: "reset_onboard_dirty_water_tank" },
  /* Upstream's PROPERTY_TO_NAME spells this one with the enum still half in
     caps, and strings.json declares the lower-case form, so the entity ends up
     with no translation at all. Match the key the registry really carries, and
     supply our own label rather than inherit the untranslated one. */
  { tab: "supplies", kind: "wear", dom: "sensor", k: "DIRTY_WATER_CHANNEL_DIRTY_left", label: "st_channel_left", reset: "reset_dirty_water_channel" },
  { tab: "supplies", kind: "wear", dom: "sensor", k: "deodorizer_left", reset: "reset_deodorizer" },
  { tab: "supplies", kind: "wear", dom: "sensor", k: "scale_inhibitor_left", reset: "reset_scale_inhibitor" },
];

/* Beyond this many options a picker stops being scannable as pills and becomes a
   dropdown instead. */
const SELECT_MAX_SEGMENTS = 5;

const DOCK_TABS = ["controls", "supplies", "status"];
const DOCK_GROUPS = [
  ["wash", "water"],
  ["dry", "dry"],
  ["empty", "bag"],
  ["water", "water"],
  ["detergent", "bottle"],
];

/* ------------------------------------------------------------------ *
 * 1. Backend enum maps (verified against dreame/types.py)
 * ------------------------------------------------------------------ */

const SUCTION = { quiet: 0, standard: 1, strong: 2, turbo: 3, full_power: 4 };
const WATER = { low: 1, medium: 2, high: 3 };
const HUMID = { slightly_dry: 1, moist: 2, wet: 3 };
const MODE = {
  sweeping: 0,
  mopping: 1,
  sweeping_and_mopping: 2,
  mopping_after_sweeping: 3,
};
/* Fallback labels, used only when hass.localize() has nothing.
   The integration ships full vi/en translations, so this is a safety net. */
const FALLBACK = {
  en: {
    rooms: "Rooms",
    all: "All",
    zones: "Zones",
    start_cleaning: "Start cleaning",
    dock: "Return to dock",
    returning: "Stop returning",
    pause: "Pause",
    resume: "Resume",
    dock_station: "Dock",
    dock_tab_controls: "Controls",
    dock_tab_status: "Status",
    dock_tab_supplies: "Supplies",
    dock_grp_wash: "Mop washing",
    dock_grp_dry: "Drying",
    dock_grp_empty: "Auto-empty",
    dock_grp_water: "Water tank",
    dock_grp_detergent: "Detergent",
    dock_empty: "Your model does not report anything here",
    act_wash_now: "Wash mop now",
    act_dry_now: "Dry mop now",
    act_dry_bag: "Dry dust bag",
    act_empty_now: "Empty dust bin now",
    act_drain: "Drain water",
    act_empty_tank: "Empty water tank",
    act_clean_station: "Clean the dock",
    act_self_repair: "Self-repair",
    st_drying_progress: "Drying progress",
    st_drying_left: "Drying time left",
    st_bag_drying_left: "Dust bag drying left",
    st_channel_left: "Dirty water channel",
    wash_level: "Wash level",
    reset: "Reset",
    custom: "Custom",
    cleaning_settings: "Cleaning settings",
    close: "Close",
    cleangenius: "CleanGenius",
    repeats: "Repeats",
    select_rooms: "Select rooms on the map",
    draw_zone: "Drag on the map to draw a zone",
    zone_pick: "Tap a zone to move, resize or delete it",
    zone_edit: "Drag to move, drag a corner to resize, × to delete",
    zone_clear: "Clear all",
    no_map: "Map not available yet",
    no_rooms: "No saved rooms on this map",
    room_settings: "Room settings",
    save: "Save",
    suction_level: "Suction",
    mop_pad_humidity: "Mop humidity",
    water_volume: "Water level",
    cleaning_mode: "Cleaning mode",
  },
  vi: {
    rooms: "Phòng",
    all: "Tất cả",
    zones: "Khu vực",
    start_cleaning: "Bắt đầu làm sạch",
    dock: "Về sạc",
    returning: "Dừng về sạc",
    pause: "Tạm dừng",
    resume: "Tiếp tục",
    dock_station: "Đế sạc",
    dock_tab_controls: "Điều khiển",
    dock_tab_status: "Trạng thái",
    dock_tab_supplies: "Vật tư",
    dock_grp_wash: "Giặt giẻ lau",
    dock_grp_dry: "Sấy",
    dock_grp_empty: "Tự hút bụi",
    dock_grp_water: "Khay nước",
    dock_grp_detergent: "Dung dịch",
    dock_empty: "Máy của bạn không báo gì ở đây",
    act_wash_now: "Giặt giẻ ngay",
    act_dry_now: "Sấy giẻ ngay",
    act_dry_bag: "Sấy túi bụi",
    act_empty_now: "Hút bụi ngay",
    act_drain: "Xả nước",
    act_empty_tank: "Xả cạn khay nước",
    act_clean_station: "Vệ sinh đế sạc",
    act_self_repair: "Tự khắc phục",
    st_drying_progress: "Tiến trình sấy",
    st_drying_left: "Thời gian sấy còn lại",
    st_bag_drying_left: "Sấy túi bụi còn lại",
    st_channel_left: "Ống nước thải",
    wash_level: "Mức giặt",
    reset: "Đặt lại",
    custom: "Tùy chỉnh",
    cleaning_settings: "Cài đặt làm sạch",
    close: "Đóng",
    cleangenius: "CleanGenius",
    repeats: "Lặp lại",
    select_rooms: "Chọn phòng trên bản đồ",
    draw_zone: "Kéo trên bản đồ để vẽ khu vực",
    zone_pick: "Bấm vào một vùng để di chuyển, thay đổi hoặc xoá",
    zone_edit: "Kéo để di chuyển, kéo góc để thay đổi, × để xoá",
    zone_clear: "Xoá tất cả",
    no_map: "Bản đồ chưa sẵn sàng",
    no_rooms: "Bản đồ này chưa có phòng nào được lưu",
    room_settings: "Cài đặt phòng",
    save: "Lưu",
    suction_level: "Lực hút",
    mop_pad_humidity: "Độ ẩm giẻ lau",
    water_volume: "Lượng nước",
    cleaning_mode: "Chế độ làm sạch",
  },
};

/* Room palette - mirrors the Dreame app "light" scheme used by the renderer. */
const ROOM_COLORS = ["#8ecaf7", "#f6d269", "#a5dea0", "#9fb8f0"];

/* ------------------------------------------------------------------ *
 * 2. Small helpers
 * ------------------------------------------------------------------ */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function keyOf(map, value) {
  for (const k in map) if (map[k] === value) return k;
  return undefined;
}

function debounce(fn, ms) {
  let t;
  return function (...a) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, a), ms);
  };
}

function fireEvent(node, type, detail) {
  node.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true })
  );
}

/* ------------------------------------------------------------------ *
 * 3. Coordinate transform
 *
 * calibration_points is a LIST of exactly 3 {vacuum:{x,y}, map:{x,y}} pairs,
 * computed server-side AFTER padding/crop/rotation, so it is the only safe
 * way to go between vacuum millimetres and rendered-PNG pixels.
 * ------------------------------------------------------------------ */

class Calibration {
  constructor(points) {
    this.ok = false;
    if (!Array.isArray(points) || points.length < 3) return;

    const m0 = points[0].map,
      m1 = points[1].map,
      m2 = points[2].map;
    const v0 = points[0].vacuum,
      v1 = points[1].vacuum,
      v2 = points[2].vacuum;
    if (!m0 || !m1 || !m2 || !v0 || !v1 || !v2) return;

    /* The integration always emits (0,0) (1000,0) (0,1000) but derive the
       span anyway so a future layout change does not silently skew us. */
    const sx = (v1.x - v0.x) || 1000;
    const sy = (v2.y - v0.y) || 1000;

    this.ax = (m1.x - m0.x) / sx;
    this.ay = (m1.y - m0.y) / sx;
    this.bx = (m2.x - m0.x) / sy;
    this.by = (m2.y - m0.y) / sy;
    this.ox = m0.x - (v0.x * this.ax + v0.y * this.bx);
    this.oy = m0.y - (v0.x * this.ay + v0.y * this.by);

    this.det = this.ax * this.by - this.bx * this.ay;
    /* All-zero map points => "cloud connected but no map yet". */
    this.ok = Math.abs(this.det) > 1e-9;
  }

  /* vacuum mm -> image px */
  toImage(vx, vy) {
    return {
      x: this.ox + vx * this.ax + vy * this.bx,
      y: this.oy + vx * this.ay + vy * this.by,
    };
  }

  /* image px -> vacuum mm */
  toVacuum(ix, iy) {
    if (!this.ok) return null;
    const dx = ix - this.ox;
    const dy = iy - this.oy;
    return {
      x: (dx * this.by - dy * this.bx) / this.det,
      y: (dy * this.ax - dx * this.ay) / this.det,
    };
  }

  /* Approximate px-per-mm, used to size strokes and the minimum zone. */
  get scale() {
    return Math.sqrt(Math.abs(this.det)) || 0.02;
  }

  sameAs(other) {
    if (!other) return false;
    return (
      this.ax === other.ax &&
      this.ay === other.ay &&
      this.bx === other.bx &&
      this.by === other.by &&
      this.ox === other.ox &&
      this.oy === other.oy
    );
  }
}

/* ------------------------------------------------------------------ *
 * 4. Room geometry
 *
 * Entity attributes only give a bounding box + centre per room, which is not
 * good enough for L-shaped rooms. The renderer data endpoint exposes the real
 * per-pixel segment mask as RLE, so we rebuild the mask once per map and trace
 * exact outlines from it. Falls back to bounding boxes if the fetch fails.
 * ------------------------------------------------------------------ */

class RoomGeometry {
  constructor() {
    this.reset();
  }

  reset() {
    this.mask = null;
    this.width = 0;
    this.height = 0;
    this.left = 0;
    this.top = 0;
    this.grid = 50;
    this.outlines = new Map(); // room id -> array of vacuum-mm rings
    this.signature = null;
    this.pending = false;
  }

  get hasMask() {
    return !!this.mask;
  }

  /* --- RLE -> flat mask ------------------------------------------- */
  build(json) {
    const size = json && json.size;
    if (!Array.isArray(size) || size.length < 7) return false;

    const [left, top, , , width, height, grid] = size;
    if (!width || !height) return false;

    const mask = new Uint8Array(width * height);
    const data = json.data || {};

    for (const layerStr of Object.keys(data)) {
      const layer = Number(layerStr);
      const runs = data[layerStr];
      if (!Array.isArray(runs)) continue;

      /* 512 = carpet overlay, 200..232 = wall classes, 249..255 = specials. */
      if (layer === 512) continue;
      if (layer > 200 && layer < 232) continue;

      let id = layer;
      if (layer > 100 && layer < 200) id = layer - 100; // room border pixel
      if (id < 1 || id > 63) continue;

      for (let i = 0; i + 2 < runs.length; i += 3) {
        const xs = runs[i];
        const y = runs[i + 1];
        const n = runs[i + 2];
        if (y < 0 || y >= height) continue;
        const row = y * width;
        const end = Math.min(xs + n, width);
        for (let x = Math.max(0, xs); x < end; x++) mask[row + x] = id;
      }
    }

    this.mask = mask;
    this.width = width;
    this.height = height;
    this.left = left;
    this.top = top;
    this.grid = grid || 50;
    this.outlines = new Map();
    return true;
  }

  /* --- hit testing -------------------------------------------------- */

  /* Mirrors the server's _find_px_type(): if the exact cell is empty, spiral
     outward. This is why tapping a wall in the app still picks a room. */
  hitTest(vx, vy, maxRings = 50) {
    if (!this.mask) return 0;
    const cx = Math.floor((vx - this.left) / this.grid);
    const cy = Math.floor((vy - this.top) / this.grid);

    const at = (x, y) => {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
      return this.mask[y * this.width + x];
    };

    const direct = at(cx, cy);
    if (direct) return direct;

    for (let r = 1; r <= maxRings; r++) {
      for (let dx = -r; dx <= r; dx++) {
        const v1 = at(cx + dx, cy - r);
        if (v1) return v1;
        const v2 = at(cx + dx, cy + r);
        if (v2) return v2;
      }
      for (let dy = -r + 1; dy <= r - 1; dy++) {
        const v1 = at(cx - r, cy + dy);
        if (v1) return v1;
        const v2 = at(cx + r, cy + dy);
        if (v2) return v2;
      }
    }
    return 0;
  }

  /* --- outline tracing ---------------------------------------------- */

  /* Collect every cell edge that borders a different room, then stitch the
     edges into closed rings. Exact, and cheap enough to do once per map. */
  outlineFor(id) {
    if (this.outlines.has(id)) return this.outlines.get(id);
    if (!this.mask) return null;

    const W = this.width;
    const H = this.height;
    const m = this.mask;
    const edges = new Map(); // "x,y" -> [[x,y], ...]

    const push = (ax, ay, bx, by) => {
      const k = ax + "," + ay;
      const list = edges.get(k);
      if (list) list.push([bx, by]);
      else edges.set(k, [[bx, by]]);
    };

    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        if (m[row + x] !== id) continue;
        /* clockwise winding in grid space */
        if (y === 0 || m[row - W + x] !== id) push(x, y, x + 1, y);
        if (x === W - 1 || m[row + x + 1] !== id) push(x + 1, y, x + 1, y + 1);
        if (y === H - 1 || m[row + W + x] !== id) push(x + 1, y + 1, x, y + 1);
        if (x === 0 || m[row + x - 1] !== id) push(x, y + 1, x, y);
      }
    }

    const rings = [];
    while (edges.size) {
      const startKey = edges.keys().next().value;
      const start = startKey.split(",").map(Number);
      const ring = [start];
      let cur = start;
      let guard = 0;

      while (guard++ < 400000) {
        const k = cur[0] + "," + cur[1];
        const list = edges.get(k);
        if (!list || !list.length) break;
        const next = list.pop();
        if (!list.length) edges.delete(k);
        ring.push(next);
        cur = next;
        if (next[0] === start[0] && next[1] === start[1]) break;
      }

      if (ring.length > 3) rings.push(this._simplify(ring));
    }

    /* grid coords -> vacuum mm */
    const out = rings.map((ring) =>
      ring.map(([gx, gy]) => [
        this.left + gx * this.grid,
        this.top + gy * this.grid,
      ])
    );

    this.outlines.set(id, out);
    return out;
  }

  /* Drop collinear midpoints - typically removes ~90% of vertices. */
  _simplify(ring) {
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i];
      const a = out[out.length - 1];
      const b = out[out.length - 2];
      if (a && b) {
        const collinear =
          (a[0] - b[0]) * (p[1] - a[1]) === (a[1] - b[1]) * (p[0] - a[0]);
        if (collinear) {
          out[out.length - 1] = p;
          continue;
        }
      }
      out.push(p);
    }
    return out;
  }
}

/* ------------------------------------------------------------------ *
 * 5. The card
 * ------------------------------------------------------------------ */

class DreameSmartVacuumCard extends HTMLElement {
  constructor() {
    super();
    this._built = false;
    this._hass = null;
    this._config = {};

    this._mode = "rooms"; // "rooms" | "all" | "zones"
    this._selection = []; // ordered segment ids - tap order == clean order
    this._zones = []; // [[x0,y0,x1,y1], ...] vacuum mm
    this._zoneSel = null; // index into _zones, or null
    this._settings = null; // lazily seeded from the live entities
    this._geo = new RoomGeometry();
    this._calib = null;
    this._sheet = null; // null | "settings" | "room"
    this._roomSheetId = null;
    this._busy = false;
    this._toastTimer = null;
    this._drag = null;

    this._refetchGeometry = debounce(() => this._fetchGeometry(), 250);
    /* Bound once so detach always removes the same reference. The tab indicator
       is measured in layout pixels, so it has to be recomputed here too - the
       overlay alone is resolution independent. */
    this._onResize = () => {
      this._renderOverlay();
      if (this._hass) this._renderTabs();
    };
  }

  /* ---- Lovelace contract ------------------------------------------ */

  static getStubConfig(hass) {
    const vac = Object.keys(hass?.states || {}).find((e) =>
      e.startsWith("vacuum.")
    );
    return { entity: vac || "vacuum.dreame" };
  }

  static getConfigElement() {
    return document.createElement("dreame-smart-vacuum-card-editor");
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Please define a vacuum entity");
    }
    if (!config.entity.startsWith("vacuum.")) {
      throw new Error("Entity must be a vacuum entity");
    }
    this._config = Object.assign(
      { map_height: 320, show_map: true },
      config
    );
    this._entities = null;
    this._watched = null;
    this._resolveAt = 0;
    this._geo.reset();
    this._build();
    this._update();
  }

  getCardSize() {
    return this._config.show_map === false ? 4 : 9;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._entities = null;
      this._watched = null;
    }
    if (!this._built) return;
    if (!first && !this._relevantChanged()) return;
    this._update();
  }

  /* ---- localisation ------------------------------------------------ */

  _t(key) {
    const hass = this._hass;
    if (hass && hass.localize) {
      const full = hass.localize(
        `component.${INTEGRATION}.entity_component.frontend_action.state.${key}`
      );
      if (full) return full;
    }
    const lang = (hass && hass.language) || "en";
    const table = FALLBACK[lang.split("-")[0]] || FALLBACK.en;
    return table[key] || FALLBACK.en[key] || key;
  }

  _tState(platform, entKey, value) {
    const hass = this._hass;
    if (hass && hass.localize && value != null) {
      const s = hass.localize(
        `component.${INTEGRATION}.entity.${platform}.${entKey}.state.${value}`
      );
      if (s) return s;
    }
    return typeof value === "string"
      ? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
      : "";
  }

  /* ---- entity discovery -------------------------------------------- */

  /* Match on translation_key (always == the EntityDescription key) rather than
     guessing entity_ids, because HA appends _2/_3 on collision and users rename
     entities freely. Falls back to slug patterns on older HA builds. */
  _resolveEntities() {
    const hass = this._hass;
    /* The registry collection is replaced wholesale when it changes, so this
       identity check cheaply catches a saved map being added or removed without
       rescanning on every state update. */
    if (hass && this._registry !== hass.entities) {
      this._registry = hass.entities;
      this._entities = null;
    }
    /* Entities can register a tick after the vacuum, so an incomplete result is
       retried (throttled) instead of being cached forever. */
    if (this._entities && this._entities._complete) return this._entities;
    if (!hass) return this._entities || null;
    if (this._entities) {
      const now = Date.now();
      if (this._resolveAt && now - this._resolveAt < 1000) return this._entities;
      this._resolveAt = now;
    } else {
      this._resolveAt = Date.now();
    }

    const vac = this._config.entity;
    const out = { vacuum: vac };

    const registry = hass.entities;
    let siblings = [];
    if (registry && registry[vac]) {
      const deviceId = registry[vac].device_id;
      if (deviceId) {
        siblings = Object.values(registry).filter(
          (e) => e.device_id === deviceId && e.platform === INTEGRATION
        );
      }
    }

    const byKey = (domain, key) => {
      const hit = siblings.find(
        (e) =>
          e.translation_key === key && e.entity_id.startsWith(domain + ".")
      );
      return hit ? hit.entity_id : undefined;
    };

    const slug = vac.slice("vacuum.".length);
    const guess = (domain, key) => {
      const id = `${domain}.${slug}_${key}`;
      return hass.states[id] ? id : undefined;
    };
    const pick = (domain, key) => byKey(domain, key) || guess(domain, key);

    out.battery = pick("sensor", "battery_level");
    out.state = pick("sensor", "state");
    out.charging = pick("binary_sensor", "charging_state");
    out.suction = pick("select", "suction_level");
    out.water = pick("select", "water_volume");
    out.humidity = pick("select", "mop_pad_humidity");
    out.wetness = pick("number", "wetness_level");
    out.cleaning_mode = pick("select", "cleaning_mode");
    out.cleangenius = pick("select", "cleangenius");
    out.cleangenius_mode = pick("select", "cleangenius_mode");
    out.customized = pick("switch", "customized_cleaning");

    /* Dock rows, keyed "<domain>.<translation_key>" because a few keys exist on
       two domains at once (`self_clean` is both a button and a switch). */
    out.dock = {};
    for (const row of DOCK_ROWS) {
      const id = pick(row.dom, row.k);
      if (id) out.dock[row.dom + "." + row.k] = id;
      /* Reset buttons are referenced by a row rather than being rows themselves,
         so they need resolving here too - otherwise every supply renders without
         the button that is the whole point of the row. */
      if (row.reset) {
        const rid = pick("button", row.reset);
        if (rid) out.dock["button." + row.reset] = rid;
      }
    }

    out.camera =
      this._config.camera ||
      siblings.find(
        (e) =>
          e.translation_key === "map" && e.entity_id.startsWith("camera.")
      )?.entity_id ||
      guess("camera", "map");

    /* saved-map cameras, for the map switcher */
    out.saved_maps = siblings
      .filter(
        (e) =>
          e.translation_key === "saved_map" &&
          e.entity_id.startsWith("camera.")
      )
      .map((e) => e.entity_id)
      .sort();

    /* "Complete" == we found the two things the card cannot work around. */
    out._complete = !!(out.camera && out.battery && out.state);

    this._entities = out;
    return out;
  }

  /* `set hass` fires for every state change anywhere in Home Assistant, so skip
     the render entirely unless something this card actually shows has changed.
     HA replaces state objects on change, so identity comparison is enough. */
  _relevantChanged() {
    const hass = this._hass;
    const ent = this._resolveEntities();
    const watch = [
      this._config.entity,
      ent && ent.camera,
      ent && ent.battery,
      ent && ent.state,
      ent && ent.charging,
      ent && ent.suction,
      ent && ent.water,
      ent && ent.humidity,
      ent && ent.cleaning_mode,
      ent && ent.cleangenius,
      ent && ent.cleangenius_mode,
      ent && ent.customized,
    ];
    /* Only while the dock sheet is open: it is ~60 extra entities, and watching
       them all the time would defeat the point of this early-out. */
    if (this._sheet === "dock" && ent && ent.dock) {
      for (const id of Object.values(ent.dock)) watch.push(id);
    }
    const prev = this._watched;
    const next = watch.map((id) => (id ? hass.states[id] : undefined));
    /* Every visible string goes through hass.localize, and translations load
       asynchronously after the first paint - without these the card would sit
       on untranslated fallbacks until some unrelated entity happened to change. */
    next.push(hass.language, hass.localize, hass.entities);
    this._watched = next;
    if (!prev || prev.length !== next.length) return true;
    for (let i = 0; i < next.length; i++) if (prev[i] !== next[i]) return true;
    return false;
  }

  _st(id) {
    return id && this._hass ? this._hass.states[id] : undefined;
  }

  _vacAttrs() {
    const s = this._st(this._config.entity);
    return (s && s.attributes) || {};
  }

  _caps() {
    const c = this._vacAttrs().capabilities;
    return Array.isArray(c) ? c : [];
  }

  /* The wet control differs per generation: self-wash bases expose a mop pad
     humidity select, older units a water volume select, and the newest models a
     wetness_level number instead of either. The number takes a different service
     and a different field in the per-room payload, so the kind is carried here
     rather than inferred at each call site. */
  _wetEntity() {
    const e = this._resolveEntities();
    if (!e) return null;
    if (e.humidity && this._st(e.humidity)) {
      return { id: e.humidity, key: "mop_pad_humidity", map: HUMID, kind: "select" };
    }
    if (e.water && this._st(e.water)) {
      return { id: e.water, key: "water_volume", map: WATER, kind: "select" };
    }
    if (e.wetness && this._st(e.wetness)) {
      return { id: e.wetness, key: "wetness_level", map: null, kind: "number" };
    }
    return null;
  }

  /* Discrete steps for the wetness number, so it reads like the app's humidity
     presets instead of a raw 1..32 slider. */
  _wetnessSteps(entityId) {
    const st = this._st(entityId);
    const min = Number(st?.attributes?.min ?? 1);
    const max = Number(st?.attributes?.max ?? 32);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
    const span = max - min;
    if (span <= 4) {
      const out = [];
      for (let v = min; v <= max; v++) out.push(v);
      return out;
    }
    return [
      Math.round(min + span * 0.2),
      Math.round(min + span * 0.5),
      Math.round(min + span * 0.8),
    ];
  }

  /* One option shape for both kinds of wet control. */
  _wetOptions(wet) {
    if (!wet) return [];
    if (wet.kind !== "number") {
      return this._optionsFor(wet.id, wet.map).map((v) => ({
        value: v,
        label: this._tState("select", wet.key, v),
      }));
    }
    const steps = this._wetnessSteps(wet.id);
    /* Keep the device's current value selectable even when it is not one of the
       presets, otherwise nothing appears selected. */
    const current = Number(this._st(wet.id)?.state);
    if (Number.isFinite(current) && !steps.includes(current)) steps.push(current);
    return steps
      .sort((a, b) => a - b)
      .map((v) => ({ value: String(v), label: String(v) }));
  }

  /* Card value -> the integer the backend wants. */
  _wetValue(wet, key) {
    if (!wet || key == null) return null;
    if (wet.kind === "number") {
      const n = Number(key);
      return Number.isFinite(n) ? n : null;
    }
    const v = wet.map[key];
    return v == null ? null : v;
  }

  _wetLabel(wet, key) {
    if (!wet || key == null) return "";
    if (wet.kind === "number") return String(key);
    return this._tState("select", wet.key, key);
  }

  _cameraState() {
    const e = this._resolveEntities();
    return this._st(e && e.camera);
  }

  /* ---- lifecycle --------------------------------------------------- */

  connectedCallback() {
    window.removeEventListener("resize", this._onResize);
    window.addEventListener("resize", this._onResize);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._onResize);
    clearTimeout(this._toastTimer);
  }

  /* ------------------------------------------------------------------ *
   * 5a. DOM construction (runs once)
   * ------------------------------------------------------------------ */

  _build() {
    if (this._built) return;
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card class="dv">
        <div class="hdr">
          <div class="hdr-main">
            <div class="title"></div>
            <div class="subtitle"></div>
          </div>
          <div class="batt">
            <span class="batt-shell"><span class="batt-fill"></span></span>
            <span class="batt-txt"></span>
          </div>
          <button class="icon-btn ret-btn" title="">
            ${svg(ICON.home)}
          </button>
        </div>

        <div class="stage">
          <img class="map" alt="" draggable="false">
          <svg class="ovl" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="stage-msg"></div>
          <div class="side">
            <button class="side-btn map-switch" title="">
              ${svg(ICON.layers)}
            </button>
          </div>
        </div>

        <div class="roomlist" role="group"></div>

        <div class="hintrow">
          <div class="hint"></div>
          <button class="linkbtn zone-clear gone" type="button"></button>
        </div>

        <button class="chip custom-chip" aria-haspopup="dialog">
          ${svg(ICON.autorenew, "chip-ico")}
          <span class="chip-txt"></span>
          ${svg(ICON.chevron, "chip-chev")}
        </button>

        <div class="panel">
          <div class="tabs" role="tablist">
            <button class="tab" data-mode="rooms" role="tab"></button>
            <button class="tab" data-mode="all" role="tab"></button>
            <button class="tab" data-mode="zones" role="tab"></button>
            <span class="tab-ind"></span>
          </div>
          <div class="acts">
            <button class="act act-start">
              ${svg(ICON.play, "act-ico")}
              <span class="act-txt"></span>
            </button>
            <span class="act-sep"></span>
            <button class="act act-dock" aria-haspopup="dialog">
              ${svg(ICON.station, "act-ico")}
              <span class="act-txt"></span>
            </button>
          </div>
        </div>

        <div class="scrim"></div>
        <div class="sheet" role="dialog" aria-modal="true" tabindex="-1"></div>
        <div class="toast" role="status" aria-live="polite"></div>
      </ha-card>`;

    const $ = (s) => this.shadowRoot.querySelector(s);
    this._el = {
      card: $(".dv"),
      title: $(".title"),
      subtitle: $(".subtitle"),
      battFill: $(".batt-fill"),
      battTxt: $(".batt-txt"),
      batt: $(".batt"),
      stage: $(".stage"),
      img: $(".map"),
      ovl: $(".ovl"),
      stageMsg: $(".stage-msg"),
      side: $(".side"),
      mapSwitch: $(".map-switch"),
      roomList: $(".roomlist"),
      hint: $(".hint"),
      hintRow: $(".hintrow"),
      zoneClear: $(".zone-clear"),
      chip: $(".custom-chip"),
      chipTxt: $(".chip-txt"),
      tabs: Array.from(this.shadowRoot.querySelectorAll(".tab")),
      tabInd: $(".tab-ind"),
      start: $(".act-start"),
      startTxt: $(".act-start .act-txt"),
      startIco: $(".act-start .act-ico path"),
      dock: $(".act-dock"),
      dockTxt: $(".act-dock .act-txt"),
      ret: $(".ret-btn"),
      retIco: $(".ret-btn svg path"),
      scrim: $(".scrim"),
      sheet: $(".sheet"),
      toast: $(".toast"),
    };

    this._el.tabs.forEach((tab) =>
      tab.addEventListener("click", () => this._setMode(tab.dataset.mode))
    );
    this._el.chip.addEventListener("click", () => this._openSheet("settings"));
    this._el.start.addEventListener("click", () => this._onStart());
    this._el.dock.addEventListener("click", () => this._openSheet("dock"));
    this._el.ret.addEventListener("click", () => this._onReturn());
    this._el.scrim.addEventListener("click", () => this._closeSheet());
    this._el.mapSwitch.addEventListener("click", () => this._cycleMap());

    this._el.img.addEventListener("load", () => {
      this._lastNatural = {
        w: this._el.img.naturalWidth,
        h: this._el.img.naturalHeight,
      };
      this._renderOverlay();
    });
    this._el.img.addEventListener("error", () => this._renderOverlay());

    this._el.zoneClear.addEventListener("click", () => {
      this._clearZones();
      this._afterZoneChange();
    });

    /* Escape closes the sheet, matching every other HA dialog. */
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && this._sheet) {
        ev.stopPropagation();
        this._closeSheet();
        return;
      }
      if (this._sheet || this._mode !== "zones" || this._zoneSel == null) return;
      /* The map is a pointer surface with no focusable zones, so these are the
         only keyboard route to editing one. */
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        this._removeZone(this._zoneSel);
        this._afterZoneChange();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        this._zoneSel = null;
        this._afterZoneChange();
      }
    });

    this._bindStagePointer();
  }

  /* ------------------------------------------------------------------ *
   * 5b. Patch-on-update rendering
   *
   * `set hass` fires for every state change in the whole system, so this must
   * only touch nodes whose value actually changed - especially img.src, which
   * would otherwise re-download the map on every tick.
   * ------------------------------------------------------------------ */

  _update() {
    if (!this._built || !this._hass) return;
    const vac = this._st(this._config.entity);
    if (!vac) {
      this._el.title.textContent = this._config.entity;
      this._el.subtitle.textContent = "unavailable";
      return;
    }
    const ent = this._resolveEntities();
    const attrs = vac.attributes;

    /* --- header: name + status + battery, nothing else --- */
    const name =
      this._config.name || attrs.friendly_name || this._config.entity;
    this._setText(this._el.title, name);

    const stateEnt = this._st(ent.state);
    let status = "";
    if (stateEnt) {
      status = this._hass.formatEntityState
        ? this._hass.formatEntityState(stateEnt)
        : this._tState("sensor", "state", stateEnt.state);
    } else {
      status = this._tState("sensor", "state", vac.state);
    }
    if (attrs.error && attrs.error !== "no_error") {
      const err = this._tState("sensor", "error", attrs.error);
      if (err) status = err;
    }
    this._setText(this._el.subtitle, status);

    const battEnt = this._st(ent.battery);
    const level = battEnt
      ? Number(battEnt.state)
      : Number(attrs.battery_level);
    const charging =
      this._st(ent.charging)?.state === "on" ||
      /charging|sạc/i.test(String(vac.state));
    this._renderBattery(level, charging);

    /* --- capability-driven layout ---
       Both map-driven modes need a usable map to pick anything at all; offering
       them without one leaves Start permanently disabled with no way forward. */
    const mapUsable = this._mapUsable();
    const hasRooms = mapUsable && this._hasRooms();
    this._el.tabs[0].classList.toggle("gone", !hasRooms);
    this._el.tabs[2].classList.toggle("gone", !mapUsable);
    if (!hasRooms && this._mode === "rooms") this._mode = "all";
    if (!mapUsable && this._mode === "zones") this._mode = "all";

    this._seedSettings();
    this._renderMap();
    this._renderTabs();
    this._renderChip();
    this._renderRoomList();
    this._renderActions(vac, attrs);
    this._renderHint();

    if (this._sheet === "settings") this._renderSettingsSheet();
    else if (this._sheet === "room") this._renderRoomSheet();
    else if (this._sheet === "dock") this._renderDockSheet();
  }

  _setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  _renderBattery(level, charging) {
    const pct = Number.isFinite(level) ? clamp(Math.round(level), 0, 100) : null;
    this._setText(this._el.battTxt, pct == null ? "—" : pct + "%");
    this._el.battFill.style.width = (pct == null ? 0 : pct) + "%";
    this._el.batt.classList.toggle("charging", !!charging);
    this._el.batt.classList.toggle("low", pct != null && pct <= 20 && !charging);
  }

  /* --- map -------------------------------------------------------- */

  _rooms() {
    const cam = this._cameraState();
    const rooms = cam && cam.attributes && cam.attributes.rooms;
    return rooms && typeof rooms === "object" ? rooms : null;
  }

  /* A map you can actually point at: shown, rendered, and with a calibration
     that is not the all-zeroes placeholder the camera emits before first use. */
  _mapUsable() {
    if (this._config.show_map === false) return false;
    const cam = this._cameraState();
    if (!cam || cam.state === "unavailable") return false;
    const calib = new Calibration(cam.attributes.calibration_points);
    return calib.ok;
  }

  _hasRooms() {
    const r = this._rooms();
    return !!r && Object.keys(r).length > 0;
  }

  _renderMap() {
    if (this._config.show_map === false) {
      this._el.stage.classList.add("gone");
      return;
    }
    this._el.stage.classList.remove("gone");
    this._el.stage.style.setProperty(
      "--map-h",
      (this._config.map_height || 320) + "px"
    );

    const cam = this._cameraState();
    const ent = this._resolveEntities();

    if (!cam || cam.state === "unavailable") {
      this._el.img.classList.add("gone");
      this._el.stageMsg.textContent = this._t("no_map");
      this._el.stageMsg.classList.remove("gone");
      this._el.ovl.innerHTML = "";
      return;
    }

    const pic = cam.attributes.entity_picture;
    if (pic) {
      const url = this._hass.hassUrl ? this._hass.hassUrl(pic) : pic;
      /* Token rotates hourly and `v=` tracks the map version, so re-read every
         time but only assign when it truly differs, to avoid reload flicker. */
      if (this._el.img.getAttribute("src") !== url) {
        this._el.img.setAttribute("src", url);
      }
      this._el.img.classList.remove("gone");
      this._el.stageMsg.classList.add("gone");
    }

    /* map switcher only makes sense with more than one saved map */
    this._el.side.classList.toggle(
      "gone",
      !ent.saved_maps || ent.saved_maps.length < 2
    );

    const calib = new Calibration(cam.attributes.calibration_points);
    if (!this._calib || !calib.sameAs(this._calib)) this._calib = calib;

    this._maybeFetchGeometry(cam);
    this._renderOverlay();
  }

  /* Refetch the pixel mask only when the map identity or its room set changes -
     not on every P-frame, which arrives every ~3s during a run. */
  _maybeFetchGeometry(cam) {
    const rooms = this._rooms();
    if (!rooms) return;
    const sig =
      String(cam.attributes.map_id) +
      "|" +
      Object.keys(rooms).sort().join(",") +
      "|" +
      Object.values(rooms)
        .map((r) => `${r.x0},${r.y0},${r.x1},${r.y1}`)
        .join(";");
    if (sig === this._geo.signature) return;
    this._geo.signature = sig;
    this._geo.mask = null;
    this._geo.outlines = new Map();
    this._refetchGeometry();
  }

  async _fetchGeometry() {
    const ent = this._resolveEntities();
    if (!ent || !ent.camera || !this._hass || this._geo.pending) return;
    this._geo.pending = true;
    try {
      const json = await this._hass.callApi(
        "GET",
        `camera_map_data_proxy/${ent.camera}`
      );
      this._geo.build(json);
    } catch (err) {
      /* Not fatal: we degrade to bounding-box hit testing. Clearing the
         signature lets the next map update retry, so a transient network blip
         does not permanently downgrade hit testing. */
      this._geo.signature = null;
      // eslint-disable-next-line no-console
      console.debug("dreame-smart-vacuum-card: map data unavailable", err);
    } finally {
      this._geo.pending = false;
      this._renderOverlay();
    }
  }

  /* --- overlay ---------------------------------------------------- */

  _renderOverlay() {
    const img = this._el.img;
    const ovl = this._el.ovl;
    /* naturalWidth drops to 0 while a new src decodes. The map pushes a fresh
       frame every few seconds during a run, so trusting it here would blank the
       selection overlay on every frame; fall back to the last known size. */
    const last = this._lastNatural;
    const W = (img && img.naturalWidth) || (last && last.w) || 0;
    const H = (img && img.naturalHeight) || (last && last.h) || 0;
    if (!W || !H || !this._calib || !this._calib.ok) {
      if (ovl.innerHTML !== "") ovl.innerHTML = "";
      return;
    }

    ovl.setAttribute("viewBox", `0 0 ${W} ${H}`);
    ovl.setAttribute("preserveAspectRatio", "xMidYMid meet");

    /* Badges should be a constant size on screen regardless of how many pixels
       the server rendered, so convert a target CSS size into viewBox units. */
    const box = this._imageRect();
    const unitsPerPx = box && box.width ? W / box.width : 1;
    const badgeR = clamp(13 * unitsPerPx, 8, Math.max(8, W * 0.06));

    const rooms = this._rooms() || {};
    const cam = this._cameraState();
    const active = (cam && cam.attributes.active_segments) || [];
    const parts = [];
    this._ensureRoomColors();

    /* selected + active rooms */
    if (this._mode === "rooms") {
      for (const idStr of Object.keys(rooms)) {
        const id = Number(idStr);
        const room = rooms[idStr];
        const order = this._selection.indexOf(id);
        const isSel = order >= 0;
        const isActive = active.includes(id);
        if (!isSel && !isActive) continue;

        const color = this._roomColor(id, room);
        const d = this._roomPath(id, room);
        if (d) {
          parts.push(
            `<path d="${d}" class="room ${isSel ? "sel" : "act"}" style="--rc:${color}"/>`
          );
        }
        if (isSel) {
          const c = this._roomCenter(room);
          if (c) {
            const p = this._calib.toImage(c.x, c.y);
            const r = badgeR;
            /* The server already draws the room name pill at the centre, so sit
               above it like the app does instead of covering the name. */
            p.y -= r * 1.9;
            parts.push(
              `<g class="badge"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(
                1
              )}" r="${r.toFixed(1)}" style="--rc:${color}" stroke-width="${(
                r * 0.18
              ).toFixed(1)}"/>` +
                `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(
                  1
                )}" font-size="${(r * 1.3).toFixed(1)}">${order + 1}</text></g>`
            );
          }
        }
      }
    }

    /* zones */
    if (this._mode === "zones") {
      this._zones.forEach((z, i) => {
        const a = this._calib.toImage(z[0], z[1]);
        const b = this._calib.toImage(z[2], z[3]);
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(b.x - a.x);
        const h = Math.abs(b.y - a.y);
        const on = i === this._zoneSel;
        parts.push(
          `<rect class="zone${on ? " sel" : ""}" data-zone="${i}" x="${x.toFixed(
            1
          )}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(
            1
          )}" rx="4"/>`
        );
      });

      /* Chrome for the selected zone: corner grips to resize, and a delete badge
         above its top-right corner. Drawn after every zone so it is never painted
         under an overlapping one. */
      if (this._zoneSel != null) {
        const c = this._zoneChrome(this._zoneSel);
        if (c) {
          for (const k of ["nw", "ne", "se", "sw"]) {
            const p = c.corners[k];
            parts.push(
              `<circle class="zgrip" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(
                1
              )}" r="${c.handle.toFixed(1)}"/>`
            );
          }
          const bx = c.badge.x;
          const by = c.badge.y;
          const r = c.badge.r;
          const arm = r * 0.42;
          parts.push(
            `<g class="zdel"><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(
              1
            )}" r="${r.toFixed(1)}"/>` +
              `<path d="M${(bx - arm).toFixed(1)},${(by - arm).toFixed(1)} L${(
                bx + arm
              ).toFixed(1)},${(by + arm).toFixed(1)} M${(bx + arm).toFixed(
                1
              )},${(by - arm).toFixed(1)} L${(bx - arm).toFixed(1)},${(
                by + arm
              ).toFixed(1)}"/></g>`
          );
        }
      }
      if (this._drag && this._drag.rect) {
        const r = this._drag.rect;
        parts.push(
          `<rect class="zone draft" x="${r.x.toFixed(1)}" y="${r.y.toFixed(
            1
          )}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" rx="4"/>`
        );
      }
    }

    const html = parts.join("");
    if (ovl.innerHTML !== html) ovl.innerHTML = html;
  }

  _roomPath(id, room) {
    const rings = this._geo.hasMask ? this._geo.outlineFor(id) : null;
    if (rings && rings.length) {
      return rings
        .map(
          (ring) =>
            "M" +
            ring
              .map(([vx, vy]) => {
                const p = this._calib.toImage(vx, vy);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join("L") +
            "Z"
        )
        .join(" ");
    }
    /* fallback: bounding box */
    if (room.x0 == null) return null;
    const c = [
      this._calib.toImage(room.x0, room.y0),
      this._calib.toImage(room.x1, room.y0),
      this._calib.toImage(room.x1, room.y1),
      this._calib.toImage(room.x0, room.y1),
    ];
    return (
      "M" + c.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L") + "Z"
    );
  }

  /* The renderer ships five colour schemes (Dreame light/dark, Mijia light/dark,
     grayscale), so a hardcoded palette indexed by color_index gives the
     selection tint a different colour from the room underneath it on four of
     them. Read the real colour out of the rendered map instead, once per map. */
  _ensureRoomColors() {
    const img = this._el.img;
    const rooms = this._rooms();
    if (!img || !img.naturalWidth || !this._calib || !this._calib.ok || !rooms) return;

    const cam = this._cameraState();
    const sig = [
      cam && cam.attributes.map_id,
      this._geo.signature,
      img.naturalWidth,
      img.naturalHeight,
    ].join("|");
    if (this._colorSig === sig) return;
    this._colorSig = sig;

    const sampled = new Map();
    try {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const buf = ctx.getImageData(0, 0, cv.width, cv.height).data;

      for (const idStr of Object.keys(rooms)) {
        const id = Number(idStr);
        const tally = new Map();
        for (const [vx, vy] of this._colorSamplePoints(id, rooms[idStr])) {
          const p = this._calib.toImage(vx, vy);
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) continue;
          const o = (y * cv.width + x) * 4;
          if (buf[o + 3] < 200) continue;
          const r = buf[o];
          const g = buf[o + 1];
          const b = buf[o + 2];
          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          /* Skip the grey wall pixels and the near-white name pill so we land on
             the room fill itself. */
          if (mx - mn < 12) continue;
          if (mx > 246 && mn > 226) continue;
          const key = r + "," + g + "," + b;
          tally.set(key, (tally.get(key) || 0) + 1);
        }
        let best = null;
        let bestN = 0;
        for (const [k, n] of tally) {
          if (n > bestN) {
            bestN = n;
            best = k;
          }
        }
        if (best) sampled.set(id, "rgb(" + best + ")");
      }
    } catch (err) {
      /* Tainted canvas or no 2d context: fall back to the static palette. */
      // eslint-disable-next-line no-console
      console.debug("dreame-smart-vacuum-card: could not sample room colours", err);
    }
    this._roomColors = sampled;
  }

  /* Spread the samples across the room so one stray pixel cannot win the vote. */
  _colorSamplePoints(id, room) {
    const pts = [];
    if (this._geo.hasMask) {
      const geo = this._geo;
      let seen = 0;
      for (let iy = 0; iy < geo.height && pts.length < 32; iy += 2) {
        for (let ix = 0; ix < geo.width && pts.length < 32; ix += 2) {
          if (geo.mask[iy * geo.width + ix] !== id) continue;
          if (seen++ % 3) continue;
          pts.push([geo.left + (ix + 0.5) * geo.grid, geo.top + (iy + 0.5) * geo.grid]);
        }
      }
    }
    if (!pts.length && room.x0 != null) {
      for (let fx = 0.2; fx <= 0.8; fx += 0.2) {
        for (let fy = 0.2; fy <= 0.8; fy += 0.2) {
          pts.push([
            room.x0 + (room.x1 - room.x0) * fx,
            room.y0 + (room.y1 - room.y0) * fy,
          ]);
        }
      }
    }
    return pts;
  }

  _roomColor(id, room) {
    const s = this._roomColors && this._roomColors.get(id);
    if (s) return s;
    return ROOM_COLORS[(room.color_index ?? 0) % ROOM_COLORS.length];
  }

  _roomCenter(room) {
    if (room.x != null && room.y != null) return { x: room.x, y: room.y };
    if (room.x0 == null) return null;
    return { x: (room.x0 + room.x1) / 2, y: (room.y0 + room.y1) / 2 };
  }

  /* --- tabs / chip / actions --------------------------------------- */

  _renderTabs() {
    const labels = { rooms: "rooms", all: "all", zones: "zones" };
    this._el.tabs.forEach((tab) => {
      const m = tab.dataset.mode;
      this._setText(tab, this._t(labels[m]));
      const on = this._mode === m;
      tab.classList.toggle("on", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
    });
    /* Measure in px rather than percentages: the indicator is positioned
       against the padding box while the tabs flex inside the content box, so a
       percentage width lands a few pixels off. */
    const active = this._el.tabs.find(
      (t) => t.dataset.mode === this._mode && !t.classList.contains("gone")
    );
    if (active && active.offsetWidth) {
      this._el.tabInd.style.width = active.offsetWidth + "px";
      this._el.tabInd.style.transform = `translateX(${active.offsetLeft - 4}px)`;
      this._el.tabInd.classList.remove("gone");
    } else {
      this._el.tabInd.classList.add("gone");
    }
  }

  /* Only advertise what the pending run will actually apply - repeats do not
     exist for a whole-map clean, and nothing but the mode applies under
     CleanGenius. */
  _renderChip() {
    const s = this._settings || {};
    const bits = [];
    if (s.cleangenius && s.cleangenius !== "off") {
      bits.push(this._tState("select", "cleangenius", s.cleangenius));
      if (s.cleangenius_mode) {
        bits.push(this._tState("select", "cleangenius_mode", s.cleangenius_mode));
      }
    } else {
      if (s.cleaning_mode) {
        bits.push(this._tState("select", "cleaning_mode", s.cleaning_mode));
      }
      if (s.suction && !this._mopOnly()) {
        bits.push(this._tState("select", "suction_level", s.suction));
      }
      const wet = this._wetEntity();
      if (wet && s.wet && !this._sweepOnly()) {
        bits.push(this._wetLabel(wet, s.wet));
      }
      if (s.repeats > 1 && this._mode !== "all") bits.push("x" + s.repeats);
    }
    const label = this._t("custom");
    this._setText(
      this._el.chipTxt,
      bits.length ? `${label} · ${bits.join(" · ")}` : label
    );
  }

  _mopOnly() {
    return (this._settings || {}).cleaning_mode === "mopping";
  }

  _sweepOnly() {
    return (this._settings || {}).cleaning_mode === "sweeping";
  }

  _renderActions(vac, attrs) {
    const running = this._isRunning(vac, attrs);
    const paused = this._isPaused(vac, attrs);

    let txt;
    let icon;
    if (running) {
      txt = this._t("pause");
      icon = ICON.pause;
    } else if (paused) {
      txt = this._t("resume");
      icon = ICON.play;
    } else {
      txt = this._t("start_cleaning");
      icon = ICON.play;
    }
    this._setText(this._el.startTxt, txt);
    if (this._el.startIco.getAttribute("d") !== icon) {
      this._el.startIco.setAttribute("d", icon);
    }
    /* Beside Start, the dock button now opens the dock sheet - so the noun it was
       always labelled with finally names something real. */
    this._setText(this._el.dockTxt, this._t("dock_station"));

    /* Return-to-dock lives in the header, icon-only: it is a robot command, not a
       dock one, and putting it here keeps the action row to two buttons. It flips
       to a pause icon on the way home and greys out when there is nothing to
       return from, which the old static button never did. */
    const returning = vac.state === "returning";
    const retIcon = returning ? ICON.pause : ICON.home;
    if (this._el.retIco.getAttribute("d") !== retIcon) {
      this._el.retIco.setAttribute("d", retIcon);
    }
    const retLabel = this._t(returning ? "returning" : "dock");
    this._el.ret.title = retLabel;
    this._el.ret.setAttribute("aria-label", retLabel);
    this._el.ret.toggleAttribute(
      "disabled",
      this._busy || this._isDocked(vac, attrs)
    );

    const blocked =
      this._busy ||
      (!running &&
        !paused &&
        this._mode === "rooms" &&
        this._selection.length === 0) ||
      (!running && !paused && this._mode === "zones" && this._zones.length === 0);
    this._el.start.toggleAttribute("disabled", blocked);
    this._el.card.classList.toggle("busy", this._busy);
  }

  /* A robot that errored mid-job still reports started=true, but it is stopped
     and wants Resume - offering Pause there would leave no way to restart it. */
  _isRunning(vac, attrs) {
    if (this._isPaused(vac, attrs)) return false;
    if (vac.state === "error" || vac.state === "docked" || vac.state === "idle") {
      return false;
    }
    if (attrs && attrs.started === true) return true;
    return vac.state === "cleaning" || vac.state === "returning";
  }

  _isPaused(vac, attrs) {
    return vac.state === "paused" || !!(attrs && attrs.paused === true);
  }

  /* Parked on the dock with nothing to return from. `docked` covers charging and
     fully charged; the base-station statuses mean it is physically on the dock
     doing something, which is equally not a return-to-base candidate. */
  _isDocked(vac, attrs) {
    if (!vac) return true;
    if (vac.state === "docked") return true;
    if (attrs && attrs.washing === true) return true;
    if (attrs && attrs.drying === true) return true;
    return false;
  }

  /* A chip per room, in map order, showing its queue position when selected.
     This is the keyboard and screen-reader path to the same selection the map
     taps drive, and it makes the ordering readable as text rather than only as
     badges painted on the map. */
  _renderRoomList() {
    const list = this._el.roomList;
    const rooms = this._rooms();
    if (this._mode !== "rooms" || !rooms) {
      list.classList.add("gone");
      list.innerHTML = "";
      this._roomChips = null;
      return;
    }
    list.classList.remove("gone");

    const ids = Object.keys(rooms)
      .map(Number)
      .sort((a, b) => a - b);
    const sig = ids.join(",");
    if (sig !== this._roomChipSig) {
      list.innerHTML = "";
      this._roomChips = new Map();
      for (const id of ids) {
        const btn = document.createElement("button");
        btn.className = "rchip";
        btn.type = "button";
        btn.innerHTML = `<span class="rchip-n"></span><span class="rchip-t"></span>`;
        btn.addEventListener("click", () => this._toggleRoom(id));
        list.appendChild(btn);
        this._roomChips.set(id, btn);
      }
      this._roomChipSig = sig;
    }

    for (const id of ids) {
      const btn = this._roomChips.get(id);
      if (!btn) continue;
      const room = rooms[String(id)];
      const order = this._selection.indexOf(id);
      const on = order >= 0;
      const color = this._roomColor(id, room);
      btn.classList.toggle("on", on);
      btn.style.setProperty("--rc", color);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      const name = room.name || `${this._t("rooms")} ${id}`;
      this._setText(btn.querySelector(".rchip-t"), name);
      this._setText(btn.querySelector(".rchip-n"), on ? String(order + 1) : "");
      btn.querySelector(".rchip-n").classList.toggle("gone", !on);
      btn.setAttribute(
        "aria-label",
        on ? `${name} — ${order + 1}` : name
      );
    }
  }

  _renderHint() {
    let msg = "";
    if (this._mode === "rooms") {
      if (!this._hasRooms()) msg = this._t("no_rooms");
      else if (!this._selection.length) msg = this._t("select_rooms");
    } else if (this._mode === "zones") {
      /* Three states worth distinguishing: nothing drawn, something drawn but
         nothing picked, and one picked - the last is where move/resize/delete are
         available, and saying so is the only discovery route for a gesture. */
      if (!this._zones.length) msg = this._t("draw_zone");
      else if (this._zoneSel == null) msg = this._t("zone_pick");
      else msg = this._t("zone_edit");
    }
    this._setText(this._el.hint, msg);
    this._el.hint.classList.toggle("gone", !msg);

    const showClear = this._mode === "zones" && this._zones.length > 0;
    this._el.zoneClear.classList.toggle("gone", !showClear);
    if (showClear) {
      this._setText(
        this._el.zoneClear,
        this._zones.length > 1
          ? `${this._t("zone_clear")} (${this._zones.length})`
          : this._t("zone_clear")
      );
    }
  }

  /* ------------------------------------------------------------------ *
   * 5c. Interaction
   * ------------------------------------------------------------------ */

  _setMode(mode) {
    if (this._mode === mode) return;
    this._mode = mode;
    if (mode !== "zones") this._clearZones();
    if (mode !== "rooms") this._selection = [];
    this._update();
  }

  _bindStagePointer() {
    const stage = this._el.stage;
    let longPress = null;
    let moved = false;
    let downPt = null;

    stage.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      /* The floating side buttons live inside the stage, so without this a tap
         on one of them also toggles whatever room sits beneath it. */
      if (this._el.side.contains(ev.target)) return;
      const pt = this._clientToImage(ev);
      if (!pt) return;
      downPt = pt;
      moved = false;

      if (this._mode === "zones") {
        stage.setPointerCapture(ev.pointerId);
        ev.preventDefault();

        /* Chrome of the selected zone first: a corner handle overlaps the zone
           body, and the delete badge overlaps whatever is behind it. */
        const chrome = this._zoneChromeAt(pt);
        if (chrome === "delete") {
          this._removeZone(this._zoneSel);
          this._drag = null;
          downPt = null;
          this._afterZoneChange();
          return;
        }
        if (chrome) {
          this._drag = { kind: "resize", corner: chrome, index: this._zoneSel };
          return;
        }

        const hit = this._zoneAt(pt);
        if (hit != null) {
          /* Select on press so the handles appear under the finger already
             holding the zone; whether this ends up a tap or a move is decided at
             pointerup. */
          this._zoneSel = hit;
          this._drag = { kind: "move", index: hit, last: pt };
          this._afterZoneChange();
          return;
        }

        this._drag = { kind: "draw", start: pt, rect: null };
        return;
      }

      if (this._mode === "rooms") {
        const id = this._roomAt(pt);
        if (id) {
          longPress = setTimeout(() => {
            longPress = null;
            moved = true; // suppress the click-select
            this._openRoomSheet(id);
          }, 550);
        }
      }
    });

    stage.addEventListener("pointermove", (ev) => {
      if (!downPt) return;
      const pt = this._clientToImage(ev);
      if (!pt) return;

      if (Math.hypot(pt.x - downPt.x, pt.y - downPt.y) > 6) {
        moved = true;
        if (longPress) {
          clearTimeout(longPress);
          longPress = null;
        }
      }

      if (!this._drag) return;
      if (this._drag.kind === "draw") {
        this._drag.rect = {
          x: Math.min(this._drag.start.x, pt.x),
          y: Math.min(this._drag.start.y, pt.y),
          w: Math.abs(pt.x - this._drag.start.x),
          h: Math.abs(pt.y - this._drag.start.y),
        };
        this._renderOverlay();
      } else if (this._drag.kind === "move") {
        /* Track the delta between frames rather than from the press point: the
           zone is clamped at the map edge, so a from-origin delta would let the
           pointer run away from the zone and the zone would then lag behind it. */
        const a = this._calib && this._calib.toVacuum(this._drag.last.x, this._drag.last.y);
        const b = this._calib && this._calib.toVacuum(pt.x, pt.y);
        if (a && b) {
          this._moveZone(this._drag.index, b.x - a.x, b.y - a.y);
          this._drag.last = pt;
          this._renderOverlay();
        }
      } else if (this._drag.kind === "resize") {
        const v = this._calib && this._calib.toVacuum(pt.x, pt.y);
        if (v) {
          this._resizeZone(this._drag.index, this._drag.corner, v);
          this._renderOverlay();
        }
      }
    });

    const finish = (ev) => {
      if (longPress) {
        clearTimeout(longPress);
        longPress = null;
      }
      const pt = this._clientToImage(ev) || downPt;
      downPt = null;

      if (this._drag) {
        const drag = this._drag;
        this._drag = null;
        if (drag.kind === "draw") {
          /* Branch on whether the pointer actually travelled, not on whether a
             draft rect exists: a stationary tap still emits pointermove events on
             touch, which would otherwise never register as a tap. */
          if (moved && drag.rect && pt) {
            const added = this._commitZone(drag.start, pt);
            /* Select what was just drawn, so its handles and delete button are
               already there without a second tap. */
            if (added != null) this._zoneSel = added;
          } else {
            /* Tap on bare map: drop the selection. This is the way out of a
               selection, and the reason tapping no longer deletes - losing a zone
               to a stray tap was too easy. */
            this._zoneSel = null;
          }
        }
        this._afterZoneChange();
        return;
      }

      if (!moved && pt && this._mode === "rooms") this._toggleRoomAt(pt);
    };

    stage.addEventListener("pointerup", finish);
    stage.addEventListener("pointercancel", () => {
      if (longPress) clearTimeout(longPress);
      longPress = null;
      downPt = null;
      this._drag = null;
      this._renderOverlay();
    });
  }

  /* Everything a zone edit has to refresh: the overlay, Start's enabled state and
     the hint row that carries the count and Clear all. */
  _afterZoneChange() {
    this._renderOverlay();
    const vac = this._st(this._config.entity);
    if (vac) this._renderActions(vac, this._vacAttrs());
    this._renderHint();
  }

  /* The rendered image box in client space. The <img> is `object-fit: contain`
     inside a fixed-height stage, so the painted picture is letterboxed within
     the element box - using the element box directly would skew every tap. */
  _imageRect() {
    const img = this._el.img;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    return {
      left: r.left + (r.width - w) / 2,
      top: r.top + (r.height - h) / 2,
      width: w,
      height: h,
    };
  }

  /* Client px -> natural image px, clamped to the painted picture. The stage is
     larger than the letterboxed image, so an unclamped tap in the margin would
     produce out-of-range vacuum coordinates and the spiral search would then
     happily snap to some unrelated room. */
  _clientToImage(ev) {
    const box = this._imageRect();
    if (!box) return null;
    const img = this._el.img;
    const px = ev.clientX - box.left;
    const py = ev.clientY - box.top;
    const slack = 2;
    if (
      px < -slack ||
      py < -slack ||
      px > box.width + slack ||
      py > box.height + slack
    ) {
      return null;
    }
    return {
      x: clamp(px, 0, box.width) * (img.naturalWidth / box.width),
      y: clamp(py, 0, box.height) * (img.naturalHeight / box.height),
    };
  }

  _roomAt(imgPt) {
    if (!this._calib || !this._calib.ok) return 0;
    const v = this._calib.toVacuum(imgPt.x, imgPt.y);
    if (!v) return 0;

    /* Tier 1: exact pixel mask (with the server's spiral fallback). */
    if (this._geo.hasMask) {
      const id = this._geo.hitTest(v.x, v.y);
      if (id && this._rooms() && this._rooms()[String(id)]) return id;
    }

    /* Tier 2: bounding boxes, nearest centre wins on overlap. */
    const rooms = this._rooms() || {};
    let best = 0;
    let bestDist = Infinity;
    for (const idStr of Object.keys(rooms)) {
      const r = rooms[idStr];
      if (r.x0 == null) continue;
      const inside =
        v.x >= Math.min(r.x0, r.x1) &&
        v.x <= Math.max(r.x0, r.x1) &&
        v.y >= Math.min(r.y0, r.y1) &&
        v.y <= Math.max(r.y0, r.y1);
      if (!inside) continue;
      const c = this._roomCenter(r);
      const d = c ? Math.hypot(c.x - v.x, c.y - v.y) : 0;
      if (d < bestDist) {
        bestDist = d;
        best = Number(idStr);
      }
    }
    if (best) return best;

    /* Tier 3: nearest centre within a few grid cells. */
    const reach = (this._geo.grid || 50) * 4;
    for (const idStr of Object.keys(rooms)) {
      const c = this._roomCenter(rooms[idStr]);
      if (!c) continue;
      const d = Math.hypot(c.x - v.x, c.y - v.y);
      if (d < reach && d < bestDist) {
        bestDist = d;
        best = Number(idStr);
      }
    }
    return best;
  }

  /* Tap to add, tap again to remove. Position in the array IS the clean order,
     so removing a room renumbers everything after it - same as the app. */
  _toggleRoomAt(imgPt) {
    const id = this._roomAt(imgPt);
    if (id) this._toggleRoom(id);
  }

  _toggleRoom(id) {
    const i = this._selection.indexOf(id);
    if (i >= 0) this._selection.splice(i, 1);
    else this._selection.push(id);
    this._afterSelectionChange();
  }

  _afterSelectionChange() {
    this._renderOverlay();
    this._renderRoomList();
    this._renderActions(this._st(this._config.entity), this._vacAttrs());
    this._renderHint();
  }

  /* Returns the new zone's index, or null if the drag was too small to be a
     zone the robot would accept. */
  _commitZone(startPt, endPt) {
    if (!this._calib || !this._calib.ok) return null;
    const a = this._calib.toVacuum(startPt.x, startPt.y);
    const b = this._calib.toVacuum(endPt.x, endPt.y);
    if (!a || !b) return null;

    const x0 = Math.round(Math.min(a.x, b.x));
    const y0 = Math.round(Math.min(a.y, b.y));
    const x1 = Math.round(Math.max(a.x, b.x));
    const y1 = Math.round(Math.max(a.y, b.y));

    const min = this._minZoneSide();
    if (x1 - x0 < min || y1 - y0 < min) return null;

    this._zones.push([x0, y0, x1, y1]);
    return this._zones.length - 1;
  }

  /* ---- zone editing ------------------------------------------------ *
   *
   * A zone is stored in vacuum millimetres, but every gesture arrives in image
   * pixels, so each helper converts at its own edge rather than keeping a second
   * copy of the geometry in view space that could drift.
   * ------------------------------------------------------------------ */

  /* Topmost zone containing the point, or null. Last drawn wins, matching the
     paint order. */
  _zoneAt(imgPt) {
    if (!this._calib || !this._calib.ok || !this._zones.length) return null;
    const v = this._calib.toVacuum(imgPt.x, imgPt.y);
    if (!v) return null;
    for (let i = this._zones.length - 1; i >= 0; i--) {
      const [x0, y0, x1, y1] = this._zones[i];
      if (v.x >= x0 && v.x <= x1 && v.y >= y0 && v.y <= y1) return i;
    }
    return null;
  }

  _removeZone(i) {
    if (i == null || i < 0 || i >= this._zones.length) return;
    this._zones.splice(i, 1);
    if (this._zoneSel === i) this._zoneSel = null;
    else if (this._zoneSel != null && this._zoneSel > i) this._zoneSel -= 1;
  }

  _clearZones() {
    this._zones = [];
    this._zoneSel = null;
  }

  /* Image pixels per CSS pixel. Handles and the delete badge are sized for a
     finger, which is a client-space quantity, but they are drawn in image space -
     on a map scaled to a third of its natural size a fixed image-space handle
     would be a third of its intended size. */
  _imgScale() {
    const img = this._el && this._el.img;
    const r = this._imageRect();
    /* _imageRect reports {left, top, width, height} - not {x, y, w, h}. Reading
       the wrong name here silently pinned the scale at 1, which shrank every grip
       on a map rendered smaller than its natural size. */
    if (!img || !r || !img.naturalWidth || !r.width) return 1;
    return img.naturalWidth / r.width;
  }

  /* The four corners of the selected zone in image space, plus the badge centre.
     Returned in one place so the renderer and the hit test cannot disagree. */
  _zoneChrome(i) {
    if (!this._calib || !this._calib.ok) return null;
    const z = this._zones[i];
    if (!z) return null;
    const a = this._calib.toImage(z[0], z[1]);
    const b = this._calib.toImage(z[2], z[3]);
    if (!a || !b) return null;
    const x0 = Math.min(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const s = this._imgScale();
    const r = 12 * s;

    /* The overlay is an svg sized to the image, so anything outside it is clipped.
       The badge normally floats just above the top-right corner, but for a zone
       drawn against the top or right edge that would cut the only delete affordance
       in half - so tuck it inside the zone instead. */
    const img = this._el && this._el.img;
    const natW = (img && img.naturalWidth) || 0;
    let bx = x1;
    let by = y0 - 15 * s;
    if (by - r < 0) by = y0 + 15 * s;
    if (natW && bx + r > natW) bx = natW - r;

    return {
      rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
      handle: 7 * s, // drawn radius
      grab: 15 * s, // forgiving touch radius
      corners: {
        nw: { x: x0, y: y0 },
        ne: { x: x1, y: y0 },
        se: { x: x1, y: y1 },
        sw: { x: x0, y: y1 },
      },
      badge: { x: bx, y: by, r },
    };
  }

  /* Which bit of the selected zone's chrome is under the pointer: a corner name,
     "delete", or null. Checked before the zone body so a handle sitting inside
     the rectangle still wins. */
  _zoneChromeAt(imgPt) {
    if (this._zoneSel == null) return null;
    const c = this._zoneChrome(this._zoneSel);
    if (!c) return null;
    const near = (p, r) => Math.hypot(imgPt.x - p.x, imgPt.y - p.y) <= r;
    if (near(c.badge, c.badge.r * 1.3)) return "delete";
    for (const k of ["nw", "ne", "se", "sw"]) {
      if (near(c.corners[k], c.grab)) return k;
    }
    return null;
  }

  /* Vacuum-space extent of the whole map, so a moved zone cannot be pushed off
     it. Derived from the image corners because that is the only region the
     calibration is meaningful over. */
  _mapBounds() {
    const img = this._el && this._el.img;
    if (!this._calib || !this._calib.ok || !img) return null;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const pts = [
      this._calib.toVacuum(0, 0),
      this._calib.toVacuum(w, 0),
      this._calib.toVacuum(0, h),
      this._calib.toVacuum(w, h),
    ].filter(Boolean);
    if (pts.length !== 4) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  _minZoneSide() {
    /* device.py computes w = side / (grid_size * 2) and rejects w <= 1.0, so a
       side must be strictly MORE than two grid cells. The margin keeps a zone the
       card accepts from being bounced by the robot. */
    return (this._geo.grid || 50) * 2.2;
  }

  /* Slide a zone by a vacuum-space delta, kept whole and kept on the map. */
  _moveZone(i, dx, dy) {
    const z = this._zones[i];
    if (!z) return;
    const b = this._mapBounds();
    let [x0, y0, x1, y1] = z;
    const w = x1 - x0;
    const h = y1 - y0;
    x0 += dx;
    y0 += dy;
    if (b) {
      x0 = clamp(x0, b.minX, b.maxX - w);
      y0 = clamp(y0, b.minY, b.maxY - h);
    }
    this._zones[i] = [
      Math.round(x0),
      Math.round(y0),
      Math.round(x0 + w),
      Math.round(y0 + h),
    ];
  }

  /* Drag one corner. The opposite corner is the anchor, and the moving edges are
     clamped so the zone can never be dragged below the size the robot accepts -
     clamping beats rejecting, which would make the zone snap back mid-gesture. */
  _resizeZone(i, corner, vPt) {
    const z = this._zones[i];
    if (!z) return;
    const b = this._mapBounds();
    const min = this._minZoneSide();
    let [x0, y0, x1, y1] = z;
    let px = vPt.x;
    let py = vPt.y;
    if (b) {
      px = clamp(px, b.minX, b.maxX);
      py = clamp(py, b.minY, b.maxY);
    }
    const west = corner === "nw" || corner === "sw";
    const north = corner === "nw" || corner === "ne";
    if (west) x0 = Math.min(px, x1 - min);
    else x1 = Math.max(px, x0 + min);
    if (north) y0 = Math.min(py, y1 - min);
    else y1 = Math.max(py, y0 + min);
    this._zones[i] = [
      Math.round(x0),
      Math.round(y0),
      Math.round(x1),
      Math.round(y1),
    ];
  }

  _cycleMap() {
    const ent = this._resolveEntities();
    if (!ent || !ent.saved_maps || ent.saved_maps.length < 2) return;
    fireEvent(this, "hass-more-info", { entityId: ent.camera });
  }

  /* ------------------------------------------------------------------ *
   * 5d. Settings model
   * ------------------------------------------------------------------ */

  /* Track the device until the user overrides a control, then stop following it
     for that control only. Two rules matter here:
       - Never invent a value. A null field means "leave the device alone"; the
         selects go unavailable in perfectly normal states (suction is
         unavailable in mopping mode, everything is unavailable under
         CleanGenius), and latching a made-up default would later push that
         guess onto the robot.
       - Do not mirror the selects for a field the user set, because
         clean_segment does not write back to them and the display would go
         stale mid-run. */
  _seedSettings() {
    const ent = this._resolveEntities();
    const wet = this._wetEntity();
    if (!this._settings) this._settings = { repeats: 1 };
    if (!this._touched) this._touched = new Set();
    const s = this._settings;
    const t = this._touched;

    const live = (id) => {
      const st = this._st(id);
      if (!st || st.state === "unavailable" || st.state === "unknown") return null;
      return st.state;
    };

    if (!t.has("cleangenius")) s.cleangenius = live(ent.cleangenius) || "off";
    if (!t.has("cleangenius_mode")) {
      s.cleangenius_mode = live(ent.cleangenius_mode);
    }
    if (!t.has("cleaning_mode")) s.cleaning_mode = live(ent.cleaning_mode);
    if (!t.has("suction")) s.suction = live(ent.suction);
    if (!t.has("wet")) s.wet = wet ? live(wet.id) : null;
    if (!s.repeats) s.repeats = 1;
  }

  _touch(field, value) {
    if (!this._touched) this._touched = new Set();
    this._touched.add(field);
    this._settings[field] = value;
  }

  _optionsFor(entityId, fallbackMap) {
    const st = this._st(entityId);
    const opts = st && st.attributes && st.attributes.options;
    if (Array.isArray(opts) && opts.length) return opts;
    return Object.keys(fallbackMap || {});
  }

  /* ------------------------------------------------------------------ *
   * 5e. Sheets
   * ------------------------------------------------------------------ */

  _openSheet(kind) {
    /* The chip is always present, so the sheet can be opened before _update()
       has ever run to completion (unavailable vacuum entity, for instance). */
    this._seedSettings();
    this._sheet = kind;
    this._el.scrim.classList.add("open");
    this._el.sheet.classList.add("open");
    if (kind === "settings") this._renderSettingsSheet();
    else if (kind === "dock") this._renderDockSheet();
    this._el.sheet.focus();
  }

  _openRoomSheet(id) {
    this._roomSheetId = id;
    this._sheet = "room";
    this._el.scrim.classList.add("open");
    this._el.sheet.classList.add("open");
    this._renderRoomSheet();
  }

  _closeSheet() {
    this._sheet = null;
    this._roomSheetId = null;
    this._el.scrim.classList.remove("open");
    this._el.sheet.classList.remove("open");
  }

  _group(title, iconPath, options, current, onPick) {
    const wrap = document.createElement("div");
    wrap.className = "grp";
    wrap.innerHTML = `
      <div class="grp-hd">${svg(iconPath, "grp-ico")}<span>${escapeHtml(
      title
    )}</span></div>
      <div class="segs"></div>`;
    const segs = wrap.querySelector(".segs");
    options.forEach((opt) => {
      const b = document.createElement("button");
      const on = opt.value === current;
      b.className = "seg" + (on ? " on" : "");
      b.type = "button";
      b.textContent = opt.label;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.addEventListener("click", () => onPick(opt.value));
      segs.appendChild(b);
    });
    return wrap;
  }

  _renderSettingsSheet() {
    const ent = this._resolveEntities();
    const s = this._settings;
    const caps = this._caps();
    const sheet = this._el.sheet;
    /* Picking an option re-renders the whole sheet, so keep the scroll offset. */
    const scroll = sheet.scrollTop;

    sheet.innerHTML = `
      <div class="grab"></div>
      <div class="sheet-hd">
        <span>${escapeHtml(this._t("cleaning_settings"))}</span>
        <button class="icon-btn sheet-close">${svg(ICON.close)}</button>
      </div>
      <div class="sheet-body"></div>`;
    sheet
      .querySelector(".sheet-close")
      .addEventListener("click", () => this._closeSheet());
    const body = sheet.querySelector(".sheet-body");

    const geniusOn = s.cleangenius && s.cleangenius !== "off";

    /* CleanGenius takes over suction/water/mode entirely - the backend marks
       those properties unavailable while it is running. */
    if (caps.includes("cleangenius") && ent.cleangenius) {
      const opts = this._optionsFor(ent.cleangenius, {
        off: 0,
        routine_cleaning: 1,
        deep_cleaning: 2,
      }).map((v) => ({
        value: v,
        label: this._tState("select", "cleangenius", v),
      }));
      body.appendChild(
        this._group(this._t("cleangenius"), ICON.autofix, opts, s.cleangenius, (v) => {
          this._touch("cleangenius", v);
          this._renderSettingsSheet();
          this._renderChip();
        })
      );
    }

    if (geniusOn) {
      /* While CleanGenius is on the backend marks suction / water / cleaning
         mode unavailable, so the only thing left to choose is its own mode. */
      if (ent.cleangenius_mode && this._st(ent.cleangenius_mode)) {
        const opts = this._optionsFor(ent.cleangenius_mode, {}).map((v) => ({
          value: v,
          label: this._tState("select", "cleangenius_mode", v),
        }));
        if (opts.length) {
          body.appendChild(
            this._group(
              this._t("cleaning_mode"),
              ICON.broom,
              opts,
              s.cleangenius_mode,
              (v) => {
                this._touch("cleangenius_mode", v);
                this._renderSettingsSheet();
                this._renderChip();
              }
            )
          );
        }
      }
    } else {
      if (ent.cleaning_mode) {
        const opts = this._optionsFor(ent.cleaning_mode, MODE).map((v) => ({
          value: v,
          label: this._tState("select", "cleaning_mode", v),
        }));
        body.appendChild(
          this._group(
            this._t("cleaning_mode"),
            ICON.broom,
            opts,
            s.cleaning_mode,
            (v) => {
              this._touch("cleaning_mode", v);
              this._renderSettingsSheet();
              this._renderChip();
            }
          )
        );
      }

      if (ent.suction && !this._mopOnly()) {
        const opts = this._optionsFor(ent.suction, SUCTION).map((v) => ({
          value: v,
          label: this._tState("select", "suction_level", v),
        }));
        body.appendChild(
          this._group(this._t("suction_level"), ICON.fan, opts, s.suction, (v) => {
            this._touch("suction", v);
            this._renderSettingsSheet();
            this._renderChip();
          })
        );
      }

      const wet = this._wetEntity();
      if (wet && !this._sweepOnly()) {
        const opts = this._wetOptions(wet);
        if (opts.length) {
          body.appendChild(
            this._group(this._t(wet.key), ICON.water, opts, s.wet, (v) => {
              this._touch("wet", v);
              this._renderSettingsSheet();
              this._renderChip();
            })
          );
        }
      }

      /* A whole-map clean has no repeats field to carry them, so do not offer
         a control that would be silently dropped. */
      if (this._mode !== "all") {
        const repeatOpts = [1, 2, 3].map((n) => ({
          value: n,
          label: this._tState("select", "cleaning_times", "x" + n) || "x" + n,
        }));
        body.appendChild(
          this._group(this._t("repeats"), ICON.repeat, repeatOpts, s.repeats, (v) => {
            this._touch("repeats", v);
            this._renderSettingsSheet();
            this._renderChip();
          })
        );
      }
    }

    sheet.scrollTop = scroll;
  }

  /* ------------------------------------------------------------------ *
   * 5e-bis. Dock sheet
   *
   * Rows come from DOCK_ROWS, and a row is rendered only if its entity actually
   * resolved. That is the whole capability story: the integration decides what
   * exists for this model, the sheet just shows what it finds.
   * ------------------------------------------------------------------ */

  /* Name for a dock row: an explicit card string when the row declares one
     (several sensors ship no translation and would render as "Drying Left"),
     otherwise the entity's own translated name. */
  _dockLabel(row, st) {
    if (row.label) return this._t(row.label);

    /* Switch names arrive untranslated: the integration files their strings under
       `entity.toggle.*`, but HA resolves entity names from `entity.<domain>.*`, so
       every Vietnamese switch label in the repo is unreachable and friendly_name
       falls back to the English description name. Read the block the strings are
       actually in. Fixing it upstream means renaming that key in 41 files, which
       is a separate change; this keeps the sheet translated meanwhile. */
    if (row.dom === "switch" && this._hass && this._hass.localize) {
      const alt = this._hass.localize(
        `component.${INTEGRATION}.entity.toggle.${row.k}.name`
      );
      if (alt) return alt;
    }

    const fn = st && st.attributes && st.attributes.friendly_name;
    if (!fn) return row.k.replace(/_/g, " ");
    /* has_entity_name makes friendly_name "<device> <entity>", and repeating the
       device name on every row of the sheet is just noise. */
    const vac = this._st(this._config.entity);
    const device =
      (vac && vac.attributes && vac.attributes.friendly_name) ||
      this._config.name;
    if (device && fn.length > device.length && fn.startsWith(device)) {
      return fn.slice(device.length).trim() || fn;
    }
    return fn;
  }

  _dockRowShell(label, extraClass) {
    const el = document.createElement("div");
    el.className = "drow" + (extraClass ? " " + extraClass : "");
    el.innerHTML = `<span class="drow-lbl"></span><span class="drow-val"></span>`;
    el.querySelector(".drow-lbl").textContent = label;
    return el;
  }

  /* Read-only value. Sensor states get run through the entity's own state
     translations so "washing" shows as "Đang giặt", not the raw enum. */
  _dockStat(row, id) {
    const st = this._st(id);
    if (!st) return null;
    const el = this._dockRowShell(this._dockLabel(row, st));
    let text;
    if (this._hass.formatEntityState) {
      text = this._hass.formatEntityState(st);
    } else {
      text =
        this._tState(row.dom, row.k, st.state) ||
        st.state + (st.attributes.unit_of_measurement || "");
    }
    el.querySelector(".drow-val").textContent = text;
    return el;
  }

  _dockBar(row, id) {
    const st = this._st(id);
    if (!st) return null;
    const pct = clamp(Number(st.state), 0, 100);
    if (!Number.isFinite(pct)) return this._dockStat(row, id);
    const el = this._dockRowShell(this._dockLabel(row, st), "drow-bar");
    el.querySelector(".drow-val").textContent = pct + "%";
    const bar = document.createElement("span");
    bar.className = "dbar";
    bar.innerHTML = `<span class="dbar-fill"></span>`;
    bar.querySelector(".dbar-fill").style.width = pct + "%";
    el.appendChild(bar);
    return el;
  }

  /* Percentage-left plus its reset button. Rendered even when the reset button
     is missing, because the wear figure is useful on its own. */
  _dockWear(row, id, ent) {
    const st = this._st(id);
    if (!st) return null;
    const pct = Number(st.state);
    const el = this._dockRowShell(this._dockLabel(row, st), "drow-bar");
    el.querySelector(".drow-val").textContent = Number.isFinite(pct)
      ? pct + "%"
      : st.state;
    if (Number.isFinite(pct)) {
      const bar = document.createElement("span");
      bar.className = "dbar" + (pct <= 10 ? " low" : "");
      bar.innerHTML = `<span class="dbar-fill"></span>`;
      bar.querySelector(".dbar-fill").style.width = clamp(pct, 0, 100) + "%";
      el.appendChild(bar);
    }
    const resetId = row.reset && ent.dock["button." + row.reset];
    if (resetId) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dbtn dbtn-quiet";
      b.textContent = this._t("reset");
      b.addEventListener("click", () => this._dockPress(resetId));
      el.appendChild(b);
    }
    return el;
  }

  _dockToggle(row, id) {
    const st = this._st(id);
    if (!st || st.state === "unavailable") return null;
    const on = st.state === "on";
    const el = this._dockRowShell(this._dockLabel(row, st));
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "dsw" + (on ? " on" : "");
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-checked", on ? "true" : "false");
    sw.innerHTML = `<span class="dsw-knob"></span>`;
    sw.addEventListener("click", () => {
      this._call("switch", on ? "turn_off" : "turn_on", { entity_id: id });
    });
    el.querySelector(".drow-val").replaceWith(sw);
    return el;
  }

  /* Selects reuse the segmented picker the cleaning sheet already uses, so the
     two sheets do not end up looking like different apps - but only while the
     options fit. mop_clean_frequency ships 13 of them (by-room plus every area
     step in m2 and sq ft), which as pills is an unreadable wall; past the
     threshold it becomes a native dropdown, which also gets the platform picker
     on a phone. Driven by the live option count, so a model with a longer or
     shorter list is handled without special-casing its key. */
  _dockSelect(row, id) {
    const st = this._st(id);
    if (!st || st.state === "unavailable") return null;
    const options = this._optionsFor(id, {});
    if (!options.length) return null;
    const opts = options.map((v) => ({
      value: v,
      label: this._tState("select", row.k, v) || String(v),
    }));

    if (row.dropdown || opts.length > SELECT_MAX_SEGMENTS) {
      return this._dockDropdown(row, id, st, opts);
    }
    /* Fall back to the group's own icon rather than a generic one, so a washing
       picker gets the washing glyph instead of an arbitrary wand. */
    const grp = DOCK_GROUPS.find(([g]) => g === row.grp);
    return this._group(
      this._dockLabel(row, st),
      ICON[row.icon] || (grp && ICON[grp[1]]) || ICON.autofix,
      opts,
      st.state,
      (v) => this._selectOption(id, v)
    );
  }

  _dockDropdown(row, id, st, opts) {
    const el = this._dockRowShell(this._dockLabel(row, st));
    const sel = document.createElement("select");
    sel.className = "dsel";
    for (const o of opts) {
      const op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      if (o.value === st.state) op.selected = true;
      sel.appendChild(op);
    }
    sel.addEventListener("change", () => this._selectOption(id, sel.value));
    el.querySelector(".drow-val").replaceWith(sel);
    return el;
  }

  /* Stepper rather than a slider: these are all coarse values (minutes, m2) and
     a drag target is awkward inside a scrolling sheet. */
  _dockNumber(row, id) {
    const st = this._st(id);
    if (!st || st.state === "unavailable") return null;
    const cur = Number(st.state);
    if (!Number.isFinite(cur)) return null;
    const a = st.attributes || {};
    const step = Number(a.step) || 1;
    const min = a.min != null ? Number(a.min) : 0;
    const max = a.max != null ? Number(a.max) : 100;
    const unit = a.unit_of_measurement ? " " + a.unit_of_measurement : "";

    const el = this._dockRowShell(this._dockLabel(row, st), "drow-step");
    const wrap = document.createElement("span");
    wrap.className = "dstep";
    const mk = (icon, delta) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dbtn dbtn-step";
      b.innerHTML = svg(icon);
      const next = clamp(cur + delta, min, max);
      b.toggleAttribute("disabled", next === cur);
      b.addEventListener("click", () =>
        this._call("number", "set_value", { entity_id: id, value: next })
      );
      return b;
    };
    const val = document.createElement("span");
    val.className = "dstep-val";
    val.textContent = cur + unit;
    wrap.appendChild(mk(ICON.minus, -step));
    wrap.appendChild(val);
    wrap.appendChild(mk(ICON.plus, step));
    el.querySelector(".drow-val").replaceWith(wrap);
    return el;
  }

  _dockAction(row, id) {
    const st = this._st(id);
    if (!st || st.state === "unavailable") return null;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dbtn dbtn-act";
    b.innerHTML = svg(ICON[row.icon] || ICON.autorenew, "dbtn-ico");
    const span = document.createElement("span");
    span.textContent = this._t(row.label);
    b.appendChild(span);
    b.addEventListener("click", () => this._dockPress(id));
    return b;
  }

  async _dockPress(id) {
    try {
      await this._call("button", "press", { entity_id: id });
    } catch (err) {
      this._toast(err.message || String(err));
    }
  }

  _renderDockSheet() {
    const ent = this._resolveEntities();
    const dock = (ent && ent.dock) || {};
    const sheet = this._el.sheet;
    const scroll = sheet.scrollTop;
    const tab = this._dockTab || "controls";

    sheet.innerHTML = `
      <div class="grab"></div>
      <div class="sheet-hd">
        <span></span>
        <button class="icon-btn sheet-close">${svg(ICON.close)}</button>
      </div>
      <div class="tabs dock-tabs" role="tablist"></div>
      <div class="sheet-body dock-body"></div>`;
    sheet.querySelector(".sheet-hd span").textContent = this._t("dock_station");
    sheet
      .querySelector(".sheet-close")
      .addEventListener("click", () => this._closeSheet());

    const tabsEl = sheet.querySelector(".dock-tabs");
    DOCK_TABS.forEach((name) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (name === tab ? " on" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", name === tab ? "true" : "false");
      b.textContent = this._t("dock_tab_" + name);
      b.addEventListener("click", () => {
        this._dockTab = name;
        this._renderDockSheet();
      });
      tabsEl.appendChild(b);
    });

    const body = sheet.querySelector(".dock-body");
    const rowsFor = (name) => DOCK_ROWS.filter((r) => r.tab === name);

    const build = (row) => {
      const id = dock[row.dom + "." + row.k];
      if (!id) return null;
      switch (row.kind) {
        case "action":
          return this._dockAction(row, id);
        case "toggle":
          return this._dockToggle(row, id);
        case "select":
          return this._dockSelect(row, id);
        case "number":
          return this._dockNumber(row, id);
        case "bar":
          return this._dockBar(row, id);
        case "wear":
          return this._dockWear(row, id, ent);
        default:
          return this._dockStat(row, id);
      }
    };

    let painted = 0;
    if (tab === "controls") {
      /* Actions first inside each group, then its settings - "do it now" is the
         reason people open this sheet, the knobs are the rarer visit. */
      for (const [grp, icon] of DOCK_GROUPS) {
        const rows = rowsFor("controls").filter((r) => r.grp === grp);
        const acts = [];
        const rest = [];
        for (const row of rows) {
          const node = build(row);
          if (!node) continue;
          (row.kind === "action" ? acts : rest).push(node);
        }
        if (!acts.length && !rest.length) continue;
        const hd = document.createElement("div");
        hd.className = "dgrp-hd";
        hd.innerHTML = svg(ICON[icon] || ICON.autofix, "grp-ico");
        const t = document.createElement("span");
        t.textContent = this._t("dock_grp_" + grp);
        hd.appendChild(t);
        body.appendChild(hd);
        if (acts.length) {
          const strip = document.createElement("div");
          strip.className = "dacts";
          acts.forEach((n) => strip.appendChild(n));
          body.appendChild(strip);
        }
        rest.forEach((n) => body.appendChild(n));
        painted += acts.length + rest.length;
      }
    } else {
      for (const row of rowsFor(tab)) {
        const node = build(row);
        if (!node) continue;
        body.appendChild(node);
        painted++;
      }
    }

    if (!painted) {
      const empty = document.createElement("div");
      empty.className = "dempty";
      empty.textContent = this._t("dock_empty");
      body.appendChild(empty);
    }

    sheet.scrollTop = scroll;
  }

  _renderRoomSheet() {
    const id = this._roomSheetId;
    const rooms = this._rooms() || {};
    const room = rooms[String(id)];
    if (!room) return this._closeSheet();

    const ent = this._resolveEntities();
    const wet = this._wetEntity();
    const sheet = this._el.sheet;
    const scroll = sheet.scrollTop;
    /* Seed the draft from what the map already stores for this room, so saving
       without touching a control is a no-op rather than a silent overwrite. */
    const seedWet = () => {
      if (!wet) return null;
      if (wet.kind === "number") {
        return room.wetness_level != null ? String(room.wetness_level) : null;
      }
      return keyOf(wet.map, room.water_volume) || null;
    };
    const draft = (this._roomDraft = this._roomDraft &&
    this._roomDraft.id === id
      ? this._roomDraft
      : {
          id,
          suction: keyOf(SUCTION, room.suction_level) || null,
          wet: seedWet(),
          repeats: room.cleaning_times || 1,
        });

    sheet.innerHTML = `
      <div class="grab"></div>
      <div class="sheet-hd">
        <span>${escapeHtml(room.name || this._t("room_settings"))}</span>
        <button class="icon-btn sheet-close">${svg(ICON.close)}</button>
      </div>
      <div class="sheet-body"></div>
      <div class="sheet-ft">
        <button class="btn ghost sheet-cancel"></button>
        <button class="btn primary sheet-save"></button>
      </div>`;
    sheet
      .querySelector(".sheet-close")
      .addEventListener("click", () => this._closeSheet());
    const cancel = sheet.querySelector(".sheet-cancel");
    cancel.textContent = this._t("cancel");
    cancel.addEventListener("click", () => {
      this._roomDraft = null;
      this._closeSheet();
    });
    const save = sheet.querySelector(".sheet-save");
    save.textContent = this._t("save");
    save.addEventListener("click", () => this._saveRoomSettings());

    const body = sheet.querySelector(".sheet-body");

    if (ent.suction) {
      const opts = this._optionsFor(ent.suction, SUCTION).map((v) => ({
        value: v,
        label: this._tState("select", "suction_level", v),
      }));
      body.appendChild(
        this._group(this._t("suction_level"), ICON.fan, opts, draft.suction, (v) => {
          draft.suction = v;
          this._renderRoomSheet();
        })
      );
    }
    if (wet) {
      const opts = this._wetOptions(wet);
      if (opts.length) {
        body.appendChild(
          this._group(this._t(wet.key), ICON.water, opts, draft.wet, (v) => {
            draft.wet = v;
            this._renderRoomSheet();
          })
        );
      }
    }
    const repeatOpts = [1, 2, 3].map((n) => ({
      value: n,
      label: this._tState("select", "cleaning_times", "x" + n) || "x" + n,
    }));
    body.appendChild(
      this._group(this._t("repeats"), ICON.repeat, repeatOpts, draft.repeats, (v) => {
        draft.repeats = v;
        this._renderRoomSheet();
      })
    );

    sheet.scrollTop = scroll;
  }

  async _saveRoomSettings() {
    const d = this._roomDraft;
    if (!d) return this._closeSheet();
    const wet = this._wetEntity();
    const rooms = this._rooms() || {};
    const room = rooms[String(d.id)] || {};

    /* suction_level / water_volume / repeats are Required by the service schema
       even when unchanged, so fall back to what the map already holds rather
       than to an invented constant. wetness devices additionally need the
       optional wetness_level field - water_volume alone is ignored there. */
    const wetVal = this._wetValue(wet, d.wet);
    const data = {
      segment_id: [d.id],
      suction_level: [SUCTION[d.suction] ?? room.suction_level ?? 1],
      water_volume: [
        (wet && wet.kind === "select" ? wetVal : null) ?? room.water_volume ?? 2,
      ],
      repeats: [d.repeats || room.cleaning_times || 1],
    };
    if (wet && wet.kind === "number" && wetVal != null) {
      data.wetness_level = [wetVal];
    }
    try {
      await this._call(INTEGRATION, "vacuum_set_custom_cleaning", data);
      this._roomDraft = null;
      this._closeSheet();
    } catch (err) {
      this._toast(err.message || String(err));
    }
  }

  /* ------------------------------------------------------------------ *
   * 5f. Commands
   * ------------------------------------------------------------------ */

  _call(domain, service, data) {
    return this._hass.callService(domain, service, data || {}, {
      entity_id: this._config.entity,
    });
  }

  /* vacuum_set_cleaning_sequence is a WHOLE-MAP write, not a partial one: the
     map editor gives every segment missing from the list order 0 (v1 maps) or
     shoves it to the tail in key order (v2), and that is persisted to the robot.
     Sending only the tapped rooms would therefore wipe the user's configured
     order for every room they did not tap. So send a complete ordering: the
     selection first, then everything else in its existing relative order. */
  _fullSequence() {
    const rooms = this._rooms() || {};
    const selected = this._selection.slice();
    const rest = Object.keys(rooms)
      .map(Number)
      .filter((id) => !selected.includes(id))
      .sort((a, b) => {
        const oa = rooms[String(a)].order || 0;
        const ob = rooms[String(b)].order || 0;
        if (oa && ob) return oa - ob;
        if (oa) return -1;
        if (ob) return 1;
        return a - b;
      });
    return selected.concat(rest);
  }

  _selectOption(entityId, option) {
    if (!entityId || !this._st(entityId)) return Promise.resolve();
    const st = this._st(entityId);
    if (st.state === option) return Promise.resolve();
    if (st.state === "unavailable" || st.state === "unknown") {
      return Promise.resolve();
    }
    return this._hass.callService(
      "select",
      "select_option",
      { option },
      { entity_id: entityId }
    );
  }

  /* Sends the robot home, or aborts the trip if it is already on its way. There
     is no "cancel return" service, so pause is what stops it mid-return. */
  async _onReturn() {
    const vac = this._st(this._config.entity);
    const returning = vac && vac.state === "returning";
    try {
      await this._call("vacuum", returning ? "pause" : "return_to_base");
    } catch (err) {
      this._toast(err.message || String(err));
    }
  }

  async _onStart() {
    const vac = this._st(this._config.entity);
    const attrs = this._vacAttrs();
    if (!vac) return;

    if (this._isRunning(vac, attrs)) {
      try {
        await this._call("vacuum", "pause");
      } catch (err) {
        this._toast(err.message || String(err));
      }
      return;
    }

    this._busy = true;
    this._renderActions(vac, attrs);
    try {
      await this._startJob(attrs);
      if (this._mode === "rooms") this._selection = [];
      if (this._mode === "zones") this._clearZones();
    } catch (err) {
      /* The integration converts its exceptions into readable HomeAssistantError
         messages, so surfacing err.message is genuinely useful here. */
      this._toast(err.message || String(err));
    } finally {
      this._busy = false;
      this._update();
    }
  }

  async _startJob(attrs) {
    const ent = this._resolveEntities();
    const s = this._settings;
    const caps = this._caps();
    const wet = this._wetEntity();
    const geniusOn = s.cleangenius && s.cleangenius !== "off";

    /* Resuming a paused job must not re-apply settings. */
    if (this._isPaused(this._st(this._config.entity), attrs)) {
      return this._call("vacuum", "start");
    }

    /* 1. Mode / CleanGenius. These cannot ride in the clean payload, and
          CleanGenius silently overrides suction+water if left on. */
    if (ent.cleangenius) {
      await this._selectOption(ent.cleangenius, geniusOn ? s.cleangenius : "off");
    }
    if (geniusOn) {
      if (ent.cleangenius_mode && s.cleangenius_mode) {
        await this._selectOption(ent.cleangenius_mode, s.cleangenius_mode);
      }
    } else if (ent.cleaning_mode && s.cleaning_mode) {
      await this._selectOption(ent.cleaning_mode, s.cleaning_mode);
    }

    /* Only segment cleaning can carry suction/water per job. For whole-map and
       zone runs the robot uses its globals, so apply the chosen values there or
       the settings chip would be advertising something that never happens.
       (clean_zone overwrites those globals itself anyway.) */
    if (!geniusOn && this._mode !== "rooms") {
      if (ent.suction && s.suction && !this._mopOnly()) {
        await this._selectOption(ent.suction, s.suction);
      }
      if (wet && s.wet && !this._sweepOnly()) {
        await this._applyWet(wet, s.wet);
      }
    }

    if (this._mode === "all") {
      return this._call("vacuum", "start");
    }

    if (this._mode === "zones") {
      const data = { zone: this._zones, repeats: s.repeats || 1 };
      /* Deliberately omitting suction/water: clean_zone writes them back to the
         global entities, which would permanently change the robot's settings. */
      return this._call(INTEGRATION, "vacuum_clean_zone", data);
    }

    /* rooms */
    if (!this._selection.length) return;

    /* 2. Commit the tap order. On devices with customized_cleaning the order
          field inside the clean payload is forced to 1, so the sequence has to
          be written separately - and only while the robot is idle. */
    if (caps.includes("customized_cleaning")) {
      try {
        await this._call(INTEGRATION, "vacuum_set_cleaning_sequence", {
          cleaning_sequence: this._fullSequence(),
        });
      } catch (err) {
        this._toast(err.message || String(err));
      }
    }

    /* 3. Start. suction/water/repeats DO ride in this payload; anything null
          is simply omitted so the robot keeps whatever it already had. */
    const n = this._selection.length;
    const data = { segments: this._selection.slice() };
    if (!geniusOn) {
      data.repeats = new Array(n).fill(s.repeats || 1);
      if (s.suction && SUCTION[s.suction] != null && !this._mopOnly()) {
        data.suction_level = new Array(n).fill(SUCTION[s.suction]);
      }
      if (wet && s.wet && !this._sweepOnly()) {
        const v = this._wetValue(wet, s.wet);
        if (v != null) {
          /* The payload has no wetness slot, so wetness devices need the global
             number set instead - otherwise the choice is silently dropped. */
          if (wet.kind === "number") await this._applyWet(wet, s.wet);
          else data.water_volume = new Array(n).fill(v);
        }
      }
    }
    return this._call(INTEGRATION, "vacuum_clean_segment", data);
  }

  _applyWet(wet, value) {
    if (!wet || value == null) return Promise.resolve();
    if (wet.kind === "number") {
      const v = this._wetValue(wet, value);
      const st = this._st(wet.id);
      if (v == null || !st || st.state === "unavailable") return Promise.resolve();
      if (Number(st.state) === v) return Promise.resolve();
      return this._hass.callService(
        "number",
        "set_value",
        { value: v },
        { entity_id: wet.id }
      );
    }
    return this._selectOption(wet.id, value);
  }

  /* ---- toast -------------------------------------------------------- */

  _toast(msg) {
    if (!msg) return;
    const el = this._el.toast;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove("show"), 5000);
  }
}

/* ------------------------------------------------------------------ *
 * 6. Config editor
 * ------------------------------------------------------------------ */

class DreameSmartVacuumCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => {
        fireEvent(this, "config-changed", { config: ev.detail.value });
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = [
      { name: "entity", required: true, selector: { entity: { domain: "vacuum" } } },
      { name: "camera", selector: { entity: { domain: "camera" } } },
      { name: "name", selector: { text: {} } },
      { name: "show_map", selector: { boolean: {} } },
      {
        name: "map_height",
        selector: { number: { min: 160, max: 900, mode: "slider" } },
      },
    ];
    this._form.computeLabel = (s) =>
      ({
        entity: "Vacuum entity",
        camera: "Map camera (optional)",
        name: "Name",
        show_map: "Show map",
        map_height: "Map height (px)",
      }[s.name] || s.name);
  }
}

/* ------------------------------------------------------------------ *
 * 7. Styles
 * ------------------------------------------------------------------ */

const STYLES = `
:host { display: block; }

.dv {
  /* Set explicitly rather than inheriting it from ha-card: the bottom sheet is
     absolutely positioned against this element, and an inline containing block
     collapses it to a sliver. */
  display: block;
  --dv-radius: 22px;
  --dv-surface: var(--card-background-color, #fff);
  --dv-sunken: var(--secondary-background-color, #f2f3f5);
  --dv-text: var(--primary-text-color, #202124);
  --dv-dim: var(--secondary-text-color, #70757a);
  --dv-accent: var(--primary-color, #3b6ef5);
  --dv-warm: #f2b230;
  --dv-line: var(--divider-color, rgba(0,0,0,.09));
  position: relative;
  overflow: hidden;
  padding: 14px 14px 16px;
}

/* ---------- header ---------- */
.hdr { display: flex; align-items: center; gap: 12px; padding: 2px 4px 12px; }
.hdr-main { flex: 1; min-width: 0; }
.title {
  font-size: 1.05rem; font-weight: 600; color: var(--dv-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.subtitle {
  font-size: .82rem; color: var(--dv-dim); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.batt {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 12px 6px 10px; border-radius: 999px;
  background: var(--dv-sunken); flex: none;
}
.batt-shell {
  position: relative; width: 26px; height: 13px; border-radius: 4px;
  border: 1.6px solid var(--dv-dim); box-sizing: border-box;
}
.batt-shell::after {
  content: ""; position: absolute; right: -4px; top: 3.5px;
  width: 2.4px; height: 4px; border-radius: 0 2px 2px 0;
  background: var(--dv-dim);
}
.batt-fill {
  position: absolute; inset: 1.4px; width: 0;
  border-radius: 2px; background: #34a853; transition: width .35s ease;
}
.batt.charging .batt-fill { background: var(--dv-warm); }
.batt.low .batt-fill { background: #ea4335; }
.batt-txt { font-size: .82rem; font-weight: 600; color: var(--dv-text); font-variant-numeric: tabular-nums; }

/* ---------- map ---------- */
/* The image and the overlay must letterbox identically, otherwise every tap
   maps to the wrong room: object-fit contain on the img and
   preserveAspectRatio xMidYMid meet on the svg produce the same box, which
   _imageRect() then reproduces in client space for hit testing. */
.stage {
  position: relative; width: 100%;
  height: var(--map-h, 320px);
  border-radius: 18px; background: var(--dv-sunken);
  overflow: hidden; touch-action: none; user-select: none;
}
.stage img.map {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: contain; pointer-events: none;
}
.ovl { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ovl .room {
  fill: var(--rc, #8ecaf7); fill-opacity: .34;
  stroke: var(--rc, #8ecaf7); stroke-width: 3; stroke-linejoin: round;
  transition: fill-opacity .18s ease;
}
.ovl .room.sel { fill-opacity: .55; stroke-width: 4; }
.ovl .room.act { fill-opacity: .3; stroke-dasharray: 10 7; }
/* Dark numerals on the pastel room colour. White numerals look closer to the
   app but land at ~1.5:1 on the yellow and green rooms, which is unreadable. */
.ovl .badge circle { fill: var(--rc, #8ecaf7); stroke: #fff; }
.ovl .badge text {
  fill: #1b1f27; font-weight: 700; text-anchor: middle;
  dominant-baseline: central; font-family: inherit;
}
.ovl .zone {
  fill: var(--dv-accent); fill-opacity: .22;
  stroke: var(--dv-accent); stroke-width: 3;
}
.ovl .zone.draft { stroke-dasharray: 8 6; }
/* The selected zone reads as picked-up: denser fill, heavier edge. */
.ovl .zone.sel { fill-opacity: .34; stroke-width: 5; }
.ovl .zgrip {
  fill: #fff; stroke: var(--dv-accent); stroke-width: 3;
}
.ovl .zdel circle { fill: #e5533d; }
.ovl .zdel path {
  stroke: #fff; stroke-width: 2.6; stroke-linecap: round; fill: none;
}
.stage-msg { position: absolute; color: var(--dv-dim); font-size: .86rem; }
.side { position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 1px; }
.side-btn {
  width: 38px; height: 38px; border: 0; border-radius: 12px; cursor: pointer;
  background: var(--dv-surface); color: var(--dv-text);
  box-shadow: 0 2px 8px rgba(0,0,0,.14);
  display: grid; place-items: center;
}
.side-btn svg { width: 20px; height: 20px; fill: currentColor; }

/* ---------- room list ----------
   The keyboard/screen-reader path to the same selection the map taps drive,
   and it spells the cleaning order out as text. */
.roomlist {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 12px 2px 0;
}
.rchip {
  display: inline-flex; align-items: center; gap: 7px;
  min-height: 40px; padding: 8px 14px;
  border: 1.5px solid var(--dv-line); border-radius: 14px;
  background: var(--dv-surface); color: var(--dv-text);
  font: inherit; font-size: .83rem; cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.rchip.on { border-color: var(--rc, var(--dv-accent)); font-weight: 600; }
.rchip:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.rchip-n {
  display: grid; place-items: center; flex: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--rc, var(--dv-accent)); color: #1b1f27;
  font-size: .72rem; font-weight: 700;
}
.rchip-t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 12rem; }

/* ---------- hint ---------- */
.hintrow {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 10px 8px 0; flex-wrap: wrap;
}
.hint { text-align: center; font-size: .8rem; color: var(--dv-dim); }
.linkbtn {
  border: 0; background: none; cursor: pointer; font: inherit;
  font-size: .8rem; font-weight: 600; color: var(--dv-accent);
  padding: 2px 4px; border-radius: 8px;
}
.linkbtn:hover { text-decoration: underline; }
.linkbtn:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }

/* ---------- custom chip ---------- */
.chip {
  margin: 12px 0 0; display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 12px 10px 14px; border: 0; cursor: pointer;
  border-radius: 16px; background: var(--dv-surface); color: var(--dv-text);
  box-shadow: 0 2px 10px rgba(0,0,0,.12); font: inherit; font-size: .84rem;
  max-width: 100%;
}
.chip-ico { width: 19px; height: 19px; fill: var(--dv-text); flex: none; }
.chip-chev { width: 17px; height: 17px; fill: var(--dv-dim); flex: none; }
.chip-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---------- panel ---------- */
.panel {
  margin-top: 12px; border-radius: 20px; background: var(--dv-surface);
  box-shadow: 0 2px 14px rgba(0,0,0,.10); overflow: hidden;
}
.tabs {
  position: relative; display: flex; margin: 10px 10px 4px;
  background: var(--dv-sunken); border-radius: 13px; padding: 4px;
}
.tab {
  position: relative; z-index: 1; flex: 1; border: 0; background: none;
  cursor: pointer; font: inherit; font-size: .84rem; font-weight: 500;
  color: var(--dv-dim); padding: 8px 4px; border-radius: 10px;
  transition: color .18s ease; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.tab.on { color: var(--dv-text); font-weight: 600; }
.tab.gone { display: none; }
.tab-ind {
  position: absolute; top: 4px; bottom: 4px; left: 4px;
  width: 33.33%; border-radius: 10px; background: var(--dv-surface);
  box-shadow: 0 1px 4px rgba(0,0,0,.14);
  transition: transform .22s cubic-bezier(.4,0,.2,1);
}
.tabs > .tab-ind { z-index: 0; }
.tab-ind.gone { display: none; }

.acts { display: flex; align-items: stretch; padding: 4px 6px 8px; }
.act {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 9px;
  border: 0; background: none; cursor: pointer; font: inherit;
  font-size: .92rem; font-weight: 600; color: var(--dv-text);
  padding: 14px 6px; border-radius: 14px;
  transition: background .15s ease, opacity .15s ease;
}
.act:hover:not([disabled]) { background: var(--dv-sunken); }
.act[disabled] { opacity: .38; cursor: default; }
.act-ico { width: 22px; height: 22px; flex: none; }
.act-start .act-ico { fill: var(--dv-warm); }
.act-dock .act-ico { fill: var(--dv-accent); }
.act-sep { width: 1px; background: var(--dv-line); margin: 12px 0; flex: none; }
.act-txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ---------- sheet ---------- */
.scrim {
  position: absolute; inset: 0; background: rgba(0,0,0,.32);
  opacity: 0; pointer-events: none; transition: opacity .22s ease; z-index: 5;
}
.scrim.open { opacity: 1; pointer-events: auto; }
.sheet {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 6;
  background: var(--dv-surface); border-radius: 22px 22px var(--dv-radius) var(--dv-radius);
  transform: translateY(102%); transition: transform .26s cubic-bezier(.4,0,.2,1);
  max-height: 88%; overflow-y: auto;
  box-shadow: 0 -6px 26px rgba(0,0,0,.18);
}
.sheet.open { transform: translateY(0); }
.grab {
  width: 38px; height: 4px; border-radius: 2px; background: var(--dv-line);
  margin: 10px auto 4px;
}
.sheet-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 8px 4px 18px; font-size: .98rem; font-weight: 600;
}
.icon-btn {
  border: 0; background: none; cursor: pointer; padding: 8px;
  border-radius: 50%; display: grid; place-items: center; color: var(--dv-dim);
}
.icon-btn svg { width: 20px; height: 20px; fill: currentColor; }
.sheet-body { padding: 4px 16px 16px; }
.grp { margin-top: 14px; }
.grp-hd {
  display: flex; align-items: center; gap: 8px;
  font-size: .8rem; color: var(--dv-dim); margin-bottom: 8px;
}
.grp-ico { width: 17px; height: 17px; fill: currentColor; flex: none; }
.segs { display: flex; flex-wrap: wrap; gap: 8px; }
.seg {
  border: 1.5px solid var(--dv-line); background: var(--dv-surface);
  color: var(--dv-text); border-radius: 12px; padding: 9px 14px;
  min-height: 40px;
  cursor: pointer; font: inherit; font-size: .83rem;
  transition: border-color .15s ease, background .15s ease;
}
.seg:focus-visible, .tab:focus-visible, .act:focus-visible,
.chip:focus-visible, .side-btn:focus-visible, .btn:focus-visible {
  outline: 2px solid var(--dv-accent); outline-offset: 2px;
}
.seg.on {
  border-color: var(--dv-accent);
  background: var(--dv-sunken);
  background: color-mix(in srgb, var(--dv-accent) 12%, transparent);
  font-weight: 600;
}
/* ---------- dock sheet ---------- */
.ret-btn { flex: none; color: var(--dv-dim); }
.ret-btn:hover:not([disabled]) { color: var(--dv-accent); }
.ret-btn[disabled] { opacity: .32; cursor: default; }
/* The main tab strip animates a .tab-ind pill; these tabs are rebuilt on every
   render so they paint the selected state directly instead. */
.dock-tabs { margin: 2px 12px 4px; }
.dock-tabs .tab.on {
  background: var(--dv-surface);
  box-shadow: 0 1px 4px rgba(0,0,0,.14);
}
.dock-body { padding-bottom: 22px; }
.dgrp-hd {
  display: flex; align-items: center; gap: 8px;
  font-size: .8rem; color: var(--dv-dim);
  margin: 18px 0 8px;
}
.dgrp-hd:first-child { margin-top: 6px; }

/* action strip: wrapping pills, so a base with one action does not stretch it */
.dacts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.dbtn {
  display: inline-flex; align-items: center; gap: 7px;
  border: 1.5px solid var(--dv-line); background: var(--dv-surface);
  color: var(--dv-text); border-radius: 12px; padding: 9px 13px;
  min-height: 40px; cursor: pointer; font: inherit; font-size: .83rem;
  transition: border-color .15s ease, background .15s ease;
}
.dbtn:hover:not([disabled]) { border-color: var(--dv-accent); }
.dbtn[disabled] { opacity: .38; cursor: default; }
.dbtn:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.dbtn-ico { width: 18px; height: 18px; fill: var(--dv-accent); flex: none; }
.dbtn-quiet {
  padding: 5px 10px; min-height: 30px; font-size: .76rem;
  color: var(--dv-dim); flex: none;
}
/* The bar takes a whole line, so the reset button wraps below it - push it to the
   right rather than leaving it stranded under the label. */
.drow-bar .dbtn-quiet { margin-left: auto; margin-top: 6px; }
.dbtn-step {
  width: 32px; height: 32px; min-height: 32px; padding: 0;
  justify-content: center; border-radius: 10px;
}
.dbtn-step svg { width: 16px; height: 16px; fill: currentColor; }

/* one label + one value per line; the bar and the reset button wrap under it */
.drow {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 0; border-bottom: 1px solid var(--dv-line);
  font-size: .85rem; color: var(--dv-text);
}
.drow:last-child { border-bottom: 0; }
.drow-lbl { flex: 1; min-width: 0; }
.drow-val { color: var(--dv-dim); text-align: right; flex: none; }
.drow-bar { flex-wrap: wrap; }
.dbar {
  flex: 1 0 100%; height: 5px; border-radius: 3px;
  background: var(--dv-sunken); overflow: hidden;
}
.dbar-fill { display: block; height: 100%; background: var(--dv-accent); }
.dbar.low .dbar-fill { background: #e5533d; }
.dsel {
  flex: none; max-width: 58%;
  border: 1.5px solid var(--dv-line); border-radius: 11px;
  background: var(--dv-surface); color: var(--dv-text);
  font: inherit; font-size: .82rem; padding: 7px 9px; cursor: pointer;
}
.dsel:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.dstep { display: inline-flex; align-items: center; gap: 8px; flex: none; }
.dstep-val {
  min-width: 62px; text-align: center; color: var(--dv-text);
  font-variant-numeric: tabular-nums;
}

/* switch: a plain button, so it needs no ha-switch dependency */
.dsw {
  flex: none; width: 42px; height: 25px; border-radius: 13px; border: 0;
  background: var(--dv-sunken); cursor: pointer; padding: 0;
  position: relative; transition: background .18s ease;
}
.dsw.on { background: var(--dv-accent); }
.dsw:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.dsw-knob {
  position: absolute; top: 3px; left: 3px;
  width: 19px; height: 19px; border-radius: 50%;
  background: #fff; transition: transform .18s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,.3);
}
.dsw.on .dsw-knob { transform: translateX(17px); }
.dempty {
  padding: 26px 4px; text-align: center;
  color: var(--dv-dim); font-size: .85rem;
}

.sheet-ft { display: flex; gap: 10px; padding: 0 16px 18px; }
.btn {
  flex: 1; border-radius: 14px; padding: 12px; border: 0; cursor: pointer;
  font: inherit; font-size: .88rem; font-weight: 600;
}
.btn.ghost { background: var(--dv-sunken); color: var(--dv-text); }
.btn.primary { background: var(--dv-accent); color: #fff; }

/* ---------- toast ---------- */
.toast {
  position: absolute; left: 16px; right: 16px; bottom: 16px; z-index: 8;
  background: rgba(32,33,36,.94); color: #fff; border-radius: 12px;
  padding: 12px 14px; font-size: .82rem; line-height: 1.35;
  opacity: 0; transform: translateY(8px); pointer-events: none;
  transition: opacity .2s ease, transform .2s ease;
}
.toast.show { opacity: 1; transform: translateY(0); }

.gone { display: none !important; }
.busy { cursor: progress; }

@media (prefers-color-scheme: dark) {
  .dv { --dv-line: rgba(255,255,255,.12); }
  .side-btn, .chip, .panel { box-shadow: 0 2px 10px rgba(0,0,0,.4); }
}
`;

/* ------------------------------------------------------------------ *
 * 8. Utilities used by the templates
 * ------------------------------------------------------------------ */

function svg(path, cls) {
  return `<svg viewBox="0 0 24 24"${
    cls ? ` class="${cls}"` : ""
  }><path d="${path}"/></svg>`;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

/* ------------------------------------------------------------------ *
 * 9. Registration
 *
 * The module is imported on every HA page, and a user upgrading from a manual
 * Lovelace resource may still have a stale copy, so guard every global write.
 * ------------------------------------------------------------------ */

if (!customElements.get("dreame-smart-vacuum-card")) {
  customElements.define("dreame-smart-vacuum-card", DreameSmartVacuumCard);
}
if (!customElements.get("dreame-smart-vacuum-card-editor")) {
  customElements.define("dreame-smart-vacuum-card-editor", DreameSmartVacuumCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "dreame-smart-vacuum-card")) {
  window.customCards.push({
    type: "dreame-smart-vacuum-card",
    name: "Dreame Smart Vacuum Card",
    description:
      "Dreame-app style daily driver: battery + status, tap rooms on the map, start cleaning.",
    preview: true,
    documentationURL: "https://github.com/ducdt1298/dreame-smart-vacuum",
  });
}

// eslint-disable-next-line no-console
console.info(
  `%c DREAME-VACUUM-CARD %c ${CARD_VERSION} `,
  "color:#fff;background:#3b6ef5;border-radius:3px 0 0 3px",
  "color:#3b6ef5;background:#eef2ff;border-radius:0 3px 3px 0"
);
