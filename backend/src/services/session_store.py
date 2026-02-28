"""In-memory session store for hackathon. Replace with Firestore for production."""
import uuid
from datetime import datetime

from src.models.session import Session

_sessions: dict[str, Session] = {}


def create_session() -> Session:
    session_id = str(uuid.uuid4())[:8]
    session = Session(session_id=session_id, created_at=datetime.now())
    _sessions[session_id] = session
    return session


def get_session(session_id: str) -> Session | None:
    return _sessions.get(session_id)


def update_session(session_id: str, **kwargs) -> Session | None:
    session = _sessions.get(session_id)
    if session is None:
        return None
    for key, value in kwargs.items():
        if hasattr(session, key):
            setattr(session, key, value)
    return session
