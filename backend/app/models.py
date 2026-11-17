"""
SQLAlchemy ORM models.
Default backend: SQLite (easy swap to PostgreSQL via DATABASE_URL in .env).
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime,
    ForeignKey, JSON, Boolean, create_engine, inspect, text,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from app.config import get_settings

settings = get_settings()

Base = declarative_base()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    """Registered user account."""
    __tablename__ = "users"

    id         = Column(String, primary_key=True)          # UUID string
    created_at = Column(DateTime, default=datetime.utcnow)
    email      = Column(String, unique=True, nullable=False, index=True)
    username   = Column(String, unique=True, nullable=False, index=True)
    full_name  = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active  = Column(Boolean, default=True)

    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")


# ── Interview Session ─────────────────────────────────────────────────────────

class InterviewSession(Base):
    """One mock-interview run."""
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True)          # UUID string
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # nullable for legacy rows
    created_at = Column(DateTime, default=datetime.utcnow)
    role = Column(String, nullable=False)
    interview_type = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    num_questions = Column(Integer, default=10)
    status = Column(String, default="active")       # active | completed
    overall_score = Column(Float, nullable=True)
    resume_filename = Column(String, nullable=True)
    job_description = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")
    qa_pairs = relationship("QAPair", back_populates="session", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="session", uselist=False, cascade="all, delete-orphan")


class QAPair(Base):
    """One question-answer exchange within a session."""
    __tablename__ = "qa_pairs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    input_mode = Column(String, default="chat")
    duration_seconds = Column(Float, nullable=True)
    score_technical = Column(Float, nullable=True)
    score_clarity = Column(Float, nullable=True)
    score_depth = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    ideal_answer_summary = Column(Text, nullable=True)
    filler_word_count = Column(Integer, default=0)
    words_per_minute = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="qa_pairs")


class Report(Base):
    """Aggregated final report for a completed session."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=False, unique=True)
    overall_score = Column(Float, nullable=True)
    score_technical_avg = Column(Float, nullable=True)
    score_clarity_avg = Column(Float, nullable=True)
    score_depth_avg = Column(Float, nullable=True)
    strengths = Column(JSON, nullable=True)
    weak_areas = Column(JSON, nullable=True)
    improvement_plan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="report")


def init_db(bind=engine):
    """Create tables and apply small additive migrations needed by existing databases."""
    Base.metadata.create_all(bind=bind)
    session_columns = {
        column["name"] for column in inspect(bind).get_columns("interview_sessions")
    }
    if "user_id" not in session_columns:
        with bind.begin() as connection:
            connection.execute(text(
                "ALTER TABLE interview_sessions "
                "ADD COLUMN user_id VARCHAR REFERENCES users(id)"
            ))
