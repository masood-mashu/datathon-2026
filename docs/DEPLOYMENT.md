# Deployment Runbook

## As of July 22, 2026

This project is linked to the Catalyst project `Project-Rainfall` with:

- Project ID: `46443000000013023`
- Environment: `Development`

## Current Local Layout

- Function source: `functions/query_assistant`
- Client source: `crime-assistant-client`
- Synthetic data: `synthetic_data/*.csv`

## Verified Local Commands

The React client serves locally with:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" serve --only client --no-open --http 3000
```

The client was verified at:

- `http://localhost:3000/app/`

## Important Runtime Note

The function runtime was updated to `node24` in
`functions/query_assistant/catalyst-config.json` so local serve matches the
installed Node.js runtime on this machine.

## Recommended Local Test Flow

1. Start the full local Catalyst stack:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" serve --only client,functions:query_assistant --no-open --http 3000
```

2. Open:

- `http://localhost:3000/app/`

3. First use the UI in demo mode.
4. Then disable demo mode and point the UI at the local function endpoint once
   the serve output shows the function route.

## Recommended Deployment Flow

Deploy both the function and the client:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" deploy --only functions:query_assistant,client
```

## Data Store Import Preparation

The CLI supports bulk import with:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" ds:import --table "<table_name>" "<csv_file>"
```

Because `schema.sql` is relational and the CSV set spans multiple linked tables,
the recommended order is:

1. `State`
2. `District`
3. `UnitType`
4. `Unit`
5. `Rank`
6. `Designation`
7. `Employee`
8. `Court`
9. `CaseCategory`
10. `GravityOffence`
11. `CaseStatusMaster`
12. `CrimeHead`
13. `CrimeSubHead`
14. `Act`
15. `Section`
16. `ReligionMaster`
17. `CasteMaster`
18. `OccupationMaster`
19. `CaseMaster`
20. `ComplainantDetails`
21. `Victim`
22. `Accused`
23. `ActSectionAssociation`
24. `ArrestSurrender`
25. `ChargesheetDetails`

## Immediate Next Steps

1. Re-run local `catalyst serve` after the runtime alignment to verify the function now boots.
2. Confirm the local function URL from the serve output.
3. Switch the React UI from demo mode to the live local endpoint.
4. Deploy the function and client to the Catalyst development environment.
5. Create Data Store tables and import CSVs in dependency order.
