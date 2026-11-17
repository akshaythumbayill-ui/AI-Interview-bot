"""Tests for the speech / filler-word analyzer."""
import pytest
from app.services.speech_analysis import analyze_speech


def test_no_fillers():
    result = analyze_speech("I designed a REST API using FastAPI and deployed it on AWS.")
    assert result.filler_word_count == 0
    assert result.filler_words_found == []


def test_filler_words_detected():
    text = "Um so basically I uh used Python like you know for the backend."
    result = analyze_speech(text)
    assert result.filler_word_count >= 4
    assert "um" in result.filler_words_found or "uh" in result.filler_words_found


def test_wpm_calculation():
    # 60 words spoken in 30 seconds = 120 WPM
    text = " ".join(["word"] * 60)
    result = analyze_speech(text, duration_seconds=30.0)
    assert result.words_per_minute == pytest.approx(120.0, abs=1)


def test_wpm_none_without_duration():
    result = analyze_speech("hello world")
    assert result.words_per_minute is None


def test_empty_transcript():
    result = analyze_speech("")
    assert result.filler_word_count == 0
    assert result.total_words == 0


def test_total_words_count():
    result = analyze_speech("one two three four five")
    assert result.total_words == 5
