"""Single-column, Unicode CVs with HarfBuzz shaping and live links."""
from fpdf import FPDF
from html import escape
import json

LABELS={
 'en':{'summary':'Professional summary','experience':'Professional experience','skills':'Skills','education':'Education','credentials':'Selected certifications','projects':'Selected projects','download':'Download PDF','text':'Download text resume','location':'Al Khobar, Saudi Arabia | Transferable Iqama'},
 'ar':{'summary':'الملخص المهني','experience':'الخبرات العملية','skills':'المهارات','education':'التعليم','credentials':'شهادات مختارة','projects':'مشاريع مختارة','download':'تحميل PDF','text':'تحميل السيرة النصية','location':'الخبر، السعودية | إقامة قابلة للتحويل'}
}

class ResumePDF(FPDF):
    def footer(self):
        self.set_y(-11)
        self.set_font('Resume',size=8)
        self.set_text_color(90,100,115)
        self.set_text_shaping(True,direction='ltr')
        self.cell(0,5,f'{self.page_no()} / {{nb}}',align='C')

def build_cv(root,data):
    lang=data['lang'];ar=lang=='ar';labels=LABELS[lang]
    name='Usman_Asif_Qureshi_CV'+('_AR' if ar else '')
    pdf=ResumePDF();pdf.set_margins(16,15,16);pdf.set_auto_page_break(True,17)
    family='Amiri' if ar else 'NotoSansArabic'
    for style,file in [('', family+'-Regular.ttf'),('B',family+'-Bold.ttf')]:
        pdf.add_font('Resume',style,str(root/'assets/fonts'/file))
    pdf.alias_nb_pages();pdf.set_title(data['name']+' | CV');pdf.set_author('Usman Asif Qureshi')
    pdf.set_subject('Full-stack development and technical project management')
    pdf.set_lang(lang);pdf.add_page()
    lines=[]
    def write(value,size=10.2,bold=False,gap=1,link='',ltr=False):
        pdf.set_text_shaping(True,direction='ltr' if ltr or not ar else 'rtl')
        pdf.set_font('Resume','B' if bold else '',size)
        pdf.set_text_color(20,35,50)
        options=dict(w=0,h=size*.49,text=value,align='L' if ltr or not ar else 'R',new_x='LMARGIN',new_y='NEXT',link=link)
        height=pdf.multi_cell(**options,dry_run=True,output='HEIGHT')
        if pdf.will_page_break(height):pdf.add_page()
        # Preserve the original logical text for readers that support ActualText,
        # independently of Arabic glyph positioning and mixed-direction runs.
        semantic=('\ufeff'+value).encode('utf-16-be').hex().upper()
        pdf._out('/Span << /ActualText <'+semantic+'> >> BDC')
        pdf.multi_cell(**options)
        pdf._out('EMC')
        if gap:pdf.ln(gap)
        lines.append(value)
    def heading(label):
        if pdf.get_y()>260:pdf.add_page()
        pdf.ln(3);write(label,12,True,2)
        pdf.set_draw_color(30,115,130);pdf.line(16,pdf.get_y(),194,pdf.get_y());pdf.ln(3)
    write(data['name'],23,True,2)
    write(data['title'],12,True,2)
    write(labels['location'],9.5,gap=1)
    for value,url in [('usmanasif26261@gmail.com','mailto:usmanasif26261@gmail.com'),('+966 56 846 5058','tel:+966568465058'),('www.codewithusman.com','https://www.codewithusman.com/'),('linkedin.com/in/usmanasif1057','https://www.linkedin.com/in/usmanasif1057/')]:
        write(value,9.3,gap=.4,link=url,ltr=True)
    heading(labels['summary']);write(data['summary'])
    heading(labels['experience'])
    for job in data['experience']:
        with pdf.unbreakable():
            write(job['title'],11,True)
            write(job['company'],9.4)
            write(job['period'],9.4,True,2)
            for bullet in job['bullets']:write('• '+bullet,9.8,gap=.8)
            pdf.ln(2)
    # Keep the second page useful and uncluttered; no multi-column reading order.
    if pdf.page_no()==1:pdf.add_page()
    heading(labels['skills'])
    for item in data['skills']:write(item,9.6,gap=.5)
    heading(labels['projects'])
    for project in data['projects']:
        with pdf.unbreakable():
            write(project['title'],10.5,True)
            write(project['description'],9.6)
            write(project['url'].replace('https://',''),8.5,link=project['url'],ltr=True,gap=2)
    heading(labels['education'])
    for edu in data['education']:write(edu['title']+' | '+edu['detail'],9.6,gap=1)
    heading(labels['credentials'])
    for credential in data['credentials']:write('• '+credential,9.3,gap=.3)
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
    html=f'<div class="hero-buttons"><a class="btn btn-primary" href="/{name}.pdf" download>{labels["download"]}</a><a class="btn btn-secondary" href="/{name}.txt" download>{labels["text"]}</a></div>'
    html+='<div class="resume-content"><p>'+escape(labels['location'])+'</p><p dir="ltr"><a href="mailto:usmanasif26261@gmail.com">usmanasif26261@gmail.com</a> · <a href="tel:+966568465058">+966 56 846 5058</a> · <a href="https://www.linkedin.com/in/usmanasif1057/">LinkedIn</a></p>'
    html+='<section><h2>'+labels['experience']+'</h2>'
    for job in data['experience']:
        html+='<article class="cv-entry"><h3>'+escape(job['title'])+'</h3><p class="cv-meta">'+escape(job['company'])+'<br>'+escape(job['period'])+'</p><ul>'+''.join('<li>'+escape(b)+'</li>' for b in job['bullets'])+'</ul></article>'
    html+='</section><section><h2>'+labels['skills']+'</h2><ul>'+''.join('<li>'+escape(x)+'</li>' for x in data['skills'])+'</ul></section>'
    html+='<section><h2>'+labels['projects']+'</h2>'+''.join('<article><h3><a href="'+p['url'].replace('https://www.codewithusman.com','')+'">'+escape(p['title'])+'</a></h3><p>'+escape(p['description'])+'</p></article>' for p in data['projects'])+'</section>'
    html+='<section><h2>'+labels['education']+'</h2>'+''.join('<p>'+escape(e['title']+' | '+e['detail'])+'</p>' for e in data['education'])+'</section>'
    html+='<section><h2>'+labels['credentials']+'</h2><ul>'+''.join('<li>'+escape(c)+'</li>' for c in data['credentials'])+'</ul></section></div>'
    return html
