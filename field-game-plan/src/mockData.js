// ---------------------------------------------------------------------------
// MOCK DATA LAYER
// In production this module is replaced by live calls:
//   - Account / tier / fit-score data  -> Salesforce -> warehouse -> Sigma API
//   - Coverage % per tier              -> Sigma semantic model (scheduled query)
//   - Calendar events                  -> Google Calendar API + Chili Piper API
//   - "Mark as worked" write-back      -> Salesforce Activity/Task object (REST)
// Everything below is static so the prototype runs with zero network calls.
// ---------------------------------------------------------------------------

export const REP_NAME = "Yaseen";

// Fixed reference point for today's field meeting (Hungry Joe's, Inglewood)
export const FIELD_MEETING = {
  id: "meeting-1",
  time: "1:00 PM",
  type: "field",
  title: "In-person demo",
  account: "Hungry Joe's Burgers",
  location: "Inglewood, CA",
  lat: 33.9617,
  lng: -118.3531,
};

export const CALENDAR_EVENTS = [
  { id: "c1", time: "9:00 AM", endTime: "9:30 AM", type: "phone", title: "Pipeline review w/ manager" },
  { id: "c2", time: "10:00 AM", endTime: "10:30 AM", type: "zoom", title: "Demo — Tumby's Pizza HQ" },
  { id: "c3", time: "11:00 AM", endTime: "12:00 PM", type: "phone", title: "Call block — cold outreach" },
  {
    id: "c4",
    time: "1:00 PM",
    endTime: "2:00 PM",
    type: "field",
    title: "In-person demo — Hungry Joe's Burgers",
    location: "Inglewood, CA",
  },
  { id: "c5", time: "2:30 PM", endTime: "3:00 PM", type: "phone", title: "Follow-up — Golden Bird Chicken" },
  { id: "c6", time: "4:00 PM", endTime: "4:30 PM", type: "zoom", title: "Internal deal desk sync" },
];

export const SLACK_MESSAGES = [
  {
    id: "slack-1",
    from: "Dana Reyes (Manager)",
    channel: "DM",
    type: "deadline",
    text: "Can you get me the Tier 4 coverage plan by Friday? Need it ahead of the QBR.",
    deadline: "Fri",
    time: "8:42 AM",
  },
  {
    id: "slack-2",
    from: "Marcus Lee (Tumby's Pizza HQ)",
    channel: "#tumbys-pizza-deal",
    type: "meeting-request",
    text: "Hey, can we grab 20 min this week to walk through pricing? Whenever works for you.",
    time: "9:15 AM",
  },
];

export const EMAILS = [
  {
    id: "email-1",
    from: "Priya Shah <priya.shah@toasttab.com>",
    subject: "QBR prep — need your Tier 4 numbers",
    type: "deadline",
    preview: "Following up on Slack — can you send the Tier 4 coverage plan by EOD Friday?",
    deadline: "Fri",
    time: "8:50 AM",
  },
  {
    id: "email-2",
    from: "Sam Ortiz <sam@goldenbirdchicken.com>",
    subject: "Re: Pricing walkthrough",
    type: "meeting-request",
    preview: "Would love to set up a quick call this week to go over pricing options.",
    time: "9:35 AM",
  },
];

// 90% coverage goal applies to every tier.
export const COVERAGE_GOAL = 90;

// Starting coverage % per tier (accounts with activity in trailing 60 days / total accounts in tier)
export const STARTING_COVERAGE = {
  1: 68,
  2: 40,
  3: 18,
  4: 1,
  5: 1,
};

// Haversine distance in miles between two lat/lng points
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Raw account roster. lat/lng are loosely real LA-area coordinates.
// A cluster of accounts sits within ~1.5mi of the Inglewood field meeting
// so the routing/map feature has a believable cluster to show.
const RAW_ACCOUNTS = [
  // --- Inglewood field cluster (near 1 PM meeting) ---
  { name: "Hungry Joe's Burgers", tier: 1, fit: 92, daysSinceTouch: 61, lat: 33.9617, lng: -118.3531 },
  { name: "VegainzLA", tier: 1, fit: 88, daysSinceTouch: 75, lat: 33.965, lng: -118.349 },
  { name: "Golden Bird Chicken", tier: 2, fit: 81, daysSinceTouch: 64, lat: 33.958, lng: -118.358 },
  { name: "Tumby's Pizza", tier: 1, fit: 90, daysSinceTouch: 12, lat: 33.97, lng: -118.345 },
  { name: "Banadir Somali Restaurant", tier: 2, fit: 76, daysSinceTouch: 95, lat: 33.955, lng: -118.36 },
  { name: "Woody's BBQ", tier: 3, fit: 64, daysSinceTouch: 70, lat: 33.963, lng: -118.352 },
  { name: "Tom's Jr", tier: 2, fit: 79, daysSinceTouch: 41, lat: 33.959, lng: -118.34 },
  { name: "Inglewood Taco House", tier: 3, fit: 58, daysSinceTouch: 102, lat: 33.966, lng: -118.357 },
  { name: "Crenshaw Soul Kitchen", tier: 2, fit: 73, daysSinceTouch: 67, lat: 33.971, lng: -118.338 },
  { name: "La Cima Mariscos", tier: 1, fit: 85, daysSinceTouch: 58, lat: 33.953, lng: -118.347 },

  // --- Mid-city / Downtown LA spread ---
  { name: "Roscoe's Chicken & Waffles", tier: 1, fit: 94, daysSinceTouch: 9, lat: 34.0522, lng: -118.3088 },
  { name: "Pico Bowl Co.", tier: 3, fit: 55, daysSinceTouch: 31, lat: 34.0467, lng: -118.3209 },
  { name: "Downtown Dim Sum Hall", tier: 2, fit: 71, daysSinceTouch: 14, lat: 34.0407, lng: -118.2468 },
  { name: "Arts District Coffee Bar", tier: 4, fit: 38, daysSinceTouch: 130, lat: 34.0398, lng: -118.2335 },
  { name: "Olympic Korean BBQ", tier: 1, fit: 87, daysSinceTouch: 22, lat: 34.0589, lng: -118.3007 },
  { name: "Westlake Pupuseria", tier: 3, fit: 52, daysSinceTouch: 88, lat: 34.0584, lng: -118.2776 },
  { name: "Echo Park Taco Stand", tier: 4, fit: 33, daysSinceTouch: 145, lat: 34.0782, lng: -118.2606 },
  { name: "Silver Lake Vegan Cafe", tier: 3, fit: 60, daysSinceTouch: 49, lat: 34.0869, lng: -118.2702 },

  // --- Westside ---
  { name: "Venice Beach Grill", tier: 2, fit: 78, daysSinceTouch: 7, lat: 33.985, lng: -118.4695 },
  { name: "Santa Monica Poke Co.", tier: 1, fit: 91, daysSinceTouch: 18, lat: 34.0195, lng: -118.4912 },
  { name: "Culver City Ramen", tier: 2, fit: 74, daysSinceTouch: 53, lat: 34.0211, lng: -118.3965 },
  { name: "Marina Sushi Bar", tier: 3, fit: 57, daysSinceTouch: 99, lat: 33.9803, lng: -118.4517 },
  { name: "Mar Vista Bagelry", tier: 4, fit: 35, daysSinceTouch: 160, lat: 34.0007, lng: -118.4296 },
  { name: "Brentwood Brunch House", tier: 1, fit: 83, daysSinceTouch: 5, lat: 34.0524, lng: -118.4738 },

  // --- South Bay ---
  { name: "Hawthorne Wing Spot", tier: 2, fit: 69, daysSinceTouch: 62, lat: 33.9164, lng: -118.3526 },
  { name: "Torrance Curry House", tier: 3, fit: 54, daysSinceTouch: 73, lat: 33.8358, lng: -118.3406 },
  { name: "Redondo Fish Shack", tier: 2, fit: 72, daysSinceTouch: 29, lat: 33.8492, lng: -118.3884 },
  { name: "Gardena Donut Co.", tier: 4, fit: 31, daysSinceTouch: 200, lat: 33.8883, lng: -118.3089 },
  { name: "Carson Carnitas", tier: 3, fit: 49, daysSinceTouch: 84, lat: 33.8317, lng: -118.2817 },

  // --- San Fernando Valley ---
  { name: "Sherman Oaks Deli", tier: 1, fit: 86, daysSinceTouch: 11, lat: 34.1509, lng: -118.4489 },
  { name: "Van Nuys Pho House", tier: 2, fit: 66, daysSinceTouch: 56, lat: 34.1866, lng: -118.4487 },
  { name: "Burbank Burger Bros", tier: 3, fit: 51, daysSinceTouch: 91, lat: 34.1808, lng: -118.3089 },
  { name: "Studio City Smokehouse", tier: 1, fit: 89, daysSinceTouch: 39, lat: 34.1395, lng: -118.3964 },
  { name: "Reseda Wing King", tier: 4, fit: 28, daysSinceTouch: 175, lat: 34.2011, lng: -118.535 },
  { name: "Encino Sushi Den", tier: 2, fit: 70, daysSinceTouch: 47, lat: 34.1581, lng: -118.5004 },

  // --- East LA / SGV ---
  { name: "Alhambra Hot Pot", tier: 2, fit: 75, daysSinceTouch: 33, lat: 34.0953, lng: -118.1270 },
  { name: "Monterey Park Dumpling Co.", tier: 1, fit: 84, daysSinceTouch: 16, lat: 34.0625, lng: -118.1228 },
  { name: "Boyle Heights Birria", tier: 3, fit: 59, daysSinceTouch: 80, lat: 34.0339, lng: -118.2079 },
  { name: "El Sereno Taqueria", tier: 4, fit: 30, daysSinceTouch: 190, lat: 34.0775, lng: -118.1759 },

  // --- South LA ---
  { name: "Watts Soul Food", tier: 3, fit: 48, daysSinceTouch: 109, lat: 33.9425, lng: -118.2468 },
  { name: "Compton Catfish House", tier: 4, fit: 27, daysSinceTouch: 220, lat: 33.8958, lng: -118.2201 },
  { name: "Leimert Park Jazz Cafe", tier: 2, fit: 68, daysSinceTouch: 44, lat: 33.9789, lng: -118.3284 },

  // --- Long Beach ---
  { name: "Long Beach Lobster Shack", tier: 2, fit: 77, daysSinceTouch: 26, lat: 33.7701, lng: -118.1937 },
  { name: "Belmont Shore Bistro", tier: 1, fit: 88, daysSinceTouch: 6, lat: 33.7596, lng: -118.1428 },
  { name: "Signal Hill Smoke Pit", tier: 3, fit: 53, daysSinceTouch: 97, lat: 33.8044, lng: -118.1670 },

  // --- Null fit-score bucket (newly onboarded / not yet scored) ---
  { name: "New Spot — Larchmont Bowls", tier: null, fit: null, daysSinceTouch: 3, lat: 34.0763, lng: -118.3251 },
  { name: "New Spot — Eagle Rock Eatery", tier: null, fit: null, daysSinceTouch: 8, lat: 34.1397, lng: -118.2072 },
  { name: "New Spot — Highland Park Cafe", tier: null, fit: null, daysSinceTouch: 1, lat: 34.1141, lng: -118.1924 },
];

export function buildAccounts() {
  return RAW_ACCOUNTS.map((a, i) => {
    const distance = distanceMiles(FIELD_MEETING.lat, FIELD_MEETING.lng, a.lat, a.lng);
    return {
      id: `acct-${i + 1}`,
      ...a,
      distanceFromMeeting: Math.round(distance * 10) / 10,
      worked: false,
    };
  });
}

export function touchColor(days) {
  if (days < 14) return "green";
  if (days <= 60) return "yellow";
  if (days <= 90) return "yellow";
  return "red";
}

// Priority score: tier weight + fit score + cold-touch weight + activity-gap flag + proximity boost
export function scoreAccount(account) {
  if (account.tier == null) return -1; // null-fit accounts sit in their own bucket, not ranked
  const tierWeight = (6 - account.tier) * 12; // tier 1 = 60, tier 5 = 12
  const fitWeight = (account.fit || 0) * 0.4;
  const coldWeight = Math.min(account.daysSinceTouch, 200) * 0.5;
  const activityGapBonus = account.daysSinceTouch > 60 ? 25 : 0;
  const proximityBoost = account.distanceFromMeeting <= 1.5 ? 30 : account.distanceFromMeeting <= 3 ? 10 : 0;
  return tierWeight + fitWeight + coldWeight + activityGapBonus + proximityBoost;
}

export function whyReason(account) {
  const reasons = [];
  if (account.tier) reasons.push(`Tier ${account.tier}`);
  if (account.daysSinceTouch > 60) reasons.push(`no activity in ${account.daysSinceTouch} days`);
  else if (account.daysSinceTouch > 30) reasons.push(`going cold (${account.daysSinceTouch}d)`);
  if (account.distanceFromMeeting <= 1.5) {
    reasons.push(`${account.distanceFromMeeting} mi from your 1 PM — close your coverage gap`);
  } else {
    reasons.push(`${account.distanceFromMeeting} mi from your 1 PM`);
  }
  return reasons.join(", ");
}
