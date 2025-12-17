<script setup>
/**
 * Dealers Page
 * 经销商展示页面
 * Tab 1: 视听体验店（省市筛选，默认湖北省武汉市）
 * Tab 2: 授权网络店（纯文本展示）
 * 
 * 功能特性：
 * - 默认筛选湖北省武汉市
 * - 修复下拉框 z-index 问题
 * - 悬浮按钮可配置跳转链接
 * - 简化展示（不显示图片）
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { supabase } from '@/lib/supabase'
import { useSiteStore } from '@/stores/siteStore'
import { vScrollAnimate } from '@/composables/useScrollAnimation'
import CustomSelect from '@/components/ui/CustomSelect.vue'

const siteStore = useSiteStore()

// State
const activeTab = ref('offline')
const dealers = ref([])
const isLoading = ref(true)
const selectedProvince = ref('all')
const selectedCity = ref('all')
const isDataLoaded = ref(false)

// Tabs
const tabs = [
  { value: 'offline', label: '视听体验店', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { value: 'online', label: '授权网络店', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' }
]

// 经销商申请链接（从后台配置读取）
const dealerApplyLink = computed(() => {
  return siteStore.config?.dealer_apply_link || '/page/dealer-apply'
})

// 获取所有省份
const provinces = computed(() => {
  const offlineDealers = dealers.value.filter(d => d.dealer_type === 'offline')
  const uniqueProvinces = [...new Set(offlineDealers.map(d => d.province).filter(Boolean))]
  return [
    { value: 'all', label: '全部省份' },
    ...uniqueProvinces.map(p => ({ value: p, label: p }))
  ]
})

// 获取选中省份下的城市
const cities = computed(() => {
  if (selectedProvince.value === 'all') {
    return [{ value: 'all', label: '全部城市' }]
  }
  
  const offlineDealers = dealers.value.filter(d => 
    d.dealer_type === 'offline' && d.province === selectedProvince.value
  )
  const uniqueCities = [...new Set(offlineDealers.map(d => d.city).filter(Boolean))]
  return [
    { value: 'all', label: '全部城市' },
    ...uniqueCities.map(c => ({ value: c, label: c }))
  ]
})

// 线下经销商（筛选后）
const offlineDealers = computed(() => {
  let result = dealers.value.filter(d => d.dealer_type === 'offline')
  
  if (selectedProvince.value !== 'all') {
    result = result.filter(d => d.province === selectedProvince.value)
  }
  
  if (selectedCity.value !== 'all') {
    result = result.filter(d => d.city === selectedCity.value)
  }
  
  return result
})

// 线上经销商
const onlineDealers = computed(() => {
  return dealers.value.filter(d => d.dealer_type === 'online')
})

// 省份改变时重置城市
watch(selectedProvince, (newVal) => {
  // 如果不是默认加载时的设置，重置城市
  if (isDataLoaded.value) {
  selectedCity.value = 'all'
  }
})

// 设置默认筛选：湖北省武汉市
function setDefaultFilters() {
  // 检查是否有湖北省的数据
  const hasHubei = dealers.value.some(d => 
    d.dealer_type === 'offline' && d.province === '湖北省'
  )
  
  if (hasHubei) {
    selectedProvince.value = '湖北省'
    
    // 延迟设置城市，等待 cities computed 更新
    nextTick(() => {
      const hasWuhan = dealers.value.some(d => 
        d.dealer_type === 'offline' && d.province === '湖北省' && d.city === '武汉市'
      )
      if (hasWuhan) {
        selectedCity.value = '武汉市'
      }
      isDataLoaded.value = true
    })
  } else {
    isDataLoaded.value = true
  }
}

// 加载数据
onMounted(async () => {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) throw error
    dealers.value = data || []
    
    // 设置默认筛选
    setDefaultFilters()
  } catch (error) {
    console.error('Failed to load dealers:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="dealers-page pt-20 min-h-screen bg-aune-950">
    <!-- Hero Section -->
    <section class="py-16 bg-gradient-to-b from-aune-900 to-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          v-scroll-animate="{ type: 'fade-up' }"
          class="text-center"
        >
          <h1 class="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            经销商网络
          </h1>
          <p class="text-aune-400 max-w-2xl mx-auto text-lg">
            遍布全国的专业视听体验店与授权网络店
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
        
        <!-- Tab 1: 线下体验店 -->
        <div v-if="activeTab === 'offline'">
          <!-- 省市筛选 - 修复 z-index：使用 relative 和高 z-index -->
          <div 
            v-scroll-animate="{ type: 'fade-up' }"
            class="relative z-20 flex flex-wrap items-center gap-4 mb-8 p-4 bg-aune-900/50 rounded-2xl border border-aune-700/50"
            style="overflow: visible;"
          >
            <span class="text-aune-400 text-sm font-medium">筛选地区：</span>
            
            <!-- 省份下拉框 - 高 z-index -->
            <div class="w-48 relative z-[60]">
              <CustomSelect
                v-model="selectedProvince"
                :options="provinces"
                placeholder="选择省份"
                size="sm"
              />
            </div>
            
            <!-- 城市下拉框 - 略低 z-index -->
            <div class="w-48 relative z-[50]">
              <CustomSelect
                v-model="selectedCity"
                :options="cities"
                placeholder="选择城市"
                size="sm"
                :disabled="selectedProvince === 'all'"
              />
            </div>
            
            <span class="text-aune-500 text-sm ml-auto">
              共 {{ offlineDealers.length }} 家体验店
            </span>
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
            v-else-if="offlineDealers.length === 0"
            class="text-center py-20 bg-aune-900/30 rounded-2xl border border-aune-700/50"
          >
            <div class="w-20 h-20 mx-auto bg-aune-800 rounded-full flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="text-white font-medium mb-2">该地区暂无体验店</h3>
            <p class="text-aune-500">请选择其他省市或联系我们了解详情</p>
          </div>
          
          <!-- Dealers Grid - 简化版：不显示图片 -->
          <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="(dealer, index) in offlineDealers"
              :key="dealer.id"
              v-scroll-animate="{ type: 'fade-up', delay: index * 50 }"
              class="group bg-aune-900/50 rounded-2xl border border-aune-700/50 overflow-hidden hover:border-gold-500/30 transition-all p-5"
            >
              <!-- Header -->
              <div class="flex items-start justify-between mb-4">
                <h3 class="text-white font-semibold text-lg group-hover:text-gold-400 transition-colors">
                  {{ dealer.name }}
                </h3>
                  <span 
                    v-if="dealer.is_featured"
                  class="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full flex-shrink-0"
                  >
                    推荐
                  </span>
                </div>
                
              <!-- Info - 纯文本展示 -->
              <div class="space-y-3 text-sm text-aune-400">
                  <div class="flex items-start gap-2">
                    <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-gold-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{{ dealer.province }} {{ dealer.city }}</span>
                  </div>
                  
                  <div v-if="dealer.address" class="flex items-start gap-2">
                    <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  <span>{{ dealer.address }}</span>
                  </div>
                  
                  <div v-if="dealer.phone" class="flex items-center gap-2">
                    <svg class="w-4 h-4 flex-shrink-0 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a :href="'tel:' + dealer.phone" class="hover:text-gold-400 transition-colors">
                      {{ dealer.phone }}
                    </a>
                  </div>
                  
                  <div v-if="dealer.business_hours" class="flex items-center gap-2">
                    <svg class="w-4 h-4 flex-shrink-0 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ dealer.business_hours }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tab 2: 线上授权店 - 简化版：不显示图片和Logo -->
        <div v-else-if="activeTab === 'online'">
          <!-- Loading -->
          <div v-if="isLoading" class="text-center py-20">
            <svg class="animate-spin w-12 h-12 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          
          <!-- Online Stores Table - 简化版：纯文本 -->
          <div 
            v-else
            v-scroll-animate="{ type: 'fade-up' }"
            class="bg-aune-900/50 rounded-2xl border border-aune-700/50 overflow-hidden"
          >
            <table class="w-full">
              <thead class="bg-aune-800/50">
                <tr>
                  <th class="px-6 py-4 text-left text-sm font-medium text-aune-400 uppercase tracking-wider">店铺名称</th>
                  <th class="px-6 py-4 text-left text-sm font-medium text-aune-400 uppercase tracking-wider">授权平台</th>
                  <th class="px-6 py-4 text-right text-sm font-medium text-aune-400 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-aune-700/50">
                <tr 
                  v-for="dealer in onlineDealers"
                  :key="dealer.id"
                  class="hover:bg-aune-800/30 transition-colors"
                >
                  <td class="px-6 py-4">
                      <div>
                        <p class="text-white font-medium">{{ dealer.name }}</p>
                      <p v-if="dealer.description" class="text-aune-500 text-sm mt-1">{{ dealer.description }}</p>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <!-- 纯文本显示平台名称，不显示图标 -->
                    <span class="text-aune-300">
                      {{ dealer.platform }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <a
                      :href="dealer.store_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30 transition-colors"
                    >
                      前往店铺
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <!-- Empty -->
            <div 
              v-if="onlineDealers.length === 0"
              class="text-center py-16"
            >
              <div class="w-16 h-16 mx-auto bg-aune-800 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p class="text-aune-400">暂无授权网络店</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- CTA: 招商入口 - 动态链接从后台配置 -->
    <router-link
      :to="dealerApplyLink"
      class="fixed bottom-8 right-8 z-40 group"
    >
      <div class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-white rounded-2xl shadow-2xl shadow-gold-500/30 hover:shadow-gold-500/50 transition-all hover:scale-105">
        <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="text-left">
          <p class="text-xs text-white/80">诚邀您的加入</p>
          <p class="font-semibold">申请成为经销商</p>
        </div>
        <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </router-link>
  </div>
</template>

<style scoped>
/* 确保下拉框容器不会被裁剪 */
.dealers-page :deep(.custom-select) {
  position: relative;
}
</style>
