from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Meeting Memory Engine"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    WHISPER_MODEL: str = "whisper-large-v3"

    DATABASE_URL: str = "sqlite:///./meeting_memory.db"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
