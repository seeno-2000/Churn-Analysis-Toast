import { useMemo, useState } from "react";
import "./App.css";
import {
  REP_NAME,
  CALENDAR_EVENTS,
  FIELD_MEETING,
  COVERAGE_GOAL,
  STARTING_COVERAGE,
  buildAccounts,
  touchColor,
  scoreAccount,
  whyReason,
} from "./mockData";
import Crust from "./Crust";

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const TIER_LABELS = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3", 4: "Tier 4", 5: "Tier 5" };

function CoverageMeters({ coverage }) {
  return (
    <div className="coverage-grid">
      {Object.keys(STARTING_COVERAGE).map((tier) => {
        const pct = coverage[tier];
        const hit = pct >= COVERAGE_GOAL;
        return (
          <div className="coverage-card" key={tier}>
            <div className="coverage-card-top">
              <span className="coverage-tier">{TIER_LABELS[tier]}</span>
              <span className={"coverage-pct" + (hit ? " hit" : "")}>{pct}%</span>
            </div>
            <div className="meter">
              <div
                className={"meter-fill" + (hit ? " hit" : "")}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
              <div className="meter-goal" style={{ left: `${COVERAGE_GOAL}%` }} />
            </div>
            <div className="coverage-sub">Goal: {COVERAGE_GOAL}% activity in last 60 days</div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarStrip({ events }) {
  return (
    <div className="calendar-strip">
      {events.map((ev) => (
        <div className={`cal-block cal-${ev.type} ${ev.pending ? "cal-pending" : ""}`} key={ev.id}>
          <div className="cal-time">
            {ev.time}
            {ev.endTime ? ` – ${ev.endTime}` : ""}
          </div>
          <div className="cal-title">{ev.title}</div>
          {ev.location && <div className="cal-loc">📍 {ev.location}</div>}
          <div className="cal-type-tag">
            {ev.type === "field" ? "In-person" : ev.type === "zoom" ? "Video" : "Phone"}
          </div>
          {ev.pending && <div className="cal-pending-tag">Pending approval</div>}
        </div>
      ))}
    </div>
  );
}

function AccountRow({ account, rank, onWork }) {
  const color = touchColor(account.daysSinceTouch);
  return (
    <div className={`account-row ${account.worked ? "worked" : ""}`}>
      <div className="account-rank">{rank}</div>
      <div className="account-main">
        <div className="account-name-line">
          <span className="account-name">{account.name}</span>
          <span className="tier-badge">{account.tier ? `Tier ${account.tier}` : "Unscored"}</span>
        </div>
        <div className="account-why">{whyReason(account)}</div>
      </div>
      <div className="account-stats">
        <div className="stat">
          <div className="stat-label">Fit Score</div>
          <div className="stat-value">{account.fit ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Last Touch</div>
          <div className={`stat-value touch-${color}`}>{account.daysSinceTouch}d</div>
        </div>
        <div className="stat">
          <div className="stat-label">Distance</div>
          <div className="stat-value">{account.distanceFromMeeting} mi</div>
        </div>
      </div>
      <button
        className={`work-btn ${account.worked ? "done" : ""}`}
        onClick={() => onWork(account.id)}
        disabled={account.worked}
      >
        {account.worked ? "✓ Logged" : "Mark Worked"}
      </button>
    </div>
  );
}

// Convert lat/lng to a simple SVG-canvas position for the mocked map.
function project(lat, lng, bounds, size) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * size.w;
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * size.h;
  return { x, y };
}

function MapView({ accounts }) {
  const cluster = accounts.filter((a) => a.distanceFromMeeting <= 1.5);
  const ordered = [...cluster].sort((a, b) => a.distanceFromMeeting - b.distanceFromMeeting);

  const points = [FIELD_MEETING, ...cluster];
  const bounds = {
    minLat: Math.min(...points.map((p) => p.lat)) - 0.003,
    maxLat: Math.max(...points.map((p) => p.lat)) + 0.003,
    minLng: Math.min(...points.map((p) => p.lng)) - 0.003,
    maxLng: Math.max(...points.map((p) => p.lng)) + 0.003,
  };
  const size = { w: 640, h: 380 };

  const meetingPos = project(FIELD_MEETING.lat, FIELD_MEETING.lng, bounds, size);
  const routePoints = [meetingPos, ...ordered.map((a) => project(a.lat, a.lng, bounds, size))];

  return (
    <div className="map-wrap">
      <svg viewBox={`0 0 ${size.w} ${size.h}`} className="map-svg">
        <rect x="0" y="0" width={size.w} height={size.h} className="map-bg" />
        <polyline
          points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")}
          className="route-line"
        />
        <g>
          <circle cx={meetingPos.x} cy={meetingPos.y} r="11" className="pin-meeting" />
          <text x={meetingPos.x} y={meetingPos.y + 4} className="pin-label-meeting" textAnchor="middle">
            ★
          </text>
          <text x={meetingPos.x} y={meetingPos.y - 16} className="map-caption" textAnchor="middle">
            1 PM — Hungry Joe's
          </text>
        </g>
        {ordered.map((a, i) => {
          const p = project(a.lat, a.lng, bounds, size);
          return (
            <g key={a.id}>
              <circle cx={p.x} cy={p.y} r="13" className={`pin pin-${touchColor(a.daysSinceTouch)}`} />
              <text x={p.x} y={p.y + 4} className="pin-number" textAnchor="middle">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        <div className="map-legend-title">Optimized route around your 1 PM</div>
        <ol className="map-route-list">
          {ordered.map((a, i) => (
            <li key={a.id}>
              <strong>{i + 1}.</strong> {a.name} — {a.distanceFromMeeting} mi
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function App() {
  const [accounts, setAccounts] = useState(buildAccounts());
  const [coverage, setCoverage] = useState(STARTING_COVERAGE);
  const [calendarEvents, setCalendarEvents] = useState(CALENDAR_EVENTS);

  const ranked = useMemo(() => {
    return accounts
      .filter((a) => a.tier != null)
      .map((a) => ({ ...a, score: scoreAccount(a) }))
      .sort((a, b) => b.score - a.score);
  }, [accounts]);

  const fieldCluster = ranked.filter((a) => a.distanceFromMeeting <= 1.5);
  const phoneBlock = ranked.filter((a) => a.distanceFromMeeting > 1.5);
  const unscored = accounts.filter((a) => a.tier == null);

  function handleWork(id) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, worked: true, daysSinceTouch: 0 } : a))
    );
    const acct = accounts.find((a) => a.id === id);
    if (acct && acct.tier) {
      setCoverage((prev) => ({
        ...prev,
        [acct.tier]: Math.min(100, prev[acct.tier] + 2),
      }));
    }
    // Real integration point: POST activity to Salesforce (Task/Event object)
    // via the AE's connected account, then Sigma's nightly/streaming sync
    // recalculates true coverage %. We simulate that tick here for the demo.
  }

  function handleScheduleBlock(event) {
    // Real integration point: POST a tentative event via the Google Calendar
    // API, left in "needsAction" status until the AE accepts the invite.
    setCalendarEvents((prev) => [...prev, event]);
  }

  const workedCount = accounts.filter((a) => a.worked).length;

  return (
    <div className="app-shell">
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">FIELD GAME PLAN</div>
          <h1>Good morning, {REP_NAME} — here's your plan for {TODAY}</h1>
          <p className="header-sub">
            Auto-built from Salesforce account data, Sigma coverage metrics, and your calendar.
          </p>
        </div>
        <div className="header-right">
          <div className="worked-counter">
            <div className="worked-number">{workedCount}</div>
            <div className="worked-label">accounts worked today</div>
          </div>
        </div>
      </header>

      <section className="section">
        <h2 className="section-title">Your Activity Coverage</h2>
        <p className="section-sub">% of accounts per tier with logged activity in the trailing 60 days.</p>
        <CoverageMeters coverage={coverage} />
      </section>

      <section className="section">
        <h2 className="section-title">Today's Calendar</h2>
        <p className="section-sub">Pulled from Google Calendar &amp; Chili Piper (mocked).</p>
        <CalendarStrip events={calendarEvents} />
      </section>

      <section className="section">
        <h2 className="section-title">Your Prioritized Target List</h2>
        <p className="section-sub">
          Ranked by tier, fit score, days since last touch, and proximity to your 1 PM field meeting.
        </p>

        <div className="list-group">
          <h3 className="list-group-title field">
            📍 Field cluster — work around your 1 PM in Inglewood
          </h3>
          {fieldCluster.map((a, i) => (
            <AccountRow account={a} rank={i + 1} key={a.id} onWork={handleWork} />
          ))}
        </div>

        <div className="list-group">
          <h3 className="list-group-title phone">☎️ Phone block — call targets</h3>
          {phoneBlock.slice(0, 12).map((a, i) => (
            <AccountRow account={a} rank={i + 1} key={a.id} onWork={handleWork} />
          ))}
        </div>

        {unscored.length > 0 && (
          <div className="list-group">
            <h3 className="list-group-title unscored">🆕 Unscored — awaiting fit-score model</h3>
            {unscored.map((a) => (
              <AccountRow account={a} rank="–" key={a.id} onWork={handleWork} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Map View</h2>
        <p className="section-sub">
          Your 1 PM meeting (★) and the nearby field cluster, in optimized walking/driving order.
        </p>
        <MapView accounts={accounts} />
      </section>

      <footer className="app-footer">
        Field Game Plan — prototype. Account data: Salesforce → warehouse → Sigma. Calendar: Google
        Calendar + Chili Piper. Activity write-back: Salesforce Task API.
      </footer>
    </div>
    <Crust
      accounts={accounts}
      ranked={ranked}
      coverage={coverage}
      calendarEventCount={calendarEvents.length}
      onMarkWorked={handleWork}
      onScheduleBlock={handleScheduleBlock}
    />
    </div>
  );
}
