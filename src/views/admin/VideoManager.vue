<script setup>
/**
 * Video Manager
 * CRUD management for homepage videos
 * Supports local upload and external links (Bilibili/YouTube)
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { supabase, uploadFile, STORAGE_BUCKETS, FILE_LIMITS } from '@/lib/supabase'
import { useDeleteWithStorage } from '@/composables/useDeleteWithStorage'

const { deleteHomeVideo: cascadeDeleteVideo, isDeleting } = useDeleteWithStorage()

// File input refs
const videoInputRef = ref(null)
const posterInputRef = ref(null)

// State
const videos = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const showModal = ref(false)
const editingVideo = ref(null)

// Form data
const form = reactive({
  id: null,
  title: '',
  description: '',
  source_type: 'external',
  video_url: '',
  external_platform: '',
  external_embed_code: '',
  poster_url: '',
  autoplay: true,
  muted: true,
  loop: true,
  show_controls: false,
  is_primary: false,
  is_active: true,
  sort_order: 0
})

// Source type options
const sourceTypes = [
  { value: 'local', label: '本地上传' },
  { value: 'external', label: '外部链接' }
]

// Platform options
const platformOptions = [
  { value: '', label: '直接视频链接' },
  { value: 'bilibili', label: 'B站' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'youku', label: '优酷' }
]

// Computed
const primaryVideo = computed(() => videos.value.find(v => v.is_primary))

/**
 * Fetch all videos
 */
async function fetchVideos() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('home_videos')
      .select('*')
      .order('sort_order')
    
    if (error) throw error
    videos.value = data || []
  } catch (error) {
    console.error('Failed to fetch videos:', error)
    alert('加载失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

/**
 * Open modal for creating new video
 */
function openCreateModal() {
  editingVideo.value = null
  Object.assign(form, {
    id: null,
    title: '',
    description: '',
    source_type: 'external',
    video_url: '',
    external_platform: '',
    external_embed_code: '',
    poster_url: '',
    autoplay: true,
    muted: true,
    loop: true,
    show_controls: false,
    is_primary: videos.value.length === 0,
    is_active: true,
    sort_order: videos.value.length
  })
  showModal.value = true
}

/**
 * Open modal for editing video
 */
function openEditModal(video) {
  editingVideo.value = video
  Object.assign(form, {
    id: video.id,
    title: video.title,
    description: video.description || '',
    source_type: video.source_type,
    video_url: video.video_url,
    external_platform: video.external_platform || '',
    external_embed_code: video.external_embed_code || '',
    poster_url: video.poster_url || '',
    autoplay: video.autoplay,
    muted: video.muted,
    loop: video.loop,
    show_controls: video.show_controls,
    is_primary: video.is_primary,
    is_active: video.is_active,
    sort_order: video.sort_order
  })
  showModal.value = true
}

/**
 * Close modal
 */
function closeModal() {
  showModal.value = false
  editingVideo.value = null
  uploadProgress.value = 0
}

// 视频大小限制 1GB（需确保 Supabase Storage bucket 设置对应）
// 若需调整，请同时修改：
// 1. Supabase Dashboard > Storage > videos > Settings > File size limit
// 2. 或执行 SQL: UPDATE storage.buckets SET file_size_limit = 1073741824 WHERE id = 'videos';
const VIDEO_SIZE_LIMIT = 1024 * 1024 * 1024 // 1GB

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

/**
 * Handle video upload with pre-check
 */
async function handleVideoUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // Pre-check file size BEFORE upload attempt
  if (file.size > VIDEO_SIZE_LIMIT) {
    const currentSize = formatFileSize(file.size)
    const maxSize = formatFileSize(VIDEO_SIZE_LIMIT)
    alert(`文件过大！\n\n当前文件: ${currentSize}\n大小限制: ${maxSize}\n\n请压缩视频后重试，或使用外部链接。`)
    // Clear the input
    event.target.value = ''
    return
  }
  
  // Validate file type
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
  if (!allowedTypes.includes(file.type)) {
    alert('不支持的视频格式！\n\n支持的格式: MP4、WebM、OGG、MOV')
    event.target.value = ''
    return
  }
  
  isUploading.value = true
  uploadProgress.value = 0
  
  try {
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const fileName = `home_video_${timestamp}.${ext}`
    
    const { data, error } = await uploadFile(STORAGE_BUCKETS.VIDEOS, fileName, file)
    
    if (error) {
      // 显示详细的服务器错误信息，方便调试
      console.error('Supabase Storage Error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // 根据错误类型给出具体提示
      const errorMsg = error.message || error.error || JSON.stringify(error)
      
      if (errorMsg.includes('Payload too large') || errorMsg.includes('413')) {
        throw new Error(`服务器拒绝：文件超过 Supabase 存储桶限制。\n\n原始错误: ${errorMsg}\n\n解决方案：\n1. 在 Supabase Dashboard > Storage > videos > Settings 调整限制\n2. 或使用外部视频链接`)
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        throw new Error(`存储桶 "videos" 不存在！\n\n请在 Supabase Dashboard 创建名为 "videos" 的存储桶`)
      } else if (errorMsg.includes('policy') || errorMsg.includes('permission') || errorMsg.includes('403')) {
        throw new Error(`权限不足！\n\n原始错误: ${errorMsg}\n\n请检查存储桶的 RLS 策略`)
      } else {
        throw new Error(`上传失败: ${errorMsg}`)
      }
    }
    
    form.video_url = data.publicUrl
    form.source_type = 'local'
    uploadProgress.value = 100
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上传失败: ' + error.message)
  } finally {
    isUploading.value = false
  }
}

/**
 * Handle poster upload
 */
async function handlePosterUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件')
    return
  }
  
  isUploading.value = true
  
  try {
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const fileName = `video_poster_${timestamp}.${ext}`
    
    const { data, error } = await uploadFile(STORAGE_BUCKETS.VIDEOS, fileName, file)
    
    if (error) throw error
    
    form.poster_url = data.publicUrl
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上传失败: ' + error.message)
  } finally {
    isUploading.value = false
  }
}

/**
 * Save video (create or update)
 */
async function saveVideo() {
  if (!form.title.trim()) {
    alert('请输入视频标题')
    return
  }
  
  if (!form.video_url && !form.external_embed_code) {
    alert('请上传视频或输入视频链接/嵌入代码')
    return
  }
  
  isSaving.value = true
  
  try {
    const videoData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      source_type: form.source_type,
      video_url: form.video_url,
      external_platform: form.external_platform || null,
      external_embed_code: form.external_embed_code.trim() || null,
      poster_url: form.poster_url || null,
      autoplay: form.autoplay,
      muted: form.muted,
      loop: form.loop,
      show_controls: form.show_controls,
      is_primary: form.is_primary,
      is_active: form.is_active,
      sort_order: form.sort_order
    }
    
    if (form.id) {
      // Update
      const { error } = await supabase
        .from('home_videos')
        .update(videoData)
        .eq('id', form.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('home_videos')
        .insert(videoData)
      
      if (error) throw error
    }
    
    await fetchVideos()
    closeModal()
  } catch (error) {
    console.error('Failed to save video:', error)
    alert('保存失败: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

/**
 * Delete video with cascade storage deletion
 */
async function deleteVideo(video) {
  if (!confirm(`确定要删除 "${video.title}" 吗？\n将同时删除存储中的视频和封面文件。`)) return
  
  const result = await cascadeDeleteVideo(video)
  
  if (result.success) {
    await fetchVideos()
  } else {
    alert('删除失败: ' + result.error)
  }
}

/**
 * Set as primary video
 */
async function setPrimary(video) {
  try {
    const { error } = await supabase
      .from('home_videos')
      .update({ is_primary: true })
      .eq('id', video.id)
    
    if (error) throw error
    await fetchVideos()
  } catch (error) {
    console.error('Failed to set primary:', error)
    alert('操作失败: ' + error.message)
  }
}

/**
 * Toggle video active status
 */
async function toggleActive(video) {
  try {
    const { error } = await supabase
      .from('home_videos')
      .update({ is_active: !video.is_active })
      .eq('id', video.id)
    
    if (error) throw error
    video.is_active = !video.is_active
  } catch (error) {
    console.error('Failed to toggle active:', error)
    alert('操作失败: ' + error.message)
  }
}

/**
 * Get source type label
 */
function getSourceLabel(type) {
  return type === 'local' ? '本地视频' : '外部链接'
}

// Lifecycle
onMounted(() => {
  fetchVideos()
})
</script>

<template>
  <div class="video-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">首页视频管理</h1>
        <p class="text-aune-400 text-sm mt-1">管理首页展示的视频，支持本地上传或外部链接</p>
      </div>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加视频
      </button>
    </div>
    
    <!-- Current Primary Video -->
    <div v-if="primaryVideo" class="mb-8 p-6 bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/30 rounded-xl">
      <div class="flex items-start gap-4">
        <div class="w-48 aspect-video bg-aune-800 rounded-lg overflow-hidden flex-shrink-0">
          <img 
            v-if="primaryVideo.poster_url"
            :src="primaryVideo.poster_url" 
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-12 h-12 text-aune-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2 py-0.5 bg-gold-500 text-white text-xs rounded font-medium">首页主视频</span>
            <span :class="['px-2 py-0.5 rounded text-xs', primaryVideo.source_type === 'local' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400']">
              {{ getSourceLabel(primaryVideo.source_type) }}
            </span>
          </div>
          <h3 class="text-white font-semibold text-lg">{{ primaryVideo.title }}</h3>
          <p v-if="primaryVideo.description" class="text-aune-400 text-sm mt-1">{{ primaryVideo.description }}</p>
          <div class="flex gap-2 mt-4">
            <button
              @click="openEditModal(primaryVideo)"
              class="px-3 py-1.5 bg-aune-700 text-white text-sm rounded hover:bg-aune-600 transition-colors"
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-8 h-8 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <!-- Videos List -->
    <div v-else class="space-y-4">
      <h2 class="text-white font-semibold">所有视频</h2>
      
      <div
        v-for="video in videos"
        :key="video.id"
        :class="[
          'flex items-center gap-4 p-4 rounded-xl border transition-colors',
          video.is_primary 
            ? 'bg-gold-500/5 border-gold-500/30' 
            : 'bg-aune-800/50 border-aune-700/50'
        ]"
      >
        <!-- Thumbnail -->
        <div class="w-32 aspect-video bg-aune-800 rounded-lg overflow-hidden flex-shrink-0">
          <img 
            v-if="video.poster_url"
            :src="video.poster_url" 
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-8 h-8 text-aune-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-white font-medium">{{ video.title }}</h3>
            <span v-if="video.is_primary" class="px-2 py-0.5 bg-gold-500 text-white text-xs rounded">主视频</span>
            <span 
              :class="[
                'px-2 py-0.5 rounded text-xs',
                video.source_type === 'local' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
              ]"
            >
              {{ getSourceLabel(video.source_type) }}
            </span>
            <span 
              v-if="!video.is_active"
              class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded"
            >
              已禁用
            </span>
          </div>
          <p class="text-aune-400 text-sm truncate">{{ video.video_url }}</p>
          <div class="flex gap-2 mt-2 text-xs text-aune-500">
            <span v-if="video.autoplay">自动播放</span>
            <span v-if="video.muted">静音</span>
            <span v-if="video.loop">循环</span>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            v-if="!video.is_primary"
            @click="setPrimary(video)"
            class="p-2 text-gold-400 hover:bg-gold-500/20 rounded-lg transition-colors"
            title="设为主视频"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          
          <button
            @click="toggleActive(video)"
            :class="[
              'p-2 rounded-lg transition-colors',
              video.is_active ? 'text-green-400 hover:bg-green-500/20' : 'text-aune-500 hover:bg-aune-700/50'
            ]"
            :title="video.is_active ? '禁用' : '启用'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="video.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path v-if="video.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
          
          <button
            @click="openEditModal(video)"
            class="p-2 text-aune-400 hover:text-white hover:bg-aune-700/50 rounded-lg transition-colors"
            title="编辑"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            @click="deleteVideo(video)"
            class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            title="删除"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="videos.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 text-aune-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p class="text-aune-500 mb-4">暂无首页视频</p>
        <button
          @click="openCreateModal"
          class="px-6 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors"
        >
          添加第一个视频
        </button>
      </div>
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
                {{ editingVideo ? '编辑视频' : '添加视频' }}
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
                <label class="block text-aune-300 text-sm mb-2">视频标题 *</label>
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="如：品牌宣传片"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                />
              </div>
              
              <!-- Description -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">视频描述</label>
                <textarea
                  v-model="form.description"
                  rows="2"
                  placeholder="简短描述（可选）"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500 resize-none"
                ></textarea>
              </div>
              
              <!-- Source Type -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">视频来源</label>
                <div class="flex gap-4">
                  <label 
                    v-for="type in sourceTypes" 
                    :key="type.value"
                    class="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      :value="type.value"
                      v-model="form.source_type"
                      class="text-gold-500 focus:ring-gold-500"
                    />
                    <span class="text-white">{{ type.label }}</span>
                  </label>
                </div>
              </div>
              
              <!-- Local Upload -->
              <div v-if="form.source_type === 'local'" class="space-y-4">
                <div>
                  <label class="block text-aune-300 text-sm mb-2">上传视频 *</label>
                  <div class="relative">
                    <!-- Hidden file input -->
                    <input 
                      ref="videoInputRef"
                      type="file" 
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      @change="handleVideoUpload"
                      class="hidden"
                    />
                    <!-- Clickable upload area -->
                    <div 
                      @click="videoInputRef?.click()"
                      :class="[
                        'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                        isUploading 
                          ? 'border-gold-500/50 bg-gold-500/10' 
                          : 'border-aune-600/50 hover:border-aune-500 bg-aune-800/30'
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
                        {{ isUploading ? '上传中...' : (form.video_url ? '已上传，点击更换' : '点击上传视频') }}
                      </p>
                      <p class="text-aune-400 text-sm">
                        支持 MP4、WebM、MOV，最大 1GB
                      </p>
                    </div>
                    
                    <!-- Upload Progress -->
                    <div v-if="isUploading" class="mt-4">
                      <div class="flex items-center justify-between text-sm mb-2">
                        <span class="text-aune-400">上传中...</span>
                        <span class="text-gold-500">{{ uploadProgress }}%</span>
                      </div>
                      <div class="h-2 bg-aune-700 rounded-full overflow-hidden">
                        <div 
                          class="h-full bg-gold-500 transition-all"
                          :style="{ width: uploadProgress + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Video URL Display -->
                <div v-if="form.video_url">
                  <label class="block text-aune-300 text-sm mb-2">视频地址</label>
                  <input
                    :value="form.video_url"
                    readonly
                    class="w-full px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-aune-400 text-sm"
                  />
                </div>
              </div>
              
              <!-- External Link -->
              <div v-else class="space-y-4">
                <div>
                  <label class="block text-aune-300 text-sm mb-2">外部平台</label>
                  <select
                    v-model="form.external_platform"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  >
                    <option v-for="opt in platformOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                
                <div v-if="!form.external_platform">
                  <label class="block text-aune-300 text-sm mb-2">视频直链 *</label>
                  <input
                    v-model="form.video_url"
                    type="url"
                    placeholder="https://example.com/video.mp4"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
                
                <div v-else>
                  <label class="block text-aune-300 text-sm mb-2">嵌入代码 *</label>
                  <textarea
                    v-model="form.external_embed_code"
                    rows="4"
                    placeholder="<iframe ...></iframe>"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500 font-mono text-sm"
                  ></textarea>
                  <p class="text-aune-500 text-xs mt-1">从 B站/YouTube 获取分享的嵌入代码</p>
                </div>
              </div>
              
              <!-- Poster Image -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">封面图（可选）</label>
                <div class="flex items-start gap-4">
                  <div 
                    v-if="form.poster_url"
                    class="w-32 aspect-video bg-aune-800 rounded-lg overflow-hidden"
                  >
                    <img :src="form.poster_url" class="w-full h-full object-cover" />
                  </div>
                  <!-- Hidden file input -->
                  <input 
                    ref="posterInputRef"
                    type="file" 
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    @change="handlePosterUpload"
                    class="hidden"
                  />
                  <button
                    type="button"
                    @click="posterInputRef?.click()"
                    class="px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-aune-300 hover:text-white hover:border-aune-500 cursor-pointer inline-flex items-center gap-2 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ form.poster_url ? '更换封面' : '上传封面' }}
                  </button>
                </div>
                <p class="text-aune-500 text-xs mt-2">支持 JPEG、PNG、GIF、WebP 格式</p>
              </div>
              
              <!-- Play Settings -->
              <div class="space-y-3 p-4 bg-aune-800/30 rounded-lg">
                <h3 class="text-white font-medium mb-3">播放设置</h3>
                <div class="grid grid-cols-2 gap-4">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="form.autoplay"
                      class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                    />
                    <span class="text-white">自动播放</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="form.muted"
                      class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                    />
                    <span class="text-white">默认静音</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="form.loop"
                      class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                    />
                    <span class="text-white">循环播放</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="form.show_controls"
                      class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                    />
                    <span class="text-white">显示控制条</span>
                  </label>
                </div>
              </div>
              
              <!-- Status -->
              <div class="flex gap-6">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_active"
                    class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                  />
                  <span class="text-white">启用</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_primary"
                    class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                  />
                  <span class="text-white">设为首页主视频</span>
                </label>
              </div>
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
                @click="saveVideo"
                :disabled="isSaving || isUploading"
                class="flex-1 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg v-if="isSaving" class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

