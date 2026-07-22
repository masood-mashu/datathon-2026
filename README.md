# KSP Datathon 2026 - Crime Database Query Assistant

Challenge 01 prototype: an intelligent conversational assistant for querying a Karnataka-style FIR crime database on Zoho Catalyst.

Live demo: [Project-Rainfall on Zoho Catalyst](https://project-rainfall-60079554686.development.catalystserverless.in/app/index.html)

## What It Does

This prototype turns natural-language investigation questions into auditable query workflows:

- SQL mode for structured questions such as district counts and case status breakdowns.
- Graph mode for repeat-offender and co-accused network previews.
- RAG mode for retrieving and summarizing `BriefFacts` narratives from `CaseMaster`.
- Audit-first responses showing route, intent, confidence, generated query, execution status, and preview rows.

## Demo Questions

Use these prompts in the live app:

```text
How many cases are there by district in Bengaluru Urban for 2026?
Show status breakdown for 2026
Show network connections for repeat offenders
Summarize the brief facts for recent online fraud cases
```

Expected live behavior:

- District query returns `Bengaluru Urban` with `27` cases.
- Status query returns `Under Investigation`, `Charge Sheeted`, `Closed`, and `Undetected` counts.
- Graph query returns six network edges for repeat-offender preview.
- RAG query returns five ranked `BriefFacts` rows and a concise narrative summary.

## Architecture

```text
React client
  -> Catalyst Advanced I/O function: query_assistant
    -> Query router
      -> SQL aggregation over Catalyst Data Store
      -> Graph preview response
      -> BriefFacts retrieval and summarization
    -> Audit metadata builder
```

## Repository Layout

```text
crime-assistant-client/           React investigation console
functions/query_assistant/        Catalyst Advanced I/O backend
functions/query_assistant/lib/    Router, SQL templates, graph seed, RAG engine
docs/                             Deployment and Data Store setup notes
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

Serve the Catalyst client and function locally:

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

The RAG path reads `CaseMaster.BriefFacts` when available. A packaged fallback corpus remains in the function so the demo is resilient if a fresh Catalyst environment has not yet imported narrative fields.

Import guidance is documented in [docs/DATASTORE_SETUP.md](docs/DATASTORE_SETUP.md).

## Current Status

Submission smoke test completed on July 22, 2026:

- Live endpoint mode verified.
- Demo fallback verified off.
- SQL district query verified.
- SQL status query verified.
- Graph preview verified.
- RAG `BriefFacts` retrieval verified.

## Disclaimer

This project uses synthetic data generated for the datathon prototype. It does not contain real FIR records or real personal data.
