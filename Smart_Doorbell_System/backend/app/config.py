"""
Application Configuration
Manages all configuration settings using Pydantic Settings
"""
from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    app_name: str = Field(default="Smart Doorbell API", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    secret_key: str = Field(..., env="SECRET_KEY")
    
    # Server
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    
    # Database
    database_url: str = Field(
        default="postgresql://doorbell:doorbell_password@localhost:5432/smart_doorbell",
        env="DATABASE_URL"
    )
    
    # Security & JWT
    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # Encryption
    encryption_key: str = Field(..., env="ENCRYPTION_KEY")
    
    # CORS
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:19006"],
        env="ALLOWED_ORIGINS"
    )
    
    @validator('allowed_origins', pre=True)
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    # File Storage
    upload_dir: str = Field(default="./uploads", env="UPLOAD_DIR")
    max_upload_size: int = Field(default=10485760, env="MAX_UPLOAD_SIZE")  # 10MB
    allowed_image_types: List[str] = Field(
        default=["image/jpeg", "image/png", "image/jpg"],
        env="ALLOWED_IMAGE_TYPES"
    )
    
    @validator('allowed_image_types', pre=True)
    def parse_image_types(cls, v):
        if isinstance(v, str):
            return [t.strip() for t in v.split(',')]
        return v
    
    # Face Recognition
    face_recognition_tolerance: float = Field(default=0.6, env="FACE_RECOGNITION_TOLERANCE")
    face_detection_model: str = Field(default="hog", env="FACE_DETECTION_MODEL")
    min_face_size: int = Field(default=20, env="MIN_FACE_SIZE")
    
    # WebRTC / Video
    stun_server: str = Field(default="stun:stun.l.google.com:19302", env="STUN_SERVER")
    turn_server: Optional[str] = Field(default=None, env="TURN_SERVER")
    turn_username: Optional[str] = Field(default=None, env="TURN_USERNAME")
    turn_password: Optional[str] = Field(default=None, env="TURN_PASSWORD")
    
    # Notifications
    firebase_credentials_path: Optional[str] = Field(default=None, env="FIREBASE_CREDENTIALS_PATH")
    enable_push_notifications: bool = Field(default=False, env="ENABLE_PUSH_NOTIFICATIONS")
    
    # Email
    smtp_host: Optional[str] = Field(default=None, env="SMTP_HOST")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    smtp_password: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    email_from: str = Field(default="noreply@smartdoorbell.com", env="EMAIL_FROM")
    
    # Redis
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL")
    enable_redis: bool = Field(default=False, env="ENABLE_REDIS")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: str = Field(default="./logs/app.log", env="LOG_FILE")
    
    # Privacy & Compliance
    auto_delete_recordings_days: int = Field(default=30, env="AUTO_DELETE_RECORDINGS_DAYS")
    require_consent: bool = Field(default=True, env="REQUIRE_CONSENT")
    enable_analytics: bool = Field(default=False, env="ENABLE_ANALYTICS")
    
    # Development
    reload: bool = Field(default=False, env="RELOAD")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings
    Uses LRU cache to avoid reading .env file multiple times
    """
    return Settings()


# Convenience function to access settings
settings = get_settings()