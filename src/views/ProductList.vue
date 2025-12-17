<script setup>
/**
 * Product List Page by Category
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { vScrollAnimate } from '@/composables/useScrollAnimation'

const route = useRoute()
const router = useRouter()

// State
const products = ref([])
const category = ref(null)
const isLoading = ref(true)

// Computed
const categorySlug = computed(() => route.params.category)

// Load products
async function loadProducts() {
  isLoading.value = true
  
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq('is_active', true)
      .order('sort_order')
    
    // Filter by category if not "all"
    if (categorySlug.value && categorySlug.value !== 'all') {
      // First get category
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', categorySlug.value)
        .single()
      
      category.value = catData
      
      if (catData) {
        query = query.eq('category_id', catData.id)
      }
    } else {
      category.value = null
    }
    
    const { data, error } = await query
    
    if (error) throw error
    products.value = data || []
  } finally {
    isLoading.value = false
  }
}

// Navigate to product
function goToProduct(slug) {
  router.push(`/product/${slug}`)
}

// Watch for route changes
watch(() => route.params.category, () => {
  loadProducts()
})

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <div class="product-list-page pt-20">
    <!-- Hero Section -->
    <section class="py-20 bg-gradient-to-b from-aune-900 to-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          v-scroll-animate="{ type: 'fade-up' }"
          class="text-center"
        >
          <h1 class="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            {{ category?.name || '全部产品' }}
          </h1>
          <p v-if="category?.description" class="text-aune-400 max-w-2xl mx-auto text-lg">
            {{ category.description }}
          </p>
        </div>
      </div>
    </section>
    
    <!-- Products Grid -->
    <section class="py-16 bg-aune-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Loading -->
        <div v-if="isLoading" class="text-center py-16">
          <svg class="animate-spin w-12 h-12 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-4 text-aune-400">加载中...</p>
        </div>
        
        <!-- Empty State -->
        <div 
          v-else-if="products.length === 0"
          class="text-center py-16"
        >
          <div class="w-20 h-20 mx-auto bg-aune-800 rounded-full flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 class="text-white font-medium mb-2">暂无产品</h3>
          <p class="text-aune-500">该分类下暂无产品</p>
        </div>
        
        <!-- Products -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="(product, index) in products"
            :key="product.id"
            v-scroll-animate="{ type: 'fade-up', delay: index * 100 }"
            @click="goToProduct(product.slug)"
            class="group cursor-pointer"
          >
            <div class="relative aspect-[4/3] bg-aune-900 rounded-2xl overflow-hidden mb-4">
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
                <svg class="w-20 h-20 text-aune-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <!-- Badges -->
              <div class="absolute top-3 left-3 flex gap-2">
                <span v-if="product.is_hot" class="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                  HOT
                </span>
                <span v-if="product.is_new" class="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                  NEW
                </span>
              </div>
              
              <!-- Hover Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span class="text-gold-500 font-medium flex items-center gap-2">
                  查看详情
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
            
            <div>
              <h3 class="text-xl text-white font-medium group-hover:text-gold-500 transition-colors mb-1">
                {{ product.name }}
              </h3>
              <p class="text-aune-400 text-sm mb-2">{{ product.model }}</p>
              <p v-if="product.short_description" class="text-aune-500 text-sm line-clamp-2">
                {{ product.short_description }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Results Count -->
        <div v-if="!isLoading && products.length > 0" class="mt-12 text-center text-aune-500 text-sm">
          共 {{ products.length }} 个产品
        </div>
      </div>
    </section>
  </div>
</template>

