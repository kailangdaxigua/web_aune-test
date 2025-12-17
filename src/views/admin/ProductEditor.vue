<script setup>
/**
 * Product Editor - Create/Edit products
 * 
 * 新增功能：
 * - 购买链接 (buy_link)
 * - 功能/规格头图上传
 * - 沉浸式图文模块构建器（DJI 风格）
 * - 产品系列选择
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase, uploadFile, STORAGE_BUCKETS, FILE_LIMITS } from '@/lib/supabase'
import RichTextEditor from '@/components/admin/RichTextEditor.vue'

const route = useRoute()
const router = useRouter()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const categories = ref([])
const errorMessage = ref('')
const successMessage = ref('')

// Form data
const formData = ref({
  name: '',
  model: '',
  slug: '',
  category_id: null,
  cover_image: '',
  nav_thumbnail: '',
  video_url: '',
  gallery_images: [],
  short_description: '',
  features_html: '',
  specs_html: '',
  review_html: '',
  buy_links: [],
  buy_link: '',                    // 新增：单个购买链接
  features_header_image: '',       // 新增：功能头图
  specs_header_image: '',          // 新增：规格头图
  product_series: '',              // 新增：产品系列
  content_modules: [],             // 新增：沉浸式模块 JSONB
  is_hot: false,
  is_new: false,
  is_active: true,
  sort_order: 0,
  meta_title: '',
  meta_description: ''
})

// Media blocks (兼容旧版)
const mediaBlocks = ref([])

// 产品系列选项
const seriesOptions = [
  { value: '', label: '未分类' },
  { value: 'desktop', label: '桌面系列' },
  { value: 'portable', label: '便携系列' }
]

// 文字对齐选项
const alignOptions = [
  { value: 'left', label: '居左' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '居右' }
]

// 动画类型选项
const animationOptions = [
  { value: 'fade-up', label: '向上淡入' },
  { value: 'fade-left', label: '从左淡入' },
  { value: 'fade-right', label: '从右淡入' },
  { value: 'scale-in', label: '缩放淡入' }
]

// Computed
const isEditing = computed(() => !!route.params.id)
const pageTitle = computed(() => isEditing.value ? '编辑产品' : '添加产品')

// Load data
onMounted(async () => {
  isLoading.value = true
  
  try {
    // Load categories
    const { data: catsData } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    categories.value = catsData || []
    
    // Load product if editing
    if (isEditing.value) {
      const { data: productData, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', route.params.id)
        .single()
      
      if (error || !productData) {
        router.push('/admin/products')
        return
      }
      
      formData.value = {
        ...productData,
        gallery_images: productData.gallery_images || [],
        buy_links: productData.buy_links || [],
        content_modules: productData.content_modules || []
      }
      
      // Load media blocks
      const { data: blocksData } = await supabase
        .from('product_media_blocks')
        .select('*')
        .eq('product_id', route.params.id)
        .order('sort_order')
      
      mediaBlocks.value = blocksData || []
    }
  } finally {
    isLoading.value = false
  }
})

// Generate slug from name
function generateSlug() {
  if (!formData.value.name) return
  
  formData.value.slug = formData.value.name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Sanitize filename
function sanitizeFileName(fileName) {
  const ext = fileName.split('.').pop()
  const name = fileName.replace(/\.[^/.]+$/, '')
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
  return `${sanitized}.${ext}`
}

// Generic image upload handler
async function uploadImage(file, folder = 'covers') {
  if (file.size > FILE_LIMITS.IMAGE) {
    throw new Error('图片大小不能超过 5MB')
  }
  
  const timestamp = Date.now()
  const sanitizedName = sanitizeFileName(file.name)
  const path = `${folder}/${timestamp}_${sanitizedName}`
  
  const { data, error } = await uploadFile(STORAGE_BUCKETS.PRODUCTS, path, file)
  
  if (error) throw error
  return data.publicUrl
}

// Handle cover image upload
async function handleCoverUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    formData.value.cover_image = await uploadImage(file, 'covers')
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  }
}

// Handle nav thumbnail upload
async function handleNavThumbnailUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    formData.value.nav_thumbnail = await uploadImage(file, 'nav_icons')
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  }
}

// Handle features header image upload
async function handleFeaturesHeaderUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    formData.value.features_header_image = await uploadImage(file, 'headers')
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  }
}

// Handle specs header image upload
async function handleSpecsHeaderUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    formData.value.specs_header_image = await uploadImage(file, 'headers')
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  }
}

// Clear image
function clearImage(field) {
  formData.value[field] = ''
}

// ========== 沉浸式模块管理 ==========

// Add immersive module
function addImmersiveModule() {
  formData.value.content_modules.push({
    id: `module_${Date.now()}`,
    type: 'immersive',
    image_url: '',
    title: '',
    subtitle: '',
    description: '',
    text_align: 'center',
    text_color: 'white',
    overlay_opacity: 0.3,
    animation: 'fade-up',
    enable_parallax: true
  })
}

// Remove immersive module
function removeImmersiveModule(index) {
  formData.value.content_modules.splice(index, 1)
}

// Move module up/down
function moveModule(index, direction) {
  const modules = formData.value.content_modules
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= modules.length) return
  
  const temp = modules[index]
  modules[index] = modules[newIndex]
  modules[newIndex] = temp
}

// Handle module image upload
async function handleModuleImageUpload(event, index) {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    formData.value.content_modules[index].image_url = await uploadImage(file, 'modules')
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  }
}

// ========== 旧版 Media Blocks（兼容） ==========

function addMediaBlock() {
  mediaBlocks.value.push({
    id: `new_${Date.now()}`,
    image_url: '',
    text_content: '',
    text_position: 'center',
    layout_type: 'standard',
    title: '',
    subtitle: '',
    text_color: 'white',
    overlay_opacity: 0.3,
    animation_type: 'fade-up',
    enable_parallax: false,
    sort_order: mediaBlocks.value.length
  })
}

function removeMediaBlock(index) {
  mediaBlocks.value.splice(index, 1)
}

async function handleBlockImageUpload(event, index) {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    mediaBlocks.value[index].image_url = await uploadImage(file, 'blocks')
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  }
}

// Save product
async function saveProduct() {
  // Validation
  if (!formData.value.name || !formData.value.model || !formData.value.slug) {
    errorMessage.value = '请填写必填字段'
    return
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const productPayload = {
      name: formData.value.name,
      model: formData.value.model,
      slug: formData.value.slug,
      category_id: formData.value.category_id || null,
      cover_image: formData.value.cover_image,
      nav_thumbnail: formData.value.nav_thumbnail || null,
      video_url: formData.value.video_url,
      gallery_images: formData.value.gallery_images,
      short_description: formData.value.short_description,
      features_html: formData.value.features_html,
      specs_html: formData.value.specs_html,
      review_html: formData.value.review_html,
      buy_links: formData.value.buy_links,
      buy_link: formData.value.buy_link || null,
      features_header_image: formData.value.features_header_image || null,
      specs_header_image: formData.value.specs_header_image || null,
      product_series: formData.value.product_series || null,
      content_modules: formData.value.content_modules,
      is_hot: formData.value.is_hot,
      is_new: formData.value.is_new,
      is_active: formData.value.is_active,
      sort_order: formData.value.sort_order,
      meta_title: formData.value.meta_title,
      meta_description: formData.value.meta_description
    }
    
    let productId = route.params.id
    
    if (isEditing.value) {
      const { error } = await supabase
        .from('products')
        .update(productPayload)
        .eq('id', productId)
      
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert(productPayload)
        .select()
        .single()
      
      if (error) throw error
      productId = data.id
    }
    
    // Save media blocks (兼容旧版)
    await supabase
      .from('product_media_blocks')
      .delete()
      .eq('product_id', productId)
    
    if (mediaBlocks.value.length > 0) {
      const blocksPayload = mediaBlocks.value.map((block, index) => ({
        product_id: productId,
        image_url: block.image_url,
        text_content: block.text_content,
        text_position: block.text_position,
        layout_type: block.layout_type,
        title: block.title,
        subtitle: block.subtitle,
        text_color: block.text_color,
        overlay_opacity: block.overlay_opacity,
        animation_type: block.animation_type,
        enable_parallax: block.enable_parallax,
        sort_order: index
      }))
      
      await supabase
        .from('product_media_blocks')
        .insert(blocksPayload)
    }
    
    successMessage.value = '保存成功'
    
    if (!isEditing.value) {
      router.push('/admin/products')
    }
  } catch (error) {
    errorMessage.value = '保存失败: ' + error.message
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="product-editor">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <button
          @click="router.push('/admin/products')"
          class="p-2 hover:bg-aune-700/50 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-white">{{ pageTitle }}</h1>
      </div>
      
      <button
        @click="saveProduct"
        :disabled="isSaving"
        class="px-6 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {{ isSaving ? '保存中...' : '保存' }}
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
    
    <!-- Form -->
    <div v-else class="space-y-6">
      <!-- Basic Info -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">基本信息</h3>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              产品名称 <span class="text-red-400">*</span>
            </label>
            <input
              v-model="formData.name"
              @blur="!formData.slug && generateSlug()"
              type="text"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="如：X8"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              型号 <span class="text-red-400">*</span>
            </label>
            <input
              v-model="formData.model"
              type="text"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="如：X8-2024"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              URL 标识 <span class="text-red-400">*</span>
            </label>
            <input
              v-model="formData.slug"
              type="text"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="如：x8"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              产品分类
            </label>
            <select
              v-model="formData.category_id"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            >
              <option :value="null">选择分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              产品系列
            </label>
            <select
              v-model="formData.product_series"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            >
              <option v-for="opt in seriesOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              购买链接
            </label>
            <input
              v-model="formData.buy_link"
              type="url"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="https://..."
            />
          </div>
        </div>
        
        <div class="mt-4">
          <label class="block text-sm font-medium text-aune-300 mb-2">
            简短描述
          </label>
          <textarea
            v-model="formData.short_description"
            rows="2"
            class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            placeholder="一句话描述产品特点"
          ></textarea>
        </div>
        
        <div class="mt-4 flex items-center gap-6">
          <label class="flex items-center gap-2">
            <input v-model="formData.is_hot" type="checkbox" class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50" />
            <span class="text-aune-300">热门产品</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="formData.is_new" type="checkbox" class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50" />
            <span class="text-aune-300">新品</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="formData.is_active" type="checkbox" class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50" />
            <span class="text-aune-300">上架状态</span>
          </label>
        </div>
      </div>
      
      <!-- Media -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">媒体资源</h3>
        
        <div class="grid grid-cols-3 gap-4">
          <!-- 封面图片 -->
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">封面图片</label>
            <div class="relative">
              <input type="file" accept="image/*" @change="handleCoverUpload" class="hidden" id="cover-upload" />
              <label for="cover-upload" class="flex items-center justify-center w-full h-40 border-2 border-dashed border-aune-600/50 rounded-lg cursor-pointer hover:border-gold-500/50 transition-colors">
                <img v-if="formData.cover_image" :src="formData.cover_image" class="w-full h-full object-cover rounded-lg" />
                <div v-else class="text-center">
                  <svg class="w-8 h-8 mx-auto text-aune-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-aune-400 text-sm">点击上传</span>
                </div>
              </label>
            </div>
          </div>
          
          <!-- 导航栏图标 -->
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">导航栏图标</label>
            <div class="relative">
              <input type="file" accept="image/*" @change="handleNavThumbnailUpload" class="hidden" id="nav-thumbnail-upload" />
              <label for="nav-thumbnail-upload" class="flex items-center justify-center w-full h-40 border-2 border-dashed border-aune-600/50 rounded-lg cursor-pointer hover:border-gold-500/50 transition-colors relative">
                <img v-if="formData.nav_thumbnail" :src="formData.nav_thumbnail" class="w-full h-full object-cover rounded-lg" />
                <div v-else class="text-center">
                  <svg class="w-8 h-8 mx-auto text-aune-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                  </svg>
                  <span class="text-aune-400 text-sm">点击上传</span>
                </div>
              </label>
              <button v-if="formData.nav_thumbnail" @click.prevent="clearImage('nav_thumbnail')" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 产品视频 -->
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">产品视频 URL</label>
            <input
              v-model="formData.video_url"
              type="url"
              class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              placeholder="https://..."
            />
            <p class="mt-1 text-aune-500 text-xs">支持 MP4 格式</p>
          </div>
        </div>
      </div>
      
      <!-- Header Images (NEW) -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Tab 头图</h3>
        <p class="text-aune-400 text-sm mb-4">为"产品功能"和"技术规格"Tab 页面设置顶部 Banner 图片</p>
        
        <div class="grid grid-cols-2 gap-6">
          <!-- 功能头图 -->
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">产品功能头图</label>
            <div class="relative">
              <input type="file" accept="image/*" @change="handleFeaturesHeaderUpload" class="hidden" id="features-header-upload" />
              <label for="features-header-upload" class="flex items-center justify-center w-full h-32 border-2 border-dashed border-aune-600/50 rounded-lg cursor-pointer hover:border-gold-500/50 transition-colors relative">
                <img v-if="formData.features_header_image" :src="formData.features_header_image" class="w-full h-full object-cover rounded-lg" />
                <div v-else class="text-center">
                  <svg class="w-6 h-6 mx-auto text-aune-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-aune-400 text-xs">功能 Tab 头图</span>
                </div>
              </label>
              <button v-if="formData.features_header_image" @click.prevent="clearImage('features_header_image')" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 规格头图 -->
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">技术规格头图</label>
            <div class="relative">
              <input type="file" accept="image/*" @change="handleSpecsHeaderUpload" class="hidden" id="specs-header-upload" />
              <label for="specs-header-upload" class="flex items-center justify-center w-full h-32 border-2 border-dashed border-aune-600/50 rounded-lg cursor-pointer hover:border-gold-500/50 transition-colors relative">
                <img v-if="formData.specs_header_image" :src="formData.specs_header_image" class="w-full h-full object-cover rounded-lg" />
                <div v-else class="text-center">
                  <svg class="w-6 h-6 mx-auto text-aune-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-aune-400 text-xs">规格 Tab 头图</span>
                </div>
              </label>
              <button v-if="formData.specs_header_image" @click.prevent="clearImage('specs_header_image')" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Rich Text Content -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">产品功能</h3>
        <RichTextEditor v-model="formData.features_html" placeholder="输入产品功能介绍..." />
      </div>
      
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <h3 class="text-lg font-semibold text-white mb-4">技术规格</h3>
        <RichTextEditor v-model="formData.specs_html" placeholder="输入技术规格..." />
      </div>
      
      <!-- Immersive Modules (DJI Style) -->
      <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-white">沉浸式图文模块</h3>
            <p class="text-aune-400 text-sm mt-1">DJI 风格：文字悬浮在图片上，支持滚动视差动效</p>
          </div>
          <button
            @click="addImmersiveModule"
            class="px-4 py-2 text-sm bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30 transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            添加模块
          </button>
        </div>
        
        <div class="space-y-4">
          <div
            v-for="(module, index) in formData.content_modules"
            :key="module.id"
            class="p-4 bg-aune-700/30 rounded-lg border border-aune-600/50"
          >
            <div class="flex items-center justify-between mb-4">
              <span class="text-white font-medium">模块 {{ index + 1 }}</span>
              <div class="flex items-center gap-2">
                <button
                  @click="moveModule(index, -1)"
                  :disabled="index === 0"
                  class="p-1.5 hover:bg-aune-600/50 rounded disabled:opacity-30 transition-colors"
                  title="上移"
                >
                  <svg class="w-4 h-4 text-aune-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  @click="moveModule(index, 1)"
                  :disabled="index === formData.content_modules.length - 1"
                  class="p-1.5 hover:bg-aune-600/50 rounded disabled:opacity-30 transition-colors"
                  title="下移"
                >
                  <svg class="w-4 h-4 text-aune-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  @click="removeImmersiveModule(index)"
                  class="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                  title="删除"
                >
                  <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-4 gap-4">
              <!-- Image Upload -->
              <div>
                <label class="block text-xs text-aune-400 mb-1">背景图片</label>
                <input type="file" accept="image/*" @change="e => handleModuleImageUpload(e, index)" class="hidden" :id="`module-image-${index}`" />
                <label
                  :for="`module-image-${index}`"
                  class="flex items-center justify-center w-full h-24 border border-dashed border-aune-600/50 rounded cursor-pointer hover:border-gold-500/50 transition-colors"
                >
                  <img v-if="module.image_url" :src="module.image_url" class="w-full h-full object-cover rounded" />
                  <span v-else class="text-aune-500 text-xs">上传图片</span>
                </label>
              </div>
              
              <!-- Text Content -->
              <div class="col-span-2 space-y-2">
                <div>
                  <label class="block text-xs text-aune-400 mb-1">标题</label>
                  <input
                    v-model="module.title"
                    type="text"
                    class="w-full px-3 py-2 bg-aune-700/50 border border-aune-600/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    placeholder="模块标题"
                  />
                </div>
                <div>
                  <label class="block text-xs text-aune-400 mb-1">副标题</label>
                  <input
                    v-model="module.subtitle"
                    type="text"
                    class="w-full px-3 py-2 bg-aune-700/50 border border-aune-600/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    placeholder="副标题/标签"
                  />
                </div>
                <div>
                  <label class="block text-xs text-aune-400 mb-1">描述</label>
                  <textarea
                    v-model="module.description"
                    rows="2"
                    class="w-full px-3 py-2 bg-aune-700/50 border border-aune-600/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    placeholder="正文描述"
                  ></textarea>
                </div>
              </div>
              
              <!-- Settings -->
              <div class="space-y-2">
                <div>
                  <label class="block text-xs text-aune-400 mb-1">文字对齐</label>
                  <select
                    v-model="module.text_align"
                    class="w-full px-2 py-1.5 bg-aune-700/50 border border-aune-600/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  >
                    <option v-for="opt in alignOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-aune-400 mb-1">动画效果</label>
                  <select
                    v-model="module.animation"
                    class="w-full px-2 py-1.5 bg-aune-700/50 border border-aune-600/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  >
                    <option v-for="opt in animationOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="module.enable_parallax" type="checkbox" class="w-4 h-4 rounded border-aune-600 bg-aune-800 text-gold-500" />
                    <span class="text-aune-300 text-xs">启用视差</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <p v-if="formData.content_modules.length === 0" class="text-aune-500 text-center py-8">
            暂无沉浸式模块，点击上方按钮添加
          </p>
        </div>
      </div>
      
      <!-- Legacy Media Blocks (折叠) -->
      <details class="bg-aune-800/50 rounded-xl border border-aune-700/50">
        <summary class="p-6 cursor-pointer text-lg font-semibold text-white hover:text-gold-400 transition-colors">
          图文模块（旧版）
        </summary>
        <div class="px-6 pb-6">
          <div class="flex items-center justify-between mb-4">
            <p class="text-aune-400 text-sm">兼容旧版并排图文布局</p>
            <button
              @click="addMediaBlock"
              class="px-3 py-1.5 text-sm bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30 transition-colors"
            >
              + 添加模块
            </button>
          </div>
          
          <div class="space-y-4">
            <div
              v-for="(block, index) in mediaBlocks"
              :key="block.id"
              class="p-4 bg-aune-700/30 rounded-lg"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-aune-300 font-medium">模块 {{ index + 1 }}</span>
                <button @click="removeMediaBlock(index)" class="p-1 hover:bg-red-500/20 rounded transition-colors">
                  <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm text-aune-400 mb-1">图片</label>
                  <input type="file" accept="image/*" @change="e => handleBlockImageUpload(e, index)" class="hidden" :id="`block-image-${index}`" />
                  <label :for="`block-image-${index}`" class="flex items-center justify-center w-full h-24 border border-dashed border-aune-600/50 rounded cursor-pointer hover:border-gold-500/50 transition-colors">
                    <img v-if="block.image_url" :src="block.image_url" class="w-full h-full object-cover rounded" />
                    <span v-else class="text-aune-500 text-xs">上传图片</span>
                  </label>
                </div>
                
                <div>
                  <label class="block text-sm text-aune-400 mb-1">文字内容</label>
                  <textarea v-model="block.text_content" rows="3" class="w-full px-3 py-2 bg-aune-700/50 border border-aune-600/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"></textarea>
                </div>
                
                <div>
                  <label class="block text-sm text-aune-400 mb-1">文字位置</label>
                  <select v-model="block.text_position" class="w-full px-3 py-2 bg-aune-700/50 border border-aune-600/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50">
                    <option value="left">左侧</option>
                    <option value="center">居中</option>
                    <option value="right">右侧</option>
                  </select>
                </div>
              </div>
            </div>
            
            <p v-if="mediaBlocks.length === 0" class="text-aune-500 text-center py-4">
              暂无图文模块
            </p>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
