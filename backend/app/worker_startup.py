import logging
import os
import sys

logger = logging.getLogger(__name__)


async def startup(ctx):
    """Called when the ARQ worker process starts."""
    # Ensure all ORM models are registered before any DB queries
    import app.models  # noqa: F401
    from app.plugins.loader import PluginLoader

    plugins_dir = os.environ.get(
        "GARRISON_PLUGINS_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "plugins"),
    )

    # Add plugin directories to sys.path
    import pathlib
    plugins_path = pathlib.Path(plugins_dir)
    if plugins_path.exists():
        for entry in sorted(plugins_path.iterdir()):
            if entry.is_dir() and (entry / "plugin.py").exists():
                if str(entry) not in sys.path:
                    sys.path.insert(0, str(entry))

    loader = PluginLoader(plugins_dir)
    loader.load_all()
    ctx["plugin_loader"] = loader

    # Register with bridge so get_plugin() works outside FastAPI
    from app.plugins.bridge import set_standalone_loader
    set_standalone_loader(loader)

    logger.info("ARQ worker started — %d plugins loaded from %s", len(loader.plugins), plugins_dir)


async def shutdown(ctx):
    """Called when the ARQ worker process shuts down."""
    logger.info("ARQ worker shutting down")
