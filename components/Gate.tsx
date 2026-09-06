"use client";

import { useState, useEffect } from "react";
import { STAFF_CODE, STAFF_CODE_KEY } from "@/lib/config";

function isAuthed(): boolean {
  try {
    return sessionStorage.getItem(STAFF_CODE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Gate({ children }: { children: React.ReactNode }) {
  // Start with false so server and client render identical gate HTML (SSR
  // cannot access sessionStorage). The useEffect below resolves the real
  // auth state after hydration, eliminating the SSR/client mismatch.
  const [authed, setAuthed] = useState<boolean>(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  if (!authed) {
    return (
      <>
        <header className="top">
          <div className="brand">
            <h1>Evergreen Logistics</h1>
            <span>Staff access</span>
          </div>
        </header>
        <main>
          <div className="card">
            <h2>
              Vehicle Inspection<small>Enter the staff access code to continue</small>
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (code.trim() === STAFF_CODE) {
                try { sessionStorage.setItem(STAFF_CODE_KEY, "1"); } catch { /* ignore */ }
                setAuthed(true);
              } else {
                setErr("Incorrect code.");
              }
            }}>
              <div className="field">
                <label>Access code</label>
                <input
                  type="password"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setErr(null); }}
                  autoFocus
                />
              </div>
              {err && <div className="toast show error" style={{ position: "static", marginBottom: 12 }}>{err}</div>}
              <button className="btn btn-primary" type="submit">
                Unlock
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  return <>{children}</>;
}
