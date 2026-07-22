export const starterPrompts = [
  "How many cases are there by district in Bengaluru Urban for 2026?",
  "Show status breakdown for 2026",
  "Show network connections for repeat offenders",
  "Summarize the brief facts for recent online fraud cases",
];

export function buildFallbackResult(query) {
  const lowered = query.toLowerCase();

  if (lowered.includes("network")) {
    return {
      message: "Demo fallback result",
      route: {
        mode: "graph",
        intent: "criminal_network_analysis",
        explanation: "Graph preview route selected for suspected repeat offender analysis.",
        confidence: 0.82,
      },
      execution: {
        executed: false,
        reason: "Function endpoint not reachable yet. Showing demo fallback data.",
        row_count: 3,
      },
      preview_rows: [
        { link: "A102 <-> A455", relation: "co-accused", shared_case: "CM-2026-00045" },
        { link: "A455 <-> A990", relation: "same-act-section", shared_case: "CM-2026-00063" },
        { link: "A102 <-> A990", relation: "co-accused", shared_case: "CM-2026-00087" },
      ],
    };
  }

  if (lowered.includes("status") || lowered.includes("chargesheet")) {
    return {
      message: "Demo fallback result",
      route: {
        mode: "sql",
        intent: "case_status_breakdown",
        explanation: "Status summary route selected.",
        confidence: 0.86,
      },
      execution: {
        executed: false,
        reason: "Function endpoint not reachable yet. Showing demo fallback data.",
        row_count: 4,
      },
      preview_rows: [
        { status: "Under Investigation", cases: 148 },
        { status: "Charge Sheeted", cases: 96 },
        { status: "Closed", cases: 71 },
        { status: "Undetected", cases: 18 },
      ],
    };
  }

  if (lowered.includes("brief facts") || lowered.includes("summarize")) {
    return {
      message: "Demo fallback result",
      route: {
        mode: "rag",
        intent: "narrative_retrieval",
        explanation: "RAG-style retrieval route selected.",
        confidence: 0.7,
      },
      execution: {
        executed: false,
        reason: "RAG pipeline is not wired yet. Showing prototype narrative summary.",
        row_count: 0,
      },
      preview_rows: [],
      summary:
        "Recent online fraud complaints cluster around impersonation calls, payment link scams, and wallet takeover attempts. Most cases reference remote contact channels and limited face-to-face evidence.",
    };
  }

  return {
    message: "Demo fallback result",
    route: {
      mode: "sql",
      intent: "structured_aggregation",
      explanation: "District aggregation route selected.",
      confidence: 0.88,
    },
    execution: {
      executed: false,
      reason: "Function endpoint not reachable yet. Showing demo fallback data.",
      row_count: 3,
    },
    preview_rows: [
      { district: "Bengaluru Urban", cases: 182 },
      { district: "Mysuru", cases: 97 },
      { district: "Belagavi", cases: 76 },
    ],
  };
}
