# Motivational Quotes — 2026 overhaul

Release prepared 23 August 2026.

## Objectives
- Bring the visual language into the same product family as Calm Down Quotes while keeping motivation distinct.
- Preserve the existing `quotes.json` library.
- Make the core experience useful before monetisation.
- Improve technical SEO, accessibility, privacy, performance and shareability.
- Keep operating cost at $0 with static hosting.

## Major changes
- Rebuilt the home experience around a large editorial quote stage.
- Added focus modes for starting, discipline, confidence, resilience, focus and purpose.
- Added local saved quotes.
- Added a privacy-friendly local action streak.
- Added atmosphere themes: Sunrise, Ember and Midnight.
- Added native and social sharing plus client-side quote image generation.
- Added a substantial original practical motivation guide.
- Added an About / editorial standards page.
- Rewrote Privacy and Terms for the current architecture and future monetisation.
- Added 404 page, web app manifest, icon, robots.txt, sitemap.xml, ads.txt and Cloudflare `_headers`.
- Removed direct Google Analytics and AdSense script loading from the core page for this stage. The site is monetisation-ready, but advertising should be activated only after the content/attribution audit and indexing checks.

## Monetisation gate
Do not activate display ads solely because the ad code is available. Before applying or re-applying for AdSense:
1. Audit quote attribution and rights risk.
2. Confirm the production canonical domain.
3. Confirm sitemap indexing in Google Search Console.
4. Confirm the guide/about/privacy/terms pages are live.
5. Check mobile performance and Core Web Vitals.
6. Add advertising only in clearly separated positions that do not interrupt the quote controls.

## Remaining deployment item
The canonical URLs currently retain the existing public GitHub Pages path:
`https://calm-down-quotes.github.io/motivational-quotes/`

If Cloudflare Pages is the final production domain, update canonical, Open Graph URLs, `robots.txt`, and `sitemap.xml` to that production URL before search-engine promotion.
