# Code With Usman — portfolio

Bilingual (English `/`, Arabic `/ar/`) static portfolio for https://www.codewithusman.com/, with a PHP contact endpoint. Hosted on Namecheap cPanel.

## Editing content

Do not edit generated HTML (`index.html`, `ar/`, `about/`, `projects/`, `resume/`, …) by hand. Edit the sources instead:

- `content/home.html`: the homepage template. Localized text goes in `data-en` / `data-ar` attributes.
- `content/pages.json`: case studies, technical notes, services, about and privacy pages.
- `style.css`, `script.js`: styles and behaviour. The pages load the minified copies.

Case studies for DMS and DOBS must never include real screens, live-system links or private data. Use the conceptual SVG diagrams only.

## Build

```powershell
.venv/Scripts/python -m pip install -r requirements.txt   # once
npm ci --no-audit --no-fund                               # once
composer install --no-dev                                 # once (PHPMailer)

npm run assets --silent                  # minify script.js / style.css
.venv/Scripts/python tools/build.py      # pages, sitemap, PDFs, text CVs
.venv/Scripts/python -m unittest discover -s tests
```

`tools/build.py` generates 24 localized pages with canonical/hreflang tags, JSON-LD, `sitemap.xml`, and both CVs (`Usman_Asif_Qureshi_CV*.pdf` / `.txt`, via `tools/build_cv.py`). The contact tests run an isolated `php -S` server in test mode, so they never send email. PHP must be on `PATH` (locally: `C:\xampp\php`).

Local preview: `php -S 127.0.0.1:8080 tools/router.php`. The router blocks private paths the same way `.htaccess` does.

## Deploy (Namecheap cPanel)

1. Build and test (above), then run `.venv/Scripts/python tools/package.py`, which writes `build/public_html.zip`. The archive holds public runtime files only (an allowlist): no sources, tools, tests, docs or config.
2. In cPanel File Manager, upload the ZIP to `public_html` and extract it over the existing files.
3. Set up mail once, **outside** `public_html`: copy `mail-config.example.php` to `~/.config/codewithusman/mail.php` (for example `/home/<cpanel-user>/.config/codewithusman/mail.php`). Fill in the mailbox password and a random `rate_salt` (`php -r "echo bin2hex(random_bytes(32));"`), then run `chmod 600` on the file. Never commit this file or put it in the ZIP.
4. Optional SMTP check, which sends no email: `CODEWITHUSMAN_MAIL_CONFIG=~/.config/codewithusman/mail.php php tools/check-smtp.php`. Run it from a local checkout, or upload the script outside `public_html`.
5. Check the site in a browser: `/`, `/ar/`, `/resume/`, the PDF downloads, and a contact-form message.
6. Search Console: submit `https://www.codewithusman.com/sitemap.xml`.

## Contact endpoint

`contact.php` sends through SMTP (`codewithusman.com:465`, implicit TLS, authenticated as `info@codewithusman.com`) to the personal Gmail inbox. It also:

- validates input and counts length in Unicode characters,
- checks the request's Origin header,
- rate-limits each IP to 5 requests per 15 minutes (only hashed IPs are stored),
- uses a honeypot field (`_gotcha`),
- never sends automatic replies to submitted addresses.
