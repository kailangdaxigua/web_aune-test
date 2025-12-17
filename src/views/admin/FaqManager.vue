<script setup>
/**
 * FAQ Manager
 * 常见问题后台管理页面
 * 支持问题、富文本答案、分类、排序的 CRUD
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import RichTextEditor from '@/components/admin/RichTextEditor.vue'

// State
const faqs = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const errorMessage = ref('')
const successMessage = ref('')
const filterCategory = ref('all')

// Form data
const formData = ref({
  question: '',
  answer_html: '',
  category: '',
  sort_order: 0,
  is_active: true,
  is_featured: false
})

// 预设分类
const presetCategories = ['使用指南', '技术支持', '售后服务', '故障排查', '购买咨询', '其他']

// 获取所有分类
const categories = computed(() => {
  const cats = [...new Set(faqs.value.map(f => f.category).filter(Boolean))]
  return [...new Set([...presetCategories, ...cats])]
})

// 筛选后的 FAQ
const filteredFaqs = computed(() => {
  if (filterCategory.value === 'all') return faqs.value
  return faqs.value.filter(f => f.category === filterCategory.value)
})

// 加载数据
onMounted(async () => {
  await loadFaqs()
})

/**
 * 加载 FAQ 列表
 */
async function loadFaqs() {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('sort_order')
    
    if (error) throw error
    faqs.value = data || []
  } catch (error) {
    errorMessage.value = '加载失败: ' + error.message
  } finally {
    isLoading.value = false
  }
}

/**
 * 打开新建表单
 */
function openNewForm() {
  editingId.value = null
  formData.value = {
    question: '',
    answer_html: '',
    category: '',
    sort_order: faqs.value.length,
    is_active: true,
    is_featured: false
  }
  showForm.value = true
  errorMessage.value = ''
}

/**
 * 打开编辑表单
 */
function openEditForm(faq) {
  editingId.value = faq.id
  formData.value = { ...faq }
  showForm.value = true
  errorMessage.value = ''
}

/**
 * 关闭表单
 */
function closeForm() {
  showForm.value = false
  editingId.value = null
  errorMessage.value = ''
}

/**
 * 保存 FAQ
 */
async function saveFaq() {
  if (!formData.value.question) {
    errorMessage.value = '请输入问题'
    return
  }
  
  if (!formData.value.answer_html) {
    errorMessage.value = '请输入答案'
    return
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const payload = {
      question: formData.value.question,
      answer_html: formData.value.answer_html,
      category: formData.value.category || null,
      sort_order: formData.value.sort_order,
      is_active: formData.value.is_active,
      is_featured: formData.value.is_featured
    }
    
    if (editingId.value) {
      const { error } = await supabase
        .from('faqs')
        .update(payload)
        .eq('id', editingId.value)
      
      if (error) throw error
      successMessage.value = '更新成功'
    } else {
      const { error } = await supabase
        .from('faqs')
        .insert(payload)
      
      if (error) throw error
      successMessage.value = '创建成功'
    }
    
    await loadFaqs()
    closeForm()
  } catch (error) {
    errorMessage.value = '保存失败: ' + error.message
  } finally {
    isSaving.value = false
  }
}

/**
 * 删除 FAQ
 */
async function deleteFaq(faq) {
  if (!confirm(`确定要删除这条问答吗？\n"${faq.question}"`)) return
  
  try {
    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', faq.id)
    
    if (error) throw error
    
    await loadFaqs()
    successMessage.value = '删除成功'
  } catch (error) {
    errorMessage.value = '删除失败: ' + error.message
  }
}

/**
 * 切换状态
 */
async function toggleActive(faq) {
  try {
    const { error } = await supabase
      .from('faqs')
      .update({ is_active: !faq.is_active })
      .eq('id', faq.id)
    
    if (error) throw error
    faq.is_active = !faq.is_active
  } catch (error) {
    errorMessage.value = '更新状态失败: ' + error.message
  }
}

/**
 * 调整排序
 */
async function updateSortOrder(faq, direction) {
  const currentIndex = faqs.value.findIndex(f => f.id === faq.id)
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  
  if (targetIndex < 0 || targetIndex >= faqs.value.length) return
  
  const targetFaq = faqs.value[targetIndex]
  
  try {
    // 交换排序值
    await Promise.all([
      supabase.from('faqs').update({ sort_order: targetFaq.sort_order }).eq('id', faq.id),
      supabase.from('faqs').update({ sort_order: faq.sort_order }).eq('id', targetFaq.id)
    ])
    
    await loadFaqs()
  } catch (error) {
    errorMessage.value = '调整排序失败: ' + error.message
  }
}

/**
 * 截取答案预览
 */
function getAnswerPreview(html) {
  const text = html?.replace(/<[^>]*>/g, '') || ''
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}
</script>

<template>
  <div class="faq-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">FAQ 管理</h1>
        <p class="text-aune-400 mt-1">管理常见问题与解答</p>
      </div>
      
      <button
        @click="openNewForm"
        class="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        添加问题
      </button>
    </div>
    
    <!-- Messages -->
    <div v-if="successMessage" class="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage && !showForm" class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
      {{ errorMessage }}
    </div>
    
    <!-- Filter -->
    <div class="flex items-center gap-4 mb-6">
      <select
        v-model="filterCategory"
        class="px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
      >
        <option value="all">全部分类</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      
      <span class="text-aune-400 text-sm">
        共 {{ filteredFaqs.length }} 条问答
      </span>
    </div>
    
    <!-- List -->
    <div class="space-y-4">
      <!-- Loading -->
      <div v-if="isLoading" class="p-8 text-center bg-aune-800/50 rounded-xl border border-aune-700/50">
        <svg class="animate-spin w-8 h-8 mx-auto text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="mt-2 text-aune-400">加载中...</p>
      </div>
      
      <!-- Empty -->
      <div v-else-if="filteredFaqs.length === 0" class="p-8 text-center bg-aune-800/50 rounded-xl border border-aune-700/50">
        <p class="text-aune-400">暂无问答数据</p>
      </div>
      
      <!-- FAQ Items -->
      <div
        v-for="(faq, index) in filteredFaqs"
        :key="faq.id"
        class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden hover:border-aune-600/50 transition-colors"
      >
        <div class="flex items-start gap-4 p-4">
          <!-- Sort Buttons -->
          <div class="flex flex-col gap-1">
            <button
              @click="updateSortOrder(faq, 'up')"
              :disabled="index === 0"
              class="p-1 hover:bg-aune-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              @click="updateSortOrder(faq, 'down')"
              :disabled="index === filteredFaqs.length - 1"
              class="p-1 hover:bg-aune-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-white font-medium mb-1">{{ faq.question }}</h3>
                <p class="text-aune-400 text-sm line-clamp-2">{{ getAnswerPreview(faq.answer_html) }}</p>
              </div>
              
              <div class="flex items-center gap-2 flex-shrink-0">
                <span 
                  v-if="faq.category"
                  class="px-2 py-1 bg-aune-700/50 text-aune-300 text-xs rounded"
                >
                  {{ faq.category }}
                </span>
                <span 
                  v-if="faq.is_featured"
                  class="px-2 py-1 bg-gold-500/20 text-gold-400 text-xs rounded"
                >
                  置顶
                </span>
              </div>
            </div>
            
            <!-- Stats -->
            <div class="flex items-center gap-4 mt-3 text-xs text-aune-500">
              <span>浏览 {{ faq.view_count || 0 }}</span>
              <span>有帮助 {{ faq.helpful_count || 0 }}</span>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              @click="toggleActive(faq)"
              :class="[
                'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                faq.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              ]"
            >
              {{ faq.is_active ? '已发布' : '未发布' }}
            </button>
            <button
              @click="openEditForm(faq)"
              class="p-2 hover:bg-aune-600/50 rounded transition-colors"
              title="编辑"
            >
              <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="deleteFaq(faq)"
              class="p-2 hover:bg-red-500/20 rounded transition-colors"
              title="删除"
            >
              <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Form Modal -->
    <Teleport to="body">
      <div 
        v-if="showForm"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8"
        @click.self="closeForm"
      >
        <div class="w-full max-w-3xl bg-aune-900 rounded-2xl shadow-2xl mx-4">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-aune-700/50">
            <h2 class="text-xl font-semibold text-white">
              {{ editingId ? '编辑问答' : '添加问答' }}
            </h2>
            <button @click="closeForm" class="p-2 hover:bg-aune-700/50 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Body -->
          <div class="p-6 space-y-6">
            <!-- Error -->
            <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {{ errorMessage }}
            </div>
            
            <!-- Question -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">
                问题 <span class="text-red-400">*</span>
              </label>
              <input
                v-model="formData.question"
                type="text"
                class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                placeholder="如：如何连接蓝牙设备？"
              />
            </div>
            
            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">分类</label>
              <select
                v-model="formData.category"
                class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="">不分类</option>
                <option v-for="cat in presetCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            
            <!-- Answer -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">
                答案 <span class="text-red-400">*</span>
              </label>
              <RichTextEditor
                v-model="formData.answer_html"
                placeholder="输入详细的解答内容..."
                min-height="300px"
              />
            </div>
            
            <!-- Status -->
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="formData.is_active"
                  class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50"
                />
                <span class="text-aune-300">发布</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="formData.is_featured"
                  class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50"
                />
                <span class="text-aune-300">置顶显示</span>
              </label>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-aune-700/50">
            <button
              @click="closeForm"
              class="px-6 py-2 border border-aune-600 text-aune-300 rounded-lg hover:bg-aune-700/50 transition-colors"
            >
              取消
            </button>
            <button
              @click="saveFaq"
              :disabled="isSaving"
              class="px-6 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 transition-all"
            >
              {{ isSaving ? '保存中...' : (editingId ? '保存修改' : '创建问答') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

