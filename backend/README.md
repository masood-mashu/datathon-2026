# Backend Scaffold

This folder contains the function-layer scaffold for the Challenge 01
assistant. The prototype path now prioritizes Node.js so the function can be
edited and deployed smoothly through Zoho Catalyst.

## Current Design

- `functions/query_assistant/main.py`
  - request entry point
  - basic intent routing
  - audit-trail payload generation
- `functions/query_assistant/index.js`
  - Catalyst Advanced I/O entry point using Express and `zcatalyst-sdk-node`
- `functions/query_assistant/package.json`
  - function dependencies for Catalyst deployment
- `shared/query_router.py`
  - heuristic routing between SQL, graph, and RAG flows
- `shared/sql_templates.py`
  - reusable SQL templates for common investigation questions
- `shared/audit.py`
  - standardized audit record creation
- `shared/queryRouter.js`
  - Node.js route selection for SQL, graph, and RAG prototype flows
- `shared/sqlTemplates.js`
  - Node.js ZCQL template builders and simple parameter extraction
- `shared/audit.js`
  - Node.js audit record generation
- `local_smoke_test.py`
  - direct local invocation harness for the function handler
- `local_smoke_test.js`
  - local Node smoke harness without needing Catalyst

## Next Backend Steps

1. Link the repo with Catalyst using `catalyst init`
2. Install Node dependencies inside `backend/functions/query_assistant`
3. Connect the function to Catalyst Data Store and validate live ZCQL
4. Persist audit records to the `AuditTrail` table
5. Add role-aware field suppression for protected attributes

## Local Smoke Test

Node-only routing smoke test:

```powershell
node backend/local_smoke_test.js
```
