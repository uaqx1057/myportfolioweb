# Portfolio upgrade and handoff plan

Updated: 2026-09-29. This is an ACTIVE implementation, not a completed release.

## User decisions and authorization
- Implement the website/CV/SEO audit recommendations now.
- DMS and DOBS MUST NOT expose original screens, live-system links, or private data. Public case studies and explicitly labelled conceptual diagrams are allowed.
- Actual iLab / SpeedLogi employment: September 2025–September 2026. Actively seeking new roles.
- Remove old Speedlogi email. Keep clickable https://www.codewithusman.com/ and personal Gmail.
- Hosting: Namecheap cPanel. Source: personal GitHub, origin already configured.
- info@codewithusman.com is an existing mailbox. SMTP host codewithusman.com, implicit TLS port 465, authentication required.
- User provided a mailbox password in conversation. NEVER put it in this file, source, Git, release archive, logs, or public_html. Private configuration still needs to be created outside the repository/public root. Do not ask the user to repeat it if it remains available in context.
- Google Search Console verification status is not yet answered. Analytics provider is not configured.
- Do not invent project metrics, credentials, screenshots, or client verification links.
- User requested this plan so another model / Claude Code can continue.

## Starting state
- Previous commits: bac7703 (employment/contact update), c348662 (start date correction).
- Audit confirmed: live site still had March 2024 start date; structured data falsely said current iLab employer; Arabic mobile hero forced two columns; Arabic PDF image-only; one URL for both languages; generic project cards; heavy hero; contact used PHP mail without rate limits.
- Graphify is not installed / not on PATH. Query/update attempts fail. Do not claim the graph is updated.
- PHP 8.2 available at C:/xampp/php/php.exe. Node/npm and Python available.
- No subagents authorized. Work locally unless user requests delegation.

## Architecture selected
- Keep static HTML/CSS/JS + PHP, compatible with cPanel. No forced framework migration.
- `content/home.html`: bilingual canonical home content/template; edit this, not generated index.html.
- `content/pages.json`: bilingual case studies / technical notes.
- `tools/build.py`: generates English `/` and Arabic `/ar/` routes, metadata, canonical/hreflang, sitemap, CV data, diagrams.
- `tools/build_cv.py`: single-column Unicode PDFs using fpdf2 + HarfBuzz; produces static PDF/text and resume HTML.
- English and Arabic resume routes: `/resume/`, `/ar/resume/`.
- Generated root CV filenames remain compatible with earlier downloads.
- Private SMTP configuration must be outside public_html. Release ZIP must include only public runtime artifacts plus dependencies, never source/config/secrets.

## Completed implementation so far (not fully verified)
- [x] Created `.venv`, Python requirements, npm asset minifiers; .gitignore excludes local env/tools/vendor/secrets.
- [x] Migrated homepage to `content/home.html` with simpler navigation, shorter hero, truthful dates, consistent name, permanent form labels, three selected testimonials, private case-study links, no stale worksFor schema.
- [x] Added three case studies: DOBS, DMS, business websites. Added two practical technical notes.
- [x] Added `tools/build.py`; first successful build produces 24 English/Arabic HTML pages with localized initial HTML, self-canonicals, reciprocal hreflang, JSON-LD, sitemap.
- [x] Added SVG conceptual diagrams for case studies and branded social-card.png.
- [x] Appended responsive and readability CSS; Arabic mobile single-column override; CTAs precede portrait; simplified font families.
- [x] Replaced client language mutation block with crawlable language-link navigation and legacy query handling. Added optional privacy-conscious analytics event adapter (no provider enabled).
- [x] Generated two-page English and Arabic CVs using fpdf2. English extraction passes. Arabic renders correctly and has text, but extraction still needs stronger validation (see known issues).
- [x] Downloaded Amiri fonts and OFL license from Google Fonts for Arabic PDFs.
- [x] Contact credential setup questions answered for mailbox and SMTP host; Search Console unanswered.

## In progress / required before completion
- [x] Replace `contact.php` with PHPMailer SMTP, strict input validation, Unicode lengths, origin checking, atomic rate limits, safe error handling, no arbitrary-address autoresponder.
- [x] Create example mail config and actual private config (~/.config/codewithusman/mail.php, outside repo); `tools/check-smtp.php` verifies TLS + authentication only (no message sent without explicit authorization).
- [x] Composer PHPMailer ^7.0 installed in vendor/ (gitignored).
- [x] Legacy cv.html/cv-builder.js now redirect to static resumes/PDFs.
- [x] Add `.htaccess` canonical index redirects, source/private-directory blocking, no directory listing, useful security headers, static PDF cache behavior.
- [x] Build deployment ZIP (tools/package.py -> build/public_html.zip) for Namecheap public_html; separate instructions/config step for outside public_html.
- [x] Add a safe local PHP router (tools/router.php) and automated tests (tests/, 7 passing 2026-09-29): localized HTML, internal links/assets, private systems excluded, correct dates, schema, PDF text/links/page counts, contact validation/rate limiting in test-only process with no outgoing email.
- [~] Browser checks (headless Chrome via fixed-width iframes, 2026-09-29): EN/AR layout OK at 360/390/768/1366 after fixing EN About two-column overflow at <=480px (specificity bug). STILL TODO manually: mobile menu open/close, form submit UX, light theme, keyboard focus, console errors; mobile menu, contact forms, light/dark, keyboard focus; inspect console errors.
- [ ] Re-render/inspect final PDFs after fixes and run extraction checks.
- [ ] Replace public website cards with screenshots where feasible; do not capture DMS/DOBS. Other public project links returned 403/406 to automated requests, so do not call them broken without browser verification.
- [x] Add README/build/deployment instructions, CI build/check workflow (.github/workflows/build.yml, not yet run on GitHub), AGENTS.md maintenance facts.
- [ ] Check git diff, ensure no secrets/temp/vendor files are staged, checkpoint commits when a working state is verified.
- [ ] Confirm deployment access with user. Do not claim live changes until deployed and verified.
- [ ] Search Console verification/sitemap submission and analytics activation require account setup. Record what remains rather than fabricate completion.

## Known issues to resolve
- Arabic PDF: fpdf2 shaped decorative glyphs have empty Unicode tuples. `tools/build_cv.py` maps these to U+200D to avoid control characters. PDFium sees dates and Laravel; pypdf extraction of mixed Arabic/Latin still truncates some spans. Need robust semantic extraction, preferably ActualText support or an alternative validated rendering path. Do not claim universal ATS compatibility.
- PDF education dates were initially omitted; extraction now includes p and span in education cards (fixed in build.py).
- Migration used BeautifulSoup on all strings, which turned HTML comments into visible plain-text section labels in `content/home.html` (e.g. `Education Section`). Remove these stray labels before finalizing.
- Build currently uses current date for changed sitemap entries. Generated `content/build-manifest.json` preserves unchanged dates.
- `tools/build.py` currently generates diagrams each run; branded social preview was generated once by tmp/review-new.py, should gain a reproducible build step.
- New article copy is original draft content based on general practice, not claims of specific unverified project results.
- Source templates should be blocked from HTTP and excluded from release ZIP.

## Commands and runtime notes
```powershell
.venv/Scripts/python -m pip install -r requirements.txt
npm ci --no-audit --no-fund
npm run assets --silent
.venv/Scripts/python tools/build.py
php -l contact.php
node --check script.js
git diff --check
```
- PDF render script currently `tmp/review-new.py`; creates `tmp/new-cv-review.png` (all PDF pages side by side) and social preview.
- `tmp/render-cvs.py` and tmp/pdf-tools are leftovers from earlier turn. Do not ship them.
- Local Python server on 127.0.0.1:8765 may still be running. A PDF-save test server on 8766 may also be running. Do not use its modified download behavior for final product tests.
- Browser automation must use cua_repl. Browser id was `1` (Chrome), bindings may need to be reacquired. Read returned API docs. Restore viewport after responsive testing.
- PageSpeed API returned HTTP 429 during audit; no verified Lighthouse score exists.
- Current changes are uncommitted after c348662. Keep this file updated before handoff.

## Suggested next step
Checkpoint committed 2026-09-29 (Claude Code). Remaining: release ZIP, README/CI/AGENTS docs, browser checks, SMTP auth check (needs user OK), deployment, Search Console/analytics.
