import os
import pandas as pd

# Define the directory containing your Excel files
directory = './'  # Change if files are elsewhere

# Output list to store all normalized DataFrames
merged_data = []

# Unified schema columns
columns = [
    "Record Type", "Department", "Faculty Name", "Designation", "Qualification", "Year",
    "Specialization", "Quota Type", "Fee (₹)",
    "Hostel Name", "Room Type", "Capacity per Room", "Total Rooms", "Wi-Fi", "Laundry", "AC", "Common Bathroom", "Hostel Incharge", "Contact",
    "Lab Name", "Course/Subject", "No. of Systems",
    "Company Name", "Student Name",
    "Bus No", "Driver Name", "Route Stop", "Time",
    "College Name", "Established Year", "Campus Area (acres)", "Location", "Founder", "Autonomous Status", "NBA Accredited Programs", "UG Programs", "PG Programs", "Vision", "Mission", "College Contact Phone", "College Contact Mobile", "College Email", "College Website"
]

# Helper to safely get a value
def safe_get(row, key):
    return row.get(key, None)

# Read and normalize all Excel files
for filename in os.listdir(directory):
    if filename.endswith(".xlsx"):
        filepath = os.path.join(directory, filename)
        df = pd.read_excel(filepath)

        norm_df = pd.DataFrame(columns=columns)

        # Normalize based on filename
        if 'Faculty' in filename:
            # Unified faculty handling
            df.columns = [col.strip() for col in df.columns]
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([{
                    "Record Type": "Faculty",
                    "Faculty Name": safe_get(row, 'Faculty Name') or safe_get(row, 'ECE Faculty Name'),
                    "Designation": safe_get(row, 'Designation') or safe_get(row, 'ECE Designation'),
                    "Qualification": row.get('Qualification'),
                    "Department": row.get('Department'),
                    "Year": row.get('Year')
                }])])
        
        elif 'hostel' in filename:
            df.columns = [col.strip() for col in df.columns]
            record_type = "Girls Hostel" if "girl" in filename.lower() else "Boys Hostel"
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([{
                    "Record Type": record_type,
                    "Hostel Name": row.get("Hostel Name"),
                    "Room Type": row.get("Room Type"),
                    "Capacity per Room": row.get("Capacity per Room"),
                    "Total Rooms": row.get("Total Rooms"),
                    "Fee (₹)": row.get("Annual Fee (₹)"),
                    "Wi-Fi": row.get("Wi-Fi"),
                    "Laundry": row.get("Laundry"),
                    "AC": row.get("AC"),
                    "Common Bathroom": row.get("Common Bathroom"),
                    "Hostel Incharge": row.get("Hostel Incharge"),
                    "Contact": row.get("Contact"),
                    "Year": row.get("Academic Year")
                }])])

        elif 'fee' in filename:
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([
                    {
                        "Record Type": "Fee Structure",
                        "Specialization": row.get("Specialization"),
                        "Quota Type": "Convener",
                        "Fee (₹)": row.get("Convener Quota (₹)")
                    },
                    {
                        "Record Type": "Fee Structure",
                        "Specialization": row.get("Specialization"),
                        "Quota Type": "Management",
                        "Fee (₹)": row.get("Management Quota (₹)")
                    }
                ])])

        elif 'intake' in filename:
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([{
                    "Record Type": "Intake Capacity",
                    "Department": row.get("Department"),
                    "Year": row.get("Academic Year"),
                    "Fee (₹)": row.get("Intake Capacity/No.of Seats")
                }])])

        elif 'lab' in filename:
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([{
                    "Record Type": "Lab",
                    "Department": row.get("DEPARTMENT"),
                    "Lab Name": row.get("LAB NAME"),
                    "Course/Subject": row.get("SUBJECT/COURSE"),
                    "No. of Systems": row.get("NO.OF SYSTEMS"),
                    "Year": row.get("ACADEMIC YEAR")
                }])])

        elif 'placement' in filename:
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([{
                    "Record Type": "Placement",
                    "Department": row.get("DEPARTMENT"),
                    "Student Name": row.get("Name"),
                    "Company Name": row.get("COMPANY"),
                    "Year": row.get("YEAR")
                }])])

        elif 'transport' in filename:
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([{
                    "Record Type": "Transport",
                    "Bus No": row.get("Bus No"),
                    "Driver Name": row.get("Driver Name"),
                    "Route Stop": row.get("Route Stop"),
                    "Time": row.get("Time")
                }])])

        elif 'chalapathi_institute_info' in filename:
            for _, row in df.iterrows():
                norm_df = pd.concat([norm_df, pd.DataFrame([{
                    "Record Type": "College Info",
                    "College Name": row.get("college_name"),
                    "Established Year": row.get("established_year"),
                    "Campus Area (acres)": row.get("campus_area_acres"),
                    "Location": row.get("location"),
                    "Founder": row.get("founder"),
                    "Autonomous Status": row.get("autonomous_status"),
                    "NBA Accredited Programs": row.get("nba_accredited_programs"),
                    "UG Programs": row.get("undergraduate_programs"),
                    "PG Programs": row.get("postgraduate_programs"),
                    "Vision": row.get("vision"),
                    "Mission": row.get("mission"),
                    "College Contact Phone": row.get("contact_phone"),
                    "College Contact Mobile": row.get("contact_mobile"),
                    "College Email": row.get("contact_email"),
                    "College Website": row.get("website")
                }])])

        if not norm_df.empty:
            merged_data.append(norm_df)

# Combine all and export to Excel
final_df = pd.concat(merged_data, ignore_index=True)
final_df.to_excel("merged_college_data.xlsx", index=False)
print("Merged Excel created: merged_college_data.xlsx")
