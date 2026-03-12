from app.games.base import GamePlugin
from app.games.factorio import FactorioPlugin
from app.games.zomboid import ZomboidPlugin

_PLUGINS: dict[str, type[GamePlugin]] = {
    "zomboid": ZomboidPlugin,
    "factorio": FactorioPlugin,
}


def get_plugin(game_type: str) -> GamePlugin:
    cls = _PLUGINS.get(game_type)
    if cls is None:
        raise ValueError(f"Unknown game type: {game_type}. Available: {list(_PLUGINS.keys())}")
    return cls()


def list_plugins() -> list[str]:
    return list(_PLUGINS.keys())
