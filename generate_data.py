"""
Synthetic KSP FIR dataset generator.
Produces CSVs matching schema.sql, at a scale that plausibly represents
Karnataka's real police setup (31 districts, 1100+ stations) without
touching any real KSP data. Output: ./synthetic_data/*.csv

Usage: python3 generate_data.py [--cases 5000] [--seed 42]
"""
import csv
import random
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from faker import Faker

parser = argparse.ArgumentParser()
parser.add_argument("--cases", type=int, default=5000)
parser.add_argument("--seed", type=int, default=42)
args = parser.parse_args()

random.seed(args.seed)
fake = Faker("en_IN")
Faker.seed(args.seed)

OUT = Path("synthetic_data")
OUT.mkdir(exist_ok=True)

def write_csv(name, header, rows):
    with open(OUT / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  {name}.csv: {len(rows)} rows")

# ---------------- Masters ----------------

state_rows = [(1, "Karnataka", 1, 1)]
write_csv("State", ["StateID", "StateName", "NationalityID", "Active"], state_rows)

KARNATAKA_DISTRICTS = [
    "Bagalkot","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar",
    "Chamarajanagar","Chikkaballapur","Chikkamagaluru","Chitradurga","Dakshina Kannada",
    "Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar",
    "Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru",
    "Udupi","Uttara Kannada","Vijayapura","Yadgir","Vijayanagara",
]
district_rows = [(i + 1, name, 1, 1) for i, name in enumerate(KARNATAKA_DISTRICTS)]
write_csv("District", ["DistrictID", "DistrictName", "StateID", "Active"], district_rows)
n_districts = len(district_rows)

unit_type_rows = [
    (1, "Police Station", "City", 3, 1),
    (2, "Circle Office", "District", 2, 1),
    (3, "District SP Office", "District", 1, 1),
    (4, "Commissionerate", "City", 1, 1),
]
write_csv("UnitType", ["UnitTypeID", "UnitTypeName", "CityDistState", "Hierarchy", "Active"], unit_type_rows)

# ~1100 police stations distributed across 31 districts (avg ~35/district,
# weighted so urban districts get more — mirrors real KSP jurisdiction spread)
TOTAL_STATIONS = 1120
weights = [4 if d in ("Bengaluru Urban",) else 2 if d in
           ("Mysuru", "Belagavi", "Dakshina Kannada", "Kalaburagi", "Ballari") else 1
           for d in KARNATAKA_DISTRICTS]
weight_sum = sum(weights)
unit_rows = []
uid = 1
for dist_idx, (dname, w) in enumerate(zip(KARNATAKA_DISTRICTS, weights), start=1):
    n_stations = max(5, round(TOTAL_STATIONS * w / weight_sum))
    for s in range(1, n_stations + 1):
        unit_rows.append((uid, f"{dname} PS {s}", 1, None, 1, 1, dist_idx, 1))
        uid += 1
write_csv("Unit", ["UnitID", "UnitName", "TypeID", "ParentUnit", "NationalityID", "StateID", "DistrictID", "Active"], unit_rows)
n_units = len(unit_rows)
print(f"  (total stations generated: {n_units})")

rank_rows = [
    (1, "Constable", 6, 1), (2, "Head Constable", 5, 1),
    (3, "ASI", 4, 1), (4, "SI", 3, 1),
    (5, "Inspector", 2, 1), (6, "DySP", 1, 1),
]
write_csv("Rank", ["RankID", "RankName", "Hierarchy", "Active"], rank_rows)

designation_rows = [
    (1, "Investigating Officer", 1, 1), (2, "SHO", 1, 2),
    (3, "Beat Officer", 1, 3), (4, "Admin", 1, 4),
]
write_csv("Designation", ["DesignationID", "DesignationName", "Active", "SortOrder"], designation_rows)

N_EMPLOYEES = 2500
employee_rows = []
for eid in range(1, N_EMPLOYEES + 1):
    unit = random.choice(unit_rows)
    dob = fake.date_of_birth(minimum_age=25, maximum_age=58)
    appt = fake.date_between(start_date=f"-{max(1, (58 - (2026 - dob.year)))}y", end_date="-1y")
    employee_rows.append((
        eid, unit[6], unit[0], random.choices([1,2,3,4,5,6], weights=[35,25,15,15,7,3])[0],
        random.choice([1,2,3]), f"KGID{100000+eid}", fake.first_name(),
        dob.isoformat(), random.choice([1,2]), random.randint(1,8),
        random.choices([0,1], weights=[97,3])[0], appt.isoformat(),
    ))
write_csv("Employee", ["EmployeeID","DistrictID","UnitID","RankID","DesignationID","KGID",
                        "FirstName","EmployeeDOB","GenderID","BloodGroupID",
                        "PhysicallyChallenged","AppointmentDate"], employee_rows)

court_rows = []
cid = 1
for dist_idx, dname in enumerate(KARNATAKA_DISTRICTS, start=1):
    for court_type in ["District & Sessions Court", "JMFC Court"]:
        court_rows.append((cid, f"{court_type}, {dname}", dist_idx, 1, 1))
        cid += 1
write_csv("Court", ["CourtID", "CourtName", "DistrictID", "StateID", "Active"], court_rows)

case_category_rows = [(1, "FIR"), (2, "UDR"), (3, "Zero FIR"), (4, "PAR")]
write_csv("CaseCategory", ["CaseCategoryID", "LookupValue"], case_category_rows)

gravity_rows = [(1, "Heinous"), (2, "Non-Heinous")]
write_csv("GravityOffence", ["GravityOffenceID", "LookupValue"], gravity_rows)

case_status_rows = [(1, "Under Investigation"), (2, "Charge Sheeted"), (3, "Closed"), (4, "Undetected")]
write_csv("CaseStatusMaster", ["CaseStatusID", "CaseStatusName"], case_status_rows)

crime_head_rows = [
    (1, "Crimes Against Body"), (2, "Crimes Against Property"),
    (3, "Crimes Against Women"), (4, "Crimes Against Society"),
    (5, "Economic Offences"), (6, "Cyber Crimes"),
]
write_csv("CrimeHead", ["CrimeHeadID", "CrimeGroupName", "Active"],
          [(i, n, 1) for i, n in crime_head_rows])

crime_sub_head_rows = [
    (1, 1, "Murder", 1), (2, 1, "Attempt to Murder", 2), (3, 1, "Grievous Hurt", 3),
    (4, 2, "Theft", 1), (5, 2, "Robbery", 2), (6, 2, "Burglary", 3), (7, 2, "Vehicle Theft", 4),
    (8, 3, "Domestic Violence", 1), (9, 3, "Dowry Harassment", 2), (10, 3, "Sexual Assault", 3),
    (11, 4, "Gambling", 1), (12, 4, "Public Nuisance", 2),
    (13, 5, "Cheating", 1), (14, 5, "Criminal Breach of Trust", 2),
    (15, 6, "Online Fraud", 1), (16, 6, "Identity Theft", 2),
]
write_csv("CrimeSubHead", ["CrimeSubHeadID", "CrimeHeadID", "CrimeHeadName", "SeqID"], crime_sub_head_rows)

act_rows = [("IPC", "Indian Penal Code", "IPC", 1), ("NDPS", "Narcotic Drugs and Psychotropic Substances Act", "NDPS", 1),
            ("MVA", "Motor Vehicles Act", "MVA", 1), ("ITA", "Information Technology Act", "IT Act", 1)]
write_csv("Act", ["ActCode", "ActDescription", "ShortName", "Active"], act_rows)

section_rows = [
    ("IPC","302","Murder",1), ("IPC","307","Attempt to Murder",1), ("IPC","379","Theft",1),
    ("IPC","392","Robbery",1), ("IPC","354","Assault on Woman",1), ("IPC","498A","Dowry Cruelty",1),
    ("IPC","420","Cheating",1), ("NDPS","20","Cannabis Possession",1),
    ("MVA","185","Drunk Driving",1), ("ITA","66C","Identity Theft",1), ("ITA","66D","Online Cheating",1),
]
write_csv("Section", ["ActCode", "SectionCode", "SectionDescription", "Active"], section_rows)

religion_rows = [(1,"Hindu"),(2,"Muslim"),(3,"Christian"),(4,"Jain"),(5,"Sikh"),(6,"Other")]
write_csv("ReligionMaster", ["ReligionID", "ReligionName"], religion_rows)

caste_rows = [(1,"General"),(2,"OBC"),(3,"SC"),(4,"ST"),(5,"Other")]
write_csv("CasteMaster", ["caste_master_id", "caste_master_name"], caste_rows)

occupation_rows = [(1,"Farmer"),(2,"Government Employee"),(3,"Private Employee"),(4,"Business"),
                    (5,"Student"),(6,"Unemployed"),(7,"Daily Wage Labourer"),(8,"Homemaker")]
write_csv("OccupationMaster", ["OccupationID", "OccupationName"], occupation_rows)

# ---------------- Transactional: CaseMaster and children ----------------

N_CASES = args.cases
case_rows, complainant_rows, victim_rows, accused_rows = [], [], [], []
arrest_rows, act_section_rows, chargesheet_rows = [], [], []

accused_id = 1
start_date = datetime(2023, 1, 1)
end_date = datetime(2026, 7, 22)

for case_id in range(1, N_CASES + 1):
    unit = random.choice(unit_rows)
    unit_id, dist_id = unit[0], unit[6]
    reg_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
    cat_id = random.choices([1,2,3,4], weights=[70,10,15,5])[0]
    crime_no = f"1{dist_id:04d}{unit_id:04d}{reg_date.year}{case_id:05d}"
    case_no = f"{reg_date.year}{case_id:05d}"
    crime_head_id = random.choice([r[0] for r in crime_head_rows])
    sub_heads = [r for r in crime_sub_head_rows if r[1] == crime_head_id]
    sub_head = random.choice(sub_heads)
    gravity = 1 if crime_head_id in (1, 3) and random.random() < 0.4 else 2
    io = random.choice(employee_rows)
    status_id = random.choices([1,2,3,4], weights=[35,30,25,10])[0]
    court = random.choice([c for c in court_rows if c[2] == dist_id])
    lat = round(random.uniform(11.6, 18.4), 6)   # Karnataka bounding box
    lon = round(random.uniform(74.0, 78.6), 6)

    case_rows.append((
        case_id, crime_no, case_no, reg_date.date().isoformat(), io[0], unit_id,
        cat_id, gravity, crime_head_id, sub_head[0], status_id, court[0],
        reg_date.isoformat(), (reg_date + timedelta(hours=random.randint(1,48))).isoformat(),
        reg_date.isoformat(), lat, lon,
        f"Case registered at {unit[1]} regarding {sub_head[2].lower()}. Investigation ongoing under IO {io[6]}."
    ))

    # 1 complainant
    complainant_rows.append((
        case_id, case_id, fake.name(), random.randint(18, 70),
        random.choice([r[0] for r in occupation_rows]),
        random.choice([r[0] for r in religion_rows]),
        random.choice([r[0] for r in caste_rows]),
        random.choice([1,2]),
    ))

    # 1-3 victims
    for _ in range(random.randint(1, 3)):
        victim_rows.append((len(victim_rows)+1, case_id, fake.name(), random.randint(5, 80),
                             random.choice(["M","F","T"]), 0))

    # 1-4 accused, some shared with other recent cases in same station (repeat offenders)
    n_accused = random.randint(1, 4)
    case_accused_ids = []
    for a in range(n_accused):
        accused_rows.append((accused_id, case_id, fake.name(), random.randint(16, 65),
                              random.choice(["M","F","T"]), f"A{a+1}"))
        case_accused_ids.append(accused_id)
        accused_id += 1

    # act-section
    for _ in range(random.randint(1, 2)):
        sec = random.choice(section_rows)
        act_section_rows.append((case_id, sec[0], sec[1], 1, 1))

    # arrest/surrender for ~60% of accused
    for acc_id in case_accused_ids:
        if random.random() < 0.6:
            arrest_rows.append((
                len(arrest_rows)+1, case_id, random.choices([1,2], weights=[85,15])[0],
                (reg_date + timedelta(days=random.randint(0,30))).date().isoformat(),
                1, dist_id, unit_id, io[0], court[0], acc_id, 1, 0,
            ))

    # chargesheet for closed/chargesheeted cases
    if status_id == 2:
        chargesheet_rows.append((
            len(chargesheet_rows)+1, case_id,
            (reg_date + timedelta(days=random.randint(30,90))).isoformat(),
            random.choices(["A","B","C"], weights=[75,15,10])[0], io[0],
        ))

write_csv("CaseMaster", ["CaseMasterID","CrimeNo","CaseNo","CrimeRegisteredDate","PolicePersonID",
    "PoliceStationID","CaseCategoryID","GravityOffenceID","CrimeMajorHeadID","CrimeMinorHeadID",
    "CaseStatusID","CourtID","IncidentFromDate","IncidentToDate","InfoReceivedPSDate",
    "latitude","longitude","BriefFacts"], case_rows)

write_csv("ComplainantDetails", ["ComplainantID","CaseMasterID","ComplainantName","AgeYear",
    "OccupationID","ReligionID","CasteID","GenderID"], complainant_rows)

write_csv("Victim", ["VictimMasterID","CaseMasterID","VictimName","AgeYear","GenderID","VictimPolice"], victim_rows)

write_csv("Accused", ["AccusedMasterID","CaseMasterID","AccusedName","AgeYear","GenderID","PersonID"], accused_rows)

write_csv("ActSectionAssociation", ["CaseMasterID","ActID","SectionID","ActOrderID","SectionOrderID"], act_section_rows)

write_csv("ArrestSurrender", ["ArrestSurrenderID","CaseMasterID","ArrestSurrenderTypeID","ArrestSurrenderDate",
    "ArrestSurrenderStateId","ArrestSurrenderDistrictId","PoliceStationID","IOID","CourtID",
    "AccusedMasterID","IsAccused","IsComplainantAccused"], arrest_rows)

write_csv("ChargesheetDetails", ["CSID","CaseMasterID","csdate","cstype","PolicePersonID"], chargesheet_rows)

print(f"\nDone. {N_CASES} cases, {len(accused_rows)} accused, {n_units} stations, {N_EMPLOYEES} employees.")
print("Note: caste/religion columns are included to match the schema, but keep them out of any")
print("predictive-scoring model input — aggregate-only, per the earlier discussion.")
