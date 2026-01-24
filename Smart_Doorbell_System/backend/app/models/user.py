"""
User Model - Authentication and User Management
"""
from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model for authentication and account management"""
    
    __tablename__ = "users"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # User Information
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    
    # Authentication
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # Email Verification
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    
    # Password Reset
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Profile
    phone_number = Column(String(20), nullable=True)
    profile_image = Column(Text, nullable=True)  # URL or base64
    
    # Preferences
    notification_enabled = Column(Boolean, default=True, nullable=False)
    push_token = Column(String(255), nullable=True)  # FCM token for push notifications
    
    # Privacy Settings
    face_recognition_enabled = Column(Boolean, default=True, nullable=False)
    local_processing_only = Column(Boolean, default=False, nullable=False)
    auto_delete_days = Column(Integer, default=30, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    people = relationship("Person", back_populates="owner", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    doorbell = relationship("Doorbell", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', username='{self.username}')>"