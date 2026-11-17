"""
Pydantic v2 schemas for request / response validation.
"""

from __future__ import annotations
from typing import Optional, List, Literal, Annotated
from pydantic import BaseModel, ConfigDict, Field, field_validator, EmailStr


class GuardedModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(GuardedModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    full_name: Optional[str] = Field(default=None, max_length=80)
    password: str = Field(..., min_length=4, max_length=72)

    @field_validator("password")
    @classmethod
    def enforce_bcrypt_password_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class LoginRequest(GuardedModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)

    @field_validator("password")
    @classmethod
    def enforce_bcrypt_password_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class TokenResponse(GuardedModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class UserPublic(GuardedModel):
    id: str
    email: str
    username: str
    full_name: Optional[str] = None


# ── Interview Setup ────────────────────────────────────────────────────────────

class StartInterviewRequest(GuardedModel):
    """Body fields for /api/interview/start (resume is uploaded separately)."""
    role: str = Field(..., min_length=1, max_length=100, description="Target role, e.g. 'Python Developer'")
    interview_type: str = Field(..., min_length=1, max_length=40, description="HR | Technical | Project | Mixed")
    difficulty: str = Field(default="Beginner", min_length=1, max_length=30, description="Beginner | Intermediate")
    num_questions: int = Field(default=10, ge=3, le=15)
    job_description: Optional[str] = Field(default=None, max_length=8000, description="Optional JD text")


class StartInterviewResponse(GuardedModel):
    session_id: str
    first_question: str
    question_number: int = 1
    total_questions: int


# ── Answer Submission ──────────────────────────────────────────────────────────

class AnswerRequest(GuardedModel):
    session_id: str = Field(..., min_length=1, max_length=64)
    answer_text: str = Field(..., min_length=1, max_length=8000)
    input_mode: Literal["voice", "chat"] = "chat"
    duration_seconds: Optional[float] = Field(default=None, ge=0, le=3600)

    @field_validator("answer_text")
    @classmethod
    def reject_blank_answer(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Answer cannot be blank")
        return value


class EvaluationResult(GuardedModel):
    """Strict JSON the LLM must return for every answer."""
    feedback: str = Field(..., min_length=1, max_length=2000)
    score_technical: float = Field(ge=0, le=10)
    score_clarity: float = Field(ge=0, le=10)
    score_depth: float = Field(ge=0, le=10)
    ideal_answer_summary: str = Field(..., max_length=2000)
    next_question: str = Field(..., max_length=500)
    interview_state: Literal["FOLLOW_UP", "NEXT_TOPIC", "HARDER", "EASIER", "FINAL_REPORT"] = "NEXT_TOPIC"


class AnswerResponse(GuardedModel):
    evaluation: EvaluationResult
    next_question: Optional[str] = None   # None when done == True
    question_number: int
    total_questions: int
    done: bool = False
    speech_analytics: Optional[SpeechAnalytics] = None


# ── Speech Analytics ──────────────────────────────────────────────────────────

class SpeechAnalytics(GuardedModel):
    filler_word_count: int = 0
    filler_words_found: List[str] = Field(default_factory=list)
    words_per_minute: Optional[float] = None
    total_words: int = 0
    duration_seconds: Optional[float] = None


# ── Report ────────────────────────────────────────────────────────────────────

class QuestionFeedback(GuardedModel):
    question_number: int
    question: str
    answer: Optional[str]
    score_technical: Optional[float]
    score_clarity: Optional[float]
    score_depth: Optional[float]
    feedback: Optional[str]
    ideal_answer_summary: Optional[str]
    filler_word_count: int = 0
    words_per_minute: Optional[float] = None


class ReportResponse(GuardedModel):
    session_id: str
    role: str
    interview_type: str
    difficulty: str
    overall_score: Optional[float]
    score_technical_avg: Optional[float]
    score_clarity_avg: Optional[float]
    score_depth_avg: Optional[float]
    strengths: List[str] = Field(default_factory=list)
    weak_areas: List[str] = Field(default_factory=list)
    improvement_plan: str = ""
    per_question: List[QuestionFeedback] = Field(default_factory=list)
    created_at: Optional[str] = None


class ReportInsights(GuardedModel):
    strengths: List[Annotated[str, Field(min_length=1, max_length=200)]] = Field(default_factory=list, max_length=8)
    weak_areas: List[Annotated[str, Field(min_length=1, max_length=200)]] = Field(default_factory=list, max_length=8)
    improvement_plan: str = Field(..., max_length=2000)


# ── History ───────────────────────────────────────────────────────────────────

class SessionSummary(GuardedModel):
    session_id: str
    role: str
    interview_type: str
    difficulty: str
    overall_score: Optional[float]
    num_questions: int
    created_at: str
    status: str


class HistoryResponse(GuardedModel):
    sessions: List[SessionSummary]
