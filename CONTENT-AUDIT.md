# Motivational Quotes Content Audit — 23 August 2026

## Executive decision

The original live library contained 40 attributed quotations. The data structure was complete, but the library relied too heavily on third-party quotations for a site intended to become a monetised publishing asset.

The live library has therefore been redesigned around original editorial material owned by Motivational Quotes. The retired 40-record library remains preserved in Git history and the dedicated audit branch for historical reference and provenance research; it is not shipped from the production branch and is no longer served by the public quote engine.

This is an editorial and risk-reduction decision, not a legal opinion.

## Original library findings

- 40 total records.
- 40/40 records included quote, author, meaning, action instruction, category and tags.
- No exact duplicate quote text was identified.
- 24 distinct categories for only 40 records, creating unnecessary fragmentation.
- Author names were routinely included as tags, which added little value to the six focus modes.
- Several entries were modern quotations or modern attributions, increasing provenance and rights-management work.
- Multiple attributions were demonstrably unreliable.

## Confirmed attribution problems found during review

1. `If you are going through hell, keep going.` — attributed in the old library to Winston Churchill. The International Churchill Society states that this phrase does not appear in Churchill's written or spoken canon.
2. `Success is not final, failure is not fatal: it is the courage to continue that counts.` — attributed in the old library to Winston Churchill. The International Churchill Society states that it cannot be attributed to Churchill.
3. `If you can dream it, you can do it.` — attributed in the old library to Walt Disney. Disney's D23/Walt Disney Archives states that Walt Disney never said it and identifies Imagineer Tom Fitzgerald in connection with the Horizons wording.
4. `You are never too old to set another goal or to dream a new dream.` — attributed in the old library to C. S. Lewis. Wikiquote lists it as misattributed and notes no primary source for Lewis.
5. `Luck is what happens when preparation meets opportunity.` — attributed in the old library to Seneca. Wikiquote lists the attribution as disputed and notes that the Seneca attribution appears only in much later sources.

These examples were enough to establish that the old library required a provenance review rather than assuming common internet attributions were reliable.

## Copyright and monetisation considerations

The Australian Attorney-General's Department states that copyright generally lasts 70 years after the death of an author for works. Whether any particular short quotation is protected can depend on the work and circumstances, so the simplest scalable publishing model is to prioritise original editorial material.

Google Publisher Policies also state that Google-served ads should not be placed on replicated content from others without additional commentary, curation or added value, and that low-value/no-publisher-content pages may not be monetised.

## Replacement library standard

The new live `quotes.json` contains:

- 72 original quote records.
- 6 balanced editorial categories, exactly matching the site's six user focus modes.
- 12 records per category.
- Original quote text, interpretation and action instruction on every record.
- `Motivational Quotes` as the publisher/author identity.
- Four functional tags per record.
- Stable record IDs (`mq-001` through `mq-072`).
- `source: "Original editorial"` on every record.
- No exact duplicate quote text.
- No high-similarity duplicate pairs detected in the internal validation pass.

### Categories

- Start & Momentum
- Discipline & Consistency
- Confidence & Courage
- Resilience & Recovery
- Focus & Clarity
- Purpose & Direction

## Editorial rule going forward

New public quotes should default to original Motivational Quotes editorial content. Third-party quotations should only return to the live library when provenance has been checked, attribution is supportable, and rights/use considerations are acceptable for the intended jurisdiction and commercial use.

## Sources used for this audit

- Australian Attorney-General's Department — Copyright basics: https://www.ag.gov.au/rights-and-protections/copyright/copyright-basics
- Google Publisher Policies — replicated content: https://support.google.com/publisherpolicies/answer/11190248
- Google Publisher Policies — screens without publisher content: https://support.google.com/publisherpolicies/answer/11112688
- International Churchill Society — falsely attributed quotes: https://winstonchurchill.org/resources/quotes/quotes-falsely-attributed/
- Disney D23 / Walt Disney Archives — `If you can dream it, you can do it`: https://d23.com/ask-the-archives/walter-elias-disney/page/5/
- Wikiquote — C. S. Lewis: https://en.wikiquote.org/wiki/CS_Lewis
- Wikiquote — Seneca the Younger: https://en.wikiquote.org/wiki/Seneca_the_Younger
