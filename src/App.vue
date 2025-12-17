<script setup>
/**
 * Root App Component
 */
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()

onMounted(async () => {
  // Initialize auth state
  await auth.initialize()
})
</script>

<template>
  <router-view />
</template>
