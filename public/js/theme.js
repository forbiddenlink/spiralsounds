/**
 * Enhanced Theme Manager
 * Implements advanced dark/light mode switching with smooth transitions,
 * particle effects, and accessibility support
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getPreferredTheme();
        this.toggleButton = null;
        this.particleContainer = null;
        this.particles = [];
        this.isTransitioning = false;
        
        // Theme configurations
        this.themes = {
            dark: {
                name: 'dark',
                icon: '🌙',
                class: 'theme-dark'
            },
            light: {
                name: 'light', 
                icon: '☀️',
                class: 'theme-light'
            }
        };

        this.init();
    }

    getPreferredTheme() {
        // Check for user's system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    init() {
        this.setupThemeToggle();
        this.setupParticleBackground();
        this.applyTheme(this.currentTheme);
        this.setupSystemThemeListener();
        this.setupKeyboardShortcuts();
    }

    setupThemeToggle() {
        this.toggleButton = document.getElementById('theme-toggle');
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleTheme());
            this.toggleButton.setAttribute('aria-label', 'Toggle theme');
            this.toggleButton.setAttribute('title', 'Switch between dark and light themes');
        }
    }

    setupParticleBackground() {
        // Create particle container
        this.particleContainer = document.createElement('div');
        this.particleContainer.className = 'particle-bg';
        document.body.appendChild(this.particleContainer);

        // Create particles
        this.createParticles();
    }

    createParticles() {
        const particleCount = window.innerWidth < 768 ? 15 : 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random positioning and timing
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            
            this.particleContainer.appendChild(particle);
            this.particles.push(particle);
        }
    }

    setupSystemThemeListener() {
        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            mediaQuery.addEventListener('change', (e) => {
                if (!this.getStoredTheme()) {
                    // Only auto-switch if user hasn't manually set a preference
                    this.applyTheme(e.matches ? 'light' : 'dark');
                }
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + T to toggle theme
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }
        this.updateToggleButton();

        // Listen for system theme preference changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (!this.getStoredTheme()) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme(this.currentTheme);
                    this.updateToggleButton();
                }
            });
        }
    }

    async toggleTheme() {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        
        // Add transition animation class
        document.body.classList.add('theme-switching');
        
        // Add switching class to toggle button
        if (this.toggleButton) {
            this.toggleButton.classList.add('switching');
        }

        // Wait for animation to start
        await this.delay(100);
        
        // Apply new theme
        this.currentTheme = newTheme;
        this.applyTheme(this.currentTheme);
        this.updateToggleButton();
        this.storeTheme(this.currentTheme);
        
        // Update particles for new theme
        this.updateParticles();

        // Wait for transition to complete
        await this.delay(400);
        
        // Remove animation classes
        document.body.classList.remove('theme-switching');
        if (this.toggleButton) {
            this.toggleButton.classList.remove('switching');
        }
        
        this.isTransitioning = false;

        // Trigger WebSocket event if available
        if (window.websocketManager) {
            window.websocketManager.trackEvent('theme_changed', { 
                theme: this.currentTheme 
            });
        }
    }

    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        // Set data attribute for CSS targeting
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Update body class for backwards compatibility
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(themeName);

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: themeName } 
        }));
    }

    updateMetaThemeColor(themeName) {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            const color = themeName === 'dark' ? '#0F172A' : '#F8FAFC';
            themeColorMeta.setAttribute('content', color);
        }
    }

    updateToggleButton() {
        if (this.toggleButton) {
            const theme = this.themes[this.currentTheme];
            
            // Update button content
            this.toggleButton.innerHTML = `
                <span class="theme-icon">${theme.icon}</span>
            `;
            
            // Update accessibility attributes
            this.toggleButton.setAttribute('aria-label', 
                `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`);
        }
    }

    updateParticles() {
        // Update particle colors based on current theme
        this.particles.forEach(particle => {
            const randomType = Math.floor(Math.random() * 3);
            const colors = this.currentTheme === 'dark' 
                ? ['#06B6D4', '#8B5CF6', '#F59E0B']
                : ['#0891B2', '#7C3AED', '#D97706'];
            
            particle.style.backgroundColor = colors[randomType];
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

            this.toggleButton.textContent = this.themes[nextTheme].icon;
            this.toggleButton.setAttribute('aria-label',
                `Switch to ${nextTheme} theme (currently ${this.currentTheme})`);
        }
    }

    animateToggle() {
        if (this.toggleButton) {
            this.toggleButton.style.transform = 'scale(0.8) rotate(180deg)';
            setTimeout(() => {
                this.toggleButton.style.transform = 'scale(1) rotate(0deg)';
            }, 150);
        }
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('spiral-sounds-theme');
        } catch (e) {
            return null;
        }
    }

    storeTheme(theme) {
        try {
            localStorage.setItem('spiral-sounds-theme', theme);
        } catch (e) {
            console.warn('Could not save theme preference');
        }
    }

    // Public method to get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Public method to set theme programmatically
    setTheme(themeName) {
        if (this.themes[themeName]) {
            this.currentTheme = themeName;
            this.applyTheme(this.currentTheme);
            this.updateToggleButton();
            this.storeTheme(this.currentTheme);
        }
    }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Export for module usage
export default ThemeManager;