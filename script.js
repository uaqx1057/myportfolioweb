// Edit this file, not script.min.js — regenerate with: npx terser script.js -o script.min.js --compress --mangle --format comments=false
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
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setTheme(savedTheme || 'dark');

const rgbaFromHex = (hex, alpha) => {
    const normalized = hex.replace('#', '').trim();
    const fullHex = normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized;
    const red = parseInt(fullHex.slice(0, 2), 16);
    const green = parseInt(fullHex.slice(2, 4), 16);
    const blue = parseInt(fullHex.slice(4, 6), 16);

    if ([red, green, blue].some(Number.isNaN)) {
        return `rgba(0, 229, 255, ${alpha})`;
    }

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

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

// Inject technology logo strips into work, projects, and testimonials.
const techIconMap = {
    Python: 'fab fa-python',
    Flask: 'fas fa-flask',
    PHP: 'fab fa-php',
    Laravel: 'fab fa-laravel',
    WordPress: 'fab fa-wordpress',
    Elementor: 'fas fa-layer-group',
    JavaScript: 'fab fa-js',
    React: 'fab fa-react',
    Flutter: 'fas fa-mobile-screen-button',
    Android: 'fab fa-android',
    HTML: 'fab fa-html5',
    CSS: 'fab fa-css3-alt',
    SEO: 'fas fa-magnifying-glass-chart',
    Performance: 'fas fa-gauge-high',
    Security: 'fas fa-shield-halved',
    Upwork: 'fas fa-briefcase',
    Design: 'fas fa-pen-nib',
    Support: 'fas fa-headset',
    Management: 'fas fa-diagram-project',
    Delivery: 'fas fa-rocket',
    UX: 'fas fa-wand-magic-sparkles'
};

const createTechStack = (items) => {
    const stack = document.createElement('div');
    stack.className = 'tech-stack';
    stack.setAttribute('aria-label', 'Technology stack');

    items.forEach((item) => {
        const pill = document.createElement('span');
        pill.className = 'tech-pill';
        pill.innerHTML = `<i class="${techIconMap[item] || 'fas fa-microchip'}" aria-hidden="true"></i> ${item}`;
        stack.appendChild(pill);
    });

    return stack;
};

const addTechStack = (target, items, insertBefore = null) => {
    if (!target || target.querySelector(':scope > .tech-stack')) {
        return;
    }

    target.insertBefore(createTechStack(items), insertBefore);
};

document.querySelectorAll('.experience-card').forEach((card) => {
    const title = card.querySelector('.experience-title')?.dataset.en || card.textContent;
    const company = card.querySelector('.experience-company')?.textContent || '';
    const list = card.querySelector('ul');

    if (title.includes('Team Lead')) {
        addTechStack(card, ['Python', 'Flask', 'PHP', 'Flutter', 'Management'], list);
    } else if (title.includes('Senior WordPress')) {
        addTechStack(card, ['WordPress', 'Elementor', 'JavaScript', 'SEO', 'Delivery'], list);
    } else if (company.includes('Upwork')) {
        addTechStack(card, ['Upwork', 'WordPress', 'HTML', 'CSS', 'PHP'], list);
    } else {
        addTechStack(card, ['Support', 'Security', 'Delivery'], list);
    }
});

document.querySelectorAll('.portfolio-item').forEach((item) => {
    const title = item.querySelector('.portfolio-title')?.dataset.en || item.textContent;
    const info = item.querySelector('.portfolio-info');
    const link = item.querySelector('.project-link');

    if (title.includes('DOBS')) {
        addTechStack(info, ['Python', 'Flask', 'Management', 'Security'], link);
    } else if (title.includes('DMS')) {
        addTechStack(info, ['Laravel', 'PHP', 'Management'], link);
    } else if (title.includes('iLab')) {
        addTechStack(info, ['WordPress', 'Performance', 'SEO'], link);
    } else if (title === 'Speed') {
        addTechStack(info, ['Performance', 'SEO', 'WordPress'], link);
    } else if (title.includes('SpeedPoint')) {
        addTechStack(info, ['PHP', 'UX', 'Delivery'], link);
    } else {
        addTechStack(info, ['WordPress', 'Design', 'SEO'], link);
    }
});

document.querySelectorAll('.review-card').forEach((card) => {
    const text = card.textContent;
    const stars = card.querySelector('.stars');
    let items = ['Upwork', 'Delivery'];

    if (text.includes('React') || text.includes('PHP/React')) {
        items = ['Upwork', 'PHP', 'React'];
    } else if (text.includes('Elementor')) {
        items = ['Upwork', 'WordPress', 'Elementor'];
    } else if (text.includes('speed optimization')) {
        items = ['Upwork', 'WordPress', 'Performance'];
    } else if (text.includes('graphic designing')) {
        items = ['Upwork', 'Design', 'Delivery'];
    } else if (text.includes('WordPress')) {
        items = ['Upwork', 'WordPress', 'Delivery'];
    }

    if (stars && !card.querySelector(':scope > .tech-stack')) {
        stars.insertAdjacentElement('afterend', createTechStack(items));
    }
});

// Full-page sci-fi circuitry field behind content.
const siteHudCanvas = document.getElementById('siteHudCanvas');

if (siteHudCanvas) {
    const siteContext = siteHudCanvas.getContext('2d', { alpha: true });
    const nodes = [];
    const beams = [];
    let siteWidth = 0;
    let siteHeight = 0;
    let hudFrameId = null;
    let hudTick = 0;

    const getCssColor = (name) => getComputedStyle(rootElement).getPropertyValue(name).trim() || '#00e5ff';

    let siteColors = { primary: '#00e5ff', secondary: '#8b5cf6' };
    const refreshSiteColors = () => {
        siteColors = {
            primary: getCssColor('--primary-color'),
            secondary: getCssColor('--secondary-color')
        };
    };

    const resizeSiteHud = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        siteWidth = Math.max(1, window.innerWidth);
        siteHeight = Math.max(1, window.innerHeight);
        siteHudCanvas.width = Math.floor(siteWidth * pixelRatio);
        siteHudCanvas.height = Math.floor(siteHeight * pixelRatio);
        siteHudCanvas.style.width = `${siteWidth}px`;
        siteHudCanvas.style.height = `${siteHeight}px`;
        siteContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    let siteHudCompact = false;

    const seedSiteHud = () => {
        nodes.length = 0;
        beams.length = 0;
        siteHudCompact = siteWidth < 768;
        const nodeCount = siteHudCompact ? 20 : 64;

        for (let index = 0; index < nodeCount; index += 1) {
            nodes.push({
                x: Math.random() * siteWidth,
                y: Math.random() * siteHeight,
                vx: (Math.random() - 0.5) * 0.18,
                vy: (Math.random() - 0.5) * 0.18,
                size: Math.random() * 1.8 + 0.8,
                phase: Math.random() * Math.PI * 2
            });
        }

        for (let index = 0; index < 7; index += 1) {
            beams.push({
                x: Math.random() * siteWidth,
                width: Math.random() * 90 + 50,
                speed: Math.random() * 1.3 + 0.7,
                alpha: Math.random() * 0.08 + 0.04
            });
        }
    };

    const drawSiteHud = () => {
        const primary = siteColors.primary;
        const secondary = siteColors.secondary;
        siteContext.clearRect(0, 0, siteWidth, siteHeight);
        hudTick += 0.012;

        beams.forEach((beam) => {
            if (!prefersReducedMotion) {
                beam.x += beam.speed;
                if (beam.x > siteWidth + beam.width) {
                    beam.x = -beam.width;
                }
            }
            const gradient = siteContext.createLinearGradient(beam.x - beam.width, 0, beam.x + beam.width, 0);
            gradient.addColorStop(0, 'rgba(0, 229, 255, 0)');
            gradient.addColorStop(0.5, rgbaFromHex(primary, beam.alpha));
            gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
            siteContext.fillStyle = gradient;
            siteContext.fillRect(beam.x - beam.width, 0, beam.width * 2, siteHeight);
        });

        nodes.forEach((node, index) => {
            if (!prefersReducedMotion) {
                node.x += node.vx;
                node.y += node.vy;
                node.phase += 0.018;
            }

            if (node.x < -20) node.x = siteWidth + 20;
            if (node.x > siteWidth + 20) node.x = -20;
            if (node.y < -20) node.y = siteHeight + 20;
            if (node.y > siteHeight + 20) node.y = -20;

            const pulse = 0.4 + Math.sin(node.phase + hudTick) * 0.25;
            siteContext.beginPath();
            siteContext.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            siteContext.fillStyle = index % 4 === 0
                ? rgbaFromHex(secondary, 0.46 + pulse * 0.18)
                : rgbaFromHex(primary, 0.42 + pulse * 0.2);
            siteContext.fill();
        });

        if (!siteHudCompact) {
            for (let a = 0; a < nodes.length; a += 1) {
                for (let b = a + 1; b < nodes.length; b += 1) {
                    const first = nodes[a];
                    const second = nodes[b];
                    const distance = Math.hypot(first.x - second.x, first.y - second.y);
                    if (distance < 150) {
                        siteContext.beginPath();
                        siteContext.moveTo(first.x, first.y);
                        siteContext.lineTo(second.x, second.y);
                        siteContext.strokeStyle = rgbaFromHex(primary, 0.12 * (1 - distance / 150));
                        siteContext.lineWidth = 0.9;
                        siteContext.stroke();
                    }
                }
            }
        }

        if (!prefersReducedMotion && !document.hidden) {
            hudFrameId = requestAnimationFrame(drawSiteHud);
        } else {
            hudFrameId = null;
        }
    };

    const startSiteHud = () => {
        resizeSiteHud();
        seedSiteHud();
        refreshSiteColors();
        drawSiteHud();
    };

    window.addEventListener('resize', () => {
        resizeSiteHud();
        seedSiteHud();
    });

    const siteThemeObserver = new MutationObserver(refreshSiteColors);
    siteThemeObserver.observe(rootElement, { attributes: true, attributeFilter: ['data-theme'] });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !prefersReducedMotion && !hudFrameId) {
            drawSiteHud();
        }
    });

    startSiteHud();

    window.addEventListener('beforeunload', () => {
        if (hudFrameId) {
            cancelAnimationFrame(hudFrameId);
        }
    });
}

// Hero sci-fi starfield and constellation animation
const heroCanvas = document.getElementById('heroCanvas');

if (heroCanvas) {
    const heroContext = heroCanvas.getContext('2d', { alpha: true });
    const heroParticles = [];
    let heroCompact = window.innerWidth < 768;
    let particleCount = heroCompact ? 26 : 82;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let animationFrameId = null;
    let signalOffset = 0;

    const getHudColor = (name) => {
        const value = getComputedStyle(rootElement).getPropertyValue(name).trim();
        return value || '#00e5ff';
    };

    let heroColors = { primary: '#00e5ff', secondary: '#8b5cf6' };
    const refreshHeroColors = () => {
        heroColors = {
            primary: getHudColor('--primary-color'),
            secondary: getHudColor('--secondary-color')
        };
    };

    const colorWithAlpha = (hex, alpha) => {
        const normalized = hex.replace('#', '').trim();
        const fullHex = normalized.length === 3
            ? normalized.split('').map((char) => char + char).join('')
            : normalized;
        const red = parseInt(fullHex.slice(0, 2), 16);
        const green = parseInt(fullHex.slice(2, 4), 16);
        const blue = parseInt(fullHex.slice(4, 6), 16);

        if ([red, green, blue].some(Number.isNaN)) {
            return `rgba(0, 229, 255, ${alpha})`;
        }

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    };

    const resizeHeroCanvas = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const rect = heroCanvas.getBoundingClientRect();
        canvasWidth = Math.max(1, Math.floor(rect.width));
        canvasHeight = Math.max(1, Math.floor(rect.height));
        heroCanvas.width = Math.floor(canvasWidth * pixelRatio);
        heroCanvas.height = Math.floor(canvasHeight * pixelRatio);
        heroContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const seedParticles = () => {
        heroParticles.length = 0;
        heroCompact = canvasWidth < 768;
        particleCount = heroCompact ? 26 : 82;
        for (let index = 0; index < particleCount; index += 1) {
            heroParticles.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                radius: Math.random() * 1.6 + 0.45,
                speedX: (Math.random() - 0.5) * 0.28,
                speedY: (Math.random() - 0.5) * 0.22,
                pulse: Math.random() * Math.PI * 2
            });
        }
    };

    const drawHeroField = () => {
        const primaryColor = heroColors.primary;
        const secondaryColor = heroColors.secondary;
        heroContext.clearRect(0, 0, canvasWidth, canvasHeight);

        const gradient = heroContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, 'rgba(0, 229, 255, 0.16)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.14)');
        heroContext.fillStyle = gradient;
        heroContext.fillRect(0, 0, canvasWidth, canvasHeight);

        heroParticles.forEach((particle, index) => {
            if (!prefersReducedMotion) {
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                particle.pulse += 0.025;
            }

            if (particle.x < -20) particle.x = canvasWidth + 20;
            if (particle.x > canvasWidth + 20) particle.x = -20;
            if (particle.y < -20) particle.y = canvasHeight + 20;
            if (particle.y > canvasHeight + 20) particle.y = -20;

            const alpha = 0.45 + Math.sin(particle.pulse) * 0.25;
            heroContext.beginPath();
            heroContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            heroContext.fillStyle = index % 5 === 0
                ? colorWithAlpha(secondaryColor, 0.62)
                : colorWithAlpha(primaryColor, alpha);
            heroContext.fill();
        });

        if (!heroCompact) {
            for (let a = 0; a < heroParticles.length; a += 1) {
                for (let b = a + 1; b < heroParticles.length; b += 1) {
                    const first = heroParticles[a];
                    const second = heroParticles[b];
                    const distance = Math.hypot(first.x - second.x, first.y - second.y);
                    if (distance < 118) {
                        heroContext.beginPath();
                        heroContext.moveTo(first.x, first.y);
                        heroContext.lineTo(second.x, second.y);
                        heroContext.strokeStyle = `rgba(0, 229, 255, ${0.12 * (1 - distance / 118)})`;
                        heroContext.lineWidth = 0.8;
                        heroContext.stroke();
                    }
                }
            }
        }

        signalOffset = prefersReducedMotion ? canvasWidth * 0.65 : (signalOffset + 1.8) % (canvasWidth + 220);
        heroContext.fillStyle = 'rgba(0, 229, 255, 0.08)';
        heroContext.fillRect(signalOffset - 110, 0, 3, canvasHeight);
        heroContext.fillStyle = 'rgba(139, 92, 246, 0.05)';
        heroContext.fillRect(canvasWidth - signalOffset, 0, 2, canvasHeight);

        if (!prefersReducedMotion && !document.hidden) {
            animationFrameId = requestAnimationFrame(drawHeroField);
        } else {
            animationFrameId = null;
        }
    };

    const startHeroCanvas = () => {
        resizeHeroCanvas();
        seedParticles();
        refreshHeroColors();
        drawHeroField();
    };

    window.addEventListener('resize', () => {
        resizeHeroCanvas();
        seedParticles();
    });

    const themeObserver = new MutationObserver(() => {
        refreshHeroColors();
        if (prefersReducedMotion) {
            drawHeroField();
        }
    });
    themeObserver.observe(rootElement, { attributes: true, attributeFilter: ['data-theme'] });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !prefersReducedMotion && !animationFrameId) {
            drawHeroField();
        }
    });

    startHeroCanvas();

    window.addEventListener('beforeunload', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
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
const animatedElements = document.querySelectorAll('.skill-card, .service-card, .portfolio-item, .experience-card, .education-card, .cert-card, .experience-subcard, .review-card, .stat-card, .process-step, .contact-item, .contact-form-wrapper');

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = entry.target.classList.contains('hud-tilt')
                    ? 'perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateY(0)'
                    : 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.transitionDelay = `${Math.min(index % 6, 5) * 70}ms`;
        observer.observe(el);
    });
} else {
    animatedElements.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
}

// Count-up animation for portfolio CV stats
const statValues = document.querySelectorAll('.stat-value');

const animateStatValue = (element) => {
    const rawValue = element.dataset.en || element.textContent || '';
    const match = rawValue.match(/(\d+(?:\.\d+)?)/);

    if (!match) {
        return;
    }

    const target = Number(match[1]);
    const prefix = rawValue.slice(0, match.index);
    const suffix = rawValue.slice((match.index || 0) + match[1].length);
    const duration = 1200;
    const startTime = performance.now();

    const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        element.textContent = `${prefix}${value}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    };

    requestAnimationFrame(tick);
};

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = 'true';
                animateStatValue(entry.target);
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.45 });

    statValues.forEach((value) => statObserver.observe(value));
}

// Gentle HUD tilt on cards for pointer devices
const tiltTargets = document.querySelectorAll('.skill-card, .service-card, .portfolio-item, .experience-card, .review-card, .education-card, .cert-card, .stat-card, .process-step');

if (!prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
    tiltTargets.forEach((target) => {
        target.classList.add('hud-tilt');

        target.addEventListener('pointermove', (event) => {
            const rect = target.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            target.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
            target.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`);
        });

        target.addEventListener('pointerleave', () => {
            target.style.setProperty('--tilt-x', '0deg');
            target.style.setProperty('--tilt-y', '0deg');
        });
    });
}

// Contact Form Handling
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        formData.set('lang', document.documentElement.lang === 'ar' ? 'ar' : 'en');
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
