import { useMemo, useState } from "react";
import "./App.css";
import {
  REP_NAME,
  CALENDAR_EVENTS,
  STARTING_COVERAGE,
  buildAccounts,
  touchColor,
  scoreAccount,
} from "./mockData";
import Crust from "./Crust";

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

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
          {ev.pending && <div className="cal-pending-tag">Pending approval</div>}
        </div>
      ))}
    </div>
  );
}

function AccountMini({ account }) {
  const color = touchColor(account.daysSinceTouch);
  return (
    <div className={`account-mini ${account.worked ? "worked" : ""}`}>
      <span className="account-mini-name">{account.name}</span>
      <span className={`account-mini-touch touch-${color}`}>{account.daysSinceTouch}d</span>
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
    // Real integration point: POST activity to Salesforce (Task object — Call
    // or Walk-in depending on proximity to the AE's field meeting), then
    // Sigma's nightly/streaming sync recalculates true coverage %.
  }

  function handleScheduleBlock(event) {
    // Real integration point: POST a tentative event via the Google Calendar
    // API, left in "needsAction" status until the AE accepts the invite.
    setCalendarEvents((prev) => [...prev, event]);
  }

  return (
    <div className="app-shell">
      <Crust
        accounts={accounts}
        ranked={ranked}
        coverage={coverage}
        calendarEventCount={calendarEvents.length}
        onMarkWorked={handleWork}
        onScheduleBlock={handleScheduleBlock}
      />

      <aside className="reference-panel">
        <div className="reference-header">
          <div className="logo-mark">CRUST</div>
          <h1 className="reference-greeting">
            {REP_NAME} · {TODAY}
          </h1>
        </div>

        <div className="reference-section">
          <h2 className="reference-title">Today's Calendar</h2>
          <CalendarStrip events={calendarEvents} />
        </div>

        <div className="reference-section">
          <h2 className="reference-title">Prospecting List</h2>
          <div className="account-mini-list">
            {ranked.slice(0, 12).map((a) => (
              <AccountMini account={a} key={a.id} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
