# Dreame Smart Vacuum Card

A Lovelace card that mirrors the official Dreame app for the thing you actually do every
day: pick where to clean, and press start.

The integration already renders the map exactly like the app — room colours, name pills,
cleaning-order badges, per-room suction/water chips. This card supplies the chrome around
it: a quiet header, an interactive room picker, and a cleaning-settings sheet.

```yaml
type: custom:dreame-smart-vacuum-card
entity: vacuum.mo
```

That is the whole minimal config. Everything else is auto-discovered from the device.

## Installation

Nothing to install. The card ships inside the integration, which registers it as a frontend
module on startup — **no dashboard resource entry is needed**, in either storage or YAML
mode.

After updating the integration, hard-refresh the browser once (`Ctrl`/`Cmd` + `Shift` + `R`)
so the new module is picked up.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | **required** | The `vacuum.*` entity. |
| `camera` | string | auto | Map camera. Auto-discovered from the same device; set it to pin a specific saved map. |
| `name` | string | entity name | Header title. |
| `show_map` | boolean | `true` | Hide the map for a compact controls-only card. |
| `map_height` | number | `320` | Map area height in pixels. |

The card also has a visual editor, so all of the above are editable from the dashboard UI.

## The daily flow

### Header

Deliberately minimal — **battery and current status, nothing else**. The battery pill turns
amber while charging and red under 20%. Status text comes from the integration's own state
sensor, so it is already translated (`Đã sạc đầy`, `Đang quét`, `Đang về đế sạc`, …).

Area, cleaning time and the other counters are intentionally absent; they are available as
normal entities if you want them on a separate card.

### Where to clean

Three tabs, matching the app:

- **Phòng / Rooms** — tap rooms directly on the map, or use the room chips below it. Tap
  again to deselect.
- **Tất cả / All** — the whole map.
- **Khu vực / Zones** — drag on the map to draw a rectangle. Tap a drawn zone to remove it.
  Zones smaller than the robot's minimum (just over two map grid cells per side) are
  rejected as you draw, so the robot never bounces one back.

The Rooms tab hides itself when the map has no saved rooms (during fast-mapping, or before
the first map is saved), and both map-driven tabs hide when there is no usable map at all —
otherwise Start would sit permanently disabled with nothing to select.

### Room selection order *is* the cleaning order

The number on each selected room is its position in the queue — first tapped, first cleaned,
exactly like the app. Deselecting a room renumbers the rest. The same selection is mirrored
as a row of room chips under the map, so it also works by keyboard and reads correctly to a
screen reader.

Getting this to actually happen on the robot takes two calls, because the order field inside
the segment-cleaning payload is pinned to `1` on every device with the
`customized_cleaning` capability:

1. `dreame_smart_vacuum.vacuum_set_cleaning_sequence` commits the order to the map.
2. `dreame_smart_vacuum.vacuum_clean_segment` starts the job.

**The sequence call is a whole-map write, not a partial one.** The integration gives every
segment missing from the list order `0` (v1 maps) or pushes it to the tail (v2), and persists
that to the robot. Sending only the tapped rooms would therefore wipe the order of every
room you *didn't* tap. So the card always sends a complete ordering: your selection first,
then every remaining room in its existing relative order. Your untapped rooms keep their
configured sequence.

Step 1 is rejected by the robot while it is running — if it fails you get a toast and the
rooms are still cleaned, just in the robot's own order.

### Room outlines are pixel-exact

Room entity attributes only expose a bounding box, which is wrong for L-shaped and
interlocking rooms. The card instead fetches the real per-pixel segment mask from
`/api/camera_map_data_proxy/{camera}` once per map, traces exact outlines from it, and hit
tests against it — including the same outward spiral search the integration uses server
side, which is why tapping a wall still selects the adjacent room.

If that request fails the card silently degrades to bounding boxes plus
nearest-room-centre, so selection keeps working.

### Cleaning settings

The `Tùy chỉnh` chip opens a sheet with cleaning mode, suction level, mop pad humidity and
repeats. The wet control follows the hardware: a mop-pad-humidity select on self-wash bases,
a water-level select on older units, and the `wetness_level` number on the newest models
(shown as discrete steps, and sent via `number.set_value` because the cleaning payload has
no wetness field).

Turning **CleanGenius** on collapses the sheet to just its own mode — which matches the
backend, where CleanGenius marks suction, water and cleaning mode unavailable. The card also
explicitly sets CleanGenius to `off` before a manual run, because segment cleaning does *not*
disable it automatically and would otherwise ignore your suction and water choice.

### Start and Về sạc / Return to dock

The action row holds only commands for the robot: **Start** (which becomes Pause / Resume
while a job runs) and **Return to dock**.

The return button is stateful, which the earlier static one was not: it reads
`Dừng về sạc` and turns into a pause icon while the robot is on its way home, and it
disables itself when there is nothing to return from — parked on the dock, or busy washing
or drying on it. There is no "cancel return" service, so stopping a return is sent as
`vacuum.pause`.

## The dock sheet

The dock icon in the header opens a separate sheet for the base station. It is deliberately
*not* in the action row: the previous button was labelled with the noun "Đế sạc" yet only
sent `return_to_base`, which read as a promise of dock controls that did not exist.

Three tabs:

- **Điều khiển / Controls** — grouped by function (mop washing, drying, auto-empty, water
  tank, detergent). Each group leads with its one-shot actions — wash the mop now, dry now,
  empty the bin now, drain the water, clean the dock, self-repair — then its settings:
  toggles, segmented pickers, and steppers for the numeric ones.
- **Trạng thái / Status** — read-only. Base-station status, drying progress as a bar plus
  time remaining, auto-empty and dust-bag status, clean/dirty water tank, detergent, hot
  water, drainage, whether the tank and mop pad are fitted, and the low-water warning.
- **Vật tư / Supplies** — percentage left for detergent, squeegee, on-board dirty water
  tank, dirty water channel, deodorizer and scale inhibitor. Each bar turns red at 10% or
  less and carries its own **Đặt lại / Reset** button.

### Everything here is optional

The sheet is driven by a table of rows (`DOCK_ROWS` in the card), each naming an entity by
its `translation_key`. The integration gates every one of those entities behind a device
capability, so a machine without a wash base simply resolves fewer of them — the row
disappears, an empty group disappears, and a tab with nothing in it says so rather than
showing dead controls. **Never assume a row is present.**

For the same reason the ~60 dock entities are watched for changes only while the sheet is
open; watching them permanently would defeat the card's render early-out.

Two figures are intentionally left out: the `*_time_left` companions to each supply
percentage (days remaining), which would double the length of the Supplies tab for
information the percentage already conveys.

Suction is hidden in mop-only mode, and humidity is hidden in sweep-only mode.

### Per-room settings

**Long-press a room** on the map to set that room's suction, humidity and repeats
persistently, via `dreame_smart_vacuum.vacuum_set_custom_cleaning`. The map renderer then draws
those values as chips on the room, again like the app.

## Behaviour notes

- **Only room cleaning can carry per-job suction and water.** For All and Zone runs the
  robot uses its global settings, so the card writes your choices to the global entities
  first — otherwise the settings chip would be advertising something that never happens.
  (`vacuum_clean_zone` overwrites those globals itself regardless.)
- **The card never invents a value.** Suction, water and cleaning mode legitimately go
  `unavailable` — suction in mopping mode, everything under CleanGenius. When that happens
  the control is left blank and simply omitted from the request, rather than defaulting to
  a guess that would then be pushed onto the robot.
- **Settings follow the device until you change one.** After that, that single control stays
  on your value; `clean_segment` does not write back to the global selects, so mirroring
  them during a run would display stale values.
- **Repeats are hidden in All mode** because a whole-map clean has no field to carry them.
- The start button becomes **Tạm dừng** while running and **Tiếp tục** while paused, and
  resuming never re-applies settings. A robot that stopped on an error offers Resume, not
  Pause.
- Errors from the integration are surfaced verbatim in a toast — they are already
  human-readable.

## Example: full-width dashboard card

```yaml
type: custom:dreame-smart-vacuum-card
entity: vacuum.mo
map_height: 420
```

## Example: compact, no map

```yaml
type: custom:dreame-smart-vacuum-card
entity: vacuum.mo
show_map: false
```

## Troubleshooting

**The card does not exist / blank card.** Hard-refresh the browser. If it persists, check
that `/dreame_smart_vacuum/dreame-smart-vacuum-card.js` loads (open it directly) and look for
`DREAME-VACUUM-CARD` in the browser console. Extra frontend modules are skipped entirely
when Home Assistant boots in safe mode.

**"Bản đồ chưa sẵn sàng".** The map camera has no usable map yet, or calibration is not
available. Run a full clean or a fast map first.

**Rooms tab missing.** The current map has no saved rooms. Save the map from the app or the
integration first.

**Taps select the wrong room.** Ensure you are not overriding the card's CSS — the tap
transform depends on the map image keeping a uniform, uncropped scale.

## Tests

The transform, RLE mask decoding, hit testing and outline tracing have headless tests that
run against the shipped source with no dependencies:

```bash
node tests/card.test.js
```
