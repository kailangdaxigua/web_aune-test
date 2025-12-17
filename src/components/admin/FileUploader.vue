<script setup>
/**
 * File Uploader Component
 * Supports drag & drop, multiple files, size/type validation
 */
import { ref, computed } from 'vue'
import { supabase, uploadFile, STORAGE_BUCKETS, FILE_LIMITS } from '@/lib/supabase'

const props = defineProps({
  bucket: {
    type: String,
    default: STORAGE_BUCKETS.DOWNLOADS
  },
  accept: {
    type: String,
    default: '.zip,.rar,.bin,.pdf,.exe,.dmg'
  },
  maxSize: {
    type: Number,
    default: FILE_LIMITS.DOWNLOAD
  },
  multiple: {
    type: Boolean,
    default: false
  },
  folder: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['uploaded', 'error'])

// State
const isDragging = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const files = ref([])
const errorMessage = ref('')

// Computed
const formattedMaxSize = computed(() => {
  const mb = props.maxSize / (1024 * 1024)
  return `${mb}MB`
})

/**
 * Handle file selection
 */
function handleFileSelect(event) {
  const selectedFiles = Array.from(event.target.files)
  processFiles(selectedFiles)
}

/**
 * Handle drag over
 */
function handleDragOver(event) {
  event.preventDefault()
  isDragging.value = true
}

/**
 * Handle drag leave
 */
function handleDragLeave() {
  isDragging.value = false
}

/**
 * Handle file drop
 */
function handleDrop(event) {
  event.preventDefault()
  isDragging.value = false
  
  const droppedFiles = Array.from(event.dataTransfer.files)
  processFiles(droppedFiles)
}

/**
 * Process and validate files
 */
function processFiles(fileList) {
  errorMessage.value = ''
  
  for (const file of fileList) {
    // Validate file size
    if (file.size > props.maxSize) {
      errorMessage.value = `文件 "${file.name}" 超过大小限制 (${formattedMaxSize.value})`
      emit('error', errorMessage.value)
      return
    }
    
    // Add to queue
    if (props.multiple) {
      files.value.push({
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending'
      })
    } else {
      files.value = [{
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending'
      }]
    }
  }
  
  // Auto upload
  uploadFiles()
}

/**
 * Upload files to Supabase Storage
 */
async function uploadFiles() {
  if (files.value.length === 0) return
  
  isUploading.value = true
  
  for (const fileItem of files.value) {
    if (fileItem.status !== 'pending') continue
    
    fileItem.status = 'uploading'
    
    try {
      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedName = fileItem.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = props.folder 
        ? `${props.folder}/${timestamp}_${sanitizedName}`
        : `${timestamp}_${sanitizedName}`
      
      // Upload file
      const { data, error } = await uploadFile(
        props.bucket,
        filePath,
        fileItem.file
      )
      
      if (error) {
        fileItem.status = 'error'
        fileItem.error = error.message
        errorMessage.value = error.message
        emit('error', error.message)
        continue
      }
      
      fileItem.status = 'completed'
      fileItem.url = data.publicUrl
      fileItem.path = data.path
      
      // Emit uploaded event
      emit('uploaded', {
        name: fileItem.name,
        size: fileItem.size,
        url: data.publicUrl,
        path: data.path
      })
    } catch (error) {
      fileItem.status = 'error'
      fileItem.error = error.message
      errorMessage.value = error.message
      emit('error', error.message)
    }
  }
  
  isUploading.value = false
}

/**
 * Remove file from queue
 */
function removeFile(index) {
  files.value.splice(index, 1)
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * Get file icon based on extension
 */
function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  
  const icons = {
    zip: '📦',
    rar: '📦',
    pdf: '📄',
    bin: '💾',
    exe: '⚙️',
    dmg: '💿'
  }
  
  return icons[ext] || '📁'
}
</script>

<template>
  <div class="file-uploader">
    <!-- Drop Zone -->
    <div
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      :class="[
        'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
        isDragging 
          ? 'border-gold-500 bg-gold-500/10' 
          : 'border-aune-600/50 hover:border-aune-500 bg-aune-800/30'
      ]"
    >
      <input
        type="file"
        :accept="accept"
        :multiple="multiple"
        @change="handleFileSelect"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div class="pointer-events-none">
        <div class="w-16 h-16 mx-auto mb-4 bg-aune-700/50 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <p class="text-white font-medium mb-1">
          拖拽文件到此处，或
          <span class="text-gold-500">点击选择</span>
        </p>
        
        <p class="text-aune-400 text-sm">
          支持 {{ accept }} 格式，单个文件最大 {{ formattedMaxSize }}
        </p>
      </div>
    </div>
    
    <!-- Error Message -->
    <div 
      v-if="errorMessage" 
      class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
    >
      {{ errorMessage }}
    </div>
    
    <!-- File List -->
    <div v-if="files.length > 0" class="mt-4 space-y-2">
      <div
        v-for="(fileItem, index) in files"
        :key="index"
        class="flex items-center justify-between p-3 bg-aune-800/50 rounded-lg"
      >
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="text-2xl">{{ getFileIcon(fileItem.name) }}</span>
          
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">
              {{ fileItem.name }}
            </p>
            <p class="text-aune-400 text-xs">
              {{ formatSize(fileItem.size) }}
            </p>
          </div>
        </div>
        
        <!-- Status -->
        <div class="flex items-center gap-2">
          <!-- Uploading -->
          <div v-if="fileItem.status === 'uploading'" class="flex items-center gap-2">
            <svg class="animate-spin w-5 h-5 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-aune-400 text-sm">上传中...</span>
          </div>
          
          <!-- Completed -->
          <div v-else-if="fileItem.status === 'completed'" class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-green-400 text-sm">已上传</span>
          </div>
          
          <!-- Error -->
          <div v-else-if="fileItem.status === 'error'" class="flex items-center gap-2">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span class="text-red-400 text-sm">失败</span>
          </div>
          
          <!-- Remove Button -->
          <button
            v-if="fileItem.status !== 'uploading'"
            @click="removeFile(index)"
            class="p-1.5 hover:bg-aune-700/50 rounded transition-colors"
          >
            <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

