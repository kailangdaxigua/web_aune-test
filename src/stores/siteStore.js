/**
 * Site Configuration Store
 * Manages global site config, navigation, footer, carousel, videos
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useSiteStore = defineStore('site', () => {
  // State
  const config = ref(null)
  const categories = ref([])
  const footerLinks = ref({})     // 按分组存储的页脚链接
  const carouselItems = ref([])   // 轮播图列表
  const primaryVideo = ref(null)  // 首页主视频
  const isLoading = ref(false)
  const error = ref(null)
  
  // Computed - 兼容旧结构
  const navStructure = computed(() => config.value?.nav_structure || [])
  const footerStructure = computed(() => config.value?.footer_structure || { columns: [], hotline: '' })
  const carouselImages = computed(() => config.value?.carousel_images || [])
  const homeVideoUrl = computed(() => primaryVideo.value?.video_url || config.value?.home_video_url)
  const homeVideoEnabled = computed(() => primaryVideo.value?.is_active || config.value?.home_video_enabled)
  
  // 新的 computed 属性
  const hotline = computed(() => config.value?.hotline || '027-85420526')
  const copyrightText = computed(() => config.value?.copyright_text || '')
  const icpNumber = computed(() => config.value?.icp_number || '')
  
  /**
   * Fetch site configuration
   */
  async function fetchConfig() {
    isLoading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('site_config')
        .select('*')
        .single()
      
      if (fetchError) throw fetchError
      config.value = data
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch site config:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Fetch categories with product counts
   */
  async function fetchCategories() {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select(`
          *,
          products:products(count)
        `)
        .eq('is_active', true)
        .order('sort_order')
      
      if (fetchError) throw fetchError
      
      // Transform data to include product count
      categories.value = data.map(cat => ({
        ...cat,
        productCount: cat.products?.[0]?.count || 0
      }))
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }
  
  /**
   * Fetch footer links grouped by category
   */
  async function fetchFooterLinks() {
    try {
      const { data, error: fetchError } = await supabase
        .from('footer_links')
        .select(`
          *,
          page:pages(id, title, slug)
        `)
        .eq('is_active', true)
        .order('sort_order')
      
      if (fetchError) throw fetchError
      
      // 按分组整理链接
      const grouped = {}
      const groups = ['purchase_channels', 'about_aune', 'service_support', 'official_platforms']
      groups.forEach(g => grouped[g] = [])
      
      data?.forEach(link => {
        const resolvedUrl = link.page_id && link.page 
          ? `/page/${link.page.slug}` 
          : link.url || '#'
        
        if (grouped[link.link_group]) {
          grouped[link.link_group].push({
            ...link,
            resolved_url: resolvedUrl
          })
        }
      })
      
      footerLinks.value = grouped
    } catch (err) {
      console.error('Failed to fetch footer links:', err)
    }
  }
  
  /**
   * Fetch carousel items
   */
  async function fetchCarousel() {
    try {
      const { data, error: fetchError } = await supabase
        .from('home_carousel')
        .select('*')
        .eq('is_active', true)
        .or('start_at.is.null,start_at.lte.now()')
        .or('end_at.is.null,end_at.gte.now()')
        .order('sort_order')
      
      if (fetchError) throw fetchError
      carouselItems.value = data || []
    } catch (err) {
      console.error('Failed to fetch carousel:', err)
    }
  }
  
  /**
   * Fetch primary home video
   */
  async function fetchPrimaryVideo() {
    try {
      // 先尝试获取主视频
      let { data, error: fetchError } = await supabase
        .from('home_videos')
        .select('*')
        .eq('is_active', true)
        .eq('is_primary', true)
        .single()
      
      // 如果没有主视频，获取第一个活跃视频
      if (fetchError || !data) {
        const result = await supabase
          .from('home_videos')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
          .limit(1)
          .single()
        
        data = result.data
      }
      
      primaryVideo.value = data
    } catch (err) {
      console.error('Failed to fetch primary video:', err)
    }
  }
  
  /**
   * Get products by category
   */
  async function getProductsByCategory(categorySlug, limit = 10) {
    try {
      let query = supabase
        .from('products')
        .select(`
          id, name, model, slug, cover_image, is_hot, is_new,
          category:categories(id, name, slug)
        `)
        .eq('is_active', true)
        .order('sort_order')
      
      if (categorySlug) {
        query = query.eq('category.slug', categorySlug)
      }
      
      if (limit) {
        query = query.limit(limit)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Failed to fetch products:', err)
      return []
    }
  }
  
  /**
   * Get hot products
   */
  async function getHotProducts(limit = 8) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, model, slug, cover_image, short_description,
          category:categories(id, name, slug)
        `)
        .eq('is_hot', true)
        .eq('is_active', true)
        .order('sort_order')
        .limit(limit)
      
      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Failed to fetch hot products:', err)
      return []
    }
  }
  
  /**
   * Update site configuration (admin only)
   */
  async function updateConfig(updates) {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .update(updates)
        .eq('id', config.value.id)
        .select()
        .single()
      
      if (error) throw error
      config.value = data
      return { success: true }
    } catch (err) {
      console.error('Failed to update config:', err)
      return { success: false, error: err.message }
    }
  }
  
  /**
   * Initialize store
   */
  async function initialize() {
    await Promise.all([
      fetchConfig(),
      fetchCategories(),
      fetchFooterLinks(),
      fetchCarousel(),
      fetchPrimaryVideo()
    ])
  }
  
  return {
    // State
    config,
    categories,
    footerLinks,
    carouselItems,
    primaryVideo,
    isLoading,
    error,
    
    // Computed (兼容旧结构)
    navStructure,
    footerStructure,
    carouselImages,
    homeVideoUrl,
    homeVideoEnabled,
    
    // Computed (新增)
    hotline,
    copyrightText,
    icpNumber,
    
    // Actions
    fetchConfig,
    fetchCategories,
    fetchFooterLinks,
    fetchCarousel,
    fetchPrimaryVideo,
    getProductsByCategory,
    getHotProducts,
    updateConfig,
    initialize
  }
})

