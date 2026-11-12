// Collector: reads new X posts that say "Sent from my Pumpfun App" and stores them in Supabase.
// Runs from the Vercel cron (vercel.json). Recent search only covers the last 7 days,
// so it must run at least once a week; daily is the plan.
const { env, configured, db, norm } = require("./_lib");

// X search ignores case and punctuation, so App / app / $App / @Pumpfun all match
const QUERY = '("sent from my pumpfun app" OR "sent from my pump.fun app" OR "sent from my pump fun app" OR "sent from my pumpfunapp") -is:retweet';
const MAX_PAGES = 5; // 500 posts per run at most: keeps the bill predictable

module.exports = async (req, res) => {
  if (env("CRON_SECRET") && req.headers.authorization !== "Bearer " + env("CRON_SECRET")) return res.status(401).json({ error: "unauthorized" });
  if (!configured() || !env("X_BEARER_TOKEN")) return res.status(200).json({ skipped: "not configured" });

  try {
    // only what is newer than the last stored post (since_id), so nothing is paid twice
    const last = await db("posts?select=id&order=created_at.desc&limit=1");
    const sinceId = last && last[0] && last[0].id;

    let next = null, pages = 0, stored = 0;
    do {
      const q = new URLSearchParams({
        query: QUERY, max_results: "100",
        expansions: "author_id",
        "tweet.fields": "created_at,public_metrics,author_id",
        "user.fields": "username,name,profile_image_url,created_at"
      });
      if (sinceId) q.set("since_id", sinceId);
      if (next) q.set("next_token", next);
      const r = await fetch("https://api.x.com/2/tweets/search/recent?" + q, { headers: { Authorization: "Bearer " + env("X_BEARER_TOKEN") } });
      if (!r.ok) throw new Error(`x ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json();
      const users = new Map(((j.includes && j.includes.users) || []).map((u) => [u.id, u]));
      const rows = (j.data || []).map((t) => {
        const u = users.get(t.author_id) || {};
        return {
          id: t.id, author_id: t.author_id, username: u.username || null, name: u.name || null,
          avatar: u.profile_image_url ? u.profile_image_url.replace("_normal.", "_bigger.") : null,
          author_created: u.created_at || null, created_at: t.created_at,
          text: t.text, text_norm: norm(t.text), likes: (t.public_metrics && t.public_metrics.like_count) || 0
        };
      });
      if (rows.length) { await db("posts?on_conflict=id", { method: "POST", body: rows, prefer: "resolution=merge-duplicates,return=minimal" }); stored += rows.length; }
      next = j.meta && j.meta.next_token;
    } while (next && ++pages < MAX_PAGES);

    res.status(200).json({ stored, since: sinceId || null });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
