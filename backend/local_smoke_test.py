import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from functions.query_assistant.main import handler


def run_smoke_tests():
    test_events = [
        {
            "body": {
                "query": "How many cases are there by district?",
                "role": "investigator",
                "session_id": "smoke-sql",
            }
        },
        {
            "body": {
                "query": "Show network connections for repeat offenders",
                "role": "analyst",
                "session_id": "smoke-graph",
            }
        },
        {
            "body": {
                "query": "Summarize the brief facts for recent online fraud cases",
                "role": "supervisor",
                "session_id": "smoke-rag",
            }
        },
    ]

    for event in test_events:
        response = handler(event, context={})
        print(json.dumps(json.loads(response["body"]), indent=2))


if __name__ == "__main__":
    run_smoke_tests()
