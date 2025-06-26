# prompt_templates.py

# def get_table_selection_prompt(user_query: str, available_tables: list) -> list:
#     return [
#         {
#             "role": "system",
#             "content": (
#                 "You map user queries to table names. "
#                 "Only output valid table names from the list, separated by commas."
#             )
#         },
#         {
#             "role": "user",
#             "content": (
#                 "🔍 Task: Identify the most relevant table(s) for the user query. "
#                 "Return table names as a comma-separated list, only from the available tables.\n\n"
#                 f"User Query:\n\"{user_query}\"\n\n"
#                 f"Available Tables:\n{', '.join(available_tables)}\n\n"
#                 "👉 Return only the exact table names separated by commas, no explanation."
#             )
#         }
#     ]

def get_table_selection_prompt(user_query: str, available_tables: list) -> list:
    return [
        {
            "role": "system",
            "content": (
                "You are a table selection assistant. Your job is to map user queries to the most relevant table names. "
                "Only return valid table names from the provided list, separated by commas. Do not explain your choices or include any extra text."
            )
        },
        {
            "role": "user",
            "content": (
                "📄 Table Descriptions:\n"
                "- Faculty: Staff details like name, department, qualification, and designation.\n"
                "- Hostel: Room types, fees, facilities (boys/girls).\n"
                "- Fee: Course-wise fees under convener/management quotas.\n"
                "- Intake: Department-wise seat availability by year.\n"
                "- Lab: Departmental labs, courses, and number of systems.\n"
                "- Placement: Students placed, their departments, companies, and year.\n"
                "- Transport: Bus numbers, drivers, route stops, and timings.\n"
                "- College_info: College profile including name, establishment year, location, programs, and contact info.\n\n"
                
                "🔍 Task: Based on the user query, return the most relevant table name(s).\n"
                "Respond using only valid table names from this list:\n"
                f"{', '.join(available_tables)}\n\n"
                f"User Query:\n\"{user_query}\"\n\n"
                "👉 Output: Only the relevant table names, separated by commas. No explanation. or the polite rejection message if unrelated."
            )
        }
    ]


def get_sql_generation_prompt(ctx, use_like: bool, extra_context="") -> list:
    like_hint = (
        "🔄 Use LIKE with wildcards (%) for flexible text matching. "
        "Use LOWER() for case-insensitive matches."
        if use_like else
        "🔎 Use exact matches for filters."
    )

    fkey_info = ctx.schema_description if hasattr(ctx, "schema_description") else ""
    full_query_context = "\n".join(ctx.history + [ctx.user_query])

    # Combine schema, foreign key info, and extra_context (sample data) into prompt context
    prompt_context = f"{ctx.schema_description}\n\n{extra_context}".strip()

    user_content = (
        "🧠 Task: Convert the user query into a valid SQL query possibly involving multiple tables with JOINs.\n\n"
        f"User Query and context:\n\"{full_query_context}\"\n\n"
        f"Target Tables: {', '.join(ctx.selected_tables)}\n\n"
        f"{prompt_context}\n\n"
        f"{like_hint}\n\n"
        "📝 Instructions: "
        "- Use only SELECT statements; do NOT generate INSERT, UPDATE, DELETE, DROP, or any data-modifying statements.\n"
        "- Use JOINs as appropriate based on foreign key relationships.\n"
        "- Use SELECT * if the query is about specific persons/entities.\n"
        "- Return only the SQL query (no markdown or explanations).\n"
        "- Write SQLite-compatible SQL."
    )

    return [
        {
            "role": "system",
            "content": "You are an SQL generator that creates complex queries from natural language, including JOINs."
        },
        {
            "role": "user",
            "content": user_content
        }
    ]


def get_no_result_prompt(user_query: str) -> list:
    return [
        {
            "role": "system",
            "content": (
                "You are a professional assistant for Chalapathi Institute of Engineering and Technology (CIET). "
                "You interpret SQL results in a respectful, precise tone. If there is no data, explain that politely."
            )
        },
        {
            "role": "user",
            "content": (
                f"The user asked: \"{user_query}\"\n"
                f"The database returned no rows.\n\n"
                "AVOID EMAIL FORMAT ( you are chatbot )"
                "Please interpret this politely and clearly. For example, say 'No such facility exists' or "
                "'No matching data was found in the records.' Ensure the tone is formal and institutional."
            )
        }
    ]


def get_result_summary_prompt(user_query: str, col_names: list, rows: list, generated_sql: str) -> list:
    return [
        {
            "role": "system",
            "content": (
                "You are a respectful and professional assistant for Chalapathi Institute of Engineering and Technology. "
                "You present query results with clarity, precision, and a formal tone appropriate for institutional communication."
            )
        },
        {
            "role": "user",
            "content": (
                f"User Query: \"{user_query}\"\n\n"
                f"Generated SQL is: {generated_sql}"
                f"SQL Output:\nColumns: {col_names}\nRows: {rows}\n\n"
                "AVOID EMAIL FORMAT ( you are a chatbot )"
                "You are a polite, formal assistant for Chalapathi Institute of Engineering and Technology (CIET). "
                "Present the answer clearly, respectfully, and with institutional tone.\n"
                "- Use full names and titles when applicable.\n"
                "- Avoid emojis, jokes, or casual remarks.\n"
                "- If any emails or phone numbers are in the results, mask them (eg: +91 92******10, b***u@gmail.com)"
                "- If the result is a list, present it with clarity and formality.\n"
                "- Always assume this is for public display on an official college platform."
            )
        }
    ]
