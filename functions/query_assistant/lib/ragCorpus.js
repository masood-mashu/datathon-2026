"use strict";

const ragCorpus = [
  {
    caseMasterId: "7",
    caseNo: "202400007",
    date: "2024-09-25",
    district: "Hassan",
    policeStation: "Hassan PS 16",
    category: "online fraud",
    briefFacts:
      "Case registered at Hassan PS 16 regarding online fraud. Investigation ongoing under IO Jasmit.",
  },
  {
    caseMasterId: "16",
    caseNo: "202300016",
    date: "2023-10-24",
    district: "Vijayapura",
    policeStation: "Vijayapura PS 6",
    category: "identity theft",
    briefFacts:
      "Case registered at Vijayapura PS 6 regarding identity theft. Investigation ongoing under IO Devansh.",
  },
  {
    caseMasterId: "22",
    caseNo: "202300022",
    date: "2023-04-21",
    district: "Bengaluru Urban",
    policeStation: "Bengaluru Urban PS 88",
    category: "online fraud",
    briefFacts:
      "Case registered at Bengaluru Urban PS 88 regarding online fraud. Investigation ongoing under IO Gabriel.",
  },
  {
    caseMasterId: "29",
    caseNo: "202600029",
    date: "2026-03-25",
    district: "Vijayapura",
    policeStation: "Vijayapura PS 13",
    category: "cheating",
    briefFacts:
      "Case registered at Vijayapura PS 13 regarding cheating. Investigation ongoing under IO Aditya.",
  },
  {
    caseMasterId: "36",
    caseNo: "202500036",
    date: "2025-11-05",
    district: "Belagavi",
    policeStation: "Belagavi PS 12",
    category: "cheating",
    briefFacts:
      "Case registered at Belagavi PS 12 regarding cheating. Investigation ongoing under IO Chatura.",
  },
  {
    caseMasterId: "47",
    caseNo: "202500047",
    date: "2025-11-05",
    district: "Davanagere",
    policeStation: "Davanagere PS 25",
    category: "online fraud",
    briefFacts:
      "Case registered at Davanagere PS 25 regarding online fraud. Investigation ongoing under IO David.",
  },
  {
    caseMasterId: "59",
    caseNo: "202400059",
    date: "2024-01-08",
    district: "Kalaburagi",
    policeStation: "Kalaburagi PS 34",
    category: "cheating",
    briefFacts:
      "Case registered at Kalaburagi PS 34 regarding cheating. Investigation ongoing under IO Meghana.",
  },
  {
    caseMasterId: "69",
    caseNo: "202300069",
    date: "2023-03-21",
    district: "Bengaluru Urban",
    policeStation: "Bengaluru Urban PS 80",
    category: "identity theft",
    briefFacts:
      "Case registered at Bengaluru Urban PS 80 regarding identity theft. Investigation ongoing under IO Megha.",
  },
  {
    caseMasterId: "74",
    caseNo: "202500074",
    date: "2025-06-13",
    district: "Kalaburagi",
    policeStation: "Kalaburagi PS 27",
    category: "identity theft",
    briefFacts:
      "Case registered at Kalaburagi PS 27 regarding identity theft. Investigation ongoing under IO Ekani.",
  },
  {
    caseMasterId: "75",
    caseNo: "202600075",
    date: "2026-07-15",
    district: "Ballari",
    policeStation: "Ballari PS 28",
    category: "identity theft",
    briefFacts:
      "Case registered at Ballari PS 28 regarding identity theft. Investigation ongoing under IO Abhimanyu.",
  },
  {
    caseMasterId: "78",
    caseNo: "202500078",
    date: "2025-09-25",
    district: "Chikkaballapur",
    policeStation: "Chikkaballapur PS 18",
    category: "online fraud",
    briefFacts:
      "Case registered at Chikkaballapur PS 18 regarding online fraud. Investigation ongoing under IO Charles.",
  },
  {
    caseMasterId: "80",
    caseNo: "202600080",
    date: "2026-04-16",
    district: "Bengaluru Urban",
    policeStation: "Bengaluru Urban PS 60",
    category: "online fraud",
    briefFacts:
      "Case registered at Bengaluru Urban PS 60 regarding online fraud. Investigation ongoing under IO Vansha.",
  },
  {
    caseMasterId: "87",
    caseNo: "202500087",
    date: "2025-07-02",
    district: "Gadag",
    policeStation: "Gadag PS 13",
    category: "identity theft",
    briefFacts:
      "Case registered at Gadag PS 13 regarding identity theft. Investigation ongoing under IO Anmol.",
  },
  {
    caseMasterId: "90",
    caseNo: "202300090",
    date: "2023-01-25",
    district: "Haveri",
    policeStation: "Haveri PS 21",
    category: "online fraud",
    briefFacts:
      "Case registered at Haveri PS 21 regarding online fraud. Investigation ongoing under IO Rajata.",
  },
  {
    caseMasterId: "94",
    caseNo: "202400094",
    date: "2024-07-19",
    district: "Udupi",
    policeStation: "Udupi PS 9",
    category: "cheating",
    briefFacts:
      "Case registered at Udupi PS 9 regarding cheating. Investigation ongoing under IO Rachit.",
  },
  {
    caseMasterId: "1325",
    caseNo: "202601325",
    date: "2026-02-28",
    district: "Vijayapura",
    policeStation: "Vijayapura PS 3",
    category: "identity theft",
    briefFacts:
      "Case registered at Vijayapura PS 3 regarding identity theft. Investigation ongoing under IO Laksh.",
  },
  {
    caseMasterId: "1429",
    caseNo: "202501429",
    date: "2025-11-06",
    district: "Ballari",
    policeStation: "Ballari PS 31",
    category: "online fraud",
    briefFacts:
      "Case registered at Ballari PS 31 regarding online fraud. Investigation ongoing under IO Nathaniel.",
  },
  {
    caseMasterId: "1748",
    caseNo: "202501748",
    date: "2025-04-11",
    district: "Ramanagara",
    policeStation: "Ramanagara PS 15",
    category: "criminal breach of trust",
    briefFacts:
      "Case registered at Ramanagara PS 15 regarding criminal breach of trust. Investigation ongoing under IO Omisha.",
  },
  {
    caseMasterId: "2375",
    caseNo: "202402375",
    date: "2024-01-15",
    district: "Bengaluru Urban",
    policeStation: "Bengaluru Urban PS 16",
    category: "identity theft",
    briefFacts:
      "Case registered at Bengaluru Urban PS 16 regarding identity theft. Investigation ongoing under IO Zarna.",
  },
  {
    caseMasterId: "2786",
    caseNo: "202302786",
    date: "2023-03-02",
    district: "Dakshina Kannada",
    policeStation: "Dakshina Kannada PS 4",
    category: "cheating",
    briefFacts:
      "Case registered at Dakshina Kannada PS 4 regarding cheating. Investigation ongoing under IO Banjeet.",
  },
];

module.exports = {
  ragCorpus,
};
