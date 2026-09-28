"""Create build/public_html.zip for Namecheap cPanel.

Allowlist only: generated pages, runtime assets, contact endpoint and PHPMailer.
Source templates, tools, tests, docs and private mail configuration are never packed.
Run after tools/build.py and `composer install --no-dev`.
"""
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'build/public_html.zip'
FILES = [
    '.htaccess', 'robots.txt', 'sitemap.xml', 'index.html', 'googlead2c6a10dcba6e82.html',
    'contact.php', 'cv.html', 'cv-builder.js', 'script.min.js', 'style.min.css',
    'Usman_Asif_Qureshi_CV.pdf', 'Usman_Asif_Qureshi_CV_AR.pdf',
    'Usman_Asif_Qureshi_CV.txt', 'Usman_Asif_Qureshi_CV_AR.txt',
]
DIRECTORIES = ['about', 'ar', 'insights', 'privacy', 'projects', 'resume', 'services', 'assets', 'vendor']
# PDF-build fonts, docs and anything that could hold credentials stay out.
EXCLUDED_SUFFIXES = {'.ttf', '.md', '.py', '.pyc'}
EXCLUDED_NAMES = {'mail.php', 'contact-config.php', '.env', 'composer.json', 'composer.lock'}

def files():
    for name in FILES:
        path = ROOT / name
        if not path.is_file():
            sys.exit(f'Missing release file: {name} (run tools/build.py first)')
        yield path
    for name in DIRECTORIES:
        directory = ROOT / name
        if not directory.is_dir():
            sys.exit(f'Missing release directory: {name}')
        for path in sorted(directory.rglob('*')):
            if (path.is_file() and path.suffix.lower() not in EXCLUDED_SUFFIXES
                    and path.name not in EXCLUDED_NAMES and '__pycache__' not in path.parts):
                yield path

def main():
    if not (ROOT / 'vendor/phpmailer/phpmailer/src/PHPMailer.php').is_file():
        sys.exit('PHPMailer missing: run composer install --no-dev')
    OUTPUT.parent.mkdir(exist_ok=True)
    count = 0
    with zipfile.ZipFile(OUTPUT, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in files():
            archive.write(path, path.relative_to(ROOT).as_posix())
            count += 1
    print(f'Wrote {OUTPUT.relative_to(ROOT).as_posix()} ({count} files, {OUTPUT.stat().st_size // 1024} KB)')

if __name__ == '__main__':
    main()
