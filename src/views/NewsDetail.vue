<script setup>
/**
 * News Detail Page
 * 新闻详情页
 * 
 * 支持：
 * - content_banner_url: 详情页顶部大图
 * - cover_image: 列表缩略图（作为备选）
 * - news_type / product_series: 类型标签
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { vScrollAnimate } from '@/composables/useScrollAnimation'

const route = useRoute()
const router = useRouter()

// State
const news = ref(null)
const isLoading = ref(true)

// 获取顶部大图（优先使用 content_banner_url，否则使用 cover_image）
const bannerImage = computed(() => {
  return news.value?.content_banner_url || news.value?.cover_image
})

// 获取新闻类型标签
const newsTypeLabel = computed(() => {
  const labels = {
    corporate: '企业动态',
    review: '产品测评',
    exhibition: '线下展示'
  }
  return labels[news.value?.news_type] || ''
})

// 获取产品系列标签
const seriesLabel = computed(() => {
  const labels = {
    desktop: '桌面系列',
    portable: '便携系列'
  }
  return labels[news.value?.product_series] || ''
})

// Load news
onMounted(async () => {
  isLoading.value = true
  
  try {
    const slug = route.params.slug
    
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()
    
    if (error || !data) {
      router.push('/404')
      return
    }
    
    news.value = data
    
    // Increment view count
    await supabase.rpc('increment_news_view_count', { news_id: data.id })
    
    // Update document title
    document.title = `${data.meta_title || data.title} - Aune Audio`
  } finally {
    isLoading.value = false
  }
})

// Format date
function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 返回列表，保留类型筛选
function goBack() {
  const newsType = news.value?.news_type
  if (newsType) {
    router.push({ path: '/news', query: { type: newsType } })
  } else {
    router.push('/news')
  }
}
</script>

<template>
  <div class="news-detail-page pt-20">
    <!-- Loading -->
    <div v-if="isLoading" class="min-h-screen flex items-center justify-center">
      <svg class="animate-spin w-12 h-12 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <template v-else-if="news">
      <!-- Hero Section with Banner -->
      <section class="relative">
        <!-- Banner Image (content_banner_url 或 cover_image) -->
        <div 
          v-if="bannerImage"
          class="relative h-[40vh] md:h-[50vh] lg:h-[60vh] overflow-hidden"
        >
          <img
            :src="bannerImage"
            :alt="news.title"
            class="w-full h-full object-cover"
          />
          <!-- Gradient Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-aune-950 via-aune-950/50 to-transparent"></div>
          
          <!-- Title Overlay -->
          <div class="absolute bottom-0 left-0 right-0 pb-12">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <!-- Tags -->
              <div class="flex items-center gap-2 mb-4">
                <span 
                  v-if="newsTypeLabel"
                  class="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-sm rounded-lg"
                >
                  {{ newsTypeLabel }}
                </span>
                <span 
                  v-if="seriesLabel"
                  class="px-3 py-1 bg-gold-500/80 text-white text-sm rounded-lg"
                >
                  {{ seriesLabel }}
                </span>
              </div>
              
              <time class="text-gold-500 text-sm">
                {{ formatDate(news.published_at) }}
              </time>
              <h1 class="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mt-2">
                {{ news.title }}
              </h1>
            </div>
          </div>
        </div>
        
        <!-- No Banner - Text Only Header -->
        <div 
          v-else
          class="py-20 bg-gradient-to-b from-aune-900 to-aune-950"
        >
          <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div v-scroll-animate="{ type: 'fade-up' }" class="text-center">
              <!-- Tags -->
              <div class="flex items-center justify-center gap-2 mb-4">
                <span 
                  v-if="newsTypeLabel"
                  class="px-3 py-1 bg-aune-800 text-aune-300 text-sm rounded-lg"
                >
                  {{ newsTypeLabel }}
                </span>
                <span 
                  v-if="seriesLabel"
                  class="px-3 py-1 bg-gold-500/20 text-gold-400 text-sm rounded-lg"
                >
                  {{ seriesLabel }}
                </span>
              </div>
              
              <time class="text-gold-500 text-sm">
                {{ formatDate(news.published_at) }}
              </time>
              <h1 class="text-3xl md:text-4xl font-display font-bold text-white mt-4">
                {{ news.title }}
              </h1>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Content Section -->
      <section class="py-16 bg-aune-950">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            v-scroll-animate="{ type: 'fade-up', delay: 100 }"
            class="prose prose-lg prose-invert max-w-none"
            v-html="news.content_html"
          ></div>
          
          <!-- Back Link -->
          <div class="mt-12 pt-8 border-t border-aune-700/50">
            <router-link
              to="/news"
              class="inline-flex items-center gap-2 text-aune-400 hover:text-gold-500 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              返回新闻列表
            </router-link>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style>
/* Prose styles */
.news-detail-page .prose {
  color: #b8b8c1;
}

.news-detail-page .prose h1,
.news-detail-page .prose h2,
.news-detail-page .prose h3,
.news-detail-page .prose h4 {
  color: #fff;
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
}

.news-detail-page .prose p {
  color: #b8b8c1;
}

.news-detail-page .prose a {
  color: #d4a056;
}

.news-detail-page .prose strong {
  color: #fff;
}

.news-detail-page .prose ul li::marker,
.news-detail-page .prose ol li::marker {
  color: #d4a056;
}

.news-detail-page .prose blockquote {
  border-left-color: #d4a056;
  color: #91919f;
}

.news-detail-page .prose img {
  border-radius: 12px;
}

.news-detail-page .prose code {
  background: #41414a;
  color: #d4a056;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.news-detail-page .prose pre {
  background: #1a1a1f;
  border: 1px solid #41414a;
  border-radius: 12px;
}
</style>
