# Crime Assistant Client

React investigation console for the KSP Datathon 2026 Crime Database Query Assistant.

The client is deployed through Zoho Catalyst and talks to the `query_assistant` Advanced I/O function at:

```text
/server/query_assistant/
```

## Local Scripts

Install dependencies:

```powershell
npm install
```

Run the React app only:

```powershell
npm start
```

Build for Catalyst deployment:

```powershell
npm run build
```

For full local Catalyst testing, run from the repository root:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" serve --only client,functions:query_assistant --no-open --http 3100
```

## Main Screens

- Natural-language investigation question input
- Live/fallback endpoint toggle
- SQL, graph, and RAG sample prompts
- Audit-first response panel with mode, intent, confidence, generated query, execution status, and preview rows

The root [README](../README.md) contains the full project overview and submission details.
