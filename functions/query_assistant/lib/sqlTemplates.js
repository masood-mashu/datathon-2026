function buildZcqlPlan(queryText) {
  const normalized = queryText.toLowerCase().trim();

  const district = extractDistrict(normalized);
  const dateRange = extractDateRange(normalized);

  const caseNumber = extractCaseNumber(queryText);
  if (caseNumber && (normalized.includes("fir") || normalized.includes("case") || normalized.includes("details") || normalized.includes("show"))) {
    return {
      mode: "sql",
      intent: "fir_case_lookup",
      confidence: 0.9,
      templateId: "fir_case_lookup",
      templateTitle: "FIR case lookup",
      explanation: "Retrieves a case record and its police-station context by FIR crime number or case number.",
      sourceReference: "CaseMaster, Unit, District",
      parameters: { caseNumber },
      zcql: `SELECT CaseMaster.CrimeNo, CaseMaster.CaseNo, CaseMaster.CrimeRegisteredDate, CaseMaster.BriefFacts FROM CaseMaster WHERE CaseMaster.CrimeNo = '${escapeLiteral(caseNumber)}' OR CaseMaster.CaseNo = '${escapeLiteral(caseNumber)}' LIMIT 10`,
    };
  }

  if (normalized.includes("hotspot") || normalized.includes("hot spot") || normalized.includes("cluster")) {
    return {
      mode: "sql",
      intent: "geospatial_hotspot_analysis",
      confidence: 0.84,
      templateId: "geospatial_hotspot_analysis",
      templateTitle: "Geospatial hotspot analysis",
      explanation: "Aggregates cases into approximate coordinate cells to surface recurring incident locations.",
      sourceReference: "CaseMaster.latitude, CaseMaster.longitude",
      parameters: { dateRange, district },
      zcql: "AGGREGATE CaseMaster latitude/longitude into 0.02-degree hotspot cells",
    };
  }

  if (normalized.includes("district")) {
    return {
      mode: "sql",
      intent: "structured_aggregation",
      confidence: 0.88,
      templateId: "cases_by_district",
      templateTitle: "Cases by district",
      explanation: "Aggregates registered cases by district with optional district and date filters.",
      sourceReference: "CaseMaster, Unit, District",
      parameters: { district, dateRange },
      zcql: [
        "SELECT District.DistrictName, COUNT(CaseMaster.ROWID)",
        "FROM CaseMaster",
        "JOIN Unit ON CaseMaster.PoliceStationID = Unit.UnitID",
        "JOIN District ON Unit.DistrictID = District.DistrictID",
        buildWhereClause([
          district ? `District.DistrictName = '${escapeLiteral(district)}'` : null,
          dateRange.from ? `CaseMaster.CrimeRegisteredDate >= '${dateRange.from}'` : null,
          dateRange.to ? `CaseMaster.CrimeRegisteredDate <= '${dateRange.to}'` : null,
        ]),
        "GROUP BY District.DistrictName",
        "ORDER BY COUNT(CaseMaster.ROWID) DESC",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  if (
    normalized.includes("status") ||
    normalized.includes("chargesheet") ||
    normalized.includes("closed cases")
  ) {
    return {
      mode: "sql",
      intent: "case_status_breakdown",
      confidence: 0.86,
      templateId: "case_status_breakdown",
      templateTitle: "Case status breakdown",
      explanation: "Summarizes cases by investigation status.",
      sourceReference: "CaseMaster, CaseStatusMaster",
      parameters: { dateRange },
      zcql: [
        "SELECT CaseStatusMaster.CaseStatusName, COUNT(CaseMaster.ROWID)",
        "FROM CaseMaster",
        "JOIN CaseStatusMaster ON CaseMaster.CaseStatusID = CaseStatusMaster.CaseStatusID",
        buildWhereClause([
          dateRange.from ? `CaseMaster.CrimeRegisteredDate >= '${dateRange.from}'` : null,
          dateRange.to ? `CaseMaster.CrimeRegisteredDate <= '${dateRange.to}'` : null,
        ]),
        "GROUP BY CaseStatusMaster.CaseStatusName",
        "ORDER BY COUNT(CaseMaster.ROWID) DESC",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  return {
    mode: "sql",
    intent: "structured_trend_analysis",
    confidence: 0.84,
    templateId: "monthly_crime_trend",
    templateTitle: "Monthly crime trend",
    explanation: "Shows month-wise case volume by major crime head.",
    sourceReference: "CaseMaster",
    parameters: { dateRange },
    zcql: [
      "SELECT CaseMaster.CrimeMajorHeadID,",
      "DATE_FORMAT(CaseMaster.CrimeRegisteredDate, '%Y-%m'),",
      "COUNT(CaseMaster.ROWID)",
      "FROM CaseMaster",
      buildWhereClause([
        dateRange.from ? `CaseMaster.CrimeRegisteredDate >= '${dateRange.from}'` : null,
        dateRange.to ? `CaseMaster.CrimeRegisteredDate <= '${dateRange.to}'` : null,
      ]),
      "GROUP BY CaseMaster.CrimeMajorHeadID, DATE_FORMAT(CaseMaster.CrimeRegisteredDate, '%Y-%m')",
      "ORDER BY DATE_FORMAT(CaseMaster.CrimeRegisteredDate, '%Y-%m') DESC, COUNT(CaseMaster.ROWID) DESC",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function buildWhereClause(conditions) {
  const filtered = conditions.filter(Boolean);
  return filtered.length ? `WHERE ${filtered.join(" AND ")}` : "";
}

function escapeLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function extractDistrict(normalized) {
  const districts = [
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

  const matched = districts.find((name) => normalized.includes(name));
  return matched ? toTitleCase(matched) : null;
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

function extractCaseNumber(queryText) {
  const match = String(queryText).match(/\b\d{9,18}\b/);
  return match ? match[0] : null;
}

module.exports = {
  buildZcqlPlan,
};
