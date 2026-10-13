from sqlalchemy import text
from database_models import Base

ALLOWED_TABLES = {
    "students", "rooms", "room_allocation", "complaints",
    "fees", "notices"
}

BLOCKED_COLUMNS = {"emergency_contact"}


SAMPLE_VALUE_COLUMNS ={
    ("complaints", "status"),
    ("fees", "status"),
    ("rooms", "room_type"),
    ("students", "gender"),
    ("students", "course")
}

SCHEMA_NOTES = """
Notes:
- "Currently staying / active allocation" means room_allocation.release_date IS NULL.
  Any non-NULL release_date means the allocation has ended.
- rooms.occupied is a manually maintained counter and may be wrong. For real occupancy,
  COUNT rows in room_allocation WHERE release_date IS NULL, grouped by room_id.
  Vacancy = rooms.capacity - that count.
- fees.status values: 'pending', 'paid'. complaints.status values: 'pending', 'resolved'.
- fees.due_date is text in YYYY-MM-DD format. Do NOT cast it. Compare it as text,
  e.g. due_date < to_char(CURRENT_DATE, 'YYYY-MM-DD') for overdue fees.
  Overdue means status = 'pending' AND the due date is in the past.
- - Free-text columns (course, gender, room_type, status) may be stored with different
  capitalization (e.g. 'Btech' and 'BTech'). When filtering, use ILIKE. When grouping or
  counting by one of them, GROUP BY LOWER(column) and SELECT LOWER(column) so variants
  are merged. Example:
  SELECT LOWER(course) AS course, COUNT(*) FROM students GROUP BY LOWER(course)
- allocation_date and created_at are UTC timestamps.
- To show a student's name, join students on student_id.
"""

def build_schema_text(db) -> str:
    lines =[]
    for table in Base.metadata.sorted_tables:
        if table.name not in ALLOWED_TABLES:
            continue;
        cols =[]
        for col in table.columns:
            if col.name in BLOCKED_COLUMNS:
                continue
            desc = f"{col.name} {col.type}"
            if col.primary_key:
                desc += " PK"
            for fk in col.foreign_keys:
                desc += f" FK->{fk.target_fullname}"
            if (table.name, col.name) in SAMPLE_VALUE_COLUMNS:
                rows = db.execute(text(f"SELECT DISTINCT {col.name} FROM {table.name} "
                                       f"WHERE {col.name} IS NOT NULL LIMIT 10")).fetchall()
                values = [str(r[0]) for r in rows]
                if values:
                    desc += f" (values: {', '.join(values)})"
            cols.append(desc)
        lines.append(f"{table.name}({', '.join(cols)})")
    return "\n".join(lines)