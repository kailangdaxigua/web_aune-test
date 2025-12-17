<script setup>
/**
 * Site Configuration Manager
 * 
 * 包含配置项：
 * - SEO 设置（标题、描述）
 * - 首页视频
 * - 服务支持配置（在线客服链接）
 * - 经销商配置（申请链接）
 * - 页脚配置
 */
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const config = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Load config
onMounted(async () => {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .single()
    
    if (error) throw error
    config.value = data
  } finally {
    isLoading.value = false
  }
})

// Save config
async function saveConfig() {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const { error } = await supabase
      .from('site_config')
      .update({
        nav_structure: config.value.nav_structure,
        footer_structure: config.value.footer_structure,
        carousel_images: config.value.carousel_images,
        home_video_url: config.value.home_video_url,
        home_video_enabled: config.value.home_video_enabled,
        site_title: config.value.site_title,
        site_description: config.value.site_description,
        hotline: config.value.hotline,
        // 在线客服链接
        qq_service_link: config.value.qq_service_link,
        online_service_url: config.value.online_service_url || config.value.qq_service_link,
        // 经销商申请链接
        dealer_apply_link: config.value.dealer_apply_link,
        // ICP 备案
        icp_number: config.value.icp_number,
        copyright_text: config.value.copyright_text
      })
      .eq('id', config.value.id)
    
    if (error) throw error
    successMessage.value = '保存成功'
  } catch (error) {
    errorMessage.value = '保存失败: ' + error.message
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="site-config">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">站点配置</h1>
      
      <button
        @click="saveConfig"
        :disabled="isSaving"
        class="px-6 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 transition-all"
      >
        {{ isSaving ? '保存中...' : '保存配置' }}
      </button>
    </div>
    
    <!-- Messages -->
    <div v-if="successMessage" class="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage" class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
      {{ errorMessage }}
    </div>
    
    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16">
      <svg class="animate-spin w-12 h-12 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <!-- Config Form -->
    <div v-else-if="config" class="space-y-6">
      <!-- SEO Settings -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">SEO 设置</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">网站标题</label>
            <input
              v-model="config.site_title"
              type="text"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">网站描述</label>
            <textarea
              v-model="config.site_description"
              rows="2"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            ></textarea>
          </div>
        </div>
      </div>
      
      <!-- 服务支持配置 -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">服务支持配置</h3>
            <p class="text-aune-400 text-sm">配置在线客服等服务入口</p>
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              在线客服链接
              <span class="text-aune-500 font-normal">（QQ 客服）</span>
            </label>
            <input
              v-model="config.qq_service_link"
              type="url"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="https://wpa.qq.com/msgrd?v=3&uin=123456789&site=qq&menu=yes"
            />
            <p class="mt-1 text-aune-500 text-xs">
              用于"服务支持"页面的"在线客服"入口和 FAQ 底部"联系在线客服"链接
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">服务热线</label>
            <input
              v-model="config.hotline"
              type="tel"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="027-85420526"
            />
          </div>
        </div>
      </div>
      
      <!-- 经销商配置 -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">经销商配置</h3>
            <p class="text-aune-400 text-sm">配置经销商相关入口链接</p>
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              申请成为经销商链接
            </label>
            <input
              v-model="config.dealer_apply_link"
              type="text"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="/page/dealer-apply"
            />
            <p class="mt-1 text-aune-500 text-xs">
              用于"经销商"页面右下角悬浮按钮的跳转目标
            </p>
          </div>
        </div>
      </div>
      
      <!-- Home Video -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">首页视频</h3>
        
        <div class="space-y-4">
          <label class="flex items-center gap-2">
            <input 
              v-model="config.home_video_enabled" 
              type="checkbox" 
              class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50" 
            />
            <span class="text-aune-300">启用首页视频</span>
          </label>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">视频 URL</label>
            <input
              v-model="config.home_video_url"
              type="url"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>
      
      <!-- 备案信息 -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">备案信息</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">ICP 备案号</label>
            <input
              v-model="config.icp_number"
              type="text"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="鄂ICP备XXXXXXXX号"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">版权声明</label>
            <input
              v-model="config.copyright_text"
              type="text"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="© 2024 Aune Audio. All rights reserved."
            />
          </div>
        </div>
      </div>
      
      <!-- Footer Config Preview -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">页脚配置（高级）</h3>
        <p class="text-aune-400 text-sm mb-4">页脚结构以 JSON 格式存储，仅高级用户编辑</p>
        
        <textarea
          v-model="config.footer_structure"
          rows="10"
          class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white font-mono text-sm placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
        ></textarea>
      </div>
    </div>
  </div>
</template>
