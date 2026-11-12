// The best pump.fun callouts of the day and of the week (every coin), for the Feed.
//
// pump.fun only lets its own pages read them (servers get a Cloudflare challenge, other sites are refused),
// so they come from your browser: the "↻ Best callouts" bookmark (see /update) reads them on pump.fun,
// /update sends them here, and they are kept in Supabase (table kv, see supabase.sql).
//
//   GET  /api/callouts                  -> { updated, source, day: [...], week: [...] }
//   POST /api/callouts { secret, data } -> stores data. secret must match CALLOUTS_SECRET (Vercel env).
const { env, configured, db } = require("./_lib");

const KEY = "best-callouts";
const MAX = 50;
const isUrl = (u) => u == null || (typeof u === "string" && u.length <= 500 && /^https:\/\/[^\s"'<>]+$/.test(u));
const isStr = (s, n) => typeof s === "string" && s.length <= n;
const isNum = (n) => typeof n === "number" && isFinite(n);

function validItem(c) {
  return c && isStr(c.id, 80) && c.id && isStr(c.user, 80) && isStr(c.thesis, 300) &&
    (c.update == null || isStr(c.update, 300)) && (c.x == null || isStr(c.x, 40)) && isStr(c.wallet || "", 60) &&
    isUrl(c.avatar) && isStr(c.at || "", 40) && [c.rank, c.mcap, c.peak, c.pnl, c.likes].every(isNum) &&
    c.coin && isStr(c.coin.mint, 60) && isStr(c.coin.name || "", 60) && isStr(c.coin.symbol || "", 20) && isUrl(c.coin.image) && isNum(c.coin.mcap || 0);
}
function valid(d) {
  return d && Array.isArray(d.day) && Array.isArray(d.week) && d.day.length <= MAX && d.week.length <= MAX &&
    d.day.length + d.week.length > 0 && isStr(d.updated, 40) && d.day.concat(d.week).every(validItem);
}

module.exports = async (req, res) => {
  if (!configured()) return res.status(503).json({ error: "not configured" });

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
    if (!env("CALLOUTS_SECRET") || !body || body.secret !== env("CALLOUTS_SECRET")) return res.status(401).json({ error: "unauthorized" });
    const d = body.data;
    if (!valid(d)) return res.status(400).json({ error: "these don't look like pump.fun callouts" });
    const data = { updated: d.updated, source: "pump.fun best callouts", day: d.day, week: d.week };
    try {
      await db("kv?on_conflict=key", { method: "POST", body: [{ key: KEY, data, updated_at: new Date().toISOString() }], prefer: "resolution=merge-duplicates,return=minimal" });
      return res.status(200).json({ ok: true, day: d.day.length, week: d.week.length });
    } catch (e) {
      return res.status(500).json({ error: String(e.message || e) });
    }
  }

  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  try {
    const rows = await db(`kv?select=data&key=eq.${KEY}`);
    if (!rows || !rows.length) return res.status(404).json({ error: "no callouts yet" });
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
    return res.status(200).json(rows[0].data);
  } catch (e) {
    res.setHeader("Cache-Control", "public, s-maxage=30");
    return res.status(500).json({ error: String(e.message || e) });
  }
};
