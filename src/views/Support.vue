<script setup>
/**
 * Service & Support Page
 * 服务支持页面
 * Tab 1: 自助服务（精简入口：在线客服、相关下载、售后政策）
 * Tab 2: 热门问题（FAQ折叠面板 + 底部客服链接）
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useSiteStore } from '@/stores/siteStore'
import { vScrollAnimate } from '@/composables/useScrollAnimation'

const siteStore = useSiteStore()

// State
const activeTab = ref('self-service')
const faqs = ref([])
const isLoading = ref(true)
const expandedFaq = ref(null)
const searchQuery = ref('')

// Tabs
const tabs = [
  { value: 'self-service', label: '自助服务', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { value: 'faq', label: '热门问题', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
]

// 自助服务入口（精简版：仅保留在线客服、相关下载、售后政策）
const serviceEntries = computed(() => [
  {
    title: '在线客服',
    description: '专业客服为您解答',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    action: 'qq',
    color: 'blue'
  },
  {
    title: '相关下载',
    description: '固件、驱动、说明书',
    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
    action: 'link',
    link: '/downloads',
    color: 'green'
  },
  {
    title: '售后政策',
    description: '保修与退换货说明',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    action: 'link',
    link: '/page/after-sales',
    color: 'purple'
  }
])

// 颜色映射
const colorClasses = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', hover: 'hover:border-blue-500/50' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', hover: 'hover:border-green-500/50' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', hover: 'hover:border-purple-500/50' }
}

// 获取 QQ 客服链接（从后台配置）
const qqServiceLink = computed(() => {
  return siteStore.config?.qq_service_link || 'https://wpa.qq.com/msgrd?v=3&uin=123456789&site=qq&menu=yes'
})

// 筛选后的 FAQ
const filteredFaqs = computed(() => {
  if (!searchQuery.value) return faqs.value
  
  const query = searchQuery.value.toLowerCase()
  return faqs.value.filter(faq => 
    faq.question.toLowerCase().includes(query) ||
    faq.answer_html?.toLowerCase().includes(query)
  )
})

// FAQ 分类
const faqCategories = computed(() => {
  const categories = [...new Set(faqs.value.map(f => f.category).filter(Boolean))]
  return categories
})

// 点击服务入口
function handleServiceClick(entry) {
  if (entry.action === 'qq') {
    // 跳转 QQ 客服
    window.open(qqServiceLink.value, '_blank')
  }
}

// 联系在线客服（FAQ底部和自助服务共用）
function openOnlineService() {
  window.open(qqServiceLink.value, '_blank')
}

// 切换 FAQ 展开
function toggleFaq(id) {
  expandedFaq.value = expandedFaq.value === id ? null : id
}

// 加载 FAQ
onMounted(async () => {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) throw error
    faqs.value = data || []
  } catch (error) {
    console.error('Failed to load FAQs:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="support-page pt-20 min-h-screen bg-aune-950">
    <!-- Hero Section -->
    <section class="py-16 bg-gradient-to-b from-aune-900 to-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          v-scroll-animate="{ type: 'fade-up' }"
          class="text-center"
        >
          <h1 class="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            服务支持
          </h1>
          <p class="text-aune-400 max-w-2xl mx-auto text-lg">
            专业团队为您提供全方位的技术支持与售后服务
          </p>
        </div>
      </div>
    </section>
    
    <!-- Tabs -->
    <section class="py-8 bg-aune-900/50 border-y border-aune-700/50 sticky top-20 z-30 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-center gap-4">
          <button
            v-for="tab in tabs"
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
    
    <!-- Content -->
    <section class="py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Tab 1: 自助服务（精简版） -->
        <div v-if="activeTab === 'self-service'">
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <component
              v-for="(entry, index) in serviceEntries"
              :key="entry.title"
              :is="entry.action === 'link' ? 'router-link' : 'button'"
              :to="entry.link"
              @click="entry.action !== 'link' && handleServiceClick(entry)"
              v-scroll-animate="{ type: 'fade-up', delay: index * 50 }"
              :class="[
                'group flex items-start gap-4 p-6 bg-aune-900/50 rounded-2xl border transition-all text-left',
                colorClasses[entry.color].border,
                colorClasses[entry.color].hover
              ]"
            >
              <!-- Icon -->
              <div 
                :class="[
                  'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                  colorClasses[entry.color].bg
                ]"
              >
                <svg 
                  :class="['w-7 h-7', colorClasses[entry.color].text]"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="entry.icon" />
                </svg>
              </div>
              
              <!-- Text -->
              <div class="flex-1">
                <h3 class="text-white font-semibold text-lg mb-1 group-hover:text-gold-400 transition-colors">
                  {{ entry.title }}
                </h3>
                <p class="text-aune-400 text-sm">
                  {{ entry.description }}
                </p>
              </div>
              
              <!-- Arrow -->
              <svg 
                class="w-5 h-5 text-aune-500 group-hover:text-gold-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </component>
          </div>
          
          <!-- Hotline -->
          <div 
            v-scroll-animate="{ type: 'fade-up', delay: 200 }"
            class="mt-12 p-8 bg-gradient-to-r from-gold-600/20 to-gold-500/10 rounded-2xl border border-gold-500/30 text-center max-w-2xl mx-auto"
          >
            <p class="text-aune-300 mb-2">服务热线</p>
            <a 
              :href="'tel:' + siteStore.hotline"
              class="text-3xl md:text-4xl font-display font-bold text-gold-400 hover:text-gold-300 transition-colors"
            >
              {{ siteStore.hotline }}
            </a>
            <p class="text-aune-400 mt-2 text-sm">工作日 9:00 - 18:00</p>
          </div>
        </div>
        
        <!-- Tab 2: 热门问题 FAQ -->
        <div v-else-if="activeTab === 'faq'">
          <!-- Search -->
          <div 
            v-scroll-animate="{ type: 'fade-up' }"
            class="mb-8"
          >
            <div class="relative max-w-xl mx-auto">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索问题..."
                class="w-full pl-12 pr-4 py-4 bg-aune-900/50 border border-aune-700/50 rounded-2xl text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent"
              />
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <!-- Loading -->
          <div v-if="isLoading" class="text-center py-20">
            <svg class="animate-spin w-12 h-12 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          
          <!-- Empty -->
          <div 
            v-else-if="filteredFaqs.length === 0"
            class="text-center py-20 bg-aune-900/30 rounded-2xl border border-aune-700/50"
          >
            <div class="w-20 h-20 mx-auto bg-aune-800 rounded-full flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-white font-medium mb-2">未找到相关问题</h3>
            <p class="text-aune-500">请尝试其他关键词或联系客服</p>
          </div>
          
          <!-- FAQ Accordion -->
          <div v-else class="space-y-4 max-w-4xl mx-auto">
            <div
              v-for="(faq, index) in filteredFaqs"
              :key="faq.id"
              v-scroll-animate="{ type: 'fade-up', delay: index * 50 }"
              class="bg-aune-900/50 rounded-2xl border border-aune-700/50 overflow-hidden"
            >
              <!-- Question Header -->
              <button
                @click="toggleFaq(faq.id)"
                class="w-full flex items-center gap-4 p-5 text-left hover:bg-aune-800/30 transition-colors"
              >
                <!-- Icon -->
                <div 
                  :class="[
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                    expandedFaq === faq.id ? 'bg-gold-500/20' : 'bg-aune-800'
                  ]"
                >
                  <svg 
                    :class="[
                      'w-5 h-5 transition-colors',
                      expandedFaq === faq.id ? 'text-gold-400' : 'text-aune-400'
                    ]"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <!-- Question Text -->
                <div class="flex-1">
                  <h3 
                    :class="[
                      'font-medium transition-colors',
                      expandedFaq === faq.id ? 'text-gold-400' : 'text-white'
                    ]"
                  >
                    {{ faq.question }}
                  </h3>
                  <span 
                    v-if="faq.category"
                    class="text-xs text-aune-500 mt-1"
                  >
                    {{ faq.category }}
                  </span>
                </div>
                
                <!-- Expand Icon -->
                <svg 
                  :class="[
                    'w-5 h-5 text-aune-400 transition-transform flex-shrink-0',
                    expandedFaq === faq.id ? 'rotate-180' : ''
                  ]"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <!-- Answer Content -->
              <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-[1000px]"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 max-h-[1000px]"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="expandedFaq === faq.id" class="overflow-hidden">
                  <div class="px-5 pb-5 pt-0">
                    <div class="p-4 bg-aune-800/30 rounded-xl border-t border-aune-700/50">
                      <div 
                        class="prose prose-sm prose-invert max-w-none faq-answer"
                        v-html="faq.answer_html"
                      ></div>
                      
                      <!-- Helpful -->
                      <div class="mt-4 pt-4 border-t border-aune-700/50 flex items-center justify-between">
                        <span class="text-aune-500 text-sm">这个答案对您有帮助吗？</span>
                        <div class="flex items-center gap-2">
                          <button class="px-3 py-1.5 bg-aune-700/50 text-aune-300 rounded-lg hover:bg-green-500/20 hover:text-green-400 transition-colors text-sm flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            有帮助
                          </button>
                          <button class="px-3 py-1.5 bg-aune-700/50 text-aune-300 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors text-sm flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                            没帮助
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
          </div>
          
            <!-- FAQ 底部：联系在线客服链接 -->
          <div 
              v-scroll-animate="{ type: 'fade-up', delay: 100 }"
              class="mt-8 pt-6 border-t border-aune-700/50 text-center"
          >
            <p class="text-aune-400 mb-4">没有找到您想要的答案？</p>
            <button
                @click="openOnlineService"
                class="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors font-medium"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              联系在线客服
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* FAQ Answer Prose Styles */
.faq-answer h1,
.faq-answer h2,
.faq-answer h3 {
  color: #fff;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.faq-answer p {
  color: #b8b8c1;
  margin-bottom: 0.75em;
}

.faq-answer ul,
.faq-answer ol {
  color: #b8b8c1;
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}

.faq-answer li {
  margin-bottom: 0.25em;
}

.faq-answer li::marker {
  color: #d4a056;
}

.faq-answer a {
  color: #d4a056;
  text-decoration: underline;
}

.faq-answer a:hover {
  color: #e5b877;
}

.faq-answer strong {
  color: #fff;
}

.faq-answer code {
  background: #41414a;
  color: #d4a056;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
