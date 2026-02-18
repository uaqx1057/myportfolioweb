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
    }
};

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
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

const applyLanguage = (lang) => {
    const isArabic = lang.startsWith('ar');
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ar', isArabic);

    if (langToggle) {
        langToggle.textContent = isArabic ? 'EN' : 'AR';
        langToggle.setAttribute('aria-label', isArabic ? 'Switch to English' : 'Switch to Arabic');
    }

    document.querySelectorAll('[data-en][data-ar]').forEach((el) => {
        if (el.children.length === 0) {
            el.textContent = isArabic ? el.dataset.ar : el.dataset.en;
        }
    });

    document.querySelectorAll('[data-en-placeholder][data-ar-placeholder]').forEach((el) => {
        el.setAttribute('placeholder', isArabic ? el.dataset.arPlaceholder : el.dataset.enPlaceholder);
    });
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

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    
    // Animate hamburger
    hamburger.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
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

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards and sections
document.querySelectorAll('.skill-card, .service-card, .portfolio-item, .experience-card, .education-card, .cert-card, .experience-subcard').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

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

// Typing effect for hero title
const titleElement = document.querySelector('.title');
if (titleElement) {
    const originalText = titleElement.textContent;
    titleElement.textContent = '';
    let i = 0;
    
    const typeWriter = () => {
        if (i < originalText.length) {
            titleElement.textContent += originalText.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        }
    };
    
    // Start typing effect after a short delay
    setTimeout(typeWriter, 500);
}

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroContent = document.querySelector('.hero-content');
    const heroImage = document.querySelector('.hero-image');
    
    if (heroContent && heroImage) {
        heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
        heroImage.style.transform = `translateY(${scrolled * 0.2}px)`;
    }
});

// Skill cards hover effect
document.querySelectorAll('.skill-card, .service-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Portfolio filter functionality (if you want to add categories later)
// This is a placeholder for future enhancement
const portfolioItems = document.querySelectorAll('.portfolio-item');

// Add random animation delays to portfolio items
portfolioItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.1}s`;
});

// Smooth reveal animation for sections
const revealSections = document.querySelectorAll('section');

const revealSection = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
};

const sectionObserver = new IntersectionObserver(revealSection, {
    threshold: 0.15
});

revealSections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    sectionObserver.observe(section);
});

// Dynamic year in footer
const currentYear = new Date().getFullYear();
const footerText = document.querySelector('.footer-bottom p');
if (footerText) {
    footerText.textContent = footerText.textContent.replace('2026', currentYear);
}

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// Copy email to clipboard when clicked
const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
emailLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const email = link.textContent;
        navigator.clipboard.writeText(email).then(() => {
            // Create a temporary tooltip
            const tooltip = document.createElement('span');
            tooltip.textContent = 'Email copied!';
            tooltip.style.cssText = `
                position: absolute;
                background: #6366f1;
                color: white;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
            `;
            link.parentElement.style.position = 'relative';
            link.parentElement.appendChild(tooltip);
            
            setTimeout(() => {
                tooltip.remove();
            }, 2000);
        });
    });
});

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
