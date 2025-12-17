<script setup>
/**
 * Product Detail Page - 重构版
 * 
 * 导航栏 Tab 结构：
 * 1. 产品功能 - 头图 + 沉浸式图文模块
 * 2. 技术规格 - 头图 + 规格参数
 * 3. 相关下载 - 下载列表
 * 4. 产品测评 - 跳转到新闻页面对应类型
 * 
 * 特性：
 * - DJI 风格沉浸式图文展示
 * - 立即购买按钮（可配置链接）
 * - 滚动视差动效
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useVideoPreview } from '@/composables/useVideoPreview'
import { vScrollAnimate } from '@/composables/useScrollAnimation'
import ImmersiveSection from '@/components/ImmersiveSection.vue'

const route = useRoute()
const router = useRouter()

// Video preview
const videoPreview = useVideoPreview({
  previewDuration: 5,
  autoplay: true,
  muted: true
})

// State
const product = ref(null)
const mediaBlocks = ref([])
const relatedDownloads = ref([])
const isLoading = ref(true)
const activeTab = ref('features')
const videoContainerRef = ref(null)

// Tab 配置
const tabs = [
  { id: 'features', label: '产品功能', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { id: 'specs', label: '技术规格', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'downloads', label: '相关下载', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10' },
  { id: 'reviews', label: '产品测评', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', isExternal: true }
]

// Computed
const hasVideo = computed(() => !!product.value?.video_url)
const productSlug = computed(() => route.params.slug)

// 获取购买链接（优先使用 buy_link，其次使用 buy_links 数组第一项）
const buyLink = computed(() => {
  if (product.value?.buy_link) {
    return product.value.buy_link
  }
  if (product.value?.buy_links?.length > 0) {
    return product.value.buy_links[0].url
  }
  return null
})

// 获取沉浸式模块（从 content_modules JSONB 或 mediaBlocks）
const immersiveModules = computed(() => {
  // 优先使用新的 JSONB 结构
  if (product.value?.content_modules?.length > 0) {
    return product.value.content_modules
  }
  // 兼容旧的 mediaBlocks 结构
  return mediaBlocks.value.map(block => ({
    id: block.id,
    type: block.layout_type || 'standard',
    image_url: block.image_url,
    title: block.title || '',
    subtitle: block.subtitle || '',
    description: block.text_content || '',
    text_align: block.text_position || 'center',
    text_color: block.text_color || 'white',
    overlay_opacity: block.overlay_opacity || 0.3,
    animation: block.animation_type || 'fade-up',
    enable_parallax: block.enable_parallax || false
  }))
})

// Load product data
onMounted(async () => {
  await loadProduct()
})

// Watch for route changes
watch(() => route.params.slug, async (newSlug) => {
  if (newSlug) {
    await loadProduct()
  }
})

/**
 * Load product data from Supabase
 */
async function loadProduct() {
  isLoading.value = true
  
  try {
    const slug = route.params.slug
    
    // Load product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    
    if (productError) throw productError
    
    product.value = productData
    
    // Load media blocks
    const { data: blocksData } = await supabase
      .from('product_media_blocks')
      .select('*')
      .eq('product_id', productData.id)
      .order('sort_order')
    
    mediaBlocks.value = blocksData || []
    
    // Load related downloads
    const { data: downloadsData } = await supabase
      .from('downloads')
      .select('*')
      .eq('product_id', productData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    relatedDownloads.value = downloadsData || []
    
    // Initialize video after data loaded
    await nextTick()
    initializeVideo()
    
  } catch (error) {
    console.error('Failed to load product:', error)
    router.push('/404')
  } finally {
    isLoading.value = false
  }
}

/**
 * Initialize video preview
 */
function initializeVideo() {
  if (!hasVideo.value) return
  
  const videoElement = document.querySelector('.product-video')
  if (videoElement) {
    videoPreview.initVideo(videoElement)
  }
}

/**
 * Handle watch full video click
 */
function handleWatchVideo() {
  videoPreview.watchFullVideo()
}

/**
 * Handle tab click
 */
function handleTabClick(tab) {
  if (tab.id === 'reviews') {
    // 产品测评 Tab 跳转到新闻页面
    const series = product.value?.product_series || 'desktop'
    router.push({
      path: '/news',
      query: { type: 'review', series }
    })
    return
  }
  
  activeTab.value = tab.id
  scrollToSection('content')
}

/**
 * Scroll to section
 */
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId)
  if (element) {
    const headerOffset = 140
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * Handle download click
 */
async function handleDownload(download) {
  // Increment download count
  await supabase.rpc('increment_download_count', { download_id: download.id })
  
  // Open download URL
  window.open(download.file_url, '_blank')
}

/**
 * Handle buy click
 */
function handleBuyClick() {
  if (buyLink.value) {
    window.open(buyLink.value, '_blank')
  }
}
</script>

<template>
  <div class="product-detail">
    <!-- Loading State -->
    <div v-if="isLoading" class="min-h-screen flex items-center justify-center bg-aune-950">
      <div class="text-center">
        <svg class="animate-spin w-12 h-12 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-aune-400">加载中...</p>
      </div>
    </div>
    
    <template v-else-if="product">
      <!-- Secondary Navigation Bar -->
      <nav class="sticky top-20 z-40 bg-aune-900/95 backdrop-blur-md border-b border-aune-700/50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Product Name (Left) -->
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-bold text-white">{{ product.name }}</h1>
              <span class="text-aune-400 text-sm hidden sm:inline">{{ product.model }}</span>
            </div>
            
            <!-- Navigation Tabs + Buy Button (Right) -->
            <div class="flex items-center gap-1">
              <!-- Tabs -->
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="handleTabClick(tab)"
                :class="[
                  'hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeTab === tab.id && !tab.isExternal
                    ? 'text-gold-500 bg-gold-500/10' 
                    : 'text-aune-300 hover:text-white hover:bg-aune-700/50'
                ]"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
                </svg>
                {{ tab.label }}
                <!-- External link indicator -->
                <svg v-if="tab.isExternal" class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              
              <!-- Buy Button -->
              <button
                v-if="buyLink"
                @click="handleBuyClick"
                class="ml-2 px-5 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white text-sm font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                立即购买
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <!-- Hero Section with Video -->
      <section v-if="hasVideo" ref="videoContainerRef" class="relative h-screen bg-black overflow-hidden">
        <!-- Video Element -->
        <video
          class="product-video absolute inset-0 w-full h-full object-cover"
          :src="product.video_url"
          playsinline
          muted
          loop
        ></video>
        
        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-aune-950 via-transparent to-transparent"></div>
        
        <!-- Watch Full Video Button -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-90"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-90"
        >
          <button
            v-if="videoPreview.showPlayButton.value"
            @click="handleWatchVideo"
            class="absolute bottom-1/4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all group"
          >
            <svg class="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span class="font-medium">观看视频</span>
          </button>
        </Transition>
        
        <!-- Video Controls -->
        <div 
          v-if="!videoPreview.isPreviewMode.value"
          class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/50 backdrop-blur-md rounded-full"
        >
          <button @click="videoPreview.togglePlay()" class="text-white hover:text-gold-500 transition-colors">
            <svg v-if="videoPreview.isPlaying.value" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          
          <div class="w-48 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gold-500 transition-all"
              :style="{ width: videoPreview.getProgress() + '%' }"
            ></div>
          </div>
          
          <button @click="videoPreview.toggleMute()" class="text-white hover:text-gold-500 transition-colors">
            <svg v-if="videoPreview.isMuted.value" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          
          <button @click="videoPreview.returnToPreview()" class="text-white/60 hover:text-white text-sm transition-colors">
            返回预览
          </button>
        </div>
        
        <!-- Product Info Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div class="max-w-7xl mx-auto">
            <p 
              v-scroll-animate="{ type: 'fade-up', delay: 0 }"
              class="text-gold-500 font-medium mb-2"
            >
              {{ product.category?.name }}
            </p>
            <h2 
              v-scroll-animate="{ type: 'fade-up', delay: 100 }"
              class="text-4xl md:text-6xl font-display font-bold text-white mb-4"
            >
              {{ product.name }}
            </h2>
            <p 
              v-scroll-animate="{ type: 'fade-up', delay: 200 }"
              v-if="product.short_description"
              class="text-xl text-aune-300 max-w-2xl"
            >
              {{ product.short_description }}
            </p>
          </div>
        </div>
      </section>
      
      <!-- Hero Section without Video -->
      <section v-else class="relative py-32 bg-gradient-to-b from-aune-900 to-aune-950">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid lg:grid-cols-2 gap-12 items-center">
            <!-- Text -->
            <div>
              <p 
                v-scroll-animate="{ type: 'fade-up', delay: 0 }"
                class="text-gold-500 font-medium mb-2"
              >
                {{ product.category?.name }}
              </p>
              <h2 
                v-scroll-animate="{ type: 'fade-up', delay: 100 }"
                class="text-4xl md:text-5xl font-display font-bold text-white mb-6"
              >
                {{ product.name }}
              </h2>
              <p 
                v-scroll-animate="{ type: 'fade-up', delay: 200 }"
                v-if="product.short_description"
                class="text-xl text-aune-300"
              >
                {{ product.short_description }}
              </p>
              
              <!-- Buy Button (Hero) -->
              <button
                v-if="buyLink"
                v-scroll-animate="{ type: 'fade-up', delay: 300 }"
                @click="handleBuyClick"
                class="mt-8 px-8 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-xl hover:from-gold-500 hover:to-gold-400 transition-all inline-flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                立即购买
              </button>
            </div>
            
            <!-- Cover Image -->
            <div 
              v-if="product.cover_image"
              v-scroll-animate="{ type: 'scale-in', delay: 300 }"
              class="relative"
            >
              <img 
                :src="product.cover_image" 
                :alt="product.name"
                class="w-full rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>
      
      <!-- Immersive Media Modules (DJI Style) -->
      <section v-if="immersiveModules.length > 0" class="bg-aune-950">
        <ImmersiveSection
          v-for="(module, index) in immersiveModules"
          :key="module.id || index"
          :image-url="module.image_url"
          :title="module.title"
          :subtitle="module.subtitle"
          :description="module.description"
          :text-align="module.text_align"
          :text-color="module.text_color"
          :overlay-opacity="module.overlay_opacity || 0.3"
          :enable-parallax="module.enable_parallax !== false"
          :animation-type="module.animation || 'fade-up'"
          :min-height="index === 0 ? '80vh' : '100vh'"
        />
      </section>
      
      <!-- Content Section (Features / Specs / Downloads Tabs) -->
      <section id="content" class="py-20 bg-aune-900">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Mobile Tab Buttons -->
          <div class="md:hidden flex gap-2 mb-8 overflow-x-auto pb-2">
            <button
              v-for="tab in tabs.filter(t => !t.isExternal)"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex-shrink-0 px-4 py-2.5 font-medium rounded-lg transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-gold-500 text-white' 
                  : 'bg-aune-800 text-aune-300'
              ]"
            >
              {{ tab.label }}
            </button>
          </div>
          
          <!-- Features Tab Content -->
          <div v-show="activeTab === 'features'">
            <!-- Features Header Image -->
            <div 
              v-if="product.features_header_image"
              v-scroll-animate="{ type: 'fade-up' }"
              class="mb-12 rounded-2xl overflow-hidden"
            >
              <img 
                :src="product.features_header_image" 
                :alt="product.name + ' 功能'"
                class="w-full"
              />
            </div>
            
            <h3 
              v-scroll-animate="{ type: 'fade-up' }"
              class="text-3xl font-display font-bold text-white mb-8 text-center"
            >
              产品功能
            </h3>
            <div 
              v-scroll-animate="{ type: 'fade-up', delay: 100 }"
              class="prose prose-lg prose-invert max-w-none"
              v-html="product.features_html || '<p class=\'text-aune-400 text-center\'>暂无功能介绍</p>'"
            ></div>
          </div>
          
          <!-- Specs Tab Content -->
          <div v-show="activeTab === 'specs'">
            <!-- Specs Header Image -->
            <div 
              v-if="product.specs_header_image"
              v-scroll-animate="{ type: 'fade-up' }"
              class="mb-12 rounded-2xl overflow-hidden"
            >
              <img 
                :src="product.specs_header_image" 
                :alt="product.name + ' 规格'"
                class="w-full"
              />
            </div>
            
            <h3 
              v-scroll-animate="{ type: 'fade-up' }"
              class="text-3xl font-display font-bold text-white mb-8 text-center"
            >
              技术规格
            </h3>
            <div 
              v-scroll-animate="{ type: 'fade-up', delay: 100 }"
              class="prose prose-lg prose-invert max-w-none"
              v-html="product.specs_html || '<p class=\'text-aune-400 text-center\'>暂无技术规格</p>'"
            ></div>
          </div>
          
          <!-- Downloads Tab Content -->
          <div v-show="activeTab === 'downloads'">
            <h3 
              v-scroll-animate="{ type: 'fade-up' }"
              class="text-3xl font-display font-bold text-white mb-8 text-center"
            >
              相关下载
            </h3>
            
            <!-- Empty State -->
            <div 
              v-if="relatedDownloads.length === 0"
              class="text-center py-12 bg-aune-800/30 rounded-2xl"
            >
              <svg class="w-16 h-16 text-aune-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <p class="text-aune-400">暂无相关下载</p>
            </div>
            
            <!-- Downloads List -->
            <div v-else class="space-y-4">
              <div
                v-for="(download, index) in relatedDownloads"
                :key="download.id"
                v-scroll-animate="{ type: 'fade-up', delay: index * 100 }"
                class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden"
              >
                <div 
                  class="flex items-center justify-between p-4 cursor-pointer hover:bg-aune-700/30 transition-colors"
                  @click="download._expanded = !download._expanded"
                >
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-aune-700/50 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                    <div>
                      <h4 class="text-white font-medium">{{ download.title }}</h4>
                      <p class="text-aune-400 text-sm">
                        {{ download.version ? `v${download.version}` : '' }}
                        · {{ formatSize(download.file_size) }}
                        · {{ download.download_count || 0 }} 次下载
                      </p>
                    </div>
                  </div>
                  
                  <svg 
                    :class="['w-5 h-5 text-aune-400 transition-transform', download._expanded ? 'rotate-180' : '']" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-96"
                  leave-active-class="transition-all duration-300 ease-in"
                  leave-from-class="opacity-100 max-h-96"
                  leave-to-class="opacity-0 max-h-0"
                >
                  <div v-if="download._expanded" class="px-4 pb-4 overflow-hidden">
                    <div class="pt-4 border-t border-aune-700/50">
                      <div 
                        v-if="download.description_html"
                        class="prose prose-sm prose-invert max-w-none mb-4"
                        v-html="download.description_html"
                      ></div>
                      
                      <button
                        @click.stop="handleDownload(download)"
                        class="px-6 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center gap-2"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        下载文件
                      </button>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Gallery Section -->
      <section v-if="product.gallery_images?.length > 0" class="py-20 bg-aune-950">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 
            v-scroll-animate="{ type: 'fade-up' }"
            class="text-3xl font-display font-bold text-white mb-8 text-center"
          >
            产品图库
          </h3>
          
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div
              v-for="(image, index) in product.gallery_images"
              :key="index"
              v-scroll-animate="{ type: 'scale-in', delay: index * 100 }"
            >
              <img 
                :src="image" 
                :alt="`${product.name} - 图片 ${index + 1}`"
                class="w-full aspect-square object-cover rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style>
/* Custom prose styles for product content */
.product-detail .prose h1,
.product-detail .prose h2,
.product-detail .prose h3,
.product-detail .prose h4 {
  color: #fff;
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
}

.product-detail .prose p {
  color: #b8b8c1;
}

.product-detail .prose a {
  color: #d4a056;
}

.product-detail .prose strong {
  color: #fff;
}

.product-detail .prose ul li::marker,
.product-detail .prose ol li::marker {
  color: #d4a056;
}

.product-detail .prose hr {
  border-color: #4c4c57;
}

.product-detail .prose blockquote {
  border-left-color: #d4a056;
  color: #91919f;
}

.product-detail .prose code {
  background: #41414a;
  color: #d4a056;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.product-detail .prose pre {
  background: #1a1a1f;
}

/* Specs table styles */
.product-detail .prose table {
  width: 100%;
}

.product-detail .prose th {
  background: #393940;
  color: #fff;
  text-align: left;
}

.product-detail .prose td {
  border-color: #4c4c57;
}

.product-detail .prose tr:nth-child(even) td {
  background: #41414a20;
}
</style>
