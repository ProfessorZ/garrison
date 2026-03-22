import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings, APP_VERSION, APP_NAME
from app.api import auth, servers, console, players, scheduler, activity, dashboard, chat, commands, users, server_options, known_players, plugins, webhooks, ban_lists, triggers, metrics, ban_templates, events, hll, analytics
from app.database import engine
from app.rcon.manager import rcon_manager
from app.plugins.loader import PluginLoader
from app.plugins.installer import PluginInstaller

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])

PLUGINS_DIR = os.environ.get(
    "GARRISON_PLUGINS_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "plugins"),
)


def _register_plugin_schemas(loader: PluginLoader):
    """Register command schemas from loaded plugins into the legacy schema registry."""
    from app.schemas.rcon_commands import (
        GameCommandSchema,
        RconCommandSchema,
        CommandParam as SchemaParam,
        ParamType,
        CommandCategory,
        register_schema,
    )

    _type_map = {
        "string": ParamType.STRING,
        "integer": ParamType.INTEGER,
        "boolean": ParamType.BOOLEAN,
        "float": ParamType.FLOAT,
        "choice": ParamType.ENUM,
        "enum": ParamType.ENUM,
    }
    _cat_map = {
        "ADMIN": CommandCategory.ADMIN,
        "ADMIN_MGMT": CommandCategory.ADMIN_MGMT,
        "PLAYER_MGMT": CommandCategory.PLAYER_MGMT,
        "PLAYER_ACTIONS": CommandCategory.PLAYER_ACTIONS,
        "WORLD": CommandCategory.WORLD,
        "MODERATION": CommandCategory.MODERATION,
        "SERVER": CommandCategory.SERVER,
        "SERVER_INFO": CommandCategory.SERVER_INFO,
        "SERVER_SETTINGS": CommandCategory.SERVER_SETTINGS,
        "WHITELIST": CommandCategory.WHITELIST,
        "MAP_MGMT": CommandCategory.MAP_MGMT,
        "TIMERS": CommandCategory.TIMERS,
        "PERFORMANCE": CommandCategory.PERFORMANCE,
        "SCRIPTING": CommandCategory.SCRIPTING,
        "DEBUG": CommandCategory.DEBUG,
    }

    for game_type, plugin in loader.plugins.items():
        try:
            # Point sys.modules["schema"] to this plugin's schema before calling get_commands()
            # so that `from schema import get_commands` inside each plugin resolves correctly
            schema_key = f"garrison_schema_{game_type}"
            if schema_key in sys.modules:
                sys.modules["schema"] = sys.modules[schema_key]
            cmds = plugin.get_commands()
        except Exception as e:
            logger.warning("Failed to get commands from plugin %s: %s", game_type, e)
            continue
        finally:
            # Clean up the "schema" alias
            sys.modules.pop("schema", None)

        rcon_commands = []
        for cmd in cmds:
            params = []
            for p in (cmd.params or []):
                params.append(SchemaParam(
                    name=p.name,
                    type=_type_map.get(p.type, ParamType.STRING),
                    required=p.required,
                    description=p.description,
                    enum_values=p.choices if p.choices else None,
                ))
            rcon_commands.append(RconCommandSchema(
                name=cmd.name,
                description=cmd.description,
                usage=cmd.example or cmd.name,
                category=_cat_map.get(cmd.category, CommandCategory.SERVER),
                parameters=params,
            ))

        schema = GameCommandSchema(
            game_name=game_type,
            schema_version="1.0.0",
            min_game_version="0.0",
            commands=rcon_commands,
        )
        register_schema(game_type, schema)
        logger.info("Registered %d commands for plugin %s", len(rcon_commands), game_type)


async def sync_plugin_manifest(plugins_dir: str):
    """Read plugins.txt and install any plugins not already present."""
    manifest_paths = [
        Path("/app/plugins.txt"),                                # Docker mount
        Path(__file__).parent.parent.parent / "plugins.txt",     # dev
    ]

    manifest_file = None
    for p in manifest_paths:
        if p.exists():
            manifest_file = p
            break

    if not manifest_file:
        logger.info("No plugins.txt found, skipping manifest sync")
        return

    logger.info("Reading plugin manifest: %s", manifest_file)
    urls = []
    for line in manifest_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        urls.append(line)

    if not urls:
        return

    plugins_path = Path(plugins_dir)
    plugins_path.mkdir(parents=True, exist_ok=True)
    installer = PluginInstaller(plugins_dir)

    for url in urls:
        # Parse optional @ref suffix
        ref = None
        if "@" in url.split("/")[-1]:
            url, ref = url.rsplit("@", 1)

        repo_name = url.rstrip("/").split("/")[-1]
        plugin_dir = plugins_path / repo_name

        if plugin_dir.exists():
            # Update existing plugin via git pull
            logger.info("Updating plugin: %s", repo_name)
            try:
                import subprocess
                result = subprocess.run(
                    ["git", "pull", "--ff-only"],
                    cwd=str(plugin_dir),
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode == 0:
                    logger.info("Updated plugin %s: %s", repo_name, result.stdout.strip())
                    # Clear pycache so updated code is loaded
                    import shutil
                    pycache = plugin_dir / "__pycache__"
                    if pycache.exists():
                        shutil.rmtree(pycache)
                else:
                    logger.warning("git pull failed for %s: %s", repo_name, result.stderr.strip())
            except Exception as e:
                logger.warning("Could not update plugin %s: %s", repo_name, e)
            continue

        logger.info("Installing plugin from manifest: %s", url)
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, installer.install, url, ref
            )
            logger.info("Installed plugin: %s", repo_name)
        except Exception as e:
            logger.error("Failed to install plugin %s: %s", url, e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Sync plugins from manifest before loading
    await sync_plugin_manifest(PLUGINS_DIR)

    # Initialize plugin system
    loader = PluginLoader(PLUGINS_DIR)

    # Add plugin directories to sys.path so relative imports within plugins work
    plugins_path = Path(PLUGINS_DIR)
    if plugins_path.exists():
        for entry in sorted(plugins_path.iterdir()):
            if entry.is_dir() and (entry / "plugin.py").exists():
                if str(entry) not in sys.path:
                    sys.path.insert(0, str(entry))

    loader.load_all()
    _register_plugin_schemas(loader)

    installer = PluginInstaller(PLUGINS_DIR)

    app.state.plugin_loader = loader
    app.state.plugin_installer = installer

    logger.info(
        "Plugin system initialized: %d plugins loaded from %s",
        len(loader.plugins), PLUGINS_DIR,
    )

    # Start Discord bot if configured
    if settings.DISCORD_BOT_TOKEN and settings.DISCORD_GUILD_ID:
        from app.services.discord_bot import start_bot
        try:
            await start_bot(
                token=settings.DISCORD_BOT_TOKEN,
                guild_id=int(settings.DISCORD_GUILD_ID),
            )
            logger.info("Discord bot started")
        except Exception as e:
            logger.warning("Failed to start Discord bot: %s", e)
    else:
        logger.info("Discord bot not configured — skipping")

    logger.info("Garrison backend started")
    yield

    # Shutdown Discord bot
    if settings.DISCORD_BOT_TOKEN and settings.DISCORD_GUILD_ID:
        from app.services.discord_bot import stop_bot
        try:
            await stop_bot()
        except Exception as e:
            logger.warning("Error stopping Discord bot: %s", e)

    await rcon_manager.close_all()
    await engine.dispose()
    logger.info("Garrison backend stopped")


app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(console.router)
app.include_router(players.router)
app.include_router(scheduler.router)
app.include_router(server_options.router)
app.include_router(chat.router)
app.include_router(servers.router)
app.include_router(activity.router)
app.include_router(dashboard.router)
app.include_router(commands.router)
app.include_router(users.router)
app.include_router(known_players.router)
app.include_router(plugins.router)
app.include_router(webhooks.router)
app.include_router(ban_lists.router)
app.include_router(triggers.router)
app.include_router(metrics.router)
app.include_router(ban_templates.router)
app.include_router(events.router)
app.include_router(events.player_router)
app.include_router(hll.router)
app.include_router(analytics.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/version")
async def version():
    return {"version": APP_VERSION, "name": APP_NAME}
