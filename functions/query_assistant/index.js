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

  if (req.method === "POST" && pathname === "/") {
    const body = await parseBody(req);
    const queryText = (body.query || "").trim();
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
      queryText,
      route,
    });

    const execution = await executeQuery(req, route);

    sendJson(res, 200, {
      message: "Query routed successfully",
      timestamp: new Date().toISOString(),
      request: {
        query: queryText,
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
  if (!route.zcql || (route.mode !== "sql" && route.mode !== "graph")) {
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

    if (route.templateId === "criminal_network_preview") {
      const rows = executeGraphPreview(route.parameters || {});
      return {
        executed: true,
        rowCount: rows.length,
        rows: rows.slice(0, 25),
        summary: null,
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
          ? ["CriminalNetworkEdge"]
          : route.templateId === "cases_by_district"
            ? ["CaseMaster", "Unit", "District"]
            : route.templateId === "case_status_breakdown"
              ? ["CaseMaster", "CaseStatusMaster"]
              : ["CaseMaster"],
      next_step:
        "Create the required Data Store tables from schema.sql and import the matching CSV files before rerunning this query.",
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
