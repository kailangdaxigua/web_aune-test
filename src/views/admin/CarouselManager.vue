<script setup>
/**
 * Carousel Manager
 * CRUD management for homepage carousel slides
 */
import { ref, reactive, onMounted } from 'vue'
import { supabase, uploadFile, STORAGE_BUCKETS, FILE_LIMITS } from '@/lib/supabase'

// State
const slides = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)
const showModal = ref(false)
const editingSlide = ref(null)

// Form data
const form = reactive({
  id: null,
  title: '',
  image_url: '',
  mobile_image_url: '',
  link_url: '',
  link_target: '_self',
  overlay_title: '',
  overlay_subtitle: '',
  overlay_position: 'center',
  sort_order: 0,
  is_active: true,
  start_at: null,
  end_at: null
})

// Position options
const positionOptions = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' }
]

// Target options
const targetOptions = [
  { value: '_self', label: '当前窗口' },
  { value: '_blank', label: '新窗口' }
]

/**
 * Fetch all slides
 */
async function fetchSlides() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('home_carousel')
      .select('*')
      .order('sort_order')
    
    if (error) throw error
    slides.value = data || []
  } catch (error) {
    console.error('Failed to fetch slides:', error)
    alert('加载失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

/**
 * Open modal for creating new slide
 */
function openCreateModal() {
  editingSlide.value = null
  Object.assign(form, {
    id: null,
    title: '',
    image_url: '',
    mobile_image_url: '',
    link_url: '',
    link_target: '_self',
    overlay_title: '',
    overlay_subtitle: '',
    overlay_position: 'center',
    sort_order: slides.value.length,
    is_active: true,
    start_at: null,
    end_at: null
  })
  showModal.value = true
}

/**
 * Open modal for editing slide
 */
function openEditModal(slide) {
  editingSlide.value = slide
  Object.assign(form, {
    id: slide.id,
    title: slide.title || '',
    image_url: slide.image_url,
    mobile_image_url: slide.mobile_image_url || '',
    link_url: slide.link_url || '',
    link_target: slide.link_target || '_self',
    overlay_title: slide.overlay_title || '',
    overlay_subtitle: slide.overlay_subtitle || '',
    overlay_position: slide.overlay_position || 'center',
    sort_order: slide.sort_order,
    is_active: slide.is_active,
    start_at: slide.start_at ? slide.start_at.slice(0, 16) : null,
    end_at: slide.end_at ? slide.end_at.slice(0, 16) : null
  })
  showModal.value = true
}

/**
 * Close modal
 */
function closeModal() {
  showModal.value = false
  editingSlide.value = null
}

/**
 * Handle image upload
 */
async function handleImageUpload(event, field) {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file size
  if (file.size > FILE_LIMITS.CAROUSEL) {
    alert('图片大小不能超过 10MB')
    return
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件')
    return
  }
  
  isUploading.value = true
  
  try {
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const fileName = `carousel_${timestamp}.${ext}`
    
    const { data, error } = await uploadFile(STORAGE_BUCKETS.CAROUSEL, fileName, file)
    
    if (error) throw error
    
    form[field] = data.publicUrl
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上传失败: ' + error.message)
  } finally {
    isUploading.value = false
  }
}

/**
 * Save slide (create or update)
 */
async function saveSlide() {
  if (!form.image_url) {
    alert('请上传轮播图片')
    return
  }
  
  isSaving.value = true
  
  try {
    const slideData = {
      title: form.title.trim() || null,
      image_url: form.image_url,
      mobile_image_url: form.mobile_image_url || null,
      link_url: form.link_url.trim() || null,
      link_target: form.link_target,
      overlay_title: form.overlay_title.trim() || null,
      overlay_subtitle: form.overlay_subtitle.trim() || null,
      overlay_position: form.overlay_position,
      sort_order: form.sort_order,
      is_active: form.is_active,
      start_at: form.start_at || null,
      end_at: form.end_at || null
    }
    
    if (form.id) {
      // Update
      const { error } = await supabase
        .from('home_carousel')
        .update(slideData)
        .eq('id', form.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('home_carousel')
        .insert(slideData)
      
      if (error) throw error
    }
    
    await fetchSlides()
    closeModal()
  } catch (error) {
    console.error('Failed to save slide:', error)
    alert('保存失败: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

/**
 * Delete slide
 */
async function deleteSlide(slide) {
  if (!confirm(`确定要删除这张轮播图吗？`)) return
  
  try {
    const { error } = await supabase
      .from('home_carousel')
      .delete()
      .eq('id', slide.id)
    
    if (error) throw error
    await fetchSlides()
  } catch (error) {
    console.error('Failed to delete slide:', error)
    alert('删除失败: ' + error.message)
  }
}

/**
 * Toggle slide active status
 */
async function toggleActive(slide) {
  try {
    const { error } = await supabase
      .from('home_carousel')
      .update({ is_active: !slide.is_active })
      .eq('id', slide.id)
    
    if (error) throw error
    slide.is_active = !slide.is_active
  } catch (error) {
    console.error('Failed to toggle active:', error)
    alert('操作失败: ' + error.message)
  }
}

/**
 * Move slide up
 */
async function moveUp(index) {
  if (index === 0) return
  await swapOrder(index, index - 1)
}

/**
 * Move slide down
 */
async function moveDown(index) {
  if (index === slides.value.length - 1) return
  await swapOrder(index, index + 1)
}

/**
 * Swap slide order
 */
async function swapOrder(fromIndex, toIndex) {
  const fromItem = slides.value[fromIndex]
  const toItem = slides.value[toIndex]
  
  try {
    await Promise.all([
      supabase.from('home_carousel').update({ sort_order: toIndex }).eq('id', fromItem.id),
      supabase.from('home_carousel').update({ sort_order: fromIndex }).eq('id', toItem.id)
    ])
    
    await fetchSlides()
  } catch (error) {
    console.error('Failed to swap order:', error)
    alert('排序失败: ' + error.message)
  }
}

// Lifecycle
onMounted(() => {
  fetchSlides()
})
</script>

<template>
  <div class="carousel-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">轮播图管理</h1>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加轮播图
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-8 h-8 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <!-- Slides Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="(slide, index) in slides"
        :key="slide.id"
        class="relative bg-aune-800/50 rounded-xl overflow-hidden border border-aune-700/50 group"
      >
        <!-- Image Preview -->
        <div class="aspect-video relative">
          <img 
            :src="slide.image_url" 
            :alt="slide.title || '轮播图'"
            class="w-full h-full object-cover"
          />
          
          <!-- Overlay Status -->
          <div class="absolute top-3 left-3 flex gap-2">
            <span 
              :class="[
                'px-2 py-1 rounded text-xs font-medium',
                slide.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              ]"
            >
              {{ slide.is_active ? '已启用' : '已禁用' }}
            </span>
            <span v-if="slide.overlay_title" class="px-2 py-1 bg-blue-500 text-white rounded text-xs">
              有文字
            </span>
          </div>
          
          <!-- Order Badge -->
          <div class="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white font-bold">
            {{ index + 1 }}
          </div>
          
          <!-- Hover Actions -->
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              @click="openEditModal(slide)"
              class="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              title="编辑"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="toggleActive(slide)"
              class="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              :title="slide.is_active ? '禁用' : '启用'"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <!-- 已启用状态 - 显示关闭眼睛图标 -->
                <path v-if="slide.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                <!-- 已禁用状态 - 显示睁开眼睛图标 -->
                <template v-else>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </template>
              </svg>
            </button>
            <button
              @click="deleteSlide(slide)"
              class="p-3 bg-red-500/50 hover:bg-red-500 rounded-full text-white transition-colors"
              title="删除"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Info -->
        <div class="p-4">
          <h3 class="text-white font-medium truncate">
            {{ slide.title || '未命名轮播图' }}
          </h3>
          <p v-if="slide.link_url" class="text-aune-400 text-sm truncate mt-1">
            跳转: {{ slide.link_url }}
          </p>
          
          <!-- Order Controls -->
          <div class="flex gap-2 mt-3">
            <button
              @click="moveUp(index)"
              :disabled="index === 0"
              class="flex-1 px-3 py-1.5 bg-aune-700/50 hover:bg-aune-700 text-aune-300 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ↑ 上移
            </button>
            <button
              @click="moveDown(index)"
              :disabled="index === slides.length - 1"
              class="flex-1 px-3 py-1.5 bg-aune-700/50 hover:bg-aune-700 text-aune-300 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ↓ 下移
            </button>
          </div>
        </div>
      </div>
      
      <!-- Add New Card -->
      <button
        @click="openCreateModal"
        class="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-aune-600/50 rounded-xl hover:border-gold-500/50 hover:bg-aune-800/30 transition-colors"
      >
        <svg class="w-12 h-12 text-aune-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="text-aune-400">添加轮播图</span>
      </button>
    </div>
    
    <!-- Empty State -->
    <div v-if="!isLoading && slides.length === 0" class="text-center py-16">
      <p class="text-aune-500 mb-4">暂无轮播图</p>
      <button
        @click="openCreateModal"
        class="px-6 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors"
      >
        添加第一张轮播图
      </button>
    </div>
    
    <!-- Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="showModal"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          @click.self="closeModal"
        >
          <div class="bg-aune-900 rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-aune-700/50">
              <h2 class="text-xl font-bold text-white">
                {{ editingSlide ? '编辑轮播图' : '添加轮播图' }}
              </h2>
              <button @click="closeModal" class="text-aune-400 hover:text-white">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Modal Body -->
            <div class="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <!-- Title -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">标题（后台识别用）</label>
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="如：新品发布活动"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                />
              </div>
              
              <!-- Image Upload -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-aune-300 text-sm mb-2">桌面端图片 *</label>
                  <div class="relative">
                    <div 
                      v-if="form.image_url"
                      class="aspect-video bg-aune-800 rounded-lg overflow-hidden mb-2"
                    >
                      <img :src="form.image_url" class="w-full h-full object-cover" />
                    </div>
                    <label class="block">
                      <span class="px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-aune-300 hover:text-white hover:border-aune-500 cursor-pointer inline-flex items-center gap-2 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ form.image_url ? '更换图片' : '上传图片' }}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        @change="e => handleImageUpload(e, 'image_url')"
                        class="hidden"
                      />
                    </label>
                  </div>
                  <p class="text-aune-500 text-xs mt-1">建议尺寸: 1920x1080</p>
                </div>
                
                <div>
                  <label class="block text-aune-300 text-sm mb-2">移动端图片（可选）</label>
                  <div class="relative">
                    <div 
                      v-if="form.mobile_image_url"
                      class="aspect-video bg-aune-800 rounded-lg overflow-hidden mb-2"
                    >
                      <img :src="form.mobile_image_url" class="w-full h-full object-cover" />
                    </div>
                    <label class="block">
                      <span class="px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-aune-300 hover:text-white hover:border-aune-500 cursor-pointer inline-flex items-center gap-2 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ form.mobile_image_url ? '更换' : '上传' }}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        @change="e => handleImageUpload(e, 'mobile_image_url')"
                        class="hidden"
                      />
                    </label>
                  </div>
                  <p class="text-aune-500 text-xs mt-1">建议尺寸: 750x1334</p>
                </div>
              </div>
              
              <!-- Link -->
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2">
                  <label class="block text-aune-300 text-sm mb-2">跳转链接</label>
                  <input
                    v-model="form.link_url"
                    type="text"
                    placeholder="/product/xxx 或 https://..."
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">打开方式</label>
                  <select
                    v-model="form.link_target"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  >
                    <option v-for="opt in targetOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>
              
              <!-- Overlay Text -->
              <div class="space-y-4 p-4 bg-aune-800/30 rounded-lg">
                <h3 class="text-white font-medium">叠加文字（可选）</h3>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">标题</label>
                  <input
                    v-model="form.overlay_title"
                    type="text"
                    placeholder="大标题"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">副标题</label>
                  <input
                    v-model="form.overlay_subtitle"
                    type="text"
                    placeholder="副标题描述"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">文字位置</label>
                  <div class="flex gap-4">
                    <label 
                      v-for="opt in positionOptions" 
                      :key="opt.value"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        :value="opt.value"
                        v-model="form.overlay_position"
                        class="text-gold-500 focus:ring-gold-500"
                      />
                      <span class="text-white">{{ opt.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <!-- Schedule -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-aune-300 text-sm mb-2">开始时间（可选）</label>
                  <input
                    v-model="form.start_at"
                    type="datetime-local"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">结束时间（可选）</label>
                  <input
                    v-model="form.end_at"
                    type="datetime-local"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
              
              <!-- Active -->
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.is_active"
                  class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                />
                <span class="text-white">立即启用</span>
              </label>
            </div>
            
            <!-- Modal Footer -->
            <div class="flex gap-3 p-6 border-t border-aune-700/50">
              <button
                @click="closeModal"
                class="flex-1 px-4 py-2 bg-aune-700 text-white rounded-lg hover:bg-aune-600 transition-colors"
              >
                取消
              </button>
              <button
                @click="saveSlide"
                :disabled="isSaving || isUploading"
                class="flex-1 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg v-if="isSaving || isUploading" class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isUploading ? '上传中...' : isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

