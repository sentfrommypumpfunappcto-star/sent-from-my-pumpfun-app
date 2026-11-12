// Feed: a timeline of signatures. Memes rendered by the Studio, real trades from the chain,
// milestones. Plus the stories row and its viewer.
(() => {
  const S = window.SFM;
  const { $, $$, esc, usd, short, ago, haptic, reduce } = S;
  const I = S.IDEAS || {};

  // =====================================================================
  // Feed
  // =====================================================================
  const POSTS = [
    { u: "trench_resident", c: "#86efac", body: "told my mom. she took it well.", meme: { tpl: "mail", theme: "light", fmt: "square", data: I.mail[1] }, likes: 214, rp: 38 },
    { u: "streak_keeper", c: "#fcd34d", body: "screen time report came in. no comment.", meme: { tpl: "screentime", theme: "dark", fmt: "portrait", data: I.screentime[1] }, likes: 97, rp: 12 },
    { u: "anon", c: "#93c5fd", body: "Every cycle has a signature.\nThis one is ours.", likes: 431, rp: 76 },
    { u: "one_more", c: "#f9a8d4", body: "3:07 am grocery run", meme: { tpl: "receipt", theme: "light", fmt: "portrait", data: I.receipt[1] }, likes: 158, rp: 21 },
    { u: "cross_chainer", c: "#c4b5fd", body: "can't pick up, busy", meme: { tpl: "call", theme: "dark", fmt: "portrait", data: I.call[2] }, likes: 302, rp: 44 },
    { u: "airdrop_enjoyer", c: "#5eead4", body: "accept it.", meme: { tpl: "airdrop", theme: "light", fmt: "square", data: I.airdrop[2] }, likes: 188, rp: 30 },
    { u: "3_07_am", c: "#fdba74", body: "the whole roadmap", meme: { tpl: "statement", theme: "dark", fmt: "square", data: I.statement[2] }, likes: 520, rp: 133 },
    { u: "list_maker", c: "#fca5a5", body: "today's to-do", meme: { tpl: "notes", theme: "light", fmt: "portrait", data: I.notes[0] }, likes: 141, rp: 17 },
    { u: "searcher", c: "#a5b4fc", body: "google knows", meme: { tpl: "search", theme: "dark", fmt: "square", data: I.search[0] }, likes: 266, rp: 29 }
  ];
  const ICON = {
    repost: '<svg viewBox="0 0 24 24"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
    like: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
    open: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
  };
  const AR = { square: "1", portrait: "4 / 5", landscape: "16 / 9" };
  // memes are drawn lazily; until then the slot shows its own surface through a transparent pixel
  const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const sig = '<span class="sig"><img src="assets/logo.png" alt="">Sent from my Pumpfun App</span>';

  // a small symmetric identicon so every wallet gets its own face
  function ident(addr) {
    let h = 0; for (const ch of addr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const hue = h % 360; let cells = "";
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
      h = (h * 1103515245 + 12345) >>> 0;
      if (h & 0x10000) { cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`; if (x < 2) cells += `<rect x="${4 - x}" y="${y}" width="1" height="1"/>`; }
    }
    return `<svg class="fi-ident" viewBox="-1 -1 7 7" aria-hidden="true"><rect x="-1" y="-1" width="7" height="7" fill="hsl(${hue} 30% 16%)"/><g fill="hsl(${hue} 70% 65%)">${cells}</g></svg>`;
  }
  // m: index of the post's meme in MEDIA (what the lazy loader draws)
  const postHTML = (p, i, m) => `
    <article class="fi">
      <span class="fi-av" style="background:${p.c}">${esc(p.u[0].toUpperCase())}</span>
      <div>
        <div class="fi-top"><b>${esc(p.u)}</b><span>@${esc(p.u)}</span></div>
        <p>${esc(p.body)}</p>
        ${p.meme ? `<span class="fi-media" style="--ar:${AR[p.meme.fmt]}"><img data-meme="${m}" src="${PIXEL}" alt="Meme: ${esc(p.body)}"></span>` : ""}
        ${sig}
        <div class="fi-acts">
          <button type="button" aria-label="Repost">${ICON.repost}<span>${p.rp}</span></button>
          <button type="button" aria-label="Like" data-like="${i}">${ICON.like}<span>${p.likes}</span></button>
          <button type="button" aria-label="Copy the text" data-copy-post="${i}">${ICON.share}</button>
          <button type="button" class="remix" data-remix="${i}">Remix</button>
        </div>
      </div>
    </article>`;
  const tradeHTML = (t, fresh) => `
    <a class="fi ev${fresh ? " new" : ""}" href="https://solscan.io/tx/${esc(t.id)}" target="_blank" rel="noopener" data-trade="${esc(t.id)}">
      ${ident(t.from)}
      <div>
        <p><b>${short(t.from)}</b> ${t.kind === "buy" ? "sent" : "took"} <b class="${t.kind === "buy" ? "up" : "down"}">${t.sol.toFixed(t.sol >= 10 ? 1 : 2)} SOL</b></p>
        <small>${t.kind === "buy" ? "from their Pumpfun App" : "profit, from their app"} · ${usd(t.usd)} · <span data-ts="${t.ts}">${ago(t.ts)}</span></small>
      </div>
      <span class="ev-kind ${t.kind}">${t.kind === "buy" ? "Buy" : "Sell"}</span>
    </a>`;
  const msHTML = (label) => `
    <div class="fi ev new">
      <span class="fi-av"><img src="assets/logo.png" alt=""></span>
      <div><p><b>$App</b> passed <b>${label}</b> market cap</p><small>Milestone · just now</small></div>
      <span class="ev-kind ms">Milestone</span>
    </div>`;

  // ---------- Best callouts: the real $App callouts from pump.fun, each one turned into a meme.
  // Live through api/callouts.js; data/callouts.json is the fallback (tools/export-callouts.js refreshes it).
  let CALLOUTS = [], calloutsAt = 0, tab = "all";
  // only a trailing signature goes: "sent from my pumpfun app at 100M?!!" keeps its joke
  const SIGRX = /\s*[-–—]?\s*sen[dt]?\s+(?:from|to)\s+(?:my|the|his)\s+pump(?:[.\s]?fun)?(?:\s+(?:super\s+)?(?:app|wallet))?[\s.!]*$/i;
  const strip = (s) => (s || "").trim().replace(SIGRX, "").replace(/\s+/g, " ").trim();
  const cap = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
  const xNum = (n) => (n >= 10 ? Math.round(n) : n.toFixed(1)) + "x";
  const calloutLink = (c) => `https://pump.fun/coin/${S.CA}?highlight_callout=${encodeURIComponent(c.id)}`;
  // the signature is already drawn by every template, so the meme says what the callout says besides it
  function calloutMeme(c) {
    let line = strip(c.thesis);
    if (line.length < 8) line = strip(c.update);
    if (line.length < 8) line = `Called $App at ${usd(c.mcap)}. Peaked at ${xNum(c.peak)}.`;
    line = cap(line, 150);
    const name = c.user, handle = c.x || c.user;
    const T = [
      { tpl: "tweet", theme: "dark", fmt: "square", data: { name, handle, text: line } },
      { tpl: "receipt", theme: "light", fmt: "portrait", data: { store: "CALLOUT RECEIPT", items: `1x $App - called at ${usd(c.mcap)}\n1x conviction - included\n1x sleep - skipped`, total: xNum(c.peak) + " peak" } },
      { tpl: "discord", theme: "dark", fmt: "square", data: { channel: "callouts", user: name, msg: line } },
      { tpl: "notif", theme: "dark", fmt: "portrait", data: { time: "3:07", msg: cap(`${name} called $App at ${usd(c.mcap)}. ${line}`, 120) } },
      { tpl: "review", theme: "light", fmt: "square", data: { title: `Called at ${usd(c.mcap)}`, stars: "5", body: line, author: name } },
      { tpl: "text", theme: "dark", fmt: "portrait", data: { contact: name, them: "what are you buying?", me: line } }
    ];
    return T[(c.rank - 1) % T.length];
  }
  const calloutHTML = (c, m) => `
    <article class="fi co">
      <span class="fi-av co">${c.avatar ? `<img src="${esc(c.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-w="${esc(c.wallet)}">` : ident(c.wallet)}</span>
      <div>
        <div class="fi-top"><b>${esc(c.user)}</b>${c.x ? `<a href="https://x.com/${encodeURIComponent(c.x)}" target="_blank" rel="noopener">@${esc(c.x)}</a>` : `<span>${short(c.wallet)}</span>`}<span class="co-rank" title="Rank on pump.fun">#${c.rank}</span></div>
        <p>${esc(c.thesis)}</p>
        <span class="fi-media" style="--ar:${AR[c.meme.fmt]}"><img data-meme="${m}" src="${PIXEL}" alt="Meme made from ${esc(c.user)}'s callout"></span>
        <div class="co-call"><span>Called at <b>${usd(c.mcap)}</b></span><span>Peak <b class="up">${xNum(c.peak)}</b></span><span>${ago(Date.parse(c.at))} on pump.fun</span></div>
        <div class="fi-acts">
          <a href="${calloutLink(c)}" target="_blank" rel="noopener" aria-label="${c.likes} likes, open on pump.fun">${ICON.like}<span>${c.likes}</span></a>
          <a href="${calloutLink(c)}" target="_blank" rel="noopener" aria-label="Open the callout on pump.fun">${ICON.open}<span>pump.fun</span></a>
          <button type="button" aria-label="Copy the link" data-copy-co="${c.rank - 1}">${ICON.share}</button>
          <button type="button" class="remix" data-remix-co="${c.rank - 1}">Remix</button>
        </div>
      </div>
    </article>`;

  // ---------- Bagworkers: who posts "Sent from my Pumpfun App" on X the most (api/leaderboard.js).
  // The tab only shows once the API is set up (X + Supabase keys on Vercel).
  let board = { period: "week", rows: [], loaded: false };
  const BOARD_LABEL = { day: "24h", week: "7 days", all: "All time" };
  // King of the Hill: #1 gets the throne card, #2 and #3 the podium, everyone else the hill below
  const CROWN = `<svg class="koth-crown" viewBox="0 0 64 40" aria-hidden="true"><path d="M4 34 8 8l14 14L32 2l10 20L56 8l4 26z"/><rect x="4" y="34" width="56" height="5" rx="2"/></svg>`;
  const bAv = (r, cls) => `<span class="${cls}">${r.avatar ? `<img src="${esc(r.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-w="${esc(r.username)}">` : ident(r.username)}</span>`;
  const xUrl = (r) => `https://x.com/${encodeURIComponent(r.username)}`;
  const nPosts = (n) => `${n} ${n === 1 ? "post" : "posts"}`;
  function boardHTML() {
    const [king, ...rest] = board.rows;
    const total = board.rows.reduce((t, r) => t + r.count, 0);
    const lead = king && rest[0] ? king.count - rest[0].count : 0;
    const throne = king ? `
      <a class="koth" href="${xUrl(king)}" target="_blank" rel="noopener">
        <h3 class="koth-title">${CROWN}<span>King of the Hill</span></h3>
        <div class="koth-card">
          <span class="koth-av">${bAv(king, "koth-img")}</span>
          <div class="koth-info">
            <p class="koth-by">posted by <b>@${esc(king.username)}</b></p>
            <p class="koth-num">posts: ${king.count}${total ? ` <span>(${Math.round(king.count / total * 100)}% of the hill)</span>` : ""}</p>
            <p class="koth-lead">${rest[0] ? `lead: +${lead} on #2` : "alone on the hill"}</p>
            <p class="koth-name">${esc(king.name || king.username)}</p>
            <span class="koth-link">[view on X]</span>
          </div>
        </div>
      </a>` : "";
    const podium = rest.slice(0, 2).map((r) => `
      <a class="koth-pod" href="${xUrl(r)}" target="_blank" rel="noopener">
        <span class="koth-pod-rank">#${r.rank}</span>${bAv(r, "koth-pod-av")}
        <b>${esc(r.name || r.username)}</b><small>@${esc(r.username)}</small><span class="koth-pod-n">${nPosts(r.count)}</span>
      </a>`).join("");
    const hill = rest.slice(2).map((r) => `
      <a class="fi ev lb" href="${xUrl(r)}" target="_blank" rel="noopener">
        ${bAv(r, "fi-av co")}
        <div><p><span class="lb-rank">#${r.rank}</span><b>${esc(r.name || r.username)}</b></p><small>@${esc(r.username)}</small></div>
        <span class="ev-kind ms">${nPosts(r.count)}</span>
      </a>`).join("");
    const body = !board.loaded ? `<p class="feed-end"><span class="spinner"></span></p>`
      : king ? `${throne}${podium ? `<div class="koth-podium">${podium}</div>` : ""}${hill ? `<p class="koth-sub">[the hill]</p>${hill}` : ""}`
      : `<p class="feed-end">Nobody on the hill yet. Post "Sent from my Pumpfun App" on X and take the crown.</p>`;
    return `<div class="lb-head"><div class="mini" role="group" aria-label="Period">${Object.keys(BOARD_LABEL).map((p) =>
      `<button type="button" data-board="${p}" aria-pressed="${p === board.period}">${BOARD_LABEL[p]}</button>`).join("")}</div></div>
      ${body}
      <p class="feed-end">Counts X posts that say "Sent from my Pumpfun App". Max 15 a day per account, copies don't count.</p>`;
  }
  async function loadBoard(period) {
    board = { period, rows: board.period === period ? board.rows : [], loaded: board.period === period && board.loaded };
    try {
      const j = await (await fetch("/api/leaderboard?period=" + period)).json();
      if (!j.configured) return false;
      if (board.period === period) board = { period, rows: j.rows || [], loaded: true };
    } catch { return false; }
    if (tab === "board") render();
    return true;
  }

  const feed = $("feed");
  let trades = [], MEDIA = [];
  function render() {
    MEDIA = [];
    const media = (m) => MEDIA.push(m) - 1;
    let html = "";
    $("calloutsNote").textContent = tab === "board" ? "From X · updated daily" : calloutsAt ? `From pump.fun · ${ago(calloutsAt)}` : "";
    if (tab === "board") {
      feed.innerHTML = boardHTML(); return;
    } else if (tab === "callouts") {
      CALLOUTS.forEach((c) => { html += calloutHTML(c, media(c.meme)); });
      html += `<p class="feed-end">Ranked by pump.fun. Post yours from the app.</p>`;
    } else {
      // a callout before every second post, the latest real trades after every second post
      let ti = 0, ci = 0;
      POSTS.forEach((p, i) => {
        if (i % 2 === 0 && CALLOUTS[ci]) { const c = CALLOUTS[ci++]; html += calloutHTML(c, media(c.meme)); }
        html += postHTML(p, i, p.meme ? media(p.meme) : -1);
        if (i % 2 === 1 && trades[ti]) html += tradeHTML(trades[ti++]);
      });
      html += `<p class="feed-end">You're all caught up.</p>`;
    }
    feed.innerHTML = html;
    loadMedia();
  }

  // Where the callouts come from, first that answers wins, refreshed every 5 minutes:
  //   1. pump.fun straight from the visitor's browser: works as soon as pump.fun allows this site's domain (CORS)
  //   2. api/callouts.js on our server: works once pump.fun lets our server through (key or allowlist)
  //   3. data/callouts.json, the saved copy
  const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const PUMP = `https://frontend-api-v3.pump.fun/mint-positions/${S.CA}?sortBy=RANKED&withThesis=true&pageSize=50&platform=WEB`;
  const cleanCo = (s) => { s = (s || "").replace(/@\[([^\]]+)\]\([^)]*\)/g, "@$1").trim(); return s.length > 280 ? s.slice(0, 277).replace(/\s+\S*$/, "") + "…" : s; };
  const shapeCo = (positions) => positions.filter((p) => p.callout && p.callout.thesis && !p.lowQuality).slice(0, 24).map((p, i) => {
    const c = p.callout, top = (c.updates || []).filter((u) => u.content).sort((a, b) => b.likeCount - a.likeCount)[0];
    return { rank: i + 1, id: c.calloutId, user: p.userName, x: p.xUsername || null, avatar: p.profileImage || null, wallet: p.walletAddress,
      thesis: cleanCo(c.thesis), update: top ? cleanCo(top.content) : null, at: c.calloutTimestamp, mcap: Math.round(c.calledOutAtMcap || 0),
      peak: +(c.maxMultiplier || 0).toFixed(1), likes: c.likes || 0, views: c.viewCount || 0, replies: c.replyCount || 0 };
  });
  let calloutsSig = "", directOk = true;
  async function loadCallouts() {
    let d;
    try {
      if (!directOk) throw 0;
      d = { updated: new Date().toISOString(), callouts: shapeCo((await getJSON(PUMP)).positions || []) };
      if (!d.callouts.length) throw 0;
    } catch {
      directOk = false; // blocked once: don't retry from every visitor every 5 minutes, the server route takes over
      try { d = await getJSON("/api/callouts"); } catch { if (CALLOUTS.length) return; try { d = await getJSON("data/callouts.json"); } catch { return; } }
    }
    const list = d.callouts || [];
    const sig = list.map((c) => c.id + c.likes).join();
    if (!list.length || sig === calloutsSig) return;
    calloutsSig = sig;
    CALLOUTS = list.map((c) => ({ ...c, meme: calloutMeme(c) }));
    calloutsAt = Date.parse(d.updated) || 0;
    $("feedTabs").hidden = false;
    // don't redraw under someone who is reading the leaderboard
    if (tab !== "board") render();
  }
  loadCallouts();
  setInterval(() => { if (!document.hidden) loadCallouts(); }, 300000);
  loadBoard("week").then((ok) => {
    if (!ok) return;
    $("feedTabs").hidden = false;
    document.querySelector('[data-feed-tab="board"]').hidden = false;
  });
  $("feedTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-feed-tab]"); if (!b || b.dataset.feedTab === tab) return;
    tab = b.dataset.feedTab; haptic();
    $$("[data-feed-tab]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  // a pump.fun avatar that fails to load falls back to the wallet's identicon
  feed.addEventListener("error", (e) => {
    const img = e.target;
    if (img.tagName === "IMG" && img.dataset.w) img.outerHTML = ident(img.dataset.w);
  }, true);

  // memes are drawn by the Studio once its fonts are in, then only when scrolled near
  let mediaIO = null;
  function loadMedia() {
    if (!S.memesReady || !S.renderMeme) return;
    mediaIO && mediaIO.disconnect();
    mediaIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const img = e.target; mediaIO.unobserve(img);
      const m = MEDIA[img.dataset.meme]; if (!m) return;
      setTimeout(() => S.renderMeme(m, { width: 720 }).toBlob((b) => {
        if (!b) return;
        img.src = URL.createObjectURL(b); img.onload = () => img.classList.add("ok");
      }, "image/jpeg", 0.86), 0);
    }), { root: $("scr-home"), rootMargin: "400px" });
    $$("img[data-meme]", feed).forEach((img) => mediaIO.observe(img));
  }

  S.on("trades:init", (list) => { trades = list.slice(0, 4); render(); });
  S.on("trade", (t) => {
    trades.unshift(t);
    const first = tab === "all" && feed.querySelector(".fi");
    if (first) first.insertAdjacentHTML("beforebegin", tradeHTML(t, true));
  });
  S.on("milestone", (label) => { const first = tab === "all" && feed.querySelector(".fi"); if (first) first.insertAdjacentHTML("beforebegin", msHTML(label)); });
  S.on("memes:ready", () => { loadMedia(); buildStories(); });
  setInterval(() => $$("#feed [data-ts]").forEach((el) => { el.textContent = ago(+el.dataset.ts); }), 30000);

  feed.addEventListener("click", async (e) => {
    const bp = e.target.closest("[data-board]");
    if (bp) { if (bp.dataset.board !== board.period) { haptic(); board.period = null; loadBoard(bp.dataset.board); render(); } return; }
    const like = e.target.closest("[data-like]");
    if (like) {
      const p = POSTS[like.dataset.like], on = like.classList.toggle("liked"); haptic();
      like.querySelector("span").textContent = p.likes + (on ? 1 : 0); return;
    }
    const cp = e.target.closest("[data-copy-post]");
    if (cp) { const p = POSTS[cp.dataset.copyPost]; if (await S.copyText(p.body + "\n\nSent from my Pumpfun App")) S.toast("Post copied", { mark: "check" }); return; }
    const cc = e.target.closest("[data-copy-co]");
    if (cc) { const c = CALLOUTS[cc.dataset.copyCo]; if (await S.copyText(`${c.thesis}\n\n${calloutLink(c)}`)) S.toast("Callout copied", { mark: "check" }); return; }
    const rc = e.target.closest("[data-remix-co]");
    if (rc) { haptic(); S.remixPreset(CALLOUTS[rc.dataset.remixCo].meme); return; }
    const rm = e.target.closest("[data-remix]");
    if (rm) {
      const p = POSTS[rm.dataset.remix]; haptic();
      if (p.meme) S.remixPreset(p.meme); else { S.emit("remix", p.body); S.go("studio"); }
    }
  });
  render();

  // =====================================================================
  // Stories
  // =====================================================================
  const story = $("story"), cube = $("storyCube"), DUR = 5600;
  const seen = new Set(S.store.get("seen2", []));
  const jpg = (t, w = 720) => S.renderMeme(t, { width: w }).toDataURL("image/jpeg", 0.85);
  const thumb = (t) => S.renderMeme(t, { width: 160, square: true }).toDataURL("image/jpeg", 0.8);
  let STORIES = [];

  function sparkSVG(pts) {
    if (!pts || pts.length < 2) return "";
    const W = 320, H = 120, min = Math.min(...pts), max = Math.max(...pts), sp = max - min || 1;
    const d = pts.map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * W).toFixed(1)} ${(10 + (1 - (v - min) / sp) * (H - 20)).toFixed(1)}`).join(" ");
    const col = pts[pts.length - 1] >= pts[0] ? "#4ade80" : "#f87171";
    return `<svg class="slide-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W} ${H} L0 ${H}Z" fill="${col}" opacity=".15"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
  }

  // story covers drawn on the fly, so no ring is just the logo
  function avatarLive() {
    const c = document.createElement("canvas"); c.width = c.height = 160; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, "#0b1f16"); gr.addColorStop(1, "#050807"); g.fillStyle = gr; g.fillRect(0, 0, 160, 160);
    const pts = (S.state && S.state.spark) || [3, 4, 3.5, 5, 4.6, 6, 5.4, 7, 6.6, 8];
    const min = Math.min(...pts), max = Math.max(...pts), sp = max - min || 1;
    g.beginPath(); pts.forEach((v, i) => g[i ? "lineTo" : "moveTo"](20 + (i / (pts.length - 1)) * 120, 120 - ((v - min) / sp) * 70));
    g.strokeStyle = pts[pts.length - 1] >= pts[0] ? "#4ade80" : "#f87171"; g.lineWidth = 7; g.lineJoin = g.lineCap = "round"; g.stroke();
    return c.toDataURL("image/png");
  }
  function kitImg(style, w) {
    const big = S.renderKit ? S.renderKit(style) : null;
    if (!big) return "assets/logo.png";
    const c = document.createElement("canvas"); c.width = w; c.height = Math.round((w * big.height) / big.width);
    c.getContext("2d").drawImage(big, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }
  function buildStories() {
    if (!S.renderMeme || STORIES.length) return;
    const motd = [
      { t: { tpl: "tweet", theme: "dark", fmt: "portrait", data: I.tweet[1] }, k: "Meme of the day", h: "Proud of him, I think.", p: "Dad found out what the app is." },
      { t: { tpl: "notif", theme: "dark", fmt: "portrait", data: I.notif[0] }, k: "Runner-up", h: "Leave the wedding.", p: "The streak doesn't wait." },
      { t: { tpl: "discord", theme: "dark", fmt: "portrait", data: I.discord[1] }, k: "Also today", h: "Where the money went.", p: "Sent from the app, explained in #callouts." }
    ];
    const fresh = [
      { t: { tpl: "weather", theme: "dark", fmt: "portrait", data: I.weather[0] }, k: "New template", h: "Weather", p: "100% chance of runners." },
      { t: { tpl: "review", theme: "light", fmt: "portrait", data: I.review[0] }, k: "New template", h: "App Store review", p: "Five stars. Would send again." },
      { t: { tpl: "nowplaying", theme: "dark", fmt: "portrait", data: I.nowplaying[0] }, k: "New template", h: "Now playing", p: "One More, by The Trenches." }
    ];
    const memeSlides = (list) => list.map((m) => { const src = jpg(m.t); return {
      bg: src, html: `<div class="slide-media"><img src="${src}" alt=""></div><div class="slide-cap"><h3>${m.h}</h3><p>${m.p}</p><button type="button" class="slide-cta" data-remix-story>Remix it</button></div>`, preset: m.t }; });
    STORIES = [
      { id: "motd", title: "Meme of the day", label: "Today", avatar: thumb(motd[0].t), slides: () => memeSlides(motd) },
      { id: "live", title: "Live", label: "Live", avatar: avatarLive(), slides: () => {
        const m = S.state || {};
        const last = (trades || []).slice(0, 3).map((t) => `<div><span class="${t.kind === "buy" ? "up" : "down"}">${t.kind === "buy" ? "Buy" : "Sell"} · ${t.sol.toFixed(2)} SOL</span><span>${ago(t.ts)}</span></div>`).join("");
        return [
          { html: `<div class="slide-cap"><span class="slide-big">${usd(m.mcap)}</span><p class="meta">Market cap right now · <span class="${m.chg >= 0 ? "up" : "down"}">${S.pct(m.chg)}</span> in 24 hours</p>${sparkSVG(m.spark)}<button type="button" class="slide-cta" data-story-go="market">Open the market</button></div>` },
          { html: `<div class="slide-cap"><h3>Sent in the last hours.</h3><div class="slide-list">${last || "<div><span>No trades over $1 yet</span></div>"}</div><button type="button" class="slide-cta" data-story-go="market">See them all</button></div>` },
          { html: `<div class="slide-cap"><span class="slide-big">${m.holders ? m.holders.toLocaleString("en-US") : "–"}</span><p class="meta">wallets hold $App. The top 10 hold ${m.dist && m.dist.top_10 ? parseFloat(m.dist.top_10).toFixed(1) + "%" : "–"}.</p></div>` }
        ];
      } },
      { id: "new", title: "New templates", label: "New", avatar: thumb(fresh[0].t), slides: () => memeSlides(fresh) },
      { id: "kit", title: "Profile kit", label: "Kit", avatar: kitImg("neon", 160), slides: () => {
        const wp = kitImg("wallpaper", 600), neon = kitImg("neon", 600);
        return [
          { bg: wp, html: `<div class="slide-media"><img src="${wp}" alt=""></div><div class="slide-cap"><h3>Your next lock screen.</h3><p>A 19:19 wallpaper, sized for iPhone and Android.</p><button type="button" class="slide-cta" data-story-go="kit">Open the kit</button></div>` },
          { bg: neon, html: `<div class="slide-media"><img src="${neon}" alt=""></div><div class="slide-cap"><h3>Neon PFP.</h3><p>Your photo, framed in $App green. Best on dark mode.</p><button type="button" class="slide-cta" data-story-go="kit">Make yours</button></div>` }
        ];
      } }
    ];
    renderRings();
  }
  function renderRings() {
    $("stories").innerHTML = STORIES.map((s, i) => `
      <button type="button" class="sring ${seen.has(s.id) ? "seen" : ""}" data-story="${i}">
        <i><span><img src="${s.avatar}" alt=""></span></i><b>${esc(s.label)}</b>
      </button>`).join("");
  }

  let sIdx = 0, slIdx = 0, slides = [], elapsed = 0, last = 0, paused = false, raf = 0, busy = false;
  function openStory(i) {
    sIdx = i; slIdx = 0; story.hidden = false; haptic();
    story.classList.remove("opening"); void story.offsetWidth; story.classList.add("opening");
    loadStory(); cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(tick);
  }
  function loadStory() {
    const s = STORIES[sIdx];
    slides = s.slides();
    $("storyTitle").textContent = s.title;
    $("storyAvatar").src = s.avatar;
    $("storyTime").textContent = s.id === "live" ? "live" : "today";
    $("storyBars").innerHTML = slides.map(() => "<span><i></i></span>").join("");
    seen.add(s.id); S.store.set("seen2", [...seen]);
    showSlide();
  }
  function showSlide() {
    elapsed = 0;
    slIdx = Math.max(0, Math.min(slIdx, slides.length - 1));
    const sl = slides[slIdx];
    $("storyBody").innerHTML = `<div class="slide">${sl.html}</div>`;
    $("storyBg").style.backgroundImage = sl.bg ? `url(${sl.bg})` : "linear-gradient(180deg, #1b1b20, #000)";
    $$("#storyBars i").forEach((b, i) => { b.style.width = i < slIdx ? "100%" : "0%"; });
  }
  // moving between two stories slides sideways; within a story it just cuts.
  // Going forward starts the next story at its first slide, going back at its last.
  function enter(to, dir) {
    sIdx = to; slIdx = 0; loadStory();
    if (dir < 0) { slIdx = slides.length - 1; showSlide(); }
  }
  function switchStory(to, dir) {
    if (reduce) { enter(to, dir); return; }
    busy = true;
    cube.className = "story-cube " + (dir > 0 ? "out-l" : "out-r");
    setTimeout(() => {
      enter(to, dir);
      cube.className = "story-cube " + (dir > 0 ? "in-r" : "in-l");
      setTimeout(() => { cube.className = "story-cube"; busy = false; }, 320);
    }, 200);
  }
  function next() {
    if (busy) return;
    if (slIdx < slides.length - 1) { slIdx++; showSlide(); }
    else if (sIdx < STORIES.length - 1) switchStory(sIdx + 1, 1);
    else closeStory();
  }
  function prev() {
    if (busy) return;
    if (slIdx > 0) { slIdx--; showSlide(); }
    else if (sIdx > 0) switchStory(sIdx - 1, -1);
    else showSlide();
  }
  function tick(now) {
    if (story.hidden) return;
    if (!paused && !busy) elapsed += now - last;
    last = now;
    const bar = $$("#storyBars i")[slIdx];
    if (bar) bar.style.width = Math.min(100, (elapsed / DUR) * 100) + "%";
    if (elapsed >= DUR) next();
    raf = requestAnimationFrame(tick);
  }
  function closeStory() {
    if (story.hidden) return;
    story.hidden = true; cancelAnimationFrame(raf); busy = false; paused = false;
    cube.className = "story-cube"; cube.style.transform = ""; renderRings();
  }
  $("stories").addEventListener("click", (e) => { const r = e.target.closest("[data-story]"); if (r) openStory(+r.dataset.story); });
  $("storyClose").addEventListener("click", closeStory);
  addEventListener("keydown", (e) => {
    if (story.hidden) return;
    if (e.key === "Escape") closeStory(); else if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev();
  });

  // tap left/right, hold to pause, swipe down to close
  let downAt = 0, downX = 0, downY = 0, pull = 0;
  const body = $("storyBody");
  body.addEventListener("pointerdown", (e) => { downAt = performance.now(); downX = e.clientX; downY = e.clientY; pull = 0; paused = true; });
  body.addEventListener("pointermove", (e) => {
    if (!paused || !downAt) return;
    pull = Math.max(0, e.clientY - downY);
    if (pull > 8) cube.style.transform = `translateY(${pull}px) scale(${1 - pull / 1500})`;
  });
  body.addEventListener("pointerup", (e) => {
    paused = false; const held = performance.now() - downAt; downAt = 0;
    if (pull > 110) { closeStory(); return; }
    cube.style.transition = "transform .25s"; cube.style.transform = ""; setTimeout(() => { cube.style.transition = ""; }, 260);
    if (pull > 8 || held > 300 || e.target.closest("a, button, code")) return;
    const r = story.getBoundingClientRect(); haptic(5);
    if (downX - r.left < r.width * 0.3) prev(); else next();
  });
  body.addEventListener("click", (e) => {
    const g = e.target.closest("[data-story-go]");
    if (g) { closeStory(); S.go(g.dataset.storyGo); return; }
    if (e.target.closest("[data-remix-story]")) { const p = slides[slIdx].preset; closeStory(); if (p) S.remixPreset(p); }
  });
  if (S.memesReady) buildStories();
})();
