![Dreame Smart Vacuum](docs/media/logo.png)

# Dreame Smart Vacuum

A Home Assistant integration for Dreame robot vacuums that replaces the Dreame
app: every setting as an entity, a live multi-floor map, and a Lovelace card with
tap-to-select room cleaning.

Fork of [Tasshack/dreame-vacuum](https://github.com/Tasshack/dreame-vacuum).

## Install

**HACS** — add `https://github.com/ducdt1298/dreame-smart-vacuum` as a custom
repository with category *Integration*, install it, then restart Home Assistant.

**Manually**

```bash
wget -O - https://raw.githubusercontent.com/ducdt1298/dreame-smart-vacuum/main/install | bash -
```

## Set up

Settings → Devices & Services → Add Integration → **Dreame Smart Vacuum**.

Pick how to connect:

| Type | Needs |
|---|---|
| Mi Home account | username, password, country — vacuum on the same subnet as Home Assistant |
| Dreamehome / Movahome account | username, password, country — cloud only |
| Local | IP and token — vacuum on the same subnet |

> For `Mi Home` and `Local`, Home Assistant and the vacuum must be on the same
> subnet — see the
> [python-miio note on cross-subnet discovery](https://python-miio.readthedocs.io/en/latest/troubleshooting.html#discover-devices-across-subnets).

Then name the device and set the integration options: which
[notifications](docs/notifications.md) to raise, the
[map colour scheme](docs/map.md#color-schemes) and icon set. Entities you don't
need can be disabled on the device page.

## The card

The integration serves its own card, so there is no dashboard resource to add:

```yaml
type: custom:dreame-smart-vacuum-card
entity: vacuum.your_vacuum
```

Battery and status in the header, then choose where to clean and press start.
Rooms are selected on the map itself, multi-select, and the room you tap first is
cleaned first — the order the Dreame app uses.

[Full card documentation →](docs/card.md)

## Documentation

| | |
|---|---|
| [Supported devices](docs/supported_devices.md) | which models are known to work |
| [Entities](docs/entities.md) | every auto-generated entity |
| [Map](docs/map.md) | live and multi-floor maps, obstacle photos, cleaning history, backup and recovery, WiFi coverage map |
| [Room entities](docs/room_entities.md) | per-room cleaning entities |
| [Services](docs/services.md) | service calls with examples |
| [Notifications](docs/notifications.md) | persistent notifications and error reporting |
| [Events](docs/events.md) | events for automations |
| [Other cards](docs/other_cards.md) | templates for Xiaomi Vacuum Map Card, Vacuum Card and Valetudo |

## Contributing

Fork the `main` branch and open a pull request. Run `node tests/card.test.js`
after touching the Lovelace card.

## Credits

**Dreame Smart Vacuum** is a fork of
[dreame-vacuum](https://github.com/Tasshack/dreame-vacuum) by
[@Tasshack](https://github.com/Tasshack), released under the MIT license. All
upstream work and copyright remain with the original author.

Built on top of work by [@pooyashahidi](https://github.com/pooyashahidi)
([xiaomi_vacuum](https://github.com/pooyashahidi/xiaomi_vacuum)),
[@ha0y](https://github.com/ha0y)
([Xiaomi MIoT](https://github.com/ha0y/xiaomi_miot_raw)),
[@PiotrMachowski](https://github.com/PiotrMachowski)
([Xiaomi Cloud Map Extractor](https://github.com/PiotrMachowski/Home-Assistant-custom-components-Xiaomi-Cloud-Map-Extractor)),
[@kuudori](https://github.com/kuudori) (Dreame cloud authentication) and
[@r1si](https://github.com/r1si) (Mova cloud).
