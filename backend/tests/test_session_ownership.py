import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, InterviewSession, User
from app.routes.interview import _get_owned_session


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    try:
        session.add_all([
            User(id="user-1", email="one@example.com", username="one", hashed_password="hash"),
            User(id="user-2", email="two@example.com", username="two", hashed_password="hash"),
            InterviewSession(
                id="session-1",
                user_id="user-1",
                role="Python Developer",
                interview_type="Technical",
                difficulty="Beginner",
            ),
        ])
        session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_session_is_available_to_its_owner(db_session):
    session = _get_owned_session(db_session, "session-1", "user-1")

    assert session.id == "session-1"


def test_session_is_hidden_from_other_users(db_session):
    with pytest.raises(HTTPException) as error:
        _get_owned_session(db_session, "session-1", "user-2")

    assert error.value.status_code == 404
