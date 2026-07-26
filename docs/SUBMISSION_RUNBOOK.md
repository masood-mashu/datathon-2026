# KSP Datathon Submission Runbook

## Live links

- App: https://project-rainfall-60079554686.development.catalystserverless.in/app/index.html
- Function health: https://project-rainfall-60079554686.development.catalystserverless.in/server/query_assistant/

## What is deployed

- Catalyst Web Client Hosting: React investigation console.
- Catalyst Advanced I/O Function: SQL, relationship-network, and narrative routes.
- Catalyst Data Store: live district, unit, case-status, case-master, and accused co-occurrence graph query paths.
- Catalyst SmartBrowz: server report-generation endpoint at `POST /server/query_assistant/report`.

## Live verification

- `Accused` table exists in Catalyst Data Store with `AccusedMasterID` and `CaseMasterID`.
- Manual seed rows added on 2026-07-26: `(1,1)`, `(2,1)`, `(3,2)`, `(4,2)`, `(5,2)`, `(6,2)`.
- Deployed function smoke test passed for `Show network connections for repeat offenders`.
- Result: `execution.executed = true`, `row_count = 7`, including co-accused edges `A1-A2` for case `1` and six pairwise edges for accused `A3-A6` in case `2`.

## Immediate Catalyst console action (15 minutes)

1. In Catalyst Console, enable **Authentication** for the web client.
2. Create application roles: `Investigator`, `Analyst`, and `Supervisor`.
3. Invite the demo account and sign in once through the deployed app.
4. Retest **Save Catalyst PDF**. The present Development test returns `No such User with the given id exists`, which is expected until an authenticated project user is available to the SDK request.

Until then, the app automatically opens a local browser print-to-PDF fallback so the demo remains usable.

## Data expansion priority (60 to 90 minutes)

Use Catalyst Data Store bulk imports, in this order, after creating the corresponding tables from `schema.sql`:

1. `State`, `District`, `UnitType`, `Unit`, `CaseStatusMaster`
2. `CrimeHead`, `CrimeSubHead`, `CaseCategory`, `GravityOffence`
3. `Employee`, `Court`, `Act`, `Section`
4. `CaseMaster`, `Accused`, `Victim`, `ComplainantDetails`, `ArrestSurrender`, `ChargesheetDetails`, `ActSectionAssociation`

The fastest live-evidence milestone is complete: `Accused` exists with `AccusedMasterID` and `CaseMasterID`, so the criminal-network result now calculates co-accused relationships from Catalyst Data Store. Next add `ArrestSurrender` and `ChargesheetDetails` to enable the investigation-timeline query.

The Catalyst CLI pattern is:

```powershell
catalyst ds:import .\synthetic_data\Accused.csv --table Accused
catalyst ds:import .\synthetic_data\ArrestSurrender.csv --table ArrestSurrender
catalyst ds:import .\synthetic_data\ChargesheetDetails.csv --table ChargesheetDetails
```

Do not import demographic fields into predictive features. Use caste, religion, and related data only for governed aggregate reporting, if required.

## Demo flow (3 minutes)

1. Open the live app and run: `How many cases are there by district in Bengaluru Urban for 2026?`
2. Run: `Show status breakdown for 2026`.
3. Run: `Show network connections for repeat offenders`; point out the interactive relationship diagram and evidence warning.
4. Run: `Summarize the brief facts for recent online fraud cases`.
5. Ask a Kannada core query or use voice input; demonstrate a follow-up such as `What about 2025?`.
6. Choose **Save Catalyst PDF**. If Authentication has not yet been configured, use the print-to-PDF fallback and explain that the SmartBrowz endpoint is ready but awaits authenticated app identity.

## Submission checklist

- [ ] Public GitHub repository URL
- [ ] Catalyst deployed-solution URL above
- [ ] Short demo video showing the six steps above
- [ ] Solution PPT exported as PDF
- [ ] Catalyst Authentication enabled and SmartBrowz PDF retested
- [ ] GitHub README includes architecture, service alignment, synthetic-data disclaimer, and live link
