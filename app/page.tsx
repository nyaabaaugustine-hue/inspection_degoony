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
        <div className="card">
          <h2>
            Vehicle Inspection Evidence<small>Choose an inspection to record. All evidence is emailed to the inspection inbox.</small>
          </h2>
          <div className="home-cards">
            <Link href="/pre" className="home-card">
              <h2>Pre-Trip</h2>
              <p>Before deployment</p>
            </Link>
            <Link href="/post" className="home-card">
              <h2>Post-Trip</h2>
              <p>On return</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
