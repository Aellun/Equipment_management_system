from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ahadi:ahadi_secret@db:5432/event_tracking"

    class Config:
        env_file = ".env"


settings = Settings()
