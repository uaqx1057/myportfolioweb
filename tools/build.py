"""Generate deployable bilingual HTML, sitemap, and searchable CVs.

Edit content/home.html and content/pages.json, then run python tools/build.py.
The web server needs only the generated files and PHP for the contact endpoint.
"""
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import date
from html import escape
from urllib.parse import quote, urljoin
import copy
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_cv import build_cv

BASE = 'https://www.codewithusman.com'
SOURCE = BeautifulSoup((ROOT / 'content/home.html').read_text(encoding='utf-8'), 'html.parser')
PAGES = json.loads((ROOT / 'content/pages.json').read_text(encoding='utf-8'))
MANIFEST_PATH = ROOT / 'content/build-manifest.json'
old_manifest = json.loads(MANIFEST_PATH.read_text()) if MANIFEST_PATH.exists() else {}
manifest = {}
urls = []

def text(node, lang):
    return node.get('data-' + lang, node.get_text(' ', strip=True)) if node else ''

def path_for(path, lang):
    return ('/ar/' if lang == 'ar' else '/') + (path.strip('/') + '/' if path else '')

def localize(soup, lang):
    for el in soup.select('[data-en]'):
        if not el.find(True):
            el.string = el.get('data-' + lang, el.get_text())
    for el in soup.select('[data-en-content]'):
        el['content'] = el.get('data-' + lang + '-content', el.get('content',''))
    for el in soup.select('[data-en-placeholder]'):
        el['placeholder'] = el.get('data-' + lang + '-placeholder','')
    for el in soup.select('[data-en-aria]'):
        el['aria-label'] = el.get('data-' + lang + '-aria','')
    for el in soup.select('a[href]'):
        href = el['href']
        if href.startswith('/') and not href.startswith(('/assets/','/ar/')) and not Path(href).suffix:
            if lang == 'ar': el['href'] = '/ar' + href
        if 'cv-download-link' in el.get('class',[]):
            el['href'] = '/Usman_Asif_Qureshi_CV' + ('_AR' if lang == 'ar' else '') + '.pdf'
            el['download'] = 'Usman_Asif_Qureshi_CV_' + lang.upper() + '.pdf'
            el.attrs.pop('target',None)
        if 'whatsapp-contact-link' in el.get('class',[]):
            el['href'] = 'https://wa.me/966568465058?text=' + quote(el.get('data-' + lang + '-message',''))
    soup.html['lang'] = lang
    soup.html['dir'] = 'rtl' if lang == 'ar' else 'ltr'
    soup.html['data-theme'] = 'dark'
    soup.body['class'] = ['lang-ar'] if lang == 'ar' else []
    soup.select_one('nav.navbar')['aria-label'] = 'التنقل الرئيسي' if lang == 'ar' else 'Primary navigation'
    # Freeze visible content in HTML. Language changes navigate to a separate document.
    for el in soup.find_all(True):
        for key in list(el.attrs):
            if key.startswith(('data-en','data-ar')): del el[key]
    return soup

def setup_head(soup, path, lang, title, description, kind='WebPage'):
    soup.title.string = title
    soup.select_one('meta[name="description"]')['content'] = description
    url = BASE + path_for(path, lang)
    soup.select_one('link[rel="canonical"]')['href'] = url
    for tag in soup.select('link[hreflang]'):tag.decompose()
    for locale in ['en','ar','x-default']:
        soup.head.append(soup.new_tag('link', rel='alternate', hreflang=locale, href=BASE + path_for(path, 'en' if locale=='x-default' else locale)))
    for prop,value in [('og:title',title),('og:description',description),('og:url',url),('og:locale','ar_SA' if lang=='ar' else 'en_US'),('og:type','article' if kind=='Article' else 'website'),('og:image',BASE+'/assets/images/social-card.png'),('og:image:width','1200'),('og:image:height','630')]:
        tag=soup.select_one(f'meta[property="{prop}"]')
        if tag:tag['content']=value
    for name,value in [('twitter:title',title),('twitter:description',description),('twitter:card','summary_large_image'),('twitter:image',BASE+'/assets/images/social-card.png')]:
        soup.select_one(f'meta[name="{name}"]')['content']=value
    toggle=soup.select_one('#langToggle');other='en' if lang=='ar' else 'ar'
    toggle['href']=path_for(path,other);toggle['hreflang']=other;toggle['lang']=other
    toggle['aria-label']='Switch to English' if lang=='ar' else 'التبديل إلى العربية'
    toggle.string='English' if lang=='ar' else 'العربية'
    person={'@type':'Person','@id':BASE+'/#person','name':'Usman Asif Qureshi','url':BASE+'/','jobTitle':'Full-Stack Developer & Project Manager','sameAs':['https://www.linkedin.com/in/usmanasif1057/'],'image':BASE+'/assets/images/profile-hero.webp','address':{'@type':'PostalAddress','addressLocality':'Al Khobar','addressCountry':'SA'}}
    page={'@type':kind,'@id':url+'#page','url':url,'name':title,'description':description,'inLanguage':lang,'isPartOf':{'@id':BASE+'/#website'}}
    if kind=='ProfilePage':page['mainEntity']={'@id':BASE+'/#person'}
    if kind=='Article':page.update(headline=title,author={'@id':BASE+'/#person'})
    graph=[{'@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':'Code With Usman','inLanguage':['en','ar']},person,page]
    if path:
        graph.append({'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'الرئيسية' if lang=='ar' else 'Home','item':BASE+path_for('',lang)},{'@type':'ListItem','position':2,'name':title,'item':url}]})
    soup.select_one('script[type="application/ld+json"]').string=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False)
    for asset in soup.select('link[href^="/style.min.css"],script[src^="/script.min.js"]'):
        key='src' if asset.name=='script' else 'href'
        name=asset[key].split('?')[0]
        digest=hashlib.sha256((ROOT/name.lstrip('/')).read_bytes()).hexdigest()[:12]
        asset[key]=name+'?v='+digest

def save(soup,path,lang):
    route=path_for(path,lang)
    output=ROOT/route.lstrip('/')/'index.html'
    output.parent.mkdir(parents=True,exist_ok=True)
    html=str(soup)
    fingerprint=hashlib.sha256(html.encode()).hexdigest()
    previous=old_manifest.get(route,{})
    modified=previous.get('modified') if previous.get('hash')==fingerprint else date.today().isoformat()
    manifest[route]={'hash':fingerprint,'modified':modified}
    output.write_text(html,encoding='utf-8')
    urls.append((path,lang,modified))

def shell(path,lang,title,description,body,kind='WebPage'):
    soup=localize(copy.deepcopy(SOURCE),lang)
    main=soup.select_one('main');main.clear();main['class']=['detail-main']
    for canvas in soup.select('canvas'):canvas.decompose()
    for preload in soup.select('link[rel="preload"][as="image"]'):preload.decompose()
    for a in soup.select('.nav-menu a[href^="#"]'):a['href']=path_for('',lang)+a['href']
    home='الرئيسية' if lang=='ar' else 'Home'
    main.append(BeautifulSoup(f'<nav class="breadcrumbs" aria-label="{"مسار التنقل" if lang=="ar" else "Breadcrumb"}"><a href="{path_for("",lang)}">{home}</a><span aria-hidden="true">/</span><span>{escape(title)}</span></nav><h1>{escape(title)}</h1><p class="lead">{escape(description)}</p>'+body,'html.parser'))
    setup_head(soup,path,lang,title+' | '+('عثمان آصف قريشي' if lang=='ar' else 'Usman Asif Qureshi'),description,kind)
    save(soup,path,lang)

def section(title,body):
    return '<section><h2>'+escape(title)+'</h2>'+body+'</section>'

def cards(pages,lang):
    return '<div class="detail-cards">'+''.join(f'<article class="detail-card"><h2><a href="{path_for(p["path"],lang)}">{escape(p["title"][lang])}</a></h2><p>{escape(p["description"][lang])}</p></article>' for p in pages)+'</div>'

def resume_data(lang):
    experiences=[]
    for card in SOURCE.select('.experience-card'):
        experiences.append({'title':text(card.select_one('.experience-title'),lang),'period':text(card.select_one('.experience-period'),lang),'company':text(card.select_one('.experience-company'),lang),'bullets':[text(x,lang) for x in card.select('li')]})
    education=[]
    for card in SOURCE.select('.education-card'):
        education.append({'title':text(card.select_one('.education-title'),lang),'detail':' | '.join(text(x,lang) for x in card.select('p, span'))})
    credentials=[]
    for card in SOURCE.select('.cert-card'):
        credentials.extend(text(x,lang) for x in card.select('li'))
    # Keep the full credential list on About; focus the CV on relevant professional certificates.
    credentials=[c for c in credentials if any(x in c for x in ['Meta','IBM','Google'])][:6]
    summary={'en':'Full-stack developer and project manager based in Al Khobar, Saudi Arabia. Experience in logistics systems, Python/Flask, PHP/Laravel, WordPress, and team delivery. Most recently worked at iLab / SpeedLogi from September 2025 to September 2026. Actively seeking new opportunities.','ar':'مطور فل ستاك ومدير مشاريع مقيم في الخبر، السعودية. لدي خبرة في الأنظمة اللوجستية وPython/Flask وPHP/Laravel وWordPress وتنسيق تسليم المشاريع. عملت مؤخراً لدى iLab / SpeedLogi من سبتمبر 2025 إلى سبتمبر 2026، وأبحث عن فرص عمل جديدة.'}[lang]
    return {'lang':lang,'name':'عثمان آصف قريشي' if lang=='ar' else 'Usman Asif Qureshi','title':text(SOURCE.select_one('.hero .title'),lang),'summary':summary,'skills':[text(x.select_one('h3'),lang)+': '+text(x.select_one('p'),lang) for x in SOURCE.select('.skill-card')],'experience':experiences,'education':education,'credentials':credentials,'projects':[{'title':p['title'][lang],'description':p['description'][lang],'url':BASE+path_for(p['path'],lang)} for p in PAGES if p['kind']=='case']}

def main():
    for lang in ['en','ar']:
        ar=lang=='ar'
        home=localize(copy.deepcopy(SOURCE),lang)
        # Add discoverable links to the new pages without duplicating the homepage narrative.
        block=BeautifulSoup('<section class="insights"><div class="container"><div class="section-header"><h2>'+('من المشاريع إلى المعرفة' if ar else 'Projects & practical notes')+'</h2></div>'+cards([PAGES[2]]+PAGES[3:],lang)+'</div></section>','html.parser')
        home.select_one('main').insert(-1,block)
        setup_head(home,'',lang,'عثمان آصف قريشي | مطور فل ستاك ومدير مشاريع في الخبر' if ar else 'Usman Asif Qureshi | Full-Stack Developer in Al Khobar','مطور فل ستاك ومدير مشاريع في الخبر، السعودية. خبرة في Laravel وPython/Flask والأنظمة اللوجستية. استعرض المشاريع وحمّل السيرة الذاتية.' if ar else 'Full-stack developer and project manager in Al Khobar, Saudi Arabia. Laravel, Python/Flask and logistics systems. Explore projects and download my CV.','ProfilePage')
        save(home,'',lang)
        for page in PAGES:
            body=''
            if page['kind']=='case' and 'business-websites' not in page['path']:
                body+='<p class="notice">'+('هذه نظرة عامة على النظام. الشاشات الأصلية والبيانات والوصول المباشر إلى النظام غير متاحة هنا.' if ar else 'This is a public overview of the system. Original screens, operational data, and live system access are not shared here.')+'</p>'
            if page['kind']=='article':body+='<p class="eyebrow">'+('بقلم عثمان آصف قريشي · ملاحظات عملية' if ar else 'By Usman Asif Qureshi · Practical notes')+'</p>'
            for item in page['sections']:
                content=''.join('<p>'+escape(t)+'</p>' for t in ([item['text'][lang]] if 'text' in item else []))
                if 'items' in item:content+='<ul class="case-list">'+''.join('<li>'+escape(t)+'</li>' for t in item['items'][lang])+'</ul>'
                body+=section(item['title'][lang],content)
            body+='<div class="hero-buttons"><a class="btn btn-primary" href="'+path_for('',lang)+'#contact">'+('ناقش فرصة عمل' if ar else 'Discuss an opportunity')+'</a><a class="btn btn-secondary" href="'+path_for('resume',lang)+'">'+('عرض السيرة الذاتية' if ar else 'View resume')+'</a></div>'
            shell(page['path'],lang,page['title'][lang],page['description'][lang],body,'Article' if page['kind']=='article' else 'WebPage')
        shell('projects',lang,'المشاريع' if ar else 'Selected Projects','دراسات حالة توضح نطاق مساهمتي وتقنيات العمل.' if ar else 'Case studies describing my contribution, technology, and delivery scope.',cards(PAGES[:3],lang))
        shell('insights',lang,'ملاحظات تقنية' if ar else 'Technical Notes','قوائم عملية لتخطيط البرمجيات وتسليم مواقع الأعمال.' if ar else 'Practical checklists for software planning and business website delivery.',cards(PAGES[3:],lang))
        about=localize(copy.deepcopy(SOURCE),lang)
        body=''.join(str(x) for x in about.select('.about-text, #experience, #education, #certifications'))
        body+='<p><a href="https://www.linkedin.com/in/usmanasif1057/">LinkedIn</a> · <a href="'+path_for('resume',lang)+'">'+('السيرة الذاتية' if ar else 'Resume')+'</a></p>'
        shell('about',lang,'نبذة عن عثمان آصف قريشي' if ar else 'About Usman Asif Qureshi','مطور فل ستاك ومدير مشاريع مقيم في الخبر، السعودية، ومتاح لفرص عمل جديدة.' if ar else 'Full-stack developer and project manager in Al Khobar, Saudi Arabia, available for new opportunities.',body,'ProfilePage')
        services=localize(copy.deepcopy(SOURCE),lang)
        body=str(services.select_one('.services-grid'))+section('طريقة العمل' if ar else 'How we work together',str(services.select_one('.process-grid')))
        body+=cards(PAGES[:3],lang)+'<a class="btn btn-primary" href="'+path_for('',lang)+'#contact">'+('تواصل لمناقشة المتطلبات' if ar else 'Discuss your requirements')+'</a>'
        shell('services',lang,'تطوير الويب وإدارة التسليم' if ar else 'Web Development & Technical Delivery','تطوير Laravel وPython/Flask وWordPress، ودعم تطبيقات Flutter وتنسيق المشاريع.' if ar else 'Laravel, Python/Flask and WordPress development, Flutter application support, and project coordination.',body)
        privacy=[('بيانات التواصل' if ar else 'Contact details','تُستخدم البيانات التي ترسلها للرد على استفسارك. تصل الرسالة إلى البريد الذي يديره صاحب الموقع. لا ترسل معلومات سرية أو كلمات مرور.' if ar else 'The details you submit are used to respond to your enquiry. Messages are delivered to the site owner’s mailbox. Do not include passwords or confidential information.'),('التخزين والخدمات الخارجية' if ar else 'Storage and external services','يتذكر المتصفح اختيار المظهر. قد تحتفظ الاستضافة بسجلات الوصول والأمان. تُحمّل خطوط الموقع من Google Fonts. الروابط الخارجية مثل WhatsApp وLinkedIn تخضع لسياسات تلك الخدمات.' if ar else 'Your browser remembers your theme preference. Hosting may retain access and security logs. Website fonts load from Google Fonts. External links such as WhatsApp and LinkedIn are governed by those services’ policies.'),('القياس والطلبات' if ar else 'Measurement and requests','لا يوجد تتبع تحليلي تابع لطرف ثالث مفعّل في هذا الإصدار. لطلب حذف رسالة أو الاستفسار عن بياناتك، راسل info@codewithusman.com.' if ar else 'No third-party analytics tracking is enabled in this release. To request deletion of a message or ask about your details, contact info@codewithusman.com.')]
        shell('privacy',lang,'الخصوصية' if ar else 'Privacy','كيف تُستخدم بيانات التواصل والتفضيلات على هذا الموقع.' if ar else 'How contact information and preferences are used on this website.',''.join(section(t,'<p>'+escape(b)+'</p>') for t,b in privacy))
        data=resume_data(lang)
        resume_html=build_cv(ROOT,data)
        shell('resume',lang,'السيرة الذاتية' if ar else 'Resume',data['summary'],resume_html)
    xml=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for path,lang,modified in urls:
        xml.append(f'<url><loc>{BASE+path_for(path,lang)}</loc><lastmod>{modified}</lastmod>')
        for locale in ['en','ar','x-default']:xml.append(f'<xhtml:link rel="alternate" hreflang="{locale}" href="{BASE+path_for(path,"en" if locale=="x-default" else locale)}"/>')
        xml.append('</url>')
    xml.append('</urlset>')
    (ROOT/'sitemap.xml').write_text('\n'.join(xml),encoding='utf-8')
    MANIFEST_PATH.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(f'Built {len(urls)} localized pages, two PDFs, two text resumes, and sitemap.')

if __name__=='__main__':main()
