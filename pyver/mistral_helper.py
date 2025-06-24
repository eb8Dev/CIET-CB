# import os
# from mistralai import Mistral
# import sqlite3

# # Load API key from environment variable
# MISTRAL_API_KEY = 'EGIikLh90WAyrC5Y1FmYj6xbCOOnBQeN'
# MODEL = "mistral-small-2506"

# print("[DEBUG] Initializing Mistral client")
# client = Mistral(api_key=MISTRAL_API_KEY)

# def generate_sql_with_mistral(user_query: str, table: str, db_path: str, use_like: bool = False) -> str:
#     """
#     Generate SQL query using Mistral LLM chat completions API.
#     use_like: if True, instruct model to use LIKE operator with wildcards.
#     """
#     try:
#         print(f"[DEBUG] Connecting to database at {db_path}")
#         conn = sqlite3.connect(db_path)
#         cursor = conn.cursor()

#         print(f"[DEBUG] Fetching schema for table: {table}")
#         cursor.execute(f"PRAGMA table_info({table});")
#         columns = cursor.fetchall()
#         conn.close()

#         print(f"[DEBUG] Retrieved columns: {columns}")
#         schema_description = f"Table `{table}` columns:\n"
#         for col in columns:
#             schema_description += f"- {col[1]} ({col[2]})\n"
#         print(f"[DEBUG] Schema description:\n{schema_description}")

#         like_instruction = ""
#         if use_like:
#             like_instruction = "Use the LIKE operator with wildcards (%) for any text matching instead of exact matching.\n"

#         prompt = (
#             f"You are a helpful assistant that converts natural language questions into valid SQL queries.\n"
#             f"Here is the table schema:\n{schema_description}\n"
#             f"{like_instruction}"
#             f"If the user asks about details of an individual or object (e.g., a specific faculty or student), include all columns using SELECT *.\n"
#             f"Write a single valid SQL query to answer the following question:\n\"{user_query}\"\n"
#             f"Only return the SQL query, no explanation."
#             f"Do not format the SQL inside markdown code blocks."
#         )

#         print(f"[DEBUG] Constructed prompt:\n{prompt}")

#         messages = [
#             {"role": "system", "content": (
#             "You are an expert SQL generator.\n"
#             "Include all relevant columns if the user asks about a specific row or entity.\n"
#             "Use SELECT * when full context is needed."
#         )}

#         ]

#         print("[DEBUG] Sending prompt to Mistral LLM")
#         response = client.chat.complete(
#             model=MODEL,
#             messages=messages,
#             max_tokens=256,
#             temperature=0.0,
#             stop=None
#         )

#         sql_query = response.choices[0].message.content.strip()
#         print(f"[DEBUG] Received SQL query:\n{sql_query}")

#         return sql_query

#     except Exception as e:
#         print(f"[ERROR] Exception in generate_sql_with_mistral: {e}")
#         raise


import os
from mistralai import Mistral
from dotenv import load_dotenv
load_dotenv()

# ✅ Securely load Mistral API Key
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
if not MISTRAL_API_KEY:
    raise EnvironmentError("❌ Missing MISTRAL_API_KEY environment variable.")

# ✅ Model used (you can adjust if needed)
MODEL = "mistral-small-2506"

# ✅ Initialize Mistral client
print("[DEBUG] Initializing Mistral client...")
client = Mistral(api_key=MISTRAL_API_KEY)
