function buildZcqlPlan(queryText) {
  const normalized = queryText.toLowerCase().trim();

  const districtMatch = extractDistrict(normalized);
  const dateRange = extractDateRange(normalized);

  if (normalized.includes("district")) {
    return {
      templateId: "cases_by_district",
      title: "Cases by district",
      mode: "sql",
      intent: "structured_aggregation",
      confidence: 0.88,
      explanation: "Aggregates registered cases by district with an optional district filter.",
      sourceReference: "CaseMaster, Unit, District",
      parameters: {
        district: districtMatch,
        dateRange,
      },
      zcql: [
        "SELECT District.DistrictName AS DistrictName, COUNT(CaseMaster.CaseMasterID) AS CaseCount",
        "FROM CaseMaster",
        "JOIN Unit ON CaseMaster.PoliceStationID = Unit.UnitID",
        "JOIN District ON Unit.DistrictID = District.DistrictID",
        buildWhereClause([
          districtMatch ? `District.DistrictName = '${escapeLiteral(districtMatch)}'` : null,
          dateRange.from ? `CaseMaster.CrimeRegisteredDate >= '${dateRange.from}'` : null,
          dateRange.to ? `CaseMaster.CrimeRegisteredDate <= '${dateRange.to}'` : null,
        ]),
        "GROUP BY District.DistrictName",
        "ORDER BY CaseCount DESC",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  if (
    normalized.includes("trend") ||
    normalized.includes("monthly") ||
    normalized.includes("hotspot") ||
    normalized.includes("crime head")
  ) {
    return {
      templateId: "monthly_crime_trend",
      title: "Monthly crime trend",
      mode: "sql",
      intent: "structured_trend_analysis",
      confidence: 0.84,
      explanation: "Shows month-wise case volume by major crime head.",
      sourceReference: "CaseMaster",
      parameters: { dateRange },
      zcql: [
        "SELECT CaseMaster.CrimeMajorHeadID AS CrimeMajorHeadID,",
        "DATE_FORMAT(CaseMaster.CrimeRegisteredDate, '%Y-%m') AS MonthBucket,",
        "COUNT(CaseMaster.CaseMasterID) AS CaseCount",
        "FROM CaseMaster",
        buildWhereClause([
          dateRange.from ? `CaseMaster.CrimeRegisteredDate >= '${dateRange.from}'` : null,
          dateRange.to ? `CaseMaster.CrimeRegisteredDate <= '${dateRange.to}'` : null,
        ]),
        "GROUP BY CaseMaster.CrimeMajorHeadID, DATE_FORMAT(CaseMaster.CrimeRegisteredDate, '%Y-%m')",
        "ORDER BY MonthBucket DESC, CaseCount DESC",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  if (normalized.includes("status") || normalized.includes("chargesheet")) {
    return {
      templateId: "case_status_breakdown",
      title: "Case status breakdown",
      mode: "sql",
      intent: "case_status_breakdown",
      confidence: 0.86,
      explanation: "Summarizes cases by investigation status.",
      sourceReference: "CaseMaster, CaseStatusMaster",
      parameters: { dateRange },
      zcql: [
        "SELECT CaseStatusMaster.CaseStatusName AS CaseStatusName, COUNT(CaseMaster.CaseMasterID) AS CaseCount",
        "FROM CaseMaster",
        "JOIN CaseStatusMaster ON CaseMaster.CaseStatusID = CaseStatusMaster.CaseStatusID",
        buildWhereClause([
          dateRange.from ? `CaseMaster.CrimeRegisteredDate >= '${dateRange.from}'` : null,
          dateRange.to ? `CaseMaster.CrimeRegisteredDate <= '${dateRange.to}'` : null,
        ]),
        "GROUP BY CaseStatusMaster.CaseStatusName",
        "ORDER BY CaseCount DESC",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  return {
    templateId: "case_count",
    title: "Total case count",
    mode: "sql",
    intent: "structured_aggregation",
    confidence: 0.76,
    explanation: "Returns the total number of cases.",
    sourceReference: "CaseMaster",
    parameters: { dateRange },
    zcql: [
      "SELECT COUNT(CaseMaster.CaseMasterID) AS CaseCount",
      "FROM CaseMaster",
      buildWhereClause([
        dateRange.from ? `CaseMaster.CrimeRegisteredDate >= '${dateRange.from}'` : null,
        dateRange.to ? `CaseMaster.CrimeRegisteredDate <= '${dateRange.to}'` : null,
      ]),
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function buildWhereClause(conditions) {
  const filtered = conditions.filter(Boolean);
  if (!filtered.length) {
    return "";
  }
  return `WHERE ${filtered.join(" AND ")}`;
}

function escapeLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function extractDistrict(normalized) {
  const knownDistricts = [
    "bagalkot",
    "ballari",
    "belagavi",
    "bengaluru rural",
    "bengaluru urban",
    "bidar",
    "chamarajanagar",
    "chikkaballapur",
    "chikkamagaluru",
    "chitradurga",
    "dakshina kannada",
    "davanagere",
    "dharwad",
    "gadag",
    "hassan",
    "haveri",
    "kalaburagi",
    "kodagu",
    "kolar",
    "koppal",
    "mandya",
    "mysuru",
    "raichur",
    "ramanagara",
    "shivamogga",
    "tumakuru",
    "udupi",
    "uttara kannada",
    "vijayapura",
    "yadgir",
    "vijayanagara",
  ];

  const district = knownDistricts.find((name) => normalized.includes(name));
  return district ? toTitleCase(district) : null;
}

function extractDateRange(normalized) {
  if (normalized.includes("2026")) {
    return { from: "2026-01-01", to: "2026-12-31" };
  }
  if (normalized.includes("2025")) {
    return { from: "2025-01-01", to: "2025-12-31" };
  }
  if (normalized.includes("last 30 days")) {
    return { from: "2026-06-22", to: "2026-07-22" };
  }
  return { from: null, to: null };
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
  buildZcqlPlan,
};
