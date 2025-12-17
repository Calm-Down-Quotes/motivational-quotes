"use strict";

/* ========================================================
	PAGE + CONSTANTS
======================================================== */
const SITE_URL = "https://calm-down-quotes.github.io/";

// Detect which page we are on by the URL
const PATH =
	typeof window !== "undefined" &&
	window.location &&
	window.location.pathname
		? window.location.pathname.toLowerCase()
		: "";

// Determines if we are on the motivational page or the calm-down (default) page
const IS_MOTIVATION = PATH.includes("motivational-quotes");

// Per-page settings
const PAGE_ID = IS_MOTIVATION ? "motivation" : "calm";

// Distinct storage keys so sequences never collide
const STORAGE_KEY = IS_MOTIVATION
	? "motivation_quotes_state_v1"
	: "calm_down_quotes_state_v3";

// Shared quotes file
const QUOTES_URL = "quotes.json";

const SHARE_BRAND = IS_MOTIVATION ? "Motivational Quotes" : "Calm Down Quotes";
const SHARE_SHORT_TITLE = IS_MOTIVATION
	? "Motivational Quote"
	: "Calm Down Quote";

const SHARE_URL = IS_MOTIVATION
	? `${SITE_URL}motivational-quotes/`
	: SITE_URL;

const PREVIEW_IMAGE_URL = IS_MOTIVATION
	? `${SITE_URL}preview-motivation.png`
	: `${SITE_URL}preview.png`;

const TRANSITION_DURATION_MS = 350;

const PREFERS_REDUCED_MOTION =
	typeof window !== "undefined" &&
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ========================================================
	ANALYTICS HELPER (GA4 SAFE WRAPPER)
======================================================== */
function trackEvent(name, params = {}) {
	try {
		if (typeof window !== "undefined" && typeof window.gtag === "function") {
			window.gtag("event", name, { page_id: PAGE_ID, ...params });
		}
	} catch {
		// analytics must never break runtime
	}
}

/* ========================================================
	DOM REFERENCES
======================================================== */
const quoteBtn = document.getElementById("quote-btn");
const quoteBox = document.getElementById("quote-box");
const quoteText = document.getElementById("quote-text");
const quoteAuthor = document.getElementById("quote-author");
const quoteMeaning = document.getElementById("quote-meaning");
const quoteInstruction = document.getElementById("quote-instruction");
const quoteCategory = document.getElementById("quote-category");
const tagsContainer = document.getElementById("quote-tags");

const copyBtn = document.getElementById("copy-btn");
const copyFeedback = document.getElementById("copy-feedback");

const shareBtn = document.getElementById("share-btn");
const subscribeBtn = document.querySelector(".subscribe-btn");

/* ========================================================
	QUOTE STATE
======================================================== */
let quotes = [];
let quotesLoaded = false;

let shuffledIndices = [];
let currentIndex = 0;

/* ========================================================
	SHUFFLE + STATE PERSISTENCE
======================================================== */
/**
 * Fisher-Yates shuffle algorithm.
 */
function shuffleIndices(len) {
	const arr = Array.from({ length: len }, (_, i) => i);
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function saveState() {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				order: shuffledIndices,
				index: currentIndex
			})
		);
	} catch {}
}

function initialiseOrder() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const state = JSON.parse(raw);
			if (
				Array.isArray(state.order) &&
				typeof state.index === "number" &&
				state.order.length === quotes.length
			) {
				shuffledIndices = state.order;
				currentIndex = Math.max(
					0,
					Math.min(state.index, state.order.length - 1)
				);
				return;
			}
		}
	} catch {}

	shuffledIndices = shuffleIndices(quotes.length);
	currentIndex = 0;
	saveState();
}

/* ========================================================
	LOAD QUOTES
======================================================== */
async function loadQuotes() {
	try {
		const res = await fetch(QUOTES_URL, { cache: "no-cache" });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		const data = await res.json();
		if (!Array.isArray(data) || data.length === 0) {
			throw new Error("Invalid quotes JSON");
		}

		quotes = data;
		quotesLoaded = true;
		initialiseOrder();

		trackEvent("quotes_loaded", { total_quotes: quotes.length });

		// Generate the first quote immediately on success
		if (quotes.length > 0) {
			generateQuote();
		}
	} catch (err) {
		console.error("Quote load failed:", err);
		trackEvent("quotes_load_error", { message: String(err) });

		if (!quoteBox) return;

		quoteText.textContent = "Unable to load quotes.";
		quoteMeaning.textContent = "Please check back later.";
		quoteAuthor.textContent = "";
		quoteInstruction.textContent = "";
		quoteCategory.textContent = "";
		if (tagsContainer) tagsContainer.innerHTML = "";

		quoteBox.classList.remove("hidden");
		quoteBox.classList.add("visible");
	}
}

loadQuotes();

/* ========================================================
	TAG RENDERING
======================================================== */
function renderTagChips(tags) {
	if (!tagsContainer) return;

	tagsContainer.innerHTML = "";
	if (!tags) return;

	const list = Array.isArray(tags) ? tags : [tags];

	list
		.filter((t) => typeof t === "string" && t.trim())
		.forEach((t) => {
			const chip = document.createElement("span");
			chip.className = "tag-chip";
			chip.textContent = t.trim();
			tagsContainer.appendChild(chip);
		});
}

/* ========================================================
	QUOTE GENERATION
======================================================== */
function generateQuote() {
	if (!quotesLoaded || !quotes.length || !quoteBox) return;

	if (currentIndex >= shuffledIndices.length) {
		// Reset shuffle once all quotes have been shown
		shuffledIndices = shuffleIndices(quotes.length);
		currentIndex = 0;
	}

	const q = quotes[shuffledIndices[currentIndex]];
	currentIndex++;
	saveState();

	if (quoteBtn) {
		quoteBtn.textContent = IS_MOTIVATION
			? "Give Me Another Motivational Quote"
			: "Give Me Another Quote";
	}

	const update = () => {
		// 1. Update Content
		quoteText.textContent = (q?.quote || "").trim();
		quoteAuthor.textContent = (q?.author || "").trim();
		quoteMeaning.textContent = (q?.meaning || "").trim();
		quoteInstruction.textContent = (q?.instruction || "").trim();
		quoteCategory.textContent = (q?.category || "").trim();
		renderTagChips(q?.tags);

		// 2. Display
		quoteBox.classList.remove("hidden");
		
		// Reflow/Animate logic
		if (!PREFERS_REDUCED_MOTION) {
			quoteBox.classList.remove("visible");
			void quoteBox.offsetWidth; // Force reflow
		}
		quoteBox.classList.add("visible");
		
		// 3. Scroll into View (Improvement: Only scroll if needed on initial load or if box is off-screen)
		const boxTop = quoteBox.getBoundingClientRect().top;
		if (boxTop < 0 && window.scrollY > 0) {
			quoteBox.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	// Use timeout for smooth fade-out/fade-in animation
	if (!PREFERS_REDUCED_MOTION && quoteBox.classList.contains("visible")) {
		quoteBox.classList.remove("visible");
		setTimeout(update, TRANSITION_DURATION_MS);
	} else {
		update();
	}

	trackEvent("quote_generated", {
		index: currentIndex - 1,
		total_quotes: quotes.length,
		category: q?.category || "unknown"
	});
}

quoteBtn?.addEventListener("click", generateQuote);

/* ========================================================
	KEYBOARD SHORTCUT
======================================================== */
document.addEventListener("keydown", (event) => {
	if (!quoteBtn) return;

	const active = document.activeElement;
	// Only trigger if active element is body, the button itself, or the main container
	const canTrigger =
		active === document.body ||
		active === quoteBtn ||
		active?.tagName === "MAIN";

	if (!canTrigger) return;

	if (
		event.key === " " ||
		event.key === "Spacebar" ||
		event.key === "Enter" ||
		event.key === "ArrowRight"
	) {
		event.preventDefault();
		trackEvent("quote_keyboard_shortcut", { key: event.key });
		generateQuote();
	}
});

/* ========================================================
	SHARE TEXT
======================================================== */
function buildShareText() {
	const q = quoteText.textContent.trim();
	if (!q) return "";

	// Clean author field of leading dash if present
	const author = quoteAuthor.textContent
		.replace(/^—\s*/, "")
		.trim();

	const parts = [
		`"${q}"`,
		author ? `by ${author}` : "",
		"",
		quoteMeaning.textContent.trim(),
		"",
		quoteInstruction.textContent.trim(),
		quoteCategory.textContent.trim()
			? `Category: ${quoteCategory.textContent.trim()}`
			: "",
		tagsContainer && tagsContainer.children.length
			? "Tags: " +
			  Array.from(tagsContainer.children)
				.map((el) => el.textContent.trim())
				.join(", ")
			: "",
		"",
		`Shared from ${SHARE_BRAND}`,
		SHARE_URL
	].filter(Boolean);

	return parts.join("\n");
}

function requireShareText() {
	const t = buildShareText();
	if (!t) {
		alert("Please generate a quote first.");
		return null;
	}
	return t;
}

/* ========================================================
	COPY
======================================================== */
copyBtn?.addEventListener("click", async () => {
	const text = requireShareText();
	if (!text) return;

	try {
		if (!navigator.clipboard || !navigator.clipboard.writeText) {
			throw new Error("Clipboard API not available");
		}
		
		await navigator.clipboard.writeText(text);
		trackEvent("quote_copied");

		if (copyFeedback) {
			copyFeedback.textContent = "Copied.";
			copyFeedback.classList.add("visible");
			setTimeout(() => copyFeedback.classList.remove("visible"), 1500);
		}
	} catch {
		alert("Copy is not supported on this device. Please use the Share button.");
	}
});

/* ========================================================
	NATIVE SHARE (and Fallback)
======================================================== */
shareBtn?.addEventListener("click", async () => {
	const text = buildShareText();
	if (!text) return;

	if (navigator.share) {
		try {
			await navigator.share({
				title: SHARE_SHORT_TITLE,
				text: text.substring(0, 250), // Use truncated text for better compatibility with native dialogs
				url: SHARE_URL
			});
			trackEvent("share_native");
		} catch (e) {
			if (e.name !== "AbortError") {
				console.error("Native share failed:", e);
			}
		}
	} else {
		// Fallback to copying the full text to clipboard
		try {
			if (!navigator.clipboard || !navigator.clipboard.writeText) {
				alert("Sharing is not supported on this device.");
				return;
			}
			await navigator.clipboard.writeText(text);
			trackEvent("share_fallback_copy");
			
			// Provide copy feedback for the fallback
			if (copyFeedback) {
				copyFeedback.textContent = "Share text copied.";
				copyFeedback.classList.add("visible");
				setTimeout(() => copyFeedback.classList.remove("visible"), 2000);
			}
		} catch {
			alert("Sharing is not supported on this device.");
		}
	}
});

/* ========================================================
	SUBSCRIBE TRACKING
======================================================== */
subscribeBtn?.addEventListener("click", () => {
	trackEvent("subscribe_click", { page: PAGE_ID });
});

/* ========================================================
	MOBILE SWIPE
======================================================== */
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener(
	"touchstart",
	(e) => {
		const t = e.touches?.[0];
		touchStartX = t?.clientX || 0;
		touchStartY = t?.clientY || 0;
	},
	{ passive: true }
);

document.addEventListener(
	"touchend",
	(e) => {
		const t = e.changedTouches?.[0];
		const dx = (t?.clientX || 0) - touchStartX;
		const dy = (t?.clientY || 0) - touchStartY;

		// Swipe threshold: > 60px horizontal movement, and horizontal movement must be at least twice the vertical movement (to ignore scrolling)
		if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
			trackEvent("quote_swiped");
			generateQuote();
		}
	},
	{ passive: true }
);
