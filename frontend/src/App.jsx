import React, { useState } from "react";
import Login from "./pages/Login.jsx";
import OrgPicker from "./pages/OrgPicker.jsx";
import Diagnostic from "./pages/Diagnostic.jsx";
import Report from "./pages/Report.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const s = sessionStorage.getItem("session");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const [org, setOrg] = useState(() => {
    try {
      const o = sessionStorage.getItem("org");
      return o ? JSON.parse(o) : null;
    } catch {
      return null;
    }
  });

  const [step, setStep] = useState(() => {
    const s = sessionStorage.getItem("session");
    const o = sessionStorage.getItem("org");
    if (!s) return "login";
    if (!o) return "org";
    try {
      const orgObj = JSON.parse(o);
      return orgObj.role === "admin" ? "dashboard" : "diagnostic";
    } catch {
      return "login";
    }
  });

  const saveSession = (s) => {
    setSession(s);
    if (s) sessionStorage.setItem("session", JSON.stringify(s));
    else sessionStorage.removeItem("session");
  };

  const saveOrg = (o) => {
    setOrg(o);
    if (o) sessionStorage.setItem("org", JSON.stringify(o));
    else sessionStorage.removeItem("org");
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
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
        <Login onDone={(s) => { saveSession(s); setStep("org"); }} />
      )}
      {step === "org" && (
        <OrgPicker
          orgs={session.organizations}
          onPick={(o) => { saveOrg(o); setStep(o.role === "admin" ? "dashboard" : "diagnostic"); }}
        />
      )}
      {step === "diagnostic" && <Diagnostic onDone={() => setStep("report")} />}
      {step === "report" && <Report onRetake={() => setStep("diagnostic")} />}
      {step === "dashboard" && <Dashboard org={org} />}
    </div>
  );
}
