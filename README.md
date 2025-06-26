# Chalapathi Assistant

An AI-powered chatbot assistant for Chalapathi Institute of Engineering and Technology (CIET) that allows users to interact with college data through natural language queries. The assistant converts user questions into SQL queries executed on a SQLite database containing college-related information, and presents results in a clear, formal manner.

---

## Features

- Natural language interface to query college data
- Backend powered by FastAPI and Socket.IO for real-time chat
- SQL query generation using Mistral LLM with custom prompt templates
- Interactive React frontend with onboarding and category example queries
- Data ingestion from Excel files into SQLite database
- Support for multi-table joins and query refinement

---

## Backend (pyver/)

The backend is implemented in Python using FastAPI and Socket.IO for asynchronous real-time communication.

- `main.py`: FastAPI app with Socket.IO server handling chat events and user contexts.
- `dbagent.py`: Core logic for database interaction, SQL generation, and query execution using Mistral LLM.
- `excel_to_sqlite.py`: Script to import Excel files from `pyver/data/` into the SQLite database `college_data.db`.
- `mistral_helper.py`: Initializes the Mistral LLM client using API key from environment variables.
- `prompt_templates.py`: Contains prompt templates for table selection, SQL generation, and result interpretation.
- `college_data.db`: SQLite database storing college data tables.
- `query_log.txt`: Log file recording user queries, generated SQL, and results.

### Setup

1. Install Python dependencies (e.g., FastAPI, socketio, pandas, mistralai).
2. Set environment variable `MISTRAL_API_KEY` with your Mistral API key.
3. Run `excel_to_sqlite.py` to load Excel data into the database.
4. Start the backend server by running `main.py`.

---

## Data Ingestion

Place your Excel files (.xlsx) containing college data in the `pyver/data/` folder. The `excel_to_sqlite.py` script will import each Excel file as a table in the SQLite database, cleaning table names automatically.

---

## Frontend (src/)

The frontend is a React application built with TypeScript and Tailwind CSS.

- `App.tsx`: Main chat interface connecting to backend via Socket.IO, managing onboarding and chat messages.
- `main.tsx`: React app entry point.
- `index.css`: Global styles.
- `assets/`: Contains logos and images used in the UI.

### Setup

1. Install Node.js dependencies using `npm install` or `yarn`.
2. Start the frontend development server (e.g., `npm run dev`).
3. Access the app in your browser (default at `http://localhost:3000`).

---

## Environment Variables

- `MISTRAL_API_KEY`: Your API key for the Mistral LLM service, required for SQL query generation.

---

## Project Structure

```
.
├── pyver/                  # Backend Python code and data ingestion
│   ├── main.py             # FastAPI + Socket.IO server
│   ├── dbagent.py          # DB interaction and SQL generation logic
│   ├── excel_to_sqlite.py  # Excel to SQLite import script
│   ├── mistral_helper.py   # LLM client setup
│   ├── prompt_templates.py # LLM prompt templates
│   ├── college_data.db     # SQLite database file
│   ├── data/               # Excel data files
│   └── query_log.txt       # Query logs
├── src/                    # Frontend React app
│   ├── App.tsx             # Main chat UI component
│   ├── main.tsx            # React app entry point
│   ├── index.css           # Global styles
│   └── assets/             # Images and logos
├── README.md               # This file
├── package.json            # Frontend dependencies and scripts
├── vite.config.ts          # Frontend build config
└── ...
```

---

## Usage

1. Run the backend server.
2. Run the frontend app.
3. Open the frontend in a browser.
4. Interact with the Chalapathi Assistant chatbot by typing questions or selecting example categories.
5. The assistant will respond with data retrieved from the college database.

---

## License & Acknowledgments

This project is developed for Chalapathi Institute of Engineering and Technology (CIET). The AI assistant leverages the Mistral LLM for natural language to SQL conversion.

---

Thank you for using Chalapathi Assistant!
