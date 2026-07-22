const { buildZcqlPlan } = require("./sqlTemplates");

function routeQuery(queryText) {
  const normalized = queryText.toLowerCase().trim();

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
      explanation: "Fetches a preview of co-accused relationships for graph rendering.",
      sourceReference: "CriminalNetworkEdge",
      zcql: [
        "SELECT CriminalNetworkEdge.AccusedMasterID_A AS AccusedMasterID_A,",
        "CriminalNetworkEdge.AccusedMasterID_B AS AccusedMasterID_B,",
        "CriminalNetworkEdge.SharedCaseMasterID AS SharedCaseMasterID,",
        "CriminalNetworkEdge.RelationType AS RelationType",
        "FROM CriminalNetworkEdge",
        "LIMIT 100",
      ].join(" "),
      parameters: {},
    };
  }

  if (
    normalized.includes("brief facts") ||
    normalized.includes("summarize") ||
    normalized.includes("narrative")
  ) {
    return {
      mode: "rag",
      intent: "narrative_retrieval",
      confidence: 0.7,
      templateId: null,
      templateTitle: null,
      explanation: "Falls back to narrative retrieval over brief case facts.",
      sourceReference: "CaseMaster.BriefFacts",
      zcql: null,
      parameters: {},
    };
  }

  return buildZcqlPlan(queryText);
}

module.exports = {
  routeQuery,
};
