from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app.models import InterviewSession, init_db


def test_init_db_adds_session_owner_column_to_existing_database():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id VARCHAR PRIMARY KEY)"))
        connection.execute(text("""
            CREATE TABLE interview_sessions (
                id VARCHAR PRIMARY KEY,
                created_at DATETIME,
                role VARCHAR NOT NULL,
                interview_type VARCHAR NOT NULL,
                difficulty VARCHAR NOT NULL,
                num_questions INTEGER,
                status VARCHAR,
                overall_score FLOAT,
                resume_filename VARCHAR,
                job_description TEXT
            )
        """))
        connection.execute(text("""
            INSERT INTO interview_sessions (id, role, interview_type, difficulty, status)
            VALUES ('legacy-session', 'Developer', 'Technical', 'Beginner', 'completed')
        """))

    init_db(bind=engine)

    columns = {column["name"] for column in inspect(engine).get_columns("interview_sessions")}
    with Session(engine) as db:
        legacy_session = db.get(InterviewSession, "legacy-session")

    assert "user_id" in columns
    assert legacy_session is not None
    assert legacy_session.user_id is None
    engine.dispose()
