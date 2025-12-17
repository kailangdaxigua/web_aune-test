<script setup>
/**
 * Admin Login Page with MFA Support
 * Aune Audio CMS
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const auth = useAuth()

// Form state
const email = ref('')
const password = ref('')
const mfaCode = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

// Current step: 'credentials' | 'mfa'
const currentStep = computed(() => auth.mfaRequired.value ? 'mfa' : 'credentials')

// Input refs for auto-focus
const mfaInputRef = ref(null)

onMounted(() => {
  // Redirect if already authenticated
  if (auth.isFullyAuthenticated.value) {
    router.push('/admin/dashboard')
  }
})

/**
 * Handle credentials form submission
 */
async function handleCredentialsSubmit() {
  if (!email.value || !password.value) {
    errorMessage.value = '请输入邮箱和密码'
    return
  }
  
  isSubmitting.value = true
  errorMessage.value = ''
  
  try {
    const result = await auth.signIn(email.value, password.value)
    
    if (!result.success) {
      errorMessage.value = result.error || '登录失败'
      return
    }
    
    if (result.needsMfa) {
      // Focus MFA input after Vue updates DOM
      setTimeout(() => {
        mfaInputRef.value?.focus()
      }, 100)
      return
    }
    
    // Login successful without MFA
    await auth.updateLastLogin()
    router.push('/admin/dashboard')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Handle MFA verification form submission
 */
async function handleMfaSubmit() {
  if (!mfaCode.value || mfaCode.value.length !== 6) {
    errorMessage.value = '请输入6位验证码'
    return
  }
  
  isSubmitting.value = true
  errorMessage.value = ''
  
  try {
    const result = await auth.verifyMfa(mfaCode.value)
    
    if (!result.success) {
      errorMessage.value = result.error || 'MFA 验证失败'
      mfaCode.value = ''
      return
    }
    
    // MFA verified successfully
    await auth.updateLastLogin()
    router.push('/admin/dashboard')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Go back to credentials step
 */
function goBackToCredentials() {
  auth.signOut()
  mfaCode.value = ''
  errorMessage.value = ''
}

/**
 * Handle MFA code input - auto submit when 6 digits entered
 */
function handleMfaInput(event) {
  const value = event.target.value.replace(/\D/g, '').slice(0, 6)
  mfaCode.value = value
  
  if (value.length === 6) {
    handleMfaSubmit()
  }
}
</script>

<template>
  <div class="min-h-screen bg-aune-950 flex items-center justify-center px-4">
    <!-- Background Pattern -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-aune-900/50 via-aune-950 to-black"></div>
      <div class="absolute top-0 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-600/5 rounded-full blur-3xl"></div>
    </div>
    
    <!-- Login Card -->
    <div class="relative w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-display font-bold text-white tracking-wide">
          AUNE<span class="text-gold-500">.</span>
        </h1>
        <p class="mt-2 text-aune-400 text-sm">管理后台</p>
      </div>
      
      <!-- Card -->
      <div class="bg-aune-900/50 backdrop-blur-xl border border-aune-700/50 rounded-2xl p-8 shadow-2xl">
        <!-- Credentials Form -->
        <form 
          v-if="currentStep === 'credentials'" 
          @submit.prevent="handleCredentialsSubmit"
          class="space-y-6"
        >
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              邮箱地址
            </label>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 transition-all"
              placeholder="admin@auneaudio.com"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-aune-300 mb-2">
              密码
            </label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full px-4 py-3 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <!-- Error Message -->
          <div 
            v-if="errorMessage" 
            class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
          >
            {{ errorMessage }}
          </div>
          
          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              登录中...
            </span>
            <span v-else>登录</span>
          </button>
        </form>
        
        <!-- MFA Verification Form -->
        <form 
          v-else 
          @submit.prevent="handleMfaSubmit"
          class="space-y-6"
        >
          <div class="text-center mb-4">
            <div class="w-16 h-16 mx-auto bg-gold-500/10 rounded-full flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-white mb-2">双因素认证</h2>
            <p class="text-aune-400 text-sm">
              请输入 Google Authenticator 中显示的6位验证码
            </p>
          </div>
          
          <div>
            <input
              ref="mfaInputRef"
              :value="mfaCode"
              @input="handleMfaInput"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              autocomplete="one-time-code"
              required
              class="w-full px-4 py-4 bg-aune-800/50 border border-aune-600/50 rounded-lg text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-aune-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 transition-all"
              placeholder="000000"
            />
          </div>
          
          <!-- Error Message -->
          <div 
            v-if="errorMessage" 
            class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
          >
            {{ errorMessage }}
          </div>
          
          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isSubmitting || mfaCode.length !== 6"
            class="w-full py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-medium rounded-lg hover:from-gold-500 hover:to-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              验证中...
            </span>
            <span v-else>验证</span>
          </button>
          
          <!-- Back Link -->
          <button
            type="button"
            @click="goBackToCredentials"
            class="w-full text-center text-aune-400 hover:text-white text-sm transition-colors"
          >
            ← 返回登录
          </button>
        </form>
      </div>
      
      <!-- Footer -->
      <p class="mt-8 text-center text-aune-500 text-sm">
        © {{ new Date().getFullYear() }} Aune Audio. All rights reserved.
      </p>
    </div>
  </div>
</template>

