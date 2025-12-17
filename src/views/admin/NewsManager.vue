<script setup>
/**
 * News Manager
 * CRUD management for news articles
 */
import { ref, reactive, onMounted } from 'vue'
import { supabase, uploadFile, STORAGE_BUCKETS } from '@/lib/supabase'
import RichTextEditor from '@/components/admin/RichTextEditor.vue'

// State
const news = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const isUploading = ref(false)
const showModal = ref(false)
const editingNews = ref(null)

// Form data
const form = reactive({
  id: null,
  title: '',
  slug: '',
  cover_image: '',
  excerpt: '',
  content_html: '',
  category: 'news',
  tags: [],
  is_published: false,
  is_featured: false,
  published_at: null,
  meta_title: '',
  meta_description: ''
})

// Category options
const categoryOptions = [
  { value: 'news', label: '新闻动态' },
  { value: 'product', label: '产品资讯' },
  { value: 'event', label: '活动公告' },
  { value: 'tech', label: '技术分享' }
]

/**
 * Fetch all news
 */
async function fetchNews() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    news.value = data || []
  } catch (error) {
    console.error('Failed to fetch news:', error)
    alert('加载失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

/**
 * Open modal for creating new article
 */
function openCreateModal() {
  editingNews.value = null
  Object.assign(form, {
    id: null,
    title: '',
    slug: '',
    cover_image: '',
    excerpt: '',
    content_html: '',
    category: 'news',
    tags: [],
    is_published: false,
    is_featured: false,
    published_at: null,
    meta_title: '',
    meta_description: ''
  })
  showModal.value = true
}

/**
 * Open modal for editing article
 */
function openEditModal(article) {
  editingNews.value = article
  Object.assign(form, {
    id: article.id,
    title: article.title,
    slug: article.slug,
    cover_image: article.cover_image || '',
    excerpt: article.excerpt || '',
    content_html: article.content_html || '',
    category: article.category || 'news',
    tags: article.tags || [],
    is_published: article.is_published,
    is_featured: article.is_featured,
    published_at: article.published_at ? article.published_at.slice(0, 16) : null,
    meta_title: article.meta_title || '',
    meta_description: article.meta_description || ''
  })
  showModal.value = true
}

/**
 * Close modal
 */
function closeModal() {
  showModal.value = false
  editingNews.value = null
}

/**
 * Generate slug from title
 */
function generateSlug() {
  if (!form.title) return
  const timestamp = Date.now().toString(36)
  form.slug = form.title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) + '-' + timestamp
}

/**
 * Handle cover image upload
 */
async function handleCoverUpload(event) {
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
    const fileName = `news_cover_${timestamp}.${ext}`
    
    const { data, error } = await uploadFile(STORAGE_BUCKETS.NEWS, fileName, file)
    
    if (error) throw error
    
    form.cover_image = data.publicUrl
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上传失败: ' + error.message)
  } finally {
    isUploading.value = false
  }
}

/**
 * Save article (create or update)
 */
async function saveNews() {
  if (!form.title.trim()) {
    alert('请输入文章标题')
    return
  }
  
  if (!form.slug.trim()) {
    generateSlug()
  }
  
  if (!form.content_html.trim()) {
    alert('请输入文章内容')
    return
  }
  
  isSaving.value = true
  
  try {
    const newsData = {
      title: form.title.trim(),
      slug: form.slug.trim().toLowerCase(),
      cover_image: form.cover_image || null,
      excerpt: form.excerpt.trim() || null,
      content_html: form.content_html,
      category: form.category,
      tags: form.tags,
      is_published: form.is_published,
      is_featured: form.is_featured,
      published_at: form.is_published ? (form.published_at || new Date().toISOString()) : null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null
    }
    
    if (form.id) {
      // Update
      const { error } = await supabase
        .from('news')
        .update(newsData)
        .eq('id', form.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('news')
        .insert(newsData)
      
      if (error) throw error
    }
    
    await fetchNews()
    closeModal()
  } catch (error) {
    console.error('Failed to save news:', error)
    if (error.code === '23505') {
      alert('Slug 已存在，请使用其他值')
    } else {
      alert('保存失败: ' + error.message)
    }
  } finally {
    isSaving.value = false
  }
}

/**
 * Delete article
 */
async function deleteNews(article) {
  if (!confirm(`确定要删除文章 "${article.title}" 吗？`)) return
  
  try {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', article.id)
    
    if (error) throw error
    await fetchNews()
  } catch (error) {
    console.error('Failed to delete news:', error)
    alert('删除失败: ' + error.message)
  }
}

/**
 * Toggle published status
 */
async function togglePublished(article) {
  try {
    const updates = { 
      is_published: !article.is_published,
      published_at: !article.is_published ? new Date().toISOString() : article.published_at
    }
    
    const { error } = await supabase
      .from('news')
      .update(updates)
      .eq('id', article.id)
    
    if (error) throw error
    article.is_published = !article.is_published
    if (!article.published_at && article.is_published) {
      article.published_at = new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to toggle published:', error)
    alert('操作失败: ' + error.message)
  }
}

/**
 * Toggle featured status
 */
async function toggleFeatured(article) {
  try {
    const { error } = await supabase
      .from('news')
      .update({ is_featured: !article.is_featured })
      .eq('id', article.id)
    
    if (error) throw error
    article.is_featured = !article.is_featured
  } catch (error) {
    console.error('Failed to toggle featured:', error)
    alert('操作失败: ' + error.message)
  }
}

/**
 * Handle editor content change
 */
function handleEditorChange(content) {
  form.content_html = content
}

/**
 * Format date
 */
function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Get category label
 */
function getCategoryLabel(value) {
  return categoryOptions.find(c => c.value === value)?.label || value
}

// Lifecycle
onMounted(() => {
  fetchNews()
})
</script>

<template>
  <div class="news-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">新闻管理</h1>
        <p class="text-aune-400 text-sm mt-1">管理新闻资讯文章</p>
      </div>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        发布文章
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-8 h-8 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <!-- News List -->
    <div v-else class="space-y-4">
      <div
        v-for="article in news"
        :key="article.id"
        class="flex gap-4 p-4 bg-aune-800/50 rounded-xl border border-aune-700/50 hover:border-aune-600/50 transition-colors"
      >
        <!-- Cover Image -->
        <div class="w-40 h-24 flex-shrink-0 bg-aune-700/50 rounded-lg overflow-hidden">
          <img 
            v-if="article.cover_image"
            :src="article.cover_image" 
            :alt="article.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-8 h-8 text-aune-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-white font-medium truncate">{{ article.title }}</h3>
                <span v-if="article.is_featured" class="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded">置顶</span>
              </div>
              <div class="flex items-center gap-3 text-sm">
                <span class="text-aune-400">{{ getCategoryLabel(article.category) }}</span>
                <span class="text-aune-600">|</span>
                <span class="text-aune-400">{{ formatDate(article.published_at || article.created_at) }}</span>
                <span class="text-aune-600">|</span>
                <span class="text-aune-400">{{ article.view_count || 0 }} 阅读</span>
              </div>
              <p v-if="article.excerpt" class="text-aune-500 text-sm mt-2 line-clamp-2">
                {{ article.excerpt }}
              </p>
            </div>
            
            <!-- Status -->
            <span 
              :class="[
                'px-2 py-1 rounded text-xs font-medium flex-shrink-0',
                article.is_published ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              ]"
            >
              {{ article.is_published ? '已发布' : '草稿' }}
            </span>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <a
            v-if="article.is_published"
            :href="`/news/${article.slug}`"
            target="_blank"
            class="p-2 text-aune-400 hover:text-white hover:bg-aune-700/50 rounded-lg transition-colors"
            title="预览"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            @click="toggleFeatured(article)"
            :class="[
              'p-2 rounded-lg transition-colors',
              article.is_featured ? 'text-gold-400 hover:bg-gold-500/20' : 'text-aune-500 hover:bg-aune-700/50'
            ]"
            title="置顶"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            @click="togglePublished(article)"
            :class="[
              'p-2 rounded-lg transition-colors',
              article.is_published ? 'text-green-400 hover:bg-green-500/20' : 'text-aune-500 hover:bg-aune-700/50'
            ]"
            :title="article.is_published ? '取消发布' : '发布'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            @click="openEditModal(article)"
            class="p-2 text-aune-400 hover:text-white hover:bg-aune-700/50 rounded-lg transition-colors"
            title="编辑"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            @click="deleteNews(article)"
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
      <div v-if="news.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 text-aune-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <p class="text-aune-500 mb-4">暂无新闻文章</p>
        <button
          @click="openCreateModal"
          class="px-6 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors"
        >
          发布第一篇文章
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
          class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
          @click.self="closeModal"
        >
          <div class="bg-aune-900 rounded-2xl w-full max-w-4xl shadow-2xl my-8">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-aune-700/50">
              <h2 class="text-xl font-bold text-white">
                {{ editingNews ? '编辑文章' : '发布文章' }}
              </h2>
              <button @click="closeModal" class="text-aune-400 hover:text-white">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Modal Body -->
            <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <!-- Title -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">文章标题 *</label>
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="输入文章标题"
                  @blur="!form.slug && generateSlug()"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                />
              </div>
              
              <!-- Cover Image -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">封面图片</label>
                <div class="flex items-start gap-4">
                  <div 
                    v-if="form.cover_image"
                    class="w-40 h-24 bg-aune-800 rounded-lg overflow-hidden"
                  >
                    <img :src="form.cover_image" class="w-full h-full object-cover" />
                  </div>
                  <label class="block">
                    <span class="px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-aune-300 hover:text-white hover:border-aune-500 cursor-pointer inline-flex items-center gap-2 transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {{ form.cover_image ? '更换封面' : '上传封面' }}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      @change="handleCoverUpload"
                      class="hidden"
                    />
                  </label>
                </div>
              </div>
              
              <!-- Category & Settings -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-aune-300 text-sm mb-2">分类</label>
                  <select
                    v-model="form.category"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  >
                    <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">
                      {{ cat.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">发布时间</label>
                  <input
                    v-model="form.published_at"
                    type="datetime-local"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
              
              <!-- Excerpt -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">摘要</label>
                <textarea
                  v-model="form.excerpt"
                  rows="2"
                  placeholder="文章摘要（显示在列表中）"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500 resize-none"
                ></textarea>
              </div>
              
              <!-- Rich Text Editor -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">文章内容 *</label>
                <RichTextEditor
                  :modelValue="form.content_html"
                  @update:modelValue="handleEditorChange"
                  placeholder="输入文章内容..."
                />
              </div>
              
              <!-- Status -->
              <div class="flex gap-6">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_published"
                    class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                  />
                  <span class="text-white">立即发布</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_featured"
                    class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                  />
                  <span class="text-white">置顶文章</span>
                </label>
              </div>
              
              <!-- SEO Settings -->
              <div class="p-4 bg-aune-800/30 rounded-lg space-y-4">
                <h3 class="text-white font-medium">SEO 设置（可选）</h3>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">Slug</label>
                  <input
                    v-model="form.slug"
                    type="text"
                    placeholder="自动生成"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">Meta 标题</label>
                  <input
                    v-model="form.meta_title"
                    type="text"
                    placeholder="留空则使用文章标题"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">Meta 描述</label>
                  <textarea
                    v-model="form.meta_description"
                    rows="2"
                    placeholder="页面描述（用于搜索引擎）"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500 resize-none"
                  ></textarea>
                </div>
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
                @click="saveNews"
                :disabled="isSaving || isUploading"
                class="flex-1 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg v-if="isSaving" class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
