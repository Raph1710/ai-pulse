import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Dashboard({ org }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api("/dashboard")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [org]);

  if (loading) return <div className="card"><p>Loading executive dashboard…</p></div>;
  if (error) return <div className="card"><p className="error">Error loading dashboard: {error}</p></div>;
  if (!data) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>{data.organization} — AI Maturity Dashboard</h2>
      </div>

      <div style={{ marginBottom: "24px", background: "#f8f9fc", padding: "12px 16px", borderRadius: "8px", borderLeft: "4px solid #3f2a71" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#475467" }}>
          <strong>Privacy Notice:</strong> In compliance with HR data privacy standards, teams with fewer than 5 completed diagnostics are automatically consolidated under <em>Other teams (anonymized)</em> to protect employee confidentiality.
        </p>
      </div>

      <h3>Department Maturity Breakdown</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
        <thead>
          <tr style={{ background: "#f2f4f7", textAlign: "left" }}>
            <th style={{ padding: "10px 12px", borderBottom: "2px solid #eaecf0" }}>Department</th>
            <th style={{ padding: "10px 12px", borderBottom: "2px solid #eaecf0" }}>Headcount</th>
            <th style={{ padding: "10px 12px", borderBottom: "2px solid #eaecf0" }}>Responses</th>
            <th style={{ padding: "10px 12px", borderBottom: "2px solid #eaecf0" }}>Maturity Level</th>
            <th style={{ padding: "10px 12px", borderBottom: "2px solid #eaecf0" }}>Avg Score</th>
          </tr>
        </thead>
        <tbody>
          {data.departments.map((d, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eaecf0", background: d.anonymized ? "#fdfbf7" : "transparent" }}>
              <td style={{ padding: "10px 12px" }}>
                <strong>{d.department}</strong>
                {d.anonymized && (
                  <span style={{ marginLeft: "8px", fontSize: "12px", background: "#fef0c7", color: "#b54708", padding: "2px 6px", borderRadius: "4px" }}>
                    Anonymized
                  </span>
                )}
              </td>
              <td style={{ padding: "10px 12px" }}>{d.employees}</td>
              <td style={{ padding: "10px 12px" }}>{d.responded}</td>
              <td style={{ padding: "10px 12px" }}>
                <span style={{
                  padding: "3px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: d.level === "Leader" ? "#d1fadf" : d.level === "Practitioner" ? "#e0f2fe" : d.level === "Exploring" ? "#fef0c7" : "#f2f4f7",
                  color: d.level === "Leader" ? "#027a48" : d.level === "Practitioner" ? "#026aa2" : d.level === "Exploring" ? "#b54708" : "#344054"
                }}>
                  {d.level}
                </span>
              </td>
              <td style={{ padding: "10px 12px", fontWeight: "bold" }}>
                {d.average_score !== null ? `${d.average_score} / 5.0` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Top Company AI Risks</h3>
      {data.top_risks && data.top_risks.length > 0 ? (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {data.top_risks.map(([risk, count]) => (
            <li key={risk} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#fef3f2", borderRadius: "6px", marginBottom: "6px", color: "#b42318" }}>
              <span>⚠️ <strong>{risk.replace(/_/g, " ")}</strong></span>
              <span style={{ fontWeight: "bold" }}>{count} occurrence{count > 1 ? "s" : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#667085" }}>No critical risk flags detected across organizations.</p>
      )}
    </div>
  );
}
