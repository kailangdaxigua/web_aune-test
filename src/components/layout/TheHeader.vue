<script setup>
/**
 * Site Header Component
 * Dynamic navigation with category dropdowns
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSiteStore } from '@/stores/siteStore'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const siteStore = useSiteStore()

// State
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
const activeDropdown = ref(null)
const categoryProducts = ref({})

// Computed
const categories = computed(() => siteStore.categories)

// Function links
const functionLinks = [
  { label: '服务支持', path: '/support' },
  { label: '荣誉墙', path: '/honors' },
  { label: '经销商', path: '/dealers' },
  { label: '官方店铺', url: '#', external: true }
]

// Handle scroll
function handleScroll() {
  isScrolled.value = window.scrollY > 50
}

// Load products for category dropdown
async function loadCategoryProducts(categorySlug) {
  if (categoryProducts.value[categorySlug]) return
  
  // 先获取分类ID
  const category = categories.value.find(c => c.slug === categorySlug)
  if (!category) return
  
  const { data } = await supabase
    .from('products')
    .select('id, name, slug, cover_image, nav_thumbnail')
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('sort_order')
    .limit(6)
  
  categoryProducts.value[categorySlug] = data || []
}

// Open dropdown
function openDropdown(categorySlug) {
  activeDropdown.value = categorySlug
  loadCategoryProducts(categorySlug)
}

// Close dropdown
function closeDropdown() {
  activeDropdown.value = null
}

// Navigate to product
function goToProduct(slug) {
  router.push(`/product/${slug}`)
  closeDropdown()
  isMobileMenuOpen.value = false
}

// Navigate to category
function goToCategory(slug) {
  router.push(`/products/${slug}`)
  closeDropdown()
  isMobileMenuOpen.value = false
}

// Lifecycle
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header 
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled 
        ? 'bg-aune-900/95 backdrop-blur-md shadow-lg' 
        : 'bg-transparent'
    ]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2">
          <img 
            src="@/assets/aune logo黑底.jpg" 
            alt="AUNE Logo" 
            class="h-10 w-auto object-contain"
          />
        </router-link>
        
        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-1">
          <!-- Category Dropdowns -->
          <div 
            v-for="category in categories" 
            :key="category.id"
            class="relative"
            @mouseenter="openDropdown(category.slug)"
            @mouseleave="closeDropdown"
          >
            <button
              class="px-4 py-2 text-aune-200 hover:text-white font-medium transition-colors flex items-center gap-1"
            >
              {{ category.name }}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <!-- Dropdown Menu -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-2"
            >
              <div 
                v-if="activeDropdown === category.slug"
                class="absolute top-full left-0 mt-2 w-72 bg-aune-900/95 backdrop-blur-xl border border-aune-700/50 rounded-xl shadow-2xl overflow-hidden"
              >
                <!-- View All -->
                <button
                  @click="goToCategory(category.slug)"
                  class="w-full px-4 py-3 text-left text-gold-500 hover:bg-aune-800/50 font-medium border-b border-aune-700/50 flex items-center justify-between"
                >
                  查看全部 {{ category.name }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <!-- Products -->
                <div class="py-2">
                  <button
                    v-for="product in categoryProducts[category.slug]"
                    :key="product.id"
                    @click="goToProduct(product.slug)"
                    class="w-full px-4 py-2 text-left text-aune-200 hover:text-white hover:bg-aune-800/50 transition-colors flex items-center gap-3"
                  >
                    <!-- 优先使用 nav_thumbnail，fallback 到 cover_image -->
                    <img 
                      v-if="product.nav_thumbnail || product.cover_image"
                      :src="product.nav_thumbnail || product.cover_image"
                      :alt="product.name"
                      class="w-10 h-10 object-cover rounded"
                    />
                    <div v-else class="w-10 h-10 bg-aune-700 rounded flex items-center justify-center">
                      <svg class="w-5 h-5 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span>{{ product.name }}</span>
                  </button>
                  
                  <p 
                    v-if="!categoryProducts[category.slug]?.length"
                    class="px-4 py-3 text-aune-500 text-sm"
                  >
                    暂无产品
                  </p>
                </div>
              </div>
            </Transition>
          </div>
          
          <!-- Function Links -->
          <template v-for="link in functionLinks" :key="link.label">
            <a
              v-if="link.external"
              :href="link.url"
              target="_blank"
              class="px-4 py-2 text-aune-200 hover:text-white font-medium transition-colors"
            >
              {{ link.label }}
            </a>
            <router-link
              v-else
              :to="link.path"
              class="px-4 py-2 text-aune-200 hover:text-white font-medium transition-colors"
            >
              {{ link.label }}
            </router-link>
          </template>
        </nav>
        
        <!-- Mobile Menu Button -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="lg:hidden p-2 text-white"
        >
          <svg v-if="!isMobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Mobile Menu -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div 
        v-if="isMobileMenuOpen"
        class="lg:hidden bg-aune-900/95 backdrop-blur-xl border-t border-aune-700/50"
      >
        <div class="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <!-- Categories -->
          <div v-for="category in categories" :key="category.id">
            <button
              @click="goToCategory(category.slug)"
              class="w-full px-4 py-3 text-left text-white font-medium hover:bg-aune-800/50 rounded-lg transition-colors"
            >
              {{ category.name }}
            </button>
          </div>
          
          <div class="border-t border-aune-700/50 pt-4">
            <!-- Function Links -->
            <template v-for="link in functionLinks" :key="link.label">
              <a
                v-if="link.external"
                :href="link.url"
                target="_blank"
                class="block px-4 py-3 text-aune-200 hover:text-white hover:bg-aune-800/50 rounded-lg transition-colors"
              >
                {{ link.label }}
              </a>
              <router-link
                v-else
                :to="link.path"
                @click="isMobileMenuOpen = false"
                class="block px-4 py-3 text-aune-200 hover:text-white hover:bg-aune-800/50 rounded-lg transition-colors"
              >
                {{ link.label }}
              </router-link>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

