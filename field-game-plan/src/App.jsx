import { useMemo, useState } from "react";
import "./App.css";
import {
  REP_NAME,
  CALENDAR_EVENTS,
  STARTING_COVERAGE,
  SLACK_MESSAGES,
  EMAILS,
  buildAccounts,
  touchColor,
  scoreAccount,
} from "./mockData";
import Crust from "./Crust";
import CrustLogo from "./CrustLogo";
import { activityType } from "./crustEngine";

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function dayLabel(offset) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function CalendarStrip({ events }) {
  const days = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const offset = ev.dayOffset ?? 0;
      if (!map.has(offset)) map.set(offset, []);
      map.get(offset).push(ev);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [events]);

  return (
    <div className="calendar-strip">
      {days.map(([offset, dayEvents]) => (
        <div className="calendar-day-group" key={offset}>
          <div className="calendar-day-label">{dayLabel(offset)}</div>
          {dayEvents.map((ev) => (
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

function MessageMini({ from, channel, text }) {
  return (
    <div className="message-mini">
      <div className="message-mini-head">
        <span className="message-mini-from">{from.split(/[<(]/)[0].trim()}</span>
        {channel && <span className="message-mini-channel">{channel}</span>}
      </div>
      <div className="message-mini-text">{text}</div>
    </div>
  );
}

// Fieldwork (Walk-in) vs Call list — populated only as the AE approves
// accounts through Crust, so it reads like a running log for the day.
function ApprovedLists({ approvedLog }) {
  const [tab, setTab] = useState("Walk-in");
  const filtered = approvedLog.filter((entry) => entry.type === tab);

  return (
    <div className="approved-lists">
      <div className="approved-tabs">
        <button
          className={`approved-tab ${tab === "Walk-in" ? "active" : ""}`}
          onClick={() => setTab("Walk-in")}
        >
          Fieldwork
        </button>
        <button className={`approved-tab ${tab === "Call" ? "active" : ""}`} onClick={() => setTab("Call")}>
          Call List
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="approved-empty">
          Nothing here yet — approve a Crust suggestion and it'll land in this list.
        </div>
      ) : (
        <div className="approved-list">
          {filtered.map((entry) => (
            <div className="approved-item" key={entry.id}>
              <span className="approved-item-name">{entry.name}</span>
              <span className="approved-item-time">{entry.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [accounts, setAccounts] = useState(buildAccounts());
  const [coverage, setCoverage] = useState(STARTING_COVERAGE);
  const [calendarEvents, setCalendarEvents] = useState(CALENDAR_EVENTS);
  const [approvedLog, setApprovedLog] = useState([]);

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
    if (acct) {
      setApprovedLog((prev) => [
        ...prev,
        {
          id: `${acct.id}-${Date.now()}`,
          name: acct.name,
          type: activityType(acct),
          time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        },
      ]);
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
        slackMessages={SLACK_MESSAGES}
        emails={EMAILS}
        onMarkWorked={handleWork}
        onScheduleBlock={handleScheduleBlock}
      />

      <aside className="reference-panel">
        <div className="reference-header">
          <div className="logo-mark-row">
            <CrustLogo size={20} />
            <span className="logo-mark">CRUST</span>
          </div>
          <h1 className="reference-greeting">
            {REP_NAME} · {TODAY}
          </h1>
        </div>

        <div className="reference-section">
          <h2 className="reference-title">Calendar — This Week</h2>
          <CalendarStrip events={calendarEvents} />
        </div>

        <div className="reference-section">
          <h2 className="reference-title">Slack</h2>
          <div className="message-mini-list">
            {SLACK_MESSAGES.map((m) => (
              <MessageMini from={m.from} channel={m.channel} text={m.text} key={m.id} />
            ))}
          </div>
        </div>

        <div className="reference-section">
          <h2 className="reference-title">Email</h2>
          <div className="message-mini-list">
            {EMAILS.map((m) => (
              <MessageMini from={m.from} channel={m.subject} text={m.preview} key={m.id} />
            ))}
          </div>
        </div>

        <div className="reference-section">
          <h2 className="reference-title">Approved by Crust</h2>
          <ApprovedLists approvedLog={approvedLog} />
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
