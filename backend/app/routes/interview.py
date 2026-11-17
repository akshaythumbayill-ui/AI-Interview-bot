"""
Interview API routes:
  POST /api/interview/start
  POST /api/interview/answer
  GET  /api/interview/{session_id}/report
  GET  /api/interview/{session_id}/report/pdf
  GET  /api/history
"""

from __future__ import annotations
import logging
import uuid
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import ValidationError
from sqlalchemy.orm import Session as DBSession

from app.models import InterviewSession, QAPair, get_db, User
from app.config import get_settings
from app.schemas import (
    StartInterviewResponse,
    AnswerRequest,
    AnswerResponse,
    EvaluationResult,
    ReportResponse,
    HistoryResponse,
    SessionSummary,
    SpeechAnalytics,
)
from app.routes.auth import get_current_user
from app.prompts import (
    system_prompt,
    intro_prompt,
    next_question_prompt,
    EVALUATION_SYSTEM_PROMPT,
    evaluation_user_prompt,
)
from app.services import llm as llm_service
from app.services.resume import (
    parse_resume_pdf,
    chunk_resume_text,
    extract_resume_summary,
    ResumeValidationError,
)
from app.services.rag import build_index, retrieve
from app.services.speech_analysis import analyze_speech
from app.services.rate_limit import consume_rate_limit
from app.services.report import build_report_data, generate_pdf_report
from app.graph.interview_graph import interview_graph, InterviewState

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/interview", tags=["interview"])

# In-memory session state store (replace with Redis for production)
_session_states: dict[str, InterviewState] = {}
settings = get_settings()


def _get_owned_session(db: DBSession, session_id: str, user_id: str) -> InterviewSession:
    session = (
        db.query(InterviewSession)
        .filter_by(id=session_id, user_id=user_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _enforce_turn_state(evaluation: EvaluationResult, question_number: int, total_questions: int) -> EvaluationResult:
    if question_number >= total_questions and evaluation.interview_state != "FINAL_REPORT":
        return evaluation.model_copy(update={"interview_state": "FINAL_REPORT"})
    if question_number < total_questions and evaluation.interview_state == "FINAL_REPORT":
        return evaluation.model_copy(update={"interview_state": "NEXT_TOPIC"})
    return evaluation


def _enforce_user_quota(user_id: str, operation: str, limit: int) -> None:
    retry_after = consume_rate_limit(f"user:{user_id}:{operation}", limit, 60 * 60)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Usage limit reached. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


# ── POST /start ───────────────────────────────────────────────────────────────

@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(
    role: str = Form(..., min_length=1, max_length=100),
    interview_type: str = Form(..., min_length=1, max_length=40),
    difficulty: str = Form(default="Beginner", min_length=1, max_length=30),
    num_questions: int = Form(default=10, ge=3, le=15),
    job_description: Optional[str] = Form(default=None, max_length=8000),
    resume: Optional[UploadFile] = File(default=None),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new interview session.
    Parses the uploaded resume (if provided), builds the FAISS index,
    and returns the first interview question.
    """
    _enforce_user_quota(current_user.id, "interview-start", 10)
    role = role.strip()
    interview_type = interview_type.strip()
    difficulty = difficulty.strip()
    if not role or not interview_type or not difficulty:
        raise HTTPException(status_code=422, detail="Role, interview type, and difficulty are required.")

    session_id = str(uuid.uuid4())

    # Parse resume
    resume_text = ""
    resume_filename = None
    if resume and resume.filename:
        if not resume.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=415, detail="Resume upload must be a PDF file.")
        raw_bytes = await resume.read(settings.max_resume_bytes + 1)
        if len(raw_bytes) > settings.max_resume_bytes:
            max_size_mb = settings.max_resume_bytes // (1024 * 1024)
            raise HTTPException(status_code=413, detail=f"Resume exceeds the {max_size_mb} MB upload limit.")
        if not raw_bytes.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail="Uploaded resume is not a valid PDF.")
        try:
            resume_text = parse_resume_pdf(raw_bytes, max_pages=settings.max_resume_pages)
        except ResumeValidationError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        resume_filename = resume.filename.replace("\\", "/").rsplit("/", 1)[-1][:255]
        if resume_text:
            chunks = chunk_resume_text(resume_text)
            build_index(session_id, chunks)

    resume_summary = extract_resume_summary(resume_text)

    # Generate first question via LLM
    sys_prompt = system_prompt(role, interview_type, difficulty)
    try:
        first_q = llm_service.get_completion(
            system_prompt=sys_prompt,
            user_prompt=intro_prompt(role, resume_summary),
            temperature=0.7,
            max_tokens=200,
        ).strip()
    except Exception as error:
        logger.exception("Initial interview question generation failed")
        raise HTTPException(status_code=503, detail="Interview service is temporarily unavailable.") from error
    if not first_q or len(first_q) > 500:
        raise HTTPException(status_code=502, detail="Interview service returned an invalid question.")

    # Persist only after the external model has produced a usable first question.
    session_row = InterviewSession(
        id=session_id,
        user_id=current_user.id,
        role=role,
        interview_type=interview_type,
        difficulty=difficulty,
        num_questions=num_questions,
        resume_filename=resume_filename,
        job_description=job_description.strip() if job_description else None,
    )
    db.add(session_row)
    db.commit()

    # Persist first question
    qa = QAPair(
        session_id=session_id,
        question_number=1,
        question=first_q,
    )
    db.add(qa)
    db.commit()

    # Initialize LangGraph state
    state: InterviewState = {
        "session_id": session_id,
        "role": role,
        "interview_type": interview_type,
        "difficulty": difficulty,
        "num_questions": num_questions,
        "current_question": first_q,
        "current_question_number": 1,
        "answer": "",
        "input_mode": "chat",
        "duration_seconds": None,
        "interview_state": "QUESTION",
        "history": [],
        "resume_context": "",
        "evaluation": None,
        "done": False,
    }
    _session_states[session_id] = state

    return StartInterviewResponse(
        session_id=session_id,
        first_question=first_q,
        question_number=1,
        total_questions=num_questions,
    )


# ── POST /answer ──────────────────────────────────────────────────────────────

@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(
    body: AnswerRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept a candidate answer (voice or chat), evaluate it via LLM,
    run the LangGraph transition, and return the next question (or done=True).
    """
    session_row = _get_owned_session(db, body.session_id, current_user.id)
    _enforce_user_quota(current_user.id, "answer", 100)
    state = _session_states.get(body.session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if session_row.status == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")

    current_q = state["current_question"]
    q_number = state["current_question_number"]
    total_q = state["num_questions"]

    # Speech analytics (voice answers only)
    speech_analytics: Optional[SpeechAnalytics] = None
    if body.input_mode == "voice":
        speech_analytics = analyze_speech(body.answer_text, body.duration_seconds)

    # RAG retrieval — enrich evaluation with resume context
    resume_context = retrieve(body.session_id, current_q + " " + body.answer_text[:200])

    # Evaluate the answer via LLM
    try:
        eval_dict = llm_service.get_json_completion(
            system_prompt=EVALUATION_SYSTEM_PROMPT,
            user_prompt=evaluation_user_prompt(
                question=current_q,
                answer=body.answer_text,
                role=state["role"],
                difficulty=state["difficulty"],
                question_number=q_number,
                total_questions=total_q,
                resume_context=resume_context,
            ),
            temperature=0.3,
            max_tokens=800,
        )
    except Exception as error:
        logger.exception("Answer evaluation failed")
        raise HTTPException(status_code=503, detail="Answer evaluation is temporarily unavailable. Please retry.") from error

    # Validate with Pydantic
    try:
        evaluation = EvaluationResult.model_validate(eval_dict)
    except (ValidationError, TypeError) as error:
        logger.warning("Evaluation response failed schema validation: %s", error)
        raise HTTPException(status_code=502, detail="Interview service returned an invalid evaluation. Please retry.") from error
    evaluation = _enforce_turn_state(evaluation, q_number, total_q)

    # Persist answer & evaluation
    qa_row: Optional[QAPair] = (
        db.query(QAPair)
        .filter_by(session_id=body.session_id, question_number=q_number)
        .first()
    )
    if qa_row:
        qa_row.answer = body.answer_text
        qa_row.input_mode = body.input_mode
        qa_row.duration_seconds = body.duration_seconds
        qa_row.score_technical = evaluation.score_technical
        qa_row.score_clarity = evaluation.score_clarity
        qa_row.score_depth = evaluation.score_depth
        qa_row.feedback = evaluation.feedback
        qa_row.ideal_answer_summary = evaluation.ideal_answer_summary
        if speech_analytics:
            qa_row.filler_word_count = speech_analytics.filler_word_count
            qa_row.words_per_minute = speech_analytics.words_per_minute
        db.commit()

    # Run LangGraph transition
    state["answer"] = body.answer_text
    state["evaluation"] = evaluation.model_dump()
    state["input_mode"] = body.input_mode
    state["duration_seconds"] = body.duration_seconds
    state["resume_context"] = resume_context

    new_state = interview_graph.invoke(state)
    next_interview_state = new_state.get("interview_state", "NEXT_TOPIC")
    done = new_state.get("done", False) or next_interview_state == "FINAL_REPORT"
    done = done or q_number >= total_q

    # Generate next question if not done
    next_question_text: Optional[str] = None
    if not done:
        new_q_number = new_state.get("current_question_number", q_number + 1)
        # Build conversation history for prompt
        history_rows = (
            db.query(QAPair)
            .filter_by(session_id=body.session_id)
            .order_by(QAPair.question_number)
            .all()
        )
        history = [
            {"question": r.question, "answer": r.answer or ""}
            for r in history_rows if r.answer
        ]

        fresh_resume_context = retrieve(body.session_id, evaluation.next_question or current_q)

        try:
            next_question_text = llm_service.get_completion(
                system_prompt=system_prompt(state["role"], state["interview_type"], state["difficulty"]),
                user_prompt=next_question_prompt(
                    role=state["role"],
                    interview_type=state["interview_type"],
                    difficulty=state["difficulty"],
                    history=history,
                    resume_context=fresh_resume_context,
                    state=next_interview_state,
                    question_number=new_q_number,
                    total_questions=total_q,
                ),
                temperature=0.7,
                max_tokens=200,
            ).strip()
        except Exception as error:
            logger.exception("Next interview question generation failed")
            raise HTTPException(status_code=503, detail="Interview service is temporarily unavailable. Please retry.") from error
        if not next_question_text or len(next_question_text) > 500:
            raise HTTPException(status_code=502, detail="Interview service returned an invalid question. Please retry.")

        # Persist next question row
        next_qa = QAPair(
            session_id=body.session_id,
            question_number=new_q_number,
            question=next_question_text,
        )
        db.add(next_qa)
        db.commit()

        new_state["current_question"] = next_question_text
        new_state["current_question_number"] = new_q_number

    _session_states[body.session_id] = new_state

    # Build report if done
    if done:
        try:
            build_report_data(body.session_id, db)
        except Exception as e:
            logger.error(f"Report build failed: {e}")

    return AnswerResponse(
        evaluation=evaluation,
        next_question=next_question_text,
        question_number=q_number,
        total_questions=total_q,
        done=done,
        speech_analytics=speech_analytics,
    )


# ── GET /{session_id}/report ──────────────────────────────────────────────────

@router.get("/{session_id}/report", response_model=ReportResponse)
async def get_report(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the final report JSON for a completed session."""
    session_row = _get_owned_session(db, session_id, current_user.id)

    if session_row.status != "completed":
        # Build on demand if not yet generated
        try:
            return build_report_data(session_id, db)
        except Exception as error:
            logger.exception("Report generation failed for session %s", session_id)
            raise HTTPException(status_code=400, detail="Report could not be generated.") from error

    return build_report_data(session_id, db)


# ── GET /{session_id}/report/pdf ──────────────────────────────────────────────

@router.get("/{session_id}/report/pdf")
async def get_report_pdf(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and stream a PDF report."""
    _get_owned_session(db, session_id, current_user.id)

    report = build_report_data(session_id, db)
    pdf_bytes = generate_pdf_report(report)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{session_id[:8]}.pdf"'},
    )


# ── GET /history (note: defined on a separate router to avoid prefix clash) ───

history_router = APIRouter(prefix="/api", tags=["history"])


@history_router.get("/history", response_model=HistoryResponse)
async def get_history(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's interview sessions ordered by most recent."""
    rows = (
        db.query(InterviewSession)
        .filter_by(user_id=current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    return HistoryResponse(
        sessions=[
            SessionSummary(
                session_id=r.id,
                role=r.role,
                interview_type=r.interview_type,
                difficulty=r.difficulty,
                overall_score=r.overall_score,
                num_questions=r.num_questions,
                created_at=r.created_at.isoformat(),
                status=r.status,
            )
            for r in rows
        ]
    )
