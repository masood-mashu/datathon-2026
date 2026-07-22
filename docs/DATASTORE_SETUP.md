# Data Store Setup

## What The Current Error Means

If the live function returns:

- `No such Table with the given name exists.`

then the Catalyst function is working, but the required Data Store tables have
not been created yet in `Project-Rainfall`.

## Minimum Tables Needed For The Current Demo Queries

For `How many cases are there by district in Bengaluru Urban for 2026?`

- `District`
- `Unit`
- `CaseMaster`

For `Show status breakdown for 2026`

- `CaseStatusMaster`
- `CaseMaster`

For `Show network connections for repeat offenders`

- `CriminalNetworkEdge`

## Recommended Creation Order

Create/import tables in this order to respect foreign keys:

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

## Practical Setup Path For Today

For the fastest prototype, create just the tables needed for the first two SQL
queries:

1. `District`
2. `Unit`
3. `CaseStatusMaster`
4. `CaseMaster`

Then import the matching CSVs from `synthetic_data/`.

## CSV Files Already Available

- `synthetic_data/District.csv`
- `synthetic_data/Unit.csv`
- `synthetic_data/CaseStatusMaster.csv`
- `synthetic_data/CaseMaster.csv`

## After Table Creation

You can import data with the Catalyst CLI pattern:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" ds:import --table "<table_name>" "synthetic_data\<file>.csv"
```

Example:

```powershell
& "C:\Users\Masood\AppData\Roaming\npm\catalyst.cmd" ds:import --table "District" "synthetic_data\District.csv"
```

## Suggested Immediate Goal

Get these two live queries working first:

1. district aggregation
2. status breakdown

Once those pass, add `CriminalNetworkEdge` support for the graph demo.
