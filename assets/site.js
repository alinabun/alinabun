// alinabun.com
// Live menu and status come from the store (store.alinabun.com's API), which is the only place that
// knows what's on sale, prices, the pre-order cutoff, the delivery fee and our Instagram handle.
// Without it (offline, blocked) the page still reads fine; it just shows less.
(() => {
  "use strict";

  const API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://localhost:54321/functions/v1/store" // local dev copy of the store
    : "https://vosokllmaifbcdfbfvdt.supabase.co/functions/v1/store";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = navigator.connection || {};
  const lean = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ""); // keep data use down: no videos

  // ── Malé time (UTC+5 all year) ──
  const MVT = 5 * 3600e3;
  const today = () => new Date(Date.now() + MVT).toISOString().slice(0, 10);
  const addDays = (d, n) => {
    const t = new Date(`${d}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  };
  const hourText = (h) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;
  const until = (ms) => {
    const m = Math.ceil(ms / 60000);
    if (m <= 1) return "a minute";
    const h = Math.floor(m / 60);
    return h ? `${h} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;
  };
  const mvr = (x) => {
    const n = Number(x);
    return `MVR ${Number.isInteger(n) ? n : n.toFixed(2)}`;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // ── Live data ──
  let live = null; // { products, days }

  async function getJSON(path) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const res = await fetch(API + path, { signal: ctl.signal });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function load() {
    try {
      const [catalog, days] = await Promise.all([getJSON("/catalog"), getJSON("/delivery-dates")]);
      live = { products: catalog.products, days };
      settings(days);
      renderBuns();
      renderStatus();
    } catch {
      /* the page works without live data */
    }
  }

  function settings(d) {
    for (const el of $$("[data-cutoff]")) el.textContent = `by ${hourText(d.cutoff_hour)} the day before`;
    if (d.delivery_fee_male_mvr) for (const el of $$("[data-fee-male]")) el.textContent = mvr(d.delivery_fee_male_mvr);
    if (d.delivery_fee_outside_male_mvr) for (const el of $$("[data-fee]")) el.textContent = mvr(d.delivery_fee_outside_male_mvr);
    if (d.instagram) {
      for (const a of $$("[data-instagram]")) {
        a.href = `https://www.instagram.com/${encodeURIComponent(d.instagram)}/`;
        a.hidden = false;
      }
    }
  }

  /** What to say right now: the pre-order countdown, and any extras left. */
  function status() {
    if (!live) return null;
    const { days, products } = live;
    const t = today();
    const name = (id) => products.find((p) => p.id === id)?.name ?? id;
    const pre = days.dates.find((d) => d.kind === "preorder" && d.available);
    const extra = days.dates.find((d) => d.kind === "extras" && d.available);
    const out = { pre, extra, main: "", title: "", sub: "", extras: "" };
    if (pre) {
      out.title = `Order for ${pre.label}`;
      const cutoff = Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10), days.cutoff_hour) - MVT;
      const left = cutoff - Date.now();
      if (pre.date === addDays(t, 1) && left > 0) {
        out.main = `Pre-orders for <b>${esc(pre.label)}</b> close in <b>${until(left)}</b>`;
        out.sub = `Pre-orders close in ${until(left)}`;
        out.closesIn = left;
      } else {
        out.main = `Taking pre-orders for <b>${esc(pre.label)}</b>`;
        out.sub = "Pre-order now";
      }
    }
    if (extra) {
      const list = Object.entries(extra.products).filter(([, n]) => n > 0).map(([id, n]) => `${esc(name(id))} ${n}`).join(" · ");
      out.extras = `${extra.date === t ? "Extras today" : `Extras for ${esc(extra.label)}`}: ${list}`;
      if (!pre) {
        out.title = extra.date === t ? "Extras today" : `Extras for ${extra.label}`;
        out.sub = "While they last";
      }
    }
    return out;
  }

  function renderStatus() {
    const s = status();
    if (!s || (!s.main && !s.extras)) return;
    const [first, second] = s.main ? [s.main, s.extras] : [s.extras, ""];
    const text = `<span class="live-lines"><span>${first}</span>${second ? `<span class="sub">${second}</span>` : ""}</span>`;
    for (const el of $$("[data-live]")) {
      $("[data-live-text]", el).innerHTML = text;
      el.hidden = false;
    }
    const cta = $("[data-live-cta]");
    if (cta) cta.innerHTML = s.main ? `${s.main}.` : `${s.extras}.`;
    $("[data-dock-title]").textContent = s.title || "Fresh buns, made to order";
    $("[data-dock-sub]").textContent = s.sub || "Order on our store";
  }

  // Keep the countdown honest; when the cutoff passes, ask the store again (once).
  let refetch = 0;
  setInterval(() => {
    if (!live) return;
    const s = status();
    if (s?.closesIn !== undefined && s.closesIn < 30e3 && !refetch) {
      refetch = setTimeout(() => (refetch = 0, load()), s.closesIn + 2000);
    }
    renderStatus();
  }, 20e3);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && live) load();
  });

  /** Show the buns that are on sale, in the store's order, with live prices and what's left today. */
  function renderBuns() {
    const list = $("[data-bun-list]");
    if (!list || !live) return;
    const s = status();
    const extrasToday = s?.extra && s.extra.date === today() ? s.extra : null;
    const keep = new Set();
    for (const p of live.products) {
      let card = list.querySelector(`[data-bun="${CSS.escape(p.id)}"]`);
      if (!card) card = newCard(p);
      keep.add(card);
      $("h3", card).textContent = p.name;
      if (p.description) $(".bun-desc", card).textContent = p.description;
      const meta = $(".bun-meta", card);
      meta.replaceChildren(chip(mvr(p.price_mvr)));
      if (extrasToday) {
        const n = extrasToday.products[p.id] ?? 0;
        meta.append(chip(n ? `${n} left today` : "Sold out today", n ? "is-hot" : ""));
      }
      list.append(card); // the store's order
    }
    for (const card of $$("[data-bun]", list)) if (!keep.has(card)) card.remove();
  }

  function chip(text, cls = "") {
    const c = document.createElement("span");
    c.className = `chip ${cls}`.trim();
    c.textContent = text;
    return c;
  }

  /** A bun the page has no photos for yet: use the photo uploaded to the store. */
  function newCard(p) {
    const card = $("#bun-template").content.firstElementChild.cloneNode(true);
    card.dataset.bun = p.id;
    const img = $("img", card);
    if (p.image_url) {
      img.src = p.image_url;
      img.alt = `${p.name} bun`;
    } else {
      $(".bun-stage", card).remove(); // no photo yet: no empty plate
    }
    return card;
  }

  // ── Squishy buns ──
  for (const btn of $$(".bun-touch")) {
    const squish = $(".bun-squish", btn);
    const press = () => btn.classList.add("is-pressed");
    const release = () => {
      if (!btn.classList.contains("is-pressed")) return;
      btn.classList.remove("is-pressed");
      navigator.vibrate?.(8); // on release: a touch only counts as a user gesture once the finger lifts
      squish.classList.remove("is-bouncing");
      void squish.offsetWidth; // restart the bounce
      squish.classList.add("is-bouncing");
      for (const hint of $$(".tap-hint")) hint.classList.add("is-gone");
    };
    btn.addEventListener("pointerdown", press);
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) btn.addEventListener(ev, release);
    btn.addEventListener("keydown", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      press();
      setTimeout(release, 140);
    });
    squish.addEventListener("animationend", () => squish.classList.remove("is-bouncing"));
  }

  // ── Scroll: top bar, order dock, a little spin and parallax ──
  const nav = $("[data-nav]");
  const hero = $(".hero");
  const dock = $("[data-dock]");
  const spinners = $$(".bun-spin");
  const feature = $(".feature img");
  let ctaInView = false;
  let queued = false;

  function frame() {
    queued = false;
    const y = scrollY;
    const vh = innerHeight;
    nav.classList.toggle("is-solid", y > (hero ? hero.offsetHeight - 80 : 40));
    dock.classList.toggle("is-on", y > vh * 0.85 && !ctaInView);
    if (reduceMotion) return;
    for (const el of spinners) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      const t = (r.top + r.height / 2 - vh / 2) / vh; // -0.5 … 0.5 across the screen
      el.style.setProperty("--spin", `${(t * 26).toFixed(2)}deg`);
    }
    if (feature) {
      const r = feature.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) feature.style.setProperty("--parallax", `${((r.top + r.height / 2 - vh / 2) * -0.08).toFixed(1)}px`);
    }
  }
  const onScroll = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  const lastCall = $(".cta");
  if (lastCall) {
    new IntersectionObserver(([e]) => {
      ctaInView = e.isIntersecting;
      onScroll();
    }).observe(lastCall);
  }
  frame();

  // ── Reveal as things scroll in ──
  const reveal = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      reveal.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  for (const el of $$(".reveal")) reveal.observe(el);

  // ── Videos: only play what's on screen; none at all for reduced motion or data saver ──
  const heroVideo = $("[data-hero]");
  if (!reduceMotion && !lean) {
    const play = (v) => v.play().catch(() => {});
    if (heroVideo) {
      heroVideo.preload = "auto";
      heroVideo.load();
      play(heroVideo);
    }
    const videos = new IntersectionObserver((entries) => {
      for (const { target: v, isIntersecting } of entries) {
        if (isIntersecting) {
          const src = $("source[data-src]", v);
          if (src) {
            src.src = src.dataset.src;
            src.removeAttribute("data-src");
            v.load();
          }
          play(v);
        } else {
          v.pause();
        }
      }
    }, { rootMargin: "200px 0px" });
    for (const v of $$("video[data-lazy]")) videos.observe(v);
    if (heroVideo) videos.observe(heroVideo);
  }

  // ── Photo rails: a progress bar under each swipeable row ──
  for (const rail of $$("[data-rail]")) {
    const bar = rail.nextElementSibling?.matches(".rail-bar") ? $("span", rail.nextElementSibling) : null;
    if (!bar) continue;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const frac = rail.clientWidth / rail.scrollWidth;
      const track = bar.parentElement.clientWidth;
      bar.style.width = `${Math.max(frac * 100, 12)}%`;
      bar.style.setProperty("--x", `${max > 0 ? (rail.scrollLeft / max) * (track - bar.offsetWidth) : 0}px`);
    };
    rail.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  }

  // ── Lightbox: every photo opens full screen; swipe through them all ──
  const zooms = $$("[data-zoom]");
  const box = $(".lightbox");
  if (box && zooms.length && typeof box.showModal === "function") {
    const track = $(".lb-track", box);
    const count = $(".lb-count", box);
    const build = () => {
      for (const z of zooms) {
        const fig = document.createElement("figure");
        fig.className = "lb-slide";
        const alt = $("img", z)?.alt ?? "";
        fig.innerHTML = `<picture><source type="image/avif" srcset="${z.dataset.zoom}"><img src="${z.dataset.zoomJpg}" alt="${esc(alt)}" loading="lazy" decoding="async"></picture><figcaption>${esc(alt)}</figcaption>`;
        track.append(fig);
      }
    };
    const index = () => Math.round(track.scrollLeft / track.clientWidth);
    const setCount = () => (count.textContent = `${index() + 1} / ${zooms.length}`);
    const go = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    zooms.forEach((z, i) => z.addEventListener("click", () => {
      if (!track.childElementCount) build();
      box.showModal();
      document.documentElement.style.overflow = "hidden";
      track.scrollTo({ left: i * track.clientWidth });
      setCount();
    }));
    track.addEventListener("scroll", setCount, { passive: true });
    $(".lb-close", box).addEventListener("click", () => box.close());
    $(".lb-prev", box).addEventListener("click", () => go(Math.max(0, index() - 1)));
    $(".lb-next", box).addEventListener("click", () => go(Math.min(zooms.length - 1, index() + 1)));
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(Math.min(zooms.length - 1, index() + 1));
      if (e.key === "ArrowLeft") go(Math.max(0, index() - 1));
    });
    box.addEventListener("close", () => (document.documentElement.style.overflow = ""));
  }

  const year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  load();
})();
