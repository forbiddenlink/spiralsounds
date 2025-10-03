/**
 * Performance Monitoring & Optimization
 * Tracks Core Web Vitals and provides performance insights
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {}
        this.observers = []
        this.init()
    }

    init() {
        this.trackCoreWebVitals()
        this.trackResourceTiming()
        this.trackUserInteractions()
        this.setupPerformanceObserver()
        this.optimizeImages()
        this.preloadCriticalResources()
    }

    trackCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            this.metrics.lcp = lastEntry.startTime
            this.reportMetric('lcp', lastEntry.startTime)
        }).observe({ entryTypes: ['largest-contentful-paint'] })

        // First Input Delay (FID)
        new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry) => {
                this.metrics.fid = entry.processingStart - entry.startTime
                this.reportMetric('fid', this.metrics.fid)
            })
        }).observe({ entryTypes: ['first-input'] })

        // Cumulative Layout Shift (CLS)
        let clsValue = 0
        new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry) => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value
                }
            })
            this.metrics.cls = clsValue
            this.reportMetric('cls', clsValue)
        }).observe({ entryTypes: ['layout-shift'] })

        // First Contentful Paint (FCP)
        new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                    this.metrics.fcp = entry.startTime
                    this.reportMetric('fcp', entry.startTime)
                }
            })
        }).observe({ entryTypes: ['paint'] })
    }

    trackResourceTiming() {
        // Track resource loading performance
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource')
            const totalLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
            
            this.metrics.pageLoadTime = totalLoadTime
            this.metrics.resourceCount = resources.length
            
            // Analyze slow resources
            const slowResources = resources.filter(resource => resource.duration > 1000)
            if (slowResources.length > 0) {
                console.warn('Slow resources detected:', slowResources)
                this.optimizeSlowResources(slowResources)
            }
        })
    }

    trackUserInteractions() {
        // Track user engagement metrics
        let interactionCount = 0
        let scrollDepth = 0
        let timeOnPage = 0

        // Track clicks, scrolls, and time
        document.addEventListener('click', () => {
            interactionCount++
            this.reportMetric('interactions', interactionCount)
        })

        window.addEventListener('scroll', () => {
            const newScrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
            if (newScrollDepth > scrollDepth) {
                scrollDepth = newScrollDepth
                this.reportMetric('scroll_depth', scrollDepth)
            }
        })

        // Track time on page
        setInterval(() => {
            timeOnPage += 1
            this.reportMetric('time_on_page', timeOnPage)
        }, 1000)
    }

    setupPerformanceObserver() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            const longTaskObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                entries.forEach((entry) => {
                    if (entry.duration > 50) {
                        console.warn('Long task detected:', entry.duration + 'ms')
                        this.reportMetric('long_tasks', entry.duration)
                    }
                })
            })
            
            try {
                longTaskObserver.observe({ entryTypes: ['longtask'] })
                this.observers.push(longTaskObserver)
            } catch (e) {
                console.log('Long task observer not supported')
            }
        }
    }

    optimizeImages() {
        // Lazy load images with intersection observer
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target
                    if (img.dataset.src) {
                        img.src = img.dataset.src
                        img.classList.add('loaded')
                        imageObserver.unobserve(img)
                    }
                }
            })
        }, {
            rootMargin: '50px'
        })

        // Observe all images with data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img)
        })
    }

    preloadCriticalResources() {
        // Preload critical CSS and fonts
        const criticalResources = [
            '/css/index.css',
            '/css/enhanced-theme.css',
            '/css/enhanced-components.css'
        ]

        criticalResources.forEach(resource => {
            const link = document.createElement('link')
            link.rel = 'preload'
            link.href = resource
            link.as = 'style'
            document.head.appendChild(link)
        })

        // Preload critical fonts
        const fontLink = document.createElement('link')
        fontLink.rel = 'preload'
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap'
        fontLink.as = 'style'
        document.head.appendChild(fontLink)
    }

    optimizeSlowResources(slowResources) {
        // Implement optimizations for slow resources
        slowResources.forEach(resource => {
            if (resource.name.includes('.js')) {
                // Add defer or async to slow JS
                console.log('Consider adding defer/async to:', resource.name)
            } else if (resource.name.includes('.css')) {
                // Preload critical CSS
                console.log('Consider preloading CSS:', resource.name)
            } else if (resource.name.includes('.png') || resource.name.includes('.jpg')) {
                // Optimize images
                console.log('Consider optimizing image:', resource.name)
            }
        })
    }

    reportMetric(name, value) {
        // Send metrics to analytics service
        if (window.gtag) {
            gtag('event', 'performance_metric', {
                metric_name: name,
                metric_value: value
            })
        }

        // Store locally for debugging
        this.metrics[name] = value
        
        // Log significant metrics
        if (name === 'lcp' && value > 2500) {
            console.warn('LCP is slow:', value + 'ms (should be < 2500ms)')
        }
        if (name === 'fid' && value > 100) {
            console.warn('FID is slow:', value + 'ms (should be < 100ms)')
        }
        if (name === 'cls' && value > 0.1) {
            console.warn('CLS is poor:', value + ' (should be < 0.1)')
        }
    }

    getPerformanceScore() {
        const scores = {
            lcp: this.metrics.lcp < 2500 ? 100 : Math.max(0, 100 - (this.metrics.lcp - 2500) / 25),
            fid: this.metrics.fid < 100 ? 100 : Math.max(0, 100 - (this.metrics.fid - 100) / 1),
            cls: this.metrics.cls < 0.1 ? 100 : Math.max(0, 100 - (this.metrics.cls - 0.1) * 1000)
        }
        
        return Math.round((scores.lcp + scores.fid + scores.cls) / 3)
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            score: this.getPerformanceScore(),
            recommendations: this.getRecommendations()
        }
        
        console.log('Performance Report:', report)
        return report
    }

    getRecommendations() {
        const recommendations = []
        
        if (this.metrics.lcp > 2500) {
            recommendations.push('Optimize Largest Contentful Paint - consider image optimization')
        }
        if (this.metrics.fid > 100) {
            recommendations.push('Reduce First Input Delay - minimize JavaScript execution time')
        }
        if (this.metrics.cls > 0.1) {
            recommendations.push('Improve Cumulative Layout Shift - reserve space for dynamic content')
        }
        if (this.metrics.pageLoadTime > 3000) {
            recommendations.push('Reduce page load time - optimize resources and enable compression')
        }
        
        return recommendations
    }

    cleanup() {
        this.observers.forEach(observer => observer.disconnect())
    }
}

// Initialize performance monitoring
document.addEventListener('DOMContentLoaded', () => {
    window.performanceMonitor = new PerformanceMonitor()
    
    // Generate report after 5 seconds
    setTimeout(() => {
        const report = window.performanceMonitor.generateReport()
        
        // Show performance score in console
        console.log(`🎯 Performance Score: ${report.score}/100`)
        
        if (report.score < 80) {
            console.warn('⚠️ Performance could be improved:', report.recommendations)
        } else {
            console.log('✅ Great performance!')
        }
    }, 5000)
})

// Export for other modules
export default PerformanceMonitor