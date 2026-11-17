"""
Application configuration loaded from .env / environment variables.
Swap LLM provider, database, or model by editing .env — no code changes needed.
"""

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    app_env: str = "development"
    secret_key: str = "change_me_in_production_use_32_chars_min"

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7   # 7 days

    # ── LLM ───────────────────────────────────────────────────────────────────
    llm_provider: str = "groq"
    groq_api_key: str = ""
    llm_model: str = "llama-3.3-70b-versatile"

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "sqlite:///./interview_coach.db"

    # ── Embeddings ────────────────────────────────────────────────────────────
    embedding_model: str = "all-MiniLM-L6-v2"
    faiss_index_dir: str = "./faiss_indexes"

    # ── Interview ─────────────────────────────────────────────────────────────
    default_num_questions: int = 10
    max_questions: int = 15
    max_resume_bytes: int = 5 * 1024 * 1024
    max_resume_pages: int = 10

    # ── Optional TTS / STT ────────────────────────────────────────────────────
    elevenlabs_api_key: str = ""
    edge_tts_voice: str = "en-US-JennyNeural"
    whisper_model: str = "whisper-large-v3"

    @field_validator("app_env")
    @classmethod
    def normalize_app_environment(cls, value: str) -> str:
        return value.strip().lower()

    @model_validator(mode="after")
    def validate_production_secrets(self):
        placeholder_key = "change_me" in self.secret_key.lower()
        if self.app_env.lower() in {"production", "prod"} and (
            placeholder_key or len(self.secret_key.strip()) < 32 or self.secret_key != self.secret_key.strip()
        ):
            raise ValueError("SECRET_KEY must be a unique value of at least 32 characters in production")
        if self.max_resume_bytes <= 0 or self.max_resume_pages <= 0:
            raise ValueError("Resume upload limits must be positive")
        if self.jwt_expire_minutes <= 0:
            raise ValueError("JWT_EXPIRE_MINUTES must be positive")
        return self


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — cheap to call anywhere."""
    return Settings()
