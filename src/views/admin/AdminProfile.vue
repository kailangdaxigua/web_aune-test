<script setup>
/**
 * Admin Profile & MFA Settings
 */
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import MfaSetup from './MfaSetup.vue'

const auth = useAuth()
</script>

<template>
  <div class="admin-profile max-w-2xl">
    <h1 class="text-2xl font-bold text-white mb-6">个人设置</h1>
    
    <!-- Account Info -->
    <div class="bg-aune-800/50 rounded-xl border border-aune-700/50 p-6 mb-6">
      <h3 class="text-lg font-semibold text-white mb-4">账户信息</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-aune-400 mb-1">邮箱地址</label>
          <p class="text-white">{{ auth.user.value?.email }}</p>
        </div>
        
        <div>
          <label class="block text-sm text-aune-400 mb-1">账户 ID</label>
          <p class="text-aune-300 font-mono text-sm">{{ auth.user.value?.id }}</p>
        </div>
      </div>
    </div>
    
    <!-- MFA Settings -->
    <MfaSetup />
  </div>
</template>

