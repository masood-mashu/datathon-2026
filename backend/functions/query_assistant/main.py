import json
from datetime import datetime, timezone

try:
    from backend.shared.audit import build_audit_record
    from backend.shared.query_router import route_query
except ModuleNotFoundError:
    from shared.audit import build_audit_record
    from shared.query_router import route_query


def handler(event, context):
    body = _parse_event_body(event)
    query_text = body.get("query", "").strip()
    user_role = body.get("role", "investigator")
    session_id = body.get("session_id", "local-session")

    if not query_text:
        return _response(400, {"error": "query is required"})

    route = route_query(query_text)
    audit_record = build_audit_record(
        session_id=session_id,
        user_role=user_role,
        query_text=query_text,
        query_mode=route["mode"],
        generated_sql=route.get("sql"),
        source_reference=route.get("source_reference"),
    )

    payload = {
        "message": "Query routed successfully",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request": {
            "query": query_text,
            "role": user_role,
            "session_id": session_id,
        },
        "route": route,
        "audit": audit_record,
    }
    return _response(200, payload)


def _parse_event_body(event):
    if isinstance(event, dict) and isinstance(event.get("body"), str):
        try:
            return json.loads(event["body"])
        except json.JSONDecodeError:
            return {}
    if isinstance(event, dict) and isinstance(event.get("body"), dict):
        return event["body"]
    if isinstance(event, dict):
        return event
    return {}


def _response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }
