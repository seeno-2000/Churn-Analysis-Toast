import { useState, useRef, useEffect } from "react";
import { SUGGESTED_PROMPTS, handleMessage } from "./crustEngine";

const WELCOME = {
  role: "assistant",
  text: "Hey! I'm Crust 🍞 — ask me about coverage gaps, cold accounts, or rankings, and I can mark accounts worked or book prospecting time for you.",
};

export default function Crust({ accounts, ranked, coverage, calendarEventCount, onMarkWorked, onScheduleBlock }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text) {
    if (!text.trim()) return;
    const { reply, action } = handleMessage(text, { accounts, ranked, coverage, calendarEventCount });
    setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", text: reply }]);
    setInput("");
    if (action?.type === "mark-worked") onMarkWorked(action.id);
    if (action?.type === "schedule-block") onScheduleBlock(action.event);
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
