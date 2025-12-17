/**
 * Video Preview Composable
 * Implements 5-second preview loop and full video playback
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'

/**
 * Video preview hook
 * @param {Object} options - Video options
 * @returns {Object} - Video control methods and state
 */
export function useVideoPreview(options = {}) {
  const {
    previewDuration = 5, // seconds
    autoplay = true,
    muted = true
  } = options
  
  // State
  const videoRef = ref(null)
  const isPreviewMode = ref(true)
  const isPlaying = ref(false)
  const isMuted = ref(muted)
  const currentTime = ref(0)
  const duration = ref(0)
  const isLoaded = ref(false)
  const showPlayButton = ref(true)
  
  // Timers
  let previewTimer = null
  
  /**
   * Initialize video element
   */
  function initVideo(element) {
    if (!element) return
    
    videoRef.value = element
    
    // Set initial state
    element.muted = true
    element.loop = true
    element.playsInline = true
    
    // Event listeners
    element.addEventListener('loadedmetadata', handleLoadedMetadata)
    element.addEventListener('timeupdate', handleTimeUpdate)
    element.addEventListener('ended', handleEnded)
    element.addEventListener('play', handlePlay)
    element.addEventListener('pause', handlePause)
    
    // Auto play preview if enabled
    if (autoplay) {
      playPreview()
    }
  }
  
  /**
   * Handle loaded metadata
   */
  function handleLoadedMetadata() {
    const video = videoRef.value
    if (!video) return
    
    duration.value = video.duration
    isLoaded.value = true
    
    // Start preview
    if (autoplay) {
      playPreview()
    }
  }
  
  /**
   * Handle time update
   */
  function handleTimeUpdate() {
    const video = videoRef.value
    if (!video) return
    
    currentTime.value = video.currentTime
    
    // Loop preview at previewDuration
    if (isPreviewMode.value && video.currentTime >= previewDuration) {
      video.currentTime = 0
    }
  }
  
  /**
   * Handle video ended
   */
  function handleEnded() {
    if (!isPreviewMode.value) {
      // Full video ended, return to preview mode
      returnToPreview()
    }
  }
  
  /**
   * Handle play event
   */
  function handlePlay() {
    isPlaying.value = true
  }
  
  /**
   * Handle pause event
   */
  function handlePause() {
    isPlaying.value = false
  }
  
  /**
   * Play preview loop (first 5 seconds, muted)
   */
  function playPreview() {
    const video = videoRef.value
    if (!video) return
    
    isPreviewMode.value = true
    video.muted = true
    video.loop = true
    video.currentTime = 0
    isMuted.value = true
    showPlayButton.value = true
    
    video.play().catch(err => {
      console.log('Preview autoplay prevented:', err)
    })
  }
  
  /**
   * Watch full video (unmuted, no loop)
   */
  function watchFullVideo() {
    const video = videoRef.value
    if (!video) return
    
    isPreviewMode.value = false
    video.loop = false
    video.muted = false
    video.currentTime = 0
    isMuted.value = false
    showPlayButton.value = false
    
    video.play().catch(err => {
      console.log('Full video play prevented:', err)
    })
  }
  
  /**
   * Return to preview mode
   */
  function returnToPreview() {
    playPreview()
  }
  
  /**
   * Toggle play/pause
   */
  function togglePlay() {
    const video = videoRef.value
    if (!video) return
    
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }
  
  /**
   * Toggle mute
   */
  function toggleMute() {
    const video = videoRef.value
    if (!video) return
    
    video.muted = !video.muted
    isMuted.value = video.muted
  }
  
  /**
   * Seek to time
   */
  function seekTo(time) {
    const video = videoRef.value
    if (!video) return
    
    video.currentTime = time
  }
  
  /**
   * Get progress percentage
   */
  function getProgress() {
    if (!duration.value) return 0
    return (currentTime.value / duration.value) * 100
  }
  
  /**
   * Cleanup
   */
  function cleanup() {
    const video = videoRef.value
    if (video) {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.pause()
    }
    
    if (previewTimer) {
      clearTimeout(previewTimer)
    }
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    // State
    videoRef,
    isPreviewMode,
    isPlaying,
    isMuted,
    currentTime,
    duration,
    isLoaded,
    showPlayButton,
    
    // Methods
    initVideo,
    playPreview,
    watchFullVideo,
    returnToPreview,
    togglePlay,
    toggleMute,
    seekTo,
    getProgress,
    cleanup
  }
}

