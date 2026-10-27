import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Report() {
  const [report, setReport] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/reports/me").then(setReport);
  }, []);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete all your diagnostic answers and report? This action is permanent and immediate.")) {
      return;
    }
    await api("/reports/me", { method: "DELETE" });
    const refreshed = await api("/reports/me");
    setReport(refreshed);
    setMsg("Your answers and personal report have been deleted from the system.");
  }

  if (!report) return <p>Loading…</p>;
  return (
    <div className="card">
      <h2>{report.name}: {report.level}</h2>
      {msg && <p style={{ color: "#027a48", background: "#ecfdf3", padding: "10px", borderRadius: "6px" }}>{msg}</p>}
      <p>Average score: {report.average_score ?? "N/A"} ({report.answered} questions answered)</p>
      <h3>Risks</h3>
      {report.risks && report.risks.length > 0 ? (
        <ul>{report.risks.map((r) => <li key={r}>{r}</li>)}</ul>
      ) : (
        <p style={{ color: "#667085" }}>No active risk flags.</p>
      )}
      <h3>Next steps</h3>
      <ul>{report.next_steps.map((s) => <li key={s}>{s}</li>)}</ul>

      <hr style={{ margin: "24px 0", border: "0", borderTop: "1px solid #e4e7ec" }} />
      <div>
        <h4>Privacy & Data Rights</h4>
        <p style={{ fontSize: "14px", color: "#667085" }}>
          Under our privacy policy, you may permanently purge your answers and remove yourself from all organizational dashboards at any time.
        </p>
        <button
          onClick={handleDelete}
          style={{ background: "#d92d20", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}
        >
          Delete My Diagnostic Answers
        </button>
      </div>
    </div>
  );
}
