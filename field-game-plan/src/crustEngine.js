// ---------------------------------------------------------------------------
// CRUST — scripted/pattern-matched assistant logic.
// In production this matching layer is replaced by an LLM with tool-calling
// over the same underlying functions (lookupAccounts, scheduleBlock, etc.).
// Everything here runs against the in-memory mock data, no network calls.
// ---------------------------------------------------------------------------

import { whyReason, COVERAGE_GOAL } from "./mockData";

const TIER_LABELS = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3", 4: "Tier 4", 5: "Tier 5" };

export const SUGGESTED_PROMPTS = [
  "Which accounts are going cold?",
  "What's my biggest coverage gap?",
  "Why is my #1 account ranked first?",
  "Schedule prospecting time tomorrow",
  "Show me my closest accounts",
  "Which accounts haven't been scored yet?",
  "What are my high-fit accounts going quiet?",
  "How many accounts have I worked today?",
  "Any Slack messages I should see?",
  "What's in my inbox?",
];

function personFrom(m) {
  return m.from.split(/[<(]/)[0].trim();
}

// Slack DMs and emails sometimes come from the same person about the same
// ask — only surface one proactive card per person so Crust doesn't nag twice.
function dedupeByPerson(items) {
  const seen = new Set();
  return items.filter((m) => {
    const key = personFrom(m).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slackSummary(slackMessages) {
  if (!slackMessages || slackMessages.length === 0) return "No new Slack messages right now.";
  return `You have ${slackMessages.length} relevant Slack message${slackMessages.length === 1 ? "" : "s"}:\n\n${slackMessages
    .map((m) => `• ${personFrom(m)} (${m.channel}) — "${m.text}"`)
    .join("\n")}`;
}

function emailSummary(emails) {
  if (!emails || emails.length === 0) return "Inbox is clear of anything time-sensitive.";
  return `${emails.length} email${emails.length === 1 ? "" : "s"} need attention:\n\n${emails
    .map((m) => `• ${personFrom(m)} — "${m.subject}"`)
    .join("\n")}`;
}

// Field-cluster accounts (close to the rep's in-person meeting) get logged as
// a Walk-in; everything else is logged as a Call — mirrors how the AE
// actually works the list today.
export function activityType(account) {
  return account.distanceFromMeeting <= 1.5 ? "Walk-in" : "Call";
}

function buildLogRecord(account) {
  const type = activityType(account);
  return {
    subject: `${type} — ${account.name}`,
    type,
    relatedTo: account.name,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function listAccounts(accounts, list, limit = 5, extra = (a) => `${a.daysSinceTouch}d since last touch`) {
  return list
    .slice(0, limit)
    .map((a) => `• ${a.name} (${TIER_LABELS[a.tier] || "Unscored"}) — ${extra(a)}`)
    .join("\n");
}

function coldAccounts(accounts) {
  const cold = accounts
    .filter((a) => a.tier != null && a.daysSinceTouch > 60 && !a.worked)
    .sort((a, b) => b.daysSinceTouch - a.daysSinceTouch);
  if (cold.length === 0) {
    return "Nothing is over 60 days cold right now — you're in good shape.";
  }
  return `${cold.length} accounts are going cold (60+ days, no activity):\n\n${listAccounts(accounts, cold)}${
    cold.length > 5 ? `\n…and ${cold.length - 5} more.` : ""
  }`;
}

function biggestGap(coverage) {
  const entries = Object.entries(coverage).map(([tier, pct]) => ({ tier: Number(tier), pct, gap: COVERAGE_GOAL - pct }));
  entries.sort((a, b) => b.gap - a.gap);
  const worst = entries[0];
  return `${TIER_LABELS[worst.tier]} is your biggest gap at ${worst.pct}% — ${worst.gap} points below the ${COVERAGE_GOAL}% goal. Want a few accounts to work today?`;
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
  return `${top.name} is ranked #1 because: ${whyReason(top)}. That mix of tier, days cold, and proximity to your next meeting gives it the highest priority score (${Math.round(top.score)}).`;
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

function closestAccounts(accounts) {
  const nearby = accounts
    .filter((a) => !a.worked)
    .sort((a, b) => a.distanceFromMeeting - b.distanceFromMeeting)
    .slice(0, 5);
  return `Your 5 closest unworked accounts to today's field meeting:\n\n${listAccounts(accounts, nearby, 5, (a) => `${a.distanceFromMeeting} mi away`)}`;
}

function unscoredAccounts(accounts) {
  const unscored = accounts.filter((a) => a.tier == null);
  if (unscored.length === 0) return "Every account in your list has a fit score — nothing unscored right now.";
  return `${unscored.length} accounts are still waiting on the fit-score model:\n\n${unscored
    .map((a) => `• ${a.name} — last touch ${a.daysSinceTouch}d ago`)
    .join("\n")}`;
}

function highFitGoingQuiet(accounts) {
  const targets = accounts
    .filter((a) => a.tier != null && a.fit >= 80 && a.daysSinceTouch > 30 && !a.worked)
    .sort((a, b) => b.fit - a.fit);
  if (targets.length === 0) return "All your high-fit accounts (80+) have been touched recently. Nice work.";
  return `${targets.length} high-fit accounts (80+ fit score) are starting to go quiet:\n\n${listAccounts(accounts, targets, 5)}`;
}

function workedToday(accounts) {
  const worked = accounts.filter((a) => a.worked);
  if (worked.length === 0) return "You haven't logged any activity yet today — want me to suggest where to start?";
  return `You've worked ${worked.length} account${worked.length === 1 ? "" : "s"} today: ${worked
    .map((a) => a.name)
    .join(", ")}.`;
}

function quickWins(accounts) {
  const targets = accounts
    .filter((a) => a.tier != null && a.daysSinceTouch < 14 && !a.worked && a.fit >= 70)
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 3);
  if (targets.length === 0) return "No obvious quick-win follow-ups right now — your warm accounts are already covered.";
  return `These accounts are warm and high-fit — good follow-up calls to close momentum:\n\n${listAccounts(accounts, targets, 3)}`;
}

function fieldClusterReminder(accounts) {
  const cluster = accounts.filter((a) => a.distanceFromMeeting <= 1.5 && !a.worked);
  if (cluster.length === 0) return "No unworked accounts left in today's field cluster.";
  return `You have ${cluster.length} unworked accounts within walking distance of today's field meeting:\n\n${listAccounts(
    accounts,
    cluster,
    5,
    (a) => `${a.distanceFromMeeting} mi away`
  )}`;
}

const SCHEDULE_TIME_SLOTS = ["8:00 AM", "8:30 AM", "5:00 PM", "5:30 PM"];

function buildPendingEvent(seed, title = "Prospecting block — booked by Crust") {
  const time = SCHEDULE_TIME_SLOTS[seed % SCHEDULE_TIME_SLOTS.length];
  return {
    id: `crust-${Date.now()}-${seed}`,
    time,
    endTime: null,
    type: "phone",
    title,
    pending: true,
  };
}

// Parses free text / chip clicks into an intent + response.
// Returns { reply, action, log } where action is one of:
//   null | { type: "mark-worked", id } | { type: "schedule-block", event }
// and log (when present) is a mocked Salesforce Task record to render inline.
export function handleMessage(text, ctx) {
  const { accounts, ranked, coverage, calendarEventCount, slackMessages, emails } = ctx;
  const t = text.trim().toLowerCase();

  if (/slack/.test(t)) {
    return { reply: slackSummary(slackMessages), action: null };
  }

  if (/email|inbox/.test(t)) {
    return { reply: emailSummary(emails), action: null };
  }

  if (/cold|stale|gone quiet/.test(t) && !/high.?fit/.test(t)) {
    return { reply: coldAccounts(accounts), action: null };
  }

  if (/high.?fit/.test(t)) {
    return { reply: highFitGoingQuiet(accounts), action: null };
  }

  if (/gap|goal|behind/.test(t)) {
    return { reply: biggestGap(coverage), action: null };
  }

  if (/suggest|who should i (call|work|prioritize)|what should i (do|work)/.test(t)) {
    return { reply: tierSuggestions(accounts, coverage), action: null };
  }

  if (/closest|nearby|near me|walking distance/.test(t)) {
    return { reply: closestAccounts(accounts), action: null };
  }

  if (/unscored|not (yet )?scored|fit.?score model/.test(t)) {
    return { reply: unscoredAccounts(accounts), action: null };
  }

  if (/quick win|momentum|warm (account|lead)/.test(t)) {
    return { reply: quickWins(accounts), action: null };
  }

  if (/field cluster|around (my|the) (1 ?pm|meeting)/.test(t)) {
    return { reply: fieldClusterReminder(accounts), action: null };
  }

  if (/how many.*worked|worked today|logged today/.test(t)) {
    return { reply: workedToday(accounts), action: null };
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
      reply: `Logged it — synced to Salesforce as a ${activityType(acct)}.`,
      action: { type: "mark-worked", id: acct.id },
      log: buildLogRecord(acct),
    };
  }

  if (/schedule|book.*time|prospecting time|block.*calendar/.test(t)) {
    const event = buildPendingEvent(calendarEventCount);
    return {
      reply: `I've requested a prospecting block at ${event.time} on your Google Calendar — pending your approval.`,
      action: { type: "schedule-block", event },
    };
  }

  return {
    reply:
      "I can help with coverage gaps, cold or high-fit accounts going quiet, nearby/walking-distance targets, unscored accounts, quick wins, ranking explanations, marking accounts worked, or scheduling prospecting time. Try one of the suggestions below, or ask me directly.",
    action: null,
  };
}

function meetingRequestSuggestions(slackMessages, emails, seedStart) {
  const requests = dedupeByPerson(
    [...(slackMessages || []), ...(emails || [])].filter((m) => m.type === "meeting-request")
  );
  let seed = seedStart;
  return requests.map((m) => {
    const person = personFrom(m);
    const ask = m.text || m.preview;
    const source = m.channel ? `Slack — ${m.channel}` : "email";
    const title = m.isProspect ? `Demo — ${person} (${m.product || "Toast"})` : `Meeting — ${person}`;
    const text = m.isProspect
      ? `${person} reached out over ${source} asking for a demo of ${m.product || "your product"}: "${ask}". Want me to hold a block on your calendar?`
      : `${person} asked about setting up time (${source}): "${ask}". Want me to hold a block on your calendar?`;
    return {
      id: `suggest-meeting-${m.id}`,
      text,
      approveLabel: m.isProspect ? "Book the demo" : "Book the meeting",
      action: { type: "schedule-block", event: buildPendingEvent(seed++, title) },
    };
  });
}

function deadlineSuggestions(slackMessages, emails, seedStart) {
  const requests = dedupeByPerson(
    [...(slackMessages || []), ...(emails || [])].filter((m) => m.type === "deadline")
  );
  let seed = seedStart;
  return requests.map((m) => {
    const person = personFrom(m);
    const ask = m.subject || m.text;
    return {
      id: `suggest-deadline-${m.id}`,
      text: `${person} needs "${ask}" by ${m.deadline}. Want me to block focus time and set a reminder so you stay on track?`,
      approveLabel: "Block focus time",
      action: { type: "schedule-block", event: buildPendingEvent(seed++, `Reminder — ${ask} (due ${m.deadline})`) },
    };
  });
}

// Proactive suggestions: Crust surfaces these unprompted (on load) as cards
// the AE must approve or dismiss, rather than waiting to be asked. Each
// suggestion carries the action to run on approval.
export function buildProactiveSuggestions(ctx) {
  const { accounts, coverage, calendarEventCount, slackMessages, emails } = ctx;
  const suggestions = [];
  let seed = calendarEventCount;

  // 1. Biggest coverage-gap tier
  const entries = Object.entries(coverage).map(([tier, pct]) => ({ tier: Number(tier), pct }));
  entries.sort((a, b) => a.pct - b.pct);
  const worstTier = entries[0].tier;
  const gapTargets = accounts
    .filter((a) => a.tier === worstTier && !a.worked)
    .sort((a, b) => b.daysSinceTouch - a.daysSinceTouch)
    .slice(0, 3);
  if (gapTargets.length > 0) {
    suggestions.push({
      id: `suggest-tier-${worstTier}`,
      text: `${TIER_LABELS[worstTier]} is your biggest coverage gap (${coverage[worstTier]}% vs. ${COVERAGE_GOAL}% goal). I'd suggest working ${gapTargets.map((a) => a.name).join(", ")} today.`,
      approveLabel: `Mark ${gapTargets.length} as worked`,
      action: { type: "mark-worked-bulk", ids: gapTargets.map((a) => a.id) },
      logs: gapTargets.map(buildLogRecord),
    });
  }

  // 2. Severely cold accounts — book a block to work through them
  const veryCold = accounts.filter((a) => a.tier != null && a.daysSinceTouch > 90 && !a.worked);
  if (veryCold.length > 0) {
    suggestions.push({
      id: "suggest-schedule-cold",
      text: `You have ${veryCold.length} accounts that have gone cold for 90+ days. I'd like to book a prospecting block to work through them.`,
      approveLabel: "Book prospecting block",
      action: { type: "schedule-block", event: buildPendingEvent(seed++) },
    });
  }

  // 3. High-fit accounts starting to go quiet — protect the relationship
  const highFitQuiet = accounts
    .filter((a) => a.tier != null && a.fit >= 85 && a.daysSinceTouch > 30 && !a.worked)
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 3);
  if (highFitQuiet.length > 0) {
    suggestions.push({
      id: "suggest-high-fit",
      text: `${highFitQuiet.map((a) => a.name).join(", ")} ${highFitQuiet.length === 1 ? "is" : "are"} high-fit (85+) but going quiet. Worth reconnecting before they slip.`,
      approveLabel: `Mark ${highFitQuiet.length} as worked`,
      action: { type: "mark-worked-bulk", ids: highFitQuiet.map((a) => a.id) },
      logs: highFitQuiet.map(buildLogRecord),
    });
  }

  // 4. Field cluster — unworked accounts within walking distance of today's meeting
  const cluster = accounts.filter((a) => a.distanceFromMeeting <= 1.5 && !a.worked).slice(0, 3);
  if (cluster.length > 0) {
    suggestions.push({
      id: "suggest-cluster",
      text: `${cluster.length} accounts are within walking distance of today's field meeting: ${cluster.map((a) => a.name).join(", ")}. Want to add them as walk-in stops?`,
      approveLabel: `Mark ${cluster.length} as worked`,
      action: { type: "mark-worked-bulk", ids: cluster.map((a) => a.id) },
      logs: cluster.map(buildLogRecord),
    });
  }

  // 5. Quick-win follow-ups — warm, high-fit accounts
  const quickWinTargets = accounts
    .filter((a) => a.tier != null && a.daysSinceTouch < 14 && !a.worked && a.fit >= 70)
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 3);
  if (quickWinTargets.length > 0) {
    suggestions.push({
      id: "suggest-quick-win",
      text: `${quickWinTargets.map((a) => a.name).join(", ")} are warm and high-fit — good quick-win follow-ups to close today.`,
      approveLabel: `Mark ${quickWinTargets.length} as worked`,
      action: { type: "mark-worked-bulk", ids: quickWinTargets.map((a) => a.id) },
      logs: quickWinTargets.map(buildLogRecord),
    });
  }

  // 6. Newly onboarded / unscored accounts needing first outreach
  const unscored = accounts.filter((a) => a.tier == null && !a.worked).slice(0, 3);
  if (unscored.length > 0) {
    suggestions.push({
      id: "suggest-unscored",
      text: `${unscored.map((a) => a.name).join(", ")} ${unscored.length === 1 ? "is a" : "are"} newly onboarded and still unscored. I'd recommend booking time for first outreach before they cool off.`,
      approveLabel: "Book prospecting block",
      action: { type: "schedule-block", event: buildPendingEvent(seed++, "First outreach block — booked by Crust") },
    });
  }

  // 7. Manager/colleague deadlines from Slack or email — block focus time
  const deadlines = deadlineSuggestions(slackMessages, emails, seed);
  seed += deadlines.length;
  suggestions.push(...deadlines);

  // 8. Meeting requests from Slack or email — hold time on the calendar
  suggestions.push(...meetingRequestSuggestions(slackMessages, emails, seed));

  return suggestions;
}
