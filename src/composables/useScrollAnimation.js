/**
 * Scroll Animation Composable
 * Implements scroll-reveal effects for product detail page
 */
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Create scroll animation observer
 * @param {Object} options - Animation options
 * @returns {Object} - Animation control methods
 */
export function useScrollAnimation(options = {}) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -50px 0px',
    once = true
  } = options
  
  const observer = ref(null)
  const animatedElements = ref(new Set())
  
  /**
   * Initialize the Intersection Observer
   */
  function initObserver() {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return
    }
    
    observer.value = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target
          
          // Add animated class
          element.classList.add('is-visible')
          
          // Track animated elements
          animatedElements.value.add(element)
          
          // Unobserve if once is true
          if (once) {
            observer.value?.unobserve(element)
          }
        } else if (!once) {
          entry.target.classList.remove('is-visible')
        }
      })
    }, {
      threshold,
      rootMargin
    })
  }
  
  /**
   * Observe an element for scroll animation
   * @param {HTMLElement} element - Element to observe
   */
  function observe(element) {
    if (!element || !observer.value) return
    observer.value.observe(element)
  }
  
  /**
   * Stop observing an element
   * @param {HTMLElement} element - Element to unobserve
   */
  function unobserve(element) {
    if (!element || !observer.value) return
    observer.value.unobserve(element)
  }
  
  /**
   * Disconnect the observer
   */
  function disconnect() {
    observer.value?.disconnect()
    animatedElements.value.clear()
  }
  
  // Lifecycle
  onMounted(() => {
    initObserver()
  })
  
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    observe,
    unobserve,
    disconnect,
    animatedElements
  }
}

/**
 * Vue directive for scroll animation
 * Usage: v-scroll-animate="{ type: 'scale-in', delay: 100 }"
 */
export const vScrollAnimate = {
  mounted(el, binding) {
    const options = binding.value || {}
    const { type = 'fade-up', delay = 0, duration = 600 } = options
    
    // Set initial styles
    el.style.opacity = '0'
    el.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
    el.style.transitionDelay = `${delay}ms`
    
    // Set initial transform based on type
    switch (type) {
      case 'scale-in':
        el.style.transform = 'scale(0.8)'
        break
      case 'fade-up':
        el.style.transform = 'translateY(30px)'
        break
      case 'fade-left':
        el.style.transform = 'translateX(-30px)'
        break
      case 'fade-right':
        el.style.transform = 'translateX(30px)'
        break
      default:
        el.style.transform = 'translateY(20px)'
    }
    
    // Create observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'scale(1) translateX(0) translateY(0)'
          observer.unobserve(el)
        }
      })
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    })
    
    observer.observe(el)
    
    // Store observer for cleanup
    el._scrollAnimateObserver = observer
  },
  
  unmounted(el) {
    if (el._scrollAnimateObserver) {
      el._scrollAnimateObserver.disconnect()
      delete el._scrollAnimateObserver
    }
  }
}

