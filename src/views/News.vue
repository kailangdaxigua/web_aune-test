<script setup>
/**
 * News List Page - 重构版
 * 
 * 三个一级 Tab：
 * 1. 企业动态 (Corporate) - 普通列表
 * 2. 产品测评 (Reviews) - 含二级筛选（桌面系列/便携系列）
 * 3. 线下展示 (Exhibitions) - 普通列表
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { vScrollAnimate } from '@/composables/useScrollAnimation'

const router = useRouter()

// State
const newsList = ref([])
const isLoading = ref(true)
const activeTab = ref('corporate')       // 一级 Tab：corporate | review | exhibition
const activeSubTab = ref('all')          // 二级 Tab（仅 review 有效）：all | desktop | portable

// 一级 Tab 配置
const mainTabs = [
  { 
    value: 'corporate', 
    label: '企业动态', 
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
  },
  { 
    value: 'review', 
    label: '产品测评', 
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    hasSubTabs: true
  },
  { 
    value: 'exhibition', 
    label: '线下展示', 
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
  }
]

// 二级 Tab 配置（产品测评）
const subTabs = [
  { value: 'all', label: '全部' },
  { value: 'desktop', label: '桌面系列' },
  { value: 'portable', label: '便携系列' }
]

// 当前 Tab 是否有二级筛选
const hasSubTabs = computed(() => {
  return activeTab.value === 'review'
})

// 筛选后的新闻列表
const filteredNews = computed(() => {
  let result = newsList.value
  
  // 按一级 Tab 筛选
  if (activeTab.value !== 'all') {
    result = result.filter(news => news.news_type === activeTab.value)
  }
  
  // 按二级 Tab 筛选（仅产品测评）
  if (activeTab.value === 'review' && activeSubTab.value !== 'all') {
    result = result.filter(news => news.product_series === activeSubTab.value)
  }
  
  return result
})

// 切换一级 Tab 时重置二级 Tab
watch(activeTab, () => {
  activeSubTab.value = 'all'
})

// Load news
onMounted(async () => {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
    
    if (error) throw error
    newsList.value = data || []
  } finally {
    isLoading.value = false
  }
})

// Navigate to news detail
function goToNews(slug) {
  router.push(`/news/${slug}`)
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 获取新闻类型标签
function getNewsTypeLabel(type) {
  const labels = {
    corporate: '企业动态',
    review: '产品测评',
    exhibition: '线下展示'
  }
  return labels[type] || ''
}

// 获取产品系列标签
function getSeriesLabel(series) {
  const labels = {
    desktop: '桌面系列',
    portable: '便携系列'
  }
  return labels[series] || ''
}
</script>

<template>
  <div class="news-page pt-20">
    <!-- Hero Section -->
    <section class="py-20 bg-gradient-to-b from-aune-900 to-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          v-scroll-animate="{ type: 'fade-up' }"
          class="text-center"
        >
          <h1 class="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            新闻资讯
          </h1>
          <p class="text-aune-400 max-w-2xl mx-auto text-lg">
            了解 AUNE 最新动态
          </p>
        </div>
      </div>
    </section>
    
    <!-- 一级 Tabs -->
    <section class="py-8 bg-aune-900/50 border-y border-aune-700/50 sticky top-20 z-30 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-center gap-4">
          <button
            v-for="tab in mainTabs"
            :key="tab.value"
            @click="activeTab = tab.value"
            :class="[
              'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === tab.value
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                : 'text-aune-300 hover:text-white hover:bg-aune-800/50 border border-transparent'
            ]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
            </svg>
            {{ tab.label }}
          </button>
        </div>
      </div>
    </section>
    
    <!-- 二级 Tabs（仅产品测评显示） -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <section 
        v-if="hasSubTabs" 
        class="py-4 bg-aune-950 border-b border-aune-800/50"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-center gap-2">
            <button
              v-for="sub in subTabs"
              :key="sub.value"
              @click="activeSubTab = sub.value"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeSubTab === sub.value
                  ? 'bg-gold-500/10 text-gold-400'
                  : 'text-aune-400 hover:text-white hover:bg-aune-800/30'
              ]"
            >
              {{ sub.label }}
            </button>
          </div>
        </div>
      </section>
    </Transition>
    
    <!-- News Grid -->
    <section class="py-16 bg-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Loading -->
        <div v-if="isLoading" class="text-center py-16">
          <svg class="animate-spin w-12 h-12 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="filteredNews.length === 0" class="text-center py-16">
          <div class="w-20 h-20 mx-auto bg-aune-800 rounded-full flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h3 class="text-white font-medium mb-2">暂无相关内容</h3>
          <p class="text-aune-500">敬请期待</p>
        </div>
        
        <!-- News List -->
        <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <article
            v-for="(news, index) in filteredNews"
            :key="news.id"
            v-scroll-animate="{ type: 'fade-up', delay: index * 100 }"
            @click="goToNews(news.slug)"
            class="group cursor-pointer"
          >
            <!-- Cover Image -->
            <div class="aspect-[16/9] bg-aune-900 rounded-xl overflow-hidden mb-4 relative">
              <img
                v-if="news.cover_image"
                :src="news.cover_image"
                :alt="news.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-12 h-12 text-aune-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              
              <!-- 类型标签 -->
              <div class="absolute top-3 left-3 flex items-center gap-2">
                <span 
                  v-if="news.news_type"
                  class="px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-lg"
                >
                  {{ getNewsTypeLabel(news.news_type) }}
                </span>
                <span 
                  v-if="news.product_series"
                  class="px-2.5 py-1 bg-gold-500/80 text-white text-xs rounded-lg"
                >
                  {{ getSeriesLabel(news.product_series) }}
                </span>
              </div>
            </div>
            
            <!-- Content -->
            <div>
              <time class="text-gold-500 text-sm">
                {{ formatDate(news.published_at) }}
              </time>
              <h3 class="text-xl text-white font-medium mt-2 mb-2 group-hover:text-gold-500 transition-colors line-clamp-2">
                {{ news.title }}
              </h3>
              <p v-if="news.excerpt" class="text-aune-400 text-sm line-clamp-2">
                {{ news.excerpt }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
