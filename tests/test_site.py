"""Public contract checks: indexing, navigation, confidentiality and CV content."""
from pathlib import Path
from urllib.parse import urlparse, unquote
from bs4 import BeautifulSoup
from pypdf import PdfReader
from pypdf.generic import ContentStream
import pypdfium2 as pdfium
import json
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=json.loads((ROOT/'content/build-manifest.json').read_text())
class SiteChecks(unittest.TestCase):
    def test_localized_pages_and_metadata(self):
        titles=set()
        for route in MANIFEST:
            with self.subTest(route=route):
                raw=(ROOT/route.lstrip('/')/'index.html').read_text(encoding='utf-8')
                soup=BeautifulSoup(raw,'html.parser');lang='ar' if route.startswith('/ar/') else 'en'
                self.assertTrue(raw.lower().startswith('<!doctype html>'))
                self.assertEqual(soup.html['lang'],lang)
                self.assertEqual(soup.html['dir'],'rtl' if lang=='ar' else 'ltr')
                self.assertEqual(len(soup.select('h1')),1)
                self.assertEqual(soup.select_one('link[rel="canonical"]')['href'],'https://www.codewithusman.com'+route)
                self.assertNotIn('noindex',str(soup.select('meta[name="robots"]')))
                self.assertEqual({a['hreflang'] for a in soup.select('link[hreflang]')},{'en','ar','x-default'})
                self.assertNotIn(soup.title.text,titles);titles.add(soup.title.text)
                self.assertNotIn('usman@speedlogi.sa',raw)
                self.assertNotIn('https://dobs.speedlogi.sa',raw)
                self.assertNotIn('https://dms.speedlogi.sa',raw)
                for tag in soup.select('script[type="application/ld+json"]'):
                    graph=json.loads(tag.string)
                    self.assertNotIn('worksFor',json.dumps(graph))
                if lang=='ar':self.assertGreater(sum('\u0600'<=c<='\u06ff' for c in soup.select_one('main').text),100)
    def test_internal_destinations_and_fragments(self):
        for route in MANIFEST:
            soup=BeautifulSoup((ROOT/route.lstrip('/')/'index.html').read_text(encoding='utf-8'),'html.parser')
            for el in soup.select('[href],[src],[srcset]'):
                value=el.get('href',el.get('src',el.get('srcset','')))
                url=urlparse(value)
                if url.scheme or value.startswith('//'):continue
                path=url.path or route
                target=ROOT/unquote(path).lstrip('/')
                if target.is_dir():target=target/'index.html'
                with self.subTest(route=route,url=value):
                    self.assertTrue(target.is_file(),str(target))
                    if url.fragment and target.suffix=='.html':
                        destination=BeautifulSoup(target.read_text(encoding='utf-8'),'html.parser')
                        self.assertIsNotNone(destination.find(id=url.fragment),value)
    def test_sitemap_matches_public_routes(self):
        tree=ET.parse(ROOT/'sitemap.xml')
        locations={url.text.replace('https://www.codewithusman.com','') for url in tree.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
        self.assertEqual(locations,set(MANIFEST))
    def test_dates_and_form_labels(self):
        for lang,route in [('en','/'),('ar','/ar/')]:
            soup=BeautifulSoup((ROOT/route.lstrip('/')/'index.html').read_text(encoding='utf-8'),'html.parser')
            first=soup.select_one('.experience-period').text
            self.assertIn('2025',first);self.assertIn('2026',first);self.assertNotIn('2024',first)
            self.assertEqual(len(soup.select('.nav-menu a')),5)
            for field in soup.select('#contactForm input:not([name="_gotcha"]),#contactForm textarea'):
                self.assertIsNotNone(soup.find('label',attrs={'for':field.get('id')}))
    def test_cv_text_links_and_length(self):
        for lang,suffix in [('en',''),('ar','_AR')]:
            filename=ROOT/f'Usman_Asif_Qureshi_CV{suffix}.pdf'
            reader=PdfReader(filename)
            self.assertEqual(len(reader.pages),2)
            doc=pdfium.PdfDocument(str(filename))
            text=' '.join(p.get_textpage().get_text_range() for p in doc)
            self.assertGreater(len(text),2500)
            self.assertIn('2025',text);self.assertIn('2026',text);self.assertIn('Laravel',text)
            if lang=='ar':self.assertGreater(sum('\u0600'<=c<='\u06ff' for c in text),1000)
            links=[a.get_object().get('/A',{}).get('/URI','') for p in reader.pages for a in p.get('/Annots',[])]
            self.assertIn('https://www.codewithusman.com/',links)
            self.assertFalse(any('dobs.speedlogi.sa' in u or 'dms.speedlogi.sa' in u for u in links))
            plaintext=(ROOT/f'Usman_Asif_Qureshi_CV{suffix}.txt').read_text(encoding='utf-8')
            self.assertIn('2017 - 2021',plaintext)
            self.assertIn('2025',plaintext)
            semantic=[]
            for page in reader.pages:
                for operands,operator in ContentStream(page.get_contents(),reader).operations:
                    if operator==b'BDC' and len(operands)>1 and '/ActualText' in operands[1]:
                        semantic.append(str(operands[1]['/ActualText']))
            self.assertIn('2025',' '.join(semantic))
            if lang=='ar':
                self.assertIn('عثمان آصف قريشي',semantic)
                self.assertIn('Laravel',' '.join(semantic))
if __name__=='__main__':unittest.main()
