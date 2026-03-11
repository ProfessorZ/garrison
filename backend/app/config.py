from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://garrison:garrison@db:5432/garrison"
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FERNET_KEY: str = "change-me"
    CORS_ORIGINS: str = "http://localhost:5173"
    RATE_LIMIT: str = "60/minute"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
