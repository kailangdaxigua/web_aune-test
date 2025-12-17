<script setup>
/**
 * Home Video Component
 * Supports local uploaded videos and external embed (Bilibili/YouTube)
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()

// State
const videoRef = ref(null)
const isPlaying = ref(false)
const isMuted = ref(true)
const showPlayButton = ref(true)
const isFullMode = ref(false)

// Computed
const video = computed(() => siteStore.primaryVideo)
const hasVideo = computed(() => video.value && video.value.is_active)
const isLocalVideo = computed(() => video.value?.source_type === 'local')
const isExternalEmbed = computed(() => video.value?.external_embed_code)

/**
 * Initialize video
 */
function initVideo() {
  if (!videoRef.value || !hasVideo.value) return
  
  const videoEl = videoRef.value
  
  // Apply video settings
  if (video.value.autoplay) {
    videoEl.play().catch(() => {
      // Autoplay blocked, show play button
      showPlayButton.value = true
    })
  }
  
  videoEl.muted = video.value.muted ?? true
  videoEl.loop = video.value.loop ?? true
  isMuted.value = videoEl.muted
}

/**
 * Play full video
 */
function playFullVideo() {
  if (!videoRef.value) return
  
  const videoEl = videoRef.value
  videoEl.currentTime = 0
  videoEl.muted = false
  videoEl.play()
  
  isFullMode.value = true
  isMuted.value = false
  showPlayButton.value = false
  isPlaying.value = true
}

/**
 * Toggle play/pause
 */
function togglePlay() {
  if (!videoRef.value) return
  
  if (videoRef.value.paused) {
    videoRef.value.play()
    isPlaying.value = true
  } else {
    videoRef.value.pause()
    isPlaying.value = false
  }
}

/**
 * Toggle mute
 */
function toggleMute() {
  if (!videoRef.value) return
  
  videoRef.value.muted = !videoRef.value.muted
  isMuted.value = videoRef.value.muted
}

/**
 * Return to preview mode
 */
function returnToPreview() {
  if (!videoRef.value) return
  
  videoRef.value.muted = true
  videoRef.value.currentTime = 0
  videoRef.value.play()
  
  isFullMode.value = false
  isMuted.value = true
  showPlayButton.value = true
}

/**
 * Handle video ended
 */
function handleVideoEnded() {
  if (isFullMode.value && !video.value?.loop) {
    returnToPreview()
  }
}

/**
 * Get video progress percentage
 */
function getProgress() {
  if (!videoRef.value) return 0
  return (videoRef.value.currentTime / videoRef.value.duration) * 100 || 0
}

// Lifecycle
onMounted(() => {
  initVideo()
})

// Watch for video change
watch(video, () => {
  initVideo()
})
</script>

<template>
  <section v-if="hasVideo" class="relative h-screen bg-black overflow-hidden">
    <!-- Local/External URL Video -->
    <template v-if="!isExternalEmbed">
      <video
        ref="videoRef"
        :src="video.video_url"
        :poster="video.poster_url"
        :loop="video.loop"
        :controls="video.show_controls"
        playsinline
        @ended="handleVideoEnded"
        class="w-full h-full object-cover"
      ></video>
    </template>
    
    <!-- External Embed (Bilibili/YouTube iframe) -->
    <template v-else>
      <div 
        v-html="video.external_embed_code"
        class="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
      ></div>
    </template>
    
    <!-- Gradient Overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-aune-950 via-transparent to-aune-950/30 pointer-events-none"></div>
    
    <!-- Play Button (Preview Mode) -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <button
        v-if="showPlayButton && !isExternalEmbed"
        @click="playFullVideo"
        class="absolute bottom-1/4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all group z-20"
      >
        <svg class="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span class="font-medium">观看视频</span>
      </button>
    </Transition>
    
    <!-- Video Controls (Full Mode) -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div 
        v-if="isFullMode && !isExternalEmbed"
        class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/50 backdrop-blur-md rounded-full z-20"
      >
        <!-- Play/Pause -->
        <button @click="togglePlay" class="text-white hover:text-gold-500 transition-colors">
          <svg v-if="isPlaying" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        
        <!-- Progress Bar -->
        <div class="w-48 h-1 bg-white/30 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gold-500 transition-all"
            :style="{ width: getProgress() + '%' }"
          ></div>
        </div>
        
        <!-- Mute/Unmute -->
        <button @click="toggleMute" class="text-white hover:text-gold-500 transition-colors">
          <svg v-if="isMuted" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
        
        <!-- Return to Preview -->
        <button @click="returnToPreview" class="text-white/60 hover:text-white text-sm transition-colors">
          返回预览
        </button>
      </div>
    </Transition>
    
    <!-- Video Title Overlay -->
    <div 
      v-if="video.title && !isFullMode"
      class="absolute bottom-0 left-0 right-0 p-8 md:p-16 pointer-events-none"
    >
      <div class="max-w-7xl mx-auto">
        <h3 class="text-2xl md:text-3xl font-display font-bold text-white">
          {{ video.title }}
        </h3>
        <p v-if="video.description" class="text-aune-300 mt-2 max-w-2xl">
          {{ video.description }}
        </p>
      </div>
    </div>
  </section>
</template>

