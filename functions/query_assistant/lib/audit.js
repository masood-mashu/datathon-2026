function buildAuditRecord({ sessionId, userRole, queryText, route }) {
  return {
    session_id: sessionId,
    user_role: userRole,
    query_text: queryText,
    query_mode: route.mode,
    intent: route.intent,
    template_id: route.templateId,
    generated_zcql: route.zcql,
    source_reference: route.sourceReference,
    explainability_version: "v1-catalyst-node",
    created_at: new Date().toISOString(),
  };
}

module.exports = {
  buildAuditRecord,
};
