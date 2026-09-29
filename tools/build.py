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
    for el in soup.select('[data-en-alt]'):
        el['alt'] = el.get('data-' + lang + '-alt', el.get('alt',''))
    for el in soup.select('a[href]'):
        href = el['href']
        if href.startswith('/') and not href.startswith(('/assets/','/ar/')) and not Path(href).suffix:
            if lang == 'ar': el['href'] = '/ar' + href
        if 'cv-download-link' in el.get('class',[]):
            # Offer both CVs: the page language first, then the other language.
            labels={'en':{'en':'English CV','ar':'Arabic CV'},'ar':{'ar':'السيرة بالعربية','en':'السيرة بالإنجليزية'}}[lang]
            for cv_lang,link in [(lang,el),('en' if lang=='ar' else 'ar',copy.copy(el))]:
                link['href'] = '/Usman_Asif_Qureshi_CV' + ('_AR' if cv_lang == 'ar' else '') + '.pdf'
                link['download'] = 'Usman_Asif_Qureshi_CV_' + cv_lang.upper() + '.pdf'
                link['hreflang'] = cv_lang
                link.attrs.pop('target',None);link.attrs.pop('rel',None)
                span=link.find('span')
                if span:span.string=labels[cv_lang]
                if link is not el:
                    link.attrs.pop('id',None)
                    el.insert_after(link)
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

def meta(soup, attr, key, value):
    tag = soup.select_one(f'meta[{attr}="{key}"]')
    if not tag:
        tag = soup.new_tag('meta', attrs={attr: key})
        soup.head.append(tag)
    tag['content'] = value

def setup_head(soup, path, lang, title, description, kind='WebPage', crumbs=None, about=None, published=None):
    ar = lang == 'ar'
    soup.title.string = title
    soup.select_one('meta[name="description"]')['content'] = description
    url = BASE + path_for(path, lang)
    soup.select_one('link[rel="canonical"]')['href'] = url
    for tag in soup.select('link[hreflang]'):tag.decompose()
    for locale in ['en','ar','x-default']:
        soup.head.append(soup.new_tag('link', rel='alternate', hreflang=locale, href=BASE + path_for(path, 'en' if locale=='x-default' else locale)))
    image = BASE + '/assets/images/social-card.png'
    image_alt = 'Code With Usman: عثمان آصف قريشي، مطور فل ستاك ومدير مشاريع' if ar else 'Code With Usman: Usman Asif Qureshi, full-stack developer and project manager'
    og_type = {'Article': 'article', 'ProfilePage': 'profile'}.get(kind, 'website')
    for prop,value in [('og:title',title),('og:description',description),('og:url',url),('og:site_name','Code With Usman'),('og:locale','ar_SA' if ar else 'en_US'),('og:locale:alternate','en_US' if ar else 'ar_SA'),('og:type',og_type),('og:image',image),('og:image:type','image/png'),('og:image:width','1200'),('og:image:height','630'),('og:image:alt',image_alt)]:
        meta(soup, 'property', prop, value)
    if kind == 'Article' and published:
        meta(soup, 'property', 'article:published_time', published)
        meta(soup, 'property', 'article:author', BASE + '/about/')
    for name,value in [('twitter:title',title),('twitter:description',description),('twitter:card','summary_large_image'),('twitter:image',image),('twitter:image:alt',image_alt)]:
        meta(soup, 'name', name, value)
    for tag in soup.select('link[rel="apple-touch-icon"], link[rel="manifest"]'):tag.decompose()
    soup.head.append(soup.new_tag('link', rel='apple-touch-icon', sizes='180x180', href='/assets/images/icon-180.png'))
    soup.head.append(soup.new_tag('link', rel='manifest', href='/site.webmanifest'))
    toggle=soup.select_one('#langToggle');other='en' if lang=='ar' else 'ar'
    toggle['href']=path_for(path,other);toggle['hreflang']=other;toggle['lang']=other
    toggle['aria-label']='Switch to English' if lang=='ar' else 'التبديل إلى العربية'
    toggle.string='English' if lang=='ar' else 'العربية'
    person={'@type':'Person','@id':BASE+'/#person','name':'Usman Asif Qureshi','alternateName':'عثمان آصف قريشي','url':BASE+'/','email':'mailto:info@codewithusman.com',
            'jobTitle':'Full-Stack Developer & Project Manager','description':'Full-stack developer and project manager in Al Khobar, Saudi Arabia, building logistics platforms and web/mobile applications.',
            'knowsAbout':['Laravel','PHP','Livewire','Python','Flask','Flutter','Android','MySQL','WordPress','REST APIs','Project management','Logistics software'],
            'sameAs':['https://www.linkedin.com/in/usmanasif1057/'],
            'image':{'@type':'ImageObject','url':BASE+'/assets/images/profile-hero.webp','width':520,'height':520},
            'address':{'@type':'PostalAddress','addressLocality':'Al Khobar','addressRegion':'Eastern Province','addressCountry':'SA'}}
    page={'@type':kind,'@id':url+'#page','url':url,'name':title,'description':description,'inLanguage':lang,'isPartOf':{'@id':BASE+'/#website'},
          'primaryImageOfPage':{'@type':'ImageObject','url':image,'width':1200,'height':630},'author':{'@id':BASE+'/#person'}}
    if kind=='ProfilePage':page['mainEntity']={'@id':BASE+'/#person'}
    if kind=='Article':page.update(headline=title.split(' | ')[0],image=image,publisher={'@id':BASE+'/#person'},mainEntityOfPage=url,**({'datePublished':published,'dateModified':published} if published else {}))
    if about:page['about']=about
    graph=[{'@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':'Code With Usman','alternateName':'Usman Asif Qureshi',
            'description':'Portfolio of Usman Asif Qureshi, full-stack developer and project manager in Al Khobar, Saudi Arabia.','inLanguage':['en','ar'],'publisher':{'@id':BASE+'/#person'}},person,page]
    if path:
        trail=[('الرئيسية' if ar else 'Home',BASE+path_for('',lang))]+(crumbs or [])+[(title.split(' | ')[0],url)]
        graph.append({'@type':'BreadcrumbList','@id':url+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':i+1,'name':n,'item':u} for i,(n,u) in enumerate(trail)]})
        page['breadcrumb']={'@id':url+'#breadcrumb'}
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

SECTIONS={'projects':('المشاريع','Projects'),'insights':('ملاحظات تقنية','Technical Notes')}

def shell(path,lang,title,description,body,kind='WebPage',seo_title=None,seo_description=None,about=None,published=None,output=None):
    ar=lang=='ar'
    soup=localize(copy.deepcopy(SOURCE),lang)
    main=soup.select_one('main');main.clear();main['class']=['detail-main']
    for canvas in soup.select('canvas'):canvas.decompose()
    for preload in soup.select('link[rel="preload"][as="image"]'):preload.decompose()
    for a in soup.select('.nav-menu a[href^="#"]'):a['href']=path_for('',lang)+a['href']
    # Nested pages get a middle crumb (Home / Projects / DMS) in the page and in JSON-LD.
    parent=path.split('/')[0] if '/' in path else None
    crumbs=[(SECTIONS[parent][0 if ar else 1],BASE+path_for(parent,lang))] if parent in SECTIONS else []
    sep='<span aria-hidden="true">/</span>'
    trail=f'<a href="{path_for("",lang)}">{"الرئيسية" if ar else "Home"}</a>'+''.join(f'{sep}<a href="{u.replace(BASE,"")}">{escape(n)}</a>' for n,u in crumbs)
    main.append(BeautifulSoup(f'<nav class="breadcrumbs" aria-label="{"مسار التنقل" if ar else "Breadcrumb"}">{trail}{sep}<span aria-current="page">{escape(title)}</span></nav><h1>{escape(title)}</h1><p class="lead">{escape(description)}</p>'+body,'html.parser'))
    head_title=seo_title or title+' | '+('عثمان آصف قريشي' if ar else 'Usman Asif Qureshi')
    setup_head(soup,path,lang,head_title,seo_description or description,kind,crumbs,about,published)
    if output:
        # Error pages: not indexable, no canonical/hreflang, not in the sitemap.
        soup.select_one('meta[name="robots"]')['content']='noindex, follow'
        for tag in soup.select('link[rel="canonical"], link[hreflang]'):tag.decompose()
        (ROOT/output).write_text(str(soup),encoding='utf-8')
        return
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
    # Certifications grouped by issuer, and internships/volunteering, as on the homepage.
    credentials=[(text(card.select_one('.cert-title'),lang),[text(x,lang) for x in card.select('li')]) for card in SOURCE.select('.cert-card')]
    extra=[(text(card.select_one('.experience-subtitle'),lang),[text(x,lang) for x in card.select('li')]) for card in SOURCE.select('.experience-subcard')]
    summary={'en':'Full-stack developer and project manager based in Al Khobar, Saudi Arabia. Experience in logistics systems, Python/Flask, PHP/Laravel, WordPress, and team delivery. Most recently worked at iLab / SpeedLogi from September 2025 to September 2026. Actively seeking new opportunities.','ar':'مطور فل ستاك ومدير مشاريع مقيم في الخبر، السعودية. لدي خبرة في الأنظمة اللوجستية و Python/Flask و PHP/Laravel و WordPress وتنسيق تسليم المشاريع. عملت مؤخراً لدى iLab / SpeedLogi من سبتمبر 2025 إلى سبتمبر 2026، وأبحث عن فرص عمل جديدة.'}[lang]
    return {'lang':lang,'name':'عثمان آصف قريشي' if lang=='ar' else 'Usman Asif Qureshi','title':text(SOURCE.select_one('.hero .title'),lang),'summary':summary,'skills':[text(x.select_one('h3'),lang)+': '+text(x.select_one('p'),lang) for x in SOURCE.select('.skill-card')],'experience':experiences,'education':education,'credentials':credentials,'extra':extra,'projects':[{'title':p['title'][lang],'description':p['description'][lang],'url':BASE+path_for(p['path'],lang)} for p in PAGES if p['kind']=='case']}

# Search titles/descriptions for fixed pages (visible H1/lead stay shorter).
META={
 'projects':{'en':dict(seo_title='Projects: Logistics Systems & Websites | Usman Asif Qureshi',seo_description='Case studies of software I designed and built: DOBS driver onboarding, the DMS platform with its Android driver app, and business websites.'),
             'ar':dict(seo_title='المشاريع: أنظمة لوجستية ومواقع أعمال | عثمان آصف قريشي',seo_description='دراسات حالة لأنظمة صممتها وطورتها: نظام DOBS لتسجيل السائقين، ومنصة DMS مع تطبيق السائق على أندرويد، ومواقع الأعمال.')},
 'insights':{'en':dict(seo_title='Technical Notes on Software & Websites | Usman Asif Qureshi',seo_description='Practical notes on planning logistics software and handing over business websites, written by a full-stack developer and project manager in Al Khobar.'),
             'ar':dict(seo_title='ملاحظات تقنية عن البرمجيات والمواقع | عثمان آصف قريشي',seo_description='ملاحظات عملية عن تخطيط البرمجيات اللوجستية وتسليم مواقع الأعمال، بقلم مطور فل ستاك ومدير مشاريع في الخبر بالسعودية.')},
 'about':{'en':dict(seo_description='About Usman Asif Qureshi, a full-stack developer and project manager in Al Khobar, Saudi Arabia: experience, education, certifications and skills.'),
          'ar':dict(seo_description='نبذة عن عثمان آصف قريشي، مطور فل ستاك ومدير مشاريع في الخبر بالسعودية: الخبرات العملية والتعليم والشهادات والمهارات التقنية.')},
 'services':{'en':dict(seo_title='Web & Mobile Development Services | Usman Asif Qureshi',seo_description='Laravel, Python/Flask and WordPress development, Flutter mobile apps, and technical project delivery for businesses in Saudi Arabia and remote clients.'),
             'ar':dict(seo_title='خدمات تطوير الويب والموبايل | عثمان آصف قريشي',seo_description='تطوير Laravel و Python/Flask و WordPress، وتطبيقات موبايل بتقنية Flutter، وإدارة التسليم التقني للشركات في السعودية والعملاء عن بُعد.')},
 'privacy':{'en':dict(seo_title='Privacy Policy | Usman Asif Qureshi',seo_description='How Code With Usman handles contact form messages, theme preferences, Google Analytics measurement, hosting logs and links to external services.'),
            'ar':dict(seo_title='سياسة الخصوصية | عثمان آصف قريشي',seo_description='كيف يتعامل موقع Code With Usman مع رسائل نموذج التواصل وتفضيلات المظهر وقياس Google Analytics وسجلات الاستضافة والخدمات الخارجية.')},
 'resume':{'en':dict(seo_title='Resume: Full-Stack Developer & PM | Usman Asif Qureshi',seo_description='Resume of Usman Asif Qureshi, full-stack developer and project manager in Al Khobar: Laravel, Python/Flask, Flutter and WordPress. Download the PDF.'),
           'ar':dict(seo_title='السيرة الذاتية: مطور فل ستاك ومدير مشاريع | عثمان آصف قريشي',seo_description='السيرة الذاتية لعثمان آصف قريشي، مطور فل ستاك ومدير مشاريع في الخبر: Laravel و Python/Flask و Flutter و WordPress. حمّل ملف PDF.')},
}

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
            software=page.get('software')
            about_node={'@type':'SoftwareApplication','name':software['name'],'applicationCategory':'BusinessApplication','operatingSystem':software['os'],'creator':{'@id':BASE+'/#person'},'author':{'@id':BASE+'/#person'}} if software else None
            shell(page['path'],lang,page['title'][lang],page['description'][lang],body,'Article' if page['kind']=='article' else 'WebPage',
                  page.get('seo_title',{}).get(lang),page.get('seo_description',{}).get(lang),about_node,page.get('published'))
        shell('projects',lang,'المشاريع' if ar else 'Selected Projects','دراسات حالة توضح نطاق مساهمتي وتقنيات العمل.' if ar else 'Case studies describing my contribution, technology, and delivery scope.',cards(PAGES[:3],lang),**META['projects'][lang])
        shell('insights',lang,'ملاحظات تقنية' if ar else 'Technical Notes','قوائم عملية لتخطيط البرمجيات وتسليم مواقع الأعمال.' if ar else 'Practical checklists for software planning and business website delivery.',cards(PAGES[3:],lang),**META['insights'][lang])
        about=localize(copy.deepcopy(SOURCE),lang)
        body=''.join(str(x) for x in about.select('.about-text, #experience, #education, #certifications'))
        body+='<p><a href="https://www.linkedin.com/in/usmanasif1057/">LinkedIn</a> · <a href="'+path_for('resume',lang)+'">'+('السيرة الذاتية' if ar else 'Resume')+'</a></p>'
        shell('about',lang,'نبذة عن عثمان آصف قريشي' if ar else 'About Usman Asif Qureshi','مطور فل ستاك ومدير مشاريع مقيم في الخبر، السعودية، ومتاح لفرص عمل جديدة.' if ar else 'Full-stack developer and project manager in Al Khobar, Saudi Arabia, available for new opportunities.',body,'ProfilePage',**META['about'][lang])
        services=localize(copy.deepcopy(SOURCE),lang)
        body=section('الخدمات' if ar else 'What I offer',str(services.select_one('.services-grid')))+section('طريقة العمل' if ar else 'How we work together',str(services.select_one('.process-grid')))
        body+=cards(PAGES[:3],lang)+'<a class="btn btn-primary" href="'+path_for('',lang)+'#contact">'+('تواصل لمناقشة المتطلبات' if ar else 'Discuss your requirements')+'</a>'
        shell('services',lang,'تطوير الويب وإدارة التسليم' if ar else 'Web Development & Technical Delivery','تطوير Laravel وPython/Flask وWordPress، ودعم تطبيقات Flutter وتنسيق المشاريع.' if ar else 'Laravel, Python/Flask and WordPress development, Flutter application support, and project coordination.',body,**META['services'][lang])
        privacy=[('بيانات التواصل' if ar else 'Contact details','تُستخدم البيانات التي ترسلها للرد على استفسارك. تصل الرسالة إلى البريد الذي يديره صاحب الموقع. لا ترسل معلومات سرية أو كلمات مرور.' if ar else 'The details you submit are used to respond to your enquiry. Messages are delivered to the site owner’s mailbox. Do not include passwords or confidential information.'),('التخزين والخدمات الخارجية' if ar else 'Storage and external services','يتذكر المتصفح اختيار المظهر. قد تحتفظ الاستضافة بسجلات الوصول والأمان. تُحمّل خطوط الموقع من Google Fonts. الروابط الخارجية مثل WhatsApp وLinkedIn تخضع لسياسات تلك الخدمات.' if ar else 'Your browser remembers your theme preference. Hosting may retain access and security logs. Website fonts load from Google Fonts. External links such as WhatsApp and LinkedIn are governed by those services’ policies.'),('القياس والطلبات' if ar else 'Measurement and requests','يستخدم الموقع Google Analytics لقياس الزيارات بشكل إجمالي، مثل الصفحات التي تُزار وتنزيلات السيرة الذاتية ونقرات واتساب. قد يضع Google Analytics ملفات تعريف ارتباط ويعالج بيانات تقنية مثل نوع الجهاز والموقع التقريبي. لا تُرسل محتويات نموذج التواصل أو بيانات الاتصال إلى أدوات القياس. يمكنك إيقاف ذلك عبر إعدادات ملفات تعريف الارتباط في متصفحك أو إضافة إلغاء الاشتراك من Google. لطلب حذف رسالة أو الاستفسار عن بياناتك، راسل info@codewithusman.com.' if ar else 'This site uses Google Analytics to measure visits in aggregate, such as pages viewed, CV downloads and WhatsApp clicks. Google Analytics may set cookies and processes technical data such as device type and approximate location. Contact form contents and contact details are never sent to analytics. You can opt out with your browser cookie settings or the Google Analytics opt-out add-on. To request deletion of a message or ask about your details, contact info@codewithusman.com.')]
        shell('privacy',lang,'الخصوصية' if ar else 'Privacy','كيف تُستخدم بيانات التواصل والتفضيلات على هذا الموقع.' if ar else 'How contact information and preferences are used on this website.',''.join(section(t,'<p>'+escape(b)+'</p>') for t,b in privacy),**META['privacy'][lang])
        data=resume_data(lang)
        resume_html=build_cv(ROOT,data)
        shell('resume',lang,'السيرة الذاتية' if ar else 'Resume',data['summary'],resume_html,**META['resume'][lang])
    links=''.join(f'<li><a href="{h}">{t}</a></li>' for h,t in [('/','Home'),('/projects/','Projects'),('/resume/','Resume'),('/#contact','Contact')])
    shell('','en','Page not found','The page you are looking for does not exist or has moved. Try one of these instead.',f'<ul>{links}</ul><p lang="ar" dir="rtl"><a href="/ar/">الصفحة الرئيسية بالعربية</a></p>',output='404.html')
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
