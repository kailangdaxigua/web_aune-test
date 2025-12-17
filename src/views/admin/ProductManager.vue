<script setup>
/**
 * Product Manager - List and manage products
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()

// State
const products = ref([])
const categories = ref([])
const isLoading = ref(true)
const filterCategory = ref('all')
const searchQuery = ref('')

// Computed
const filteredProducts = computed(() => {
  let result = products.value
  
  if (filterCategory.value !== 'all') {
    result = result.filter(p => p.category_id === filterCategory.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.model.toLowerCase().includes(query)
    )
  }
  
  return result
})

// Load data
onMounted(async () => {
  isLoading.value = true
  
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from('products')
        .select(`*, category:categories(id, name, slug)`)
        .order('sort_order'),
      supabase
        .from('categories')
        .select('*')
        .order('sort_order')
    ])
    
    products.value = productsRes.data || []
    categories.value = categoriesRes.data || []
  } finally {
    isLoading.value = false
  }
})

// Navigate to edit
function editProduct(id) {
  router.push(`/admin/products/${id}/edit`)
}

// Create new product
function createProduct() {
  router.push('/admin/products/new')
}

// Toggle active status
async function toggleActive(product) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: !product.is_active })
    .eq('id', product.id)
  
  if (!error) {
    product.is_active = !product.is_active
  }
}

// Delete product
async function deleteProduct(product) {
  if (!confirm(`确定要删除产品 "${product.name}" 吗？`)) return
  
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', product.id)
  
  if (!error) {
    products.value = products.value.filter(p => p.id !== product.id)
  }
}
</script>

<template>
  <div class="product-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">产品管理</h1>
        <p class="text-aune-400 mt-1">管理所有产品信息</p>
      </div>
      
      <button
        @click="createProduct"
        class="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        添加产品
      </button>
    </div>
    
    <!-- Filters -->
    <div class="flex items-center gap-4 mb-6">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索产品..."
          class="w-full max-w-xs px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
        />
      </div>
      
      <select
        v-model="filterCategory"
        class="px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
      >
        <option value="all">全部分类</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
    </div>
    
    <!-- Products Table -->
    <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center">
        <svg class="animate-spin w-8 h-8 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      
      <table v-else class="w-full">
        <thead class="bg-aune-900/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">产品</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">分类</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">标签</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">状态</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-aune-400 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-aune-700/50">
          <tr 
            v-for="product in filteredProducts" 
            :key="product.id"
            class="hover:bg-aune-700/30 transition-colors"
          >
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <img
                  v-if="product.cover_image"
                  :src="product.cover_image"
                  :alt="product.name"
                  class="w-12 h-12 rounded-lg object-cover"
                />
                <div v-else class="w-12 h-12 bg-aune-700 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p class="text-white font-medium">{{ product.name }}</p>
                  <p class="text-aune-400 text-sm">{{ product.model }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 text-aune-300 text-sm">
              {{ product.category?.name || '-' }}
            </td>
            <td class="px-4 py-4">
              <div class="flex gap-1">
                <span v-if="product.is_hot" class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">HOT</span>
                <span v-if="product.is_new" class="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">NEW</span>
              </div>
            </td>
            <td class="px-4 py-4">
              <button
                @click="toggleActive(product)"
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                  product.is_active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                ]"
              >
                {{ product.is_active ? '已上架' : '已下架' }}
              </button>
            </td>
            <td class="px-4 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="editProduct(product.id)"
                  class="p-2 hover:bg-aune-600/50 rounded transition-colors"
                  title="编辑"
                >
                  <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteProduct(product)"
                  class="p-2 hover:bg-red-500/20 rounded transition-colors"
                  title="删除"
                >
                  <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          
          <tr v-if="filteredProducts.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-aune-500">
              暂无产品
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

