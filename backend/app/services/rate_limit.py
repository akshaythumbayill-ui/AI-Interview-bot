"""Small process-local sliding-window limiter for single-process deployments."""

from __future__ import annotations

from collections import deque
import threading
import time

_attempts: dict[str, deque[float]] = {}
_lock = threading.Lock()


def consume_rate_limit(key: str, limit: int, window_seconds: int) -> int | None:
    """Consume one attempt, or return the number of seconds until retry."""
    now = time.monotonic()
    with _lock:
        recent = _attempts.setdefault(key, deque())
        while recent and now - recent[0] >= window_seconds:
            recent.popleft()
        if len(recent) >= limit:
            return max(1, int(window_seconds - (now - recent[0])))

        recent.append(now)
        expired = [
            item_key for item_key, attempts in _attempts.items()
            if not attempts or now - attempts[-1] >= window_seconds
        ]
        for item_key in expired:
            _attempts.pop(item_key, None)
    return None
