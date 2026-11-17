"""Tests for the resume parser and chunker."""
import pytest
from app.services.resume import chunk_resume_text, extract_resume_summary


def test_chunk_basic():
    text = " ".join([f"word{i}" for i in range(1000)])
    chunks = chunk_resume_text(text, chunk_size=100, overlap=20)
    assert len(chunks) > 1
    # Every chunk should have <= 100 words
    for chunk in chunks:
        assert len(chunk.split()) <= 100


def test_chunk_overlap():
    words = [f"w{i}" for i in range(50)]
    text = " ".join(words)
    chunks = chunk_resume_text(text, chunk_size=20, overlap=5)
    # Second chunk should start before word 20 (overlap)
    assert len(chunks) >= 2
    second_start = chunks[1].split()[0]
    assert second_start in words[10:20]


def test_chunk_empty():
    assert chunk_resume_text("") == []


def test_chunk_short_text():
    text = "Hello world this is a short resume."
    chunks = chunk_resume_text(text, chunk_size=400, overlap=80)
    assert len(chunks) == 1
    assert chunks[0] == text.strip()


def test_summary_truncation():
    long_text = "A" * 2000
    summary = extract_resume_summary(long_text, max_chars=1200)
    assert len(summary) <= 1200


def test_summary_empty():
    assert extract_resume_summary("") == ""
