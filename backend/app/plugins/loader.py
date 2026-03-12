import importlib.util
import json
import logging
from pathlib import Path

from .base import GamePlugin

logger = logging.getLogger(__name__)


class PluginLoader:
    def __init__(self, plugins_dir: str):
        self.plugins_dir = Path(plugins_dir)
        self.plugins: dict[str, GamePlugin] = {}
        self.manifests: dict[str, dict] = {}

    def load_all(self):
        """Scan plugins directory and load all valid plugins."""
        self.plugins.clear()
        self.manifests.clear()

        if not self.plugins_dir.exists():
            self.plugins_dir.mkdir(parents=True, exist_ok=True)
            logger.info("Created plugins directory: %s", self.plugins_dir)
            return

        for entry in sorted(self.plugins_dir.iterdir()):
            if entry.is_dir() and (entry / "manifest.json").exists():
                try:
                    self._load_plugin(entry)
                except Exception as e:
                    logger.error("Failed to load plugin %s: %s", entry.name, e)

    def _load_plugin(self, plugin_dir: Path):
        manifest = json.loads((plugin_dir / "manifest.json").read_text())
        game_type = manifest["id"]

        # Validate API version
        api_version = int(manifest.get("garrison_api", "1"))
        if api_version > GamePlugin.PLUGIN_API_VERSION:
            raise ValueError(
                f"Plugin requires API v{api_version}, "
                f"Garrison supports v{GamePlugin.PLUGIN_API_VERSION}"
            )

        # Load plugin.py
        plugin_file = plugin_dir / "plugin.py"
        if not plugin_file.exists():
            raise ValueError(f"No plugin.py found in {plugin_dir}")

        spec = importlib.util.spec_from_file_location(
            f"garrison_plugin_{game_type}", plugin_file
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # Find the GamePlugin subclass
        plugin_class = None
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (
                isinstance(attr, type)
                and issubclass(attr, GamePlugin)
                and attr is not GamePlugin
            ):
                plugin_class = attr
                break

        if not plugin_class:
            raise ValueError(f"No GamePlugin subclass found in {plugin_dir}/plugin.py")

        plugin = plugin_class()
        self.plugins[game_type] = plugin
        self.manifests[game_type] = manifest
        logger.info(
            "Loaded plugin: %s (%s) v%s",
            manifest.get("display_name", game_type),
            game_type,
            manifest.get("version", "?"),
        )

    def get_plugin(self, game_type: str) -> GamePlugin | None:
        return self.plugins.get(game_type)

    def list_plugins(self) -> list[dict]:
        return [
            {
                "id": m["id"],
                "name": m.get("name", m["id"]),
                "display_name": m.get("display_name", m["id"]),
                "version": m.get("version", "0.0.0"),
                "description": m.get("description", ""),
                "author": m.get("author", ""),
                "icon": m.get("icon", "\U0001f3ae"),
                "default_ports": m.get("default_ports", {}),
            }
            for m in self.manifests.values()
        ]
