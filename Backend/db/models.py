import enum
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, Date, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .session import Base

class UserRole(enum.Enum):
    student = "student"
    faculty = "faculty"
    admin = "admin"
    super_admin = "super_admin"

class ApprovalStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    hold = "hold"

class BatchStatus(enum.Enum):
    ongoing = "ongoing"
    completed = "completed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(20)) # Added phone for faculty contact
    password_hash = Column(Text, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Registration & Approval
    status = Column(SQLEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.pending)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    review_note = Column(Text)
    
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True)
    session_date = Column(DateTime, server_default=func.now(), index=True)
    video_filename = Column(Text)
    duration_sec = Column(Float)
    
    # Audio Metrics
    wpm = Column(Integer)
    fillers = Column(Integer)
    fillers_per_minute = Column(Float)
    num_pauses = Column(Integer)
    avg_pause_sec = Column(Float)
    total_pause_sec = Column(Float)
    mean_pitch_hz = Column(Float)
    pitch_variation_hz = Column(Float)
    
    # Video Metrics
    eye_contact_pct = Column(Float)
    head_pose_forward_pct = Column(Float)
    head_pose_dominant = Column(String(20))
    posture_upright_pct = Column(Float)
    posture_dominant = Column(String(20))
    gesture_active_pct = Column(Float)
    smile_pct = Column(Float)
    
    # NLP Metrics
    readability = Column(String(50))
    grade_level = Column(String(20))
    reading_ease = Column(Float)
    vocabulary_ttr = Column(Float)
    coherence_score = Column(Float)
    total_sentences = Column(Integer)
    avg_sentence_length = Column(Float)
    
    # Full Text & Outcomes
    transcript = Column(Text)
    llm_report = Column(Text)
    
    # Detailed Scores
    confidence_score = Column(Float)
    fluency_score = Column(Float)
    english_proficiency_score = Column(Float)
    communication_impact_score = Column(Float)
    vocal_engagement_score = Column(Float)
    physical_presence_score = Column(Float)
    overall_score = Column(Float)
    
    user = relationship("User", back_populates="sessions")
    embeddings = relationship("SessionEmbedding", back_populates="session", cascade="all, delete-orphan")

class SessionEmbedding(Base):
    __tablename__ = "session_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    # Denormalized user_id and batch_id to make RBAC queries fast without needing SQL JOINs
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=True, index=True)
    
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=False) # 384 dims for sentence-transformers/all-MiniLM-L6-v2
    
    session = relationship("Session", back_populates="embeddings")

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(10), nullable=False) # 'user' or 'assistant'
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    user = relationship("User", back_populates="chat_history")

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text)
    duration_months = Column(Integer, default=6)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    
    batches = relationship("Batch", back_populates="course", cascade="all, delete-orphan")

class Batch(Base):
    __tablename__ = "batches"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    batch_code = Column(String(20), unique=True, index=True) # For student self-registration
    start_date = Column(Date)
    end_date = Column(Date)
    enrollment_deadline = Column(Date)
    is_active = Column(Boolean, default=True)
    status = Column(SQLEnum(BatchStatus), nullable=False, default=BatchStatus.ongoing)
    
    assigned_admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Will be made NOT NULL in business logic
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    
    course = relationship("Course", back_populates="batches")

class AdminCourseMap(Base):
    __tablename__ = "admin_course_map"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (UniqueConstraint('admin_id', 'course_id', name='uq_admin_course'),)

class FacultyCourseMap(Base):
    __tablename__ = "faculty_course_map"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (UniqueConstraint('faculty_id', 'course_id', name='uq_faculty_course'),)

class FacultyBatchMap(Base):
    __tablename__ = "faculty_batch_map"
    
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (UniqueConstraint('faculty_id', 'batch_id', name='uq_faculty_batch'),)

class StudentBatchMap(Base):
    __tablename__ = "student_batch_map"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (UniqueConstraint('student_id', 'batch_id', name='uq_student_batch'),)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    session_date = Column(Date, nullable=False)
    is_present = Column(Boolean, nullable=False)
    marked_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (UniqueConstraint('student_id', 'batch_id', 'session_date', name='uq_student_batch_date'),)

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False)
    target_type = Column(String(50), nullable=False) # e.g., 'user', 'batch', 'course'
    target_id = Column(Integer, nullable=True)
    details = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), index=True)
