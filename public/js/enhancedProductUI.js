// Enhanced Product UI with Modern Animations and Interactions
class EnhancedProductUI {
    constructor() {
        this.products = [];
        this.isLoading = false;
        this.observer = null;
        this.loadedImages = new Set();
        this.animationQueue = [];
        
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupImageLazyLoading();
        this.enhanceExistingProducts();
        this.bindGlobalEvents();
    }

    setupIntersectionObserver() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateProductCard(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '50px'
            }
        );
    }

    setupImageLazyLoading() {
        this.imageObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.imageObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );
    }

    enhanceExistingProducts() {
        const existingCards = document.querySelectorAll('.product-card');
        existingCards.forEach((card, index) => {
            this.enhanceProductCard(card, index);
        });
    }

    enhanceProductCard(card, index) {
        // Add enhanced classes and attributes
        card.classList.add('enhanced-card');
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        
        // Add staggered animation delay
        card.style.setProperty('--animation-delay', `${index * 0.1}s`);
        
        // Observe for intersection
        this.observer.observe(card);
        
        // Setup image lazy loading
        const img = card.querySelector('img');
        if (img) {
            this.setupLazyImage(img);
        }
        
        // Add enhanced interactions
        this.addCardInteractions(card);
        
        // Add keyboard navigation
        this.addKeyboardSupport(card);
    }

    setupLazyImage(img) {
        // Store original src
        const originalSrc = img.src;
        
        // Create placeholder
        img.src = this.createPlaceholder(img.width, img.height);
        img.setAttribute('data-src', originalSrc);
        img.classList.add('lazy-image');
        
        // Observe for lazy loading
        this.imageObserver.observe(img);
    }

    createPlaceholder(width = 300, height = 300) {
        // Create SVG placeholder
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#334155;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grad)"/>
                <circle cx="50%" cy="45%" r="20" fill="#06b6d4" opacity="0.3"/>
                <text x="50%" y="60%" text-anchor="middle" fill="#94a3b8" font-family="Arial" font-size="14">Loading...</text>
            </svg>
        `;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    async loadImage(img) {
        const src = img.getAttribute('data-src');
        if (!src || this.loadedImages.has(src)) return;

        try {
            // Create a new image to preload
            const newImg = new Image();
            
            // Add loading class
            img.classList.add('loading');
            
            // Load image
            await new Promise((resolve, reject) => {
                newImg.onload = resolve;
                newImg.onerror = reject;
                newImg.src = src;
            });
            
            // Update image with fade transition
            img.style.opacity = '0';
            
            setTimeout(() => {
                img.src = src;
                img.style.opacity = '1';
                img.classList.remove('loading', 'lazy-image');
                img.classList.add('loaded');
                this.loadedImages.add(src);
            }, 100);
            
        } catch (error) {
            console.warn('Failed to load image:', src);
            img.classList.remove('loading');
            img.classList.add('error');
        }
    }

    addCardInteractions(card) {
        const productId = card.getAttribute('data-product-id');
        
        // Add hover effects
        card.addEventListener('mouseenter', (e) => {
            this.onCardHover(e.target, true);
        });
        
        card.addEventListener('mouseleave', (e) => {
            this.onCardHover(e.target, false);
        });
        
        // Add click handler for card navigation
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons
            if (e.target.tagName === 'BUTTON') return;
            
            this.onCardClick(productId, e);
        });
        
        // Add quick view functionality
        this.addQuickViewButton(card, productId);
    }

    addQuickViewButton(card, productId) {
        const imageContainer = card.querySelector('.product-image');
        if (!imageContainer) return;
        
        // Create image overlay and quick view button
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        
        const quickViewBtn = document.createElement('button');
        quickViewBtn.className = 'quick-view-btn btn btn-glass';
        quickViewBtn.textContent = 'Quick View';
        quickViewBtn.setAttribute('aria-label', 'Quick view product details');
        
        overlay.appendChild(quickViewBtn);
        imageContainer.appendChild(overlay);
        
        // Add quick view handler
        quickViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openQuickView(productId);
        });
    }

    addKeyboardSupport(card) {
        card.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    card.click();
                    break;
                case 'Escape':
                    card.blur();
                    break;
            }
        });
        
        card.addEventListener('focus', (e) => {
            e.target.classList.add('keyboard-focused');
        });
        
        card.addEventListener('blur', (e) => {
            e.target.classList.remove('keyboard-focused');
        });
    }

    animateProductCard(card) {
        card.classList.add('animate-in');
        
        // Add bounce effect
        setTimeout(() => {
            card.classList.add('visible');
        }, 50);
    }

    onCardHover(card, isHovering) {
        const img = card.querySelector('img');
        const addToCartBtn = card.querySelector('.add-to-cart-btn');
        
        if (isHovering) {
            // Add magnetic effect
            card.classList.add('magnetic');
            
            // Scale image slightly
            if (img) {
                img.style.transform = 'scale(1.05) rotate(1deg)';
            }
            
            // Animate button
            if (addToCartBtn) {
                addToCartBtn.classList.add('pulse');
            }
            
        } else {
            card.classList.remove('magnetic');
            
            if (img) {
                img.style.transform = '';
            }
            
            if (addToCartBtn) {
                addToCartBtn.classList.remove('pulse');
            }
        }
    }

    onCardClick(productId, event) {
        // Add click ripple effect
        this.createRippleEffect(event.currentTarget, event);
        
        // Track interaction
        if (window.websocketManager) {
            window.websocketManager.trackEvent('product_view', { 
                productId: productId,
                source: 'product_grid'
            });
        }
        
        // Navigate to product detail (if implemented)
        console.log('Product clicked:', productId);
    }

    createRippleEffect(element, event) {
        const ripple = document.createElement('div');
        const rect = element.getBoundingClientRect();
        const size = 100;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
        ripple.className = 'ripple-effect';
        
        element.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    openQuickView(productId) {
        // Create and show quick view modal
        this.showQuickViewModal(productId);
        
        // Track quick view
        if (window.websocketManager) {
            window.websocketManager.trackEvent('quick_view', { 
                productId: productId 
            });
        }
    }

    showQuickViewModal(productId) {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
            <div class="modal-content quick-view-modal">
                <button class="modal-close" aria-label="Close modal">×</button>
                <div class="modal-body">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading product details...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        
        // Add show class for animation
        setTimeout(() => backdrop.classList.add('show'), 10);
        
        // Close handlers
        const closeBtn = backdrop.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal(backdrop));
        
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.closeModal(backdrop);
            }
        });
        
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(backdrop);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Load product details
        this.loadQuickViewContent(backdrop, productId);
    }

    async loadQuickViewContent(modal, productId) {
        try {
            // Simulate API call (replace with actual product API)
            const response = await fetch(`/api/products/${productId}`);
            const product = await response.json();
            
            const modalBody = modal.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="quick-view-content">
                    <div class="product-image-large">
                        <img src="/images/${product.image}" alt="${product.title}" loading="lazy">
                    </div>
                    <div class="product-details">
                        <h3>${product.title}</h3>
                        <p class="artist">${product.artist}</p>
                        <p class="genre">${product.genre}</p>
                        <p class="price">$${product.price}</p>
                        <button class="btn btn-primary add-to-cart-quick" data-product-id="${product.id}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
            
            // Bind add to cart
            const addBtn = modalBody.querySelector('.add-to-cart-quick');
            addBtn.addEventListener('click', () => {
                this.addToCartFromModal(product.id);
            });
            
        } catch (error) {
            console.error('Failed to load product details:', error);
            modal.querySelector('.modal-body').innerHTML = `
                <div class="error-message">
                    <p>Failed to load product details</p>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Close</button>
                </div>
            `;
        }
    }

    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    async addToCartFromModal(productId) {
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: parseInt(productId) })
            });
            
            if (response.ok) {
                this.showSuccessMessage('Added to cart!');
                
                // Update cart count if available
                if (window.updateCartCount) {
                    window.updateCartCount();
                }
                
                // Track via WebSocket
                if (window.websocketManager) {
                    window.websocketManager.trackEvent('cart_add', { 
                        productId: productId,
                        source: 'quick_view'
                    });
                }
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            this.showErrorMessage('Failed to add to cart');
        }
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Show animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    bindGlobalEvents() {
        // Listen for theme changes
        window.addEventListener('themeChanged', () => {
            this.updateImagePlaceholders();
        });
        
        // Listen for window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    updateImagePlaceholders() {
        // Update placeholder colors based on theme
        const lazyImages = document.querySelectorAll('.lazy-image');
        lazyImages.forEach(img => {
            if (!img.classList.contains('loading')) {
                img.src = this.createPlaceholder(img.width, img.height);
            }
        });
    }

    handleResize() {
        // Recalculate animations if needed
        this.animationQueue.forEach(animation => {
            if (animation.update) {
                animation.update();
            }
        });
    }

    // Public API methods
    refreshProducts() {
        this.enhanceExistingProducts();
    }

    addProduct(productElement) {
        this.enhanceProductCard(productElement, 0);
    }
}

// Initialize when DOM is ready
let enhancedProductUI;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        enhancedProductUI = new EnhancedProductUI();
    });
} else {
    enhancedProductUI = new EnhancedProductUI();
}

// Export for global access
window.enhancedProductUI = enhancedProductUI;