<script setup>
/**
 * Home Page
 * Carousel, video module, hot products grid
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSiteStore } from '@/stores/siteStore'
import { vScrollAnimate } from '@/composables/useScrollAnimation'
import HomeCarousel from '@/components/HomeCarousel.vue'
import HomeVideo from '@/components/HomeVideo.vue'

const router = useRouter()
const siteStore = useSiteStore()

// State
const hotProducts = ref([])
const isLoading = ref(true)

// Navigate to product
function goToProduct(slug) {
  router.push(`/product/${slug}`)
}

// Load data
onMounted(async () => {
  isLoading.value = true
  
  try {
    hotProducts.value = await siteStore.getHotProducts(8)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Carousel -->
    <HomeCarousel />
    
    <!-- Video Section -->
    <HomeVideo />
    
    <!-- Hot Products Section -->
    <section class="py-24 bg-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Section Header -->
        <div 
          v-scroll-animate="{ type: 'fade-up' }"
          class="text-center mb-16"
        >
          <h2 class="text-4xl font-display font-bold text-white mb-4">
            热门产品
          </h2>
          <p class="text-aune-400 max-w-2xl mx-auto">
            精选人气产品，感受卓越音质
          </p>
        </div>
        
        <!-- Products Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div
            v-for="(product, index) in hotProducts"
            :key="product.id"
            v-scroll-animate="{ type: 'scale-in', delay: index * 100 }"
            @click="goToProduct(product.slug)"
            class="group cursor-pointer"
          >
            <div class="relative aspect-square bg-aune-900 rounded-2xl overflow-hidden mb-4">
              <img
                v-if="product.cover_image"
                :src="product.cover_image"
                :alt="product.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div 
                v-else
                class="w-full h-full flex items-center justify-center"
              >
                <svg class="w-16 h-16 text-aune-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <!-- Hover Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span class="text-gold-500 font-medium flex items-center gap-2">
                  查看详情
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
              
              <!-- Hot Badge -->
              <div class="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                HOT
              </div>
            </div>
            
            <div class="text-center">
              <h3 class="text-white font-medium group-hover:text-gold-500 transition-colors">
                {{ product.name }}
              </h3>
              <p v-if="product.category" class="text-aune-500 text-sm mt-1">
                {{ product.category.name }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div 
          v-if="!isLoading && hotProducts.length === 0"
          class="text-center py-16"
        >
          <p class="text-aune-500">暂无热门产品</p>
        </div>
        
        <!-- View All Link -->
        <div 
          v-if="hotProducts.length > 0"
          v-scroll-animate="{ type: 'fade-up', delay: 400 }"
          class="text-center mt-12"
        >
          <router-link
            to="/products/all"
            class="inline-flex items-center gap-2 px-8 py-3 border border-gold-500 text-gold-500 font-medium rounded-lg hover:bg-gold-500 hover:text-white transition-all"
          >
            查看全部产品
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </router-link>
        </div>
      </div>
    </section>
    
    <!-- Brand Story Section -->
    <section class="py-24 bg-aune-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-16 items-center">
          <div v-scroll-animate="{ type: 'fade-right' }">
            <span class="text-gold-500 font-medium mb-2 block">关于 aune</span>
            <h2 class="text-4xl font-display font-bold text-white mb-6">
              追求极致的音频体验
            </h2>
            <p class="text-aune-300 mb-6 leading-relaxed">
              aune 成立于2004年，专注于高端音频设备的研发与制造。
              我们相信，优质的音频设备能够让每个人都能享受到纯粹的音乐之美。
            </p>
            <p class="text-aune-300 mb-8 leading-relaxed">
              从解码器到耳放，从数播到时钟，aune 始终坚持原创设计，
              采用顶级元器件，为发烧友带来极致的听觉享受。
            </p>
            <router-link
              to="/about"
              class="inline-flex items-center gap-2 text-gold-500 font-medium hover:text-gold-400 transition-colors"
            >
              了解更多
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>
          </div>
          
          <div 
            v-scroll-animate="{ type: 'scale-in', delay: 200 }"
            class="relative"
          >
            <div class="aspect-[4/3] bg-aune-800 rounded-2xl overflow-hidden">
              <div class="w-full h-full bg-gradient-to-br from-gold-500/20 to-transparent flex items-center justify-center">
                <span class="text-6xl font-display font-bold text-white/10">AUNE</span>
              </div>
            </div>
            
            <!-- Decorative Elements -->
            <div class="absolute -bottom-6 -right-6 w-32 h-32 bg-gold-500/10 rounded-2xl -z-10"></div>
            <div class="absolute -top-6 -left-6 w-24 h-24 border border-gold-500/30 rounded-2xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

