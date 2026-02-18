# Portfolio Website

A modern, responsive portfolio website inspired by professional designs. Built with HTML, CSS, and JavaScript.

## Features

- 🎨 Modern and clean design
- 📱 Fully responsive (mobile, tablet, desktop)
- ✨ Smooth scrolling and animations
- 🌙 Dark theme with gradient accents
- 💼 Multiple sections: Hero, About, Skills, Services, Portfolio, Reviews, Contact
- 📧 Contact form with validation
- 🎯 Intersection Observer for scroll animations
- 🔗 Social media integration
- ⚡ Fast and lightweight

## Sections

1. **Hero Section** - Introduction with call-to-action buttons
2. **About Section** - Personal information and background
3. **Skills Section** - Technical skills and expertise
4. **Services Section** - Services offered
5. **Portfolio Section** - Project showcase
6. **Reviews Section** - Client testimonials
7. **Contact Section** - Contact form and information
8. **Footer** - Quick links and social media

## Customization Guide

### 1. Personal Information

Edit `index.html` and update:
- Your name in the hero section
- Professional title
- About me text
- Contact information (email, phone, location)
- Social media links

### 2. Colors

Edit `style.css` to change the color scheme:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --dark-bg: #0f172a;
    --light-bg: #1e293b;
    --text-primary: #ffffff;
    --text-secondary: #cbd5e1;
    --accent: #f59e0b;
}
```

### 3. Skills

Update the skills section in `index.html` with your own:
- Change skill icons (use [Font Awesome](https://fontawesome.com/))
- Modify skill titles and descriptions
- Add or remove skill cards

### 4. Services

Customize services you offer:
- Edit service titles
- Update descriptions
- Change icons

### 5. Portfolio Projects

Add your own projects:
- Replace placeholder icons with project images
- Update project titles and descriptions
- Add links to live projects or GitHub repos

### 6. Client Reviews

Add testimonials from your clients:
- Replace reviewer names and companies
- Update review text
- Add star ratings

### 7. Images

Replace placeholder icons with actual images:
- Add your profile photo to `assets/images/`
- Add project screenshots
- Update image paths in HTML

## Installation

1. Download or clone this repository
2. Open `index.html` in your browser
3. Customize the content as needed

## File Structure

```
portfolio/
│
├── index.html          # Main HTML file
├── style.css           # Stylesheet
├── script.js           # JavaScript functionality
├── assets/             # Assets folder
│   └── images/         # Images folder
└── README.md           # This file
```

## Adding Your Own Images

1. Place images in the `assets/images/` folder
2. Update the HTML to reference your images:

```html
<!-- For profile photo -->
<div class="hero-image">
    <img src="assets/images/profile.jpg" alt="Your Name">
</div>

<!-- For portfolio items -->
<div class="portfolio-image">
    <img src="assets/images/project1.jpg" alt="Project 1">
</div>
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Technologies Used

- HTML5
- CSS3 (Flexbox, Grid, Animations)
- JavaScript (ES6+)
- Font Awesome Icons

## Tips for Deployment

### GitHub Pages
1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Select the main branch as source
4. Your site will be live at `username.github.io/repository-name`

### Netlify
1. Create a Netlify account
2. Drag and drop your project folder
3. Your site will be deployed instantly

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts

## Customization Tips

1. **Change Fonts**: Add Google Fonts or other font families in the CSS
2. **Add More Sections**: Create additional sections as needed
3. **Connect Contact Form**: Integrate with FormSpree, Netlify Forms, or your backend
4. **Add Blog**: Create a blog section with articles
5. **Add Certifications**: Show your certifications and achievements
6. **Add Timeline**: Add an experience/education timeline

## Contact Form Integration

To make the contact form functional, integrate with:

### FormSpree
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
    <!-- form fields -->
</form>
```

### Netlify Forms
```html
<form name="contact" netlify>
    <!-- form fields -->
</form>
```

### Email.js
Add Email.js library and configure:
```javascript
emailjs.send("service_id", "template_id", {
    from_name: name,
    from_email: email,
    message: message
});
```

## Performance Optimization

- Compress images before uploading
- Minify CSS and JavaScript for production
- Use lazy loading for images
- Enable browser caching
- Use a CDN for Font Awesome

## License

Free to use and modify for personal and commercial projects.

## Credits

- Icons: [Font Awesome](https://fontawesome.com/)
- Inspired by modern portfolio designs

## Support

For issues or questions, feel free to reach out!

---

**Made with ❤️ by You**
