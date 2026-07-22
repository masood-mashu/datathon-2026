const graphSeed = [
  {
    AccusedMasterID_A: "A102",
    AccusedMasterID_B: "A455",
    SharedCaseMasterID: "CM-2026-00045",
    RelationType: "co-accused",
    Weight: 3,
    ClusterLabel: "online-fraud-ring",
  },
  {
    AccusedMasterID_A: "A455",
    AccusedMasterID_B: "A990",
    SharedCaseMasterID: "CM-2026-00063",
    RelationType: "same-act-section",
    Weight: 2,
    ClusterLabel: "online-fraud-ring",
  },
  {
    AccusedMasterID_A: "A102",
    AccusedMasterID_B: "A990",
    SharedCaseMasterID: "CM-2026-00087",
    RelationType: "co-accused",
    Weight: 4,
    ClusterLabel: "repeat-offender-cell",
  },
  {
    AccusedMasterID_A: "A778",
    AccusedMasterID_B: "A221",
    SharedCaseMasterID: "CM-2026-00111",
    RelationType: "same-io",
    Weight: 1,
    ClusterLabel: "property-crime-chain",
  },
  {
    AccusedMasterID_A: "A221",
    AccusedMasterID_B: "A664",
    SharedCaseMasterID: "CM-2026-00138",
    RelationType: "co-accused",
    Weight: 2,
    ClusterLabel: "property-crime-chain",
  },
  {
    AccusedMasterID_A: "A664",
    AccusedMasterID_B: "A778",
    SharedCaseMasterID: "CM-2026-00152",
    RelationType: "same-act-section",
    Weight: 1,
    ClusterLabel: "property-crime-chain",
  },
];

module.exports = {
  graphSeed,
};
