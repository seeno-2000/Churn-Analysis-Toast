import { useState, useRef, useEffect } from "react";
import { SUGGESTED_PROMPTS, handleMessage, buildProactiveSuggestions } from "./crustEngine";

const WELCOME = {
  role: "assistant",
  text: "Hey — I'm Crust. I watch your coverage, calendar, and prospecting list, and I'll flag things for you to approve. Ask me anything, or act on what I bring up.",
};

function SalesforceLogCard({ log }) {
  return (
    <div className="sf-card">
      <div className="sf-card-head">
        <span className="sf-card-icon">☁️</span>
        <span className="sf-card-title">Synced to Salesforce</span>
      </div>
      <div className="sf-card-row">
        <span className="sf-card-label">Subject</span>
        <span className="sf-card-value">{log.subject}</span>
      </div>
      <div className="sf-card-row">
        <span className="sf-card-label">Type</span>
        <span className="sf-card-value">{log.type}</span>
      </div>
      <div className="sf-card-row">
        <span className="sf-card-label">Related To</span>
        <span className="sf-card-value">{log.relatedTo}</span>
      </div>
      <div className="sf-card-row">
        <span className="sf-card-label">Date</span>
        <span className="sf-card-value">{log.date}</span>
      </div>
    </div>
  );
}

export default function Crust({ accounts, ranked, coverage, calendarEventCount, onMarkWorked, onScheduleBlock }) {
  const [messages, setMessages] = useState([{ ...WELCOME, id: "welcome" }]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    setSuggestions(buildProactiveSuggestions({ accounts, coverage, calendarEventCount }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, suggestions]);

  function pushMessage(msg) {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  }

  function send(text) {
    if (!text.trim()) return;
    const { reply, action, log } = handleMessage(text, { accounts, ranked, coverage, calendarEventCount });
    pushMessage({ role: "user", text });
    pushMessage({ role: "assistant", text: reply });
    if (log) pushMessage({ role: "assistant", log });
    setInput("");
    if (action?.type === "mark-worked") onMarkWorked(action.id);
    if (action?.type === "schedule-block") onScheduleBlock(action.event);
  }

  function approveSuggestion(s) {
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    pushMessage({ role: "assistant", text: `Approved — ${s.approveLabel.toLowerCase()}.` });
    if (s.action.type === "mark-worked-bulk") {
      s.action.ids.forEach((id) => onMarkWorked(id));
      (s.logs || []).forEach((log) => pushMessage({ role: "assistant", log }));
    }
    if (s.action.type === "schedule-block") {
      onScheduleBlock(s.action.event);
    }
  }

  function dismissSuggestion(s) {
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  return (
    <div className="crust-main">
      <div className="crust-thread" ref={scrollRef}>
        <div className="crust-thread-inner">
          {messages.map((m) => (
            <div key={m.id} className={`crust-msg crust-msg-${m.role}`}>
              {m.text}
              {m.log && <SalesforceLogCard log={m.log} />}
            </div>
          ))}
          {suggestions.map((s) => (
            <div key={s.id} className="crust-suggestion">
              <div className="crust-suggestion-label">Crust suggests</div>
              <div className="crust-suggestion-text">{s.text}</div>
              <div className="crust-suggestion-actions">
                <button className="crust-approve" onClick={() => approveSuggestion(s)}>
                  {s.approveLabel}
                </button>
                <button className="crust-dismiss" onClick={() => dismissSuggestion(s)}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="crust-composer">
        <div className="crust-chips">
          {SUGGESTED_PROMPTS.map((p) => (
            <button key={p} className="crust-chip" onClick={() => send(p)}>
              {p}
            </button>
          ))}
        </div>
        <form
          className="crust-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="crust-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Crust anything…"
          />
          <button className="crust-send" type="submit">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
