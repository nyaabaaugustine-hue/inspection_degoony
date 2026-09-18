"use client";

import { useState, useEffect } from "react";
import { STAFF_CODE, STAFF_CODE_KEY, STAFF_NAME_KEY } from "@/lib/config";

function isAuthed(): boolean {
  try {
    return sessionStorage.getItem(STAFF_CODE_KEY) === "1";
  } catch {
    return false;
  }
}

function readStoredName(): string {
  try {
    return sessionStorage.getItem(STAFF_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export default function Gate({ children }: { children: React.ReactNode }) {
  // Start with false so server and client render identical gate HTML (SSR
  // cannot access sessionStorage). The useEffect below resolves the real
  // auth state after hydration, eliminating the SSR/client mismatch.
  const [authed, setAuthed] = useState<boolean>(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    setAuthed(isAuthed());
    setName(readStoredName());
  }, []);

  if (!authed) {
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        setErr("Enter your full name to sign in.");
        return;
      }
      if (code.trim() !== STAFF_CODE) {
        setErr("Incorrect PIN — please try again.");
        return;
      }
      try {
        sessionStorage.setItem(STAFF_CODE_KEY, "1");
        sessionStorage.setItem(STAFF_NAME_KEY, trimmedName);
      } catch {
        /* ignore */
      }
      setAuthed(true);
    };

    return (
      <>
        <header className="top">
          <div className="brand">
            <h1>Evergreen Logistics</h1>
            <span>Staff sign-in</span>
          </div>
        </header>
        <main className="gate-main">
          <div className="card gate-card">
            <div className="gate-badge" aria-hidden="true">
              🔐
            </div>
            <h2 className="gate-title">
              Vehicle Inspection
              <small>Enter your name and staff PIN to continue</small>
            </h2>
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="staff-name">Full name</label>
                <input
                  id="staff-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  placeholder="e.g. Yaw Asante"
                  onChange={(e) => {
                    setName(e.target.value);
                    setErr(null);
                  }}
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="staff-pin">Staff PIN</label>
                <div className="pin-wrap">
                  <input
                    id="staff-pin"
                    type={showPin ? "text" : "password"}
                    autoComplete="off"
                    value={code}
                    placeholder="Enter your PIN"
                    onChange={(e) => {
                      setCode(e.target.value);
                      setErr(null);
                    }}
                  />
                  <button
                    type="button"
                    className="pin-toggle"
                    onClick={() => setShowPin((v) => !v)}
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              {err && <div className="toast show error gate-error">{err}</div>}
              <button className="btn btn-primary gate-btn" type="submit">
                Sign in
              </button>
            </form>
            <p className="gate-footer">Staff only — if you don't have your PIN, ask your operations manager.</p>
          </div>
        </main>
      </>
    );
  }

  return <>{children}</>;
}
