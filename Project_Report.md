
# **Project Report**

## **AI-Powered College Information Chatbot for CIET**

---

**Submitted By:**

[Placeholder: Insert Student Names and Roll Numbers Here]

**Submitted To:**

[Placeholder: Insert Professor/Department Name Here]

**Date:** July 3, 2025

> [Placeholder: Insert CIET Logo Here]
>
> [Placeholder: Insert Your Project Logo Here]

---

## **Abstract**

In an increasingly digital world, instant access to accurate information is crucial for students. This project, the "AI-Powered College Information Chatbot," was developed to address the common challenge of finding specific, up-to-date information about the Chalapathi Institute of Engineering and Technology (CIET). We have designed and implemented a comprehensive system featuring a user-friendly web interface and an intelligent backend. The system leverages a powerful language model to understand natural language queries and retrieves precise answers from a structured database containing information on faculty, fees, placements, and more. This report details the project's objectives, architecture, implementation, and potential for future development.

---

## **1. Introduction**

### **1.1. Problem Statement**

New and existing students at CIET often require specific information regarding academic schedules, faculty details, fee structures, hostel facilities, and placement statistics. Traditionally, this information is scattered across various documents, websites, or administrative departments, making it time-consuming to find. This project aims to centralize this information and make it accessible through a single, intuitive interface.

### **1.2. Project Objectives**

*   To design and develop a web-based chatbot that can answer student queries in real-time.
*   To create a centralized and structured database for all college-related information.
*   To implement an AI-driven backend capable of Natural Language Understanding (NLU) to interpret user questions.
*   To provide a seamless and user-friendly experience for students.
*   To build a scalable and maintainable system that can be expanded in the future.

---

## **2. System Architecture and Design**

We chose a modern, multi-tiered architecture to ensure a separation of concerns, which makes the system more robust and easier to manage. The architecture is composed of three main components:

1.  **Frontend Application:** A client-side web application that provides the user interface.
2.  **Backend API Server:** A Node.js server that acts as an intermediary between the frontend and the AI engine.
3.  **Python AI Engine:** A dedicated Python service that handles data processing, database management, and all AI-powered query responses.

### **2.1. Architectural Flow Diagram**

The diagram below illustrates the flow of information from the user to the database and back.

> **[Placeholder: Insert a detailed technical architecture diagram here. It should show the User -> React Frontend -> Node.js Backend -> Python AI Engine -> SQLite DB flow and the response path.]**
>
> *Caption: The end-to-end architectural flow of the CIET Chatbot.*

---

## **3. Implementation Details**

This section provides a technical breakdown of each component of the system.

### **3.1. Frontend (User Interface)**

The user interface is a critical component, as it's the primary point of interaction for students. We focused on creating a clean, responsive, and intuitive chat interface.

*   **Technology Stack:**
    *   **Framework:** React with TypeScript (`.tsx`) for type-safe and component-based UI development.
    *   **Build Tool:** Vite for its fast development server and optimized build process.
    *   **Styling:** Tailwind CSS for a utility-first approach to styling, allowing for rapid and consistent design.
*   **Key Files:** `index.html`, `src/App.tsx`, `src/main.tsx`, `index.css`.

> **[Placeholder: Insert a screenshot of the chatbot UI here.]**
>
> *Caption: The main chat interface of the CIET Information Bot.*

> **[Placeholder: Insert a relevant frontend code snippet from `src/App.tsx` or a chat component.]**
>
> *Caption: Code snippet showing the main React component.*

### **3.2. Backend (API Server)**

The backend server acts as the bridge between the frontend and the Python AI engine. Its primary role is to handle API requests and manage server-side logic.

*   **Technology Stack:**
    *   **Platform:** Node.js with the Express.js framework.
    *   **Functionality:** It serves the static frontend files and proxies API calls to the Python backend. This design helps prevent Cross-Origin Resource Sharing (CORS) issues and simplifies frontend configuration.
*   **Key Files:** `server/index.js`.

### **3.3. AI and Data Processing Engine (Python)**

This is the brain of our project. It handles everything from initial data setup to answering complex student queries.

*   **Technology Stack:**
    *   **Core Language:** Python
    *   **AI/ML Model:** The system is built around a Mistral-based language model, accessed via `mistral_helper.py`, for its strong language comprehension capabilities.
    *   **Database:** SQLite, a lightweight, file-based SQL database (`college_data.db`).
*   **Key Files:** `pyver/main.py`, `pyver/dbagent.py`, `pyver/mistral_helper.py`, `pyver/excel_to_sqlite.py`, `pyver/prompt_templates.py`.

#### **3.3.1. Data Ingestion and Database Creation**

The foundation of our chatbot is a reliable knowledge base. We automated the process of creating this from various Excel sheets provided by the college.

1.  **Source Data:** Multiple `.xlsx` files containing information on faculty, placements, fees, etc. (`data/*.xlsx`).
2.  **ETL Process:** The `pyver/excel_to_sqlite.py` script reads these Excel files, cleans the data, and inserts it into a structured SQLite database (`college_data.db`). This ensures all information is centralized and easily queryable.

> **[Placeholder: Insert the database schema diagram or a description of the tables in `college_data.db`.]**
>
> *Caption: The database schema for `college_data.db`.*

#### **3.3.2. Query Processing Workflow**

1.  The user enters a query in the frontend.
2.  The query is sent to the Python backend (`pyver/main.py`).
3.  `mistral_helper.py` uses the language model to analyze the query and determine the user's intent.
4.  `dbagent.py` receives the intent and constructs a precise SQL query.
5.  The SQL query is executed against `college_data.db`.
6.  The raw result from the database is formatted into a natural, human-readable sentence using predefined templates from `pyver/prompt_templates.py`.
7.  The final answer is sent back to the user.

> **[Placeholder: Insert a Python code snippet from `pyver/dbagent.py` showing how a SQL query is constructed and executed.]**
>
> *Caption: Code snippet from the Database Agent module.*

---

## **4. Challenges and Future Scope**

### **4.1. Challenges Faced**

*   **Data Consolidation:** Cleaning and structuring data from various Excel formats was a significant initial hurdle.
*   **Prompt Engineering:** Crafting effective prompts in `prompt_templates.py` to get accurate and natural-sounding responses from the language model required extensive experimentation.

### **4.2. Future Scope**

*   **User Authentication:** Implement a login system for personalized information (e.g., attendance, grades).
*   **Multi-language Support:** Extend the chatbot to support regional languages.
*   **Voice-based Queries:** Integrate a speech-to-text module to allow for voice commands.
*   **Expanded Knowledge Base:** Incorporate more data sources, such as the library catalog or event schedules.

---

## **5. Conclusion**

The AI-Powered College Information Chatbot project successfully meets its objectives of providing a centralized, intelligent, and user-friendly platform for student queries. By leveraging modern web technologies and powerful AI models, we have built a system that not only solves a real-world problem at our college but also serves as a robust foundation for future digital initiatives. We believe this project demonstrates the practical application of our engineering skills and will be a valuable asset to the CIET student community.
