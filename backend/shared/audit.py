from datetime import datetime, timezone


def build_audit_record(
    session_id,
    user_role,
    query_text,
    query_mode,
    generated_sql=None,
    source_reference=None,
):
    return {
        "session_id": session_id,
        "user_role": user_role,
        "query_text": query_text,
        "query_mode": query_mode,
        "generated_sql": generated_sql,
        "source_reference": source_reference,
        "explainability_version": "v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
