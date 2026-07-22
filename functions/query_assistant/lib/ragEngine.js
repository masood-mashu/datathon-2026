"use strict";

const { ragCorpus } = require("./ragCorpus");

function executeNarrativeRetrieval(queryText, parameters = {}, corpus = ragCorpus) {
  const ranked = corpus
    .map((record) => ({ ...record, score: scoreRecord(record, queryText, parameters) }))
    .filter((record) => record.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return String(right.date).localeCompare(String(left.date));
    });

  const topRecords = ranked.slice(0, parameters.limit || 5);

  return {
    executed: true,
    rowCount: topRecords.length,
    rows: topRecords.map((record) => ({
      CaseNo: record.caseNo,
      CrimeRegisteredDate: record.date,
      District: record.district,
      PoliceStation: record.policeStation,
      Category: record.category,
      RelevanceScore: Number(record.score.toFixed(2)),
      BriefFacts: record.briefFacts,
    })),
    summary: buildSummary(topRecords, parameters, queryText),
    citations: topRecords.map((record) => ({
      case_no: record.caseNo,
      district: record.district,
      date: record.date,
      category: record.category,
    })),
  };
}

function scoreRecord(record, queryText, parameters) {
  const normalizedQuery = normalize(queryText);
  const haystack = normalize(
    [record.briefFacts, record.category, record.district, record.policeStation, record.caseNo].join(" ")
  );

  let score = 0;
  const hasSpecificKeywords = Array.isArray(parameters.keywords) && parameters.keywords.length > 0;
  let matchedKeyword = !hasSpecificKeywords;

  for (const keyword of parameters.keywords || []) {
    if (haystack.includes(normalize(keyword))) {
      score += 3;
      matchedKeyword = true;
    }
  }

  if (!matchedKeyword) {
    return 0;
  }

  if (parameters.year && String(record.date).startsWith(String(parameters.year))) {
    score += 2;
  }

  if (parameters.district && normalize(record.district) === normalize(parameters.district)) {
    score += 3;
  }

  if (parameters.recency === "recent") {
    score += recencyBoost(record.date);
  }

  for (const token of tokenize(normalizedQuery)) {
    if (token.length > 3 && haystack.includes(token)) {
      score += 0.35;
    }
  }

  return score;
}

function buildSummary(records, parameters) {
  if (!records.length) {
    return "No matching brief-facts narratives were retrieved from the packaged prototype corpus.";
  }

  const categoryCounts = countBy(records, "category");
  const districtCounts = countBy(records, "district");
  const latest = [...records].sort((left, right) => String(right.date).localeCompare(String(left.date)))[0];

  const focusLabel = parameters.keywords && parameters.keywords.length
    ? parameters.keywords.join(", ")
    : "the requested pattern";
  const categorySummary = categoryCounts
    .slice(0, 3)
    .map(([name, count]) => `${count} ${name}`)
    .join(", ");
  const districtSummary = districtCounts
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count})`)
    .join(", ");

  return [
    `Retrieved ${records.length} narrative matches for ${focusLabel}.`,
    categorySummary ? `Top themes: ${categorySummary}.` : "",
    districtSummary ? `Most represented districts: ${districtSummary}.` : "",
    latest
      ? `Latest matching case in the retrieved narratives is ${latest.caseNo} from ${latest.district} on ${latest.date}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function countBy(records, field) {
  const counts = new Map();
  for (const record of records) {
    const value = record[field];
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
}

function recencyBoost(dateValue) {
  const diffDays = daysBetween(dateValue, "2026-07-22");
  if (diffDays <= 30) {
    return 3;
  }
  if (diffDays <= 120) {
    return 2;
  }
  if (diffDays <= 365) {
    return 1;
  }
  return 0;
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.abs(Math.round((b - a) / 86400000));
}

function tokenize(value) {
  return normalize(value)
    .split(/\s+/)
    .filter(Boolean);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  executeNarrativeRetrieval,
};
