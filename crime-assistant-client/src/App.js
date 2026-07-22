import { useState } from "react";
import "./App.css";
import { buildFallbackResult, starterPrompts } from "./demoData";

const DEFAULT_ENDPOINT = process.env.REACT_APP_QUERY_ENDPOINT || "/server/query_assistant/";
const DEFAULT_MOCK_MODE = (process.env.REACT_APP_USE_DEMO_FALLBACK || "false") === "true";

function App() {
  const [query, setQuery] = useState(starterPrompts[0]);
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [mockMode, setMockMode] = useState(DEFAULT_MOCK_MODE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextResult = mockMode
        ? buildFallbackResult(trimmedQuery)
        : await sendQuery(endpoint, trimmedQuery);

      setResult(nextResult);
      setHistory((current) => [
        {
          query: trimmedQuery,
          mode: nextResult.route?.mode || "unknown",
          executed: nextResult.execution?.executed || false,
        },
        ...current,
      ].slice(0, 6));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">KSP Datathon 2026</p>
          <h1>Crime Database Query Assistant</h1>
          <p className="hero-text">
            A same-day prototype for structured investigation queries, network previews,
            and narrative retrieval workflows on Zoho Catalyst.
          </p>
        </div>

        <div className="hero-stats">
          <StatCard label="Project" value="Project-Rainfall" />
          <StatCard label="Backend" value="Catalyst Advanced I/O" />
          <StatCard label="Modes" value="SQL + Graph + RAG" />
        </div>
      </section>

      <main className="workspace">
        <section className="query-panel">
          <div className="panel-header">
            <h2>Investigation Console</h2>
            <span className={`status-pill ${mockMode ? "mock" : "live"}`}>
              {mockMode ? "Demo Mode" : "Live Endpoint"}
            </span>
          </div>

          <form className="query-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="query-input">
              Ask an investigation question
            </label>
            <textarea
              id="query-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask about district counts, case status, hotspots, or networks"
              rows={5}
            />

            <div className="form-grid">
              <label className="field-group" htmlFor="endpoint-input">
                <span>Function endpoint</span>
                <input
                  id="endpoint-input"
                  type="text"
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  disabled={mockMode}
                />
              </label>

              <label className="toggle-card" htmlFor="mock-toggle">
                <input
                  id="mock-toggle"
                  type="checkbox"
                  checked={mockMode}
                  onChange={(event) => setMockMode(event.target.checked)}
                />
                <div>
                  <strong>Use demo fallback</strong>
                  <p>Turn this off after the Catalyst function is reachable.</p>
                </div>
              </label>
            </div>

            <div className="prompt-list">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="prompt-chip"
                  type="button"
                  onClick={() => setQuery(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? "Running query..." : "Run query"}
            </button>
          </form>

          {error ? <p className="error-banner">{error}</p> : null}
        </section>

        <section className="result-panel">
          <div className="panel-header">
            <h2>Response Preview</h2>
            <span className="subtle-label">Audit-first output</span>
          </div>

          {result ? <ResultView result={result} /> : <EmptyState />}
        </section>
      </main>

      <section className="history-strip">
        <div className="panel-header">
          <h2>Recent Questions</h2>
          <span className="subtle-label">Latest 6 interactions</span>
        </div>

        <div className="history-grid">
          {history.length ? (
            history.map((item, index) => (
              <article className="history-card" key={`${item.query}-${index}`}>
                <p>{item.query}</p>
                <div className="history-meta">
                  <span>{item.mode}</span>
                  <span>{item.executed ? "executed" : "planned"}</span>
                </div>
              </article>
            ))
          ) : (
            <article className="history-card empty">
              <p>No queries yet. Run one of the sample prompts to populate the demo trail.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <h3>Ready for the first query</h3>
      <p>
        The assistant will show route selection, execution status, preview rows, and
        explainability metadata here.
      </p>
    </div>
  );
}

function ResultView({ result }) {
  const rows = Array.isArray(result.preview_rows) ? result.preview_rows : [];

  return (
    <div className="result-stack">
      <div className="result-summary">
        <div>
          <span className="kicker">Mode</span>
          <strong>{result.route?.mode || "unknown"}</strong>
        </div>
        <div>
          <span className="kicker">Intent</span>
          <strong>{result.route?.intent || "unknown"}</strong>
        </div>
        <div>
          <span className="kicker">Confidence</span>
          <strong>{formatConfidence(result.route?.confidence)}</strong>
        </div>
      </div>

      <article className="result-card">
        <h3>Route Explanation</h3>
        <p>{result.route?.explanation || result.message}</p>
      </article>

      {result.summary ? (
        <article className="result-card narrative">
          <h3>Prototype Summary</h3>
          <p>{result.summary}</p>
        </article>
      ) : null}

      <article className="result-card">
        <h3>Execution Status</h3>
        <p>
          {result.execution?.executed
            ? `Executed successfully with ${result.execution.row_count || 0} rows returned.`
            : result.execution?.reason || "Execution is pending."}
        </p>
        {result.execution?.setup_hint ? (
          <div className="setup-hint">
            <strong>{result.execution.setup_hint.problem}</strong>
            <p>{result.execution.setup_hint.next_step}</p>
            <p>
              Required tables: {result.execution.setup_hint.required_tables.join(", ")}
            </p>
          </div>
        ) : null}
      </article>

      <article className="result-card code-card">
        <h3>Generated Query</h3>
        <pre>{result.route?.zcql || "No query generated for this route yet."}</pre>
      </article>

      <article className="result-card">
        <h3>Preview Rows</h3>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {Object.keys(rows[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex}>{String(value)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No preview rows yet for this mode.</p>
        )}
      </article>
    </div>
  );
}

function formatConfidence(confidence) {
  if (typeof confidence !== "number") {
    return "n/a";
  }
  return `${Math.round(confidence * 100)}%`;
}

async function sendQuery(endpoint, query) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      role: "investigator",
      session_id: "react-demo",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Query request failed");
  }
  return payload;
}

export default App;
