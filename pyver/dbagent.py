import sqlite3
from mistral_helper import client, MODEL
from typing import List
import difflib
import logging

from prompt_templates import (
    get_table_selection_prompt,
    get_sql_generation_prompt,
    get_no_result_prompt,
    get_result_summary_prompt,
    get_intent_prompt,
)

logging.basicConfig(
    filename='query_log.txt',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class AssistantContext:
    def __init__(self):
        self.user_query = ""
        self.selected_tables = []
        self.schema_description = ""
        self.generated_sql = ""
        self.history = []

    def reset(self):
        self.__init__()

def get_all_tables(db_path: str) -> List[str]:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tables

def get_table_row_count(db_path: str, table_name: str) -> int:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cursor.fetchone()[0]

def get_table_data_sample(db_path: str, table_name: str, max_rows: int = 10) -> List[tuple]:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        row_count = get_table_row_count(db_path, table_name)
        if row_count <= max_rows:
            cursor.execute(f"SELECT * FROM {table_name}")
            return cursor.fetchall()
        else:
            # Randomly select max_rows rows
            cursor.execute(f"SELECT * FROM {table_name} ORDER BY RANDOM() LIMIT {max_rows}")
            return cursor.fetchall()

def format_table_data_sample(headers: List[str], rows: List[tuple]) -> str:
    if not rows:
        return "No data available."
    lines = []
    for row in rows:
        # Join column values with commas, convert all to string to avoid errors
        row_str = ", ".join(str(val) for val in row)
        lines.append(row_str)
    return "\n".join(lines)


def get_table_schema(db_path: str, table_name: str) -> str:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info('{table_name}')")
    schema_info = cursor.fetchall()
    conn.close()
    return "\n".join([f"{col[1]} ({col[2]})" for col in schema_info])

def get_table_foreign_keys(db_path: str, table_name: str) -> List[str]:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA foreign_key_list('{table_name}')")
    fkeys = cursor.fetchall()
    conn.close()
    return [f"- {table_name}.{fkey[3]} references {fkey[2]}.{fkey[4]}" for fkey in fkeys]

def find_tables(user_query: str, available_tables: List[str]) -> List[str]:
    messages = get_table_selection_prompt(user_query, available_tables)
    response = client.chat.complete(model=MODEL, messages=messages, max_tokens=50, temperature=0)
    raw = response.choices[0].message.content.strip()

    raw_tables = [t.strip() for t in raw.split(",") if t.strip()]
    normalized_map = {t.lower(): t for t in available_tables}

    selected = []
    for tbl in raw_tables:
        tbl_clean = tbl.lower()
        if tbl_clean in normalized_map:
            selected.append(normalized_map[tbl_clean])
        else:
            close = difflib.get_close_matches(tbl_clean, normalized_map.keys(), n=1, cutoff=0.6)
            if close:
                selected.append(normalized_map[close[0]])
    return list(set(selected))

def generate_sql_query(ctx: AssistantContext, db_path: str, use_like: bool = False) -> str:
    if not ctx.selected_tables:
        raise ValueError("No tables selected for SQL generation.")

    schema_parts = []
    foreign_key_info = []
    data_samples = []

    for table in ctx.selected_tables:
        schema = get_table_schema(db_path, table)
        schema_parts.append(f"Schema for table {table}:\n{schema}")
        foreign_key_info.extend(get_table_foreign_keys(db_path, table))
         # Get sample data
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA table_info('{table}')")
            headers = [col[1] for col in cursor.fetchall()]
            sample_rows = get_table_data_sample(db_path, table, max_rows=10)
            sample_data_str = format_table_data_sample(headers, sample_rows)
        data_samples.append(f"Sample data for table {table}:\n{sample_data_str}")

    ctx.schema_description = "\n\n".join(schema_parts)
    # print("[debug] schema description is:", ctx.schema_description)
    # ctx.fk_info = foreign_key_info  # optional, if needed in prompt
    fkey_desc = "Foreign Key Relationships:\n" + ("\n".join(foreign_key_info) if foreign_key_info else "None")
    data_samples_desc = "\n\n".join(data_samples)
    # Compose full prompt content
    prompt_context = (
        f"{ctx.schema_description}\n\n"
        f"{fkey_desc}\n\n"
        f"{data_samples_desc}"
    )
    # print("[debug] Full schema + data context sent to LLM:\n", prompt_context)

    messages = get_sql_generation_prompt(ctx, use_like, extra_context=prompt_context)
    response = client.chat.complete(model=MODEL, messages=messages, max_tokens=512, temperature=0)
    ctx.generated_sql = response.choices[0].message.content.strip().strip("`").replace("sql", "").strip()
    return ctx.generated_sql

def execute_and_interpret(ctx: AssistantContext, db_path: str) -> str:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    print(f'[DEBUG]: Generated SQL is: {ctx.generated_sql}')
    try:
        cursor.execute(ctx.generated_sql)
        rows = cursor.fetchall()
        col_names = [desc[0] for desc in cursor.description]
    except Exception as e:
        logging.error(f"SQL execution issue: {e}")
        return (
            "⚠️ Hmm, something went wrong while executing your request.\n"
            "Please try again, and if the issue continues, kindly contact support or the office for assistance."
        )
    finally:
        conn.close()

    if len(rows) == 0:
        messages = get_no_result_prompt(ctx.user_query)
        response = client.chat.complete(model=MODEL, messages=messages, max_tokens=200, temperature=0.3)
        return response.choices[0].message.content.strip()

    messages = get_result_summary_prompt(ctx.user_query, col_names, rows, ctx.generated_sql)
    response = client.chat.complete(model=MODEL, messages=messages, max_tokens=1000, temperature=0.3)
    return response.choices[0].message.content.strip()

def try_generate_and_execute(ctx: AssistantContext, db_path: str, max_retries: int = 3) -> str:
    for attempt in range(1, max_retries + 1):
        use_like = attempt > 1
        try:
            generate_sql_query(ctx, db_path, use_like=use_like)
            result = execute_and_interpret(ctx, db_path)

            logging.info(f"User Query: {ctx.user_query}")
            logging.info(f"Selected Tables: {ctx.selected_tables}")
            logging.info(f"Generated SQL: {ctx.generated_sql}")
            logging.info(f"Result: {result}")

            if "no matching data" in result.lower() or result.startswith("❌ No results found.") or "no data" in result.lower():
                if attempt == max_retries:
                    return "❌ No data found after multiple attempts."
            elif result.startswith("❌ SQL execution error") or result.startswith("⚠️ Hmm, something went wrong"):
                return result
            else:
                return result
        except Exception as e:
            logging.error(f"Unexpected error during attempt {attempt}: {e}")
            return (
                f"⚠️ An unexpected issue occurred while processing your request (attempt {attempt}).\n"
                "Please try again shortly. If this continues to happen, consider reaching out to support for help."
            )

    # ✅ Now this is correctly placed *after* the for loop
    return (
        "⚠️ We tried several times but couldn’t complete your request.\n"
        "You may want to rephrase your question or contact support for further help."
    )

def detect_intent(user_query: str) -> str:
    from mistral_helper import client, MODEL
    messages = get_intent_prompt(user_query)
    response = client.chat.complete(
        model=MODEL,
        messages=messages,
        max_tokens=5,
        temperature=0.0
    )
    result = response.choices[0].message.content.strip().lower()
    return result if result in ["college", "general"] else "college"  # fallback

# if __name__ == "__main__":
#     DB_PATH = "college_data.db"
#     ALL_TABLES = get_all_tables(DB_PATH)
#     ctx = AssistantContext()

#     print("🤖 SQL Assistant with multi-table join and interactive refinement is ready.\n")

#     while True:
#         if not ctx.history:
#             user_input = input("🔍 Ask a question (or type 'exit'): ").strip()
#             if user_input.lower() in ["exit", "quit"]:
#                 print("👋 Exiting. Goodbye!")
#                 break
#             ctx.reset()
#             ctx.user_query = user_input
#             ctx.history.append(user_input)
#         else:
#             print("\nWould you like to refine the previous query or ask a follow-up? (yes/no)")
#             choice = input().strip().lower()
#             if choice in ["no", "n", "exit", "quit"]:
#                 print("👋 Exiting. Goodbye!")
#                 break
#             elif choice in ["yes", "y"]:
#                 refinement = input("Please enter your refinement or follow-up query:\n").strip()
#                 if not refinement:
#                     print("No input detected, exiting.")
#                     break
#                 ctx.user_query = refinement
#                 ctx.history.append(refinement)
#             else:
#                 print("Please answer 'yes' or 'no'.")
#                 continue

#         try:
#             ctx.selected_tables = find_tables(ctx.user_query, ALL_TABLES)
#             if not ctx.selected_tables:
#                 print(
#                 "⚠️ I couldn't quite figure out which data to use for your question.\n"
#                  "You might try rephrasing it. If the issue persists, feel free to contact support."
#                 )   
#                 continue

#             print(f"📌 Tables selected: {ctx.selected_tables}")
#         except Exception as e:
#             print(
#                 "⚠️ We encountered a slight issue trying to understand your request.\n"
#                 "Please try rephrasing it, or contact the support team if the issue keeps happening."
#             )

#             continue

#         result = try_generate_and_execute(ctx, DB_PATH)
#         print(f"\n💬 Answer:\n{result}\n")
