# Dreame Smart Vacuum

A Home Assistant integration for Dreame robot vacuums that replaces the Dreame
app: every setting as an entity, a live multi-floor map, and a Lovelace card with
tap-to-select room cleaning.

Fork of [Tasshack/dreame-vacuum](https://github.com/Tasshack/dreame-vacuum).

## Set up

After installing, restart Home Assistant, then go to
Settings → Devices & Services → Add Integration → **Dreame Smart Vacuum**.

Pick how to connect:

- **Mi Home account** — username, password, country. Vacuum must be on the same
  subnet as Home Assistant.
- **Dreamehome / Movahome account** — username, password, country. Cloud only.
- **Local** — IP and token. Vacuum must be on the same subnet.

Then name the device and set the integration options: which notifications to
raise, the map colour scheme and the icon set. Entities you don't need can be
disabled on the device page.

## The card

The integration serves its own card, so there is no dashboard resource to add:

```yaml
type: custom:dreame-smart-vacuum-card
entity: vacuum.your_vacuum
```

Battery and status in the header, then choose where to clean and press start.
Rooms are selected on the map itself, multi-select, and the room you tap first is
cleaned first — the order the Dreame app uses.

## Documentation

- [Supported devices](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/supported_devices.md)
- [The card](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/card.md)
- [Entities](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/entities.md)
- [Map: live, multi-floor, obstacle photos, history, backup](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/map.md)
- [Room cleaning entities](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/room_entities.md)
- [Services](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/services.md)
- [Notifications](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/notifications.md)
- [Events for automations](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/events.md)
- [Using other Lovelace cards](https://github.com/ducdt1298/dreame-smart-vacuum/blob/main/docs/other_cards.md)
