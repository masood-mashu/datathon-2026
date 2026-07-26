# KSP Datathon 2026 - Crime Database Query Assistant

Challenge 01 prototype: an intelligent conversational assistant for querying a Karnataka-style FIR crime database on Zoho Catalyst.

Live demo: [Project-Rainfall on Zoho Catalyst](https://project-rainfall-60079554686.development.catalystserverless.in/app/index.html)

## What It Does

This prototype turns natural-language investigation questions into auditable query workflows:

- SQL mode for structured questions such as district counts and case status breakdowns.
- Graph mode for repeat-offender and co-accused networks calculated from live Catalyst Data Store rows.
- Decision-support mode for evidence-linked investigation timelines.
- RAG mode for retrieving and summarizing `BriefFacts` narratives from `CaseMaster`.
- Audit-first responses showing route, intent, confidence, generated query, execution status, and preview rows.

## Demo Questions

Use these prompts in the live app:

```text
How many cases are there by district in Bengaluru Urban for 2026?
Show status breakdown for 2026
Show network connections for repeat offenders
Show investigation timeline for cases
Summarize the brief facts for recent online fraud cases
```

Expected live behavior:

- District query returns `Bengaluru Urban` with `27` cases.
- Status query returns `Under Investigation`, `Charge Sheeted`, `Closed`, and `Undetected` counts.
- Graph query returns seven live co-accused network edges from Catalyst Data Store.
- Timeline query returns investigation events after the pending function patch is deployed.
- RAG query returns five ranked `BriefFacts` rows and a concise narrative summary.

## Architecture

```text
React client
  -> Catalyst Advanced I/O function: query_assistant
    -> Query router
      -> SQL aggregation over Catalyst Data Store
      -> Graph relationship analysis over Accused co-occurrence rows
      -> Investigation timeline builder
      -> BriefFacts retrieval and summarization
    -> Audit metadata builder
```

## Repository Layout

```text
crime-assistant-client/           React investigation console
functions/query_assistant/        Catalyst Advanced I/O backend
functions/query_assistant/lib/    Router, SQL templates, graph seed, RAG engine
docs/PROJECT_CONTEXT.md           Full handoff context and roadmap
schema.sql                        FIR-style relational schema
generate_data.py                  Synthetic data generator
synthetic_data/                   Generated synthetic CSV dataset
work/imports/                     Trimmed/import-ready Catalyst CSVs
```

For future contributors or AI agents, read [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) first. It records the current purpose, implemented flows, live verification results, known limits, and upgrade roadmap.

## Tech Stack

- Zoho Catalyst
- Catalyst Advanced I/O Functions
- Catalyst Data Store and ZCQL
- React
- Node.js

## Local Development

Install dependencies:

```powershell
cd crime-assistant-client
npm install

cd ..\functions\query_assistant
npm install
```

Run the React UI locally against the deployed Catalyst backend:

```powershell
cd D:\hackathon\datathon\crime-assistant-client
$env:PORT = "3002"
$env:REACT_APP_QUERY_ENDPOINT = "https://project-rainfall-60079554686.development.catalystserverless.in/server/query_assistant/"
npm start
```

Local UI:

```text
http://localhost:3002
```

Serve the Catalyst client and function locally, when Catalyst CLI permissions are available:

```powershell
cd D:\hackathon\datathon
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" serve --only client,functions:query_assistant --no-open --http 3100
```

Local URLs:

```text
Client:   http://localhost:3100/app/
Function: http://localhost:3100/server/query_assistant/
```

## Deployment

Deploy both client and function:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" deploy --only functions:query_assistant,client
```

Deploy only the function:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" deploy --only functions:query_assistant
```

Deploy only the client:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" deploy --only client
```

## Data Store Notes

The same-day prototype uses a minimal Catalyst Data Store setup:

- `District`
- `Unit`
- `CaseStatusMaster`
- `CaseMaster`
- `Accused`
- `ArrestSurrender`
- `ChargesheetDetails`

The RAG path reads `CaseMaster.BriefFacts` when available. A packaged fallback corpus remains in the function so the demo is resilient if a fresh Catalyst environment has not yet imported narrative fields.

Live graph verification now uses `Accused(AccusedMasterID, CaseMasterID)` rows seeded in Catalyst. Timeline tables and seed rows also exist; the local backend patch in `functions/query_assistant/index.js` must be deployed before the live timeline endpoint passes against the minimal `CaseMaster` schema.

Import guidance and current setup notes are documented in [docs/SUBMISSION_RUNBOOK.md](docs/SUBMISSION_RUNBOOK.md).

## Current Status

Latest smoke tests on July 26, 2026:

- Live endpoint mode verified.
- Demo fallback verified off.
- SQL district query verified.
- SQL status query verified.
- Live graph query verified: `execution.executed = true`, `row_count = 7`.
- Timeline Data Store tables and seed rows created.
- Timeline code patch is syntax-checked locally and pending Catalyst function deployment.
- RAG `BriefFacts` retrieval verified.
- Local React UI verified at `http://localhost:3002` with the deployed Catalyst backend.

## Challenge Coverage Audit (July 26, 2026)

| Required capability | Current coverage | Status |
| --- | --- | --- |
| Conversational FIR, status, network, and narrative queries | SQL, graph, and RAG routes | Partial |
| English, Kannada, conversation context, and voice | English plus core Kannada intent normalization, follow-ups, and browser speech input | Partial |
| Local PDF conversation history | SmartBrowz PDF endpoint implemented; browser print-to-PDF fallback works until Catalyst Authentication is configured | Partial |
| Criminal network analysis | Live co-accused graph from Catalyst `Accused` table plus interactive relationship visualization | Partial |
| Trends, hotspots, and clusters | District/status aggregation; no spatial hotspot or cluster model | Partial |
| Sociological and behavioral insights | Schema has demographic fields; governed aggregate analysis is not built | Not implemented |
| Offender profiling and risk scoring | Repeat-offender preview only | Not implemented |
| Investigator decision support | Narrative summaries, timeline route, and evidence/audit metadata; live timeline awaiting function redeploy | Partial |
| Financial link analysis | No transaction data model or workflow | Not implemented |
| Forecasting and early warning | No forecasting model or alert service | Not implemented |
| Explainability and evidence trail | Route explanation, query plan, citations, and audit payload | Partial |
| Enforced RBAC, persistent audit, and governance | Role is captured in requests, but no identity enforcement or durable audit store | Not implemented |

The upgrade path should next prioritize deploying the pending timeline patch, full data import, authenticated role enforcement, persistent audit records, hotspot/trend templates, and carefully governed aggregate analytics before adding predictive features.

### Catalyst Service Alignment

The deployed prototype uses Catalyst Web Client Hosting, Serverless Functions, and Data Store. Conversation reports first use SmartBrowz PDF generation through the Node SDK and fall back to the browser print dialog in unauthenticated Development environments. The next deployment milestone is to enable Catalyst Authentication and assign application roles; this is required for the SmartBrowz request identity and the UI role selector must not be treated as access control until that is done.

## Disclaimer

This project uses synthetic data generated for the datathon prototype. It does not contain real FIR records or real personal data.
