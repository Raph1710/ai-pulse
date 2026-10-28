import React, { useState } from "react";
import Login from "./pages/Login.jsx";
import OrgPicker from "./pages/OrgPicker.jsx";
import Diagnostic from "./pages/Diagnostic.jsx";
import Report from "./pages/Report.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const [step, setStep] = useState("login");
  const [session, setSession] = useState(null);
  const [org, setOrg] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setSession(null);
    setOrg(null);
    setStep("login");
  };

  return (
    <div className="wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #eaecf0", flexWrap: "wrap", gap: "10px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>AI Pulse</h1>
        {session && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", color: "#475467" }}>
              👤 <strong>{session.name}</strong> {org && <span style={{ color: "#667085" }}>({org.org_name} • {org.role})</span>}
            </span>
            <button
              onClick={handleLogout}
              style={{ background: "#fee4e2", color: "#d92d20", border: "1px solid #fecdca", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>

      {step === "login" && (
        <Login onDone={(s) => { setSession(s); setStep("org"); }} />
      )}
      {step === "org" && (
        <OrgPicker
          orgs={session.organizations}
          onPick={(o) => { setOrg(o); setStep(o.role === "admin" ? "dashboard" : "diagnostic"); }}
        />
      )}
      {step === "diagnostic" && <Diagnostic onDone={() => setStep("report")} />}
      {step === "report" && <Report onRetake={() => setStep("diagnostic")} />}
      {step === "dashboard" && <Dashboard org={org} />}
    </div>
  );
}
