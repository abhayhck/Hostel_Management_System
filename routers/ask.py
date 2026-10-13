import logging
import time
import database_models

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from collections import defaultdict, deque
from auth import require_admin
from database import get_readonly_db, sessionlocal
from llm_schema import build_schema_text, SCHEMA_NOTES
from llm_client import generate_sql
from sql_guard import validate_sql

logger = logging.getLogger(__name__)
router = APIRouter(tags=["AI"])

MAX_ROWS = 200
_schema_cache = {"text": None, "at": 0.0}


RATE_LIMIT = 10      # questions allowed...
RATE_WINDOW = 60     # ...per this many seconds, per admin
_recent = defaultdict(deque)


def check_rate_limit(user_id: int):
    now = time.time()
    q = _recent[user_id]
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many questions. Wait a minute and try again.")
    q.append(now)

def log_ask(admin_id, question, sql, outcome, row_count=None):
    # separate normal-DB session, so the AI's read-only connection never writes
    log_db = sessionlocal()
    try:
        log_db.add(database_models.ask_log(
            admin_id=admin_id, question=question, generated_sql=sql,
            outcome=outcome, row_count=row_count))
        log_db.commit()
    except Exception:
        logger.exception("could not write ask_log")
    finally:
        log_db.close()

        

class AskRequest(BaseModel):
    question: str


def get_schema(db: Session) -> str:
    # rebuilt every 10 minutes so new status values show up
    if _schema_cache["text"] is None or time.time() - _schema_cache["at"] > 600:
        _schema_cache["text"] = build_schema_text(db) + "\n" + SCHEMA_NOTES
        _schema_cache["at"] = time.time()
    return _schema_cache["text"]


@router.post("/ask")
def ask_database(
    body: AskRequest,
    db: Session = Depends(get_readonly_db),
    current_user=Depends(require_admin),
):
    check_rate_limit(current_user.user_id)

    question = body.question.strip()
    if not question or len(question) > 500:
        raise HTTPException(status_code=400, detail="Question must be 1-500 characters")

    schema = get_schema(db)
    try:
        raw_sql = generate_sql(schema, question)
    except Exception:
        logger.exception("LLM call failed")
        log_ask(current_user.user_id, question, None, "llm_error")
        raise HTTPException(status_code=502, detail="The AI service is unavailable right now. Try again later.")

    if raw_sql.strip() == "CANNOT_ANSWER":
        log_ask(current_user.user_id, question, None, "cannot_answer")
        return {"question": question, "sql": None,
                "message": "That question can't be answered from the hostel data."}

    try:
        sql = validate_sql(raw_sql)
    except ValueError as e:
        log_ask(current_user.user_id, question, raw_sql, "rejected")
        raise HTTPException(status_code=400, detail=f"Generated query was rejected: {e}")

    try:
        result = db.execute(text(sql.replace(":", r"\:")))
        columns = list(result.keys())
        rows = result.fetchmany(MAX_ROWS + 1)
    except Exception:
        db.rollback()
        logger.exception("ask query failed: %s", sql)
        log_ask(current_user.user_id, question, sql, "failed")
        raise HTTPException(status_code=400, detail="The query failed to run. Try rephrasing the question.")

    truncated = len(rows) > MAX_ROWS
    rows = [list(r) for r in rows[:MAX_ROWS]]
    log_ask(current_user.user_id, question, sql, "ok", len(rows))
    return {"question": question, "sql": sql, "columns": columns,
            "rows": rows, "row_count": len(rows), "truncated": truncated}