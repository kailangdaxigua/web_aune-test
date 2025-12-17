<script setup>
/**
 * 404 Not Found Page
 */
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-aune-950 flex items-center justify-center px-4">
    <div class="text-center">
      <!-- 404 Number -->
      <div class="relative mb-8">
        <span class="text-[200px] md:text-[300px] font-display font-bold text-aune-800/50 leading-none select-none">
          404
        </span>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-6xl md:text-8xl font-display font-bold text-white">
            404
          </span>
        </div>
      </div>
      
      <!-- Message -->
      <h1 class="text-2xl md:text-3xl font-display font-bold text-white mb-4">
        页面未找到
      </h1>
      <p class="text-aune-400 mb-8 max-w-md mx-auto">
        抱歉，您访问的页面不存在或已被移除。请检查网址是否正确，或返回首页。
      </p>
      
      <!-- Actions -->
      <div class="flex items-center justify-center gap-4">
        <button
          @click="goBack"
          class="px-6 py-3 border border-aune-600 text-aune-300 rounded-lg hover:bg-aune-800/50 transition-colors"
        >
          返回上页
        </button>
        <button
          @click="goHome"
          class="px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all"
        >
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>

