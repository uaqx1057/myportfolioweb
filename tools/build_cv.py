"""Designed, searchable CVs (English and Arabic) with HarfBuzz shaping and live links.

Layout follows the original CV design: photo header with a contact block, full-width
experience, then two-column sections. Arabic mirrors the layout right-to-left.
Every line is real text with /ActualText, so PDF readers and ATS can extract it.
"""
from fpdf import FPDF
from html import escape
from PIL import Image, ImageDraw
import json

LABELS={
 'en':{'summary':'Professional Summary','experience':'Professional Experience','skills':'Skills','education':'Education','credentials':'Certifications',
       'extra':'Additional Experience','projects':'Selected Projects','download':'Download PDF (English)','other':'Download PDF (Arabic)',
       'text':'Download text resume','location':'Al Khobar, Saudi Arabia','iqama':'Transferable Iqama'},
 'ar':{'summary':'الملخص المهني','experience':'الخبرات العملية','skills':'المهارات','education':'التعليم','credentials':'الشهادات',
       'extra':'خبرات إضافية','projects':'مشاريع مختارة','download':'تحميل PDF (عربي)','other':'تحميل PDF (إنجليزي)',
       'text':'تحميل السيرة النصية','location':'الخبر، السعودية','iqama':'إقامة قابلة للتحويل'},
}
CONTACTS=[('www.codewithusman.com','https://www.codewithusman.com/'),('usmanasif26261@gmail.com','mailto:usmanasif26261@gmail.com'),
          ('+966 56 846 5058','tel:+966568465058'),('+92 340 501 1130','tel:+923405011130'),('linkedin.com/in/usmanasif1057','https://www.linkedin.com/in/usmanasif1057/')]
PAGE_W, M, TOP, BOTTOM = 210, 14, 14, 283
DARK, TEAL, MUTED = (20,35,50), (24,104,120), (80,92,108)

class ResumePDF(FPDF):
    def footer(self):
        self.set_y(-10)
        self.set_font('Body',size=7.5)
        self.set_text_color(*MUTED)
        self.set_text_shaping(True,direction='ltr')
        self.cell(0,5,f'{self.page_no()} / {{nb}}',align='C')

def circle_photo(root):
    """Circular crop of the portrait, generated into build/ (never published)."""
    out=root/'build'/'cv-photo.png'
    out.parent.mkdir(exist_ok=True)
    im=Image.open(root/'assets/images/profile-hero.png').convert('RGB')
    side=min(im.size);im=im.crop(((im.width-side)//2,0,(im.width+side)//2,side)).resize((420,420),Image.LANCZOS)
    mask=Image.new('L',(420,420),0);ImageDraw.Draw(mask).ellipse((0,0,419,419),fill=255)
    im.putalpha(mask);im.save(out)
    return out

def build_cv(root,data):
    lang=data['lang'];ar=lang=='ar';labels=LABELS[lang]
    name='Usman_Asif_Qureshi_CV'+('_AR' if ar else '')
    pdf=ResumePDF();pdf.set_margins(M,TOP,M);pdf.set_auto_page_break(False)
    fonts={'Body':'NotoSansArabic','Head':'NotoSansArabic' if ar else 'Amiri'}
    for family,file in fonts.items():
        pdf.add_font(family,'',str(root/'assets/fonts'/(file+'-Regular.ttf')))
        pdf.add_font(family,'B',str(root/'assets/fonts'/(file+'-Bold.ttf')))
    pdf.alias_nb_pages();pdf.set_title(data['name']+' | CV');pdf.set_author('Usman Asif Qureshi')
    pdf.set_subject('Full-stack development and technical project management')
    pdf.set_lang(lang);pdf.add_page()
    lines=[]

    def X(x,w):
        # Mirror horizontal positions for Arabic.
        return PAGE_W-x-w if ar else x

    def write(value,x=M,w=PAGE_W-2*M,size=9,bold=False,gap=.6,link='',ltr=False,head=False,color=DARK,align=None):
        rtl=ar and not ltr
        pdf.set_text_shaping(True,direction='rtl' if rtl else 'ltr')
        pdf.set_font('Head' if head else 'Body','B' if bold else '',size)
        pdf.set_text_color(*color)
        opts=dict(w=w,h=size*.47,text=value,align=align or ('R' if ar else 'L'),new_x='LEFT',new_y='NEXT',link=link)
        pdf.set_x(X(x,w))
        height=pdf.multi_cell(**opts,dry_run=True,output='HEIGHT')
        if pdf.get_y()+height>BOTTOM:
            pdf.add_page();pdf.set_y(TOP)
        pdf.set_x(X(x,w))
        # Preserve the original logical text for readers that support ActualText,
        # independently of Arabic glyph positioning and mixed-direction runs.
        semantic=('﻿'+value).encode('utf-16-be').hex().upper()
        pdf._out('/Span << /ActualText <'+semantic+'> >> BDC')
        pdf.multi_cell(**opts)
        pdf._out('EMC')
        if gap:pdf.set_y(pdf.get_y()+gap)
        lines.append(value)

    def heading(label,x=M,w=PAGE_W-2*M):
        if pdf.get_y()>BOTTOM-22:pdf.add_page();pdf.set_y(TOP)
        pdf.set_y(pdf.get_y()+2.5)
        write(label,x,w,13 if not ar else 11.5,True,1,head=True)
        pdf.set_draw_color(*DARK);pdf.set_line_width(.35)
        pdf.line(X(x,w),pdf.get_y(),X(x,w)+w,pdf.get_y());pdf.set_y(pdf.get_y()+2.2)

    def columns(left,right,gutter=10):
        """Run two flows side by side from the same top; continue below the taller one."""
        page,y=pdf.page,pdf.get_y();w=(PAGE_W-2*M-gutter)/2
        left(M,w);end=(pdf.page,pdf.get_y())
        pdf.page=page;pdf.set_y(y)
        right(M+w+gutter,w);end=max(end,(pdf.page,pdf.get_y()))
        pdf.page=end[0];pdf.set_y(end[1])

    # Header: photo, name/title, contact block.
    pdf.image(str(circle_photo(root)),x=X(M,30),y=11,w=30,h=30)
    pdf.set_y(12)
    write(data['name'],M+35,100,27 if not ar else 21,bold=ar,gap=0,head=True)
    write(data['title'],M+35,100,12.5 if not ar else 11,True,1,head=True,color=TEAL if ar else DARK)
    write('linkedin.com/in/usmanasif1057',M+35,100,8,gap=0,link='https://www.linkedin.com/in/usmanasif1057/',ltr=True,color=MUTED)
    name_end=pdf.get_y()
    pdf.set_y(11)
    for value,url in CONTACTS[:4]:write(value,PAGE_W-M-48,48,8.2,gap=.2,link=url,ltr=True)
    write(labels['location'],PAGE_W-M-48,48,8.2,gap=.2)
    write(labels['iqama'],PAGE_W-M-48,48,8.2,True,0)
    pdf.set_y(max(name_end,pdf.get_y(),43)+4)

    write(data['summary'],size=9.8,bold=True,gap=1)
    heading(labels['experience'])
    for job in data['experience']:
        write(job['title'],size=11 if not ar else 10,bold=True,gap=.3,head=True)
        write(job['company']+'  |  '+job['period'],size=8.9,bold=True,gap=1,color=TEAL)
        for bullet in job['bullets']:write('• '+bullet,M+2,PAGE_W-2*M-2,9.2,gap=.4)
        pdf.set_y(pdf.get_y()+1.6)

    if pdf.get_y()>BOTTOM-55:pdf.add_page();pdf.set_y(TOP)
    def skills(x,w):
        heading(labels['skills'],x,w)
        for item in data['skills']:write('• '+item,x,w,8.8,gap=.4)
    def education(x,w):
        heading(labels['education'],x,w)
        for edu in data['education']:
            write(edu['title'],x,w,9.6 if not ar else 9,True,.2,head=True)
            write(edu['detail'],x,w,8.8,gap=1.5,color=MUTED)
    columns(skills,education)

    # Page 2: certifications and additional experience | selected projects.
    if pdf.page_no()==1:pdf.add_page();pdf.set_y(TOP)
    def certifications(x,w):
        heading(labels['credentials'],x,w)
        for issuer,items in data['credentials']:
            write(issuer,x,w,10 if not ar else 9.2,True,.4,head=True)
            for item in items:write('• '+item,x,w,8.9,gap=.35)
            pdf.set_y(pdf.get_y()+1.2)
        heading(labels['extra'],x,w)
        for title,items in data['extra']:
            write(title,x,w,10 if not ar else 9.2,True,.4,head=True)
            for item in items:write('• '+item,x,w,8.9,gap=.35)
            pdf.set_y(pdf.get_y()+1.2)
    def projects(x,w):
        heading(labels['projects'],x,w)
        for project in data['projects']:
            write(project['title'],x,w,10 if not ar else 9.2,True,.4,head=True)
            write(project['description'],x,w,8.9,gap=.4)
            write(project['url'].replace('https://',''),x,w,7.4,gap=2.2,link=project['url'],ltr=True,color=TEAL)
    columns(certifications,projects)

    # Shapers can emit decorative glyphs without a Unicode character (for example
    # joining extenders). Without a mapping, PDF extractors interpret their CIDs
    # as control characters and can discard the rest of a line. Preserve joining
    # semantics with a zero-width joiner; the visible font glyph is unchanged.
    for font in pdf.fonts.values():
        if hasattr(font,'subset'):
            for glyph,_ in font.subset.items():
                if glyph is not None and glyph.unicode == ():
                    object.__setattr__(glyph,'unicode',(0x200D,))
    pdf.output(str(root/(name+'.pdf')))
    (root/(name+'.txt')).write_text('\n\n'.join(lines)+'\n',encoding='utf-8')
    (root/'content'/('resume-'+lang+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

    other='Usman_Asif_Qureshi_CV'+('' if ar else '_AR')
    html=(f'<div class="hero-buttons"><a class="btn btn-primary" href="/{name}.pdf" download>{labels["download"]}</a>'
          f'<a class="btn btn-secondary" href="/{other}.pdf" download>{labels["other"]}</a>'
          f'<a class="btn btn-secondary" href="/{name}.txt" download>{labels["text"]}</a></div>')
    html+='<div class="resume-content"><p>'+escape(labels['location']+' | '+labels['iqama'])+'</p><p dir="ltr">'+' · '.join(f'<a href="{u}">{escape(v)}</a>' for v,u in CONTACTS)+'</p>'
    html+='<section><h2>'+labels['experience']+'</h2>'
    for job in data['experience']:
        html+='<article class="cv-entry"><h3>'+escape(job['title'])+'</h3><p class="cv-meta">'+escape(job['company'])+'<br>'+escape(job['period'])+'</p><ul>'+''.join('<li>'+escape(b)+'</li>' for b in job['bullets'])+'</ul></article>'
    html+='</section><section><h2>'+labels['skills']+'</h2><ul>'+''.join('<li>'+escape(x)+'</li>' for x in data['skills'])+'</ul></section>'
    html+='<section><h2>'+labels['projects']+'</h2>'+''.join('<article><h3><a href="'+p['url'].replace('https://www.codewithusman.com','')+'">'+escape(p['title'])+'</a></h3><p>'+escape(p['description'])+'</p></article>' for p in data['projects'])+'</section>'
    html+='<section><h2>'+labels['education']+'</h2>'+''.join('<p>'+escape(e['title']+' | '+e['detail'])+'</p>' for e in data['education'])+'</section>'
    html+='<section><h2>'+labels['credentials']+'</h2>'+''.join('<h3>'+escape(i)+'</h3><ul>'+''.join('<li>'+escape(c)+'</li>' for c in items)+'</ul>' for i,items in data['credentials'])+'</section>'
    html+='<section><h2>'+labels['extra']+'</h2>'+''.join('<h3>'+escape(t)+'</h3><ul>'+''.join('<li>'+escape(c)+'</li>' for c in items)+'</ul>' for t,items in data['extra'])+'</section></div>'
    return html
