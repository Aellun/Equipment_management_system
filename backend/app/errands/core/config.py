from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Errands/Hygiene domain settings. Reads from process env first (set by the
    # umbrella docker-compose). `extra="ignore"` so it coexists with the main
    # app's env without clashing.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Dyzah Errands"
    ENVIRONMENT: str = "development"

    # Sync (psycopg) URL to the SAME Postgres database the async main app uses.
    # Falls back to the shared local default if unset.
    ERRANDS_DATABASE_URL: str = "postgresql+psycopg://ahadi:ahadi_secret@db:5432/event_tracking"
    REDIS_URL: str = "redis://redis:6379/0"

    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    ALGORITHM: str = "HS256"

    FRONTEND_ORIGIN: str = "http://localhost:3000"
    PUBLIC_API_BASE: str = "http://localhost:8000"

    # M-Pesa
    MPESA_ENV: str = "sandbox"
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = "174379"
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = "http://localhost/api/errands/payments/mpesa/callback"
    MPESA_MOCK: bool = True

    # Social login (OAuth 2.0). A provider only appears on the sign-in screens
    # once both its id and secret are set — see core/oauth.py.
    # Redirect URI to register with each provider:
    #   {public origin}/api/errands/auth/oauth/{provider}/callback
    # Leave OAUTH_PUBLIC_BASE_URL blank to derive the origin from the request
    # (fine behind nginx); set it explicitly in production.
    OAUTH_PUBLIC_BASE_URL: str = ""
    OAUTH_GOOGLE_CLIENT_ID: str = ""
    OAUTH_GOOGLE_CLIENT_SECRET: str = ""
    OAUTH_FACEBOOK_CLIENT_ID: str = ""
    OAUTH_FACEBOOK_CLIENT_SECRET: str = ""
    OAUTH_GITHUB_CLIENT_ID: str = ""
    OAUTH_GITHUB_CLIENT_SECRET: str = ""
    OAUTH_MICROSOFT_CLIENT_ID: str = ""
    OAUTH_MICROSOFT_CLIENT_SECRET: str = ""

    # Seed
    SEED_ADMIN_EMAIL: str = "errands-admin@dyzah.co.ke"
    SEED_ADMIN_PASSWORD: str = "admin1234"
    SEED_DEMO_PASSWORD: str = "demo1234"


settings = Settings()
