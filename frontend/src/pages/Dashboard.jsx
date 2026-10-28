import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

export default function Dashboard({ org }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboard = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    api("/dashboard")
      .then((res) => {
        setData(res);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  // Initial fetch and auto-refresh polling
  useEffect(() => {
    fetchDashboard(false);

    if (!autoRefresh) return;
    const intervalId = setInterval(() => {
      fetchDashboard(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [org, autoRefresh, fetchDashboard]);

  if (loading) return <div className="card"><p>Loading executive dashboard…</p></div>;
  if (error) return <div className="card"><p className="error">Error loading dashboard: {error}</p></div>;
  if (!data) return null;

  // Identify anonymized department (if any) and assess privacy threshold
  const anonymizedDept = data.departments.find((d) => d.anonymized);
  const totalEmployees = data.departments.reduce((acc, d) => acc + d.employees, 0);
  const totalResponded = data.departments.reduce((acc, d) => acc + d.responded, 0);
  const anonymityMet = !anonymizedDept || anonymizedDept.responded >= 5;

  return (
    <div className="card">
      {/* Header with Title and Real-Time Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0 }}>{data.organization} — AI Maturity Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#475467", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: "auto", margin: 0, cursor: "pointer" }}
            />
            <span>Live Auto-Refresh (5s)</span>
          </label>
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            style={{
              background: refreshing ? "#667085" : "#3f2a71",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: refreshing ? "wait" : "pointer",
            }}
          >
            <span style={{ display: "inline-block", transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 0.4s ease" }}>↻</span>
            {refreshing ? "Updating…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Timestamp & Live Status */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px", fontSize: "12px", color: "#667085", marginBottom: "16px" }}>
        {autoRefresh && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#027a48", fontWeight: 600 }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#12b76a", display: "inline-block" }}></span>
            Live
          </span>
        )}
        <span>Last updated: {lastUpdated || "Just now"}</span>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: "#f8f9fc", border: "1px solid #eaecf0", borderRadius: "8px", padding: "14px" }}>
          <div style={{ fontSize: "12px", color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>Total Participation</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1d2939", marginTop: "4px" }}>
            {totalResponded} <span style={{ fontSize: "13px", color: "#667085", fontWeight: "normal" }}>/ {totalEmployees} employees</span>
          </div>
        </div>
        <div style={{ background: "#f8f9fc", border: "1px solid #eaecf0", borderRadius: "8px", padding: "14px" }}>
          <div style={{ fontSize: "12px", color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>Privacy Protection</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: anonymityMet ? "#027a48" : "#b54708", marginTop: "6px" }}>
            {anonymityMet ? "Scores Unlocked" : "Small Groups Masked (<5)"}
          </div>
        </div>
        <div style={{ background: "#f8f9fc", border: "1px solid #eaecf0", borderRadius: "8px", padding: "14px" }}>
          <div style={{ fontSize: "12px", color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>Detected Risk Areas</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#b42318", marginTop: "4px" }}>
            {data.top_risks ? data.top_risks.length : 0} <span style={{ fontSize: "13px", color: "#667085", fontWeight: "normal" }}>active flag types</span>
          </div>
        </div>
      </div>

      {/* Privacy Notice & Progress Bar */}
      {anonymizedDept && (
        <div style={{
          marginBottom: "24px",
          background: anonymityMet ? "#f6fef9" : "#f0f9ff",
          border: `1px solid ${anonymityMet ? "#a6f4c5" : "#b9e6fe"}`,
          padding: "16px",
          borderRadius: "8px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: anonymityMet ? "#027a48" : "#026aa2" }}>
              {anonymityMet
                ? `✅ Anonymity Threshold Met (${anonymizedDept.responded} responses)`
                : `🔒 Privacy Threshold: ${anonymizedDept.responded} of 5 completed diagnostics`}
            </span>
            <span style={{ fontSize: "13px", fontWeight: "bold", color: anonymityMet ? "#027a48" : "#026aa2" }}>
              {Math.min(100, Math.round((anonymizedDept.responded / 5) * 100))}%
            </span>
          </div>

          <div style={{ width: "100%", background: anonymityMet ? "#d1fadf" : "#e0f2fe", borderRadius: "4px", height: "8px", overflow: "hidden", marginBottom: "8px" }}>
            <div
              style={{
                width: `${Math.min(100, (anonymizedDept.responded / 5) * 100)}%`,
                background: anonymityMet ? "#12b76a" : "#0284c7",
                height: "100%",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          <p style={{ margin: 0, fontSize: "13px", color: "#475467" }}>
            {anonymityMet
              ? "All individual answers remain confidential while organizational aggregate maturity scores are visible."
              : `${5 - anonymizedDept.responded} more respondent${5 - anonymizedDept.responded === 1 ? "" : "s"} needed to unlock company maturity scores. To protect individual confidentiality, scores remain masked until at least 5 employees participate.`}
          </p>
        </div>
      )}

      {/* Department Breakdown Table */}
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
              <td style={{ padding: "10px 12px" }}>
                <span style={{ fontWeight: 600 }}>{d.responded}</span>
              </td>
              <td style={{ padding: "10px 12px" }}>
                <span style={{
                  padding: "3px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background:
                    d.level === "Leader" ? "#d1fadf" :
                    d.level === "Practitioner" ? "#e0f2fe" :
                    d.level === "Exploring" ? "#fef0c7" :
                    d.level.includes("Insufficient") ? "#fef3f2" : "#f2f4f7",
                  color:
                    d.level === "Leader" ? "#027a48" :
                    d.level === "Practitioner" ? "#026aa2" :
                    d.level === "Exploring" ? "#b54708" :
                    d.level.includes("Insufficient") ? "#b42318" : "#344054",
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

      {/* Top Risks Breakdown */}
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
