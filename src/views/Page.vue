<script setup>
/**
 * Static Page View
 * For Support, Honors, Dealers, About, Contact, etc.
 */
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { vScrollAnimate } from '@/composables/useScrollAnimation'

const route = useRoute()
const router = useRouter()

// State
const page = ref(null)
const isLoading = ref(true)

// Load page
async function loadPage() {
  isLoading.value = true
  
  try {
    const slug = route.params.slug
    
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()
    
    if (error || !data) {
      router.push('/404')
      return
    }
    
    page.value = data
    
    // Update document title
    if (data.meta_title || data.title) {
      document.title = `${data.meta_title || data.title} - Aune Audio`
    }
  } finally {
    isLoading.value = false
  }
}

// Watch for route changes
watch(() => route.params.slug, () => {
  loadPage()
})

onMounted(() => {
  loadPage()
})
</script>

<template>
  <div class="static-page pt-20">
    <!-- Loading -->
    <div v-if="isLoading" class="min-h-screen flex items-center justify-center">
      <svg class="animate-spin w-12 h-12 text-gold-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    
    <template v-else-if="page">
      <!-- Hero Section -->
      <section class="py-20 bg-gradient-to-b from-aune-900 to-aune-950">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            v-scroll-animate="{ type: 'fade-up' }"
            class="text-center"
          >
            <h1 class="text-4xl md:text-5xl font-display font-bold text-white">
              {{ page.title }}
            </h1>
          </div>
        </div>
      </section>
      
      <!-- Content Section -->
      <section class="py-16 bg-aune-950">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            v-scroll-animate="{ type: 'fade-up', delay: 100 }"
            class="prose prose-lg prose-invert max-w-none"
            v-html="page.content_html || '<p class=\'text-aune-500 text-center\'>暂无内容</p>'"
          ></div>
        </div>
      </section>
    </template>
  </div>
</template>

<style>
/* Prose styles */
.static-page .prose {
  color: #b8b8c1;
}

.static-page .prose h1,
.static-page .prose h2,
.static-page .prose h3,
.static-page .prose h4 {
  color: #fff;
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
}

.static-page .prose p {
  color: #b8b8c1;
}

.static-page .prose a {
  color: #d4a056;
}

.static-page .prose strong {
  color: #fff;
}

.static-page .prose ul li::marker,
.static-page .prose ol li::marker {
  color: #d4a056;
}

.static-page .prose blockquote {
  border-left-color: #d4a056;
  color: #91919f;
}

.static-page .prose hr {
  border-color: #4c4c57;
}

.static-page .prose code {
  background: #41414a;
  color: #d4a056;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.static-page .prose pre {
  background: #1a1a1f;
}

.static-page .prose img {
  border-radius: 12px;
}

.static-page .prose table {
  width: 100%;
}

.static-page .prose th {
  background: #393940;
  color: #fff;
}

.static-page .prose td {
  border-color: #4c4c57;
}
</style>

