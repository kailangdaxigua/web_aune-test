<script setup>
/**
 * ImmersiveSection - DJI 风格沉浸式图文模块
 * 
 * 特性：
 * - 文字悬浮覆盖在图片之上
 * - 滚动视差效果（Parallax）
 * - IntersectionObserver 触发淡入动画
 * - 支持左/中/右对齐
 * 
 * Props:
 * - imageUrl: 背景图片 URL
 * - title: 标题
 * - subtitle: 副标题
 * - description: 正文描述
 * - textAlign: 文字对齐 (left | center | right)
 * - textColor: 文字颜色 (white | dark)
 * - overlayOpacity: 遮罩透明度 (0-1)
 * - enableParallax: 是否启用视差
 * - animationType: 动画类型 (fade-up | fade-left | fade-right)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  imageUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  textAlign: {
    type: String,
    default: 'center',
    validator: v => ['left', 'center', 'right'].includes(v)
  },
  textColor: {
    type: String,
    default: 'white',
    validator: v => ['white', 'dark'].includes(v)
  },
  overlayOpacity: {
    type: Number,
    default: 0.3
  },
  enableParallax: {
    type: Boolean,
    default: true
  },
  animationType: {
    type: String,
    default: 'fade-up',
    validator: v => ['fade-up', 'fade-left', 'fade-right', 'scale-in'].includes(v)
  },
  minHeight: {
    type: String,
    default: '100vh'
  }
})

// Refs
const sectionRef = ref(null)
const imageRef = ref(null)
const isVisible = ref(false)
const parallaxOffset = ref(0)

// Computed styles
const textAlignClass = computed(() => {
  const alignMap = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right'
  }
  return alignMap[props.textAlign]
})

const textColorClass = computed(() => {
  return props.textColor === 'white' 
    ? 'text-white' 
    : 'text-aune-900'
})

const subtitleColorClass = computed(() => {
  return props.textColor === 'white' 
    ? 'text-gold-400' 
    : 'text-gold-600'
})

const descriptionColorClass = computed(() => {
  return props.textColor === 'white' 
    ? 'text-aune-300' 
    : 'text-aune-600'
})

const overlayStyle = computed(() => ({
  backgroundColor: `rgba(0, 0, 0, ${props.overlayOpacity})`
}))

const parallaxStyle = computed(() => ({
  transform: props.enableParallax 
    ? `translateY(${parallaxOffset.value}px) scale(1.1)` 
    : 'scale(1.05)'
}))

// Animation classes based on visibility
const animationClass = computed(() => {
  if (!isVisible.value) {
    // Initial state (hidden)
    switch (props.animationType) {
      case 'fade-left':
        return 'opacity-0 translate-x-12'
      case 'fade-right':
        return 'opacity-0 -translate-x-12'
      case 'scale-in':
        return 'opacity-0 scale-95'
      default: // fade-up
        return 'opacity-0 translate-y-12'
    }
  }
  // Visible state
  return 'opacity-100 translate-x-0 translate-y-0 scale-100'
})

// Intersection Observer for visibility
let observer = null

// Parallax scroll handler
function handleScroll() {
  if (!props.enableParallax || !sectionRef.value) return
  
  const rect = sectionRef.value.getBoundingClientRect()
  const windowHeight = window.innerHeight
  
  // Calculate how much of the section is visible
  const visibleRatio = (windowHeight - rect.top) / (windowHeight + rect.height)
  
  // Apply parallax offset (subtle movement)
  parallaxOffset.value = visibleRatio * 80 - 40 // Range: -40 to +40
}

onMounted(() => {
  // Setup Intersection Observer
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true
        }
      })
    },
    {
      threshold: 0.15, // Trigger when 15% visible
      rootMargin: '0px 0px -50px 0px'
    }
  )
  
  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
  
  // Setup parallax scroll listener
  if (props.enableParallax) {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial call
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
  if (props.enableParallax) {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <section 
    ref="sectionRef"
    class="immersive-section relative overflow-hidden"
    :style="{ minHeight: minHeight }"
  >
    <!-- Background Image with Parallax -->
    <div 
      ref="imageRef"
      class="absolute inset-0 w-full h-full transition-transform duration-100 ease-out"
      :style="parallaxStyle"
    >
      <img 
        :src="imageUrl" 
        :alt="title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    
    <!-- Gradient Overlay -->
    <div 
      class="absolute inset-0 transition-opacity duration-500"
      :style="overlayStyle"
    ></div>
    
    <!-- Additional gradient for text readability -->
    <div 
      v-if="textColor === 'white'"
      class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
    ></div>
    
    <!-- Content Container -->
    <div 
      class="relative z-10 h-full min-h-[inherit] flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-20"
      :class="textAlignClass"
    >
      <div 
        class="max-w-4xl transition-all duration-700 ease-out"
        :class="[
          animationClass,
          textAlign === 'center' ? 'mx-auto' : '',
          textAlign === 'right' ? 'ml-auto' : ''
        ]"
      >
        <!-- Subtitle / Label -->
        <p 
          v-if="subtitle"
          class="text-sm md:text-base font-medium tracking-wider uppercase mb-4 transition-all duration-700 delay-100"
          :class="[subtitleColorClass, isVisible ? 'opacity-100' : 'opacity-0']"
        >
          {{ subtitle }}
        </p>
        
        <!-- Title -->
        <h2 
          v-if="title"
          class="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight transition-all duration-700 delay-200"
          :class="[textColorClass, isVisible ? 'opacity-100' : 'opacity-0']"
        >
          {{ title }}
        </h2>
        
        <!-- Description -->
        <p 
          v-if="description"
          class="text-lg md:text-xl max-w-2xl leading-relaxed transition-all duration-700 delay-300"
          :class="[
            descriptionColorClass, 
            isVisible ? 'opacity-100' : 'opacity-0',
            textAlign === 'center' ? 'mx-auto' : ''
          ]"
        >
          {{ description }}
        </p>
        
        <!-- Slot for additional content (buttons, etc.) -->
        <div 
          v-if="$slots.default"
          class="mt-8 transition-all duration-700 delay-400"
          :class="isVisible ? 'opacity-100' : 'opacity-0'"
        >
          <slot></slot>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.immersive-section {
  /* Ensure smooth transitions */
  will-change: transform;
}

/* Smooth image loading */
.immersive-section img {
  transition: opacity 0.5s ease;
}

/* Font display for titles */
.font-display {
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
}
</style>

