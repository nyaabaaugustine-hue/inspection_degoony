import Link from "next/link";
import Outbox from "@/components/Outbox";

export default function Home() {
  return (
    <>
      <header className="top">
        <div className="brand">
          <h1>Evergreen Logistics</h1>
          <span>Daily Vehicle Readiness</span>
        </div>
      </header>
      <main>
        <Outbox />
        <div className="launch-menu">
          <Link href="/inspect" className="launch-btn launch-inspect">
            <span className="launch-icon">🛡️</span>
            <span className="launch-label">INSPECTION</span>
            <span className="launch-sub">Pre &amp; post vehicle checks</span>
          </Link>
          <Link href="/driver" className="launch-btn launch-driver">
            <span className="launch-icon">🚚</span>
            <span className="launch-label">DRIVER REGISTRATION</span>
            <span className="launch-sub">Job application &amp; interview form</span>
          </Link>
        </div>
        <div className="records-link">
          <Link href="/records" className="home-link-row">View saved submissions</Link>
        </div>
      </main>
    </>
  );
}