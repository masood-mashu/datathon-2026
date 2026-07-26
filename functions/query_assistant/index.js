"use strict";

const catalyst = require("zcatalyst-sdk-node");
const { routeQuery } = require("./lib/queryRouter");
const { buildAuditRecord } = require("./lib/audit");
const { graphSeed } = require("./lib/graphSeed");
const { executeNarrativeRetrieval } = require("./lib/ragEngine");

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = (req.url || "/").split("?")[0];

  if (req.method === "GET" && pathname === "/") {
    sendJson(res, 200, {
      message: "query_assistant is healthy",
      timestamp: new Date().toISOString(),
      project_mode: "Challenge 01 prototype",
      supported_queries: [
        "How many cases are there by district in Bengaluru Urban for 2026?",
        "Show status breakdown for 2026",
        "Show network connections for repeat offenders",
      ],
    });
    return;
  }

  if (req.method === "POST" && pathname === "/report") {
    const body = await parseBody(req);
    try {
      const catalystApp = catalyst.initialize(req);
      const pdfStream = await catalystApp.smartbrowz().convertToPdf(
        buildConversationReportHtml(body),
        {
          pdf_options: {
            format: "A4",
            margin: { top: "18mm", right: "14mm", bottom: "18mm", left: "14mm" },
            display_header_footer: true,
            footer_template: '<div style="font-size:9px;width:100%;text-align:center;color:#637087">KSP Crime Intelligence - Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
          },
        }
      );
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ksp-conversation-report.pdf"',
      });
      pdfStream.pipe(res);
    } catch (error) {
      sendJson(res, 500, { error: "Could not generate the Catalyst SmartBrowz PDF report.", detail: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/") {
    const body = await parseBody(req);
    const rawQueryText = (body.query || "").trim();
    const queryText = contextualizeQuery(
      rawQueryText,
      Array.isArray(body.conversation_context) ? body.conversation_context : []
    );
    const userRole = body.role || "investigator";
    const sessionId = body.session_id || "local-session";

    if (!queryText) {
      sendJson(res, 400, { error: "query is required" });
      return;
    }

    const route = routeQuery(queryText);
    const audit = buildAuditRecord({
      sessionId,
      userRole,
      queryText: rawQueryText,
      route,
    });

    const execution = await executeQuery(req, route);

    sendJson(res, 200, {
      message: "Query routed successfully",
      timestamp: new Date().toISOString(),
      request: {
        query: rawQueryText,
        resolved_query: queryText,
        role: userRole,
        session_id: sessionId,
      },
      route,
      execution: {
        executed: execution.executed,
        reason: execution.reason || null,
        row_count: execution.rowCount,
        setup_hint: execution.setupHint || null,
      },
      preview_rows: execution.rows,
      summary: execution.summary || null,
      citations: execution.citations || [],
      audit,
    });
    return;
  }

  sendJson(res, 404, {
    error: "Not found",
    message: 'Use GET "/" for health or POST "/" for query routing.',
  });
};

async function executeQuery(req, route) {
  if (!route.zcql || (route.mode !== "sql" && route.mode !== "graph" && route.mode !== "decision_support")) {
    if (route.mode === "rag" && route.templateId === "brief_facts_retrieval") {
      try {
        const catalystApp = catalyst.initialize(req);
        const zcql = catalystApp.zcql();
        return await executeBriefFactsRetrieval(zcql, route);
      } catch (_error) {
        const ragResult = executeNarrativeRetrieval(
          route.originalQueryText || "",
          route.parameters || {}
        );
        return {
          executed: ragResult.executed,
          reason: "Used packaged fallback corpus because Data Store retrieval was unavailable.",
          rowCount: ragResult.rowCount,
          rows: ragResult.rows,
          summary: ragResult.summary,
          citations: ragResult.citations,
          setupHint: null,
        };
      }
    }

    return {
      executed: false,
      reason: "Route does not execute ZCQL yet",
      rowCount: 0,
      rows: [],
      summary: null,
      citations: [],
      setupHint: null,
    };
  }

  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    if (route.templateId === "cases_by_district") {
      const rows = await executeCasesByDistrict(zcql, route.parameters || {});
      return {
        executed: true,
        rowCount: rows.length,
        rows: rows.slice(0, 25),
        summary: null,
        citations: [],
        setupHint: null,
      };
    }

    if (route.templateId === "case_status_breakdown") {
      const rows = await executeCaseStatusBreakdown(zcql, route.parameters || {});
      return {
        executed: true,
        rowCount: rows.length,
        rows: rows.slice(0, 25),
        summary: null,
        citations: [],
        setupHint: null,
      };
    }

    if (route.templateId === "fir_case_lookup") {
      const rows = await executeFirCaseLookup(zcql, route.parameters || {});
      return {
        executed: true,
        rowCount: rows.length,
        rows: rows.slice(0, 10),
        summary: rows.length ? "FIR records matching the supplied crime or case number." : "No matching FIR record was found.",
        citations: [],
        setupHint: null,
      };
    }

    if (route.templateId === "geospatial_hotspot_analysis") {
      const rows = await executeGeospatialHotspots(zcql, route.parameters || {});
      return {
        executed: true,
        rowCount: rows.length,
        rows: rows.slice(0, 25),
        summary: "Hotspots are approximate coordinate cells, ranked by registered-case volume. They are decision-support indicators, not crime predictions.",
        citations: [],
        setupHint: null,
      };
    }

    if (route.templateId === "criminal_network_preview") {
      const graphResult = await executeCriminalNetwork(zcql);
      return {
        executed: true,
        rowCount: graphResult.rows.length,
        rows: graphResult.rows.slice(0, 25),
        summary: graphResult.summary,
        citations: [],
        setupHint: null,
      };
    }

    if (route.templateId === "case_timeline") {
      const rows = await executeCaseTimeline(zcql);
      return {
        executed: true,
        rowCount: rows.length,
        rows: rows.slice(0, 50),
        summary: "Timeline events are drawn from registered case, arrest/surrender, and charge-sheet records. Missing events indicate unavailable source records, not an investigative conclusion.",
        citations: [],
        setupHint: null,
      };
    }

    if (route.templateId === "similar_cases") {
      const rows = await executeSimilarCases(zcql);
      return {
        executed: true,
        rowCount: rows.length,
        rows: rows.slice(0, 25),
        summary: "Cases are grouped by recorded major/minor crime classification and police-station context. Similarity is a review aid, not a finding of linkage.",
        citations: [],
        setupHint: null,
      };
    }

    const rows = await zcql.executeZCQLQuery(route.zcql);

    return {
      executed: true,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      rows: Array.isArray(rows) ? rows.slice(0, 25) : [],
      summary: null,
      citations: [],
      setupHint: null,
    };
  } catch (error) {
    return {
      executed: false,
      reason: error.message,
      rowCount: 0,
      rows: [],
      summary: null,
      citations: [],
      setupHint: buildSetupHint(error.message, route),
    };
  }
}

async function executeBriefFactsRetrieval(zcql, route) {
  const caseRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery(
      "CaseMaster",
      ["CaseMasterID", "CaseNo", "PoliceStationID", "CrimeRegisteredDate", "BriefFacts"],
      [
        route.parameters?.year
          ? `CrimeRegisteredDate >= '${route.parameters.year}-01-01'`
          : null,
        route.parameters?.year
          ? `CrimeRegisteredDate <= '${route.parameters.year}-12-31'`
          : null,
      ]
    )
  );
  const unitRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("Unit", ["UnitID", "UnitName", "DistrictID"])
  );
  const districtRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("District", ["DistrictID", "DistrictName"])
  );

  const corpus = buildNarrativeCorpusFromDataStore(caseRows, unitRows, districtRows);
  if (!corpus.length) {
    const ragResult = executeNarrativeRetrieval(
      route.originalQueryText || "",
      route.parameters || {}
    );
    return {
      executed: ragResult.executed,
      reason: "Used packaged fallback corpus because Data Store BriefFacts values are empty.",
      rowCount: ragResult.rowCount,
      rows: ragResult.rows,
      summary: ragResult.summary,
      citations: ragResult.citations,
      setupHint: {
        problem: "CaseMaster exists, but BriefFacts values are not populated in the current Data Store import.",
        next_step:
          "Refresh CaseMaster from the full synthetic_data/CaseMaster.csv or update BriefFacts via Data Store import so RAG reads directly from Catalyst.",
        required_tables: ["CaseMaster", "Unit", "District"],
      },
    };
  }

  const ragResult = executeNarrativeRetrieval(
    route.originalQueryText || "",
    route.parameters || {},
    corpus
  );

  return {
    executed: ragResult.executed,
    reason: null,
    rowCount: ragResult.rowCount,
    rows: ragResult.rows,
    summary: ragResult.summary,
    citations: ragResult.citations,
    setupHint: null,
  };
}

function buildSetupHint(message, route) {
  if (!message) {
    return null;
  }

  if (message.includes("No such Table")) {
    return {
      problem: "Catalyst Data Store tables have not been created yet for this query path.",
      required_tables:
        route.mode === "graph"
          ? ["Accused"]
          : route.templateId === "case_timeline"
            ? ["CaseMaster", "ArrestSurrender", "ChargesheetDetails"]
            : route.templateId === "similar_cases"
              ? ["CaseMaster"]
          : route.templateId === "cases_by_district"
            ? ["CaseMaster", "Unit", "District"]
            : route.templateId === "case_status_breakdown"
              ? ["CaseMaster", "CaseStatusMaster"]
              : ["CaseMaster"],
      next_step:
        "Create the required Data Store tables from schema.sql and import the matching CSV files before rerunning this query.",
    };
  }

  if (route.templateId === "fir_case_lookup" || route.templateId === "geospatial_hotspot_analysis") {
    return {
      problem: "The current CaseMaster import is the minimal demonstration schema and does not include the requested FIR-detail or location fields.",
      required_tables: ["CaseMaster", "Unit", "District"],
      next_step:
        "Create or update CaseMaster using the complete schema.sql definition, then bulk-import synthetic_data/CaseMaster.csv through Catalyst Data Store before rerunning this query.",
    };
  }

  return null;
}

async function executeCasesByDistrict(zcql, parameters) {
  const dateRange = parameters.dateRange || {};
  const districtFilter = parameters.district || null;

  const caseRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("CaseMaster", [
      "ROWID",
      "PoliceStationID",
      "CrimeRegisteredDate",
    ], [
      dateRange.from ? `CrimeRegisteredDate >= '${dateRange.from}'` : null,
      dateRange.to ? `CrimeRegisteredDate <= '${dateRange.to}'` : null,
    ])
  );
  const unitRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("Unit", ["UnitID", "DistrictID"])
  );
  const districtRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("District", ["DistrictID", "DistrictName"])
  );

  const unitMap = new Map(
    extractTableRows(unitRows, "Unit").map((row) => [String(row.UnitID), String(row.DistrictID)])
  );
  const districtMap = new Map(
    extractTableRows(districtRows, "District").map((row) => [String(row.DistrictID), row.DistrictName])
  );

  const counts = new Map();
  for (const row of extractTableRows(caseRows, "CaseMaster")) {
    const districtId = unitMap.get(String(row.PoliceStationID));
    if (!districtId) {
      continue;
    }

    const districtName = districtMap.get(String(districtId));
    if (!districtName) {
      continue;
    }

    if (districtFilter && districtName !== districtFilter) {
      continue;
    }

    counts.set(districtName, (counts.get(districtName) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([DistrictName, CaseCount]) => ({ DistrictName, CaseCount }))
    .sort((left, right) => right.CaseCount - left.CaseCount);
}

async function executeCaseStatusBreakdown(zcql, parameters) {
  const dateRange = parameters.dateRange || {};

  const caseRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("CaseMaster", [
      "ROWID",
      "CaseStatusID",
      "CrimeRegisteredDate",
    ], [
      dateRange.from ? `CrimeRegisteredDate >= '${dateRange.from}'` : null,
      dateRange.to ? `CrimeRegisteredDate <= '${dateRange.to}'` : null,
    ])
  );
  const statusRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("CaseStatusMaster", ["CaseStatusID", "CaseStatusName"])
  );

  const statusMap = new Map(
    extractTableRows(statusRows, "CaseStatusMaster").map((row) => [
      String(row.CaseStatusID),
      row.CaseStatusName,
    ])
  );

  const counts = new Map();
  for (const row of extractTableRows(caseRows, "CaseMaster")) {
    const statusName = statusMap.get(String(row.CaseStatusID)) || `Status ${row.CaseStatusID}`;
    counts.set(statusName, (counts.get(statusName) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([CaseStatusName, CaseCount]) => ({ CaseStatusName, CaseCount }))
    .sort((left, right) => right.CaseCount - left.CaseCount);
}

async function executeFirCaseLookup(zcql, parameters) {
  const caseNumber = String(parameters.caseNumber || "");
  const caseRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery(
      "CaseMaster",
      ["CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "PoliceStationID", "CaseStatusID", "BriefFacts"],
      [`(CrimeNo = '${escapeZcqlLiteral(caseNumber)}' OR CaseNo = '${escapeZcqlLiteral(caseNumber)}')`]
    )
  );
  const unitRows = await zcql.executeZCQLQuery(buildSingleTableQuery("Unit", ["UnitID", "UnitName", "DistrictID"]));
  const districtRows = await zcql.executeZCQLQuery(buildSingleTableQuery("District", ["DistrictID", "DistrictName"]));
  const units = new Map(extractTableRows(unitRows, "Unit").map((row) => [String(row.UnitID), row]));
  const districts = new Map(extractTableRows(districtRows, "District").map((row) => [String(row.DistrictID), row.DistrictName]));

  return extractTableRows(caseRows, "CaseMaster").map((row) => {
    const unit = units.get(String(row.PoliceStationID)) || {};
    return {
      CrimeNo: row.CrimeNo,
      CaseNo: row.CaseNo,
      RegisteredDate: row.CrimeRegisteredDate,
      PoliceStation: unit.UnitName || "Unknown",
      District: districts.get(String(unit.DistrictID)) || "Unknown",
      CaseStatusID: row.CaseStatusID,
      BriefFacts: row.BriefFacts || "Not available",
    };
  });
}

async function executeGeospatialHotspots(zcql, parameters) {
  const dateRange = parameters.dateRange || {};
  const rows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("CaseMaster", ["CrimeRegisteredDate", "latitude", "longitude"], [
      dateRange.from ? `CrimeRegisteredDate >= '${dateRange.from}'` : null,
      dateRange.to ? `CrimeRegisteredDate <= '${dateRange.to}'` : null,
    ])
  );
  const cells = new Map();
  for (const row of extractTableRows(rows, "CaseMaster")) {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const latCell = (Math.floor(latitude * 50) / 50).toFixed(2);
    const longCell = (Math.floor(longitude * 50) / 50).toFixed(2);
    const key = `${latCell}, ${longCell}`;
    const current = cells.get(key) || { ApproximateLatitude: latCell, ApproximateLongitude: longCell, CaseCount: 0 };
    current.CaseCount += 1;
    cells.set(key, current);
  }
  return Array.from(cells.values()).sort((left, right) => right.CaseCount - left.CaseCount);
}

async function executeCaseTimeline(zcql) {
  const [caseRows, arrestRows, chargeSheetRows] = await Promise.all([
    executeTimelineCaseRows(zcql),
    zcql.executeZCQLQuery(
      buildSingleTableQuery("ArrestSurrender", ["CaseMasterID", "ArrestSurrenderID", "ArrestSurrenderTypeID", "ArrestSurrenderDate", "AccusedMasterID"])
    ),
    zcql.executeZCQLQuery(
      buildSingleTableQuery("ChargesheetDetails", ["CaseMasterID", "CSID", "csdate", "cstype"])
    ),
  ]);
  const caseMap = new Map(extractTableRows(caseRows, "CaseMaster").map((row) => [String(row.CaseMasterID), row]));
  const events = [];

  for (const row of caseMap.values()) {
    const caseLabel = row.CrimeNo || row.CaseNo || `Case ${row.CaseMasterID}`;
    if (row.IncidentFromDate) events.push({ Case: caseLabel, Date: row.IncidentFromDate, Event: "Incident window opened", Evidence: "CaseMaster.IncidentFromDate" });
    if (row.IncidentToDate) events.push({ Case: caseLabel, Date: row.IncidentToDate, Event: "Incident window closed", Evidence: "CaseMaster.IncidentToDate" });
    if (row.CrimeRegisteredDate) events.push({ Case: caseLabel, Date: row.CrimeRegisteredDate, Event: "FIR/case registered", Evidence: "CaseMaster.CrimeRegisteredDate" });
  }
  for (const row of extractTableRows(arrestRows, "ArrestSurrender")) {
    const caseRecord = caseMap.get(String(row.CaseMasterID)) || {};
    events.push({
      Case: caseRecord.CrimeNo || caseRecord.CaseNo || `Case ${row.CaseMasterID}`,
      Date: row.ArrestSurrenderDate,
      Event: String(row.ArrestSurrenderTypeID) === "2" ? "Surrender recorded" : "Arrest recorded",
      Evidence: `ArrestSurrender.${row.ArrestSurrenderID || "record"}; accused ${row.AccusedMasterID || "not recorded"}`,
    });
  }
  for (const row of extractTableRows(chargeSheetRows, "ChargesheetDetails")) {
    const caseRecord = caseMap.get(String(row.CaseMasterID)) || {};
    events.push({
      Case: caseRecord.CrimeNo || caseRecord.CaseNo || `Case ${row.CaseMasterID}`,
      Date: row.csdate,
      Event: chargeSheetTypeLabel(row.cstype),
      Evidence: `ChargesheetDetails.${row.CSID || "record"}`,
    });
  }
  return events.filter((row) => row.Date).sort((left, right) => String(right.Date).localeCompare(String(left.Date)));
}

async function executeTimelineCaseRows(zcql) {
  try {
    return await zcql.executeZCQLQuery(
      buildSingleTableQuery("CaseMaster", ["CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "IncidentFromDate", "IncidentToDate"])
    );
  } catch (_error) {
    try {
      return await zcql.executeZCQLQuery(buildSingleTableQuery("CaseMaster", ["CaseMasterID"]));
    } catch (_fallbackError) {
      return [];
    }
  }
}

async function executeSimilarCases(zcql) {
  const caseRows = await zcql.executeZCQLQuery(
    buildSingleTableQuery("CaseMaster", ["CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "PoliceStationID", "CrimeMajorHeadID", "CrimeMinorHeadID", "CaseStatusID"])
  );
  const groups = new Map();
  for (const row of extractTableRows(caseRows, "CaseMaster")) {
    const key = [row.CrimeMajorHeadID || "unknown", row.CrimeMinorHeadID || "unknown", row.PoliceStationID || "unknown"].join("|");
    const current = groups.get(key) || [];
    current.push(row);
    groups.set(key, current);
  }
  return Array.from(groups.entries())
    .filter(([, rows]) => rows.length > 1)
    .flatMap(([key, rows]) => rows.map((row) => ({
      Case: row.CrimeNo || row.CaseNo || `Case ${row.CaseMasterID}`,
      RegisteredDate: row.CrimeRegisteredDate,
      SimilarCasesInGroup: rows.length - 1,
      SimilarityBasis: `Major head, minor head, and police-station match (${key})`,
      CaseStatusID: row.CaseStatusID,
    })))
    .sort((left, right) => right.SimilarCasesInGroup - left.SimilarCasesInGroup);
}

function chargeSheetTypeLabel(value) {
  if (value === "A") return "Charge sheet filed";
  if (value === "B") return "False-case outcome recorded";
  if (value === "C") return "Undetected-case outcome recorded";
  return "Charge-sheet event recorded";
}

function escapeZcqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function buildSingleTableQuery(tableName, columns, conditions = []) {
  const where = conditions.filter(Boolean);
  return [
    `SELECT ${columns.map((column) => `${tableName}.${column}`).join(", ")}`,
    `FROM ${tableName}`,
    where.length ? `WHERE ${where.join(" AND ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function extractTableRows(rawRows, tableName) {
  if (!Array.isArray(rawRows)) {
    return [];
  }

  return rawRows.map((row) => extractTableRow(row, tableName)).filter(Boolean);
}

function extractTableRow(row, tableName) {
  if (!row || typeof row !== "object") {
    return null;
  }

  if (row[tableName] && typeof row[tableName] === "object") {
    return row[tableName];
  }

  const directKeys = Object.keys(row).filter((key) => key.startsWith(`${tableName}.`));
  if (directKeys.length) {
    return directKeys.reduce((accumulator, key) => {
      accumulator[key.slice(tableName.length + 1)] = row[key];
      return accumulator;
    }, {});
  }

  return row;
}

function buildNarrativeCorpusFromDataStore(caseRows, unitRows, districtRows) {
  const unitMap = new Map(
    extractTableRows(unitRows, "Unit").map((row) => [String(row.UnitID), row])
  );
  const districtMap = new Map(
    extractTableRows(districtRows, "District").map((row) => [String(row.DistrictID), row.DistrictName])
  );

  return extractTableRows(caseRows, "CaseMaster")
    .filter((row) => typeof row.BriefFacts === "string" && row.BriefFacts.trim().length > 0)
    .map((row) => {
      const unit = unitMap.get(String(row.PoliceStationID)) || {};
      const district = districtMap.get(String(unit.DistrictID)) || "Unknown";
      const policeStation = unit.UnitName || `Unit ${row.PoliceStationID || "unknown"}`;

      return {
        caseMasterId: String(row.CaseMasterID || row.ROWID || ""),
        caseNo: row.CaseNo || `CM-${row.CaseMasterID || row.ROWID || "unknown"}`,
        date: row.CrimeRegisteredDate || "",
        district,
        policeStation,
        category: inferNarrativeCategory(row.BriefFacts),
        briefFacts: row.BriefFacts,
      };
    });
}

function inferNarrativeCategory(briefFacts) {
  const normalized = String(briefFacts || "").toLowerCase();

  if (normalized.includes("online fraud")) {
    return "online fraud";
  }
  if (normalized.includes("identity theft")) {
    return "identity theft";
  }
  if (normalized.includes("criminal breach of trust")) {
    return "criminal breach of trust";
  }
  if (normalized.includes("cheating")) {
    return "cheating";
  }

  const match = normalized.match(/regarding (.+?)\./);
  return match ? match[1] : "other";
}

async function executeCriminalNetwork(zcql) {
  try {
    const accusedRows = await zcql.executeZCQLQuery(
      buildSingleTableQuery("Accused", ["AccusedMasterID", "CaseMasterID"])
    );
    const byCase = new Map();
    for (const row of extractTableRows(accusedRows, "Accused")) {
      const caseId = String(row.CaseMasterID || "");
      const accusedId = String(row.AccusedMasterID || "");
      if (!caseId || !accusedId) continue;
      const people = byCase.get(caseId) || [];
      people.push(accusedId);
      byCase.set(caseId, people);
    }

    const edges = [];
    for (const [caseId, people] of byCase.entries()) {
      const distinctPeople = [...new Set(people)].sort((left, right) => Number(left) - Number(right));
      for (let leftIndex = 0; leftIndex < distinctPeople.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < distinctPeople.length; rightIndex += 1) {
          edges.push({
            Source: `A${distinctPeople[leftIndex]}`,
            Target: `A${distinctPeople[rightIndex]}`,
            SharedCase: caseId,
            RelationType: "co-accused",
            Weight: 1,
            Cluster: `case-${caseId}`,
          });
        }
      }
    }

    return {
      rows: edges.sort((left, right) => Number(right.SharedCase) - Number(left.SharedCase)),
      summary: "Relationships are calculated from accused co-occurrence in FIR cases. They are investigative leads, not proof of association or guilt.",
    };
  } catch (_error) {
    return {
      rows: executeGraphPreview(),
      summary: "Showing the packaged demonstration network because the Accused table is not yet available in Catalyst Data Store.",
    };
  }
}

function executeGraphPreview() {
  return graphSeed.map((edge) => ({
    Source: edge.AccusedMasterID_A,
    Target: edge.AccusedMasterID_B,
    SharedCase: edge.SharedCaseMasterID,
    RelationType: edge.RelationType,
    Weight: edge.Weight,
    Cluster: edge.ClusterLabel,
  }));
}

function contextualizeQuery(queryText, history) {
  const compactHistory = history
    .filter((item) => item && typeof item.query === "string")
    .slice(-3);
  const isFollowUp = /^(what about|and for|same for|how about|ಅದೇ|ಮತ್ತೆ)/i.test(queryText);

  if (!isFollowUp || !compactHistory.length) {
    return normalizeKannadaQuery(queryText);
  }

  return normalizeKannadaQuery(`${compactHistory[compactHistory.length - 1].query} ${queryText}`);
}

function normalizeKannadaQuery(queryText) {
  const replacements = [
    [/ಅಪರಾಧಗಳ ಸಂಖ್ಯೆ|ಪ್ರಕರಣಗಳ ಸಂಖ್ಯೆ/g, "cases"],
    [/ಜಿಲ್ಲೆ/g, "district"],
    [/ಸ್ಥಿತಿ|ತನಿಖಾ ಸ್ಥಿತಿ/g, "status"],
    [/ಜಾಲ|ಸಂಪರ್ಕಗಳು|ಗ್ಯಾಂಗ್/g, "network connections"],
    [/ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿಗಳು/g, "repeat offenders"],
    [/ಸಾರಾಂಶ|ಸಂಕ್ಷಿಪ್ತ ಸಂಗತಿಗಳು/g, "summarize brief facts"],
    [/ಬೆಂಗಳೂರು ನಗರ/g, "Bengaluru Urban"],
    [/ಮೈಸೂರು/g, "Mysuru"],
  ];

  return replacements.reduce(
    (normalized, [pattern, replacement]) => normalized.replace(pattern, replacement),
    queryText
  );
}

function buildConversationReportHtml(body) {
  const history = Array.isArray(body.history) ? body.history.slice(0, 20) : [];
  const latest = body.result || {};
  const rows = history
    .map((item) => `<tr><td>${escapeHtml(item.query)}</td><td>${escapeHtml(item.mode)}</td><td>${item.executed ? "Executed" : "Planned"}</td></tr>`)
    .join("");
  const summary = latest.summary || latest.route?.explanation || "No response summary was supplied.";
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#16233a;font-size:11px}h1{font-size:24px;color:#123c68;margin:0 0 6px}h2{font-size:15px;color:#123c68;margin:24px 0 8px}.tag{color:#62728a}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#123c68;color:#fff;text-align:left}th,td{padding:9px;border:1px solid #d9e1ec;vertical-align:top}p{line-height:1.5}</style></head><body><h1>KSP Crime Intelligence Conversation</h1><p class="tag">Evidence-led investigation report | Generated ${escapeHtml(new Date().toISOString())}</p><h2>Latest response</h2><p>${escapeHtml(summary)}</p><h2>Conversation history</h2><table><thead><tr><th>Question</th><th>Mode</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No conversation history supplied.</td></tr>'}</tbody></table><p class="tag">Synthetic-data prototype. Associations are investigative leads, not proof of wrongdoing.</p></body></html>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
}

async function parseBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (_error) {
    return {};
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}
