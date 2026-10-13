import sqlglot
from sqlglot import exp
from llm_schema import ALLOWED_TABLES

FORBIDDEN = (exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create,
             exp.Command, exp.Merge, exp.Into)


def validate_sql(raw: str) -> str:
    sql = raw.strip()
    if sql.startswith("```"):                 # models sometimes add markdown fences
        sql = sql.strip("`").strip()
        if sql.lower().startswith("sql"):
            sql = sql[3:].strip()
    sql = sql.rstrip(";").strip()

    try:
        statements = sqlglot.parse(sql, read="postgres")
    except sqlglot.errors.ParseError:
        raise ValueError("could not parse the SQL")

    statements = [s for s in statements if s is not None]
    if len(statements) != 1:
        raise ValueError("exactly one statement is allowed")

    tree = statements[0]
    if not isinstance(tree, (exp.Select, exp.Union)):
        raise ValueError("only SELECT queries are allowed")
    if tree.find(*FORBIDDEN):
        raise ValueError("query contains a forbidden operation")

    cte_names = {c.alias_or_name.lower() for c in tree.find_all(exp.CTE)}
    for table in tree.find_all(exp.Table):
        name = table.name.lower()
        if table.db or table.catalog:
            raise ValueError("schema-qualified tables are not allowed")
        if name not in ALLOWED_TABLES and name not in cte_names:
            raise ValueError(f"table '{name}' is not allowed")

    return sql

#It requires exactly one statement, 
# it must be a SELECT (including WITH ... SELECT), 
# it can’t contain writes or SELECT ... INTO (which creates a table), 
# and it may only touch your allowed tables.