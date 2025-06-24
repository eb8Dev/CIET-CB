import os
import sqlite3
import pandas as pd

DB_NAME = "college_data.db"
EXCEL_FOLDER = "./data"  # Folder containing your Excel files (.xlsx)

# Clean table name (remove special chars, spaces → underscores)
def clean_table_name(file_name):
    base = os.path.splitext(file_name)[0]
    return base.strip().replace(" ", "_").replace("&", "and").replace("-", "_")

def load_excel_to_sqlite(db_name, folder_path):
    conn = sqlite3.connect(db_name)
    print(f"📥 Connected to SQLite DB: {db_name}")

    for file in os.listdir(folder_path):
        if file.endswith(".xlsx"):
            file_path = os.path.join(folder_path, file)
            table_name = clean_table_name(file)
            print(f"📄 Loading: {file} → Table: {table_name}")

            try:
                df = pd.read_excel(file_path)
                df.columns = [str(col).strip().replace(" ", "_") for col in df.columns]
                df.to_sql(table_name, conn, if_exists="replace", index=False)
                print(f"✅ Imported: {table_name} ({len(df)} rows)")
            except Exception as e:
                print(f"❌ Failed to load {file}: {e}")

    conn.close()
    print(f"🗃️ All files loaded into {db_name}")

if __name__ == "__main__":
    load_excel_to_sqlite(DB_NAME, EXCEL_FOLDER)
