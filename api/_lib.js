// Shared code for the X leaderboard ("Sent from my Pumpfun App" bagworkers).
// Files starting with "_" are not routes on Vercel.
//
// Environment variables (Vercel > Project > Settings > Environment Variables):
//   X_BEARER_TOKEN        X API bearer token (pay-per-use plan)
//   SUPABASE_URL          https://<project>.supabase.co
//   SUPABASE_SERVICE_KEY  the service_role key (server only, never in the page)
//   CRON_SECRET           any long random string; Vercel sends it to the collector

const env = (k) => (process.env[k] || "").trim();
const configured = () => !!(env("SUPABASE_URL") && env("SUPABASE_SERVICE_KEY"));

// Supabase REST (PostgREST), no SDK needed
async function db(path, { method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: env("SUPABASE_SERVICE_KEY"),
    Authorization: "Bearer " + env("SUPABASE_SERVICE_KEY"),
    "Content-Type": "application/json"
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(env("SUPABASE_URL").replace(/\/$/, "") + "/rest/v1/" + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  // Supabase answers 201 with an empty body on inserts (return=minimal): only parse when there is a body
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// Same text posted twice by the same account only counts once: compare without case, links, mentions, emoji or punctuation
const norm = (s) => String(s || "").toLowerCase()
  .replace(/https?:\/\/\S+/g, "").replace(/@\w+/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const MAX_PER_DAY = 15;
const MIN_ACCOUNT_DAYS = 30;
const PERIODS = { day: 864e5, week: 7 * 864e5, all: Infinity };

// rows: { author_id, username, name, avatar, author_created, created_at, text_norm }
function leaderboard(rows, period = "week", now = Date.now(), limit = 50) {
  const span = PERIODS[period] || PERIODS.week;
  const byAuthor = new Map();
  for (const p of rows) {
    const t = Date.parse(p.created_at);
    if (!(now - t <= span)) continue;
    // fresh accounts are mostly bots
    if (p.author_created && Date.parse(p.created_at) - Date.parse(p.author_created) < MIN_ACCOUNT_DAYS * 864e5) continue;
    let a = byAuthor.get(p.author_id);
    if (!a) byAuthor.set(p.author_id, (a = { username: p.username, name: p.name, avatar: p.avatar, texts: new Set(), days: new Map(), count: 0, last: 0 }));
    if (a.texts.has(p.text_norm)) continue;
    a.texts.add(p.text_norm);
    const day = p.created_at.slice(0, 10), n = a.days.get(day) || 0;
    if (n >= MAX_PER_DAY) continue;
    a.days.set(day, n + 1);
    a.count++;
    if (t > a.last) { a.last = t; a.username = p.username; a.name = p.name; a.avatar = p.avatar; }
  }
  return [...byAuthor.values()]
    .sort((x, y) => y.count - x.count || y.last - x.last)
    .slice(0, limit)
    .map((a, i) => ({ rank: i + 1, username: a.username, name: a.name, avatar: a.avatar, count: a.count }));
}

module.exports = { env, configured, db, norm, leaderboard, PERIODS };
