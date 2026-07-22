const { routeQuery } = require("./shared/queryRouter");
const { buildAuditRecord } = require("./shared/audit");

const testQueries = [
  {
    query: "How many cases are there by district in Bengaluru Urban for 2026?",
    role: "investigator",
    session_id: "smoke-sql",
  },
  {
    query: "Show network connections for repeat offenders",
    role: "analyst",
    session_id: "smoke-graph",
  },
  {
    query: "Summarize the brief facts for recent online fraud cases",
    role: "supervisor",
    session_id: "smoke-rag",
  },
];

for (const request of testQueries) {
  const route = routeQuery(request.query);
  const audit = buildAuditRecord({
    sessionId: request.session_id,
    userRole: request.role,
    queryText: request.query,
    route,
  });

  console.log(
    JSON.stringify(
      {
        request,
        route,
        audit,
      },
      null,
      2
    )
  );
}
