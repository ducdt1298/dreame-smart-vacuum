"""The Dreame Vacuum component."""

from __future__ import annotations
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.loader import async_get_integration
import warnings
from pathlib import Path
from .const import DOMAIN, LOGGER, CARD_FILENAME, CARD_URL_PATH, DATA_CARD_REGISTERED

# Suppress python-miio FutureWarning on Python 3.13
warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    module="miio.miot_device",
)

# Suppress RuntimeWarning overflow encountered in scalar add
warnings.filterwarnings("ignore", category=RuntimeWarning)

from .coordinator import DreameVacuumDataUpdateCoordinator

PLATFORMS = (
    Platform.VACUUM,
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.SWITCH,
    Platform.BUTTON,
    Platform.NUMBER,
    Platform.SELECT,
    Platform.CAMERA,
    Platform.TIME,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration and serve the Lovelace card.

    This runs once per Home Assistant start, deliberately *not* per config entry:
    the aiohttp router raises when the same GET route is added twice, so a second
    Dreame vacuum (or a config entry reload) would otherwise blow up here.
    """
    await _async_register_card(hass)
    return True


async def _async_register_card(hass: HomeAssistant) -> None:
    """Expose dreame-vacuum-card.js and auto-load it on every dashboard."""
    data = hass.data.setdefault(DOMAIN, {})
    if data.get(DATA_CARD_REGISTERED):
        return
    data[DATA_CARD_REGISTERED] = True

    card_path = Path(__file__).parent / "frontend" / CARD_FILENAME
    if not card_path.is_file():
        LOGGER.warning("Dreame Vacuum card not found at %s", card_path)
        return

    try:
        # register_static_path was removed in HA 2025.7; keep the old call for
        # installations still on the 2023.6 floor declared in hacs.json.
        if hasattr(hass.http, "async_register_static_paths"):
            from homeassistant.components.http import StaticPathConfig

            await hass.http.async_register_static_paths(
                [StaticPathConfig(CARD_URL_PATH, str(card_path), True)]
            )
        else:
            hass.http.register_static_path(CARD_URL_PATH, str(card_path), True)
    except (RuntimeError, ValueError) as ex:
        # Already routed (for example after a reload) - not worth failing setup.
        LOGGER.debug("Dreame Vacuum card path already registered: %s", ex)

    version = "dev"
    try:
        integration = await async_get_integration(hass, DOMAIN)
        if integration.version:
            version = str(integration.version)
    except Exception:  # noqa: BLE001 - version is cosmetic, never fail setup
        pass

    # Static files are served with a 31 day cache, so the version query string is
    # what actually makes an upgrade visible to the browser.
    add_extra_js_url(hass, f"{CARD_URL_PATH}?v={version}")
    LOGGER.debug("Dreame Vacuum card registered at %s?v=%s", CARD_URL_PATH, version)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Dreame Vacuum from a config entry."""
    # Covers YAML-less setups where async_setup already ran, and is a no-op after
    # the first call.
    await _async_register_card(hass)

    coordinator = DreameVacuumDataUpdateCoordinator(hass, entry=entry)
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator

    # Set up all platforms for this device/entry.
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    entry.async_on_unload(entry.add_update_listener(update_listener))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Dreame Vacuum config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        coordinator: DreameVacuumDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]
        if coordinator._unsub_dispatcher:
            coordinator._unsub_dispatcher()
            coordinator._unsub_dispatcher = None
        coordinator._device.listen(None)
        coordinator._device.listen_error(None)
        coordinator._device.disconnect()
        del coordinator._device
        coordinator._device = None
        del hass.data[DOMAIN][entry.entry_id]

    return unload_ok


async def update_listener(hass: HomeAssistant, config_entry: ConfigEntry) -> None:
    """Handle options update."""
    await hass.config_entries.async_reload(config_entry.entry_id)
