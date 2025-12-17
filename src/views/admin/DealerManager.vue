<script setup>
/**
 * Dealer Manager
 * 经销商后台管理页面
 * 支持线下体验店和线上授权店的 CRUD
 */
import { ref, computed, onMounted } from 'vue'
import { supabase, uploadFile, STORAGE_BUCKETS, FILE_LIMITS } from '@/lib/supabase'
import { useDeleteWithStorage } from '@/composables/useDeleteWithStorage'

const { deleteRecord, isDeleting } = useDeleteWithStorage()

// State
const dealers = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const errorMessage = ref('')
const successMessage = ref('')
const filterType = ref('all')

// Form data
const formData = ref({
  dealer_type: 'offline',
  name: '',
  province: '',
  city: '',
  address: '',
  phone: '',
  contact_person: '',
  platform: '',
  store_url: '',
  logo_url: '',
  cover_image: '',
  business_hours: '',
  description: '',
  sort_order: 0,
  is_active: true,
  is_featured: false
})

// 经销商类型
const dealerTypes = [
  { value: 'offline', label: '线下体验店' },
  { value: 'online', label: '线上授权店' }
]

// 电商平台
const platforms = ['天猫', '京东', '淘宝', '拼多多', '抖音', '得物', '其他']

// 常用省份
const provinces = [
  '北京市', '天津市', '上海市', '重庆市',
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省',
  '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '海南省',
  '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省',
  '台湾省', '内蒙古自治区', '广西壮族自治区', '西藏自治区',
  '宁夏回族自治区', '新疆维吾尔自治区', '香港特别行政区', '澳门特别行政区'
]

// 筛选后的经销商
const filteredDealers = computed(() => {
  if (filterType.value === 'all') return dealers.value
  return dealers.value.filter(d => d.dealer_type === filterType.value)
})

// 加载数据
onMounted(async () => {
  await loadDealers()
})

/**
 * 加载经销商列表
 */
async function loadDealers() {
  isLoading.value = true
  
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .order('dealer_type')
      .order('sort_order')
    
    if (error) throw error
    dealers.value = data || []
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
    dealer_type: 'offline',
    name: '',
    province: '',
    city: '',
    address: '',
    phone: '',
    contact_person: '',
    platform: '',
    store_url: '',
    logo_url: '',
    cover_image: '',
    business_hours: '',
    description: '',
    sort_order: dealers.value.length,
    is_active: true,
    is_featured: false
  }
  showForm.value = true
  errorMessage.value = ''
}

/**
 * 打开编辑表单
 */
function openEditForm(dealer) {
  editingId.value = dealer.id
  formData.value = { ...dealer }
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
 * 文件名清理
 */
function sanitizeFileName(fileName) {
  const ext = fileName.split('.').pop()
  const name = fileName.replace(/\.[^/.]+$/, '')
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
  return `${sanitized}.${ext}`
}

/**
 * 上传图片
 */
async function handleImageUpload(event, field) {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > FILE_LIMITS.IMAGE) {
    errorMessage.value = '图片大小不能超过 5MB'
    return
  }
  
  try {
    const timestamp = Date.now()
    const sanitizedName = sanitizeFileName(file.name)
    const path = `dealers/${timestamp}_${sanitizedName}`
    
    const { data, error } = await uploadFile(STORAGE_BUCKETS.GENERAL, path, file)
    
    if (error) throw error
    formData.value[field] = data.publicUrl
  } catch (error) {
    errorMessage.value = '上传失败: ' + error.message
  }
}

/**
 * 保存经销商
 */
async function saveDealer() {
  if (!formData.value.name) {
    errorMessage.value = '请输入经销商名称'
    return
  }
  
  if (formData.value.dealer_type === 'offline') {
    if (!formData.value.province || !formData.value.city) {
      errorMessage.value = '请选择省份和城市'
      return
    }
  } else {
    if (!formData.value.platform || !formData.value.store_url) {
      errorMessage.value = '请填写平台和店铺链接'
      return
    }
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const payload = {
      dealer_type: formData.value.dealer_type,
      name: formData.value.name,
      province: formData.value.dealer_type === 'offline' ? formData.value.province : null,
      city: formData.value.dealer_type === 'offline' ? formData.value.city : null,
      address: formData.value.dealer_type === 'offline' ? formData.value.address : null,
      phone: formData.value.phone || null,
      contact_person: formData.value.contact_person || null,
      platform: formData.value.dealer_type === 'online' ? formData.value.platform : null,
      store_url: formData.value.dealer_type === 'online' ? formData.value.store_url : null,
      logo_url: formData.value.logo_url || null,
      cover_image: formData.value.cover_image || null,
      business_hours: formData.value.business_hours || null,
      description: formData.value.description || null,
      sort_order: formData.value.sort_order,
      is_active: formData.value.is_active,
      is_featured: formData.value.is_featured
    }
    
    if (editingId.value) {
      const { error } = await supabase
        .from('dealers')
        .update(payload)
        .eq('id', editingId.value)
      
      if (error) throw error
      successMessage.value = '更新成功'
    } else {
      const { error } = await supabase
        .from('dealers')
        .insert(payload)
      
      if (error) throw error
      successMessage.value = '创建成功'
    }
    
    await loadDealers()
    closeForm()
  } catch (error) {
    errorMessage.value = '保存失败: ' + error.message
  } finally {
    isSaving.value = false
  }
}

/**
 * 删除经销商
 */
async function deleteDealer(dealer) {
  if (!confirm(`确定要删除 "${dealer.name}" 吗？`)) return
  
  const result = await deleteRecord('dealers', dealer, ['logo_url', 'cover_image'])
  
  if (result.success) {
    await loadDealers()
    successMessage.value = '删除成功'
  } else {
    errorMessage.value = '删除失败: ' + result.error
  }
}

/**
 * 切换状态
 */
async function toggleActive(dealer) {
  try {
    const { error } = await supabase
      .from('dealers')
      .update({ is_active: !dealer.is_active })
      .eq('id', dealer.id)
    
    if (error) throw error
    dealer.is_active = !dealer.is_active
  } catch (error) {
    errorMessage.value = '更新状态失败: ' + error.message
  }
}

/**
 * 获取类型标签样式
 */
function getTypeBadgeClass(type) {
  return type === 'offline' 
    ? 'bg-blue-500/20 text-blue-400'
    : 'bg-green-500/20 text-green-400'
}
</script>

<template>
  <div class="dealer-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">经销商管理</h1>
        <p class="text-aune-400 mt-1">管理线下体验店与线上授权店</p>
      </div>
      
      <button
        @click="openNewForm"
        class="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        添加经销商
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
        v-model="filterType"
        class="px-4 py-2 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
      >
        <option value="all">全部类型</option>
        <option v-for="type in dealerTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
      
      <span class="text-aune-400 text-sm">
        共 {{ filteredDealers.length }} 家经销商
      </span>
    </div>
    
    <!-- Table -->
    <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 overflow-hidden">
      <!-- Loading -->
      <div v-if="isLoading" class="p-8 text-center">
        <svg class="animate-spin w-8 h-8 mx-auto text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="mt-2 text-aune-400">加载中...</p>
      </div>
      
      <!-- Empty -->
      <div v-else-if="filteredDealers.length === 0" class="p-8 text-center">
        <p class="text-aune-400">暂无经销商数据</p>
      </div>
      
      <!-- Table -->
      <table v-else class="w-full">
        <thead class="bg-aune-900/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">经销商</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">类型</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">地区/平台</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">联系方式</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-aune-400 uppercase">状态</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-aune-400 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-aune-700/50">
          <tr 
            v-for="dealer in filteredDealers"
            :key="dealer.id"
            class="hover:bg-aune-700/30 transition-colors"
          >
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <img 
                  v-if="dealer.logo_url || dealer.cover_image"
                  :src="dealer.logo_url || dealer.cover_image"
                  class="w-10 h-10 rounded-lg object-cover"
                />
                <div v-else class="w-10 h-10 bg-aune-700 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-aune-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                  </svg>
                </div>
                <div>
                  <p class="text-white font-medium">{{ dealer.name }}</p>
                  <span 
                    v-if="dealer.is_featured"
                    class="text-xs text-gold-400"
                  >推荐</span>
                </div>
              </div>
            </td>
            <td class="px-4 py-4">
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', getTypeBadgeClass(dealer.dealer_type)]">
                {{ dealer.dealer_type === 'offline' ? '线下店' : '线上店' }}
              </span>
            </td>
            <td class="px-4 py-4 text-aune-300 text-sm">
              <template v-if="dealer.dealer_type === 'offline'">
                {{ dealer.province }} {{ dealer.city }}
              </template>
              <template v-else>
                {{ dealer.platform }}
              </template>
            </td>
            <td class="px-4 py-4 text-aune-300 text-sm">
              {{ dealer.phone || dealer.store_url || '-' }}
            </td>
            <td class="px-4 py-4">
              <button
                @click="toggleActive(dealer)"
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                  dealer.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                ]"
              >
                {{ dealer.is_active ? '已启用' : '已禁用' }}
              </button>
            </td>
            <td class="px-4 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="openEditForm(dealer)"
                  class="p-2 hover:bg-aune-600/50 rounded transition-colors"
                  title="编辑"
                >
                  <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteDealer(dealer)"
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
        <div class="w-full max-w-2xl bg-aune-900 rounded-2xl shadow-2xl mx-4">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-aune-700/50">
            <h2 class="text-xl font-semibold text-white">
              {{ editingId ? '编辑经销商' : '添加经销商' }}
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
            
            <!-- Type -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">经销商类型</label>
              <div class="flex gap-4">
                <label 
                  v-for="type in dealerTypes"
                  :key="type.value"
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    v-model="formData.dealer_type"
                    :value="type.value"
                    class="text-gold-500 focus:ring-gold-500"
                  />
                  <span class="text-white">{{ type.label }}</span>
                </label>
              </div>
            </div>
            
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">
                经销商名称 <span class="text-red-400">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                placeholder="如：aune武汉旗舰店"
              />
            </div>
            
            <!-- Offline Fields -->
            <template v-if="formData.dealer_type === 'offline'">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-aune-300 mb-2">
                    省份 <span class="text-red-400">*</span>
                  </label>
                  <select
                    v-model="formData.province"
                    class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  >
                    <option value="">选择省份</option>
                    <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-aune-300 mb-2">
                    城市 <span class="text-red-400">*</span>
                  </label>
                  <input
                    v-model="formData.city"
                    type="text"
                    class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    placeholder="如：武汉市"
                  />
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-aune-300 mb-2">详细地址</label>
                <input
                  v-model="formData.address"
                  type="text"
                  class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  placeholder="详细街道地址"
                />
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-aune-300 mb-2">联系电话</label>
                  <input
                    v-model="formData.phone"
                    type="text"
                    class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    placeholder="如：027-85420526"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-aune-300 mb-2">营业时间</label>
                  <input
                    v-model="formData.business_hours"
                    type="text"
                    class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    placeholder="如：10:00-22:00"
                  />
                </div>
              </div>
            </template>
            
            <!-- Online Fields -->
            <template v-else>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-aune-300 mb-2">
                    电商平台 <span class="text-red-400">*</span>
                  </label>
                  <select
                    v-model="formData.platform"
                    class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  >
                    <option value="">选择平台</option>
                    <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-aune-300 mb-2">
                    店铺链接 <span class="text-red-400">*</span>
                  </label>
                  <input
                    v-model="formData.store_url"
                    type="url"
                    class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </template>
            
            <!-- Cover Image -->
            <div>
              <label class="block text-sm font-medium text-aune-300 mb-2">封面图片</label>
              <div class="flex items-center gap-4">
                <img 
                  v-if="formData.cover_image"
                  :src="formData.cover_image"
                  class="w-24 h-16 object-cover rounded-lg"
                />
                <label class="px-4 py-2 bg-aune-800 border border-aune-600/50 rounded-lg text-aune-300 hover:text-white cursor-pointer transition-colors">
                  <span>{{ formData.cover_image ? '更换图片' : '上传图片' }}</span>
                  <input
                    type="file"
                    accept="image/*"
                    @change="e => handleImageUpload(e, 'cover_image')"
                    class="hidden"
                  />
                </label>
              </div>
            </div>
            
            <!-- Status -->
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="formData.is_active"
                  class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50"
                />
                <span class="text-aune-300">启用</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="formData.is_featured"
                  class="w-5 h-5 rounded border-aune-600 bg-aune-800 text-gold-500 focus:ring-gold-500/50"
                />
                <span class="text-aune-300">推荐展示</span>
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
              @click="saveDealer"
              :disabled="isSaving"
              class="px-6 py-2 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 transition-all"
            >
              {{ isSaving ? '保存中...' : (editingId ? '保存修改' : '创建经销商') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

