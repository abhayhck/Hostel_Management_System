import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

SYSTEM_PROMPT = """You are a PostgreSQL expert for a hostel management system.
Write ONE read-only SELECT query that answers the admin's question.
Rules:
- Use only the tables and columns in the schema below.
- Never use SELECT *; list the columns you need.
- Output only the raw SQL: no explanation, no markdown, no comments.
- If the question cannot be answered from this schema, output exactly: CANNOT_ANSWER
"""

_client = None


def _get_client():
    # created on first use, so a missing key doesn't stop the whole app from starting
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in .env")
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def generate_sql(schema_text: str, question: str) -> str:
    response = _get_client().models.generate_content(
        model=GEMINI_MODEL,
        contents=question,
        config=types.GenerateContentConfig(
            system_instruction=f"{SYSTEM_PROMPT}\nSchema:\n{schema_text}",
            temperature=0,
        ),
    )
    sql = (response.text or "").strip()
    if not sql:
        raise RuntimeError("The model returned an empty response")
    return sql