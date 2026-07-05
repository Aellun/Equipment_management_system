from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(..., env="DATABASE_URL")

    # --- Auth / JWT ---------------------------------------------------------
    # SECRET_KEY is shared with the rest of the stack via docker-compose.
    secret_key: str = Field("dyzah-dev-secret-change-me", env="SECRET_KEY")
    jwt_algorithm: str = "HS256"
    # Short-lived admin/staff access tokens (just-in-time sessions).
    access_token_expire_minutes: int = 15
    # Long-lived refresh tokens keep staff signed in without re-typing creds.
    refresh_token_expire_days: int = 7

    # Cookie names + flags for the httpOnly token cookies.
    access_cookie_name: str = "dyzah_access"
    refresh_cookie_name: str = "dyzah_refresh"
    # Set COOKIE_SECURE=true once the deployment is behind HTTPS.
    cookie_secure: bool = Field(False, env="COOKIE_SECURE")

    # --- Gateway / CORS -----------------------------------------------------
    # Comma-separated list of browser origins allowed to call the API.
    cors_origins: str = Field("http://localhost,http://localhost:3000", env="CORS_ORIGINS")
    # Shared secret nginx injects on every proxied request so the backend can
    # tell gateway traffic apart from direct hits (defence in depth).
    gateway_secret: str = Field("dyzah-gateway-secret-change-me", env="GATEWAY_SECRET")
    # When true, state-changing requests (POST/PUT/PATCH/DELETE) must carry the
    # gateway secret. Off by default so local pytest/dev works without nginx;
    # docker-compose turns it on for the real stack.
    gateway_enforce: bool = Field(False, env="GATEWAY_ENFORCE")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
