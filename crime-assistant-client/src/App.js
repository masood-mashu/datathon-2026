import { useRef, useState } from "react";
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
  const [role, setRole] = useState("investigator");
  const [language, setLanguage] = useState("en-IN");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

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
        : await sendQuery(endpoint, trimmedQuery, role, history);

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

  function toggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not available in this browser. Please use Chrome or Edge.");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => setQuery(event.results[0][0].transcript);
    recognition.onerror = () => setError("Voice transcription could not be completed. Please try again.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">KSP Datathon 2026</p>
          <h1>{language === "kn-IN" ? "ಅಪರಾಧ ಡೇಟಾಬೇಸ್ ಸಹಾಯಕ" : "Crime Intelligence Assistant"}</h1>
          <p className="hero-text">Conversational, evidence-led crime intelligence for investigators, analysts, and supervisors.</p>
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
              {language === "kn-IN" ? "ತನಿಖಾ ಪ್ರಶ್ನೆ ಕೇಳಿ" : "Ask an investigation question"}
            </label>
            <textarea
              id="query-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={language === "kn-IN" ? "ಜಿಲ್ಲೆ, ಸ್ಥಿತಿ, ಜಾಲ ಅಥವಾ ಪ್ರಕರಣದ ಬಗ್ಗೆ ಕೇಳಿ" : "Ask about district counts, case status, hotspots, or networks"}
              rows={5}
            />

            <div className="form-grid">
              <label className="field-group" htmlFor="role-input">
                <span>Active role</span>
                <select id="role-input" value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="investigator">Investigator</option>
                  <option value="analyst">Analyst</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </label>
              <label className="field-group" htmlFor="language-input">
                <span>Voice / input language</span>
                <select id="language-input" value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="en-IN">English</option>
                  <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                </select>
              </label>
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

            <p className="context-note">Follow-ups such as “What about 2025?” retain the previous query context. Kannada support currently recognizes core district, status, network, and narrative terms.</p>

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

            <div className="action-row">
              <button className="voice-button" type="button" onClick={toggleVoiceInput}>{listening ? "Stop listening" : "🎙 Voice input"}</button>
              <button className="submit-button" type="submit" disabled={loading}>{loading ? "Running query..." : "Run query"}</button>
            </div>
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
          <button className="export-button" type="button" disabled={!history.length || mockMode} onClick={() => exportConversation(endpoint, history, result, setError)}>Save Catalyst PDF</button>
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

      {result.route?.mode === "graph" && rows.length ? <NetworkPreview rows={rows} /> : null}

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

function NetworkPreview({ rows }) {
  const nodeIds = [...new Set(rows.flatMap((row) => [row.Source || row.link?.split(" <-> ")[0], row.Target || row.link?.split(" <-> ")[1]]).filter(Boolean))];
  const points = nodeIds.map((id, index) => {
    const angle = (Math.PI * 2 * index) / nodeIds.length - Math.PI / 2;
    return { id, x: 150 + 112 * Math.cos(angle), y: 150 + 112 * Math.sin(angle) };
  });
  const byId = new Map(points.map((point) => [point.id, point]));
  return <article className="result-card network-card"><h3>Relationship Network</h3><svg viewBox="0 0 300 300" role="img" aria-label="Criminal relationship network">
    {rows.map((row, index) => { const a = byId.get(row.Source || row.link?.split(" <-> ")[0]); const b = byId.get(row.Target || row.link?.split(" <-> ")[1]); return a && b ? <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="network-edge" /> : null; })}
    {points.map((point) => <g key={point.id}><circle cx={point.x} cy={point.y} r="25" className="network-node" /><text x={point.x} y={point.y + 4} textAnchor="middle">{point.id}</text></g>)}
  </svg><p className="network-caption">Edges represent associations returned by the evidence trail; they are investigative leads, not proof of wrongdoing.</p></article>;
}

function formatConfidence(confidence) {
  if (typeof confidence !== "number") {
    return "n/a";
  }
  return `${Math.round(confidence * 100)}%`;
}

async function exportConversation(endpoint, history, result, setError) {
  setError("");
  try {
    const reportEndpoint = `${endpoint.replace(/\/$/, "")}/report`;
    const response = await fetch(reportEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, result }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Catalyst SmartBrowz report generation failed.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ksp-conversation-report.pdf";
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    printConversationFallback(history, result);
    setError("Catalyst SmartBrowz is awaiting authenticated-user configuration. A local print-to-PDF report was opened instead.");
  }
}

function printConversationFallback(history, result) {
  const rows = history.map((item) => `<tr><td>${escapeHtml(item.query)}</td><td>${escapeHtml(item.mode)}</td><td>${item.executed ? "Executed" : "Planned"}</td></tr>`).join("");
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) return;
  popup.document.write(`<!doctype html><title>KSP Crime Intelligence Conversation</title><style>body{font:15px Arial;padding:36px;color:#152033}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #ccd4df;text-align:left}h1{color:#173b67}</style><h1>KSP Crime Intelligence Conversation</h1><p>Generated: ${new Date().toLocaleString()}</p>${result ? `<h2>Latest response</h2><p>${escapeHtml(result.summary || result.route?.explanation || "")}</p>` : ""}<h2>Conversation history</h2><table><tr><th>Question</th><th>Mode</th><th>Status</th></tr>${rows}</table><script>window.onload=()=>window.print()</script>`);
  popup.document.close();
}

function escapeHtml(value) { return String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }

async function sendQuery(endpoint, query, role, history) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      role,
      session_id: "react-demo",
      conversation_context: history.slice(0, 3).reverse(),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Query request failed");
  }
  return payload;
}

export default App;
