import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Report({ onRetake }) {
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

  if (!report) return <div className="card"><p>Loading personal report…</p></div>;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2>{report.name}: {report.level}</h2>
        {onRetake && (
          <button
            onClick={onRetake}
            style={{ background: "#3f2a71", color: "#fff", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}
          >
            Retake Diagnostic
          </button>
        )}
      </div>

      {msg && <p style={{ color: "#027a48", background: "#ecfdf3", padding: "10px", borderRadius: "6px" }}>{msg}</p>}
      <p style={{ fontSize: "16px" }}>
        <strong>Average Maturity Score:</strong> {report.average_score !== null ? `${report.average_score} / 5.0` : "Not assessed"}{" "}
        <span style={{ color: "#667085" }}>({report.answered} questions answered for {report.organization})</span>
      </p>

      {/* Original Feature: Progress & What Changed Since Last Diagnostic */}
      {report.progress && (
        <div style={{ background: "#f0f9ff", border: "1px solid #b9e6fe", padding: "16px", borderRadius: "8px", margin: "16px 0" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#026aa2" }}>📈 What Changed Since Your Last Diagnostic</h4>
          <p style={{ margin: "4px 0", fontSize: "15px" }}>
            Score Delta:{" "}
            <strong style={{ color: report.progress.score_delta >= 0 ? "#027a48" : "#b42318" }}>
              {report.progress.score_delta >= 0 ? `+${report.progress.score_delta}` : report.progress.score_delta}
            </strong>{" "}
            (from {report.progress.previous_score} to {report.average_score})
          </p>

          {report.progress.resolved_risks && report.progress.resolved_risks.length > 0 && (
            <p style={{ margin: "6px 0", color: "#027a48" }}>
              ✅ <strong>Resolved Risks:</strong> {report.progress.resolved_risks.map((r) => r.replace(/_/g, " ")).join(", ")}
            </p>
          )}

          {report.progress.new_risks && report.progress.new_risks.length > 0 && (
            <p style={{ margin: "6px 0", color: "#b42318" }}>
              ⚠️ <strong>New Risk Flags:</strong> {report.progress.new_risks.map((r) => r.replace(/_/g, " ")).join(", ")}
            </p>
          )}
        </div>
      )}

      <h3>Identified Risks</h3>
      {report.risks && report.risks.length > 0 ? (
        <ul>
          {report.risks.map((r) => (
            <li key={r} style={{ color: "#b42318", marginBottom: "4px" }}>
              ⚠️ {r.replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#027a48" }}>✅ No high-risk AI behaviors detected in your diagnostic answers.</p>
      )}

      <h3>Actionable Next Steps</h3>
      <ul>
        {report.next_steps.map((s) => (
          <li key={s} style={{ marginBottom: "6px" }}>{s}</li>
        ))}
      </ul>

      <hr style={{ margin: "24px 0", border: "0", borderTop: "1px solid #e4e7ec" }} />
      <div>
        <h4>Privacy & Data Rights</h4>
        <p style={{ fontSize: "14px", color: "#667085", marginBottom: "12px" }}>
          In accordance with enterprise data protection standards, you have the right to permanently purge your answers and remove yourself from all organizational dashboards at any time.
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
