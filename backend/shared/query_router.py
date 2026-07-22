try:
    from backend.shared.sql_templates import build_sql_plan
except ModuleNotFoundError:
    from shared.sql_templates import build_sql_plan


def route_query(query_text):
    normalized = query_text.lower().strip()

    if any(keyword in normalized for keyword in ["how many", "count", "total", "trend"]):
        sql_plan = build_sql_plan(normalized)
        return {
            "mode": "sql",
            "intent": "structured_aggregation",
            "confidence": 0.86,
            "sql": sql_plan["sql"],
            "template_id": sql_plan["template_id"],
            "template_title": sql_plan["title"],
            "explanation": sql_plan["description"],
            "source_reference": "CaseMaster, CrimeHead, Unit",
        }

    if any(keyword in normalized for keyword in ["show network", "connections", "gang", "associate"]):
        return {
            "mode": "graph",
            "intent": "criminal_network_analysis",
            "confidence": 0.81,
            "sql": (
                "SELECT AccusedMasterID_A, AccusedMasterID_B, SharedCaseMasterID, RelationType "
                "FROM CriminalNetworkEdge LIMIT 100"
            ),
            "template_id": "criminal_network_preview",
            "template_title": "Criminal network preview",
            "explanation": "Fetches a preview of co-accused relationships for graph rendering.",
            "source_reference": "CriminalNetworkEdge",
        }

    return {
        "mode": "rag",
        "intent": "narrative_retrieval",
        "confidence": 0.68,
        "sql": None,
        "template_id": None,
        "template_title": None,
        "explanation": "Falls back to narrative retrieval over brief case facts.",
        "source_reference": "QuickML knowledge base over CaseMaster.BriefFacts",
    }
