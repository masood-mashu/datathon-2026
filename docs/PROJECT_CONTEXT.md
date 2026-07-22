# Project Context For Future AI Agents

Last updated: July 22, 2026

## One-Line Summary

This repository contains a same-day Zoho Catalyst prototype for KSP Datathon 2026 Challenge 01: a conversational crime database query assistant that routes investigation questions into SQL aggregation, graph preview, or `BriefFacts` narrative retrieval workflows.

## Why This Exists

The project was built for the KSP Datathon 2026 Challenge 01 problem statement: create an intelligent conversational AI interface for querying a police crime database.

The evaluation path requires a working deployment, so the team prioritized a live Catalyst prototype over a longer multi-day roadmap. The immediate goal was to prove that an investigator can ask natural-language questions and receive:

- A routed query mode
- An explainable intent
- A confidence score
- A generated query or retrieval plan
- Live execution status
- Preview rows from investigation-style data
- Audit metadata for traceability

## Current Live Deployment

Catalyst project:

```text
Project-Rainfall
```

Live client:

```text
https://project-rainfall-60079554686.development.catalystserverless.in/app/index.html
```

Live function:

```text
https://project-rainfall-60079554686.development.catalystserverless.in/server/query_assistant/
```

Local Catalyst config:

```text
catalyst.json
.catalystrc
```

## What Has Been Built

### 1. React Investigation Console

Location:

```text
crime-assistant-client/
```

The frontend provides:

- Natural-language question input
- Function endpoint field
- Demo fallback toggle
- Sample prompt chips
- Response preview panel
- Recent question history
- Audit-first display of route, intent, confidence, generated query, execution status, summary, and rows

Important behavior:

- The deployed client defaults to live endpoint mode.
- Demo fallback remains available as a safety switch.
- The normal function endpoint is `/server/query_assistant/`.

### 2. Catalyst Advanced I/O Function

Location:

```text
functions/query_assistant/
```

Main entry point:

```text
functions/query_assistant/index.js
```

The function supports:

- `GET /` health response
- `POST /` query routing and execution
- CORS headers for client calls
- JSON request parsing
- Query execution result packaging
- Audit metadata construction

### 3. Query Router

Location:

```text
functions/query_assistant/lib/queryRouter.js
```

The router classifies questions into these modes:

- `sql`
- `graph`
- `rag`

Current heuristic routing:

- Network, connections, gang, associate -> graph
- Brief facts, summarize, narrative -> RAG
- District questions -> SQL district aggregation
- Status, chargesheet, closed cases -> SQL status breakdown
- Other SQL-like questions -> default monthly crime trend plan

### 4. SQL Execution

Location:

```text
functions/query_assistant/lib/sqlTemplates.js
```

The live prototype has verified execution for:

- Cases by district
- Case status breakdown

The backend intentionally avoids depending on fragile Catalyst join behavior for the critical demo routes. It fetches simple table slices and performs aggregation in Node.js.

Current minimum Data Store tables:

```text
District
Unit
CaseStatusMaster
CaseMaster
```

### 5. Graph Preview

Locations:

```text
functions/query_assistant/lib/graphSeed.js
functions/query_assistant/index.js
```

The graph route returns a packaged network preview rather than reading a full graph table. This keeps the deployed prototype reliable for judging.

Verified graph query:

```text
Show network connections for repeat offenders
```

Expected behavior:

- Mode: `graph`
- Intent: `criminal_network_analysis`
- 6 network rows
- Includes edge `A102 A455 CM-2026-00045`

### 6. RAG / BriefFacts Retrieval

Locations:

```text
functions/query_assistant/lib/ragEngine.js
functions/query_assistant/lib/ragCorpus.js
functions/query_assistant/index.js
```

The RAG route retrieves and summarizes `BriefFacts` narratives.

Current behavior:

- Tries to read `CaseMaster.BriefFacts` from Catalyst Data Store.
- Uses `Unit` and `District` to enrich rows with station and district labels.
- Falls back to a packaged corpus if the Data Store table is missing narrative values.
- Scores records using keyword, district, year, recency, and token overlap.
- Returns preview rows, summary, and citations.

Verified RAG query:

```text
Summarize the brief facts for recent online fraud cases
```

Expected behavior:

- Mode: `rag`
- Intent: `narrative_retrieval`
- Generated query starts with `RETRIEVE BriefFacts FROM CaseMaster.BriefFacts`
- 5 rows returned
- Includes case `202600080`

### 7. Audit Metadata

Location:

```text
functions/query_assistant/lib/audit.js
```

Each query response includes audit metadata:

- Session ID
- User role
- Original query text
- Query mode
- Intent
- Template ID
- Generated query
- Source reference
- Explainability version
- Timestamp

## Data Assets

### Schema

Location:

```text
schema.sql
```

The schema models FIR-style crime data, including:

- Districts and police units
- Employees and courts
- Case categories and crime heads
- Case master records
- Complainants
- Victims
- Accused
- Act-section links
- Arrest/surrender records
- Chargesheets
- Derived criminal network edges

### Synthetic Data Generator

Location:

```text
generate_data.py
```

It generates synthetic Karnataka-style FIR data into:

```text
synthetic_data/
```

Important note:

This repository uses synthetic data only. It does not contain real FIR records or real personal data.

### Catalyst Import Files

Location:

```text
work/imports/
```

Important files:

```text
District.min.csv
Unit.min.csv
CaseStatusMaster.min.csv
CaseMaster.min.csv
CaseMaster.rag.update.csv
CaseMaster.rag.update.config.json
```

`CaseMaster.rag.update.csv` was used to backfill narrative fields for RAG using Catalyst Data Store bulk update.

## Verified Live Smoke Test

Last verified in the in-app browser on July 22, 2026.

The live app was tested with demo fallback off and `Live Endpoint` active.

### Prompt 1

```text
How many cases are there by district in Bengaluru Urban for 2026?
```

Expected result:

```text
Mode: sql
Executed successfully with 1 rows returned
Bengaluru Urban 27
```

### Prompt 2

```text
Show status breakdown for 2026
```

Expected result:

```text
Mode: sql
Executed successfully with 4 rows returned
Under Investigation 109
Charge Sheeted 91
Closed 78
Undetected 22
```

### Prompt 3

```text
Show network connections for repeat offenders
```

Expected result:

```text
Mode: graph
Executed successfully with 6 rows returned
A102 A455 CM-2026-00045 co-accused 3 online-fraud-ring
```

### Prompt 4

```text
Summarize the brief facts for recent online fraud cases
```

Expected result:

```text
Mode: rag
Executed successfully with 5 rows returned
RETRIEVE BriefFacts FROM CaseMaster.BriefFacts WHERE keywords IN ('online fraud') AND sort = recent-first LIMIT 5
Case 202600080 appears in preview rows
```

## Current Limitations

### General Natural Language Coverage

The prototype is optimized for the four verified workflows. Random investigation questions may not produce reliable answers unless they map to an implemented route.

Examples that are not fully implemented:

```text
Which IO has the most pending heinous cases?
Show burglary hotspots near Mysuru last month.
Which police stations have rising vehicle theft?
List accused linked across more than three districts.
```

Recommended future behavior:

Add an explicit unsupported-question response that suggests supported prompts instead of trying to answer everything.

### Graph Visualization

The graph route currently returns edge rows. It does not yet render an interactive node-link graph in the UI.

### RAG Depth

The RAG path is keyword and metadata retrieval, not embedding-based semantic retrieval. It is adequate for prototype demonstration, but future versions should use vector embeddings or Catalyst/Zoho AI search if available.

### Authentication And Roles

The UI has a role field in the request payload, but role-based access control is not enforced yet.

### Production Readiness

The deployed app is in Catalyst Development environment, not Production.

## Future Upgrade Roadmap

### Near-Term Upgrades

1. Add unsupported-question fallback

Return a clear response when a question is outside implemented scope:

```text
I can currently answer district counts, status breakdowns, repeat-offender networks, and BriefFacts summaries.
```

2. Add more SQL templates

Useful templates:

- IO workload
- Pending cases by police station
- Heinous vs non-heinous breakdown
- Crime head trend by month
- Police station hot spots
- Chargesheet delay analysis

3. Add interactive graph rendering

Render graph edges as an interactive network with:

- Nodes for accused IDs
- Edges for co-accused, same act-section, same IO, or shared case
- Cluster labels
- Click-to-inspect case references

4. Improve RAG retrieval

Upgrade from lexical scoring to:

- Embeddings
- Hybrid keyword + vector retrieval
- Better citations
- District/year filters
- Case-status-aware summaries

5. Add export features

Useful exports:

- Query response PDF
- CSV preview rows
- Audit trail JSON
- Investigation note summary

### Medium-Term Upgrades

1. Full Data Store schema import

Import all synthetic master and transactional tables, then enable richer joins and filters.

2. Query planner layer

Separate natural-language understanding from execution:

```text
Question -> Intent -> Parameters -> Template -> Execution -> Explanation
```

3. Role-based access control

Support different views for:

- Investigator
- Supervisory officer
- Analyst
- Admin

4. Kannada and voice workflow

Potential flow:

```text
Kannada speech -> transcript -> English/internal query intent -> response -> Kannada summary
```

5. Strong audit trail

Persist every query and response metadata into a Catalyst table:

```text
QueryAuditTrail
```

### Long-Term Upgrades

1. Predictive analytics

Examples:

- Crime trend forecasting
- Repeat-offender risk clusters
- Hotspot movement detection
- Case aging risk

Important caution:

Avoid using sensitive demographic attributes for predictive scoring. Keep caste, religion, and similar fields out of model inputs except for carefully governed aggregate reporting.

2. Real KSP data integration

Map official KSP schema and access patterns into the prototype architecture. Add validation, data governance, and permission controls before using any real records.

3. Production Catalyst deployment

Move from Development to Production after:

- Data access controls are configured
- Environment variables are reviewed
- Error handling is hardened
- Logs and monitoring are enabled
- Sensitive fallback/demo data is removed or clearly labeled

## Commands Future Agents May Need

Run local Catalyst serve:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" serve --only client,functions:query_assistant --no-open --http 3100
```

Deploy function and client:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" deploy --only functions:query_assistant,client
```

Deploy function only:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" deploy --only functions:query_assistant
```

Build React client:

```powershell
cd crime-assistant-client
npm run build
```

Check Git state:

```powershell
git status --short
git log --oneline --decorate -5
```

## Best Next Step For A Future AI Agent

If asked to continue improving this project, start with:

1. Read this file.
2. Run the four verified live prompts in the deployed app.
3. Add an unsupported-question fallback.
4. Add one new high-value SQL route.
5. Re-run live smoke tests.
6. Update this context document.

The project is already submission-ready as a same-day prototype. Future work should improve breadth, robustness, and presentation without breaking the four verified demo flows.
