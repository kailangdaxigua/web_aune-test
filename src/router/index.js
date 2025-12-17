/**
 * Vue Router Configuration
 * Aune Audio CMS
 */
import { createRouter, createWebHistory } from 'vue-router'
import { createVisitLoggerMiddleware } from '@/composables/useVisitLogger'

// Layouts
const DefaultLayout = () => import('@/layouts/DefaultLayout.vue')
const AdminLayout = () => import('@/layouts/AdminLayout.vue')

// Public Pages
const Home = () => import('@/views/Home.vue')
const ProductDetail = () => import('@/views/ProductDetail.vue')
const ProductList = () => import('@/views/ProductList.vue')
const Downloads = () => import('@/views/Downloads.vue')
const News = () => import('@/views/News.vue')
const NewsDetail = () => import('@/views/NewsDetail.vue')
const Page = () => import('@/views/Page.vue')
const Dealers = () => import('@/views/Dealers.vue')
const Support = () => import('@/views/Support.vue')
const NotFound = () => import('@/views/NotFound.vue')

// Admin Pages
const AdminLogin = () => import('@/views/admin/AdminLogin.vue')
const AdminDashboard = () => import('@/views/admin/AdminDashboard.vue')
const ProductManager = () => import('@/views/admin/ProductManager.vue')
const ProductEditor = () => import('@/views/admin/ProductEditor.vue')
const DownloadManager = () => import('@/views/admin/DownloadManager.vue')
const NewsManager = () => import('@/views/admin/NewsManager.vue')
const PageManager = () => import('@/views/admin/PageManager.vue')
const SiteConfig = () => import('@/views/admin/SiteConfig.vue')
const AdminProfile = () => import('@/views/admin/AdminProfile.vue')
const FooterLinkManager = () => import('@/views/admin/FooterLinkManager.vue')
const CarouselManager = () => import('@/views/admin/CarouselManager.vue')
const VideoManager = () => import('@/views/admin/VideoManager.vue')
const DealerManager = () => import('@/views/admin/DealerManager.vue')
const FaqManager = () => import('@/views/admin/FaqManager.vue')

const routes = [
  // ============================================
  // Public Routes
  // ============================================
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: Home,
        meta: { title: '首页' }
      },
      {
        path: 'products/:category',
        name: 'ProductList',
        component: ProductList,
        meta: { title: '产品列表' }
      },
      {
        path: 'product/:slug',
        name: 'ProductDetail',
        component: ProductDetail,
        meta: { title: '产品详情' }
      },
      {
        path: 'downloads',
        name: 'Downloads',
        component: Downloads,
        meta: { title: '下载中心' }
      },
      {
        path: 'news',
        name: 'News',
        component: News,
        meta: { title: '新闻资讯' }
      },
      {
        path: 'news/:slug',
        name: 'NewsDetail',
        component: NewsDetail,
        meta: { title: '新闻详情' }
      },
      {
        path: 'page/:slug',
        name: 'Page',
        component: Page,
        meta: { title: '页面' }
      },
      {
        path: 'dealers',
        name: 'Dealers',
        component: Dealers,
        meta: { title: '经销商网络' }
      },
      {
        path: 'support',
        name: 'Support',
        component: Support,
        meta: { title: '服务支持' }
      },
      // Shortcut routes
      {
        path: 'honors',
        redirect: '/page/honors'
      },
      {
        path: 'about',
        redirect: '/page/about'
      },
      {
        path: 'contact',
        redirect: '/page/contact'
      }
    ]
  },
  
  // ============================================
  // Admin Routes
  // ============================================
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin,
    meta: { 
      title: '管理员登录',
      requiresGuest: true
    }
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: { title: '数据看板' }
      },
      {
        path: 'products',
        name: 'ProductManager',
        component: ProductManager,
        meta: { title: '产品管理' }
      },
      {
        path: 'products/new',
        name: 'ProductCreate',
        component: ProductEditor,
        meta: { title: '添加产品' }
      },
      {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        component: ProductEditor,
        meta: { title: '编辑产品' }
      },
      {
        path: 'downloads',
        name: 'DownloadManager',
        component: DownloadManager,
        meta: { title: '下载资源管理' }
      },
      {
        path: 'news',
        name: 'NewsManager',
        component: NewsManager,
        meta: { title: '新闻管理' }
      },
      {
        path: 'pages',
        name: 'PageManager',
        component: PageManager,
        meta: { title: '页面管理' }
      },
      {
        path: 'config',
        name: 'SiteConfig',
        component: SiteConfig,
        meta: { title: '站点配置' }
      },
      {
        path: 'footer-links',
        name: 'FooterLinkManager',
        component: FooterLinkManager,
        meta: { title: '页脚链接管理' }
      },
      {
        path: 'carousel',
        name: 'CarouselManager',
        component: CarouselManager,
        meta: { title: '轮播图管理' }
      },
      {
        path: 'videos',
        name: 'VideoManager',
        component: VideoManager,
        meta: { title: '首页视频管理' }
      },
      {
        path: 'dealers',
        name: 'DealerManager',
        component: DealerManager,
        meta: { title: '经销商管理' }
      },
      {
        path: 'faqs',
        name: 'FaqManager',
        component: FaqManager,
        meta: { title: 'FAQ管理' }
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: AdminProfile,
        meta: { title: '个人设置' }
      }
    ]
  },
  
  // ============================================
  // 404 Route
  // ============================================
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Handle hash links
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 100
      }
    }
    
    // Restore saved position on back/forward
    if (savedPosition) {
      return savedPosition
    }
    
    // Scroll to top on new page
    return { top: 0 }
  }
})

// ============================================
// Navigation Guards
// ============================================

// Auth guard
router.beforeEach(async (to, from, next) => {
  // Update document title
  const baseTitle = 'Aune Audio'
  document.title = to.meta.title ? `${to.meta.title} - ${baseTitle}` : baseTitle
  
  // Check if route requires auth
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Dynamically import auth composable to avoid circular dependencies
    const { useAuth } = await import('@/composables/useAuth')
    const auth = useAuth()
    
    // Initialize auth if not already done
    if (auth.loading.value) {
      await auth.initialize()
    }
    
    // Check authentication
    if (!auth.isFullyAuthenticated.value) {
      return next({
        name: 'AdminLogin',
        query: { redirect: to.fullPath }
      })
    }
  }
  
  // Check if route requires guest (login page)
  if (to.matched.some(record => record.meta.requiresGuest)) {
    const { useAuth } = await import('@/composables/useAuth')
    const auth = useAuth()
    
    if (auth.loading.value) {
      await auth.initialize()
    }
    
    if (auth.isFullyAuthenticated.value) {
      return next({ name: 'AdminDashboard' })
    }
  }
  
  next()
})

// Initialize visit logger middleware
createVisitLoggerMiddleware(router)

export default router
