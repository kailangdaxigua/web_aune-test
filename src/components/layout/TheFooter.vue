<script setup>
/**
 * Site Footer Component
 * Dynamic footer with configurable columns from footer_links table
 */
import { computed } from 'vue'
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()

// 页脚链接分组
const purchaseChannels = computed(() => siteStore.footerLinks['purchase_channels'] || [])
const aboutAune = computed(() => siteStore.footerLinks['about_aune'] || [])
const serviceSupport = computed(() => siteStore.footerLinks['service_support'] || [])
const officialPlatforms = computed(() => siteStore.footerLinks['official_platforms'] || [])

// 站点配置
const hotline = computed(() => siteStore.hotline)
const copyrightText = computed(() => siteStore.copyrightText || `© ${new Date().getFullYear()} Aune Audio. All rights reserved.`)
const icpNumber = computed(() => siteStore.icpNumber)

// 分组标题映射
const groupTitles = {
  purchase_channels: '购买渠道',
  about_aune: '关于aune',
  service_support: '服务支持',
  official_platforms: '官方平台'
}

// 社交平台图标
const socialIcons = {
  'icon-weibo': `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.443zm-1.771-1.697c1.921-.371 2.793-1.912 2.01-3.489-.756-1.533-2.776-2.239-4.576-1.564-1.809.667-2.582 2.412-1.678 3.876.883 1.48 2.498 1.582 4.244 1.177zm1.678-1.533c-.319-.628-1.13-.883-1.797-.539-.675.341-.91 1.085-.535 1.652.367.567 1.153.852 1.788.531.666-.302.836-1.038.544-1.644zm.578-1.114c-.128-.241-.441-.361-.694-.258-.253.107-.349.391-.215.627.133.237.441.346.693.239.25-.102.348-.38.216-.608zM20.5 3.5L16 8H8V2h12.5zM16.003 5H10v1.5h6.003V5z"/></svg>`,
  'icon-wechat': `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.95-6.609 1.12-1.022 2.96-1.88 5.002-2.081-.476-2.937-3.66-5.942-7.753-5.942zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89l-.006-.032zM13.023 12.61c.533 0 .963.44.963.98a.972.972 0 01-.963.98.972.972 0 01-.966-.98c0-.54.433-.98.966-.98zm4.822 0c.533 0 .966.44.966.98a.972.972 0 01-.966.98.972.972 0 01-.963-.98c0-.54.43-.98.963-.98z"/></svg>`,
  'icon-tieba': `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13H9v8h2V7zm4 0h-2v8h2V7z"/></svg>`,
  'icon-qq': `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29.43 2.212 0 6.29.256 6.29-.43 0-.687-1.77-1.182-1.77-1.182 2.085-1.77 1.905-3.967 1.905-3.967.845 1.588 1.634 2.072 1.746 2.072.111 0 .283-.36.283-1.025 0-2.514-2.166-6.954-2.166-6.954V9.325C18.29 3.364 14.268 2 12.003 2z"/></svg>`
}

/**
 * 获取社交图标 HTML
 */
function getSocialIcon(iconClass) {
  return socialIcons[iconClass] || ''
}
</script>

<template>
  <footer class="bg-white border-t border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <!-- Main Footer Content -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
        <!-- 购买渠道 -->
        <div>
          <h3 class="text-gray-900 font-semibold mb-4">购买渠道</h3>
          <ul class="space-y-3">
            <li v-for="link in purchaseChannels" :key="link.id">
              <a
                v-if="link.is_external"
                :href="link.resolved_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-500 hover:text-gold-600 transition-colors text-sm"
              >
                {{ link.label }}
              </a>
              <router-link
                v-else
                :to="link.resolved_url"
                class="text-gray-500 hover:text-gold-600 transition-colors text-sm"
              >
                {{ link.label }}
              </router-link>
            </li>
          </ul>
        </div>
        
        <!-- 关于aune -->
        <div>
          <h3 class="text-gray-900 font-semibold mb-4">关于aune</h3>
          <ul class="space-y-3">
            <li v-for="link in aboutAune" :key="link.id">
              <a
                v-if="link.is_external"
                :href="link.resolved_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-500 hover:text-gold-600 transition-colors text-sm"
              >
                {{ link.label }}
              </a>
              <router-link
                v-else
                :to="link.resolved_url"
                class="text-gray-500 hover:text-gold-600 transition-colors text-sm"
              >
                {{ link.label }}
              </router-link>
            </li>
          </ul>
        </div>
        
        <!-- 服务支持 -->
        <div>
          <h3 class="text-gray-900 font-semibold mb-4">服务支持</h3>
          <ul class="space-y-3">
            <li v-for="link in serviceSupport" :key="link.id">
              <a
                v-if="link.is_external"
                :href="link.resolved_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-500 hover:text-gold-600 transition-colors text-sm"
              >
                {{ link.label }}
              </a>
              <router-link
                v-else
                :to="link.resolved_url"
                class="text-gray-500 hover:text-gold-600 transition-colors text-sm"
              >
                {{ link.label }}
              </router-link>
            </li>
          </ul>
        </div>
        
        <!-- 官方平台 -->
        <div>
          <h3 class="text-gray-900 font-semibold mb-4">官方平台</h3>
          <ul class="space-y-3">
            <li v-for="link in officialPlatforms" :key="link.id">
              <a
                :href="link.resolved_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-500 hover:text-gold-600 transition-colors text-sm flex items-center gap-2"
              >
                <span 
                  v-if="link.icon_class"
                  v-html="getSocialIcon(link.icon_class)"
                  class="text-gold-500"
                ></span>
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- Hotline & Copyright -->
      <div class="mt-12 pt-8 border-t border-gray-100">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <!-- Logo & Copyright -->
          <div class="flex flex-col md:flex-row items-center gap-4">
            <span class="text-xl font-display font-bold text-gray-900">
              AUNE<span class="text-gold-500">.</span>
            </span>
            <span class="text-gray-400 text-sm">
              {{ copyrightText }}
            </span>
            <span v-if="icpNumber" class="text-gray-400 text-sm">
              {{ icpNumber }}
            </span>
          </div>
          
          <!-- Service Hotline -->
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span class="text-gray-600 text-sm">官方服务热线：</span>
            <a :href="`tel:${hotline}`" class="text-gold-600 font-semibold hover:text-gold-500 transition-colors">
              {{ hotline }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
