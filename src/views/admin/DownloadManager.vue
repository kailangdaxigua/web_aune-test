<script setup>
/**
 * Download/Resource Manager
 * Upload firmware, drivers, manuals with rich text descriptions
 * 重构版本：支持原始文件名保存 + 产品分类
 */
import { ref, computed, onMounted } from 'vue'
import { supabase, STORAGE_BUCKETS, FILE_LIMITS, uploadFile } from '@/lib/supabase'
import RichTextEditor from '@/components/admin/RichTextEditor.vue'
import { useDeleteWithStorage } from '@/composables/useDeleteWithStorage'

const { deleteDownload: cascadeDelete, isDeleting } = useDeleteWithStorage()

// State
const downloads = ref([])
const products = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const errorMessage = ref('')
const successMessage = ref('')

// Form data
const formData = ref({
  title: '',
  file_url: '',
  file_size: 0,
  file_type: 'firmware',
  file_extension: '',
  original_filename: '',
  download_category: 'desktop',
  description_html: '',
  product_id: null,
  version: '',
  is_active: true
})

// 产品分类（固定三大类）
const downloadCategories = [
  { value: 'desktop', label: '桌面系列' },
  { value: 'portable', label: '便携系列' },
  { value: 'history', label: '历史产品' }
]

// File types
const fileTypes = [
  { value: 'firmware', label: '固件' },
  { value: 'driver', label: '驱动程序' },
  { value: 'manual', label: '使用说明' },
  { value: 'software', label: '软件工具' },
  { value: 'other', label: '其他' }
]

// Filter state
const filterType = ref('all')
const filterCategory = ref('all')
const searchQuery = ref('')

// Computed
const filteredDownloads = computed(() => {
  let result = downloads.value
  
  // Filter by category
  if (filterCategory.value !== 'all') {
    result = result.filter(d => d.download_category === filterCategory.value)
  }
  
  // Filter by type
  if (filterType.value !== 'all') {
    result = result.filter(d => d.file_type === filterType.value)
  }
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(d => 
      d.title.toLowerCase().includes(query) ||
      d.version?.toLowerCase().includes(query) ||
      d.original_filename?.toLowerCase().includes(query)
    )
  }
  
  return result
})

// Load data on mount
onMounted(async () => {
  await Promise.all([
    loadDownloads(),
    loadProducts()
  ])
})

/**
 * Load downloads list
 */
async function loadDownloads() {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('downloads')
      .select(`
        *,
        product:products(id, name, model)
      `)
      .order('download_category')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    downloads.value = data || []
  } catch (error) {
    errorMessage.value = '加载下载列表失败: ' + error.message
  } finally {
    isLoading.value = false
  }
}

/**
 * Load products for association
 */
async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, model')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    products.value = data || []
  } catch (error) {
    console.error('Failed to load products:', error)
  }
}

/**
 * Open form for new download
 */
function openNewForm() {
  editingId.value = null
  formData.value = {
    title: '',
    file_url: '',
    file_size: 0,
    file_type: 'firmware',
    file_extension: '',
    original_filename: '',
    download_category: 'desktop',
    description_html: '',
    product_id: null,
    version: '',
    is_active: true
  }
  showForm.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

/**
 * Open form for editing
 */
function openEditForm(download) {
  editingId.value = download.id
  formData.value = {
    title: download.title,
    file_url: download.file_url,
    file_size: download.file_size,
    file_type: download.file_type,
    file_extension: download.file_extension || '',
    original_filename: download.original_filename || '',
    download_category: download.download_category || 'desktop',
    description_html: download.description_html || '',
    product_id: download.product_id,
    version: download.version || '',
    is_active: download.is_active
  }
  showForm.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

/**
 * Close form
 */
function closeForm() {
  showForm.value = false
  editingId.value = null
  errorMessage.value = ''
}

/**
 * Sanitize filename for storage
 */
function sanitizeFileName(fileName) {
  const ext = fileName.split('.').pop()
  const name = fileName.replace(/\.[^/.]+$/, '')
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
  return `${sanitized}.${ext}`
}

/**
 * Handle file upload - 保存原始文件名
 */
async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > FILE_LIMITS.DOWNLOAD) {
    errorMessage.value = '文件大小不能超过 100MB'
    return
  }
  
  isUploading.value = true
  errorMessage.value = ''
  
  try {
    const timestamp = Date.now()
    const sanitizedName = sanitizeFileName(file.name)
    const path = `resources/${timestamp}_${sanitizedName}`
    
    const { data, error } = await uploadFile(STORAGE_BUCKETS.DOWNLOADS, path, file)
    
    if (error) throw error
    
    formData.value.file_url = data.publicUrl
    formData.value.file_size = file.size
    formData.value.file_extension = file.name.split('.').pop()
    formData.value.original_filename = file.name // 保存原始文件名
    
    // Auto-fill title if empty
    if (!formData.value.title) {
      formData.value.title = file.name.replace(/\.[^/.]+$/, '')
    }
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  } finally {
    isUploading.value = false
  }
}

/**
 * Save download
 */
async function saveDownload() {
  // Validation
  if (!formData.value.title) {
    errorMessage.value = '请输入标题'
    return
  }
  
  if (!formData.value.file_url) {
    errorMessage.value = '请上传文件'
    return
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const payload = {
      title: formData.value.title,
      file_url: formData.value.file_url,
      file_size: formData.value.file_size,
      file_type: formData.value.file_type,
      file_extension: formData.value.file_extension,
      original_filename: formData.value.original_filename,
      download_category: formData.value.download_category,
      description_html: formData.value.description_html,
      product_id: formData.value.product_id || null,
      version: formData.value.version || null,
      is_active: formData.value.is_active
    }
    
    if (editingId.value) {
      // Update
      const { error } = await supabase
        .from('downloads')
        .update(payload)
        .eq('id', editingId.value)
      
      if (error) throw error
      successMessage.value = '更新成功'
    } else {
      // Insert
      const { error } = await supabase
        .from('downloads')
        .insert(payload)
      
      if (error) throw error
      successMessage.value = '创建成功'
    }
    
    await loadDownloads()
    closeForm()
  } catch (error) {
    errorMessage.value = '保存失败: ' + error.message
  } finally {
    isSaving.value = false
  }
}

/**
 * Delete download with cascade storage deletion
 */
async function deleteDownload(download) {
  if (!confirm(`确定要删除 "${download.title}" 吗？\n将同时删除存储中的文件。`)) {
    return
  }
  
  const result = await cascadeDelete(download)
  
  if (result.success) {
    await loadDownloads()
    successMessage.value = '删除成功'
  } else {
    errorMessage.value = '删除失败: ' + result.error
  }
}

/**
 * Toggle active status
 */
async function toggleActive(download) {
  try {
    const { error } = await supabase
      .from('downloads')
      .update({ is_active: !download.is_active })
      .eq('id', download.id)
    
    if (error) throw error
    
    download.is_active = !download.is_active
  } catch (error) {
    errorMessage.value = '更新状态失败: ' + error.message
  }
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * Get type label
 */
function getTypeLabel(type) {
  return fileTypes.find(t => t.value === type)?.label || type
}

/**
 * Get category label
 */
function getCategoryLabel(category) {
  return downloadCategories.find(c => c.value === category)?.label || category
}

/**
 * Get type badge class
 */
function getTypeBadgeClass(type) {
  const classes = {
    firmware: 'bg-blue-500/20 text-blue-400',
    driver: 'bg-purple-500/20 text-purple-400',
    manual: 'bg-green-500/20 text-green-400',
    software: 'bg-orange-500/20 text-orange-400',
    other: 'bg-gray-500/20 text-gray-400'
  }
  return classes[type] || classes.other
}

/**
 * Get category badge class
 */
function getCategoryBadgeClass(category) {
  const classes = {
    desktop: 'bg-cyan-500/20 text-cyan-400',
    portable: 'bg-pink-500/20 text-pink-400',
    history: 'bg-amber-500/20 text-amber-400'
  }
  return classes[category] || 'bg-gray-500/20 text-gray-400'
}
</script>

<template>
  <div class="download-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">资源下载管理</h1>
        <p class="text-aune-400 mt-1">管理固件、驱动、说明书等下载资源</p>
      </div>
      
      <button
        @click="openNewForm"
        class="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        添加资源
      </button>
    </div>
    
    <!-- Messages -->
    <div v-if="successMessage" class="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage && !showForm" class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
      {{ errorMessage }}
    </div>
    
    <!-- Filters -->
    <div class="flex items-center gap-4 mb-6 flex-wrap">
      <div class="flex-1 min-w-[200px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索资源..."
          class="w-full max-w-xs px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
        />
      </div>
      
      <select
        v-model="filterCategory"
        class="px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
      >
        <option value="all">全部分类</option>
        <option v-for="cat in downloadCategories" :key="cat.value" :value="cat.value">
          {{ cat.label }}
        </option>
      </select>
      
      <select
        v-model="filterType"
        class="px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
      >
        <option value="all">全部类型</option>
        <option v-for="type in fileTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
    </div>
    
    <!-- Downloads Table -->
    <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden">
      <!-- Loading -->
      <div v-if="isLoading" class="p-8 text-center">
        <svg class="animate-spin w-8 h-8 mx-auto text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-2 text-aune-400">加载中...</p>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="filteredDownloads.length === 0" class="p-8 text-center">
        <div class="w-16 h-16 mx-auto bg-aune-700/50 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
        <p class="text-aune-400">暂无下载资源</p>
      </div>
      
      <!-- Table -->
      <table v-else class="w-full">
        <thead class="bg-aune-900/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase tracking-wider">资源</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase tracking-wider">分类</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase tracking-wider">类型</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase tracking-wider">大小</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase tracking-wider">下载</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase tracking-wider">状态</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-aune-400 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-aune-700/50">
          <tr 
            v-for="download in filteredDownloads" 
            :key="download.id"
            class="hover:bg-aune-700/30 transition-colors"
          >
            <td class="px-4 py-4">
              <div>
                <p class="text-white font-medium">{{ download.title }}</p>
                <p v-if="download.version" class="text-aune-400 text-sm">v{{ download.version }}</p>
                <p v-if="download.original_filename" class="text-aune-500 text-xs mt-1 font-mono truncate max-w-[200px]" :title="download.original_filename">
                  {{ download.original_filename }}
                </p>
              </div>
            </td>
            <td class="px-4 py-4">
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', getCategoryBadgeClass(download.download_category)]">
                {{ getCategoryLabel(download.download_category) }}
              </span>
            </td>
            <td class="px-4 py-4">
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', getTypeBadgeClass(download.file_type)]">
                {{ getTypeLabel(download.file_type) }}
              </span>
            </td>
            <td class="px-4 py-4 text-aune-300 text-sm">
              {{ formatSize(download.file_size) }}
            </td>
            <td class="px-4 py-4 text-aune-300 text-sm">
              {{ download.download_count || 0 }}
            </td>
            <td class="px-4 py-4">
              <button
                @click="toggleActive(download)"
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                  download.is_active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                ]"
              >
                {{ download.is_active ? '已发布' : '已下架' }}
              </button>
            </td>
            <td class="px-4 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <a
                  :href="download.file_url"
                  target="_blank"
                  class="p-2 hover:bg-aune-600/50 rounded transition-colors"
                  title="下载"
                >
                  <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button
                  @click="openEditForm(download)"
                  class="p-2 hover:bg-aune-600/50 rounded transition-colors"
                  title="编辑"
                >
                  <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteDownload(download)"
                  :disabled="isDeleting"
                  class="p-2 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                  title="删除"
                >
                  <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Form Modal -->
    <Teleport to="body">
      <div 
        v-if="showForm" 
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8"
        @click.self="closeForm"
      >
        <div class="w-full max-w-3xl bg-aune-900 rounded-2xl shadow-2xl mx-4">
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-aune-700/50">
            <h2 class="text-xl font-semibold text-white">
              {{ editingId ? '编辑资源' : '添加资源' }}
            </h2>
            <button
              @click="closeForm"
              class="p-2 hover:bg-aune-700/50 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Modal Body -->
          <div class="p-6 space-y-6">
            <!-- Error Message -->
            <div 
              v-if="errorMessage" 
              class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
            >
              {{ errorMessage }}
            </div>
            
            <!-- File Upload -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">
                上传文件 <span class="text-red-400">*</span>
              </label>
              <div class="relative">
                <label class="block cursor-pointer">
                  <div 
                    :class="[
                      'border-2 border-dashed rounded-xl p-8 text-center transition-all',
                      isUploading ? 'border-gold-500/50 bg-gold-500/10' : 'border-aune-600/50 hover:border-aune-500 bg-aune-800/30'
                    ]"
                  >
                    <svg v-if="!isUploading" class="w-12 h-12 text-aune-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <svg v-else class="animate-spin w-12 h-12 text-gold-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-white font-medium mb-1">
                      {{ isUploading ? '上传中...' : (formData.file_url ? '已上传，点击更换' : '点击或拖拽上传文件') }}
                    </p>
                    <p class="text-aune-400 text-sm">
                      支持 .zip, .rar, .bin, .pdf, .exe, .dmg 等，最大 100MB
                    </p>
                  </div>
                  <input 
                    type="file" 
                    accept=".zip,.rar,.bin,.pdf,.exe,.dmg,.msi,.pkg,.doc,.docx"
                    @change="handleFileUpload"
                    class="hidden"
                    :disabled="isUploading"
                  />
                </label>
              </div>
              
              <!-- File Info -->
              <div v-if="formData.file_url" class="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div class="flex items-center gap-2 text-green-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="font-medium">文件已上传</span>
                </div>
                <p v-if="formData.original_filename" class="text-green-400/80 text-sm mt-1 font-mono">
                  原始文件名: {{ formData.original_filename }}
                </p>
              </div>
            </div>
            
            <!-- Title & Version -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-aune-300 mb-2">
                  标题 <span class="text-red-400">*</span>
                </label>
                <input
                  v-model="formData.title"
                  type="text"
                  class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="如：X8 固件更新 v2.0"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-aune-300 mb-2">
                  版本号
                </label>
                <input
                  v-model="formData.version"
                  type="text"
                  class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="如：2.0.1"
                />
              </div>
            </div>
            
            <!-- Category & Type -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-aune-300 mb-2">
                  产品分类 <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.download_category"
                  class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option v-for="cat in downloadCategories" :key="cat.value" :value="cat.value">
                    {{ cat.label }}
                  </option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-aune-300 mb-2">
                  资源类型 <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.file_type"
                  class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option v-for="type in fileTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>
            </div>
            
            <!-- Product Association -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">
                关联产品
              </label>
              <select
                v-model="formData.product_id"
                class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option :value="null">不关联产品</option>
                <option v-for="product in products" :key="product.id" :value="product.id">
                  {{ product.name }} ({{ product.model }})
                </option>
              </select>
            </div>
            
            <!-- Description (Rich Text) -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">
                详细说明 <span class="text-aune-500">(更新日志/安装说明)</span>
              </label>
              <RichTextEditor
                v-model="formData.description_html"
                placeholder="输入更新日志、新功能说明、安装步骤等..."
                min-height="250px"
              />
            </div>
            
            <!-- Active Status -->
            <div class="flex items-center gap-3">
              <input
                v-model="formData.is_active"
                type="checkbox"
                id="is_active"
                class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50"
              />
              <label for="is_active" class="text-aune-300">
                发布此资源（取消勾选将隐藏）
              </label>
            </div>
          </div>
          
          <!-- Modal Footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-aune-700/50">
            <button
              @click="closeForm"
              class="px-6 py-2 border border-aune-600 text-aune-300 rounded-lg hover:bg-aune-700/50 transition-colors"
            >
              取消
            </button>
            <button
              @click="saveDownload"
              :disabled="isSaving"
              class="px-6 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span v-if="isSaving">保存中...</span>
              <span v-else>{{ editingId ? '保存修改' : '创建资源' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
