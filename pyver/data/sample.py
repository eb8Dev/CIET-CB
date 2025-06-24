import pandas as pd

# Data as a list of dictionaries (each dictionary is a row)
# Define structured data as a list of dictionaries
data = [
    {
        "college_name": "Chalapathi Institute of Engineering and Technology",
        "established_year": 2007,
        "campus_area_acres": 10.23,
        "location": "Chalapathi Nagar, Lam, Guntur-522034, Andhra Pradesh, India",
        "founder": "Sri Y.V. Anjaneyulu",
        "autonomous_status": "Yes (UGC, 10 years)",
        "nba_accredited_programs": "CSE, ECE, EEE, Civil Engineering (up to AY 2024-25)",
        "undergraduate_programs": "CSE, CSIT, CSE with AI, Data Science, AIML, Cyber Security, ECE, EEE, CE",
        "postgraduate_programs": "M.Tech in CSE, VLSI & Embedded Systems Design",
        "vision": "To emerge as an Institute of Excellence for Engineering and Technology...",
        "mission": "Student-centric, innovative, lifelong learning",
        "contact_phone": "0863 - 2524112, 2524113",
        "contact_mobile": "8333800596, 8333800597",
        "contact_email": "chalapathiengtech@yahoo.com",
        "website": "https://chalapathiengg.ac.in/"
    }
]

# Create DataFrame
df = pd.DataFrame(data)

# Save to Excel file
df.to_excel("chalapathi_institute_info.xlsx", index=False)

print("Excel file 'chalapathi_institute_info.xlsx' created successfully!")
