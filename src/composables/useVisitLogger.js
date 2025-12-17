/**
 * Visit Logger Composable
 * Records page visits to Supabase visit_logs table
 */
import { supabase } from '@/lib/supabase'

// Session ID for tracking
let sessionId = null

/**
 * Generate or retrieve session ID
 */
function getSessionId() {
  if (sessionId) return sessionId
  
  // Try to get from sessionStorage
  const stored = sessionStorage.getItem('aune_session_id')
  if (stored) {
    sessionId = stored
    return sessionId
  }
  
  // Generate new session ID
  sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  sessionStorage.setItem('aune_session_id', sessionId)
  
  return sessionId
}

/**
 * Parse user agent to extract device info
 */
function parseUserAgent(ua) {
  const result = {
    device_type: 'desktop',
    browser: 'Unknown',
    os: 'Unknown'
  }
  
  if (!ua) return result
  
  // Detect device type
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    result.device_type = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile'
  }
  
  // Detect browser
  if (/Firefox/i.test(ua)) {
    result.browser = 'Firefox'
  } else if (/Edg/i.test(ua)) {
    result.browser = 'Edge'
  } else if (/Chrome/i.test(ua)) {
    result.browser = 'Chrome'
  } else if (/Safari/i.test(ua)) {
    result.browser = 'Safari'
  } else if (/Opera|OPR/i.test(ua)) {
    result.browser = 'Opera'
  }
  
  // Detect OS
  if (/Windows/i.test(ua)) {
    result.os = 'Windows'
  } else if (/Mac OS/i.test(ua)) {
    result.os = 'macOS'
  } else if (/Linux/i.test(ua)) {
    result.os = 'Linux'
  } else if (/Android/i.test(ua)) {
    result.os = 'Android'
  } else if (/iOS|iPhone|iPad/i.test(ua)) {
    result.os = 'iOS'
  }
  
  return result
}

/**
 * Get client IP address using external service
 * Note: This is a client-side approach. For production,
 * consider using Supabase Edge Functions to capture real IP
 */
async function getClientIP() {
  try {
    // Use ipify API (free, no rate limit for basic usage)
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch (error) {
    console.warn('Failed to get client IP:', error)
    return '0.0.0.0'
  }
}

/**
 * Log a page visit
 * @param {string} pageUrl - The URL of the visited page
 */
export async function logVisit(pageUrl) {
  try {
    const [ip, _] = await Promise.all([
      getClientIP(),
      Promise.resolve() // Placeholder for any async init
    ])
    
    const userAgent = navigator.userAgent
    const deviceInfo = parseUserAgent(userAgent)
    
    const visitData = {
      ip_address: ip,
      page_url: pageUrl,
      referer: document.referrer || null,
      user_agent: userAgent,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      session_id: getSessionId(),
      visited_at: new Date().toISOString()
    }
    
    // Insert visit log (RLS allows anonymous inserts)
    const { error } = await supabase
      .from('visit_logs')
      .insert(visitData)
    
    if (error) {
      console.warn('Failed to log visit:', error)
    }
  } catch (error) {
    console.warn('Visit logging error:', error)
  }
}

/**
 * Create router middleware for visit logging
 * @param {Router} router - Vue Router instance
 */
export function createVisitLoggerMiddleware(router) {
  // Track visited pages in current session to avoid duplicate logs
  const visitedInSession = new Set()
  
  router.afterEach((to, from) => {
    // Skip admin routes
    if (to.path.startsWith('/admin')) {
      return
    }
    
    // Create unique key for this page visit
    const pageKey = to.fullPath
    
    // Skip if already visited in this session (optional - remove for full tracking)
    // if (visitedInSession.has(pageKey)) {
    //   return
    // }
    
    // Log the visit
    logVisit(to.fullPath)
    visitedInSession.add(pageKey)
  })
}

/**
 * Use visit logger composable
 */
export function useVisitLogger() {
  return {
    logVisit,
    getSessionId,
    createVisitLoggerMiddleware
  }
}

