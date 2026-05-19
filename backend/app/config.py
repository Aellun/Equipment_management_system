from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(
        default="postgresql+asyncpg://ahadi:ahadi_secret@db:5432/event_tracking",
        env="DATABASE_URL",
    )

    class Config:
        env_file = ".env"


settings = Settings()
