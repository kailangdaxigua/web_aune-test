<script setup>
/**
 * Page Manager
 * CRUD management for static pages (about, support, warranty, etc.)
 */
import { ref, reactive, onMounted } from 'vue'
import { supabase, uploadFile, STORAGE_BUCKETS } from '@/lib/supabase'
import RichTextEditor from '@/components/admin/RichTextEditor.vue'

// State
const pages = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const showModal = ref(false)
const editingPage = ref(null)

// Form data
const form = reactive({
  id: null,
  title: '',
  slug: '',
  page_type: 'static',
  content_html: '',
  is_published: true,
  meta_title: '',
  meta_description: ''
})

// Page type options
const pageTypes = [
  { value: 'static', label: '静态页面' },
  { value: 'service', label: '服务支持' },
  { value: 'about', label: '关于我们' }
]

/**
 * Fetch all pages
 */
async function fetchPages() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    pages.value = data || []
  } catch (error) {
    console.error('Failed to fetch pages:', error)
    alert('加载失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

/**
 * Open modal for creating new page
 */
function openCreateModal() {
  editingPage.value = null
  Object.assign(form, {
    id: null,
    title: '',
    slug: '',
    page_type: 'static',
    content_html: '',
    is_published: true,
    meta_title: '',
    meta_description: ''
  })
  showModal.value = true
}

/**
 * Open modal for editing page
 */
function openEditModal(page) {
  editingPage.value = page
  Object.assign(form, {
    id: page.id,
    title: page.title,
    slug: page.slug,
    page_type: page.page_type || 'static',
    content_html: page.content_html || '',
    is_published: page.is_published,
    meta_title: page.meta_title || '',
    meta_description: page.meta_description || ''
  })
  showModal.value = true
}

/**
 * Close modal
 */
function closeModal() {
  showModal.value = false
  editingPage.value = null
}

/**
 * Generate slug from title
 */
function generateSlug() {
  if (!form.title) return
  form.slug = form.title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Save page (create or update)
 */
async function savePage() {
  if (!form.title.trim()) {
    alert('请输入页面标题')
    return
  }
  
  if (!form.slug.trim()) {
    alert('请输入页面 Slug')
    return
  }
  
  isSaving.value = true
  
  try {
    const pageData = {
      title: form.title.trim(),
      slug: form.slug.trim().toLowerCase(),
      page_type: form.page_type,
      content_html: form.content_html,
      is_published: form.is_published,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null
    }
    
    if (form.id) {
      // Update
      const { error } = await supabase
        .from('pages')
        .update(pageData)
        .eq('id', form.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('pages')
        .insert(pageData)
      
      if (error) throw error
    }
    
    await fetchPages()
    closeModal()
  } catch (error) {
    console.error('Failed to save page:', error)
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
 * Delete page
 */
async function deletePage(page) {
  if (!confirm(`确定要删除页面 "${page.title}" 吗？`)) return
  
  try {
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', page.id)
    
    if (error) throw error
    await fetchPages()
  } catch (error) {
    console.error('Failed to delete page:', error)
    alert('删除失败: ' + error.message)
  }
}

/**
 * Toggle page published status
 */
async function togglePublished(page) {
  try {
    const { error } = await supabase
      .from('pages')
      .update({ is_published: !page.is_published })
      .eq('id', page.id)
    
    if (error) throw error
    page.is_published = !page.is_published
  } catch (error) {
    console.error('Failed to toggle published:', error)
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
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  fetchPages()
})
</script>

<template>
  <div class="page-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">页面管理</h1>
        <p class="text-aune-400 text-sm mt-1">管理静态页面（关于我们、售后政策等）</p>
      </div>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加页面
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-8 h-8 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <!-- Pages Table -->
    <div v-else class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden">
      <table class="w-full">
        <thead class="bg-aune-800/50">
          <tr>
            <th class="px-6 py-4 text-left text-aune-300 font-medium">页面标题</th>
            <th class="px-6 py-4 text-left text-aune-300 font-medium">Slug</th>
            <th class="px-6 py-4 text-left text-aune-300 font-medium">类型</th>
            <th class="px-6 py-4 text-left text-aune-300 font-medium">状态</th>
            <th class="px-6 py-4 text-left text-aune-300 font-medium">更新时间</th>
            <th class="px-6 py-4 text-right text-aune-300 font-medium">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-aune-700/50">
          <tr 
            v-for="page in pages" 
            :key="page.id"
            class="hover:bg-aune-700/30 transition-colors"
          >
            <td class="px-6 py-4">
              <span class="text-white font-medium">{{ page.title }}</span>
            </td>
            <td class="px-6 py-4">
              <code class="text-aune-400 text-sm bg-aune-700/50 px-2 py-1 rounded">/page/{{ page.slug }}</code>
            </td>
            <td class="px-6 py-4">
              <span class="text-aune-300 text-sm">{{ pageTypes.find(t => t.value === page.page_type)?.label || '静态页面' }}</span>
            </td>
            <td class="px-6 py-4">
              <span 
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  page.is_published ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                ]"
              >
                {{ page.is_published ? '已发布' : '草稿' }}
              </span>
            </td>
            <td class="px-6 py-4 text-aune-400 text-sm">
              {{ formatDate(page.updated_at) }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <a
                  :href="`/page/${page.slug}`"
                  target="_blank"
                  class="p-2 text-aune-400 hover:text-white hover:bg-aune-700/50 rounded-lg transition-colors"
                  title="预览"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  @click="togglePublished(page)"
                  :class="[
                    'p-2 rounded-lg transition-colors',
                    page.is_published ? 'text-green-400 hover:bg-green-500/20' : 'text-aune-500 hover:bg-aune-700/50'
                  ]"
                  :title="page.is_published ? '取消发布' : '发布'"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="page.is_published" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path v-if="page.is_published" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
                <button
                  @click="openEditModal(page)"
                  class="p-2 text-aune-400 hover:text-white hover:bg-aune-700/50 rounded-lg transition-colors"
                  title="编辑"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deletePage(page)"
                  class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="删除"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Empty State -->
      <div v-if="pages.length === 0" class="text-center py-16">
        <svg class="w-16 h-16 text-aune-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-aune-500 mb-4">暂无页面</p>
        <button
          @click="openCreateModal"
          class="px-6 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors"
        >
          创建第一个页面
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
                {{ editingPage ? '编辑页面' : '添加页面' }}
              </h2>
              <button @click="closeModal" class="text-aune-400 hover:text-white">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Modal Body -->
            <div class="p-6 space-y-6">
              <!-- Basic Info -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-aune-300 text-sm mb-2">页面标题 *</label>
                  <input
                    v-model="form.title"
                    type="text"
                    placeholder="如：售后政策"
                    @blur="!form.slug && generateSlug()"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">Slug *</label>
                  <div class="flex">
                    <span class="px-3 py-2 bg-aune-700/50 border border-r-0 border-aune-600/50 rounded-l-lg text-aune-400 text-sm">/page/</span>
                    <input
                      v-model="form.slug"
                      type="text"
                      placeholder="warranty"
                      class="flex-1 px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-r-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                    />
                  </div>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-aune-300 text-sm mb-2">页面类型</label>
                  <select
                    v-model="form.page_type"
                    class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  >
                    <option v-for="type in pageTypes" :key="type.value" :value="type.value">
                      {{ type.label }}
                    </option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="form.is_published"
                      class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                    />
                    <span class="text-white">立即发布</span>
                  </label>
                </div>
              </div>
              
              <!-- Rich Text Editor -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">页面内容</label>
                <RichTextEditor
                  :modelValue="form.content_html"
                  @update:modelValue="handleEditorChange"
                  placeholder="输入页面内容..."
                />
              </div>
              
              <!-- SEO Settings -->
              <div class="p-4 bg-aune-800/30 rounded-lg space-y-4">
                <h3 class="text-white font-medium">SEO 设置（可选）</h3>
                <div>
                  <label class="block text-aune-300 text-sm mb-2">Meta 标题</label>
                  <input
                    v-model="form.meta_title"
                    type="text"
                    placeholder="留空则使用页面标题"
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
                @click="savePage"
                :disabled="isSaving"
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
