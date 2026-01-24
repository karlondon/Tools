"""
Person Model - Known faces database with privacy compliance
"""
from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Person(Base):
    """Person model for face recognition database"""
    
    __tablename__ = "people"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Person Information
    name = Column(String(255), nullable=False, index=True)
    relationship_type = Column(String(50), nullable=True)  # Family, Friend, Neighbor, Service, Other
    notes = Column(Text, nullable=True)
    
    # Photos & Face Encodings
    # Stored as encrypted JSON array of face encodings
    face_encodings = Column(Text, nullable=False)  # Encrypted face recognition data
    photos = Column(Text, nullable=True)  # JSON array of photo URLs/paths
    primary_photo = Column(Text, nullable=True)  # Primary photo URL
    
    # Recognition Settings
    recognition_confidence = Column(Float, default=0.6, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    
    # Notification Preferences
    notify_on_arrival = Column(Boolean, default=True, nullable=False)
    custom_notification_sound = Column(String(255), nullable=True)
    
    # Statistics
    total_visits = Column(Integer, default=0, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    
    # Privacy & Consent
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_date = Column(DateTime(timezone=True), nullable=True)
    consent_signature = Column(Text, nullable=True)  # Digital signature
    consent_ip_address = Column(String(50), nullable=True)
    data_retention_days = Column(Integer, nullable=True)  # Override user default
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="people")
    activities = relationship("Activity", back_populates="person", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Person(id={self.id}, name='{self.name}', relationship='{self.relationship_type}')>"