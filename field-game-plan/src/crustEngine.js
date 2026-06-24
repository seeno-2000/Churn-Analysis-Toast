// ---------------------------------------------------------------------------
// CRUST — scripted/pattern-matched assistant logic.
// In production this matching layer is replaced by an LLM with tool-calling
// over the same underlying functions (lookupAccounts, scheduleBlock, etc.).
// Everything here runs against the in-memory mock data, no network calls.
// ---------------------------------------------------------------------------

import { touchColor, whyReason, COVERAGE_GOAL } from "./mockData";

const TIER_LABELS = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3", 4: "Tier 4", 5: "Tier 5" };

export const SUGGESTED_PROMPTS = [
  "Which accounts are going cold?",
  "What's my biggest coverage gap?",
  "Why is my #1 account ranked first?",
  "Schedule prospecting time tomorrow",
];

function listAccounts(accounts, list, limit = 5) {
  return list
    .slice(0, limit)
    .map((a) => `• ${a.name} (${TIER_LABELS[a.tier] || "Unscored"}) — ${a.daysSinceTouch}d since last touch`)
    .join("\n");
}

function coldAccounts(accounts) {
  const cold = accounts
    .filter((a) => a.tier != null && a.daysSinceTouch > 60 && !a.worked)
    .sort((a, b) => b.daysSinceTouch - a.daysSinceTouch);
  if (cold.length === 0) {
    return "Nice — nothing is over 60 days cold right now. Your coverage is in good shape.";
  }
  return `You've got ${cold.length} accounts going cold (60+ days, no activity):\n\n${listAccounts(accounts, cold)}${
    cold.length > 5 ? `\n…and ${cold.length - 5} more.` : ""
  }`;
}

function biggestGap(coverage) {
  const entries = Object.entries(coverage).map(([tier, pct]) => ({ tier: Number(tier), pct, gap: COVERAGE_GOAL - pct }));
  entries.sort((a, b) => b.gap - a.gap);
  const worst = entries[0];
  return `Your biggest coverage gap is ${TIER_LABELS[worst.tier]} at ${worst.pct}% — that's ${worst.gap} points below the ${COVERAGE_GOAL}% goal. Want me to suggest ${TIER_LABELS[worst.tier]} accounts to work today?`;
}

function tierSuggestions(accounts, coverage) {
  const entries = Object.entries(coverage).map(([tier, pct]) => ({ tier: Number(tier), pct }));
  entries.sort((a, b) => a.pct - b.pct);
  const worstTier = entries[0].tier;
  const targets = accounts
    .filter((a) => a.tier === worstTier && !a.worked)
    .sort((a, b) => b.daysSinceTouch - a.daysSinceTouch)
    .slice(0, 3);
  if (targets.length === 0) return `All your ${TIER_LABELS[worstTier]} accounts are already worked today.`;
  return `Here are ${targets.length} ${TIER_LABELS[worstTier]} accounts to close that gap:\n\n${listAccounts(accounts, targets, 3)}`;
}

function explainTopRank(ranked) {
  if (ranked.length === 0) return "I don't see any ranked accounts yet.";
  const top = ranked[0];
  return `${top.name} is ranked #1 because: ${whyReason(top)}. That combination of tier, days cold, and proximity to your 1 PM gives it the highest priority score (${Math.round(top.score)}).`;
}

function explainAccount(accounts, ranked, name) {
  const lower = name.toLowerCase();
  const acct = accounts.find((a) => a.name.toLowerCase().includes(lower));
  if (!acct) return `I couldn't find an account matching "${name}".`;
  const rankIdx = ranked.findIndex((a) => a.id === acct.id);
  const rankText = rankIdx >= 0 ? `It's ranked #${rankIdx + 1} on your list. ` : "";
  return `${rankText}${whyReason(acct)}.`;
}

function findWorkMatch(accounts, name) {
  const lower = name.toLowerCase();
  return accounts.find((a) => a.name.toLowerCase().includes(lower) && !a.worked);
}

const SCHEDULE_TIME_SLOTS = ["8:00 AM", "8:30 AM", "5:00 PM", "5:30 PM"];

function buildPendingEvent(seed) {
  const time = SCHEDULE_TIME_SLOTS[seed % SCHEDULE_TIME_SLOTS.length];
  return {
    id: `crust-${Date.now()}`,
    time,
    endTime: null,
    type: "phone",
    title: "Prospecting block — booked by Crust",
    pending: true,
  };
}

// Parses free text / chip clicks into an intent + response.
// Returns { reply, action } where action is one of:
//   null | { type: "mark-worked", id } | { type: "schedule-block" }
export function handleMessage(text, ctx) {
  const { accounts, ranked, coverage, calendarEventCount } = ctx;
  const t = text.trim().toLowerCase();

  if (/cold|stale|gone quiet/.test(t)) {
    return { reply: coldAccounts(accounts), action: null };
  }

  if (/gap|goal|behind/.test(t)) {
    return { reply: biggestGap(coverage), action: null };
  }

  if (/suggest|who should i (call|work|prioritize)|what should i (do|work)/.test(t)) {
    return { reply: tierSuggestions(accounts, coverage), action: null };
  }

  if (/ranked first|#1|top account|why is my/.test(t)) {
    return { reply: explainTopRank(ranked), action: null };
  }

  const explainMatch = t.match(/why (?:is|was) (.+?) ranked/);
  if (explainMatch) {
    return { reply: explainAccount(accounts, ranked, explainMatch[1]), action: null };
  }

  const markMatch = t.match(/mark (.+?) (?:as )?worked/);
  if (markMatch) {
    const acct = findWorkMatch(accounts, markMatch[1]);
    if (!acct) {
      return { reply: `I couldn't find an unworked account matching "${markMatch[1]}".`, action: null };
    }
    return {
      reply: `Done — logged a touch on ${acct.name} and bumped ${TIER_LABELS[acct.tier] || "its"} coverage.`,
      action: { type: "mark-worked", id: acct.id },
    };
  }

  if (/schedule|book.*time|prospecting time|block.*calendar/.test(t)) {
    const event = buildPendingEvent(calendarEventCount);
    return {
      reply: `I've requested a prospecting block at ${event.time} on your Google Calendar — it's pending your approval, check the calendar strip above.`,
      action: { type: "schedule-block", event },
    };
  }

  return {
    reply:
      "I can help with coverage gaps, cold accounts, ranking explanations, marking accounts worked, or scheduling prospecting time. Try one of the suggestions below, or ask me directly.",
    action: null,
  };
}
