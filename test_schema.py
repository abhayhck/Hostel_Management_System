'''from database import readonly_sessionlocal
from llm_schema import build_schema_text, SCHEMA_NOTES

db = readonly_sessionlocal()

try:
    print(build_schema_text(db))
    print(SCHEMA_NOTES)
finally:
    db.close()
'''

from sql_guard import validate_sql

tests = ["SELECT name FROM students",
         "DELETE FROM fees",
         "SELECT * FROM users",
         "SELECT 1; DROP TABLE fees"]
for q in tests:
    try:
        print("OK   ", validate_sql(q))
    except ValueError as e:
        print("BLOCK", q, "->", e)