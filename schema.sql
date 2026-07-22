-- ============================================================
-- KSP FIR System — Data Store Schema
-- Mirrors the official ER diagram provided by Hack2skill/KSP.
-- Written as portable MySQL-flavoured DDL. Catalyst Data Store's
-- console/API table-create accepts this shape directly (INT ->
-- BIGINT autonumber where PK, VARCHAR/TEXT/DATE/DATETIME/DECIMAL
-- map 1:1). Import order below respects FK dependencies.
-- ============================================================

-- ---------- Lookup / master tables (no FK deps) ----------

CREATE TABLE State (
    StateID INT PRIMARY KEY AUTO_INCREMENT,
    StateName VARCHAR(100) NOT NULL,
    NationalityID INT,
    Active TINYINT DEFAULT 1
);

CREATE TABLE District (
    DistrictID INT PRIMARY KEY AUTO_INCREMENT,
    DistrictName VARCHAR(100) NOT NULL,
    StateID INT NOT NULL,
    Active TINYINT DEFAULT 1,
    FOREIGN KEY (StateID) REFERENCES State(StateID)
);

CREATE TABLE UnitType (
    UnitTypeID INT PRIMARY KEY AUTO_INCREMENT,
    UnitTypeName VARCHAR(100) NOT NULL,
    CityDistState VARCHAR(20),
    Hierarchy INT,
    Active TINYINT DEFAULT 1
);

CREATE TABLE Unit (
    UnitID INT PRIMARY KEY AUTO_INCREMENT,
    UnitName VARCHAR(150) NOT NULL,
    TypeID INT,
    ParentUnit INT,
    NationalityID INT,
    StateID INT,
    DistrictID INT,
    Active TINYINT DEFAULT 1,
    FOREIGN KEY (TypeID) REFERENCES UnitType(UnitTypeID),
    FOREIGN KEY (StateID) REFERENCES State(StateID),
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (ParentUnit) REFERENCES Unit(UnitID)
);

CREATE TABLE Rank (
    RankID INT PRIMARY KEY AUTO_INCREMENT,
    RankName VARCHAR(100) NOT NULL,
    Hierarchy INT,
    Active TINYINT DEFAULT 1
);

CREATE TABLE Designation (
    DesignationID INT PRIMARY KEY AUTO_INCREMENT,
    DesignationName VARCHAR(100) NOT NULL,
    Active TINYINT DEFAULT 1,
    SortOrder INT
);

CREATE TABLE Employee (
    EmployeeID INT PRIMARY KEY AUTO_INCREMENT,
    DistrictID INT,
    UnitID INT,
    RankID INT,
    DesignationID INT,
    KGID VARCHAR(30) UNIQUE,
    FirstName VARCHAR(100),
    EmployeeDOB DATE,
    GenderID INT,
    BloodGroupID INT,
    PhysicallyChallenged TINYINT DEFAULT 0,
    AppointmentDate DATE,
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (UnitID) REFERENCES Unit(UnitID),
    FOREIGN KEY (RankID) REFERENCES Rank(RankID),
    FOREIGN KEY (DesignationID) REFERENCES Designation(DesignationID)
);

CREATE TABLE Court (
    CourtID INT PRIMARY KEY AUTO_INCREMENT,
    CourtName VARCHAR(150) NOT NULL,
    DistrictID INT,
    StateID INT,
    Active TINYINT DEFAULT 1,
    FOREIGN KEY (DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY (StateID) REFERENCES State(StateID)
);

CREATE TABLE CaseCategory (
    CaseCategoryID INT PRIMARY KEY AUTO_INCREMENT,
    LookupValue VARCHAR(50) NOT NULL  -- FIR, UDR, PAR, Zero FIR
);

CREATE TABLE GravityOffence (
    GravityOffenceID INT PRIMARY KEY AUTO_INCREMENT,
    LookupValue VARCHAR(50) NOT NULL  -- Heinous / Non-Heinous
);

CREATE TABLE CaseStatusMaster (
    CaseStatusID INT PRIMARY KEY AUTO_INCREMENT,
    CaseStatusName VARCHAR(80) NOT NULL
);

CREATE TABLE CrimeHead (
    CrimeHeadID INT PRIMARY KEY AUTO_INCREMENT,
    CrimeGroupName VARCHAR(150) NOT NULL,
    Active TINYINT DEFAULT 1
);

CREATE TABLE CrimeSubHead (
    CrimeSubHeadID INT PRIMARY KEY AUTO_INCREMENT,
    CrimeHeadID INT NOT NULL,
    CrimeHeadName VARCHAR(150) NOT NULL,  -- e.g. Murder, Robbery
    SeqID INT,
    FOREIGN KEY (CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID)
);

CREATE TABLE Act (
    ActCode VARCHAR(20) PRIMARY KEY,
    ActDescription VARCHAR(200) NOT NULL,
    ShortName VARCHAR(50),
    Active TINYINT DEFAULT 1
);

CREATE TABLE Section (
    ActCode VARCHAR(20) NOT NULL,
    SectionCode VARCHAR(20) NOT NULL,
    SectionDescription VARCHAR(255),
    Active TINYINT DEFAULT 1,
    PRIMARY KEY (ActCode, SectionCode),
    FOREIGN KEY (ActCode) REFERENCES Act(ActCode)
);

CREATE TABLE CrimeHeadActSection (
    CrimeHeadID INT NOT NULL,
    ActCode VARCHAR(20) NOT NULL,
    SectionCode VARCHAR(20) NOT NULL,
    PRIMARY KEY (CrimeHeadID, ActCode, SectionCode),
    FOREIGN KEY (CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY (ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
);

CREATE TABLE ReligionMaster (
    ReligionID INT PRIMARY KEY AUTO_INCREMENT,
    ReligionName VARCHAR(50) NOT NULL
);

CREATE TABLE CasteMaster (
    caste_master_id INT PRIMARY KEY AUTO_INCREMENT,
    caste_master_name VARCHAR(80) NOT NULL
);

CREATE TABLE OccupationMaster (
    OccupationID INT PRIMARY KEY AUTO_INCREMENT,
    OccupationName VARCHAR(100) NOT NULL
);

-- ---------- Core transactional tables ----------

CREATE TABLE CaseMaster (
    CaseMasterID INT PRIMARY KEY AUTO_INCREMENT,
    CrimeNo VARCHAR(20) NOT NULL,   -- 1+4+4+4+5 digit structured code
    CaseNo VARCHAR(15) NOT NULL,    -- YYYY + 5-digit serial
    CrimeRegisteredDate DATE NOT NULL,
    PolicePersonID INT,
    PoliceStationID INT NOT NULL,
    CaseCategoryID INT,
    GravityOffenceID INT,
    CrimeMajorHeadID INT,
    CrimeMinorHeadID INT,
    CaseStatusID INT,
    CourtID INT,
    IncidentFromDate DATETIME,
    IncidentToDate DATETIME,
    InfoReceivedPSDate DATETIME,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    BriefFacts TEXT,
    FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY (CaseCategoryID) REFERENCES CaseCategory(CaseCategoryID),
    FOREIGN KEY (GravityOffenceID) REFERENCES GravityOffence(GravityOffenceID),
    FOREIGN KEY (CrimeMajorHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY (CrimeMinorHeadID) REFERENCES CrimeSubHead(CrimeSubHeadID),
    FOREIGN KEY (CaseStatusID) REFERENCES CaseStatusMaster(CaseStatusID),
    FOREIGN KEY (CourtID) REFERENCES Court(CourtID)
);

CREATE TABLE ComplainantDetails (
    ComplainantID INT PRIMARY KEY AUTO_INCREMENT,
    CaseMasterID INT NOT NULL,
    ComplainantName VARCHAR(150),
    AgeYear INT,
    OccupationID INT,
    ReligionID INT,
    CasteID INT,
    GenderID INT,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (OccupationID) REFERENCES OccupationMaster(OccupationID),
    FOREIGN KEY (ReligionID) REFERENCES ReligionMaster(ReligionID),
    FOREIGN KEY (CasteID) REFERENCES CasteMaster(caste_master_id)
);

CREATE TABLE ActSectionAssociation (
    CaseMasterID INT NOT NULL,
    ActID VARCHAR(20) NOT NULL,
    SectionID VARCHAR(20) NOT NULL,
    ActOrderID INT,
    SectionOrderID INT,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (ActID) REFERENCES Act(ActCode),
    FOREIGN KEY (ActID, SectionID) REFERENCES Section(ActCode, SectionCode)
);

CREATE TABLE Victim (
    VictimMasterID INT PRIMARY KEY AUTO_INCREMENT,
    CaseMasterID INT NOT NULL,
    VictimName VARCHAR(150),
    AgeYear INT,
    GenderID VARCHAR(5),
    VictimPolice TINYINT DEFAULT 0,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

CREATE TABLE Accused (
    AccusedMasterID INT PRIMARY KEY AUTO_INCREMENT,
    CaseMasterID INT NOT NULL,
    AccusedName VARCHAR(150),
    AgeYear INT,
    GenderID VARCHAR(5),
    PersonID VARCHAR(10),   -- A1, A2, A3...
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

CREATE TABLE ArrestSurrender (
    ArrestSurrenderID INT PRIMARY KEY AUTO_INCREMENT,
    CaseMasterID INT NOT NULL,
    ArrestSurrenderTypeID INT,   -- 1=arrest, 2=surrender
    ArrestSurrenderDate DATE,
    ArrestSurrenderStateId INT,
    ArrestSurrenderDistrictId INT,
    PoliceStationID INT,
    IOID INT,
    CourtID INT,
    AccusedMasterID INT,
    IsAccused TINYINT DEFAULT 1,
    IsComplainantAccused TINYINT DEFAULT 0,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (ArrestSurrenderStateId) REFERENCES State(StateID),
    FOREIGN KEY (ArrestSurrenderDistrictId) REFERENCES District(DistrictID),
    FOREIGN KEY (PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY (IOID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY (CourtID) REFERENCES Court(CourtID),
    FOREIGN KEY (AccusedMasterID) REFERENCES Accused(AccusedMasterID)
);

CREATE TABLE inv_arrestsurrenderaccused (
    ArrestSurrenderID INT NOT NULL,
    AccusedMasterID INT NOT NULL,
    PRIMARY KEY (ArrestSurrenderID, AccusedMasterID),
    FOREIGN KEY (ArrestSurrenderID) REFERENCES ArrestSurrender(ArrestSurrenderID),
    FOREIGN KEY (AccusedMasterID) REFERENCES Accused(AccusedMasterID)
);

CREATE TABLE Inv_OccuranceTime (
    CaseMasterID INT PRIMARY KEY,
    OccuranceFromDate DATETIME,
    OccuranceToDate DATETIME,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

CREATE TABLE ChargesheetDetails (
    CSID INT PRIMARY KEY AUTO_INCREMENT,
    CaseMasterID INT NOT NULL,
    csdate DATETIME,
    cstype CHAR(1),  -- A=Chargesheet, B=False Case, C=Undetected
    PolicePersonID INT,
    FOREIGN KEY (CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY (PolicePersonID) REFERENCES Employee(EmployeeID)
);

-- ---------- Derived table for the conversational-AI layer ----------
-- Not part of the official schema — precomputed by a Catalyst Cron job
-- to power the criminal-network visualization without recomputing
-- graph edges on every chat query.
CREATE TABLE CriminalNetworkEdge (
    EdgeID INT PRIMARY KEY AUTO_INCREMENT,
    AccusedMasterID_A INT NOT NULL,
    AccusedMasterID_B INT NOT NULL,
    SharedCaseMasterID INT NOT NULL,
    RelationType VARCHAR(30),  -- 'co-accused', 'same-IO', 'same-act-section'
    FOREIGN KEY (AccusedMasterID_A) REFERENCES Accused(AccusedMasterID),
    FOREIGN KEY (AccusedMasterID_B) REFERENCES Accused(AccusedMasterID),
    FOREIGN KEY (SharedCaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);
