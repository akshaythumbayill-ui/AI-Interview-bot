"""
Speech analytics for voice answers.
- analyze_speech(): filler-word count, WPM, long-pause detection
"""

from __future__ import annotations
import re
from typing import List
from app.schemas import SpeechAnalytics

FILLER_WORDS = {
    "um", "uh", "like", "you know", "basically", "literally",
    "actually", "so", "right", "okay", "well", "i mean",
    "kind of", "sort of", "you see",
}

# Regex compiled once at import time
_FILLER_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(fw) for fw in sorted(FILLER_WORDS, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)


def analyze_speech(transcript: str, duration_seconds: float | None = None) -> SpeechAnalytics:
    """
    Analyze a voice transcript for filler words and speaking pace.

    Args:
        transcript:       The speech-to-text transcript string.
        duration_seconds: Length of the recorded audio in seconds (optional).

    Returns:
        SpeechAnalytics with counts and WPM.
    """
    if not transcript or not transcript.strip():
        return SpeechAnalytics()

    # Count filler-word occurrences
    matches: List[str] = _FILLER_PATTERN.findall(transcript.lower())
    filler_count = len(matches)
    filler_found = list({m.lower() for m in matches})

    # Word count
    words = transcript.split()
    total_words = len(words)

    # WPM
    wpm: float | None = None
    if duration_seconds and duration_seconds > 0 and total_words > 0:
        wpm = round((total_words / duration_seconds) * 60, 1)

    return SpeechAnalytics(
        filler_word_count=filler_count,
        filler_words_found=filler_found,
        words_per_minute=wpm,
        total_words=total_words,
        duration_seconds=duration_seconds,
    )
