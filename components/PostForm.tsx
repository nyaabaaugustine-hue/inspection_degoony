"use client";

import { useEffect, useState } from "react";
import { POST_ITEMS } from "@/lib/items";
import { InspectionList } from "@/components/InspectionList";
import { PhotoEvidence } from "@/components/PhotoEvidence";
import { useInspectionForm } from "@/lib/useInspectionForm";
import { listOpenPres } from "@/lib/comparison";
import type { OpenPre } from "@/lib/comparison";
import { INSPECTION_TABLE_ID } from "@/lib/config";
import { FLEET_VEHICLES, DRIVER_NAMES } from "@/lib/fleet";
import HomeLink from "@/components/HomeLink";
import FormHeader from "@/components/FormHeader";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import type { LocalPhoto } from "@/lib/images";

export default function PostForm() {
  const form = useInspectionForm({
    prefix: "post",
    defaultFields: {
      date: new Date().toISOString().slice(0, 10),
      returnTime: "",
      driver: "",
      vehicleNo: "",
      deploymentId: "",
      endOdometer: "",
      batteryStatus: "",
      inspector: "",
      preState: "",
      variance: "",
      varianceDetails: "",
      incidentReportNo: "",
      driverCert: "",
      disposition: "",
      reviewedBy: "",
    },
    validation: [
      { field: "date", label: "Date", rule: (v) => !!v.trim() },
      { field: "driver", label: "Driver / Trainee", rule: (v) => !!v.trim() },
      { field: "vehicleNo", label: "Vehicle / Unit No.", rule: (v) => !!v.trim() },
      { field: "deploymentId", label: "Deployment ID (from pre-trip)", rule: (v) => !!v.trim() },
      {
        field: "variance",
        label: "Mandatory variance question (accident/incident/change)",
        rule: (v) => !!v.trim(),
      },
    ],
  });

  const { fields, setField, items, setItem, evidence, removeEvidence } = form;
  const [done, setDone] = useState(false);
  const [openPres, setOpenPres] = useState<OpenPre[]>([]);
  const [presLoading, setPresLoading] = useState(true);
  const [signature, setSignature] = useState<LocalPhoto | null>(null);

  useEffect(() => {
    form.restore(POST_ITEMS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load open pre-deploy records from the database so the returning officer can
  // pick the launch record from a dropdown instead of typing an ID.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/rows?table=${INSPECTION_TABLE_ID}`);
        if (!res.ok) throw new Error(`Server ${res.status}`);
        const js = (await res.json()) as { results?: Record<string, unknown>[]; error?: string };
        if (js.error) throw new Error(js.error);
        if (!live) return;
        setOpenPres(listOpenPres((js.results || []) as never[]));
      } catch {
        // Offline — the user can still type a deployment ID manually below.
      } finally {
        if (live) setPresLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Pre-fill from a records-page "Open · awaiting post" click: the deployment
  // ID, vehicle, driver and date of the pre-deploy record being closed out.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const apply = (key: string, val: string | null) => {
      if (val) setField(key, val);
    };
    apply("deploymentId", q.get("deploymentId") ? q.get("deploymentId")!.toUpperCase() : null);
    apply("vehicleNo", q.get("vehicleNo"));
    apply("driver", q.get("driver"));
    apply("date", q.get("date"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setField]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sigEvidence =
      signature && signature.blob
        ? [{ caption: "Driver signature", photo: signature }]
        : undefined;
    const ok = await form.submit(sigEvidence);
    if (ok) {
      setDone(true);
    }
  }

  // Picking a pre-deploy record links this post to it: carry over its
  // deployment ID, vehicle, driver and date.
  function onPickPre(pre: OpenPre | null) {
    if (!pre) return;
    setField("deploymentId", pre.deploymentId);
    setField("vehicleNo", pre.vehicleNo);
    setField("driver", pre.driver);
    if (pre.date) setField("date", pre.date.slice(0, 10));
  }

  if (done) {
    return (
      <>
        <header className="top">
          <div className="header-row">
            <div className="brand">
              <h1>Evergreen Logistics</h1>
              <span>Post-Inspection</span>
            </div>
            <HomeLink />
          </div>
        </header>
        <main>
          <div className="card success-card">
            <div className="success-icon">✓</div>
            <h2>Post-inspection submitted</h2>
            <p>
              Your return report for <strong>{fields.vehicleNo || "this vehicle"}</strong> (driver:{" "}
              {fields.driver || "—"}) on {fields.date || "today"} has been saved to the DEGOONY
              database. The draft and outbox were cleared for this form.
            </p>
            <a className="btn btn-primary" href="/">
              Back to Home
            </a>
            <ShareButtons
              formType="Post-Trip Inspection"
              fields={fields}
              items={items}
              evidence={evidence}
            />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="top">
        <div className="header-row">
          <div className="brand">
            <h1>Evergreen Logistics</h1>
            <span>Post-Trip Inspection</span>
          </div>
          <HomeLink />
        </div>
      </header>

      <main>
        <form onSubmit={onSubmit}>
          <div className="card tone-post">
            <FormHeader icon="🏁" title="Return details" subtitle="Record the vehicle condition on return" />
            <div className="field">
              <label>Select pre-deploy record (if returning a deployment)</label>
              <select
                className="deploy-select"
                value=""
                disabled={presLoading}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  onPickPre(openPres.find((p) => p.id === id) || null);
                  e.target.value = "";
                }}
              >
                <option value="">
                  {presLoading
                    ? "Loading pre-deploy records…"
                    : openPres.length > 0
                      ? "— Choose the pre-deploy inspection —"
                      : "No open pre-deploy records"}
                </option>
                {openPres.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.driver || "Unknown driver"} — {p.vehicleNo || "?"}
                    {p.deploymentId ? ` (${p.deploymentId})` : p.date ? ` (${p.date})` : ""}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Picking a record auto-fills the deployment ID, vehicle and driver below. You can also
                type the ID yourself.
              </span>
            </div>
            <div className="field">
              <label>Deployment ID (from pre-trip) *</label>
              <input
                type="text"
                value={fields.deploymentId}
                onChange={(e) => setField("deploymentId", e.target.value.toUpperCase())}
                placeholder="e.g. EVG-260917-A3F"
                className="mono-input"
              />
              <span className="field-hint">Enter the ID shown on the pre-trip success screen</span>
            </div>
            <div className="row2">
              <div className="field">
                <label>Date</label>
                <input type="date" value={fields.date} onChange={(e) => setField("date", e.target.value)} />
              </div>
              <div className="field">
                <label>Return time</label>
                <input type="time" value={fields.returnTime} onChange={(e) => setField("returnTime", e.target.value)} />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>Driver / Trainee *</label>
                <select
                  className="fleet-select"
                  value={fields.driver}
                  onChange={(e) => setField("driver", e.target.value)}
                >
                  <option value="">Select driver…</option>
                  {DRIVER_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Vehicle / Unit No. *</label>
                <select
                  className="fleet-select"
                  value={fields.vehicleNo}
                  onChange={(e) => setField("vehicleNo", e.target.value)}
                >
                  <option value="">Select vehicle…</option>
                  {FLEET_VEHICLES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>End odometer reading</label>
                <input type="text" inputMode="numeric" value={fields.endOdometer} onChange={(e) => setField("endOdometer", e.target.value)} />
              </div>
              <div className="field">
                <label>Battery / charging status on return</label>
                <input type="text" value={fields.batteryStatus} onChange={(e) => setField("batteryStatus", e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Inspector / authorized person</label>
              <input type="text" value={fields.inspector} onChange={(e) => setField("inspector", e.target.value)} />
            </div>
            <div className="field">
              <label>Pre-trip condition reference (optional)</label>
              <textarea
                placeholder="Notes on the vehicle condition at departure, for comparison (e.g. existing dent on front-left panel)"
                value={fields.preState}
                onChange={(e) => setField("preState", e.target.value)}
              />
            </div>
<div className="field">
                <label>Return condition photos</label>
                <p className="photo-notice">
                  📷 Photos are <strong>uploaded to the DEGOONY database</strong> with your report,
                  and kept on this device so you can also <strong>⤴ Share</strong> them via WhatsApp.
                </p>
                <PhotoEvidence
                  suggested={["Front view", "Rear view", "Driver side", "Passenger side", "Odometer", "Damage close-up"]}
                  photos={evidence}
                  onChange={(list) => form.setEvidence(list)}
                  onRemove={removeEvidence}
                />
              </div>
          </div>

          <div className="card tone-post">
            <FormHeader icon="📋" title="Post-trip comparison" subtitle="Mark each item OK, Change / Defect, or N/A" />
            <InspectionList
              items={POST_ITEMS}
              okLabel="OK"
              defectLabel="Change / Defect"
              showPhotos
              state={items}
              onChange={(id, patch) => setItem(id, patch)}
            />
          </div>

          <div className="card tone-post">
            <FormHeader icon="⚠️" title="Mandatory variance question" subtitle="Did any accident, incident, near miss, damage, defect, missing component, or material change occur during this deployment?" />
            <div className="field">
              <div className="radio-set">
                {["No", "Yes"].map((opt) => (
                  <label key={opt} className={`radio-opt${fields.variance === opt ? " checked" : ""}`}>
                    <input
                      type="radio"
                      name="post_variance"
                      value={opt}
                      checked={fields.variance === opt}
                      onChange={() => setField("variance", opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>If yes — describe the condition / what happened</label>
              <textarea value={fields.varianceDetails} onChange={(e) => setField("varianceDetails", e.target.value)} />
            </div>
            <div className="field">
              <label>Incident / Defect Report No.</label>
              <input type="text" value={fields.incidentReportNo} onChange={(e) => setField("incidentReportNo", e.target.value)} />
            </div>
          </div>

          <div className="card tone-post">
            <FormHeader icon="✍️" title="Post-trip driver certification" subtitle="I confirm I truthfully reported any accident, incident, near miss, defect, damage, or material change during my responsibility for this vehicle" />
            <div className="field">
              <label>Driver signature (draw below, or type full name)</label>
              <SignaturePad onSign={(photo) => setSignature(photo)} />
            </div>
            <div className="field">
              <label>Driver name (typed)</label>
              <input type="text" value={fields.driverCert} onChange={(e) => setField("driverCert", e.target.value)} placeholder="Full name" />
            </div>
          </div>

          <div className="card tone-post">
            <FormHeader icon="🔧" title="Supervisor / maintenance disposition" subtitle="After return, the supervisor decides what happens to the vehicle" />
            <div className="field">
              <div className="radio-set">
                {[
                  "Cleared for service",
                  "Cleared with observation",
                  "Maintenance inspection required",
                  "Do not deploy / out of service",
                ].map((opt) => (
                  <label key={opt} className={`radio-opt${fields.disposition === opt ? " checked" : ""}`}>
                    <input
                      type="radio"
                      name="post_disposition"
                      value={opt}
                      checked={fields.disposition === opt}
                      onChange={() => setField("disposition", opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Reviewed by (signature)</label>
              <input type="text" value={fields.reviewedBy} onChange={(e) => setField("reviewedBy", e.target.value)} />
            </div>
          </div>

          {form.error && <div className="field-error">{form.error}</div>}

          <footer className="submit-bar single">
            <button className="btn btn-ghost" type="button" onClick={() => form.download()}>
              Backup
            </button>
            <button className="btn btn-primary" type="submit" disabled={form.busy}>
              {form.busy ? "Submitting…" : "Submit post-trip"}
            </button>
          </footer>
        </form>
      </main>

      {form.error && !form.justQueued && (
        <div className="toast show error">{form.error}</div>
      )}
      {form.justQueued && <div className="toast show error">Saved offline — go back to retry from Home.</div>}
    </>
  );
}
