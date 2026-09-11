"use client";

import { useEffect, useRef, useState } from "react";

const FLEET_MGT_URL = "https://track-client-nu.vercel.app/login";

export default function FleetMgtButton() {
  const [stage, setStage] = useState<"idle" | "loading" | "leaving">("idle");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const openFleet = () => {
    if (stage !== "idle") return;
    setStage("loading");
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    timerRef.current = window.setTimeout(() => {
      setStage("leaving");
      setVisible(false);
      timerRef.current = window.setTimeout(() => {
        window.location.href = FLEET_MGT_URL;
      }, 340);
    }, 1150);
  };

  return (
    <>
      <button
        type="button"
        className="launch-btn launch-fleet"
        onClick={openFleet}
        disabled={stage !== "idle"}
      >
        <span className="launch-icon">🗺️</span>
        <span className="launch-label">FLEET MGT</span>
        <span className="launch-sub">Live tracking &amp; fleet management portal</span>
      </button>

      {stage !== "idle" && (
        <div className={`fleet-overlay ${visible ? "enter" : ""}`}>
          <div className="fleet-loader">
            <div className="fleet-emblem">
              <span className="fleet-ring" />
              <span className="fleet-emblem-icon">🗺️</span>
            </div>
            <div className="fleet-bar-wrap">
              <div className="fleet-bar" />
            </div>
            <div className="fleet-text">
              <div className="fleet-title">Fleet Management</div>
              <div className="fleet-status">
                Connecting to secure portal<span className="fleet-dots">…</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}