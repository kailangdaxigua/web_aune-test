<script setup>
/**
 * MFA Setup Component
 * For enrolling/managing Google Authenticator
 */
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()

// State
const step = ref('initial') // initial | enrolling | verifying | complete
const qrCode = ref('')
const secret = ref('')
const factorId = ref('')
const verifyCode = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)
const existingFactors = ref([])

onMounted(async () => {
  await loadFactors()
})

/**
 * Load existing MFA factors
 */
async function loadFactors() {
  const result = await auth.listMfaFactors()
  if (!result.error) {
    existingFactors.value = result.factors
  }
}

/**
 * Start MFA enrollment
 */
async function startEnrollment() {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const result = await auth.enrollMfa()
    
    if (result.error) {
      errorMessage.value = result.error
      return
    }
    
    qrCode.value = result.qrCode
    secret.value = result.secret
    factorId.value = result.factorId
    step.value = 'enrolling'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

/**
 * Verify enrollment with TOTP code
 */
async function verifyEnrollment() {
  if (!verifyCode.value || verifyCode.value.length !== 6) {
    errorMessage.value = '请输入6位验证码'
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const result = await auth.verifyMfaEnrollment(factorId.value, verifyCode.value)
    
    if (!result.success) {
      errorMessage.value = result.error
      verifyCode.value = ''
      return
    }
    
    successMessage.value = 'MFA 已成功启用！'
    step.value = 'complete'
    await loadFactors()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

/**
 * Remove MFA factor
 */
async function removeFactor(id) {
  if (!confirm('确定要禁用双因素认证吗？这将降低账户安全性。')) {
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const result = await auth.unenrollMfa(id)
    
    if (!result.success) {
      errorMessage.value = result.error
      return
    }
    
    successMessage.value = 'MFA 已禁用'
    await loadFactors()
    step.value = 'initial'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

/**
 * Copy secret to clipboard
 */
async function copySecret() {
  try {
    await navigator.clipboard.writeText(secret.value)
    successMessage.value = '密钥已复制到剪贴板'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    errorMessage.value = '复制失败'
  }
}

/**
 * Handle verify code input
 */
function handleVerifyInput(event) {
  const value = event.target.value.replace(/\D/g, '').slice(0, 6)
  verifyCode.value = value
}
</script>

<template>
  <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6">
    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <svg class="w-5 h-5 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      双因素认证 (MFA)
    </h3>
    
    <!-- Success Message -->
    <div 
      v-if="successMessage" 
      class="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm"
    >
      {{ successMessage }}
    </div>
    
    <!-- Error Message -->
    <div 
      v-if="errorMessage" 
      class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
    >
      {{ errorMessage }}
    </div>
    
    <!-- Existing Factors List -->
    <div v-if="existingFactors.length > 0 && step === 'initial'" class="space-y-4">
      <p class="text-aune-300 text-sm">已启用的认证器：</p>
      
      <div 
        v-for="factor in existingFactors" 
        :key="factor.id"
        class="flex items-center justify-between p-4 bg-aune-700/30 rounded-lg"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p class="text-white font-medium">{{ factor.friendly_name || 'Authenticator App' }}</p>
            <p class="text-aune-400 text-sm">
              已验证 · {{ new Date(factor.created_at).toLocaleDateString('zh-CN') }}
            </p>
          </div>
        </div>
        
        <button
          @click="removeFactor(factor.id)"
          :disabled="isLoading"
          class="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          禁用
        </button>
      </div>
    </div>
    
    <!-- Initial State - No MFA -->
    <div v-if="existingFactors.length === 0 && step === 'initial'" class="space-y-4">
      <p class="text-aune-300 text-sm">
        启用双因素认证可以大大提高账户安全性。您需要使用 Google Authenticator 或其他兼容的 TOTP 应用。
      </p>
      
      <button
        @click="startEnrollment"
        :disabled="isLoading"
        class="px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <span v-if="isLoading">设置中...</span>
        <span v-else>启用双因素认证</span>
      </button>
    </div>
    
    <!-- Enrolling State - Show QR Code -->
    <div v-if="step === 'enrolling'" class="space-y-6">
      <div class="text-center">
        <p class="text-aune-300 text-sm mb-4">
          使用 Google Authenticator 扫描下方二维码：
        </p>
        
        <!-- QR Code -->
        <div class="inline-block p-4 bg-white rounded-xl">
          <img :src="qrCode" alt="MFA QR Code" class="w-48 h-48" />
        </div>
        
        <!-- Manual Entry -->
        <div class="mt-4">
          <p class="text-aune-400 text-xs mb-2">或手动输入密钥：</p>
          <div class="flex items-center justify-center gap-2">
            <code class="px-3 py-2 bg-aune-700/50 rounded text-gold-400 text-sm font-mono break-all">
              {{ secret }}
            </code>
            <button
              @click="copySecret"
              class="p-2 hover:bg-aune-700/50 rounded transition-colors"
              title="复制"
            >
              <svg class="w-4 h-4 text-aune-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Verify Code Input -->
      <div>
        <p class="text-aune-300 text-sm mb-2 text-center">
          输入应用中显示的6位验证码以完成设置：
        </p>
        <input
          :value="verifyCode"
          @input="handleVerifyInput"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="6"
          class="w-full px-4 py-3 bg-aune-700/50 border border-aune-600/50 rounded-lg text-white text-center text-xl tracking-[0.5em] font-mono placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 transition-all"
          placeholder="000000"
        />
      </div>
      
      <div class="flex gap-3">
        <button
          @click="step = 'initial'"
          class="flex-1 py-3 border border-aune-600 text-aune-300 rounded-lg hover:bg-aune-700/50 transition-colors"
        >
          取消
        </button>
        <button
          @click="verifyEnrollment"
          :disabled="isLoading || verifyCode.length !== 6"
          class="flex-1 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span v-if="isLoading">验证中...</span>
          <span v-else>完成设置</span>
        </button>
      </div>
    </div>
    
    <!-- Complete State -->
    <div v-if="step === 'complete'" class="text-center py-4">
      <div class="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-white font-medium">双因素认证已启用</p>
      <p class="text-aune-400 text-sm mt-1">您的账户现在更加安全了</p>
      
      <button
        @click="step = 'initial'"
        class="mt-4 px-6 py-2 text-aune-300 hover:text-white transition-colors"
      >
        返回
      </button>
    </div>
  </div>
</template>

