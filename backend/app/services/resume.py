"""
PDF resume parsing and chunking.
- parse_resume_pdf(): extract raw text from an uploaded PDF
- chunk_resume_text(): split into overlapping chunks for RAG indexing
"""

from __future__ import annotations
import io
import logging
import re
from typing import List

logger = logging.getLogger(__name__)


class ResumeValidationError(ValueError):
    pass


def parse_resume_pdf(file_bytes: bytes, max_pages: int = 10) -> str:
    """
    Extract plain text from a PDF byte stream.
    Rejects encrypted, malformed, or oversized-page-count PDFs explicitly.
    """
    from pypdf import PdfReader  # lazy import — not needed for non-resume sessions

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        if reader.is_encrypted:
            raise ResumeValidationError("Password-protected resumes are not supported.")
        if len(reader.pages) > max_pages:
            raise ResumeValidationError(f"Resume must contain no more than {max_pages} pages.")
        pages = []
        extracted_chars = 0
        for page in reader.pages:
            if extracted_chars >= 100_000:
                break
            text = page.extract_text() or ""
            remaining_chars = 100_000 - extracted_chars
            pages.append(text[:remaining_chars])
            extracted_chars += min(len(text), remaining_chars)
        raw = "\n".join(pages)
    except ResumeValidationError:
        raise
    except Exception as error:
        logger.warning("Resume PDF parsing failed: %s", error)
        raise ValueError("Could not read the uploaded PDF. Please use a valid, unencrypted PDF.") from error

    # Normalize whitespace.
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    raw = re.sub(r"[ \t]{2,}", " ", raw)
    return raw.strip()


def chunk_resume_text(
    text: str,
    chunk_size: int = 400,
    overlap: int = 80,
) -> List[str]:
    """
    Split resume text into overlapping chunks by word count.
    Returns a list of chunk strings suitable for embedding.
    """
    words = text.split()
    if not words:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap

    return chunks


def extract_resume_summary(text: str, max_chars: int = 1200) -> str:
    """
    Return a condensed resume summary (first max_chars characters) to inject
    into the interview system prompt without triggering RAG.
    """
    if not text:
        return ""
    return text[:max_chars].strip()
