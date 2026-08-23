"use strict";

const STORAGE = Object.freeze({
  theme: "mq_theme_v2",
  saved: "mq_saved_v2",
  queue: "mq_queue_v2",
  streak: "mq_streak_v1",
  focus: "mq_focus_v1"
});

const FOCUS = Object.freeze({
  start: {
    label: "Start moving",
    terms: ["action", "start", "goals", "progress", "begin", "motivation"]
  },
  discipline: {
    label: "Build discipline",
    terms: ["discipline", "habits", "consistency", "work", "patience", "process"]
  },
  confidence: {
    label: "Reset confidence",
    terms: ["belief", "confidence", "identity", "courage", "strength", "self-belief"]
  },
  resilience: {
    label: "Stay resilient",
    terms: ["resilience", "grit", "failure", "persistence", "setback", "strength"]
  },
  focus: {
    label: "Find focus",
    terms: ["focus", "clarity", "control", "mindset", "present", "intentional"]
  },
  purpose: {
    label: "Remember why",
    terms: ["purpose", "direction", "values", "character", "growth", "meaning"]
  }
});

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  quote: qs("#quote"),
  author: qs("#author"),
  meaning: qs("#meaning"),
  instruction: qs("#instruction"),
  category: qs("#category"),
  tags: qs("#tags"),
  quoteWrap: qs("#quote-wrap"),
  another: qs("#another"),
  save: qs("#save"),
  share: qs("#share"),
  done: qs("#done-action"),
  savedCount: qs("#saved-count"),
  savedList: qs("#saved-list"),
  clearSaved: qs("#clear-saved"),
  focusLabel: qs("#focus-label"),
  streak: qs("#streak-count"),
  streakPill: qs("#momentum-pill"),
  menu: qs(".menu"),
  nav: qs("#main-nav"),
  shareLayer: qs("#share-layer"),
  shareQuote: qs("#share-quote"),
  closeShare: qs("#close-share"),
  copy: qs("#copy"),
  shareImage: qs("#share-image"),
  shareStatus: qs("#share-status"),
  toast: qs("#toast")
};

let quotes = [];
let currentQuote = null;
let currentFocus = null;
let lastFocused = null;
let transitionTimer = null;

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normaliseText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseQuote(q) {
  return {
    quote: normaliseText(q?.quote),
    author: normaliseText(q?.author),
    meaning: normaliseText(q?.meaning),
    instruction: normaliseText(q?.instruction),
    category: normaliseText(q?.category),
    tags: Array.isArray(q?.tags) ? q.tags.map(normaliseText).filter(Boolean) : []
  };
}

function stableId(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `q${(hash >>> 0).toString(36)}`;
}

function quoteId(q) {
  return stableId(`${q.quote}|${q.author}`);
}

function quoteSearchText(q) {
  return [
    q.quote,
    q.author,
    q.meaning,
    q.instruction,
    q.category,
    ...q.tags
  ].join(" ").toLowerCase();
}

function shuffledIndexes(length) {
  const out = Array.from({ length }, (_, i) => i);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayBefore(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

function getStreakState() {
  const state = safeRead(STORAGE.streak, { dates: [] });
  const dates = Array.isArray(state?.dates)
    ? [...new Set(state.dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
    : [];
  return { dates: dates.slice(-60) };
}

function streakCount() {
  const { dates } = getStreakState();
  if (!dates.length) return 0;

  const set = new Set(dates);
  const today = todayKey();
  let cursor = set.has(today) ? today : dayBefore(today);
  let count = 0;

  while (set.has(cursor)) {
    count += 1;
    cursor = dayBefore(cursor);
  }
  return count;
}

function updateStreakUI() {
  const count = streakCount();
  if (els.streak) els.streak.textContent = String(count);
  if (els.streakPill) {
    els.streakPill.setAttribute(
      "aria-label",
      `${count} day${count === 1 ? "" : "s"} of action momentum`
    );
  }

  const doneToday = getStreakState().dates.includes(todayKey());
  if (els.done) {
    els.done.classList.toggle("done", doneToday);
    els.done.innerHTML = doneToday
      ? '<span aria-hidden="true">✓</span>Action completed today'
      : '<span aria-hidden="true">✓</span>Mark today\'s action done';
  }
}

function completeToday() {
  const state = getStreakState();
  const today = todayKey();
  if (!state.dates.includes(today)) {
    state.dates.push(today);
    state.dates = [...new Set(state.dates)].sort().slice(-60);
    safeWrite(STORAGE.streak, state);
    showToast("Momentum recorded.");
  } else {
    showToast("Today's action is already recorded.");
  }
  updateStreakUI();
}

function getSaved() {
  const list = safeRead(STORAGE.saved, []);
  return Array.isArray(list) ? list.filter((q) => q && q.quote) : [];
}

function saveQuoteSnapshot(q) {
  const list = getSaved();
  const id = quoteId(q);
  if (!list.some((item) => item.id === id)) {
    list.unshift({ ...q, id, savedAt: Date.now() });
    safeWrite(STORAGE.saved, list.slice(0, 80));
    showToast("Saved.");
  } else {
    showToast("Already saved.");
  }
  updateSavedUI();
  updateSaveButton();
}

function removeSaved(id) {
  safeWrite(STORAGE.saved, getSaved().filter((item) => item.id !== id));
  updateSavedUI();
  updateSaveButton();
}

function updateSavedUI() {
  const list = getSaved();
  if (els.savedCount) els.savedCount.textContent = String(list.length);
  if (els.clearSaved) els.clearSaved.hidden = list.length === 0;
  if (!els.savedList) return;

  els.savedList.replaceChildren();

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nothing saved yet. Keep the quotes that actually change how you think or act.";
    els.savedList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach((q) => {
    const card = document.createElement("article");
    card.className = "saved-card";

    const copy = document.createElement("div");
    const quote = document.createElement("blockquote");
    quote.textContent = q.quote;
    const meta = document.createElement("p");
    meta.className = "saved-meta";
    meta.textContent = [q.author, q.category].filter(Boolean).join(" · ");
    copy.append(quote, meta);

    const actions = document.createElement("div");
    actions.className = "saved-card-actions";

    const use = document.createElement("button");
    use.type = "button";
    use.className = "icon-btn";
    use.textContent = "↗";
    use.setAttribute("aria-label", "Use this quote");
    use.addEventListener("click", () => {
      currentQuote = normaliseQuote(q);
      renderQuote(currentQuote, { animate: false });
      showView("home");
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove saved quote");
    remove.addEventListener("click", () => removeSaved(q.id));

    actions.append(use, remove);
    card.append(copy, actions);
    fragment.append(card);
  });

  els.savedList.append(fragment);
}

function updateSaveButton() {
  if (!els.save || !currentQuote) return;
  const id = quoteId(currentQuote);
  const saved = getSaved().some((q) => q.id === id);
  els.save.classList.toggle("is-saved", saved);
  els.save.textContent = saved ? "Saved" : "Save this one";
  els.save.setAttribute("aria-pressed", String(saved));
}

function focusPool() {
  if (!currentFocus || !FOCUS[currentFocus]) return quotes;
  const terms = FOCUS[currentFocus].terms;
  const filtered = quotes.filter((q) => {
    const text = quoteSearchText(q);
    return terms.some((term) => text.includes(term));
  });
  return filtered.length >= 3 ? filtered : quotes;
}

function queueKey() {
  return currentFocus || "all";
}

function nextFromQueue(pool) {
  const key = queueKey();
  const state = safeRead(STORAGE.queue, {});
  const stored = state?.[key];

  let order = Array.isArray(stored?.order) ? stored.order : [];
  let position = Number.isInteger(stored?.position) ? stored.position : 0;

  const valid =
    order.length === pool.length &&
    order.every((n) => Number.isInteger(n) && n >= 0 && n < pool.length) &&
    new Set(order).size === pool.length;

  if (!valid || position >= order.length) {
    order = shuffledIndexes(pool.length);
    position = 0;
  }

  let picked = pool[order[position]];
  position += 1;

  if (currentQuote && pool.length > 1 && quoteId(picked) === quoteId(currentQuote)) {
    if (position >= order.length) {
      order = shuffledIndexes(pool.length);
      position = 0;
    }
    picked = pool[order[position]];
    position += 1;
  }

  state[key] = { order, position };
  safeWrite(STORAGE.queue, state);
  return picked;
}

function dailyQuote() {
  if (!quotes.length) return null;
  const key = todayKey();
  let seed = 0;
  for (const ch of key) seed = ((seed << 5) - seed + ch.charCodeAt(0)) | 0;
  return quotes[Math.abs(seed) % quotes.length];
}

function renderTags(tags) {
  if (!els.tags) return;
  els.tags.replaceChildren();
  tags.slice(0, 3).forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = tag;
    els.tags.append(chip);
  });
}

function renderQuote(q, { animate = true } = {}) {
  if (!q) return;
  clearTimeout(transitionTimer);

  const paint = () => {
    els.quote.textContent = q.quote;
    els.author.textContent = q.author;
    els.meaning.textContent = q.meaning || "Take the useful part of this idea and connect it to what you are facing now.";
    els.instruction.textContent = q.instruction || "Choose one small action that makes the quote practical today.";
    els.category.textContent = q.category || "Motivation";
    renderTags(q.tags);
    currentQuote = q;
    updateSaveButton();
    els.quoteWrap?.classList.remove("changing");
  };

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (animate && !reduced && els.quoteWrap) {
    els.quoteWrap.classList.add("changing");
    transitionTimer = setTimeout(paint, 180);
  } else {
    paint();
  }
}

function anotherQuote() {
  const pool = focusPool();
  if (!pool.length) return;
  renderQuote(nextFromQueue(pool));
}

function setFocus(key) {
  currentFocus = key && FOCUS[key] ? key : null;
  safeWrite(STORAGE.focus, currentFocus);

  if (els.focusLabel) {
    els.focusLabel.textContent = currentFocus ? FOCUS[currentFocus].label : "Today's direction";
  }

  anotherQuote();
  showView("home");
  showToast(currentFocus ? `Focus: ${FOCUS[currentFocus].label}` : "Showing the full collection.");
}

function showView(id) {
  qsa(".view").forEach((view) => {
    const active = view.id === id;
    view.classList.toggle("active", active);
    if (active) view.removeAttribute("aria-hidden");
    else view.setAttribute("aria-hidden", "true");
  });

  qsa("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === id);
  });

  if (id === "saved") updateSavedUI();

  els.nav?.classList.remove("open");
  els.menu?.setAttribute("aria-expanded", "false");

  const target = qs(`#${id}`);
  if (target) {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
}

function shareText(q = currentQuote) {
  if (!q) return "";
  const attribution = q.author ? ` — ${q.author}` : "";
  const nextMove = q.instruction ? `\n\nTry this: ${q.instruction}` : "";
  return `“${q.quote}”${attribution}${nextMove}`;
}

function siteUrl() {
  const canonical = qs('link[rel="canonical"]')?.href;
  return canonical || `${location.origin}${location.pathname}`;
}

function openShareLayer() {
  if (!currentQuote || !els.shareLayer) return;
  lastFocused = document.activeElement;
  els.shareQuote.textContent = shareText(currentQuote);
  els.shareLayer.hidden = false;
  document.body.style.overflow = "hidden";
  els.closeShare?.focus();
}

function closeShareLayer() {
  if (!els.shareLayer) return;
  els.shareLayer.hidden = true;
  document.body.style.overflow = "";
  lastFocused?.focus?.();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function shareUrlFor(kind) {
  const text = shareText();
  const url = siteUrl();
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const links = {
    whatsapp: `https://wa.me/?text=${encodedText}%0A%0A${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent("A motivational quote for you")}&body=${encodedText}%0A%0A${encodedUrl}`
  };
  return links[kind] || "";
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildQuoteImageBlob(q) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      const gradient = ctx.createLinearGradient(0, 0, 1200, 1200);
      gradient.addColorStop(0, "#f7ead3");
      gradient.addColorStop(.52, "#efc16d");
      gradient.addColorStop(1, "#db8b68");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 1200);

      const glow = ctx.createRadialGradient(250, 180, 0, 250, 180, 500);
      glow.addColorStop(0, "rgba(255,255,255,.82)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1200, 1200);

      ctx.fillStyle = "#2b241a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "54px Georgia, serif";

      const quoteLines = wrapCanvasText(ctx, q.quote, 920).slice(0, 8);
      const lineHeight = 66;
      const blockHeight = quoteLines.length * lineHeight;
      let y = 540 - blockHeight / 2;

      quoteLines.forEach((line) => {
        ctx.fillText(line, 600, y);
        y += lineHeight;
      });

      ctx.globalAlpha = .72;
      ctx.font = "28px Arial, sans-serif";
      ctx.fillText(q.author ? `— ${q.author}` : "Motivational Quotes", 600, y + 28);

      ctx.globalAlpha = .9;
      ctx.font = "bold 24px Arial, sans-serif";
      ctx.fillText("MOTIVATIONAL QUOTES", 600, 1040);
      ctx.globalAlpha = .64;
      ctx.font = "20px Arial, sans-serif";
      ctx.fillText("One useful thought. One next move.", 600, 1080);

      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image creation failed")), "image/png", .92);
    } catch (err) {
      reject(err);
    }
  });
}

async function shareAsImage() {
  if (!currentQuote) return;
  if (els.shareStatus) els.shareStatus.textContent = "Preparing image…";

  try {
    const blob = await buildQuoteImageBlob(currentQuote);
    const file = new File([blob], "motivational-quote.png", { type: "image/png" });

    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({
        files: [file],
        title: "Motivational Quote",
        text: "A motivational quote worth keeping."
      });
      if (els.shareStatus) els.shareStatus.textContent = "Shared.";
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "motivational-quote.png";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    if (els.shareStatus) els.shareStatus.textContent = "Image saved.";
  } catch (err) {
    if (err?.name !== "AbortError") {
      if (els.shareStatus) els.shareStatus.textContent = "Image sharing is not supported on this device.";
    }
  }
}

let toastTimer = null;
function showToast(message) {
  if (!els.toast) return;
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function applyTheme(theme) {
  const allowed = ["sunrise", "ember", "midnight"];
  const chosen = allowed.includes(theme) ? theme : "sunrise";
  document.body.classList.remove(...allowed.map((t) => `theme-${t}`));
  document.body.classList.add(`theme-${chosen}`);
  safeWrite(STORAGE.theme, chosen);
  qsa("[data-theme]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.theme === chosen);
    button.setAttribute("aria-pressed", String(button.dataset.theme === chosen));
  });
}

async function loadQuotes() {
  try {
    const response = await fetch("quotes.json", { cache: "default" });
    if (!response.ok) throw new Error(`Quote data returned ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Quote data is not an array");

    quotes = data.map(normaliseQuote).filter((q) => q.quote.length >= 8);
    if (!quotes.length) throw new Error("No valid quotes found");

    currentFocus = safeRead(STORAGE.focus, null);
    if (!FOCUS[currentFocus]) currentFocus = null;
    if (els.focusLabel && currentFocus) els.focusLabel.textContent = FOCUS[currentFocus].label;

    renderQuote(dailyQuote(), { animate: false });
  } catch (err) {
    console.error("Unable to load quotes:", err);
    if (els.meaning) els.meaning.textContent = "The quote library could not be loaded.";
    if (els.instruction) els.instruction.textContent = "Refresh the page and try again.";
    els.another?.setAttribute("disabled", "");
  }
}

function bindEvents() {
  qsa("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  qsa("[data-focus]").forEach((button) => {
    button.addEventListener("click", () => setFocus(button.dataset.focus));
  });

  qsa("[data-theme]").forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.theme));
  });

  els.another?.addEventListener("click", anotherQuote);
  els.save?.addEventListener("click", () => currentQuote && saveQuoteSnapshot(currentQuote));
  els.share?.addEventListener("click", openShareLayer);
  els.done?.addEventListener("click", completeToday);
  qs("#any-focus")?.addEventListener("click", () => setFocus(null));

  els.clearSaved?.addEventListener("click", () => {
    if (window.confirm("Remove all saved quotes from this browser?")) {
      safeWrite(STORAGE.saved, []);
      updateSavedUI();
      updateSaveButton();
      showToast("Saved quotes cleared.");
    }
  });

  els.menu?.addEventListener("click", () => {
    const open = els.nav?.classList.toggle("open");
    els.menu.setAttribute("aria-expanded", String(Boolean(open)));
  });

  els.closeShare?.addEventListener("click", closeShareLayer);
  els.shareLayer?.addEventListener("click", (event) => {
    if (event.target === els.shareLayer) closeShareLayer();
  });

  qsa("[data-share]").forEach((button) => {
    button.addEventListener("click", () => {
      const url = shareUrlFor(button.dataset.share);
      if (!url) return;
      if (button.dataset.share === "email") location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer,width=720,height=620");
    });
  });

  els.copy?.addEventListener("click", async () => {
    try {
      await copyText(`${shareText()}\n\n${siteUrl()}`);
      if (els.shareStatus) els.shareStatus.textContent = "Copied to clipboard.";
    } catch {
      if (els.shareStatus) els.shareStatus.textContent = "Copy is unavailable on this device.";
    }
  });

  els.shareImage?.addEventListener("click", shareAsImage);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.shareLayer && !els.shareLayer.hidden) {
      closeShareLayer();
      return;
    }

    const tag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    if (els.shareLayer && !els.shareLayer.hidden) return;

    if (event.key.toLowerCase() === "a") {
      event.preventDefault();
      anotherQuote();
    } else if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (currentQuote) saveQuoteSnapshot(currentQuote);
    }
  });
}

function init() {
  applyTheme(safeRead(STORAGE.theme, "sunrise"));
  updateSavedUI();
  updateStreakUI();
  bindEvents();
  loadQuotes();
}

init();
