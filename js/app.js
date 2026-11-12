// App shell: navigation, lock screen, status bar, Dynamic Island, sheets, pull to refresh,
// install (PWA) and sounds. The feed and stories live in feed.js.
(() => {
  const S = window.SFM;
  const { $, $$, reduce, wait, haptic, sound, toast, usd, short, ago } = S;
  const device = $("device"), lock = $("lock"), app = $("app");

  // =====================================================================
  // Navigation between screens
  // =====================================================================
  const SCREENS = ["home", "hill", "market", "studio", "kit", "about"];
  const LEGACY = { token: "market", chart: "market", app: "about", more: "about", board: "hill", bagworkers: "hill" }; // old links keep working
  let current = null;
  function go(name, { replace = false } = {}) {
    if (!SCREENS.includes(name)) name = "home";
    if (name !== current) {
      const dir = current && SCREENS.indexOf(name) < SCREENS.indexOf(current) ? "from-left" : "from-right";
      $$(".screen").forEach((s) => {
        const on = s.dataset.screen === name;
        s.hidden = !on;
        s.classList.remove("from-left", "from-right");
        if (on && current) { void s.offsetWidth; s.classList.add(dir); }
      });
      $$(".tabbar [data-go]").forEach((b) => { if (b.dataset.go === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
      current = name;
      S.emit("screen", name);
    } else {
      // tapping the active tab scrolls it back to the top, like a native app
      document.querySelector(`.screen[data-screen="${name}"]`).scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
    const hash = "#" + name;
    if (!locked && !S.landing && location.hash !== hash) history[replace ? "replaceState" : "pushState"](null, "", hash);
  }
  S.go = go;
  S.current = () => current;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    haptic();
    if (locked) unlock(b.dataset.go, b); else go(b.dataset.go);
  });
  const routeFromHash = () => {
    const h = location.hash.slice(1);
    return SCREENS.includes(h) ? h : LEGACY[h] || null;
  };
  addEventListener("popstate", () => { const r = routeFromHash(); if (r) { if (locked) unlock(r); else go(r, { replace: true }); } });

  // =====================================================================
  // Lock screen
  // =====================================================================
  let locked = true;
  function unlock(to = "home", origin, { instant = false } = {}) {
    if (!locked) { go(to); return; }
    locked = false;
    device.classList.remove("is-locked");
    go(to, { replace: true });
    if (!S.landing) history.replaceState(null, "", "#" + current);
    $("padlock").classList.add("open");
    lock.style.transform = "";
    lock.classList.remove("dragging");
    lock.classList.add("gone");
    lock.setAttribute("aria-hidden", "true"); lock.inert = true;
    app.classList.remove("behind"); app.inert = false;
    if (instant || reduce) return;
    sound.play("unlock"); haptic(12);
    // iOS-style: the app grows out of whatever was tapped
    const d = device.getBoundingClientRect(), r = (origin || $("swipe")).getBoundingClientRect();
    const dx = r.left + r.width / 2 - (d.left + d.width / 2), dy = r.top + r.height / 2 - (d.top + d.height / 2);
    app.style.transformOrigin = "50% 50%";
    app.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(.14)`, borderRadius: "90px", opacity: 0.3 },
      { transform: "none", borderRadius: "0px", opacity: 1 }
    ], { duration: 560, easing: "cubic-bezier(.2,.9,.3,1)" });
  }
  function relock() {
    if (locked) return;
    locked = true;
    device.classList.add("is-locked");
    lock.inert = false; lock.removeAttribute("aria-hidden");
    lock.classList.remove("gone");
    app.inert = true;
    setTimeout(() => { if (locked) app.classList.add("behind"); }, 520);
    if (!S.landing) history.replaceState(null, "", location.pathname + location.search);
    play();
  }
  S.unlock = unlock; S.relock = relock;
  S.isLocked = () => locked;
  $$("[data-unlock]").forEach((b) => b.addEventListener("click", () => unlock(b.dataset.unlock, b)));
  $("relock").addEventListener("click", relock);

  // swipe up (touch or mouse drag) to open
  let startY = null, dy = 0, dragged = false;
  lock.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, .lock-ca")) return;
    startY = e.clientY; dy = 0; dragged = false; lock.classList.add("dragging");
  });
  addEventListener("pointermove", (e) => {
    if (startY == null) return;
    dy = Math.min(0, e.clientY - startY);
    if (dy < -8) dragged = true;
    lock.style.transform = `translateY(${dy}px)`;
  });
  addEventListener("pointerup", () => {
    if (startY == null) return;
    startY = null; lock.classList.remove("dragging");
    if (dy < -90) unlock(); else lock.style.transform = "";
    dy = 0;
  });
  lock.addEventListener("click", (e) => { if (dragged) { dragged = false; e.stopPropagation(); e.preventDefault(); } }, true);
  lock.addEventListener("wheel", (e) => { if (e.deltaY > 25) unlock(); }, { passive: true });
  addEventListener("keydown", (e) => { if (locked && !S.landing && (e.key === "ArrowUp" || e.key === "Enter")) unlock(); });

  const typed = $("typed"), caret = $("caret"), full = typed.textContent;
  const show = (id) => $(id).classList.add("in");
  let playId = 0;
  async function play() {
    const id = ++playId;
    ["n1", "n2", "bubble", "delivered", "heroCa"].forEach((x) => $(x).classList.remove("in"));
    $("padlock").classList.remove("open"); caret.className = "caret";
    if (reduce) { ["n1", "n2", "bubble", "delivered", "heroCa"].forEach(show); caret.classList.add("gone"); return; }
    typed.textContent = "";
    const alive = () => id === playId;
    await wait(550); if (!alive()) return; show("n1");
    await wait(1000); if (!alive()) return; show("n2");
    await wait(1100); if (!alive()) return; show("bubble"); caret.classList.add("blink");
    await wait(450); caret.classList.remove("blink");
    for (let i = 1; i <= full.length; i++) { if (!alive()) return; typed.textContent = full.slice(0, i); await wait(42 + Math.random() * 46); }
    caret.classList.add("blink");
    await wait(380); if (!alive()) return; show("delivered");
    await wait(300); if (!alive()) return; show("heroCa");
    await wait(1500); caret.classList.remove("blink"); caret.classList.add("gone");
  }

  // Live trades land on the lock screen as notifications
  let lastTrade = null;
  function lockNotif(t) {
    if (!t) return;
    lastTrade = t;
    const n = $("liveNotif");
    $("lnMsg").textContent = `${t.kind === "buy" ? "New buy" : "New sell"}: ${t.sol.toFixed(2)} SOL (${usd(t.usd)}). Someone sent it from their app.`;
    $("lnTime").textContent = ago(t.ts);
    n.hidden = false; n.style.animation = "none"; void n.offsetWidth; n.style.animation = "";
  }
  setInterval(() => { if (lastTrade) $("lnTime").textContent = ago(lastTrade.ts); }, 30000);

  // Status bar clock (hidden on the lock screen, like iOS: the big clock is there)
  const tick = () => { const d = new Date(); $("sbTime").textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); };
  tick(); setInterval(tick, 15000);

  // =====================================================================
  // Dynamic Island: live market cap, and the one place every event shows up
  // =====================================================================
  const island = $("island");
  let islandTimer, islandAction = null;
  S.on("stats", (s) => {
    S.roll($("iMcap"), usd(s.mcap));
    const c = $("iChg"); c.textContent = s.chg == null ? "" : (s.chg > 0 ? "+" : "−") + Math.abs(s.chg).toFixed(1) + "%";
    c.className = "i-chg " + (s.chg > 0 ? "up" : s.chg < 0 ? "down" : "");
  });
  const CHECK = '<svg class="i-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';
  function notify({ title, sub = "", amt = "", tone = "", mark = "", ms = 2600, action = null }) {
    $("iTitle").textContent = title;
    $("iSub").textContent = sub; $("iSub").hidden = !sub;
    const a = $("iAmt"); if (mark === "check") a.innerHTML = CHECK; else a.textContent = amt;
    island.classList.remove("buy", "sell", "open"); void island.offsetWidth;
    if (tone) island.classList.add(tone);
    island.classList.add("open");
    islandAction = action;
    clearTimeout(islandTimer); islandTimer = setTimeout(() => island.classList.remove("open"), ms);
  }
  S.notify = notify;
  function expandIsland(t, label) {
    notify({
      title: label || (t.kind === "buy" ? "New buy" : "New sell"), sub: `${short(t.from)} · ${ago(t.ts)}`,
      amt: `${t.kind === "buy" ? "+" : "−"}${t.sol.toFixed(2)} SOL`, tone: t.kind, ms: 4200, action: "trades"
    });
  }
  S.on("trades:init", (list) => {
    const lastBuy = list.find((t) => t.kind === "buy");
    if (!lastBuy) return;
    lockNotif(lastBuy);
    setTimeout(() => expandIsland(lastBuy, "Last buy"), 2600);
  });
  S.on("trade", (t) => { expandIsland(t); lockNotif(t); sound.play("trade"); haptic(10); });
  island.addEventListener("click", () => {
    haptic();
    if (island.classList.contains("open") && islandAction !== "trades") { island.classList.remove("open"); return; }
    if (locked) unlock("market", island); else go("market");
    if (islandAction === "trades") setTimeout(() => $("tradesCard").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }), 80);
  });

  // =====================================================================
  // Bottom sheet (used for install help)
  // =====================================================================
  const sheet = $("sheet");
  function openSheet(html) {
    $("sheetBody").innerHTML = html;
    sheet.classList.remove("closing"); sheet.hidden = false; haptic();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.add("closing");
    setTimeout(() => { sheet.hidden = true; sheet.classList.remove("closing"); }, 240);
  }
  S.openSheet = openSheet; S.closeSheet = closeSheet;
  sheet.addEventListener("click", (e) => { if (e.target.closest("[data-sheet-close]")) closeSheet(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  // Share the site
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-share-site]")) return;
    const data = { title: "Sent from my Pumpfun App ($App)", text: "Every cycle has a signature.", url: S.SITE };
    if (navigator.share) { navigator.share(data).catch(() => {}); return; }
    if (await S.copyText(S.SITE)) toast("Link copied", { sub: "sentfrommypumpfun.app", mark: "check" });
  });

  // QR codes: About (opens $App on Pump.fun) and the desktop landing (opens this site)
  $("caQr").innerHTML = S.qr(S.PUMP);
  const sideQr = $("sideQr");
  if (sideQr) sideQr.innerHTML = S.qr(/localhost|127\.0\.0\.1/.test(location.hostname) ? S.SITE : location.origin + location.pathname);

  // =====================================================================
  // Pull to refresh (touch, Feed)
  // =====================================================================
  (() => {
    const scr = $("scr-home"), pad = scr.querySelector(".pad"), ptr = $("ptr");
    let y0 = null, d = 0, busy = false;
    const reset = () => {
      pad.classList.remove("pulling"); pad.style.transform = "";
      ptr.style.transition = "transform .35s, opacity .35s"; ptr.style.transform = ""; ptr.style.opacity = "";
      ptr.classList.remove("spin");
    };
    scr.addEventListener("touchstart", (e) => { if (scr.scrollTop <= 0 && !busy) { y0 = e.touches[0].clientY; d = 0; } }, { passive: true });
    scr.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      const pull = e.touches[0].clientY - y0;
      if (pull <= 0) { d = 0; return; }
      if (e.cancelable) e.preventDefault();
      d = Math.min(pull * 0.5, 100);
      pad.classList.add("pulling"); pad.style.transform = `translateY(${d}px)`;
      ptr.style.transition = "none"; ptr.style.opacity = Math.min(1, d / 60);
      ptr.style.transform = `translateY(${d - 44}px) rotate(${d * 5}deg)`;
      if (d > 64 && !ptr.dataset.armed) { ptr.dataset.armed = "1"; haptic(8); }
    }, { passive: false });
    scr.addEventListener("touchend", async () => {
      if (y0 == null) return;
      y0 = null; delete ptr.dataset.armed;
      if (d <= 64) return reset();
      busy = true;
      pad.classList.remove("pulling"); pad.style.transform = "translateY(56px)";
      ptr.style.transition = "transform .3s"; ptr.style.transform = "translateY(10px)"; ptr.classList.add("spin");
      try { await Promise.all([S.refreshAll ? S.refreshAll() : null, wait(700)]); } catch {}
      toast("Up to date", { mark: "check" }); busy = false; reset();
    });
  })();

  // =====================================================================
  // Install as an app (PWA) + sounds toggle
  // =====================================================================
  let deferred = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  function showInstall() {
    if (standalone) return;
    $("installRow").hidden = false;
    if (!S.store.get("installDismissed", false)) $("installCard").hidden = false;
  }
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; showInstall(); });
  addEventListener("appinstalled", () => { $("installRow").hidden = true; $("installCard").hidden = true; toast("Installed", { sub: "Look at your home screen", mark: "check" }); });
  if (isIOS) showInstall();
  $("installDismiss").addEventListener("click", () => { $("installCard").hidden = true; S.store.set("installDismissed", true); });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-install]")) return;
    if (deferred) { deferred.prompt(); const c = await deferred.userChoice.catch(() => null); if (c && c.outcome === "accepted") $("installCard").hidden = true; deferred = null; }
    else if (isIOS) openSheet(`<h3>Add $App to your home screen</h3><p>It opens full screen, like an app.</p>
      <ol><li>Tap <b>Share</b> at the bottom of Safari.</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Done.</li></ol>
      <button type="button" class="btn primary block" data-sheet-close>Got it</button>`);
    else toast("Use your browser menu", { sub: "then Install app" });
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  const st = $("soundToggle");
  const syncSound = () => st.setAttribute("aria-checked", String(sound.on));
  st.addEventListener("click", () => { sound.on = !sound.on; syncSound(); sound.play("sent"); haptic(); });
  syncSound();

  // =====================================================================
  // Start. On the desktop landing the page drives the phone (landing.js);
  // otherwise deep links (#studio, #market…) skip the lock screen.
  // =====================================================================
  S.landing = matchMedia("(min-width: 1080px) and (min-height: 640px)").matches;
  const initial = S.landing ? null : routeFromHash();
  if (initial) { go(initial); unlock(initial, null, { instant: true }); }
  else { device.classList.add("is-locked"); app.classList.add("behind"); app.inert = true; go("home"); play(); }
})();
// App shell: navigation, lock screen, status bar, Dynamic Island, sheets, pull to refresh,
// install (PWA) and sounds. The feed and stories live in feed.js.
(() => {
  const S = window.SFM;
  const { $, $$, reduce, wait, haptic, sound, toast, usd, short, ago } = S;
  const device = $("device"), lock = $("lock"), app = $("app");

  // =====================================================================
  // Navigation between screens
  // =====================================================================
  const SCREENS = ["home", "market", "studio", "kit", "about"];
  const LEGACY = { token: "market", chart: "market", app: "about", more: "about" }; // old links keep working
  let current = null;
  function go(name, { replace = false } = {}) {
    if (!SCREENS.includes(name)) name = "home";
    if (name !== current) {
      const dir = current && SCREENS.indexOf(name) < SCREENS.indexOf(current) ? "from-left" : "from-right";
      $$(".screen").forEach((s) => {
        const on = s.dataset.screen === name;
        s.hidden = !on;
        s.classList.remove("from-left", "from-right");
        if (on && current) { void s.offsetWidth; s.classList.add(dir); }
      });
      $$(".tabbar [data-go]").forEach((b) => { if (b.dataset.go === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
      current = name;
      S.emit("screen", name);
    } else {
      // tapping the active tab scrolls it back to the top, like a native app
      document.querySelector(`.screen[data-screen="${name}"]`).scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
    const hash = "#" + name;
    if (!locked && !S.landing && location.hash !== hash) history[replace ? "replaceState" : "pushState"](null, "", hash);
  }
  S.go = go;
  S.current = () => current;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    haptic();
    if (locked) unlock(b.dataset.go, b); else go(b.dataset.go);
  });
  const routeFromHash = () => {
    const h = location.hash.slice(1);
    return SCREENS.includes(h) ? h : LEGACY[h] || null;
  };
  addEventListener("popstate", () => { const r = routeFromHash(); if (r) { if (locked) unlock(r); else go(r, { replace: true }); } });

  // =====================================================================
  // Lock screen
  // =====================================================================
  let locked = true;
  function unlock(to = "home", origin, { instant = false } = {}) {
    if (!locked) { go(to); return; }
    locked = false;
    device.classList.remove("is-locked");
    go(to, { replace: true });
    if (!S.landing) history.replaceState(null, "", "#" + current);
    $("padlock").classList.add("open");
    lock.style.transform = "";
    lock.classList.remove("dragging");
    lock.classList.add("gone");
    lock.setAttribute("aria-hidden", "true"); lock.inert = true;
    app.classList.remove("behind"); app.inert = false;
    if (instant || reduce) return;
    sound.play("unlock"); haptic(12);
    // iOS-style: the app grows out of whatever was tapped
    const d = device.getBoundingClientRect(), r = (origin || $("swipe")).getBoundingClientRect();
    const dx = r.left + r.width / 2 - (d.left + d.width / 2), dy = r.top + r.height / 2 - (d.top + d.height / 2);
    app.style.transformOrigin = "50% 50%";
    app.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(.14)`, borderRadius: "90px", opacity: 0.3 },
      { transform: "none", borderRadius: "0px", opacity: 1 }
    ], { duration: 560, easing: "cubic-bezier(.2,.9,.3,1)" });
  }
  function relock() {
    if (locked) return;
    locked = true;
    device.classList.add("is-locked");
    lock.inert = false; lock.removeAttribute("aria-hidden");
    lock.classList.remove("gone");
    app.inert = true;
    setTimeout(() => { if (locked) app.classList.add("behind"); }, 520);
    if (!S.landing) history.replaceState(null, "", location.pathname + location.search);
    play();
  }
  S.unlock = unlock; S.relock = relock;
  S.isLocked = () => locked;
  $$("[data-unlock]").forEach((b) => b.addEventListener("click", () => unlock(b.dataset.unlock, b)));
  $("relock").addEventListener("click", relock);

  // swipe up (touch or mouse drag) to open
  let startY = null, dy = 0, dragged = false;
  lock.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, .lock-ca")) return;
    startY = e.clientY; dy = 0; dragged = false; lock.classList.add("dragging");
  });
  addEventListener("pointermove", (e) => {
    if (startY == null) return;
    dy = Math.min(0, e.clientY - startY);
    if (dy < -8) dragged = true;
    lock.style.transform = `translateY(${dy}px)`;
  });
  addEventListener("pointerup", () => {
    if (startY == null) return;
    startY = null; lock.classList.remove("dragging");
    if (dy < -90) unlock(); else lock.style.transform = "";
    dy = 0;
  });
  lock.addEventListener("click", (e) => { if (dragged) { dragged = false; e.stopPropagation(); e.preventDefault(); } }, true);
  lock.addEventListener("wheel", (e) => { if (e.deltaY > 25) unlock(); }, { passive: true });
  addEventListener("keydown", (e) => { if (locked && !S.landing && (e.key === "ArrowUp" || e.key === "Enter")) unlock(); });

  const typed = $("typed"), caret = $("caret"), full = typed.textContent;
  const show = (id) => $(id).classList.add("in");
  let playId = 0;
  async function play() {
    const id = ++playId;
    ["n1", "n2", "bubble", "delivered", "heroCa"].forEach((x) => $(x).classList.remove("in"));
    $("padlock").classList.remove("open"); caret.className = "caret";
    if (reduce) { ["n1", "n2", "bubble", "delivered", "heroCa"].forEach(show); caret.classList.add("gone"); return; }
    typed.textContent = "";
    const alive = () => id === playId;
    await wait(550); if (!alive()) return; show("n1");
    await wait(1000); if (!alive()) return; show("n2");
    await wait(1100); if (!alive()) return; show("bubble"); caret.classList.add("blink");
    await wait(450); caret.classList.remove("blink");
    for (let i = 1; i <= full.length; i++) { if (!alive()) return; typed.textContent = full.slice(0, i); await wait(42 + Math.random() * 46); }
    caret.classList.add("blink");
    await wait(380); if (!alive()) return; show("delivered");
    await wait(300); if (!alive()) return; show("heroCa");
    await wait(1500); caret.classList.remove("blink"); caret.classList.add("gone");
  }

  // Live trades land on the lock screen as notifications
  let lastTrade = null;
  function lockNotif(t) {
    if (!t) return;
    lastTrade = t;
    const n = $("liveNotif");
    $("lnMsg").textContent = `${t.kind === "buy" ? "New buy" : "New sell"}: ${t.sol.toFixed(2)} SOL (${usd(t.usd)}). Someone sent it from their app.`;
    $("lnTime").textContent = ago(t.ts);
    n.hidden = false; n.style.animation = "none"; void n.offsetWidth; n.style.animation = "";
  }
  setInterval(() => { if (lastTrade) $("lnTime").textContent = ago(lastTrade.ts); }, 30000);

  // Status bar clock (hidden on the lock screen, like iOS: the big clock is there)
  const tick = () => { const d = new Date(); $("sbTime").textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); };
  tick(); setInterval(tick, 15000);

  // =====================================================================
  // Dynamic Island: live market cap, and the one place every event shows up
  // =====================================================================
  const island = $("island");
  let islandTimer, islandAction = null;
  S.on("stats", (s) => {
    S.roll($("iMcap"), usd(s.mcap));
    const c = $("iChg"); c.textContent = s.chg == null ? "" : (s.chg > 0 ? "+" : "−") + Math.abs(s.chg).toFixed(1) + "%";
    c.className = "i-chg " + (s.chg > 0 ? "up" : s.chg < 0 ? "down" : "");
  });
  const CHECK = '<svg class="i-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';
  function notify({ title, sub = "", amt = "", tone = "", mark = "", ms = 2600, action = null }) {
    $("iTitle").textContent = title;
    $("iSub").textContent = sub; $("iSub").hidden = !sub;
    const a = $("iAmt"); if (mark === "check") a.innerHTML = CHECK; else a.textContent = amt;
    island.classList.remove("buy", "sell", "open"); void island.offsetWidth;
    if (tone) island.classList.add(tone);
    island.classList.add("open");
    islandAction = action;
    clearTimeout(islandTimer); islandTimer = setTimeout(() => island.classList.remove("open"), ms);
  }
  S.notify = notify;
  function expandIsland(t, label) {
    notify({
      title: label || (t.kind === "buy" ? "New buy" : "New sell"), sub: `${short(t.from)} · ${ago(t.ts)}`,
      amt: `${t.kind === "buy" ? "+" : "−"}${t.sol.toFixed(2)} SOL`, tone: t.kind, ms: 4200, action: "trades"
    });
  }
  S.on("trades:init", (list) => {
    const lastBuy = list.find((t) => t.kind === "buy");
    if (!lastBuy) return;
    lockNotif(lastBuy);
    setTimeout(() => expandIsland(lastBuy, "Last buy"), 2600);
  });
  S.on("trade", (t) => { expandIsland(t); lockNotif(t); sound.play("trade"); haptic(10); });
  island.addEventListener("click", () => {
    haptic();
    if (island.classList.contains("open") && islandAction !== "trades") { island.classList.remove("open"); return; }
    if (locked) unlock("market", island); else go("market");
    if (islandAction === "trades") setTimeout(() => $("tradesCard").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }), 80);
  });

  // =====================================================================
  // Bottom sheet (used for install help)
  // =====================================================================
  const sheet = $("sheet");
  function openSheet(html) {
    $("sheetBody").innerHTML = html;
    sheet.classList.remove("closing"); sheet.hidden = false; haptic();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.add("closing");
    setTimeout(() => { sheet.hidden = true; sheet.classList.remove("closing"); }, 240);
  }
  S.openSheet = openSheet; S.closeSheet = closeSheet;
  sheet.addEventListener("click", (e) => { if (e.target.closest("[data-sheet-close]")) closeSheet(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  // Share the site
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-share-site]")) return;
    const data = { title: "Sent from my Pumpfun App ($App)", text: "Every cycle has a signature.", url: S.SITE };
    if (navigator.share) { navigator.share(data).catch(() => {}); return; }
    if (await S.copyText(S.SITE)) toast("Link copied", { sub: "sentfrommypumpfun.app", mark: "check" });
  });

  // QR codes: About (opens $App on Pump.fun) and the desktop landing (opens this site)
  $("caQr").innerHTML = S.qr(S.PUMP);
  const sideQr = $("sideQr");
  if (sideQr) sideQr.innerHTML = S.qr(/localhost|127\.0\.0\.1/.test(location.hostname) ? S.SITE : location.origin + location.pathname);

  // =====================================================================
  // Pull to refresh (touch, Feed)
  // =====================================================================
  (() => {
    const scr = $("scr-home"), pad = scr.querySelector(".pad"), ptr = $("ptr");
    let y0 = null, d = 0, busy = false;
    const reset = () => {
      pad.classList.remove("pulling"); pad.style.transform = "";
      ptr.style.transition = "transform .35s, opacity .35s"; ptr.style.transform = ""; ptr.style.opacity = "";
      ptr.classList.remove("spin");
    };
    scr.addEventListener("touchstart", (e) => { if (scr.scrollTop <= 0 && !busy) { y0 = e.touches[0].clientY; d = 0; } }, { passive: true });
    scr.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      const pull = e.touches[0].clientY - y0;
      if (pull <= 0) { d = 0; return; }
      if (e.cancelable) e.preventDefault();
      d = Math.min(pull * 0.5, 100);
      pad.classList.add("pulling"); pad.style.transform = `translateY(${d}px)`;
      ptr.style.transition = "none"; ptr.style.opacity = Math.min(1, d / 60);
      ptr.style.transform = `translateY(${d - 44}px) rotate(${d * 5}deg)`;
      if (d > 64 && !ptr.dataset.armed) { ptr.dataset.armed = "1"; haptic(8); }
    }, { passive: false });
    scr.addEventListener("touchend", async () => {
      if (y0 == null) return;
      y0 = null; delete ptr.dataset.armed;
      if (d <= 64) return reset();
      busy = true;
      pad.classList.remove("pulling"); pad.style.transform = "translateY(56px)";
      ptr.style.transition = "transform .3s"; ptr.style.transform = "translateY(10px)"; ptr.classList.add("spin");
      try { await Promise.all([S.refreshAll ? S.refreshAll() : null, wait(700)]); } catch {}
      toast("Up to date", { mark: "check" }); busy = false; reset();
    });
  })();

  // =====================================================================
  // Install as an app (PWA) + sounds toggle
  // =====================================================================
  let deferred = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  function showInstall() {
    if (standalone) return;
    $("installRow").hidden = false;
    if (!S.store.get("installDismissed", false)) $("installCard").hidden = false;
  }
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; showInstall(); });
  addEventListener("appinstalled", () => { $("installRow").hidden = true; $("installCard").hidden = true; toast("Installed", { sub: "Look at your home screen", mark: "check" }); });
  if (isIOS) showInstall();
  $("installDismiss").addEventListener("click", () => { $("installCard").hidden = true; S.store.set("installDismissed", true); });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-install]")) return;
    if (deferred) { deferred.prompt(); const c = await deferred.userChoice.catch(() => null); if (c && c.outcome === "accepted") $("installCard").hidden = true; deferred = null; }
    else if (isIOS) openSheet(`<h3>Add $App to your home screen</h3><p>It opens full screen, like an app.</p>
      <ol><li>Tap <b>Share</b> at the bottom of Safari.</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Done.</li></ol>
      <button type="button" class="btn primary block" data-sheet-close>Got it</button>`);
    else toast("Use your browser menu", { sub: "then Install app" });
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  const st = $("soundToggle");
  const syncSound = () => st.setAttribute("aria-checked", String(sound.on));
  st.addEventListener("click", () => { sound.on = !sound.on; syncSound(); sound.play("sent"); haptic(); });
  syncSound();

  // =====================================================================
  // Start. On the desktop landing the page drives the phone (landing.js);
  // otherwise deep links (#studio, #market…) skip the lock screen.
  // =====================================================================
  S.landing = matchMedia("(min-width: 1080px) and (min-height: 640px)").matches;
  const initial = S.landing ? null : routeFromHash();
  if (initial) { go(initial); unlock(initial, null, { instant: true }); }
  else { device.classList.add("is-locked"); app.classList.add("behind"); app.inert = true; go("home"); play(); }
})();
