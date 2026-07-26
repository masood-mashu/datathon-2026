const { buildZcqlPlan } = require("./sqlTemplates");

function routeQuery(queryText) {
  const normalized = queryText.toLowerCase().trim();

  if (normalized.includes("timeline") || normalized.includes("case history") || normalized.includes("investigation history")) {
    return {
      mode: "decision_support",
      intent: "case_timeline",
      confidence: 0.83,
      templateId: "case_timeline",
      templateTitle: "Investigation timeline",
      explanation: "Builds an evidence-linked case chronology from FIR registration, arrest/surrender, and charge-sheet records.",
      sourceReference: "CaseMaster, ArrestSurrender, ChargesheetDetails",
      parameters: {},
      zcql: "BUILD TIMELINE FROM CaseMaster, ArrestSurrender, ChargesheetDetails",
    };
  }

  if (normalized.includes("similar case") || normalized.includes("similar past") || normalized.includes("precedent")) {
    return {
      mode: "decision_support",
      intent: "similar_case_retrieval",
      confidence: 0.78,
      templateId: "similar_cases",
      templateTitle: "Similar past cases",
      explanation: "Ranks prior cases by shared crime classification and police-station context to support investigator review.",
      sourceReference: "CaseMaster, CrimeMajorHeadMaster, CrimeMinorHeadMaster",
      parameters: {},
      zcql: "RETRIEVE SIMILAR CASES FROM CaseMaster classification and location fields",
    };
  }

  if (
    normalized.includes("network") ||
    normalized.includes("connections") ||
    normalized.includes("gang") ||
    normalized.includes("associate")
  ) {
    return {
      mode: "graph",
      intent: "criminal_network_analysis",
      confidence: 0.82,
      templateId: "criminal_network_preview",
      templateTitle: "Criminal network preview",
      explanation: "Builds a repeat-offender network preview for graph rendering.",
      sourceReference: "Accused co-occurrence data from Catalyst Data Store; packaged fallback only when the Accused table is unavailable",
      parameters: {},
      zcql: [
        "SELECT CriminalNetworkEdge.AccusedMasterID_A AS AccusedMasterID_A,",
        "CriminalNetworkEdge.AccusedMasterID_B AS AccusedMasterID_B,",
        "CriminalNetworkEdge.SharedCaseMasterID AS SharedCaseMasterID,",
        "CriminalNetworkEdge.RelationType AS RelationType",
        "FROM CriminalNetworkEdge",
        "LIMIT 100",
      ].join(" "),
    };
  }

  if (
    normalized.includes("brief facts") ||
    normalized.includes("summarize") ||
    normalized.includes("narrative")
  ) {
    const parameters = buildNarrativeParameters(normalized);

    return {
      mode: "rag",
      intent: "narrative_retrieval",
      confidence: 0.79,
      templateId: "brief_facts_retrieval",
      templateTitle: "Brief facts retrieval",
      explanation: "Retrieves narrative case snippets from CaseMaster.BriefFacts with packaged fallback using keyword, district, year, and recency signals.",
      sourceReference: "Catalyst Data Store CaseMaster.BriefFacts with packaged fallback corpus",
      originalQueryText: queryText,
      parameters,
      zcql: buildNarrativePseudoQuery(parameters),
    };
  }

  return buildZcqlPlan(queryText);
}

function buildNarrativeParameters(normalized) {
  const dateRange = extractDateRange(normalized);
  const district = extractDistrict(normalized);
  const keywords = [];

  if (normalized.includes("online fraud")) {
    keywords.push("online fraud");
  }
  if (normalized.includes("identity theft")) {
    keywords.push("identity theft");
  }
  if (normalized.includes("cheating")) {
    keywords.push("cheating");
  }
  if (normalized.includes("criminal breach of trust")) {
    keywords.push("criminal breach of trust");
  }
  if (!keywords.length && (normalized.includes("fraud") || normalized.includes("cyber"))) {
    keywords.push("online fraud", "identity theft");
  }

  return {
    keywords,
    district,
    year: dateRange.from ? dateRange.from.slice(0, 4) : null,
    recency: normalized.includes("recent") || normalized.includes("latest") ? "recent" : null,
    limit: 5,
  };
}

function buildNarrativePseudoQuery(parameters) {
  const clauses = [
    parameters.keywords.length ? `keywords IN (${parameters.keywords.map((keyword) => `'${keyword}'`).join(", ")})` : null,
    parameters.district ? `district = '${parameters.district}'` : null,
    parameters.year ? `year = '${parameters.year}'` : null,
    parameters.recency ? "sort = recent-first" : null,
  ].filter(Boolean);

  return [
    "RETRIEVE BriefFacts",
    "FROM CaseMaster.BriefFacts",
    clauses.length ? `WHERE ${clauses.join(" AND ")}` : null,
    `LIMIT ${parameters.limit || 5}`,
  ]
    .filter(Boolean)
    .join(" ");
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
  if (normalized.includes("2024")) {
    return { from: "2024-01-01", to: "2024-12-31" };
  }
  if (normalized.includes("2023")) {
    return { from: "2023-01-01", to: "2023-12-31" };
  }
  return { from: null, to: null };
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
  routeQuery,
};
