import Link from "next/link";
import Outbox from "@/components/Outbox";
import HomeLink from "@/components/HomeLink";

export default function InspectPage() {
  return (
    <>
      <header className="top">
        <div className="header-row">
          <div className="brand">
            <h1>Evergreen Logistics</h1>
            <span>Vehicle Inspection</span>
          </div>
          <HomeLink />
        </div>
      </header>
      <main>
        <Outbox />
        <div className="card">
          <h2>
            Choose inspection type<small>Choose the check you want to record. Text and photos are saved to the DEGOONY database.</small>
          </h2>
          <div className="home-cards">
            <Link href="/pre" className="home-card">
              <h2>Pre-Inspection</h2>
              <p>Before deployment</p>
            </Link>
            <Link href="/post" className="home-card home-card-post">
              <h2>POST INSPECTION</h2>
              <p>On return — record return condition</p>
            </Link>
          </div>
          <Link href="/records" className="records-link-row">
            View saved inspection records
          </Link>
        </div>
      </main>
    </>
  );
}