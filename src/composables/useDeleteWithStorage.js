/**
 * useDeleteWithStorage Composable
 * 级联删除：删除数据库记录的同时删除 Supabase Storage 中的对应文件
 * 防止产生僵尸文件
 */
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * 从 Supabase Storage URL 中提取 bucket 和路径
 * @param {string} url - Supabase Storage 公开 URL
 * @returns {{ bucket: string, path: string } | null}
 */
function parseStorageUrl(url) {
  if (!url) return null
  
  try {
    // 格式: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (match) {
      return {
        bucket: match[1],
        path: decodeURIComponent(match[2])
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 删除 Storage 中的单个文件
 * @param {string} url - 文件 URL
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function deleteStorageFile(url) {
  const parsed = parseStorageUrl(url)
  if (!parsed) {
    return { success: false, error: '无效的存储 URL' }
  }
  
  const { error } = await supabase.storage
    .from(parsed.bucket)
    .remove([parsed.path])
  
  if (error) {
    console.warn(`Failed to delete storage file: ${parsed.path}`, error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * 批量删除 Storage 中的文件
 * @param {string[]} urls - 文件 URL 数组
 * @returns {Promise<{ success: number, failed: number, errors: string[] }>}
 */
async function deleteStorageFiles(urls) {
  const results = { success: 0, failed: 0, errors: [] }
  
  // 按 bucket 分组
  const byBucket = {}
  for (const url of urls) {
    if (!url) continue
    const parsed = parseStorageUrl(url)
    if (parsed) {
      if (!byBucket[parsed.bucket]) {
        byBucket[parsed.bucket] = []
      }
      byBucket[parsed.bucket].push(parsed.path)
    }
  }
  
  // 批量删除每个 bucket 中的文件
  for (const [bucket, paths] of Object.entries(byBucket)) {
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) {
      results.failed += paths.length
      results.errors.push(`${bucket}: ${error.message}`)
    } else {
      results.success += paths.length
    }
  }
  
  return results
}

/**
 * useDeleteWithStorage Composable
 * @returns {Object} - 包含删除方法和状态
 */
export function useDeleteWithStorage() {
  const isDeleting = ref(false)
  const deleteError = ref('')
  
  /**
   * 删除产品及其所有关联文件
   * @param {Object} product - 产品对象
   */
  async function deleteProduct(product) {
    isDeleting.value = true
    deleteError.value = ''
    
    try {
      // 收集所有需要删除的文件 URL
      const urls = [
        product.cover_image,
        product.nav_thumbnail
      ]
      
      // 获取产品的媒体块
      const { data: mediaBlocks } = await supabase
        .from('product_media_blocks')
        .select('image_url')
        .eq('product_id', product.id)
      
      if (mediaBlocks) {
        urls.push(...mediaBlocks.map(b => b.image_url))
      }
      
      // 先删除数据库记录
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      
      if (error) throw error
      
      // 删除存储文件（静默失败，不影响主流程）
      await deleteStorageFiles(urls.filter(Boolean))
      
      return { success: true }
    } catch (error) {
      deleteError.value = error.message
      return { success: false, error: error.message }
    } finally {
      isDeleting.value = false
    }
  }
  
  /**
   * 删除下载资源及其文件
   * @param {Object} download - 下载资源对象
   */
  async function deleteDownload(download) {
    isDeleting.value = true
    deleteError.value = ''
    
    try {
      // 先删除数据库记录
      const { error } = await supabase
        .from('downloads')
        .delete()
        .eq('id', download.id)
      
      if (error) throw error
      
      // 删除存储文件
      if (download.file_url) {
        await deleteStorageFile(download.file_url)
      }
      
      return { success: true }
    } catch (error) {
      deleteError.value = error.message
      return { success: false, error: error.message }
    } finally {
      isDeleting.value = false
    }
  }
  
  /**
   * 删除新闻及其封面图
   * @param {Object} news - 新闻对象
   */
  async function deleteNews(news) {
    isDeleting.value = true
    deleteError.value = ''
    
    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', news.id)
      
      if (error) throw error
      
      if (news.cover_image) {
        await deleteStorageFile(news.cover_image)
      }
      
      return { success: true }
    } catch (error) {
      deleteError.value = error.message
      return { success: false, error: error.message }
    } finally {
      isDeleting.value = false
    }
  }
  
  /**
   * 删除页面及其内容中的图片（需要解析 HTML）
   * @param {Object} page - 页面对象
   */
  async function deletePage(page) {
    isDeleting.value = true
    deleteError.value = ''
    
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', page.id)
      
      if (error) throw error
      
      // 从富文本内容中提取图片 URL
      if (page.content_html) {
        const imgRegex = /src="([^"]*supabase[^"]*\/storage\/[^"]*)"/g
        const urls = []
        let match
        while ((match = imgRegex.exec(page.content_html)) !== null) {
          urls.push(match[1])
        }
        if (urls.length > 0) {
          await deleteStorageFiles(urls)
        }
      }
      
      return { success: true }
    } catch (error) {
      deleteError.value = error.message
      return { success: false, error: error.message }
    } finally {
      isDeleting.value = false
    }
  }
  
  /**
   * 删除轮播图及其图片
   * @param {Object} slide - 轮播图对象
   */
  async function deleteCarouselSlide(slide) {
    isDeleting.value = true
    deleteError.value = ''
    
    try {
      const { error } = await supabase
        .from('home_carousel')
        .delete()
        .eq('id', slide.id)
      
      if (error) throw error
      
      // 删除桌面端和移动端图片
      const urls = [slide.image_url, slide.mobile_image_url].filter(Boolean)
      if (urls.length > 0) {
        await deleteStorageFiles(urls)
      }
      
      return { success: true }
    } catch (error) {
      deleteError.value = error.message
      return { success: false, error: error.message }
    } finally {
      isDeleting.value = false
    }
  }
  
  /**
   * 删除首页视频及其文件
   * @param {Object} video - 视频对象
   */
  async function deleteHomeVideo(video) {
    isDeleting.value = true
    deleteError.value = ''
    
    try {
      const { error } = await supabase
        .from('home_videos')
        .delete()
        .eq('id', video.id)
      
      if (error) throw error
      
      // 删除视频和封面图
      const urls = []
      if (video.source_type === 'local' && video.video_url) {
        urls.push(video.video_url)
      }
      if (video.poster_url) {
        urls.push(video.poster_url)
      }
      
      if (urls.length > 0) {
        await deleteStorageFiles(urls)
      }
      
      return { success: true }
    } catch (error) {
      deleteError.value = error.message
      return { success: false, error: error.message }
    } finally {
      isDeleting.value = false
    }
  }
  
  /**
   * 通用删除方法 - 根据表名和文件字段自动处理
   * @param {string} tableName - 数据库表名
   * @param {Object} record - 记录对象
   * @param {string[]} fileFields - 包含文件 URL 的字段名数组
   */
  async function deleteRecord(tableName, record, fileFields = []) {
    isDeleting.value = true
    deleteError.value = ''
    
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', record.id)
      
      if (error) throw error
      
      // 删除指定字段中的文件
      const urls = fileFields.map(field => record[field]).filter(Boolean)
      if (urls.length > 0) {
        await deleteStorageFiles(urls)
      }
      
      return { success: true }
    } catch (error) {
      deleteError.value = error.message
      return { success: false, error: error.message }
    } finally {
      isDeleting.value = false
    }
  }
  
  return {
    isDeleting,
    deleteError,
    deleteProduct,
    deleteDownload,
    deleteNews,
    deletePage,
    deleteCarouselSlide,
    deleteHomeVideo,
    deleteRecord,
    // 工具函数导出
    deleteStorageFile,
    deleteStorageFiles,
    parseStorageUrl
  }
}

export default useDeleteWithStorage

