import { useState, useRef, useEffect } from "react";
import { SUGGESTED_PROMPTS, handleMessage, buildProactiveSuggestions } from "./crustEngine";
import CrustLogo from "./CrustLogo";

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

export default function Crust({
  accounts,
  ranked,
  coverage,
  calendarEventCount,
  slackMessages,
  emails,
  onMarkWorked,
  onScheduleBlock,
}) {
  const [messages, setMessages] = useState([{ ...WELCOME, id: "welcome" }]);
  const [suggestionQueue, setSuggestionQueue] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    setSuggestionQueue(buildProactiveSuggestions({ accounts, coverage, calendarEventCount, slackMessages, emails }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSuggestion = suggestionQueue[0];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, currentSuggestion]);

  function pushMessage(msg) {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  }

  function send(text) {
    if (!text.trim()) return;
    const { reply, action, log } = handleMessage(text, {
      accounts,
      ranked,
      coverage,
      calendarEventCount,
      slackMessages,
      emails,
    });
    pushMessage({ role: "user", text });
    pushMessage({ role: "assistant", text: reply });
    if (log) pushMessage({ role: "assistant", log });
    setInput("");
    if (action?.type === "mark-worked") onMarkWorked(action.id);
    if (action?.type === "schedule-block") onScheduleBlock(action.event);
  }

  function approveSuggestion(s) {
    setSuggestionQueue((prev) => prev.filter((x) => x.id !== s.id));
    pushMessage({ role: "assistant", text: `Approved — ${s.approveLabel.toLowerCase()}.` });
    if (s.action.type === "mark-worked-bulk") {
      s.action.ids.forEach((id) => onMarkWorked(id));
      (s.logs || []).forEach((log) => pushMessage({ role: "assistant", log }));
    }
    if (s.action.type === "schedule-block") {
      // Approval is the acceptance — the tentative hold becomes a real block.
      onScheduleBlock({ ...s.action.event, pending: false });
    }
  }

  function dismissSuggestion(s) {
    setSuggestionQueue((prev) => prev.filter((x) => x.id !== s.id));
  }

  return (
    <div className="crust-main">
      <div className="crust-header">
        <CrustLogo size={22} />
        <span className="crust-header-title">Crust</span>
      </div>
      <div className="crust-thread" ref={scrollRef}>
        <div className="crust-thread-inner">
          {messages.map((m) => (
            <div key={m.id} className={`crust-msg crust-msg-${m.role}`}>
              {m.text}
              {m.log && <SalesforceLogCard log={m.log} />}
            </div>
          ))}
          {currentSuggestion && (
            <div key={currentSuggestion.id} className="crust-suggestion crust-suggestion-pop">
              <div className="crust-suggestion-label">Crust suggests</div>
              <div className="crust-suggestion-text">{currentSuggestion.text}</div>
              <div className="crust-suggestion-actions">
                <button className="crust-approve" onClick={() => approveSuggestion(currentSuggestion)}>
                  {currentSuggestion.approveLabel}
                </button>
                <button className="crust-dismiss" onClick={() => dismissSuggestion(currentSuggestion)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
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
