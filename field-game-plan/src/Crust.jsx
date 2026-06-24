import { useState, useRef, useEffect } from "react";
import { SUGGESTED_PROMPTS, handleMessage, buildProactiveSuggestions } from "./crustEngine";

const WELCOME = {
  role: "assistant",
  text: "Hey! I'm Crust 🍞 — I keep an eye on your coverage and calendar, and I'll flag things for you to approve. You can also ask me anything directly.",
};

export default function Crust({ accounts, ranked, coverage, calendarEventCount, onMarkWorked, onScheduleBlock }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([WELCOME]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const proactive = buildProactiveSuggestions({ accounts, coverage, calendarEventCount });
    setSuggestions(proactive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, suggestions]);

  function send(text) {
    if (!text.trim()) return;
    const { reply, action } = handleMessage(text, { accounts, ranked, coverage, calendarEventCount });
    setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", text: reply }]);
    setInput("");
    if (action?.type === "mark-worked") onMarkWorked(action.id);
    if (action?.type === "schedule-block") onScheduleBlock(action.event);
  }

  function approveSuggestion(s) {
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    setMessages((prev) => [...prev, { role: "assistant", text: `✓ Approved — ${s.approveLabel.toLowerCase()}.` }]);
    if (s.action.type === "mark-worked-bulk") {
      s.action.ids.forEach((id) => onMarkWorked(id));
    }
    if (s.action.type === "schedule-block") {
      onScheduleBlock(s.action.event);
    }
  }

  function dismissSuggestion(s) {
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  return (
    <div className={`crust-panel ${open ? "open" : "closed"}`}>
      <button className="crust-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "→" : "🍞"}
      </button>
      {open && (
        <div className="crust-body">
          <div className="crust-header">
            <span className="crust-avatar">🍞</span>
            <div>
              <div className="crust-name">Crust</div>
              <div className="crust-sub">Your prospecting assistant</div>
            </div>
          </div>

          <div className="crust-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`crust-msg crust-msg-${m.role}`}>
                {m.text}
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
      )}
    </div>
  );
}
