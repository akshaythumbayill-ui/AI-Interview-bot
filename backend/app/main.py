"""
FastAPI application entry point.
"""

import logging
from starlette.responses import JSONResponse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import init_db
from app.routes.interview import router as interview_router, history_router
from app.routes.auth import router as auth_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


class RequestBodyTooLarge(Exception):
    pass


class RequestGuardMiddleware:
    """Bound API body sizes and add baseline browser security headers."""

    def __init__(self, app):
        self.app = app
        self.max_body_bytes = settings.max_resume_bytes + 1024 * 1024

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                body_size = int(content_length)
            except ValueError:
                response = JSONResponse({"detail": "Invalid Content-Length."}, status_code=400)
                await response(scope, receive, send)
                return
            if body_size > self.max_body_bytes:
                response = JSONResponse({"detail": "Request body exceeds the allowed size."}, status_code=413)
                await response(scope, receive, send)
                return

        received_bytes = 0

        async def guarded_receive():
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_body_bytes:
                    raise RequestBodyTooLarge
            return message

        async def guarded_send(message):
            if message["type"] == "http.response.start":
                response_headers = list(message.get("headers", []))
                security_headers = {
                    b"x-content-type-options": b"nosniff",
                    b"x-frame-options": b"DENY",
                    b"referrer-policy": b"strict-origin-when-cross-origin",
                    b"permissions-policy": b"camera=(), microphone=(self), geolocation=()",
                }
                if settings.app_env.lower() in {"production", "prod"}:
                    security_headers[b"strict-transport-security"] = b"max-age=31536000; includeSubDomains"
                present = {name.lower() for name, _ in response_headers}
                response_headers.extend(
                    (name, value) for name, value in security_headers.items() if name not in present
                )
                message["headers"] = response_headers
            await send(message)

        try:
            await self.app(scope, guarded_receive, guarded_send)
        except RequestBodyTooLarge:
            response = JSONResponse({"detail": "Request body exceeds the allowed size."}, status_code=413)
            await response(scope, receive, send)

app = FastAPI(
    title="MockingBird",
    description="Personalized voice-first mock interview app for IT freshers",
    version="1.0.0",
)

app.add_middleware(RequestGuardMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(interview_router)
app.include_router(history_router)


@app.on_event("startup")
async def startup():
    logger.info("Initialising database …")
    if settings.app_env.lower() not in {"production", "prod"} and "change_me" in settings.secret_key.lower():
        logger.warning("Using the development JWT secret. Set a unique SECRET_KEY before deployment.")
    init_db()
    logger.info("Database ready.")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MockingBird"}
