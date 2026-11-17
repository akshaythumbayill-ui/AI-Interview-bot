"""
Auth routes:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me
"""

from __future__ import annotations
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.models import get_db, User
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserPublic
from app.services.auth import (
    create_user, authenticate_user, create_access_token,
    decode_token, get_user_by_id, get_user_by_email, get_user_by_username,
)
from app.services.rate_limit import consume_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)
_AUTH_WINDOW_SECONDS = 60
_AUTH_MAX_ATTEMPTS = 10


def limit_auth_attempts(request: Request) -> None:
    """Apply a per-process IP limit to credential-creating and sign-in endpoints."""
    client_ip = request.client.host if request.client else "unknown"
    retry_after = consume_rate_limit(f"auth:{client_ip}", _AUTH_MAX_ATTEMPTS, _AUTH_WINDOW_SECONDS)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )


# ── Dependency: get current user from Bearer token ────────────────────────────

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: DBSession = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_token(creds.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ── POST /register ────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=201,
    dependencies=[Depends(limit_auth_attempts)],
)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):
    if get_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if get_user_by_username(db, body.username):
        raise HTTPException(status_code=400, detail="This username is already taken.")

    try:
        user = create_user(
            db=db,
            email=body.email,
            username=body.username,
            password=body.password,
            full_name=body.full_name.strip() if body.full_name else None,
        )
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="This email or username is already registered.") from error
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user.id, email=user.email,
                        username=user.username, full_name=user.full_name),
    )


# ── POST /login ───────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(limit_auth_attempts)],
)
def login(body: LoginRequest, db: DBSession = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user.id, email=user.email,
                        username=user.username, full_name=user.full_name),
    )


# ── GET /me ───────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)):
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
    )
