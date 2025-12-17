# 前端实现指南

本文档说明如何在 Vue 3 前端中使用新的数据库 Schema 和 API。

> **✅ 组件已实现完成**
> 
> 以下组件和管理页面已全部实现：
> - `src/components/layout/TheFooter.vue` - 页脚组件
> - `src/components/HomeCarousel.vue` - 首页轮播图组件
> - `src/components/HomeVideo.vue` - 首页视频组件
> - `src/views/admin/FooterLinkManager.vue` - 页脚链接管理
> - `src/views/admin/CarouselManager.vue` - 轮播图管理
> - `src/views/admin/VideoManager.vue` - 首页视频管理

## 目录

1. [数据库迁移说明](#数据库迁移说明)
2. [导航栏动态加载](#导航栏动态加载)
3. [页脚管理](#页脚管理)
4. [首页轮播图](#首页轮播图)
5. [首页视频模块](#首页视频模块)
6. [后台管理页面](#后台管理页面)

---

## 数据库迁移说明

### 执行顺序

```bash
# 在 Supabase SQL 编辑器中依次执行
1. supabase/migrations/003_enhanced_cms_schema.sql
2. supabase/migrations/004_video_storage_policies.sql
```

### 新增表结构

| 表名 | 用途 |
|------|------|
| `footer_links` | 页脚链接管理（支持CRUD） |
| `home_carousel` | 首页轮播图管理 |
| `home_videos` | 首页视频管理（支持本地/外链） |

### 新增字段

| 表名 | 字段 | 说明 |
|------|------|------|
| `products` | `nav_thumbnail` | 导航栏下拉框专用缩略图 |
| `site_config` | `hotline` | 客服热线 |
| `site_config` | `copyright_text` | 版权文字 |
| `site_config` | `icp_number` | ICP备案号 |

---

## 导航栏动态加载

### 问题修复

**原问题**: `TheHeader.vue` 中的产品查询使用了错误的关联语法：
```javascript
// ❌ 错误
.eq('category.slug', categorySlug)

// ✅ 正确 - 使用 category_id 查询
.eq('category_id', category.id)
```

### 已修复的代码

```javascript
// src/components/layout/TheHeader.vue
async function loadCategoryProducts(categorySlug) {
  if (categoryProducts.value[categorySlug]) return
  
  // 先获取分类ID
  const category = categories.value.find(c => c.slug === categorySlug)
  if (!category) return
  
  const { data } = await supabase
    .from('products')
    .select('id, name, slug, cover_image, nav_thumbnail')
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('sort_order')
    .limit(6)
  
  categoryProducts.value[categorySlug] = data || []
}
```

### 缩略图显示逻辑

模板中优先使用 `nav_thumbnail`，fallback 到 `cover_image`：

```vue
<img 
  v-if="product.nav_thumbnail || product.cover_image"
  :src="product.nav_thumbnail || product.cover_image"
  :alt="product.name"
  class="w-10 h-10 object-cover rounded"
/>
```

---

## 详情页导航栏冲突修复

### 问题描述

`ProductDetail.vue` 的二级导航栏使用 `sticky top-0`，与主导航栏 `fixed top-0` 冲突，导致二级导航覆盖主导航。

### 解决方案

将二级导航栏的 `top-0` 改为 `top-20`（主导航高度为 h-20 = 5rem）：

```vue
<!-- ProductDetail.vue -->
<nav class="sticky top-20 z-40 bg-aune-900/95 backdrop-blur-md border-b border-aune-700/50">
```

---

## 页脚管理

### 数据结构

`footer_links` 表使用 `link_group` 枚举分组：

```typescript
type FooterLinkGroup = 
  | 'purchase_channels'   // 购买渠道
  | 'about_aune'          // 关于aune
  | 'service_support'     // 服务支持
  | 'official_platforms'  // 官方平台
```

### 获取数据

```javascript
// 从 siteStore 获取
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()

// 按分组获取
const purchaseChannels = computed(() => siteStore.footerLinks['purchase_channels'] || [])
const aboutAune = computed(() => siteStore.footerLinks['about_aune'] || [])
const serviceSupport = computed(() => siteStore.footerLinks['service_support'] || [])
const officialPlatforms = computed(() => siteStore.footerLinks['official_platforms'] || [])
```

### TheFooter.vue 改造示例

```vue
<template>
  <footer class="bg-aune-950 border-t border-aune-800">
    <div class="max-w-7xl mx-auto px-4 py-12">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <!-- 购买渠道 -->
        <div>
          <h3 class="text-white font-semibold mb-4">购买渠道</h3>
          <ul class="space-y-2">
            <li v-for="link in purchaseChannels" :key="link.id">
              <a 
                :href="link.resolved_url"
                :target="link.is_external ? '_blank' : '_self'"
                class="text-aune-400 hover:text-gold-500 transition-colors"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
        
        <!-- 关于aune -->
        <div>
          <h3 class="text-white font-semibold mb-4">关于aune</h3>
          <ul class="space-y-2">
            <li v-for="link in aboutAune" :key="link.id">
              <router-link 
                v-if="!link.is_external"
                :to="link.resolved_url"
                class="text-aune-400 hover:text-gold-500 transition-colors"
              >
                {{ link.label }}
              </router-link>
              <a 
                v-else
                :href="link.resolved_url"
                target="_blank"
                class="text-aune-400 hover:text-gold-500 transition-colors"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
        
        <!-- 更多分组... -->
      </div>
      
      <!-- 底部信息 -->
      <div class="mt-12 pt-8 border-t border-aune-800 text-center text-aune-500 text-sm">
        <p>客服热线: {{ siteStore.hotline }}</p>
        <p class="mt-2">{{ siteStore.copyrightText }}</p>
        <p v-if="siteStore.icpNumber" class="mt-1">{{ siteStore.icpNumber }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()

const purchaseChannels = computed(() => siteStore.footerLinks['purchase_channels'] || [])
const aboutAune = computed(() => siteStore.footerLinks['about_aune'] || [])
const serviceSupport = computed(() => siteStore.footerLinks['service_support'] || [])
const officialPlatforms = computed(() => siteStore.footerLinks['official_platforms'] || [])
</script>
```

---

## 首页轮播图

### 数据结构

```typescript
interface CarouselItem {
  id: string
  title?: string           // 后台识别用
  image_url: string        // 图片URL
  mobile_image_url?: string // 移动端图片
  link_url?: string        // 跳转链接
  link_target?: string     // '_self' | '_blank'
  overlay_title?: string   // 叠加标题
  overlay_subtitle?: string // 叠加副标题
  overlay_position?: string // 'left' | 'center' | 'right'
  sort_order: number
  is_active: boolean
  start_at?: string        // 定时开始
  end_at?: string          // 定时结束
}
```

### 获取数据

```javascript
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()
const carouselItems = computed(() => siteStore.carouselItems)
```

### Home.vue 轮播组件示例

```vue
<template>
  <section class="relative h-screen">
    <div 
      v-for="(item, index) in carouselItems" 
      :key="item.id"
      v-show="currentIndex === index"
      class="absolute inset-0 transition-opacity duration-500"
    >
      <!-- 背景图 -->
      <img 
        :src="isMobile && item.mobile_image_url ? item.mobile_image_url : item.image_url"
        :alt="item.title"
        class="w-full h-full object-cover"
      />
      
      <!-- 叠加文字 -->
      <div 
        v-if="item.overlay_title || item.overlay_subtitle"
        :class="[
          'absolute inset-0 flex flex-col justify-center p-8',
          item.overlay_position === 'left' ? 'items-start' : '',
          item.overlay_position === 'right' ? 'items-end' : '',
          item.overlay_position === 'center' ? 'items-center text-center' : ''
        ]"
      >
        <h2 v-if="item.overlay_title" class="text-4xl font-bold text-white">
          {{ item.overlay_title }}
        </h2>
        <p v-if="item.overlay_subtitle" class="text-xl text-aune-300 mt-4">
          {{ item.overlay_subtitle }}
        </p>
      </div>
      
      <!-- 点击链接 -->
      <a 
        v-if="item.link_url"
        :href="item.link_url"
        :target="item.link_target"
        class="absolute inset-0"
      />
    </div>
    
    <!-- 轮播指示器 -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
      <button
        v-for="(_, index) in carouselItems"
        :key="index"
        @click="currentIndex = index"
        :class="[
          'w-3 h-3 rounded-full transition-colors',
          currentIndex === index ? 'bg-gold-500' : 'bg-white/50'
        ]"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()
const carouselItems = computed(() => siteStore.carouselItems)
const currentIndex = ref(0)
const isMobile = ref(window.innerWidth < 768)

// 自动轮播
let interval
onMounted(() => {
  interval = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % carouselItems.value.length
  }, 5000)
  
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>
```

---

## 首页视频模块

### 数据结构

```typescript
interface HomeVideo {
  id: string
  title: string
  description?: string
  source_type: 'local' | 'external'  // 本地上传 或 外部链接
  video_url: string                   // 视频URL
  external_platform?: string          // 'bilibili' | 'youtube' | 'youku'
  external_embed_code?: string        // 嵌入代码
  poster_url?: string                 // 封面图
  duration?: number                   // 时长（秒）
  aspect_ratio?: string              // '16:9' | '4:3' 等
  autoplay: boolean
  muted: boolean
  loop: boolean
  show_controls: boolean
  is_primary: boolean                 // 是否为主视频
}
```

### 获取数据

```javascript
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()
const primaryVideo = computed(() => siteStore.primaryVideo)
```

### 视频播放组件示例

```vue
<template>
  <section v-if="primaryVideo" class="relative h-screen bg-black">
    <!-- 本地视频 -->
    <video
      v-if="primaryVideo.source_type === 'local'"
      ref="videoRef"
      :src="primaryVideo.video_url"
      :poster="primaryVideo.poster_url"
      :autoplay="primaryVideo.autoplay"
      :muted="primaryVideo.muted"
      :loop="primaryVideo.loop"
      :controls="primaryVideo.show_controls"
      playsinline
      class="w-full h-full object-cover"
    />
    
    <!-- 外部嵌入视频 (B站/YouTube) -->
    <div 
      v-else-if="primaryVideo.external_embed_code"
      v-html="primaryVideo.external_embed_code"
      class="w-full h-full"
    />
    
    <!-- 外部直链视频 -->
    <video
      v-else
      ref="videoRef"
      :src="primaryVideo.video_url"
      :poster="primaryVideo.poster_url"
      :autoplay="primaryVideo.autoplay"
      :muted="primaryVideo.muted"
      :loop="primaryVideo.loop"
      :controls="primaryVideo.show_controls"
      playsinline
      class="w-full h-full object-cover"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()
const primaryVideo = computed(() => siteStore.primaryVideo)
</script>
```

---

## 后台管理页面

### 已实现的后台管理页面

| 页面 | 路由 | 功能 |
|------|------|------|
| `FooterLinkManager.vue` | `/admin/footer-links` | 页脚链接 CRUD、分组管理、排序 |
| `CarouselManager.vue` | `/admin/carousel` | 轮播图上传、叠加文字、定时发布 |
| `VideoManager.vue` | `/admin/videos` | 本地视频上传、外部链接、B站嵌入 |

### 后台导航入口

已在 `AdminLayout.vue` 侧边栏添加以下导航项：
- 轮播图管理
- 首页视频
- 页脚链接

### 仍需完善

**`ProductEditor.vue` 增强**
- 添加 `nav_thumbnail` 字段上传
- 单独上传导航栏缩略图

### 视频上传示例

```javascript
// 上传本地视频到 Supabase Storage
async function uploadVideo(file) {
  const fileName = `${Date.now()}_${file.name}`
  
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  // 获取公开URL
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName)
  
  return publicUrl
}

// 保存视频记录
async function saveHomeVideo(videoData) {
  const { data, error } = await supabase
    .from('home_videos')
    .insert({
      title: videoData.title,
      source_type: videoData.sourceType,  // 'local' 或 'external'
      video_url: videoData.videoUrl,
      poster_url: videoData.posterUrl,
      autoplay: true,
      muted: true,
      loop: true,
      is_primary: true,
      is_active: true
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

---

## Storage Bucket 配置

### 新增的存储桶

| Bucket | 用途 | 大小限制 | 允许类型 |
|--------|------|----------|----------|
| `videos` | 首页视频 | 100MB | mp4, webm, ogg, quicktime |
| `carousel` | 轮播图 | 10MB | jpeg, png, gif, webp, avif |
| `pages` | 页面富文本图片 | 5MB | jpeg, png, gif, webp |

### 权限说明

- **读取**: 所有人可读（公开访问）
- **写入**: 仅管理员可上传/更新/删除

---

## 注意事项

1. **数据迁移**: 新 Schema 与旧 `site_config.footer_structure` JSONB 并存，前端 `siteStore` 已做兼容处理。

2. **缓存更新**: 修改页脚/轮播后，需调用 `siteStore.fetchFooterLinks()` / `siteStore.fetchCarousel()` 刷新数据。

3. **SEO 考虑**: 轮播图的 `overlay_title` 应使用语义化标签 `<h1>` 或 `<h2>`。

4. **性能优化**: 
   - 视频建议使用压缩后的 MP4 (H.264)
   - 轮播图建议使用 WebP 格式
   - 移动端使用 `mobile_image_url` 减少流量

