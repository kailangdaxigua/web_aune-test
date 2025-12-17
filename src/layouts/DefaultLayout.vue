<script setup>
/**
 * Default Layout for Public Pages
 * Includes Header and Footer
 */
import { onMounted } from 'vue'
import { useSiteStore } from '@/stores/siteStore'
import TheHeader from '@/components/layout/TheHeader.vue'
import TheFooter from '@/components/layout/TheFooter.vue'

const siteStore = useSiteStore()

onMounted(async () => {
  await siteStore.initialize()
})
</script>

<template>
  <div class="default-layout min-h-screen flex flex-col bg-aune-950">
    <!-- Header -->
    <TheHeader />
    
    <!-- Main Content -->
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    
    <!-- Footer -->
    <TheFooter />
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>

