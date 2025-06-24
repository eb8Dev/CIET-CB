import sqlite3
from mistral_helper import client, MODEL
from typing import List

# --- Context Object ---
class AssistantContext:
    def __init__(self):
        self.user_query = ""
        self.selected_table = ""
        self.schema_description = ""
        self.generated_sql = ""

    def reset(self):
        self.__init__()

# --- Get all tables ---
def get_all_tables(db_path: str) -> List[str]:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tables

# --- Get schema of a table ---
def get_table_schema(db_path: str, table_name: str) -> str:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name});")
    schema_info = cursor.fetchall()
    conn.close()
    return "\n".join([f"{col[1]} ({col[2]})" for col in schema_info])

# --- Find relevant table ---
import re
import difflib

def find_table(user_query: str, available_tables: List[str]) -> str:
    prompt = (
        "🔍 Task: Identify the most relevant table for the user query.\n\n"
        f"User Query:\n\"{user_query}\"\n\n"
        f"Available Tables:\n{', '.join(available_tables)}\n\n"
        "👉 Return only the **exact table name** from the list. No formatting, no explanation."
    )

    messages = [
        {"role": "system", "content": "You map user queries to table names. Only output a valid table name from the list."},
        {"role": "user", "content": prompt}
    ]

    response = client.chat.complete(model=MODEL, messages=messages, max_tokens=50, temperature=0)
    raw = response.choices[0].message.content.strip()
    print(f"[DEBUG] Raw table name from LLM: {raw}")

    # Clean and normalize
    cleaned = re.sub(r"[`*_ \n]", "", raw).lower()

    # Normalize table names to lowercase without symbols
    normalized_map = {
        re.sub(r"[\W_]+", "", t.lower()): t for t in available_tables
    }

    # Exact match after cleaning
    if cleaned in normalized_map:
        return normalized_map[cleaned]

    # Fuzzy match fallback
    close = difflib.get_close_matches(cleaned, normalized_map.keys(), n=1, cutoff=0.6)
    if close:
        print(f"[DEBUG] Fuzzy matched to: {normalized_map[close[0]]}")
        return normalized_map[close[0]]


# --- Generate SQL query using Mistral ---
def generate_sql_query(ctx: AssistantContext, db_path: str, use_like: bool = False) -> str:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({ctx.selected_table});")
    columns = cursor.fetchall()
    conn.close()

    ctx.schema_description = "\n".join([f"- {col[1]} ({col[2]})" for col in columns])
    like_hint = (
        "🔄 Use LIKE with wildcards (%) for flexible text matching. "
        "Use LOWER() for case-insensitive matches." if use_like else "🔎 Use exact matches for filters."
    )

    prompt = (
        "🧠 Task: Convert the user query into a valid SQL query.\n\n"
        f"User Query:\n\"{ctx.user_query}\"\n\n"
        f"Target Table: {ctx.selected_table}\n\n"
        f"Table Schema:\n{ctx.schema_description}\n\n"
        f"{like_hint}\n\n"
        "📝 Instructions:\n- Use SELECT * for specific person/entity queries.\n"
        "- Return only the SQL query (no markdown or explanations)."
    )

    messages = [
        {"role": "system", "content": "You are an SQL generator that creates queries from natural language."},
        {"role": "user", "content": prompt}
    ]
    response = client.chat.complete(model=MODEL, messages=messages, max_tokens=256, temperature=0)
    ctx.generated_sql = response.choices[0].message.content.strip().strip("`").replace("sql", "").strip()
    return ctx.generated_sql

# --- Execute SQL and interpret result ---
def execute_and_interpret(ctx: AssistantContext, db_path: str) -> str:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    print(f'[debug]: generated sql is: {ctx.generated_sql}')
    try:
        cursor.execute(ctx.generated_sql)
        rows = cursor.fetchall()
        col_names = [desc[0] for desc in cursor.description]
    except Exception as e:
        return f"❌ SQL execution error: {e}"
    finally:
        conn.close()

    if len(rows) == 0:
        # Instead of treating as an error, let LLM explain the absence
        prompt = (
            f"The user asked: \"{ctx.user_query}\"\n"
            f"The database returned no rows.\n\n"
            f"Please interpret this politely and clearly. For example, say 'No such facility exists' or 'No matching data was found in the records.' "
            f"Ensure the tone is formal and institutional."
        )

        messages = [
            {"role": "system", "content": (
                "You are a professional assistant for Chalapathi Institute of Engineering and Technology (CIET). "
                "You interpret SQL results in a respectful, precise tone. If there is no data, explain that politely."
            )},
            {"role": "user", "content": prompt}
        ]

        response = client.chat.complete(
            model=MODEL,
            messages=messages,
            max_tokens=200,
            temperature=0.3
        )

        return response.choices[0].message.content.strip()


    prompt = (
        f"User Query: \"{ctx.user_query}\"\n\n"
        f"SQL Output:\nColumns: {col_names}\nRows: {rows}\n\n"
        "You are a polite, formal assistant for Chalapathi Institute of Engineering and Technology (CIET). "
        "Present the answer clearly, respectfully, and with institutional tone.\n"
        "- Use full names and titles when applicable.\n"
        "- Avoid emojis, jokes, or casual remarks.\n"
        "- If the result is a list, present it with clarity and formality.\n"
        "- Always assume this is for public display on an official college platform."
    )



    messages = [
    {
        "role": "system",
        "content": (
            "You are a respectful and professional assistant for Chalapathi Institute of Engineering and Technology. "
            "You present query results with clarity, precision, and a formal tone appropriate for institutional communication."
        )
    },
    {
        "role": "user",
        "content": prompt
    }

    ]


    response = client.chat.complete(model=MODEL, messages=messages, max_tokens=200, temperature=0.3)
    return response.choices[0].message.content.strip()

# --- Retry Wrapper ---
def try_generate_and_execute(ctx: AssistantContext, db_path: str, max_retries: int = 3) -> str:
    for attempt in range(1, max_retries + 1):
        use_like = attempt > 1
        try:
            generate_sql_query(ctx, db_path, use_like=use_like)
            result = execute_and_interpret(ctx, db_path)
            if result.startswith("❌ No results found."):
                if attempt == max_retries:
                    return "❌ No data found after multiple attempts."
            elif result.startswith("❌ SQL execution error"):
                return result
            else:
                return result
        except Exception as e:
            return f"❌ Unexpected error during attempt {attempt}: {e}"
    return "❌ Failed after all retries."

# --- Main Loop ---
if __name__ == "__main__":
    DB_PATH = "college_data.db"
    TABLES = get_all_tables(DB_PATH)
    ctx = AssistantContext()

    print("🤖 SQL Assistant is ready.\n")

    while True:
        user_input = input("🔍 Ask a question (or type 'exit'): ").strip()
        if user_input.lower() in ["exit", "quit"]:
            print("👋 Exiting. Goodbye!")
            break

        ctx.reset()
        ctx.user_query = user_input

        try:
            ctx.selected_table = find_table(ctx.user_query, TABLES)
            print(f"📌 Table selected: {ctx.selected_table}")
        except Exception as e:
            print(f"❌ Error identifying table: {e}")
            continue

        result = try_generate_and_execute(ctx, DB_PATH)
        print(f"\n💬 Answer:\n{result}\n")
        # print("🧠 Let me know if you want more details or have another question!\n")

