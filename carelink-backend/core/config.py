"""
CareLink 2.0 — Application Configuration
Loads and validates all environment variables via Pydantic Settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── AI APIs ───────────────────────────────────────────────────────────────
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    groq_api_key: str = Field(default="", description="Groq API key")

    # ── Firebase ──────────────────────────────────────────────────────────────
    firebase_project_id: str = Field(default="carelink-2", description="Firebase project ID")
    firebase_private_key_id: str = Field(default="", description="Firebase private key ID")
    firebase_private_key: str = Field(default="", description="Firebase service account private key (PEM)")
    firebase_client_email: str = Field(default="", description="Firebase service account email")
    firebase_client_id: str = Field(default="", description="Firebase client ID")
    firebase_database_url: str = Field(default="", description="Firebase RTDB URL")

    # ── Twitter / X ───────────────────────────────────────────────────────────
    twitter_bearer_token: str = Field(default="", description="Twitter API v2 bearer token")

    # ── NewsAPI ───────────────────────────────────────────────────────────────
    news_api_key: str = Field(default="", description="NewsAPI.org key")

    # ── WhatsApp ──────────────────────────────────────────────────────────────
    whatsapp_access_token: str = Field(default="", description="WhatsApp Cloud API access token")
    whatsapp_phone_number_id: str = Field(default="", description="WhatsApp phone number ID")
    whatsapp_verify_token: str = Field(default="carelink-verify", description="WhatsApp webhook verify token")

    # ── App & Server ──────────────────────────────────────────────────────────
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    app_url: str = Field(default="http://localhost:8000")
    frontend_url: str = Field(default="http://localhost:5173")
    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")
    debug: bool = Field(default=True)
    cors_origins: list[str] = Field(default=["http://localhost:5173", "http://localhost:3000", "*"])


    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def firebase_credentials_dict(self) -> dict:
        """Build the Firebase credential dict from individual env vars."""
        return {
            "type": "service_account",
            "project_id": self.firebase_project_id,
            "private_key_id": self.firebase_private_key_id,
            "private_key": self.firebase_private_key.replace("\\n", "\n"),
            "client_email": self.firebase_client_email,
            "client_id": self.firebase_client_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }

    def __getattr__(self, name: str):
        """Allow case-insensitive access, e.g. settings.ENVIRONMENT or settings.HOST."""
        lower_name = name.lower()
        if lower_name in self.__dict__:
            return self.__dict__[lower_name]
        try:
            return super().__getattribute__(lower_name)
        except AttributeError:
            raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")



@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere instead of Settings()."""
    return Settings()
