// Edit this file, not script.min.js — regenerate with: npx terser script.js -o script.min.js --compress --mangle --format comments=false
// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const rootElement = document.documentElement;

const updateThemeToggle = (theme) => {
    if (!themeToggle) {
        return;
    }

    const isArabic = rootElement.lang === 'ar';
    const switchToLight = theme === 'dark';
    themeToggle.innerHTML = switchToLight
        ? '<i class="fas fa-sun" aria-hidden="true"></i>'
        : '<i class="fas fa-moon" aria-hidden="true"></i>';
    themeToggle.setAttribute('aria-label', isArabic
        ? (switchToLight ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن')
        : (switchToLight ? 'Switch to light theme' : 'Switch to dark theme'));
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
};

const setTheme = (theme) => {
    rootElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeToggle(theme);
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

// Language is rendered at build time. The switch is a crawlable link.
const langToggle = document.getElementById('langToggle');
const legacyLanguage = new URLSearchParams(location.search).get('lang');
if ((legacyLanguage === 'ar' && rootElement.lang !== 'ar') || (legacyLanguage === 'en' && rootElement.lang !== 'en')) {
    const destination = document.querySelector('link[hreflang="' + legacyLanguage + '"]');
    if (destination) location.replace(new URL(destination.href).pathname + location.hash);
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

// Full-page sci-fi circuitry field behind content.
const siteHudCanvas = document.getElementById('siteHudCanvas');

if (siteHudCanvas && !prefersReducedMotion && window.matchMedia('(min-width: 1100px) and (pointer: fine)').matches) {
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

if (heroCanvas && !prefersReducedMotion && window.matchMedia('(min-width: 1100px) and (pointer: fine)').matches) {
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
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formStatus = document.getElementById('contactFormStatus');

    const setFormStatus = (message, state = '') => {
        if (!formStatus) {
            return;
        }

        formStatus.textContent = message;
        formStatus.dataset.state = state;
    };

    // Signed, short-lived form token (and optional Turnstile CAPTCHA) from the server.
    let formToken = '';
    let puzzle = null;
    let solution = null;
    // Invisible proof-of-work: find n where SHA-256(salt + n) matches the challenge.
    const solvePuzzle = async ({salt, challenge, max}) => {
        const encoder = new TextEncoder();
        const target = challenge.match(/../g).map(h => parseInt(h, 16));
        for (let start = 0; start <= max; start += 500) {
            const batch = [];
            for (let n = start; n < Math.min(start + 500, max + 1); n++) {
                batch.push(crypto.subtle.digest('SHA-256', encoder.encode(salt + n)).then(buffer => {
                    const bytes = new Uint8Array(buffer);
                    return bytes.every((b, i) => b === target[i]) ? n : -1;
                }));
            }
            const found = (await Promise.all(batch)).find(n => n >= 0);
            if (found !== undefined) return String(found);
        }
        return '';
    };
    const startSolving = () => {
        if (puzzle && !solution) solution = solvePuzzle(puzzle);
    };
    const loadFormToken = async () => {
        try {
            const response = await fetch(contactForm.getAttribute('action') + '?token=1', {headers: {Accept: 'application/json'}, cache: 'no-store'});
            const data = await response.json();
            formToken = data.token || '';
            const [, salt, challenge] = formToken.split('.');
            puzzle = salt && challenge ? {salt, challenge, max: Number(data.max) || 0} : null;
            solution = null;
            if (contactForm.dataset.touched) startSolving();
            if (data.turnstile && !contactForm.querySelector('.cf-turnstile')) {
                const widget = document.createElement('div');
                widget.className = 'cf-turnstile';
                widget.dataset.sitekey = data.turnstile;
                widget.dataset.language = document.documentElement.lang;
                submitButton?.before(widget);
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
                script.async = true;
                document.head.appendChild(script);
            }
        } catch (error) {
            formToken = '';
        }
    };
    // Code field shown only when the server asks for email verification (unusual load).
    const showCodeField = (isArabic) => {
        if (contactForm.querySelector('.otp-group')) return;
        const group = document.createElement('div');
        group.className = 'form-group otp-group';
        group.innerHTML = '<label for="contactOtp"></label><input id="contactOtp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>';
        group.querySelector('label').textContent = isArabic ? 'رمز التحقق (6 أرقام)' : 'Verification code (6 digits)';
        (contactForm.querySelector('.cf-turnstile') || submitButton)?.before(group);
        group.querySelector('input').focus();
    };
    loadFormToken();
    // Start the puzzle while the visitor types, so pressing Send stays instant.
    contactForm.addEventListener('focusin', () => {
        contactForm.dataset.touched = '1';
        startSolving();
    });

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isArabic = document.documentElement.lang === 'ar';
        if (!formToken) await loadFormToken();
        const formData = new FormData(contactForm);
        formData.set('lang', isArabic ? 'ar' : 'en');
        formData.set('token', formToken);
        startSolving();
        formData.set('pow', solution ? await solution : '');
        const action = contactForm.getAttribute('action');

        if (!action) {
            setFormStatus(isArabic ? 'نموذج التواصل غير مهيأ حالياً.' : 'The contact form is not configured right now.', 'error');
            return;
        }

        submitButton?.setAttribute('disabled', '');
        submitButton?.setAttribute('aria-busy', 'true');
        setFormStatus(isArabic ? 'جار إرسال رسالتك...' : 'Sending your message...', 'pending');

        try {
            const response = await fetch(action, {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json'
                }
            });

            const result = await response.json();
            const say = (en, ar) => setFormStatus(isArabic ? ar : en, 'error');
            if (response.ok && result.ok === true) {
                setFormStatus(isArabic ? 'شكراً لرسالتك! سأتواصل معك قريباً.' : 'Thank you for your message! I will get back to you soon.', 'success');
                contactForm.reset();
                contactForm.querySelector('.otp-group')?.remove();
                window.dispatchEvent(new CustomEvent('portfolio:conversion', {detail: {name: 'contact_success'}}));
            } else if (result.error === 'verify_email') {
                showCodeField(isArabic);
                setFormStatus(isArabic ? 'أرسلنا رمزاً من 6 أرقام إلى بريدك الإلكتروني. أدخله أدناه ثم اضغط إرسال مرة أخرى.' : 'We emailed you a 6-digit code. Enter it below and press Send again.', 'pending');
            } else if (result.error === 'otp_invalid') {
                say('That code is not correct or has expired. Check your email and try again.', 'الرمز غير صحيح أو منتهي الصلاحية. تحقق من بريدك وحاول مرة أخرى.');
            } else if (result.error === 'email_domain') {
                say('Please use an email address you can receive mail at.', 'يرجى استخدام بريد إلكتروني حقيقي يمكنك استلام الرسائل عليه.');
            } else if (['too_fast', 'token_invalid', 'pow_failed'].includes(result.error)) {
                // Sent within seconds of loading, or the puzzle expired: one more click.
                say('Please wait a moment and press Send again.', 'يرجى الانتظار لحظات ثم إعادة الإرسال.');
            } else {
                say(response.status === 429 ? 'Please wait a few minutes before sending another message.' : 'Your message could not be sent. Please use the email or WhatsApp link above.',
                    response.status === 429 ? 'يرجى الانتظار بضع دقائق قبل إرسال رسالة أخرى.' : 'تعذّر إرسال رسالتك. يرجى استخدام البريد الإلكتروني أو واتساب أعلاه.');
            }
            // Each puzzle is single-use on the server; prepare a fresh one (except when only too fast).
            if (result.error !== 'too_fast') loadFormToken();
            window.turnstile?.reset?.();
        } catch (error) {
            setFormStatus(isArabic ? 'تعذّر إرسال الرسالة حالياً. حاول مرة أخرى لاحقاً.' : 'Unable to send the message right now. Please try again later.', 'error');
        } finally {
            submitButton?.removeAttribute('disabled');
            submitButton?.removeAttribute('aria-busy');
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

// Optional analytics adapter. No form values, contact details or free text are sent.
const trackPortfolioEvent = (name) => {
    if (navigator.doNotTrack === '1') return;
    if (typeof window.plausible === 'function') window.plausible(name);
    if (typeof window.gtag === 'function') window.gtag('event', name, {language: rootElement.lang});
};
document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.href.endsWith('.pdf')) trackPortfolioEvent('cv_download');
    else if (link.href.includes('wa.me/')) trackPortfolioEvent('whatsapp_click');
    else if (link.pathname.includes('/projects/')) trackPortfolioEvent('case_study_open');
});
window.addEventListener('portfolio:conversion', (event) => {
    if (event.detail?.name === 'contact_success') trackPortfolioEvent('contact_success');
});
