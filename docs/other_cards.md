# Using other Lovelace cards

The integration ships [its own card](card.md), but it exposes a standard `vacuum`
entity plus map cameras, so any Lovelace vacuum card works. These templates are
kept here for reference.

## Xiaomi Vacuum Map Card

[PiotrMachowski/lovelace-xiaomi-vacuum-map-card](https://github.com/PiotrMachowski/lovelace-xiaomi-vacuum-map-card)

Room and zone cleaning. Paste this into
[Developer tools → Template](https://my.home-assistant.io/redirect/developer_template/)
and copy the rendered result into your dashboard.

```yaml
{# ----------------- PROVIDE YOUR OWN ENTITY IDS HERE ----------------- #}
{% set camera_entity = "camera." %}
{% set vacuum_entity = "vacuum." %}
{# ------------------- DO NOT CHANGE ANYTHING BELOW ------------------- #}
{% set attributes = states[camera_entity].attributes %}

type: custom:xiaomi-vacuum-map-card
vacuum_platform: default
entity: {{ vacuum_entity }}
map_source:
  camera: {{ camera_entity }}
calibration_source:
  camera: true
map_modes:
  - template: vacuum_clean_zone
    max_selections: 10
    repeats_type: EXTERNAL
    max_repeats: 3
    service_call_schema:
      service: dreame_smart_vacuum.vacuum_clean_zone
      service_data:
        entity_id: '[[entity_id]]'
        zone: '[[selection]]'
        repeats: '[[repeats]]'
  - template: vacuum_clean_segment
    repeats_type: EXTERNAL
    max_repeats: 3
    service_call_schema:
      service: dreame_smart_vacuum.vacuum_clean_segment
      service_data:
        entity_id: '[[entity_id]]'
        segments: '[[selection]]'
        repeats: '[[repeats]]'
    predefined_selections:
{%- for room_id in attributes.rooms | default([]) %}
{%- set room = attributes.rooms[room_id] %}
      - id: {{room_id}}
        outline:
          - - {{room["x0"]}}
            - {{room["y0"]}}
          - - {{room["x0"]}}
            - {{room["y1"]}}
          - - {{room["x1"]}}
            - {{room["y1"]}}
          - - {{room["x1"]}}
            - {{room["y0"]}}
{%- endfor %}
  - name: Clean Spot
    icon: mdi:map-marker-plus
    max_repeats: 3
    selection_type: MANUAL_POINT
    repeats_type: EXTERNAL
    service_call_schema:
      service: dreame_smart_vacuum.vacuum_clean_spot
      service_data:
        entity_id: '[[entity_id]]'
        points: '[[selection]]'
        repeats: '[[repeats]]'
```

## Vacuum Card

[denysdovhan/vacuum-card](https://github.com/denysdovhan/vacuum-card)

```yaml
type: custom:vacuum-card
entity: # Your vacuum entity
map: # Map Entity
map_refresh: 1
stats:
  default:
    - attribute: filter_left
      unit: '%'
      subtitle: Filter
    - attribute: side_brush_left
      unit: '%'
      subtitle: Side brush
    - attribute: main_brush_left
      unit: '%'
      subtitle: Main brush
    - attribute: sensor_dirty_left
      unit: '%'
      subtitle: Sensors
  cleaning:
    - attribute: cleaned_area
      unit: m2
      subtitle: Cleaned area
    - attribute: cleaning_time
      unit: min
      subtitle: Cleaning time
shortcuts:
  - name: Clean Room 1
    service: dreame_smart_vacuum.vacuum_clean_segment
    service_data:
      entity_id: # Your vacuum entity
      segments: 1
    icon: mdi:sofa
  - name: Clean Room 2
    service: dreame_smart_vacuum.vacuum_clean_segment
    service_data:
      entity_id: # Your vacuum entity
      segments: 2
    icon: mdi:bed-empty
  - name: Clean Room 3
    service: dreame_smart_vacuum.vacuum_clean_segment
    service_data:
      entity_id: # Your vacuum entity
      segments: 3
    icon: mdi:silverware-fork-knife
```

## Valetudo Map Card

[Hypfer/lovelace-valetudo-map-card](https://github.com/Hypfer/lovelace-valetudo-map-card)

Enable the **Map Data** camera entity first. Map rotation does not work on this
card.

```yaml
type: custom:valetudo-map-card
vacuum: # Your vacuum name not the entity id
rotate: 0
dock_icon: mdi:lightning-bolt-circle
dock_color: rgb(105 178 141)
vacuum_color: rgb(110, 110, 110)
wall_color: rgb(159, 159, 159)
floor_color: rgb(221, 221, 221)
no_go_area_color: rgb(177, 0, 0)
no_mop_area_color: rgb(170, 47, 255)
virtual_wall_color: rgb(199, 0, 0)
virtual_wall_width: 1.5
currently_cleaned_zone_color: rgb(221, 221, 221)
path_color: rgb(255, 255, 255)
path_width: 1.5
segment_opacity: 1
segment_colors:
  - rgb(171, 199, 248)
  - rgb(249, 224, 125)
  - rgb(184, 227, 255)
  - rgb(184, 217, 141)
```

## Xiaomi Vacuum Card with a Picture Entity Card

[benct/lovelace-xiaomi-vacuum-card](https://github.com/benct/lovelace-xiaomi-vacuum-card)

```yaml
type: picture-entity
entity: # Your vacuum entity
camera_image: # Your camera entity
show_state: false
show_name: false
camera_view: live
tap_action:
  action: none
hold_action:
  action: none
```

```yaml
type: custom:xiaomi-vacuum-card
entity: # Your vacuum entity
vendor: xiaomi
attributes:
  main_brush_life:
    label: 'Main Brush: '
    key: main_brush_left
    unit: '%'
    icon: mdi:car-turbocharger
  side_brush_life:
    label: 'Side Brush: '
    key: side_brush_left
    unit: '%'
    icon: mdi:pinwheel-outline
  filter_life:
    label: 'Filter: '
    key: filter_left
    unit: '%'
    icon: mdi:air-filter
  sensor_life:
    label: 'Sensor: '
    key: sensor_dirty_left
    unit: '%'
    icon: mdi:radar
  main_brush: false
  side_brush: false
  filter: false
  sensor: false
```
