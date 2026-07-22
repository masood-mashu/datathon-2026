function buildAuditRecord({
  sessionId,
  userRole,
  queryText,
  route,
}) {
  return {
    session_id: sessionId,
    user_role: userRole,
    query_text: queryText,
    query_mode: route.mode,
    intent: route.intent,
    generated_zcql: route.zcql,
    template_id: route.templateId,
    source_reference: route.sourceReference,
    explainability_version: "v1-node",
    created_at: new Date().toISOString(),
  };
}

module.exports = {
  buildAuditRecord,
};
