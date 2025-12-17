<script setup>
/**
 * Admin Layout with Sidebar Navigation
 */
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const isSidebarOpen = ref(true)

// Navigation items
const navItems = [
  { 
    name: '数据看板', 
    path: '/admin/dashboard', 
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  },
  { 
    name: '产品管理', 
    path: '/admin/products', 
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
  },
  { 
    name: '下载资源', 
    path: '/admin/downloads', 
    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10'
  },
  { 
    name: '新闻管理', 
    path: '/admin/news', 
    icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
  },
  { 
    name: '页面管理', 
    path: '/admin/pages', 
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  },
  { 
    name: '经销商管理', 
    path: '/admin/dealers', 
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
  },
  { 
    name: 'FAQ管理', 
    path: '/admin/faqs', 
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  { 
    name: '轮播图管理', 
    path: '/admin/carousel', 
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
  },
  { 
    name: '首页视频', 
    path: '/admin/videos', 
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
  },
  { 
    name: '页脚链接', 
    path: '/admin/footer-links', 
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
  },
  { 
    name: '站点配置', 
    path: '/admin/config', 
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  }
]

// Check if current route matches nav item
function isActiveRoute(path) {
  return route.path.startsWith(path)
}

// Handle logout
async function handleLogout() {
  await auth.signOut()
  router.push('/admin/login')
}
</script>

<template>
  <div class="admin-layout min-h-screen bg-aune-950 flex">
    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-aune-900 border-r border-aune-700/50 transition-all duration-300',
        isSidebarOpen ? 'w-64' : 'w-20'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center justify-between h-16 px-4 border-b border-aune-700/50">
        <router-link to="/admin/dashboard" class="flex items-center gap-2">
          <span class="text-xl font-display font-bold text-white">
            AUNE<span class="text-gold-500">.</span>
          </span>
          <span v-if="isSidebarOpen" class="text-aune-400 text-sm">Admin</span>
        </router-link>
        
        <button 
          @click="isSidebarOpen = !isSidebarOpen"
          class="p-2 hover:bg-aune-700/50 rounded-lg transition-colors lg:block hidden"
        >
          <svg class="w-5 h-5 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
            isActiveRoute(item.path)
              ? 'bg-gold-500/10 text-gold-500'
              : 'text-aune-300 hover:bg-aune-700/50 hover:text-white'
          ]"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
          </svg>
          <span v-if="isSidebarOpen" class="truncate">{{ item.name }}</span>
        </router-link>
      </nav>
      
      <!-- User Section -->
      <div class="p-4 border-t border-aune-700/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
            <span class="text-gold-500 font-medium">
              {{ auth.user.value?.email?.[0]?.toUpperCase() || 'A' }}
            </span>
          </div>
          
          <div v-if="isSidebarOpen" class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">
              {{ auth.user.value?.email }}
            </p>
            <router-link 
              to="/admin/profile" 
              class="text-aune-400 text-xs hover:text-gold-500 transition-colors"
            >
              个人设置
            </router-link>
          </div>
          
          <button
            @click="handleLogout"
            class="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            title="退出登录"
          >
            <svg class="w-5 h-5 text-aune-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
    
    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Bar -->
      <header class="h-16 bg-aune-900/50 border-b border-aune-700/50 flex items-center justify-between px-6">
        <h1 class="text-xl font-semibold text-white">
          {{ route.meta.title || '管理后台' }}
        </h1>
        
        <div class="flex items-center gap-4">
          <!-- Back to Site -->
          <a 
            href="/" 
            target="_blank"
            class="flex items-center gap-2 text-aune-400 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span class="text-sm">访问网站</span>
          </a>
        </div>
      </header>
      
      <!-- Page Content -->
      <main class="flex-1 p-6 overflow-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

