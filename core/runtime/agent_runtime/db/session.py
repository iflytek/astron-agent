from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from agent_runtime.settings import get_settings


def _connect_args(database_url: str) -> dict[str, object]:
    return {"check_same_thread": False} if database_url.startswith("sqlite") else {}


settings = get_settings()
database_url = settings.resolved_database_url()
engine_options: dict[str, object] = {
    "pool_pre_ping": True,
    "connect_args": _connect_args(database_url),
}
if "mode=memory" in database_url:
    engine_options["poolclass"] = StaticPool
engine = create_engine(
    database_url,
    **engine_options,
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
