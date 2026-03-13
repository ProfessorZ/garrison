import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.database import Base

# Import all models so Base.metadata is populated
from app.models.user import User  # noqa: F401
from app.models.server import Server  # noqa: F401
from app.models.game import Game  # noqa: F401
from app.models.scheduled_command import ScheduledCommand  # noqa: F401
from app.models.activity_log import ActivityLog  # noqa: F401
from app.models.chat_message import ChatMessage  # noqa: F401
from app.models.known_player import KnownPlayer  # noqa: F401
from app.models.player_session import PlayerSession  # noqa: F401
from app.models.player_ban import PlayerBan  # noqa: F401
from app.models.player_name import PlayerNameHistory  # noqa: F401
from app.models.ban_list import BanList, BanListEntry, ServerBanList  # noqa: F401
from app.models.trigger import Trigger  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
