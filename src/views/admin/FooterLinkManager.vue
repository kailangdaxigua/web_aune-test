<script setup>
/**
 * Footer Link Manager
 * CRUD management for footer links grouped by category
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

// State
const links = ref([])
const pages = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const activeGroup = ref('purchase_channels')
const showModal = ref(false)
const editingLink = ref(null)

// Form data
const form = reactive({
  id: null,
  link_group: 'purchase_channels',
  label: '',
  url: '',
  page_id: null,
  is_external: false,
  icon_class: '',
  sort_order: 0,
  is_active: true
})

// Group options
const groups = [
  { value: 'purchase_channels', label: '购买渠道' },
  { value: 'about_aune', label: '关于aune' },
  { value: 'service_support', label: '服务支持' },
  { value: 'official_platforms', label: '官方平台' }
]

// Icon options
const iconOptions = [
  { value: '', label: '无图标' },
  { value: 'icon-weibo', label: '微博' },
  { value: 'icon-wechat', label: '微信' },
  { value: 'icon-tieba', label: '贴吧' },
  { value: 'icon-qq', label: 'QQ' }
]

// Computed
const groupedLinks = computed(() => {
  return links.value.filter(link => link.link_group === activeGroup.value)
    .sort((a, b) => a.sort_order - b.sort_order)
})

const currentGroupLabel = computed(() => {
  return groups.find(g => g.value === activeGroup.value)?.label || ''
})

/**
 * Fetch all links
 */
async function fetchLinks() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('footer_links')
      .select('*, page:pages(id, title, slug)')
      .order('sort_order')
    
    if (error) throw error
    links.value = data || []
  } catch (error) {
    console.error('Failed to fetch links:', error)
    alert('加载失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

/**
 * Fetch all pages for dropdown
 */
async function fetchPages() {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('id, title, slug')
      .eq('is_published', true)
      .order('title')
    
    if (error) throw error
    pages.value = data || []
  } catch (error) {
    console.error('Failed to fetch pages:', error)
  }
}

/**
 * Open modal for creating new link
 */
function openCreateModal() {
  editingLink.value = null
  Object.assign(form, {
    id: null,
    link_group: activeGroup.value,
    label: '',
    url: '',
    page_id: null,
    is_external: false,
    icon_class: '',
    sort_order: groupedLinks.value.length,
    is_active: true
  })
  showModal.value = true
}

/**
 * Open modal for editing link
 */
function openEditModal(link) {
  editingLink.value = link
  Object.assign(form, {
    id: link.id,
    link_group: link.link_group,
    label: link.label,
    url: link.url || '',
    page_id: link.page_id,
    is_external: link.is_external,
    icon_class: link.icon_class || '',
    sort_order: link.sort_order,
    is_active: link.is_active
  })
  showModal.value = true
}

/**
 * Close modal
 */
function closeModal() {
  showModal.value = false
  editingLink.value = null
}

/**
 * Save link (create or update)
 */
async function saveLink() {
  if (!form.label.trim()) {
    alert('请输入链接名称')
    return
  }
  
  if (!form.page_id && !form.url.trim()) {
    alert('请选择关联页面或输入链接地址')
    return
  }
  
  isSaving.value = true
  
  try {
    const linkData = {
      link_group: form.link_group,
      label: form.label.trim(),
      url: form.url.trim() || null,
      page_id: form.page_id || null,
      is_external: form.is_external,
      icon_class: form.icon_class || null,
      sort_order: form.sort_order,
      is_active: form.is_active
    }
    
    if (form.id) {
      // Update
      const { error } = await supabase
        .from('footer_links')
        .update(linkData)
        .eq('id', form.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('footer_links')
        .insert(linkData)
      
      if (error) throw error
    }
    
    await fetchLinks()
    closeModal()
  } catch (error) {
    console.error('Failed to save link:', error)
    alert('保存失败: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

/**
 * Delete link
 */
async function deleteLink(link) {
  if (!confirm(`确定要删除 "${link.label}" 吗？`)) return
  
  try {
    const { error } = await supabase
      .from('footer_links')
      .delete()
      .eq('id', link.id)
    
    if (error) throw error
    await fetchLinks()
  } catch (error) {
    console.error('Failed to delete link:', error)
    alert('删除失败: ' + error.message)
  }
}

/**
 * Toggle link active status
 */
async function toggleActive(link) {
  try {
    const { error } = await supabase
      .from('footer_links')
      .update({ is_active: !link.is_active })
      .eq('id', link.id)
    
    if (error) throw error
    link.is_active = !link.is_active
  } catch (error) {
    console.error('Failed to toggle active:', error)
    alert('操作失败: ' + error.message)
  }
}

/**
 * Move link up
 */
async function moveUp(index) {
  if (index === 0) return
  await swapOrder(index, index - 1)
}

/**
 * Move link down
 */
async function moveDown(index) {
  if (index === groupedLinks.value.length - 1) return
  await swapOrder(index, index + 1)
}

/**
 * Swap link order
 */
async function swapOrder(fromIndex, toIndex) {
  const items = [...groupedLinks.value]
  const fromItem = items[fromIndex]
  const toItem = items[toIndex]
  
  try {
    await Promise.all([
      supabase.from('footer_links').update({ sort_order: toIndex }).eq('id', fromItem.id),
      supabase.from('footer_links').update({ sort_order: fromIndex }).eq('id', toItem.id)
    ])
    
    await fetchLinks()
  } catch (error) {
    console.error('Failed to swap order:', error)
    alert('排序失败: ' + error.message)
  }
}

// Lifecycle
onMounted(() => {
  fetchLinks()
  fetchPages()
})
</script>

<template>
  <div class="footer-link-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">页脚链接管理</h1>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-400 transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加链接
      </button>
    </div>
    
    <!-- Group Tabs -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="group in groups"
        :key="group.value"
        @click="activeGroup = group.value"
        :class="[
          'px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors',
          activeGroup === group.value
            ? 'bg-gold-500 text-white'
            : 'bg-aune-800/50 text-aune-300 hover:bg-aune-700/50'
        ]"
      >
        {{ group.label }}
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <svg class="animate-spin w-8 h-8 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <!-- Links List -->
    <div v-else class="space-y-3">
      <div
        v-for="(link, index) in groupedLinks"
        :key="link.id"
        class="flex items-center gap-4 p-4 bg-aune-800/50 rounded-xl border border-aune-700/50"
      >
        <!-- Drag Handle & Order -->
        <div class="flex flex-col gap-1">
          <button
            @click="moveUp(index)"
            :disabled="index === 0"
            class="p-1 text-aune-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            @click="moveDown(index)"
            :disabled="index === groupedLinks.length - 1"
            class="p-1 text-aune-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <!-- Link Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-white font-medium">{{ link.label }}</span>
            <span 
              v-if="link.is_external"
              class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded"
            >
              外部链接
            </span>
            <span 
              v-if="link.page"
              class="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded"
            >
              关联页面
            </span>
            <span 
              v-if="!link.is_active"
              class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded"
            >
              已禁用
            </span>
          </div>
          <p class="text-aune-400 text-sm truncate mt-1">
            {{ link.page ? `/page/${link.page.slug}` : link.url }}
          </p>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            @click="toggleActive(link)"
            :class="[
              'p-2 rounded-lg transition-colors',
              link.is_active ? 'text-green-400 hover:bg-green-500/20' : 'text-aune-500 hover:bg-aune-700/50'
            ]"
            :title="link.is_active ? '禁用' : '启用'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="link.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path v-if="link.is_active" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
          
          <button
            @click="openEditModal(link)"
            class="p-2 text-aune-400 hover:text-white hover:bg-aune-700/50 rounded-lg transition-colors"
            title="编辑"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            @click="deleteLink(link)"
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
      <div v-if="groupedLinks.length === 0" class="text-center py-16">
        <p class="text-aune-500">{{ currentGroupLabel }}暂无链接</p>
        <button
          @click="openCreateModal"
          class="mt-4 text-gold-500 hover:text-gold-400"
        >
          添加第一个链接
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
          class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          @click.self="closeModal"
        >
          <div class="bg-aune-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-aune-700/50">
              <h2 class="text-xl font-bold text-white">
                {{ editingLink ? '编辑链接' : '添加链接' }}
              </h2>
              <button @click="closeModal" class="text-aune-400 hover:text-white">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Modal Body -->
            <div class="p-6 space-y-4">
              <!-- Group -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">所属分组</label>
                <select
                  v-model="form.link_group"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                >
                  <option v-for="group in groups" :key="group.value" :value="group.value">
                    {{ group.label }}
                  </option>
                </select>
              </div>
              
              <!-- Label -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">链接名称 *</label>
                <input
                  v-model="form.label"
                  type="text"
                  placeholder="如：天猫旗舰店"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                />
              </div>
              
              <!-- Link Type -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">链接类型</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      :value="false"
                      v-model="form.is_external"
                      class="text-gold-500 focus:ring-gold-500"
                    />
                    <span class="text-white">内部链接/页面</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      :value="true"
                      v-model="form.is_external"
                      class="text-gold-500 focus:ring-gold-500"
                    />
                    <span class="text-white">外部链接</span>
                  </label>
                </div>
              </div>
              
              <!-- Page Select (for internal links) -->
              <div v-if="!form.is_external">
                <label class="block text-aune-300 text-sm mb-2">关联页面</label>
                <select
                  v-model="form.page_id"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                >
                  <option :value="null">不关联页面</option>
                  <option v-for="page in pages" :key="page.id" :value="page.id">
                    {{ page.title }} (/page/{{ page.slug }})
                  </option>
                </select>
              </div>
              
              <!-- URL -->
              <div>
                <label class="block text-aune-300 text-sm mb-2">
                  {{ form.is_external ? '外部链接地址 *' : '内部路径（可选）' }}
                </label>
                <input
                  v-model="form.url"
                  type="text"
                  :placeholder="form.is_external ? 'https://...' : '/downloads'"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:border-gold-500"
                />
              </div>
              
              <!-- Icon (for official platforms) -->
              <div v-if="form.link_group === 'official_platforms'">
                <label class="block text-aune-300 text-sm mb-2">图标</label>
                <select
                  v-model="form.icon_class"
                  class="w-full px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:border-gold-500"
                >
                  <option v-for="icon in iconOptions" :key="icon.value" :value="icon.value">
                    {{ icon.label }}
                  </option>
                </select>
              </div>
              
              <!-- Active -->
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.is_active"
                  class="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 bg-aune-800 border-aune-600"
                />
                <span class="text-white">启用显示</span>
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
                @click="saveLink"
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

