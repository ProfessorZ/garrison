from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://garrison:garrison@db:5432/garrison"
    SECRET_KEY: str = "change-me-in-production"
    FERNET_KEY: str = "change-me-generate-with-Fernet.generate_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
