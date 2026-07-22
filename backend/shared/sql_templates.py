from typing import Dict, Optional


def build_sql_plan(normalized_query: str) -> Dict[str, Optional[str]]:
    if "district" in normalized_query:
        return {
            "template_id": "cases_by_district",
            "title": "Cases by district",
            "sql": (
                "SELECT d.DistrictName, COUNT(*) AS CaseCount "
                "FROM CaseMaster c "
                "JOIN Unit u ON c.PoliceStationID = u.UnitID "
                "JOIN District d ON u.DistrictID = d.DistrictID "
                "GROUP BY d.DistrictName "
                "ORDER BY CaseCount DESC"
            ),
            "description": "Aggregates registered cases by district.",
        }

    if any(keyword in normalized_query for keyword in ["hotspot", "trend", "monthly", "month"]):
        return {
            "template_id": "monthly_crime_trend",
            "title": "Monthly crime trend",
            "sql": (
                "SELECT CrimeMajorHeadID, DATE_FORMAT(CrimeRegisteredDate, '%Y-%m') AS MonthBucket, "
                "COUNT(*) AS CaseCount "
                "FROM CaseMaster "
                "GROUP BY CrimeMajorHeadID, DATE_FORMAT(CrimeRegisteredDate, '%Y-%m') "
                "ORDER BY MonthBucket DESC, CaseCount DESC"
            ),
            "description": "Shows month-wise case volume by major crime head.",
        }

    if "chargesheet" in normalized_query:
        return {
            "template_id": "chargesheet_status_summary",
            "title": "Chargesheet summary",
            "sql": (
                "SELECT csm.CaseStatusName, COUNT(*) AS CaseCount "
                "FROM CaseMaster cm "
                "JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID "
                "GROUP BY csm.CaseStatusName "
                "ORDER BY CaseCount DESC"
            ),
            "description": "Summarizes cases by investigation status.",
        }

    return {
        "template_id": "case_count",
        "title": "Total case count",
        "sql": "SELECT COUNT(*) AS CaseCount FROM CaseMaster",
        "description": "Returns the total number of cases.",
    }
