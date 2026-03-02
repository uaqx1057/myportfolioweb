// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const rootElement = document.documentElement;

const setTheme = (theme) => {
    rootElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
};

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = rootElement.getAttribute('data-theme') || 'dark';
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}

// Language and direction
const langToggle = document.getElementById('langToggle');
const getBrowserLanguage = () => {
    const preferred = (navigator.languages && navigator.languages.length)
        ? navigator.languages[0]
        : (navigator.language || 'en');
    return preferred.toLowerCase();
};

const syncContactInfoOrder = (isArabic) => {
    const contactInfo = document.querySelector('.contact-info');
    if (!contactInfo) {
        return;
    }

    const items = Array.from(contactInfo.children).filter((el) => el.classList.contains('contact-item'));
    if (items.length === 0) {
        return;
    }

    if (!contactInfo.dataset.orderInitialized) {
        items.forEach((item, index) => {
            item.dataset.orderIndex = String(index);
        });
        contactInfo.dataset.orderInitialized = 'true';
    }

    const ordered = items
        .slice()
        .sort((a, b) => Number(a.dataset.orderIndex) - Number(b.dataset.orderIndex));

    const finalOrder = isArabic ? ordered.reverse() : ordered;
    finalOrder.forEach((item) => contactInfo.appendChild(item));
};

const syncNavMenuOrder = (isArabic) => {
    const navMenuElement = document.querySelector('.nav-menu');
    if (!navMenuElement) {
        return;
    }

    const items = Array.from(navMenuElement.children).filter((el) => el.tagName === 'LI');
    if (items.length === 0) {
        return;
    }

    if (!navMenuElement.dataset.orderInitialized) {
        items.forEach((item, index) => {
            item.dataset.orderIndex = String(index);
        });
        navMenuElement.dataset.orderInitialized = 'true';
    }

    const ordered = items
        .slice()
        .sort((a, b) => Number(a.dataset.orderIndex) - Number(b.dataset.orderIndex));

    const finalOrder = isArabic ? ordered.reverse() : ordered;
    finalOrder.forEach((item) => navMenuElement.appendChild(item));
};

const applyLanguage = (lang) => {
    const isArabic = lang.startsWith('ar');
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ar', isArabic);

    const logoName = document.getElementById('logoName');
    if (logoName) {
        logoName.textContent = isArabic ? logoName.dataset.ar : logoName.dataset.en;
    }

    const heroName = document.getElementById('heroName');
    if (heroName) {
        heroName.textContent = isArabic ? heroName.dataset.ar : heroName.dataset.en;
    }

    const titleElement = document.querySelector('title[data-en][data-ar]');
    if (titleElement) {
        document.title = isArabic ? titleElement.dataset.ar : titleElement.dataset.en;
    }

    document.querySelectorAll('meta[data-en-content][data-ar-content]').forEach((meta) => {
        meta.setAttribute('content', isArabic ? meta.dataset.arContent : meta.dataset.enContent);
    });

    if (langToggle) {
        langToggle.textContent = isArabic ? 'EN' : 'AR';
        langToggle.setAttribute('aria-label', isArabic ? 'Switch to English' : 'Switch to Arabic');
        langToggle.setAttribute('aria-pressed', String(isArabic));
    }

    document.querySelectorAll('[data-en][data-ar]').forEach((el) => {
        if (el.children.length === 0) {
            el.textContent = isArabic ? el.dataset.ar : el.dataset.en;
        }
    });

    document.querySelectorAll('[data-en-placeholder][data-ar-placeholder]').forEach((el) => {
        el.setAttribute('placeholder', isArabic ? el.dataset.arPlaceholder : el.dataset.enPlaceholder);
    });

    document.querySelectorAll('[data-en-aria][data-ar-aria]').forEach((el) => {
        el.setAttribute('aria-label', isArabic ? el.dataset.arAria : el.dataset.enAria);
    });

    syncNavMenuOrder(isArabic);
    syncContactInfoOrder(isArabic);
};

const savedLang = localStorage.getItem('lang');
applyLanguage(savedLang || getBrowserLanguage());

if (langToggle) {
    langToggle.addEventListener('click', () => {
        const current = document.documentElement.lang || 'en';
        const nextLang = current === 'ar' ? 'en' : 'ar';
        localStorage.setItem('lang', nextLang);
        applyLanguage(nextLang);
    });
}

// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

const setMenuState = (isOpen) => {
    if (!hamburger || !navMenu) {
        return;
    }

    navMenu.classList.toggle('active', isOpen);
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
};

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        const isOpen = navMenu.classList.contains('active');
        setMenuState(!isOpen);
    });
}

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        setMenuState(false);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        setMenuState(false);
    }
});

document.addEventListener('click', (event) => {
    if (!hamburger || !navMenu || !navMenu.classList.contains('active')) {
        return;
    }

    const clickedInsideMenu = navMenu.contains(event.target);
    const clickedHamburger = hamburger.contains(event.target);

    if (!clickedInsideMenu && !clickedHamburger) {
        setMenuState(false);
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetSelector = this.getAttribute('href');
        const target = document.querySelector(targetSelector);
        if (target) {
            e.preventDefault();

            const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

            if (this.classList.contains('skip-link')) {
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }

            target.scrollIntoView({
                behavior: scrollBehavior,
                block: 'start'
            });
        }
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) {
        return;
    }

    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Active navigation link on scroll
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-menu a');

const updateActiveNavLink = () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 220 && window.pageYOffset < sectionTop + sectionHeight - 120) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
};

window.addEventListener('scroll', updateActiveNavLink);
window.addEventListener('load', updateActiveNavLink);

// Intersection Observer for scroll animations
const animatedElements = document.querySelectorAll('.skill-card, .service-card, .portfolio-item, .experience-card, .education-card, .cert-card, .experience-subcard');

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
} else {
    animatedElements.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
}

// Contact Form Handling
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const action = contactForm.getAttribute('action');

        if (!action) {
            alert('Form action is not configured.');
            return;
        }

        try {
            const response = await fetch(action, {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json'
                }
            });

            if (response.ok) {
                const isArabic = document.documentElement.lang === 'ar';
                alert(isArabic ? 'شكراً لرسالتك! سأتواصل معك قريباً.' : 'Thank you for your message! I will get back to you soon.');
                contactForm.reset();
            } else {
                const isArabic = document.documentElement.lang === 'ar';
                alert(isArabic ? 'حدث خطأ ما. حاول مرة أخرى لاحقاً.' : 'Something went wrong. Please try again later.');
            }
        } catch (error) {
            const isArabic = document.documentElement.lang === 'ar';
            alert(isArabic ? 'تعذّر إرسال الرسالة حالياً. حاول مرة أخرى لاحقاً.' : 'Unable to send the message right now. Please try again later.');
        }
    });
}

// Dynamic year in footer
const currentYear = new Date().getFullYear();
const footerText = document.querySelector('.footer-bottom p');
if (footerText) {
    footerText.textContent = footerText.textContent.replace('2026', currentYear);
}

// Add smooth hover effect to buttons
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px) scale(1.05)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

console.log('Portfolio website loaded successfully! 🚀');
