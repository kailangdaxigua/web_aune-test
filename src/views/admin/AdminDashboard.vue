<script setup>
/**
 * Admin Dashboard
 * Shows visit stats and recent activity
 */
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const isLoading = ref(true)
const stats = ref({
  todayPV: 0,
  todayUV: 0,
  totalProducts: 0,
  totalDownloads: 0
})
const recentVisits = ref([])
const downloadStats = ref([])

// Load dashboard data
onMounted(async () => {
  isLoading.value = true
  
  try {
    await Promise.all([
      loadTodayStats(),
      loadRecentVisits(),
      loadGeneralStats()
    ])
  } finally {
    isLoading.value = false
  }
})

/**
 * Load today's visit statistics
 */
async function loadTodayStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data, error } = await supabase
    .from('visit_logs')
    .select('ip_address')
    .gte('visited_at', today.toISOString())
  
  if (!error && data) {
    stats.value.todayPV = data.length
    stats.value.todayUV = new Set(data.map(v => v.ip_address)).size
  }
}

/**
 * Load recent visits
 */
async function loadRecentVisits() {
  const { data, error } = await supabase
    .from('visit_logs')
    .select('*')
    .order('visited_at', { ascending: false })
    .limit(20)
  
  if (!error) {
    recentVisits.value = data || []
  }
}

/**
 * Load general stats
 */
async function loadGeneralStats() {
  // Products count
  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  
  stats.value.totalProducts = productsCount || 0
  
  // Downloads count
  const { count: downloadsCount } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  
  stats.value.totalDownloads = downloadsCount || 0
  
  // Top downloads
  const { data: topDownloads } = await supabase
    .from('downloads')
    .select('title, download_count')
    .eq('is_active', true)
    .order('download_count', { ascending: false })
    .limit(5)
  
  downloadStats.value = topDownloads || []
}

/**
 * Format date
 */
function formatTime(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get device icon
 */
function getDeviceIcon(type) {
  switch (type) {
    case 'mobile':
      return 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
    case 'tablet':
      return 'M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    default:
      return 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
  }
}
</script>

<template>
  <div class="admin-dashboard">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Today PV -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>
        <p class="text-aune-400 text-sm mb-1">今日浏览量 (PV)</p>
        <p class="text-3xl font-bold text-white">{{ stats.todayPV.toLocaleString() }}</p>
      </div>
      
      <!-- Today UV -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <p class="text-aune-400 text-sm mb-1">今日访客数 (UV)</p>
        <p class="text-3xl font-bold text-white">{{ stats.todayUV.toLocaleString() }}</p>
      </div>
      
      <!-- Total Products -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
        <p class="text-aune-400 text-sm mb-1">在线产品数</p>
        <p class="text-3xl font-bold text-white">{{ stats.totalProducts }}</p>
      </div>
      
      <!-- Total Downloads -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
        </div>
        <p class="text-aune-400 text-sm mb-1">下载资源数</p>
        <p class="text-3xl font-bold text-white">{{ stats.totalDownloads }}</p>
      </div>
    </div>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recent Visits -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden">
        <div class="px-6 py-4 border-b border-aune-700/50">
          <h3 class="text-lg font-semibold text-white">最近访问</h3>
        </div>
        
        <div class="overflow-auto max-h-96">
          <table class="w-full">
            <thead class="bg-aune-900/50 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">IP地址</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">页面</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">设备</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">时间</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-aune-700/50">
              <tr 
                v-for="visit in recentVisits" 
                :key="visit.id"
                class="hover:bg-aune-700/20"
              >
                <td class="px-4 py-3 text-sm text-aune-300 font-mono">
                  {{ visit.ip_address }}
                </td>
                <td class="px-4 py-3 text-sm text-aune-300 truncate max-w-[200px]" :title="visit.page_url">
                  {{ visit.page_url }}
                </td>
                <td class="px-4 py-3">
                  <svg class="w-5 h-5 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getDeviceIcon(visit.device_type)" />
                  </svg>
                </td>
                <td class="px-4 py-3 text-sm text-aune-400">
                  {{ formatTime(visit.visited_at) }}
                </td>
              </tr>
              
              <tr v-if="recentVisits.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-aune-500">
                  暂无访问记录
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Top Downloads -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden">
        <div class="px-6 py-4 border-b border-aune-700/50">
          <h3 class="text-lg font-semibold text-white">热门下载</h3>
        </div>
        
        <div class="p-6 space-y-4">
          <div 
            v-for="(download, index) in downloadStats" 
            :key="index"
            class="flex items-center gap-4"
          >
            <span class="w-6 h-6 bg-gold-500/20 rounded-full flex items-center justify-center text-gold-500 text-sm font-medium">
              {{ index + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm truncate">{{ download.title }}</p>
            </div>
            <span class="text-aune-400 text-sm">
              {{ download.download_count || 0 }} 次
            </span>
          </div>
          
          <div v-if="downloadStats.length === 0" class="text-center py-8 text-aune-500">
            暂无下载数据
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <router-link
        to="/admin/products/new"
        class="p-4 bg-aune-800/50 rounded-xl border border-aune-700/50 hover:border-gold-500/50 transition-colors group"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center group-hover:bg-gold-500/30 transition-colors">
            <svg class="w-5 h-5 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span class="text-white font-medium">添加产品</span>
        </div>
      </router-link>
      
      <router-link
        to="/admin/downloads"
        class="p-4 bg-aune-800/50 rounded-xl border border-aune-700/50 hover:border-gold-500/50 transition-colors group"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <span class="text-white font-medium">上传资源</span>
        </div>
      </router-link>
      
      <router-link
        to="/admin/news"
        class="p-4 bg-aune-800/50 rounded-xl border border-aune-700/50 hover:border-gold-500/50 transition-colors group"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <span class="text-white font-medium">发布新闻</span>
        </div>
      </router-link>
      
      <router-link
        to="/admin/config"
        class="p-4 bg-aune-800/50 rounded-xl border border-aune-700/50 hover:border-gold-500/50 transition-colors group"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="text-white font-medium">站点配置</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

