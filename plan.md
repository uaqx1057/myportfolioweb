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

## Status (updated 2026-09-29 by Claude Code)
Done and verified:
- [x] PHPMailer SMTP contact endpoint, validation, rate limiting; SMTP auth check passed (no email sent).
- [x] Legacy cv.html / cv-builder.js redirect to static resumes/PDFs.
- [x] .htaccess: canonical redirects, private-path blocking, headers, caching, ErrorDocument 404.
- [x] Release ZIP (tools/package.py), README deploy docs, CI workflow (not yet run on GitHub), AGENTS.md facts.
- [x] Tests: tests/ (7 passing). Browser checks with Playwright (local .venv, channel=chrome) 20/20: console errors, mobile menu EN/AR, theme toggle, keyboard focus + skip link, contact form validation/success (test mode), language switch.
- [x] Both CV PDFs re-rendered and inspected visually (2 pages each) after DMS/DOBS text change.
- [x] Deployed to Namecheap over SSH; live checks pass (see Deployment log).
- [x] Project images removed at user request; do not re-add without asking.
- [x] DOBS/DMS case studies rewritten from source repos.
- [x] SEO pass: per-page search titles/descriptions (META in build.py, seo_* fields in pages.json), richer JSON-LD (Person, WebSite, 3-level BreadcrumbList, Article dates, SoftwareApplication for DMS/DOBS), og/twitter image alt + locale alternate, localized img alt (data-en-alt/data-ar-alt), icon set + site.webmanifest, 404.html (noindex), Services h2, distinct case-study link text.
- [x] Google Analytics GA4 tag G-8P6LR4C4HG in content/home.html head (every generated page); privacy page discloses it. script.js already sends cv_download / whatsapp_click / case_study_open / contact_success events (no form contents).
- [x] Mobile menu accessibility: closed menu is visibility:hidden (not tabbable); Arabic menu stacks/centres (RTL specificity override).

Still open (needs the user):
- [ ] One real contact-form message to confirm delivery to usmanasif26261@gmail.com.
- [ ] Rotate any tokens that were in the formerly public .mcp.json; delete unused ~/.ssh/id_rsa on the server (cPanel).
- [x] Search Console connected via OAuth (tools/gsc.py; client+token in ~/.config/gsc-*.json, never in repo). Property https://www.codewithusman.com/ (owner). Sitemap resubmitted 2026-09-29: 24 URLs, 0 errors. Inspection: homepage indexed (last crawl 2026-09-05, old version); other 23 discovered/unknown, not yet crawled.
- [ ] User: manually "Request indexing" for priority URLs in Search Console (API cannot); re-run `python tools/gsc.py inspect https://www.codewithusman.com/` in ~1 week.
- [ ] Optional: GA4 cookie-consent banner if targeting EU visitors (not implemented).

## Security incident (2026-09-29)
- The OLD contact.php (live until 2026-09-28 ~19:18 server time) had no rate limit and auto-replied the submitted message to any address: an open spam relay. Thousands of spam notifications reached Gmail spam "from info@".
- Replaced 2026-09-28 (no auto-reply); hardened and deployed 2026-09-29 (commit a9b3733): per-IP 5/15min + 10/day, site-wide 20/hour + 60/day, signed token (GET ?token=1, min 3s, max 2h), Origin required, >2 links rejected, optional Turnstile (config turnstile_site_key / turnstile_secret). Old copy in ~/public_html.bak-20260929 renamed contact.php.disabled-spam-relay.
- Never add an auto-reply to user-supplied addresses.

## Known issues / notes
- Do not claim universal ATS compatibility for the Arabic PDF; /ActualText extraction is tested.
- Sitemap lastmod uses build date for changed pages (content/build-manifest.json keeps unchanged dates).
- social-card.png was generated once by a temporary script (not part of the build).
- Article dates are set to 2026-09-29 in pages.json (published field).
- Headless Chrome enforces a ~500px minimum window; use Playwright viewports or fixed-width iframes for phone widths.

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

## Deployment log
- 2026-09-29: Deployed build/public_html.zip to /home/codewqgx/public_html over SSH (user codewqgx@68.65.121.163 port 21098, local key ~/.ssh/codewithusman_deploy; shell access enabled by Namecheap support). Backup of previous site: ~/public_html.bak-20260929. Mail config at ~/.config/codewithusman/mail.php (600), recipient usmanasif26261@gmail.com. Removed publicly exposed AGENTS.md, CLAUDE.md, README.md, .mcp.json, screenshots and unminified sources. Live checks passed: all routes 200, private paths 403/404, canonical redirects, contact.php 405/422 (web PHP OK). No real email sent yet.

- 2026-09-29 (later): Removed all project card images and case-study diagrams at user request (user found them poor); redeployed commit 9a3920b. Do not re-add project screenshots/diagrams without asking.

- 2026-09-29: Rewrote DOBS/DMS case studies from source repos (DOBS-mysql-updates, DMS-development); user confirmed both are solely their work (git shows ~156 DMS backend commits by another author; user chose 'Designed & built by me'). Deployed commit 2e8788c.

## Suggested next step
See "Still open" above.
