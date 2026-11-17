"""
Groq LLM client wrapper.
- get_completion()     : plain text response
- get_json_completion(): JSON-mode with one automatic retry on malformed output
"""

from __future__ import annotations
import json
import logging
from typing import Optional

from groq import Groq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: Optional[Groq] = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not set in .env")
        _client = Groq(api_key=settings.groq_api_key, timeout=30, max_retries=1)
    return _client


def get_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> str:
    """Return a plain-text LLM response."""
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


def get_json_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 1024,
    retries: int = 1,
) -> dict:
    """
    Return a parsed JSON dict from the LLM.
    Retries once if the first response is malformed.
    Raises ValueError after all retries are exhausted.
    """
    client = _get_client()
    last_error: Optional[Exception] = None

    for attempt in range(retries + 1):
        try:
            response = client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content.strip()
            return json.loads(raw)
        except json.JSONDecodeError as e:
            last_error = e
            logger.warning("JSON parse failed (attempt %s): %s", attempt + 1, e)
        except Exception as e:
            last_error = e
            logger.error(f"LLM call failed (attempt {attempt+1}): {e}")
            raise

    raise ValueError(f"LLM returned invalid JSON after {retries+1} attempts: {last_error}")
