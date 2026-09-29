"""Google Search Console helper (local use only; credentials stay in ~/.config).

    python tools/gsc.py login              # one-time browser consent, saves the token
    python tools/gsc.py sites              # properties this account can access
    python tools/gsc.py sitemaps SITE      # list sitemaps and their status
    python tools/gsc.py submit SITE        # submit https://www.codewithusman.com/sitemap.xml
    python tools/gsc.py inspect SITE       # URL Inspection for every sitemap URL
    python tools/gsc.py performance SITE [DAYS]  # queries and pages (default 90 days)
SITE is e.g. https://www.codewithusman.com/ or sc-domain:codewithusman.com
"""
from pathlib import Path
from datetime import date, timedelta
import json, sys, xml.etree.ElementTree as ET

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

CONFIG = Path.home() / '.config'
CLIENT, TOKEN = CONFIG / 'gsc-client.json', CONFIG / 'gsc-token.json'
SCOPES = ['https://www.googleapis.com/auth/webmasters']
ROOT = Path(__file__).resolve().parents[1]
SITEMAP = 'https://www.codewithusman.com/sitemap.xml'

def credentials(interactive=False):
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES) if TOKEN.exists() else None
    if creds and creds.expired and creds.refresh_token:
        try: creds.refresh(Request())
        except Exception: creds = None
    if not creds or not creds.valid:
        if not interactive: sys.exit('Not signed in: run  python tools/gsc.py login')
        flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT), SCOPES)
        creds = flow.run_local_server(port=0, open_browser=True, prompt='consent',
                                      authorization_prompt_message='Opening Google sign-in in your browser:\n{url}\n')
    TOKEN.write_text(creds.to_json(), encoding='utf-8')
    try: TOKEN.chmod(0o600)
    except OSError: pass
    return creds

def service():
    return build('searchconsole', 'v1', credentials=credentials(), cache_discovery=False)

def sitemap_urls():
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    return [loc.text for loc in ET.parse(ROOT / 'sitemap.xml').findall('.//s:loc', ns)]

def main(cmd, *args):
    if cmd == 'login':
        credentials(interactive=True); print('Signed in; token saved to', TOKEN)
    elif cmd == 'sites':
        for s in service().sites().list().execute().get('siteEntry', []): print(s['permissionLevel'], s['siteUrl'])
    elif cmd == 'sitemaps':
        print(json.dumps(service().sitemaps().list(siteUrl=args[0]).execute(), indent=1))
    elif cmd == 'submit':
        service().sitemaps().submit(siteUrl=args[0], feedpath=SITEMAP).execute(); print('Submitted', SITEMAP)
    elif cmd == 'inspect':
        api = service().urlInspection().index()
        for url in sitemap_urls():
            r = api.inspect(body={'inspectionUrl': url, 'siteUrl': args[0]}).execute()['inspectionResult']['indexStatusResult']
            print(f"{r.get('verdict','?'):8} {r.get('coverageState','')[:48]:48} crawled={r.get('lastCrawlTime','never')[:10]:10} {url}")
    elif cmd == 'performance':
        days = int(args[1]) if len(args) > 1 else 90
        body = {'startDate': str(date.today() - timedelta(days=days)), 'endDate': str(date.today()), 'rowLimit': 50}
        api = service().searchanalytics()
        for dim in ['query', 'page']:
            rows = api.query(siteUrl=args[0], body=dict(body, dimensions=[dim])).execute().get('rows', [])
            print(f'\nTop {dim}s, last {days} days ({len(rows)} rows)')
            for r in rows: print(f"{r['clicks']:5.0f} clicks {r['impressions']:6.0f} impr  pos {r['position']:5.1f}  {r['keys'][0]}")
    else:
        sys.exit(__doc__)

if __name__ == '__main__':
    main(*(sys.argv[1:] or ['help']))
