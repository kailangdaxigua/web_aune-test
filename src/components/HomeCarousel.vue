<script setup>
/**
 * Home Carousel Component
 * Full-screen hero carousel with autoplay, navigation, and overlay text
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()

// State
const currentIndex = ref(0)
const isPaused = ref(false)
const isMobile = ref(false)

// Computed
const carouselItems = computed(() => siteStore.carouselItems)
const hasItems = computed(() => carouselItems.value.length > 0)
const currentItem = computed(() => carouselItems.value[currentIndex.value] || null)

// Autoplay interval
let autoplayInterval = null
const AUTOPLAY_DELAY = 5000

/**
 * Start autoplay
 */
function startAutoplay() {
  if (carouselItems.value.length <= 1) return
  
  stopAutoplay()
  autoplayInterval = setInterval(() => {
    if (!isPaused.value) {
      nextSlide()
    }
  }, AUTOPLAY_DELAY)
}

/**
 * Stop autoplay
 */
function stopAutoplay() {
  if (autoplayInterval) {
    clearInterval(autoplayInterval)
    autoplayInterval = null
  }
}

/**
 * Go to next slide
 */
function nextSlide() {
  currentIndex.value = (currentIndex.value + 1) % carouselItems.value.length
}

/**
 * Go to previous slide
 */
function prevSlide() {
  currentIndex.value = currentIndex.value === 0 
    ? carouselItems.value.length - 1 
    : currentIndex.value - 1
}

/**
 * Go to specific slide
 */
function goToSlide(index) {
  currentIndex.value = index
}

/**
 * Pause autoplay on hover
 */
function pauseAutoplay() {
  isPaused.value = true
}

/**
 * Resume autoplay
 */
function resumeAutoplay() {
  isPaused.value = false
}

/**
 * Get overlay position class
 */
function getOverlayPositionClass(position) {
  switch (position) {
    case 'left':
      return 'items-start text-left'
    case 'right':
      return 'items-end text-right'
    default:
      return 'items-center text-center'
  }
}

/**
 * Handle resize for mobile detection
 */
function handleResize() {
  isMobile.value = window.innerWidth < 768
}

// Lifecycle
onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  startAutoplay()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  stopAutoplay()
})

// Watch for items change
watch(carouselItems, () => {
  currentIndex.value = 0
  startAutoplay()
})
</script>

<template>
  <section 
    class="relative h-screen overflow-hidden"
    @mouseenter="pauseAutoplay"
    @mouseleave="resumeAutoplay"
  >
    <!-- Slides -->
    <div class="relative h-full">
      <TransitionGroup
        enter-active-class="transition-opacity duration-1000"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-1000 absolute inset-0"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="(item, index) in carouselItems"
          :key="item.id"
          v-show="currentIndex === index"
          class="absolute inset-0"
        >
          <!-- Background Image -->
          <img
            :src="isMobile && item.mobile_image_url ? item.mobile_image_url : item.image_url"
            :alt="item.title || `轮播图 ${index + 1}`"
            class="w-full h-full object-cover"
          />
          
          <!-- Gradient Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-aune-950 via-aune-950/30 to-transparent"></div>
          
          <!-- Text Overlay -->
          <div 
            v-if="item.overlay_title || item.overlay_subtitle"
            :class="[
              'absolute bottom-1/4 left-0 right-0 px-4 sm:px-6 lg:px-8',
              'flex flex-col',
              getOverlayPositionClass(item.overlay_position)
            ]"
          >
            <div class="max-w-7xl w-full mx-auto">
              <h2 
                v-if="item.overlay_title"
                class="text-4xl md:text-6xl font-display font-bold text-white mb-4 animate-fade-in-up"
              >
                {{ item.overlay_title }}
              </h2>
              <p 
                v-if="item.overlay_subtitle"
                class="text-xl text-aune-300 max-w-2xl animate-fade-in-up animation-delay-200"
              >
                {{ item.overlay_subtitle }}
              </p>
            </div>
          </div>
          
          <!-- Clickable Link -->
          <a
            v-if="item.link_url"
            :href="item.link_url"
            :target="item.link_target || '_self'"
            class="absolute inset-0 z-10"
          />
        </div>
      </TransitionGroup>
      
      <!-- Default Hero (when no carousel images) -->
      <div 
        v-if="!hasItems"
        class="absolute inset-0 bg-gradient-to-br from-aune-900 via-aune-950 to-black flex items-center justify-center"
      >
        <div class="text-center px-4">
          <h1 class="text-5xl md:text-7xl font-display font-bold text-white mb-6">
            AUNE<span class="text-gold-500">.</span>
          </h1>
          <p class="text-xl text-aune-300 max-w-2xl mx-auto">
            追求极致音质，感受纯粹音乐
          </p>
        </div>
      </div>
    </div>
    
    <!-- Navigation Dots -->
    <div 
      v-if="carouselItems.length > 1"
      class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20"
    >
      <button
        v-for="(_, index) in carouselItems"
        :key="index"
        @click="goToSlide(index)"
        :class="[
          'w-3 h-3 rounded-full transition-all duration-300',
          currentIndex === index 
            ? 'bg-gold-500 w-8' 
            : 'bg-white/30 hover:bg-white/50'
        ]"
        :aria-label="`切换到第 ${index + 1} 张`"
      ></button>
    </div>
    
    <!-- Arrow Navigation -->
    <button 
      v-if="carouselItems.length > 1"
      @click="prevSlide"
      class="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors z-20"
      aria-label="上一张"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <button 
      v-if="carouselItems.length > 1"
      @click="nextSlide"
      class="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors z-20"
      aria-label="下一张"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
    
    <!-- Scroll Indicator -->
    <div class="absolute bottom-8 right-8 animate-bounce hidden md:block z-20">
      <svg class="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  </section>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.8s ease-out forwards;
}

.animation-delay-200 {
  animation-delay: 0.2s;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

