/**
 * PWA Installation and Advanced Features
 * Handles service worker registration, install prompts, and premium interactions
 */

class PWAManager {
    constructor() {
        this.deferredPrompt = null
        this.isInstalled = false
        this.init()
    }

    async init() {
        await this.registerServiceWorker()
        this.setupInstallPrompt()
        this.createFloatingButtons()
        this.addScrollEffects()
        this.addParallaxEffects()
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js')
                console.log('✅ Service Worker registered:', registration.scope)

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 New service worker version available')
                    this.showUpdateNotification()
                })
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error)
            }
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault()
            this.deferredPrompt = e
            this.showInstallButton()
        })

        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA installed successfully')
            this.isInstalled = true
            this.hideInstallButton()
            this.showToast('App installed! You can now use Spiral Sounds offline.', 'success')
        })
    }

    async installPWA() {
        if (!this.deferredPrompt) return

        this.deferredPrompt.prompt()
        const { outcome } = await this.deferredPrompt.userChoice

        if (outcome === 'accepted') {
            console.log('✅ User accepted PWA install')
        } else {
            console.log('❌ User declined PWA install')
        }

        this.deferredPrompt = null
        this.hideInstallButton()
    }

    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn')
        if (installBtn) {
            installBtn.style.display = 'flex'
            installBtn.addEventListener('click', () => this.installPWA())
        }
    }

    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn')
        if (installBtn) {
            installBtn.style.display = 'none'
        }
    }

    createFloatingButtons() {
        // Back to Top Button
        const backToTopBtn = document.createElement('button')
        backToTopBtn.id = 'back-to-top'
        backToTopBtn.className = 'floating-btn back-to-top'
        backToTopBtn.innerHTML = '⬆️'
        backToTopBtn.setAttribute('aria-label', 'Back to top')
        backToTopBtn.addEventListener('click', this.smoothScrollToTop)
        document.body.appendChild(backToTopBtn)

        // PWA Install Button
        const installBtn = document.createElement('button')
        installBtn.id = 'pwa-install-btn'
        installBtn.className = 'floating-btn install-btn'
        installBtn.innerHTML = '<span>📱</span><span class="btn-text">Install App</span>'
        installBtn.setAttribute('aria-label', 'Install as app')
        installBtn.style.display = 'none'
        document.body.appendChild(installBtn)

        // Cart Quick Access
        const cartBtn = document.createElement('a')
        cartBtn.href = '/cart.html'
        cartBtn.className = 'floating-btn cart-quick-btn'
        cartBtn.innerHTML = '<span>🛒</span><span class="cart-count">0</span>'
        cartBtn.setAttribute('aria-label', 'View cart')
        document.body.appendChild(cartBtn)

        // Add scroll listeners
        window.addEventListener('scroll', this.handleScroll.bind(this))
    }

    handleScroll() {
        const backToTopBtn = document.getElementById('back-to-top')
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100

        // Show/hide back to top button
        if (window.scrollY > 500) {
            backToTopBtn.classList.add('visible')
        } else {
            backToTopBtn.classList.remove('visible')
        }

        // Update scroll progress
        this.updateScrollProgress(scrollPercent)
    }

    updateScrollProgress(percent) {
        let progressBar = document.getElementById('scroll-progress')
        if (!progressBar) {
            progressBar = document.createElement('div')
            progressBar.id = 'scroll-progress'
            progressBar.className = 'scroll-progress'
            document.body.appendChild(progressBar)
        }
        progressBar.style.width = `${Math.min(percent, 100)}%`
    }

    smoothScrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    addScrollEffects() {
        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in')
                }
            })
        }, observerOptions)

        // Observe product cards
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                document.querySelectorAll('.product-card').forEach((card) => {
                    observer.observe(card)
                })
            }, 100)
        })
    }

    addParallaxEffects() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset
            const parallaxElements = document.querySelectorAll('.parallax-bg')

            parallaxElements.forEach((element) => {
                const speed = element.dataset.speed || 0.5
                element.style.transform = `translateY(${scrolled * speed}px)`
            })
        })
    }

    showUpdateNotification() {
        const notification = document.createElement('div')
        notification.className = 'update-notification'
        notification.innerHTML = `
            <div class="update-content">
                <span class="update-icon">🚀</span>
                <span class="update-text">New version available!</span>
                <button class="update-btn" onclick="location.reload()">Update</button>
            </div>
        `
        document.body.appendChild(notification)

        setTimeout(() => {
            notification.classList.add('show')
        }, 100)

        setTimeout(() => {
            notification.classList.remove('show')
            setTimeout(() => notification.remove(), 300)
        }, 5000)
    }

    showToast(message, type = 'info') {
        // Reuse existing toast function from productUI.js if available
        if (window.showToast) {
            window.showToast(message, type)
        } else {
            console.log(`Toast (${type}): ${message}`)
        }
    }
}

// Initialize PWA Manager
document.addEventListener('DOMContentLoaded', () => {
    new PWAManager()
})

// Export for other modules
window.PWAManager = PWAManager