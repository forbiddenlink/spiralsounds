// Enhanced Floating Action Button with Multi-Actions
class FloatingActionButton {
    constructor() {
        this.isOpen = false;
        this.fab = null;
        this.actions = [
            {
                icon: '🛒',
                label: 'View Cart',
                action: () => window.location.href = '/cart.html',
                color: '#06B6D4'
            },
            {
                icon: '🔍',
                label: 'Search',
                action: () => this.focusSearch(),
                color: '#8B5CF6'
            },
            {
                icon: '📊',
                label: 'Dashboard',
                action: () => window.location.href = '/admin.html',
                color: '#F59E0B',
                adminOnly: true
            },
            {
                icon: '🌙',
                label: 'Toggle Theme',
                action: () => this.toggleTheme(),
                color: '#10B981'
            }
        ];
        
        this.init();
    }

    init() {
        this.createFAB();
        this.bindEvents();
        this.checkAdminAccess();
    }

    createFAB() {
        const fabContainer = document.createElement('div');
        fabContainer.className = 'fab-container';
        fabContainer.innerHTML = `
            <div class="fab-backdrop"></div>
            <div class="fab-actions">
                ${this.actions.map((action, index) => `
                    <div class="fab-action ${action.adminOnly ? 'admin-only hidden' : ''}" 
                         data-index="${index}" 
                         style="--action-color: ${action.color}">
                        <button class="fab-action-btn" title="${action.label}">
                            ${action.icon}
                        </button>
                        <span class="fab-label">${action.label}</span>
                    </div>
                `).join('')}
            </div>
            <button class="fab-main" aria-label="Open actions menu">
                <span class="fab-icon">⚡</span>
            </button>
        `;
        
        document.body.appendChild(fabContainer);
        this.fab = fabContainer;
    }

    bindEvents() {
        const mainButton = this.fab.querySelector('.fab-main');
        const backdrop = this.fab.querySelector('.fab-backdrop');
        const actionButtons = this.fab.querySelectorAll('.fab-action-btn');
        
        // Main button toggle
        mainButton.addEventListener('click', () => this.toggle());
        
        // Backdrop close
        backdrop.addEventListener('click', () => this.close());
        
        // Action buttons
        actionButtons.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.executeAction(index);
            });
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Close on scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (this.isOpen) {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.close();
                }, 150);
            }
        });
    }

    async checkAdminAccess() {
        try {
            const response = await fetch('/api/me');
            const data = await response.json();
            
            if (data.user && data.user.is_admin) {
                const adminActions = this.fab.querySelectorAll('.admin-only');
                adminActions.forEach(action => action.classList.remove('hidden'));
            }
        } catch (error) {
            // User not logged in or not admin
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.fab.classList.add('open');
        
        // Stagger animation for action buttons
        const actions = this.fab.querySelectorAll('.fab-action:not(.hidden)');
        actions.forEach((action, index) => {
            setTimeout(() => {
                action.classList.add('visible');
            }, index * 50);
        });
        
        // Animate main button
        const mainButton = this.fab.querySelector('.fab-main');
        mainButton.style.transform = 'rotate(45deg)';
    }

    close() {
        this.isOpen = false;
        this.fab.classList.remove('open');
        
        // Remove visible class from actions
        const actions = this.fab.querySelectorAll('.fab-action');
        actions.forEach(action => {
            action.classList.remove('visible');
        });
        
        // Reset main button
        const mainButton = this.fab.querySelector('.fab-main');
        mainButton.style.transform = 'rotate(0deg)';
    }

    executeAction(index) {
        const action = this.actions[index];
        if (action && action.action) {
            action.action();
            this.close();
            
            // Track action
            if (window.websocketManager) {
                window.websocketManager.trackEvent('fab_action', {
                    action: action.label
                });
            }
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('advanced-search') || 
                          document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    toggleTheme() {
        if (window.themeManager) {
            window.themeManager.toggleTheme();
        } else {
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.click();
            }
        }
    }
}

// Initialize FAB when DOM is ready
let fab;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        fab = new FloatingActionButton();
    });
} else {
    fab = new FloatingActionButton();
}

window.floatingActionButton = fab;