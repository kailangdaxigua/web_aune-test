<script setup>
/**
 * Downloads Center Page
 * Public page to browse and download resources
 * 重构版本：支持三大产品分类（桌面系列、便携系列、历史产品）
 * 左侧垂直导航 + 原始文件名下载
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { vScrollAnimate } from '@/composables/useScrollAnimation'
import CustomSelect from '@/components/ui/CustomSelect.vue'

// State
const downloads = ref([])
const isLoading = ref(true)
const filterCategory = ref('all')
const filterType = ref('all')
const searchQuery = ref('')
const expandedId = ref(null)

// 产品分类（固定三大类）
const categories = [
  { value: 'all', label: '全部产品', icon: 'grid' },
  { value: 'desktop', label: '桌面系列', icon: 'desktop' },
  { value: 'portable', label: '便携系列', icon: 'portable' },
  { value: 'history', label: '历史产品', icon: 'history' }
]

// 文件类型（带图标）
const fileTypes = [
  { value: 'all', label: '全部类型', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>' },
  { value: 'firmware', label: '固件', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>' },
  { value: 'driver', label: '驱动程序', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>' },
  { value: 'manual', label: '使用说明', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>' },
  { value: 'software', label: '软件工具', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>' },
  { value: 'other', label: '其他', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>' }
]

// Computed
const filteredDownloads = computed(() => {
  let result = downloads.value
  
  // Filter by category
  if (filterCategory.value !== 'all') {
    result = result.filter(d => d.download_category === filterCategory.value)
  }
  
  // Filter by type
  if (filterType.value !== 'all') {
    result = result.filter(d => d.file_type === filterType.value)
  }
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(d => 
      d.title.toLowerCase().includes(query) ||
      d.version?.toLowerCase().includes(query) ||
      d.original_filename?.toLowerCase().includes(query) ||
      d.product?.name?.toLowerCase().includes(query)
    )
  }
  
  return result
})

// 各分类的下载数量
const categoryCounts = computed(() => {
  const counts = { all: downloads.value.length }
  categories.forEach(cat => {
    if (cat.value !== 'all') {
      counts[cat.value] = downloads.value.filter(d => d.download_category === cat.value).length
    }
  })
  return counts
})

// Load data
onMounted(async () => {
  isLoading.value = true
  
  try {
    const { data: downloadsData } = await supabase
      .from('downloads')
      .select(`
        *,
        product:products(id, name, model)
      `)
      .eq('is_active', true)
      .order('download_category')
      .order('created_at', { ascending: false })
    
    downloads.value = downloadsData || []
  } finally {
    isLoading.value = false
  }
})

/**
 * Toggle expand row
 */
function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

/**
 * Handle download with original filename
 */
async function handleDownload(download) {
  // Increment download count
  await supabase.rpc('increment_download_count', { download_id: download.id })
  
  // 使用原始文件名下载
  if (download.original_filename) {
    // 创建一个隐藏的下载链接，强制使用原始文件名
    const response = await fetch(download.file_url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = download.original_filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } else {
    // 无原始文件名时直接打开
    window.open(download.file_url, '_blank')
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
 * Get type label
 */
function getTypeLabel(type) {
  return fileTypes.find(t => t.value === type)?.label || type
}

/**
 * Get type badge class
 */
function getTypeBadgeClass(type) {
  const classes = {
    firmware: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    driver: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    manual: 'bg-green-500/20 text-green-400 border-green-500/30',
    software: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
  return classes[type] || classes.other
}

/**
 * Get category icon
 */
function getCategoryIcon(value) {
  const icons = {
    grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    desktop: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    portable: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    history: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  }
  return icons[value] || icons.grid
}

/**
 * Format date
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="downloads-page pt-20 min-h-screen bg-aune-950">
    <!-- Hero Section -->
    <section class="py-16 bg-gradient-to-b from-aune-900 to-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          v-scroll-animate="{ type: 'fade-up' }"
          class="text-center"
        >
          <h1 class="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            下载中心
          </h1>
          <p class="text-aune-400 max-w-2xl mx-auto text-lg">
            获取最新固件、驱动程序和使用说明
          </p>
        </div>
      </div>
    </section>
    
    <!-- Main Content -->
    <section class="py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col lg:flex-row gap-8">
          
          <!-- 左侧垂直导航 -->
          <aside class="lg:w-64 flex-shrink-0">
            <div class="sticky top-28 bg-aune-900/50 rounded-2xl border border-aune-700/50 p-4">
              <h3 class="text-aune-400 text-sm font-medium uppercase tracking-wider mb-4 px-2">
                产品分类
              </h3>
              
              <nav class="space-y-1">
                <button
                  v-for="cat in categories"
                  :key="cat.value"
                  @click="filterCategory = cat.value"
                  :class="[
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                    filterCategory === cat.value
                      ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                      : 'text-aune-300 hover:bg-aune-800/50 hover:text-white border border-transparent'
                  ]"
                >
                  <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getCategoryIcon(cat.icon)" />
                  </svg>
                  <span class="flex-1 font-medium">{{ cat.label }}</span>
                  <span 
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full',
                      filterCategory === cat.value
                        ? 'bg-gold-500/30 text-gold-400'
                        : 'bg-aune-700/50 text-aune-400'
                    ]"
                  >
                    {{ categoryCounts[cat.value] || 0 }}
                  </span>
                </button>
              </nav>
              
              <!-- 文件类型过滤 -->
              <div class="mt-6 pt-6 border-t border-aune-700/50">
                <h3 class="text-aune-400 text-sm font-medium uppercase tracking-wider mb-3 px-2">
                  文件类型
                </h3>
                <CustomSelect
                  v-model="filterType"
                  :options="fileTypes"
                  placeholder="选择类型"
                  size="sm"
                />
              </div>
            </div>
          </aside>
          
          <!-- 右侧内容区 -->
          <main class="flex-1 min-w-0">
            <!-- 搜索栏 -->
            <div class="mb-6">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索资源名称、版本号..."
                  class="w-full pl-12 pr-4 py-3 bg-aune-900/50 border border-aune-700/50 rounded-xl text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent"
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
              <p class="mt-4 text-aune-400">加载中...</p>
            </div>
            
            <!-- Empty State -->
            <div 
              v-else-if="filteredDownloads.length === 0"
              class="text-center py-20 bg-aune-900/30 rounded-2xl border border-aune-700/50"
            >
              <div class="w-20 h-20 mx-auto bg-aune-800 rounded-full flex items-center justify-center mb-4">
                <svg class="w-10 h-10 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h3 class="text-white font-medium mb-2">暂无下载资源</h3>
              <p class="text-aune-500">请尝试调整筛选条件</p>
            </div>
            
            <!-- Downloads List -->
            <div v-else class="space-y-4">
              <div
                v-for="(download, index) in filteredDownloads"
                :key="download.id"
                v-scroll-animate="{ type: 'fade-up', delay: index * 50 }"
                class="bg-aune-900/50 rounded-xl border border-aune-700/50 overflow-hidden hover:border-aune-600/50 transition-colors"
              >
                <!-- Row Header -->
                <div 
                  @click="toggleExpand(download.id)"
                  class="flex items-center gap-4 p-4 cursor-pointer hover:bg-aune-800/30 transition-colors"
                >
                  <!-- Icon -->
                  <div class="w-14 h-14 bg-aune-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg class="w-7 h-7 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 class="text-white font-medium">{{ download.title }}</h3>
                      <span :class="['px-2 py-0.5 text-xs font-medium rounded border', getTypeBadgeClass(download.file_type)]">
                        {{ getTypeLabel(download.file_type) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-aune-400 flex-wrap">
                      <span v-if="download.version" class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        v{{ download.version }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        {{ formatSize(download.file_size) }}
                      </span>
                      <span v-if="download.product" class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        {{ download.product.name }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ formatDate(download.created_at) }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Expand Icon -->
                  <svg 
                    :class="['w-5 h-5 text-aune-400 transition-transform flex-shrink-0', expandedId === download.id ? 'rotate-180' : '']"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                <!-- Expanded Content -->
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-[500px]"
                  leave-active-class="transition-all duration-200 ease-in"
                  leave-from-class="opacity-100 max-h-[500px]"
                  leave-to-class="opacity-0 max-h-0"
                >
                  <div v-if="expandedId === download.id" class="overflow-hidden">
                    <div class="px-4 pb-4 pt-0">
                      <div class="p-4 bg-aune-800/30 rounded-lg border-t border-aune-700/50">
                        <!-- Original Filename -->
                        <div v-if="download.original_filename" class="mb-4 p-3 bg-aune-900/50 rounded-lg">
                          <span class="text-aune-400 text-sm">文件名：</span>
                          <span class="text-white font-mono text-sm">{{ download.original_filename }}</span>
                        </div>
                        
                        <!-- Description -->
                        <div 
                          v-if="download.description_html"
                          class="prose prose-sm prose-invert max-w-none mb-6"
                          v-html="download.description_html"
                        ></div>
                        
                        <p v-else class="text-aune-500 mb-6">暂无详细说明</p>
                        
                        <!-- Stats & Download -->
                        <div class="flex items-center justify-between flex-wrap gap-4">
                          <span class="text-aune-400 text-sm">
                            已下载 {{ download.download_count || 0 }} 次
                          </span>
                          
                          <button
                            @click.stop="handleDownload(download)"
                            class="px-6 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center gap-2 shadow-lg shadow-gold-500/20"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            下载文件
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
            
            <!-- Results Count -->
            <div v-if="!isLoading && filteredDownloads.length > 0" class="mt-8 text-center text-aune-500 text-sm">
              共 {{ filteredDownloads.length }} 个资源
            </div>
          </main>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Prose styles for description */
.downloads-page .prose h1,
.downloads-page .prose h2,
.downloads-page .prose h3 {
  color: #fff;
}

.downloads-page .prose p {
  color: #b8b8c1;
}

.downloads-page .prose ul {
  color: #b8b8c1;
}

.downloads-page .prose li::marker {
  color: #d4a056;
}

.downloads-page .prose a {
  color: #d4a056;
}

.downloads-page .prose strong {
  color: #fff;
}

.downloads-page .prose code {
  background: #41414a;
  color: #d4a056;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}
</style>
