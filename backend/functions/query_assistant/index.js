const express = require("express");
const catalyst = require("zcatalyst-sdk-node");
const { routeQuery } = require("../../shared/queryRouter");
const { buildAuditRecord } = require("../../shared/audit");

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "query_assistant is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.post("/", async (req, res) => {
  const queryText = (req.body?.query || "").trim();
  const userRole = req.body?.role || "investigator";
  const sessionId = req.body?.session_id || "local-session";

  if (!queryText) {
    return res.status(400).json({ error: "query is required" });
  }

  const route = routeQuery(queryText);
  const audit = buildAuditRecord({
    sessionId,
    userRole,
    queryText,
    route,
  });

  let previewRows = [];
  let execution = {
    executed: false,
    reason: "No Catalyst app context available",
  };

  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    if (route.mode === "sql" || route.mode === "graph") {
      previewRows = await zcql.executeZCQLQuery(route.zcql);
      execution = {
        executed: true,
        row_count: Array.isArray(previewRows) ? previewRows.length : 0,
      };
    } else {
      execution = {
        executed: false,
        reason: "RAG mode is not wired yet",
      };
    }
  } catch (error) {
    execution = {
      executed: false,
      reason: error.message,
    };
  }

  return res.status(200).json({
    message: "Query routed successfully",
    timestamp: new Date().toISOString(),
    request: {
      query: queryText,
      role: userRole,
      session_id: sessionId,
    },
    route,
    execution,
    preview_rows: previewRows,
    audit,
  });
});

module.exports = app;
