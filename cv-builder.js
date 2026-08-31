const cvPage = document.getElementById('cvPage');
const downloadButton = document.getElementById('downloadCv');
const downloadTextButton = document.getElementById('downloadTextCv');
const languageToggle = document.getElementById('languageToggle');
const downloadStatus = document.getElementById('cvDownloadStatus');

let sourceDocument = null;
let hasAutoPrinted = false;
let hasAutoDownloadedPdf = false;
const normalizeLanguage = (lang) => (lang || '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
const pageParams = new URLSearchParams(window.location.search);
const shouldAutoPrint = pageParams.get('print') === '1';
const shouldAutoDownloadPdf = pageParams.get('download') === 'pdf';
let currentLanguage = normalizeLanguage(pageParams.get('lang') || localStorage.getItem('cv-lang') || 'en');

const labels = {
    en: {
        back: 'Back to Website',
        toggle: 'AR',
        toggleLabel: 'Switch CV to Arabic',
        download: 'Download PDF',
        downloadText: 'ATS Text',
        preparingPdf: 'Preparing PDF...',
        pdfReadyFallback: 'If the PDF did not download, click Download PDF.',
        pdfFontError: 'Unable to prepare the Arabic PDF. Please refresh and try again.',
        contact: 'Contact',
        summary: 'Professional Summary',
        skills: 'Skills',
        experience: 'Work Experience',
        education: 'Education',
        certifications: 'Certifications',
        projects: 'Selected Projects',
        extras: 'Additional Experience',
        error: 'Unable to load the portfolio content. Please open this page from your website server.'
    },
    ar: {
        back: 'العودة للموقع',
        toggle: 'EN',
        toggleLabel: 'تبديل السيرة الذاتية إلى الإنجليزية',
        download: 'تحميل PDF',
        downloadText: 'نص ATS',
        preparingPdf: 'جار تجهيز ملف PDF...',
        pdfReadyFallback: 'إذا لم يبدأ تحميل PDF، اضغط تحميل PDF.',
        pdfFontError: 'تعذر تجهيز ملف PDF العربي. حدّث الصفحة وحاول مرة أخرى.',
        contact: 'التواصل',
        summary: 'الملخص المهني',
        skills: 'المهارات',
        experience: 'الخبرات العملية',
        education: 'التعليم',
        certifications: 'الشهادات',
        projects: 'مشاريع مختارة',
        extras: 'خبرات إضافية',
        error: 'تعذر تحميل محتوى الموقع. افتح هذه الصفحة من خادم الموقع.'
    }
};

const cleanText = (value) => (value || '').replace(/\s+/g, ' ').trim();

const localizedText = (element, lang = currentLanguage) => {
    if (!element) {
        return '';
    }

    if (lang === 'ar' && element.dataset.ar) {
        return cleanText(element.dataset.ar);
    }

    if (lang === 'en' && element.dataset.en) {
        return cleanText(element.dataset.en);
    }

    return cleanText(element.textContent);
};

const safeHref = (href) => {
    if (!href || href.startsWith('#')) {
        return '';
    }

    return href;
};

const createDownload = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const createElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (text) {
        element.textContent = text;
    }
    return element;
};

const createSection = (title) => {
    const section = createElement('section', 'cv-section');
    section.appendChild(createElement('h2', 'cv-section-title', title));
    return section;
};

const appendList = (parent, items, className = 'cv-list') => {
    if (!items.length) {
        return;
    }

    const list = createElement('ul', className);
    items.forEach((item) => {
        const listItem = createElement('li', '', item);
        list.appendChild(listItem);
    });
    parent.appendChild(list);
};

const getItems = (selector) => Array.from(sourceDocument.querySelectorAll(selector));

const getContactDetails = () => {
    const details = [];

    getItems('.contact-info a[href^="mailto:"]').forEach((link) => {
        details.push({ text: cleanText(link.textContent), href: link.href });
    });

    getItems('.contact-info a[href^="tel:"]').forEach((link) => {
        details.push({ text: cleanText(link.textContent), href: link.href });
    });

    const locationItem = getItems('.contact-item').find((item) => localizedText(item.querySelector('.contact-label'), 'en') === 'Location');
    const locationText = localizedText(locationItem?.querySelector('.contact-location'));
    if (locationText) {
        details.push({ text: locationText });
    }

    const residencyText = localizedText(locationItem?.querySelector('.contact-status'));
    if (residencyText) {
        details.push({ text: residencyText, bold: true });
    }

    getItems('.social-links a[href]').forEach((link) => {
        const label = link.getAttribute('aria-label') || link.href;
        details.push({ text: label.replace(' profile', ''), href: link.href });
    });

    return details;
};

const buildHeader = () => {
    const header = createElement('header', 'cv-header');
    const intro = createElement('div');
    intro.appendChild(createElement('h1', 'cv-name', localizedText(sourceDocument.querySelector('#heroName'))));
    intro.appendChild(createElement('p', 'cv-title', localizedText(sourceDocument.querySelector('.hero .title'))));
    intro.appendChild(createElement('p', 'cv-headline', localizedText(sourceDocument.querySelector('.hero .description'))));

    const contact = createElement('section', 'cv-contact');
    contact.setAttribute('aria-label', labels[currentLanguage].contact);
    getContactDetails().forEach((detail) => {
        const line = createElement(detail.href ? 'a' : detail.bold ? 'strong' : 'span', '', detail.text);
        if (detail.href) {
            line.href = safeHref(detail.href);
            line.target = '_blank';
            line.rel = 'noopener noreferrer';
        }
        contact.appendChild(line);
    });

    header.append(intro, contact);
    return header;
};

const buildSummary = () => {
    const section = createSection(labels[currentLanguage].summary);
    getItems('.about-text p').forEach((paragraph) => {
        section.appendChild(createElement('p', 'cv-project-description', localizedText(paragraph)));
    });
    return section;
};

const buildSkills = () => {
    const section = createSection(labels[currentLanguage].skills);
    section.classList.add('cv-section--compact');
    const items = [];
    getItems('.skill-card').forEach((card) => {
        const title = localizedText(card.querySelector('.skill-title'));
        const detail = localizedText(card.querySelector('p'));
        if (title && detail) {
            items.push(`${title}: ${detail}`);
        }
    });
    appendList(section, items, 'cv-list cv-skills-list');
    return section;
};

const buildExperience = () => {
    const section = createSection(labels[currentLanguage].experience);
    getItems('.experience-card').forEach((card) => {
        const entry = createElement('article', 'cv-entry');
        const header = createElement('div', 'cv-entry-header');
        header.appendChild(createElement('h3', 'cv-entry-title', localizedText(card.querySelector('.experience-title'))));
        header.appendChild(createElement('span', 'cv-entry-period', localizedText(card.querySelector('.experience-period'))));
        entry.appendChild(header);
        entry.appendChild(createElement('p', 'cv-entry-meta', localizedText(card.querySelector('.experience-company'))));
        appendList(entry, Array.from(card.querySelectorAll('li')).map((item) => localizedText(item)));
        section.appendChild(entry);
    });
    return section;
};

const buildSimpleCards = (title, cardSelector, titleSelector) => {
    const section = createSection(title);
    section.classList.add('cv-section--compact');
    const grid = createElement('div', 'cv-grid');
    getItems(cardSelector).forEach((card) => {
        const entry = createElement('article', 'cv-entry');
        entry.appendChild(createElement('h3', 'cv-entry-title', localizedText(card.querySelector(titleSelector))));
        const directText = Array.from(card.children)
            .filter((child) => !child.matches(titleSelector) && child.tagName !== 'UL')
            .map((child) => localizedText(child))
            .filter(Boolean)
            .join(' | ');
        if (directText) {
            entry.appendChild(createElement('p', 'cv-entry-meta', directText));
        }
        appendList(entry, Array.from(card.querySelectorAll('li')).map((item) => localizedText(item)));
        grid.appendChild(entry);
    });
    section.appendChild(grid);
    return section;
};

const buildProjects = () => {
    const section = createSection(labels[currentLanguage].projects);
    section.classList.add('cv-section--compact');
    getItems('.portfolio-item').slice(0, 6).forEach((item) => {
        const entry = createElement('article', 'cv-entry');
        const title = localizedText(item.querySelector('.portfolio-title'));
        const link = item.querySelector('.project-link[href]');
        entry.appendChild(createElement('h3', 'cv-entry-title', title));
        entry.appendChild(createElement('p', 'cv-project-description', localizedText(item.querySelector('.portfolio-info p'))));
        appendList(entry, Array.from(item.querySelectorAll('.project-proof li')).map((proof) => localizedText(proof)));
        if (link) {
            const projectLink = createElement('a', 'cv-project-link', new URL(link.href, window.location.href).href);
            projectLink.href = safeHref(link.href);
            projectLink.target = '_blank';
            projectLink.rel = 'noopener noreferrer';
            entry.appendChild(projectLink);
        }
        section.appendChild(entry);
    });
    return section;
};

const buildExtras = () => {
    const section = createSection(labels[currentLanguage].extras);
    section.classList.add('cv-section--compact');
    const grid = createElement('div', 'cv-grid');
    getItems('.experience-subcard').forEach((card) => {
        const entry = createElement('article', 'cv-entry');
        entry.appendChild(createElement('h3', 'cv-entry-title', localizedText(card.querySelector('.experience-subtitle'))));
        appendList(entry, Array.from(card.querySelectorAll('li')).map((item) => localizedText(item)));
        grid.appendChild(entry);
    });
    section.appendChild(grid);
    return section;
};

const setLanguage = (lang) => {
    currentLanguage = lang === 'ar' ? 'ar' : 'en';
    localStorage.setItem('cv-lang', currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('cv-ar', currentLanguage === 'ar');
    document.title = `${localizedText(sourceDocument?.querySelector('#heroName')) || 'Usman Asif Qureshi'} | CV`;
    document.querySelector('.toolbar-link').textContent = labels[currentLanguage].back;
    languageToggle.textContent = labels[currentLanguage].toggle;
    languageToggle.setAttribute('aria-label', labels[currentLanguage].toggleLabel);
    downloadButton.textContent = labels[currentLanguage].download;
    downloadTextButton.textContent = labels[currentLanguage].downloadText;
    if (downloadStatus && !shouldAutoDownloadPdf) {
        downloadStatus.textContent = '';
    }
};

const getCvTextExport = () => Array.from(cvPage.querySelectorAll('h1, .cv-title, .cv-headline, .cv-contact a, .cv-contact span, .cv-contact strong, h2, h3, .cv-entry-meta, .cv-entry-period, .cv-project-description, .cv-project-link, li'))
    .map((element) => cleanText(element.textContent))
    .filter(Boolean)
    .join('\n');

const getPdfFilename = () => currentLanguage === 'ar'
    ? 'Usman_Asif_Qureshi_CV_AR.pdf'
    : 'Usman_Asif_Qureshi_CV_EN.pdf';

const getPdfDocumentTitle = () => currentLanguage === 'ar'
    ? 'Usman Asif Qureshi CV Arabic'
    : 'Usman Asif Qureshi CV English';

const getProfileImageDataUrl = async () => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => reject(new Error('Profile image load timed out')), 1200);
        image.onload = () => {
            window.clearTimeout(timeoutId);
            resolve();
        };
        image.onerror = () => {
            window.clearTimeout(timeoutId);
            reject(new Error('Profile image failed to load'));
        };
        image.src = 'assets/images/profile-hero.png';
    });

    const size = 180;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.save();
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.clip();

    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    context.restore();

    return canvas.toDataURL('image/png');
};

let arabicPdfFontsPromise;

const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }

    return btoa(binary);
};

const loadArabicPdfFonts = () => {
    if (!arabicPdfFontsPromise) {
        const loadFont = async (path) => {
            const response = await fetch(path, { cache: 'force-cache' });
            if (!response.ok) {
                throw new Error(`Arabic PDF font request failed: ${response.status}`);
            }
            return arrayBufferToBase64(await response.arrayBuffer());
        };

        arabicPdfFontsPromise = Promise.all([
            loadFont('assets/fonts/NotoSansArabic-Regular.ttf'),
            loadFont('assets/fonts/NotoSansArabic-Bold.ttf')
        ]).catch((error) => {
            arabicPdfFontsPromise = null;
            throw error;
        });
    }

    return arabicPdfFontsPromise;
};

const registerArabicPdfFonts = async (pdf) => {
    const [regularFont, boldFont] = await loadArabicPdfFonts();
    pdf.addFileToVFS('NotoSansArabic-Regular.ttf', regularFont);
    pdf.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
    pdf.addFileToVFS('NotoSansArabic-Bold.ttf', boldFont);
    pdf.addFont('NotoSansArabic-Bold.ttf', 'NotoSansArabic', 'bold');
};

const getPdfSections = () => Array.from(cvPage.querySelectorAll('.cv-section')).map((section) => ({
    title: cleanText(section.querySelector('.cv-section-title')?.textContent),
    entries: Array.from(section.querySelectorAll('.cv-entry')).map((entry) => ({
        title: cleanText(entry.querySelector('.cv-entry-title')?.textContent),
        period: cleanText(entry.querySelector('.cv-entry-period')?.textContent),
        meta: cleanText(entry.querySelector('.cv-entry-meta')?.textContent),
        description: cleanText(entry.querySelector('.cv-project-description')?.textContent),
        link: cleanText(entry.querySelector('.cv-project-link')?.textContent),
        bullets: Array.from(entry.querySelectorAll('li')).map((item) => cleanText(item.textContent)).filter(Boolean)
    })),
    paragraphs: Array.from(section.querySelectorAll(':scope > p')).map((item) => cleanText(item.textContent)).filter(Boolean),
    bullets: Array.from(section.querySelectorAll(':scope > ul > li')).map((item) => cleanText(item.textContent)).filter(Boolean)
}));

// jsPDF cannot shape or bidi-reorder Arabic, so the Arabic CV is produced by
// capturing the already-correct RTL DOM (#cvPage) with html2canvas and slicing
// that bitmap across A4 pages. Page breaks snap to block boundaries so lines of
// text are never cut in half.
const getPdfPageBreakOffsets = () => {
    const pageTop = cvPage.getBoundingClientRect().top;
    const blocks = cvPage.querySelectorAll(
        '.cv-section-title, .cv-entry, .cv-grid > .cv-entry, .cv-list > li, .cv-section > p, .cv-project-description'
    );
    const offsets = Array.from(blocks, (block) => block.getBoundingClientRect().top - pageTop);
    return Array.from(new Set(offsets.filter((offset) => offset > 0))).sort((a, b) => a - b);
};

const downloadPdfFromDom = async (filename) => {
    const html2canvas = window.html2canvas;
    const JsPdfConstructor = window.jspdf?.jsPDF || window.jsPDF;
    if (typeof html2canvas !== 'function' || !JsPdfConstructor) {
        window.print();
        return;
    }

    if (document.fonts?.ready) {
        try {
            await document.fonts.ready;
        } catch (error) {
            // document.fonts.ready never rejects in practice; fall through.
        }
    }

    const cssHeight = cvPage.scrollHeight;
    const breakOffsets = getPdfPageBreakOffsets();
    const canvas = await html2canvas(cvPage, {
        scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
            const clonedPage = clonedDoc.getElementById('cvPage');
            if (clonedPage) {
                clonedPage.style.margin = '0';
                clonedPage.style.border = 'none';
                clonedPage.style.boxShadow = 'none';
            }
        }
    });

    const pxPerCssPx = canvas.height / cssHeight;
    const pdf = new JsPdfConstructor({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    if (typeof pdf.setProperties === 'function') {
        pdf.setProperties({
            title: getPdfDocumentTitle(),
            subject: 'Curriculum vitae generated from codewithusman.com',
            author: 'Usman Asif Qureshi',
            keywords: 'project manager, full-stack developer, SpeedLogi, iLab, Laravel, Python, Flask, Flutter, WordPress'
        });
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const renderWidth = pageWidth - margin * 2;
    const maxSlicePx = (pageHeight - margin * 2) * (canvas.width / renderWidth);

    let startPx = 0;
    let pageIndex = 0;
    while (startPx < canvas.height - 1) {
        const idealEndPx = startPx + maxSlicePx;
        let endPx = idealEndPx;
        if (idealEndPx < canvas.height) {
            const snap = breakOffsets
                .map((offset) => offset * pxPerCssPx)
                .filter((offsetPx) => offsetPx > startPx + maxSlicePx * 0.4 && offsetPx <= idealEndPx)
                .pop();
            if (snap) {
                endPx = snap;
            }
        } else {
            endPx = canvas.height;
        }

        const sliceHeightPx = Math.max(1, Math.round(endPx - startPx));
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const context = pageCanvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, startPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        if (pageIndex > 0) {
            pdf.addPage();
        }
        pdf.addImage(
            pageCanvas.toDataURL('image/jpeg', 0.92),
            'JPEG',
            margin,
            margin,
            renderWidth,
            sliceHeightPx / (canvas.width / renderWidth)
        );

        startPx += sliceHeightPx;
        pageIndex += 1;
    }

    const pageCount = pdf.internal.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        pdf.setPage(pageNumber);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(90, 90, 90);
        pdf.text(`${pageNumber} / ${pageCount}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
    }
    pdf.setTextColor(0, 0, 0);
    pdf.save(filename);
};

const downloadPdf = async () => {
    const filename = getPdfFilename();
    window.dispatchEvent(new CustomEvent('cv:download-pdf', { detail: { filename } }));
    if (downloadStatus) {
        downloadStatus.textContent = labels[currentLanguage].preparingPdf;
    }

    if (currentLanguage === 'ar') {
        try {
            await downloadPdfFromDom(filename);
        } catch (error) {
            if (downloadStatus) {
                downloadStatus.textContent = labels.ar.pdfFontError;
            }
            throw error;
        }
        if (downloadStatus) {
            downloadStatus.textContent = labels.ar.pdfReadyFallback;
        }
        return;
    }

    const JsPdfConstructor = window.jspdf?.jsPDF || window.jsPDF;
    if (!JsPdfConstructor) {
        window.print();
        return;
    }

    const pdf = new JsPdfConstructor({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    if (typeof pdf.setProperties === 'function') {
        pdf.setProperties({
            title: getPdfDocumentTitle(),
            subject: 'ATS-friendly curriculum vitae generated from codewithusman.com',
            author: 'Usman Asif Qureshi',
            keywords: 'project manager, full-stack developer, SpeedLogi, iLab, Laravel, Python, Flask, Flutter, WordPress'
        });
    }

    if (currentLanguage === 'ar') {
        try {
            await registerArabicPdfFonts(pdf);
        } catch (error) {
            if (downloadStatus) {
                downloadStatus.textContent = labels[currentLanguage].pdfFontError;
            }
            throw error;
        }
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 18;
    const contentWidth = pageWidth - marginX * 2;
    const pageTop = 30;
    const pageBottom = pageHeight - 28;
    let y = 32;

    if (currentLanguage === 'ar' && typeof pdf.setR2L === 'function') {
        pdf.setR2L(true);
    }

    const setPdfFont = (font = 'helvetica', style = 'normal') => {
        if (currentLanguage === 'ar') {
            pdf.setFont('NotoSansArabic', style === 'bold' ? 'bold' : 'normal');
            return;
        }
        pdf.setFont(font, style);
    };

    const addPageIfNeeded = (heightNeeded) => {
        if (y + heightNeeded <= pageBottom) {
            return;
        }
        pdf.addPage();
        y = pageTop;
    };

    const getLineCount = (text, size, maxWidth, font = 'helvetica', style = 'normal') => {
        setPdfFont(font, style);
        pdf.setFontSize(size);
        return pdf.splitTextToSize(cleanText(text), maxWidth).length;
    };

    const getTextHeight = (text, options = {}) => {
        const content = cleanText(text);
        if (!content) {
            return 0;
        }

        const size = options.size || 9.5;
        const maxWidth = options.maxWidth || contentWidth;
        const lineHeight = options.lineHeight || size * 1.34;
        const after = options.after ?? 4;
        return getLineCount(content, size, maxWidth, options.font, options.style) * lineHeight + after;
    };

    const writeText = (text, x, options = {}) => {
        const content = cleanText(text);
        if (!content) {
            return;
        }

        const font = options.font || 'helvetica';
        const style = options.style || 'normal';
        const size = options.size || 9.5;
        const maxWidth = options.maxWidth || contentWidth;
        const lineHeight = options.lineHeight || size * 1.34;
        const after = options.after ?? 4;
        const align = options.align || (currentLanguage === 'ar' ? 'right' : 'left');
        setPdfFont(font, style);
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(content, maxWidth);
        addPageIfNeeded(lines.length * lineHeight + after);
        pdf.text(lines, x, y, { align });
        y += lines.length * lineHeight + after;
    };

    const drawSectionTitle = (title) => {
        addPageIfNeeded(30);
        y += 8;
        setPdfFont('times', 'bold');
        pdf.setFontSize(17);
        pdf.text(title, marginX + (currentLanguage === 'ar' ? contentWidth : 0), y, { align: currentLanguage === 'ar' ? 'right' : 'left' });
        y += 6;
        pdf.setDrawColor(40, 40, 40);
        pdf.setLineWidth(0.8);
        pdf.line(marginX, y, pageWidth - marginX, y);
        y += 18;
    };

    const measureEntry = (entry, width) => {
        const heading = [entry.title, entry.meta ? `at ${entry.meta}` : '', entry.period ? `| ${entry.period}` : '']
            .filter(Boolean)
            .join(' ');
        let height = getTextHeight(heading, { font: 'times', style: 'bold', size: 12.2, maxWidth: width, lineHeight: 15, after: 5 });
        height += getTextHeight(entry.description, { size: 8.6, maxWidth: width, lineHeight: 11.3, after: 3 });
        height += getTextHeight(entry.link, { size: 7.7, maxWidth: width, lineHeight: 10, after: 3 });
        entry.bullets.forEach((bullet) => {
            height += getTextHeight(`- ${bullet}`, { size: 8.3, maxWidth: width - 4, lineHeight: 10.8, after: 2 });
        });
        return height + 4;
    };

    const drawColumnText = (text, column, options = {}) => {
        const content = cleanText(text);
        if (!content) {
            return;
        }

        const font = options.font || 'helvetica';
        const style = options.style || 'normal';
        const size = options.size || 8.8;
        const maxWidth = options.maxWidth || column.width;
        const lineHeight = options.lineHeight || size * 1.3;
        const after = options.after ?? 3;
        const align = options.align || (currentLanguage === 'ar' ? 'right' : 'left');
        setPdfFont(font, style);
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(content, maxWidth);
        pdf.text(lines, currentLanguage === 'ar' ? column.x + column.width : column.x, column.y, { align });
        column.y += lines.length * lineHeight + after;
    };

    const drawColumnEntry = (entry, column) => {
        const heading = [entry.title, entry.meta ? `at ${entry.meta}` : '', entry.period ? `| ${entry.period}` : '']
            .filter(Boolean)
            .join(' ');
        drawColumnText(heading, column, { font: 'times', style: 'bold', size: 12.2, lineHeight: 15, after: 5 });
        drawColumnText(entry.description, column, { size: 8.6, lineHeight: 11.3, after: 3 });
        drawColumnText(entry.link, column, { size: 7.7, lineHeight: 10, after: 3 });
        entry.bullets.forEach((bullet) => drawColumnText(`- ${bullet}`, column, { size: 8.3, maxWidth: column.width - 4, lineHeight: 10.8, after: 2 }));
        column.y += 4;
    };

    const ensureColumnSpace = (columns, columnIndex, heightNeeded) => {
        if (columns[columnIndex].y + heightNeeded <= pageBottom) {
            return columnIndex;
        }

        const otherIndex = columnIndex === 0 ? 1 : 0;
        if (columns[otherIndex].y + heightNeeded <= pageBottom) {
            return otherIndex;
        }

        pdf.addPage();
        columns[0].y = pageTop + 4;
        columns[1].y = pageTop + 4;
        return 0;
    };

    const drawColumnSectionHeader = (title, column) => {
        setPdfFont('times', 'bold');
        pdf.setFontSize(15);
        pdf.text(title, currentLanguage === 'ar' ? column.x + column.width : column.x, column.y, { align: currentLanguage === 'ar' ? 'right' : 'left' });
        column.y += 6;
        pdf.setDrawColor(40, 40, 40);
        pdf.setLineWidth(0.7);
        pdf.line(column.x, column.y, column.x + column.width, column.y);
        column.y += 15;
    };

    const measureColumnSection = (section, width) => {
        let height = 28;
        section.paragraphs.forEach((paragraph) => {
            height += getTextHeight(paragraph, { size: 8.6, maxWidth: width, lineHeight: 11.3, after: 4 });
        });
        section.bullets.forEach((bullet) => {
            height += getTextHeight(`- ${bullet}`, { size: 8.4, maxWidth: width - 4, lineHeight: 10.8, after: 3 });
        });
        section.entries.forEach((entry) => {
            height += measureEntry(entry, width);
        });
        return height + 10;
    };

    const drawTwoColumnSections = (sections) => {
        if (!sections.length) {
            return;
        }

        const gap = 20;
        const columnWidth = (contentWidth - gap) / 2;
        let columns = [
            { x: marginX, y: y + 6, width: columnWidth },
            { x: marginX + columnWidth + gap, y: y + 6, width: columnWidth }
        ];
        let columnIndex = 0;

        sections.forEach((section) => {
            const maximumColumnHeight = pageBottom - pageTop - 4;
            const sectionHeight = Math.min(measureColumnSection(section, columnWidth), maximumColumnHeight);
            columnIndex = ensureColumnSpace(columns, columnIndex, sectionHeight);
            drawColumnSectionHeader(section.title, columns[columnIndex]);

            section.paragraphs.forEach((paragraph) => {
                const height = getTextHeight(paragraph, { size: 8.6, maxWidth: columnWidth, lineHeight: 11.3, after: 4 });
                columnIndex = ensureColumnSpace(columns, columnIndex, height);
                drawColumnText(paragraph, columns[columnIndex], { size: 8.6, lineHeight: 11.3, after: 4 });
            });

            section.bullets.forEach((bullet) => {
                const text = `- ${bullet}`;
                const height = getTextHeight(text, { size: 8.4, maxWidth: columnWidth - 4, lineHeight: 10.8, after: 3 });
                columnIndex = ensureColumnSpace(columns, columnIndex, height);
                drawColumnText(text, columns[columnIndex], { size: 8.4, maxWidth: columnWidth - 4, lineHeight: 10.8, after: 3 });
            });

            section.entries.forEach((entry) => {
                const entryHeight = measureEntry(entry, columnWidth);
                columnIndex = ensureColumnSpace(columns, columnIndex, entryHeight);
                drawColumnEntry(entry, columns[columnIndex]);
            });

            columns[columnIndex].y += 8;
            columnIndex = columns[0].y <= columns[1].y ? 0 : 1;
        });

        y = Math.max(columns[0].y, columns[1].y);
    };

    try {
        pdf.addImage(await getProfileImageDataUrl(), 'PNG', marginX + 6, 28, 82, 82);
    } catch (error) {
        pdf.setDrawColor(40, 40, 40);
        pdf.circle(marginX + 47, 69, 41);
    }

    const name = cleanText(cvPage.querySelector('.cv-name')?.textContent);
    const title = cleanText(cvPage.querySelector('.cv-title')?.textContent);
    const headline = cleanText(cvPage.querySelector('.cv-headline')?.textContent);
    const contactLines = Array.from(cvPage.querySelectorAll('.cv-contact a, .cv-contact span, .cv-contact strong'))
        .map((item) => ({ text: cleanText(item.textContent), bold: item.tagName === 'STRONG' }))
        .filter(Boolean);
    const linkedinLink = Array.from(cvPage.querySelectorAll('.cv-contact a'))
        .find((link) => cleanText(link.textContent).toLowerCase().includes('linkedin'));
    const linkedin = linkedinLink?.href || 'https://www.linkedin.com/in/usmanasif1057/';

    const introX = 118;
    const contactWidth = 160;
    const rightX = pageWidth - marginX - contactWidth;
    const introWidth = rightX - introX - 14;
    const getFittedFontSize = (text, font, style, preferredSize, minimumSize, maxWidth) => {
        setPdfFont(font, style);
        let size = preferredSize;
        pdf.setFontSize(size);
        while (size > minimumSize && pdf.getTextWidth(text) > maxWidth) {
            size -= 0.5;
            pdf.setFontSize(size);
        }
        return size;
    };

    y = 56;
    setPdfFont('times', 'normal');
    pdf.setFontSize(getFittedFontSize(name, 'times', 'normal', 34, 25, introWidth));
    pdf.text(name, introX, y);
    y += 31;
    setPdfFont('times', 'bold');
    pdf.setFontSize(getFittedFontSize(title, 'times', 'bold', 17, 12, introWidth));
    pdf.text(title, introX, y);
    y += 17;
    writeText(linkedin, introX, { size: 9, maxWidth: introWidth, after: 0 });

    let contactY = 24;
    contactLines.slice(0, 8).forEach((line) => {
        const normalizedLine = line.text.replace(/^mailto:/, '').replace(/^tel:/, '');
        const lowerLine = normalizedLine.toLowerCase();
        const prefix = normalizedLine.includes('@')
            ? 'Email: '
            : normalizedLine.startsWith('+')
                ? 'Phone: '
                : lowerLine.includes('linkedin')
                    ? 'LinkedIn: '
                    : lowerLine.includes('facebook')
                        ? 'Facebook: '
                        : lowerLine.includes('instagram')
                            ? 'Instagram: '
                            : '';
        const text = prefix && !normalizedLine.startsWith(prefix) ? `${prefix}${normalizedLine}` : normalizedLine;
        setPdfFont('helvetica', line.bold ? 'bold' : 'normal');
        pdf.setFontSize(8.5);
        const lines = pdf.splitTextToSize(text, contactWidth);
        pdf.text(lines, rightX, contactY);
        contactY += lines.length * 10.8 + 2;
    });

    y = 156;
    writeText(headline, marginX, { size: 10.7, style: 'bold', maxWidth: contentWidth, lineHeight: 14, after: 10 });

    const pdfSections = getPdfSections();
    const compactSectionTitles = [
        labels[currentLanguage].skills,
        labels[currentLanguage].education,
        labels[currentLanguage].certifications,
        labels[currentLanguage].projects,
        labels[currentLanguage].extras
    ];

    pdfSections.forEach((section) => {
        if (section.title === labels[currentLanguage].summary) {
            return;
        }

        if (compactSectionTitles.includes(section.title)) {
            return;
        }

        const sectionTitle = section.title === labels[currentLanguage].experience && currentLanguage === 'en'
            ? 'Professional Experience'
            : section.title;
        drawSectionTitle(sectionTitle);

        section.paragraphs.forEach((paragraph) => writeText(paragraph, marginX, { size: 9.5, after: 6 }));
        section.bullets.forEach((bullet) => writeText(`- ${bullet}`, marginX + 8, { size: 9.2, maxWidth: contentWidth - 8, after: 4 }));

        section.entries.forEach((entry) => {
            const heading = [entry.title, entry.meta ? `at ${entry.meta}` : '', entry.period ? `| ${entry.period}` : '']
                .filter(Boolean)
                .join(' ');
            writeText(heading, marginX + 5, { font: 'times', style: 'bold', size: 13.5, maxWidth: contentWidth - 10, lineHeight: 17, after: 7 });
            if (entry.description) {
                writeText(entry.description, marginX + 5, { size: 9.4, maxWidth: contentWidth - 10, after: 4 });
            }
            if (entry.link) {
                writeText(entry.link, marginX + 5, { size: 8.6, maxWidth: contentWidth - 10, after: 5 });
            }
            entry.bullets.forEach((bullet) => writeText(`- ${bullet}`, marginX + 8, { size: 9.2, maxWidth: contentWidth - 8, after: 3 }));
            y += 3;
        });
    });

    drawTwoColumnSections(pdfSections.filter((section) => compactSectionTitles.includes(section.title)));

    const pageCount = pdf.internal.getNumberOfPages();
    if (currentLanguage === 'ar' && typeof pdf.setR2L === 'function') {
        pdf.setR2L(false);
    }
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        pdf.setPage(pageNumber);
        setPdfFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(90, 90, 90);
        pdf.text(`${pageNumber} / ${pageCount}`, pageWidth - marginX, pageHeight - 12, { align: 'right' });
    }
    pdf.setTextColor(0, 0, 0);
    pdf.save(filename);
    if (downloadStatus) {
        downloadStatus.textContent = labels[currentLanguage].pdfReadyFallback;
    }
};

const renderCv = () => {
    setLanguage(currentLanguage);
    cvPage.replaceChildren(
        buildHeader(),
        buildSummary(),
        buildSkills(),
        buildExperience(),
        buildSimpleCards(labels[currentLanguage].education, '.education-card', '.education-title'),
        buildSimpleCards(labels[currentLanguage].certifications, '.cert-card', '.cert-title'),
        buildProjects(),
        buildExtras()
    );

    if (shouldAutoDownloadPdf && !hasAutoDownloadedPdf) {
        hasAutoDownloadedPdf = true;
        window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('cv:download-pdf'));
            downloadPdf().catch(() => {});
            downloadButton.focus();
        }, 350);
    }

    if (shouldAutoPrint && !hasAutoPrinted) {
        hasAutoPrinted = true;
        window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('cv:auto-print'));
            window.print();
        }, 350);
    }
};

const loadPortfolio = async () => {
    try {
        const response = await fetch('index.html', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Portfolio request failed: ${response.status}`);
        }
        const html = await response.text();
        sourceDocument = new DOMParser().parseFromString(html, 'text/html');
        renderCv();
    } catch (error) {
        cvPage.innerHTML = `<p class="cv-error">${labels[currentLanguage].error}</p>`;
    }
};

languageToggle.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    renderCv();
});

downloadButton.addEventListener('click', () => {
    downloadPdf().catch(() => {});
});

downloadTextButton.addEventListener('click', () => {
    const filename = currentLanguage === 'ar'
        ? 'Usman_Asif_Qureshi_CV_ATS_AR.txt'
        : 'Usman_Asif_Qureshi_CV_ATS_EN.txt';
    createDownload(filename, `${getCvTextExport()}\n`, 'text/plain;charset=utf-8');
});

loadPortfolio();