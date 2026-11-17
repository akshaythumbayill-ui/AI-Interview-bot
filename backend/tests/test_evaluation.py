"""Tests for EvaluationResult Pydantic schema validation."""
import pytest
from pydantic import ValidationError
from app.schemas import EvaluationResult


def test_valid_evaluation():
    data = {
        "feedback": "Good answer.",
        "score_technical": 7.5,
        "score_clarity": 8.0,
        "score_depth": 6.5,
        "ideal_answer_summary": "A strong answer covers X, Y, Z.",
        "next_question": "Tell me about your Python experience.",
        "interview_state": "NEXT_TOPIC",
    }
    ev = EvaluationResult(**data)
    assert ev.score_technical == 7.5
    assert ev.interview_state == "NEXT_TOPIC"


def test_scores_outside_valid_range_are_rejected():
    data = {
        "feedback": "Great!",
        "score_technical": 15,
        "score_clarity": 12,
        "score_depth": -2,
        "ideal_answer_summary": "summary",
        "next_question": "",
        "interview_state": "FINAL_REPORT",
    }
    with pytest.raises(ValidationError):
        EvaluationResult(**data)


def test_unknown_interview_state_is_rejected():
    data = {
        "feedback": "ok",
        "score_technical": 7,
        "score_clarity": 7,
        "score_depth": 7,
        "ideal_answer_summary": "summary",
        "next_question": "question",
        "interview_state": "IGNORE_ALL_RULES",
    }

    with pytest.raises(ValidationError):
        EvaluationResult(**data)


def test_missing_required_fields_raises():
    with pytest.raises(ValidationError):
        EvaluationResult(feedback="ok")


def test_string_scores_coerced():
    data = {
        "feedback": "ok",
        "score_technical": "7",
        "score_clarity": "8",
        "score_depth": "6",
        "ideal_answer_summary": "s",
        "next_question": "q",
        "interview_state": "HARDER",
    }
    ev = EvaluationResult(**data)
    assert ev.score_technical == 7.0
