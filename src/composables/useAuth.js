/**
 * Auth Composable with MFA Support
 * Aune Audio CMS - Admin Authentication
 */
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'

// Global auth state
const user = ref(null)
const session = ref(null)
const loading = ref(true)
const mfaRequired = ref(false)
const mfaFactorId = ref(null)
const mfaChallengeId = ref(null)
const isAdmin = ref(false)

/**
 * Auth composable for managing authentication state and MFA
 */
export function useAuth() {
  /**
   * Initialize auth state and listen for changes
   */
  async function initialize() {
    loading.value = true
    
    try {
      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        await checkAdminStatus()
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event)
        session.value = newSession
        user.value = newSession?.user || null
        
        if (event === 'SIGNED_IN') {
          await checkAdminStatus()
        } else if (event === 'SIGNED_OUT') {
          isAdmin.value = false
          mfaRequired.value = false
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if current user is admin
   */
  async function checkAdminStatus() {
    if (!user.value) {
      isAdmin.value = false
      return
    }
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.value.id)
      .eq('is_active', true)
      .single()
    
    isAdmin.value = !error && !!data
    return isAdmin.value
  }

  /**
   * Sign in with email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, needsMfa: boolean, error: string|null}>}
   */
  async function signIn(email, password) {
    loading.value = true
    mfaRequired.value = false
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return { success: false, needsMfa: false, error: error.message }
      }
      
      // Check if MFA is required
      const { data: factors } = await supabase.auth.mfa.listFactors()
      
      if (factors?.totp && factors.totp.length > 0) {
        // User has MFA enabled, need to verify
        const totpFactor = factors.totp[0]
        mfaFactorId.value = totpFactor.id
        
        // Create MFA challenge
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        })
        
        if (challengeError) {
          return { success: false, needsMfa: false, error: challengeError.message }
        }
        
        mfaChallengeId.value = challengeData.id
        mfaRequired.value = true
        
        return { success: true, needsMfa: true, error: null }
      }
      
      // No MFA required, check admin status
      const adminCheck = await checkAdminStatus()
      if (!adminCheck) {
        await signOut()
        return { success: false, needsMfa: false, error: '非管理员账户，无权访问后台' }
      }
      
      return { success: true, needsMfa: false, error: null }
    } catch (error) {
      return { success: false, needsMfa: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Verify MFA TOTP code
   * @param {string} code - 6-digit TOTP code
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async function verifyMfa(code) {
    loading.value = true
    
    try {
      if (!mfaFactorId.value || !mfaChallengeId.value) {
        return { success: false, error: 'MFA 验证会话无效' }
      }
      
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId.value,
        challengeId: mfaChallengeId.value,
        code: code.trim()
      })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      // MFA verified successfully
      mfaRequired.value = false
      mfaFactorId.value = null
      mfaChallengeId.value = null
      
      // Update admin user MFA verification time
      await supabase
        .from('admin_users')
        .update({ mfa_verified_at: new Date().toISOString() })
        .eq('id', user.value.id)
      
      // Check admin status
      const adminCheck = await checkAdminStatus()
      if (!adminCheck) {
        await signOut()
        return { success: false, error: '非管理员账户，无权访问后台' }
      }
      
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Enroll new MFA TOTP factor
   * @returns {Promise<{qrCode: string, secret: string, factorId: string, error: string|null}>}
   */
  async function enrollMfa() {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Aune Audio Admin'
      })
      
      if (error) {
        return { qrCode: null, secret: null, factorId: null, error: error.message }
      }
      
      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
        error: null
      }
    } catch (error) {
      return { qrCode: null, secret: null, factorId: null, error: error.message }
    }
  }

  /**
   * Verify and complete MFA enrollment
   * @param {string} factorId 
   * @param {string} code 
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async function verifyMfaEnrollment(factorId, code) {
    try {
      // Create challenge for the new factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      })
      
      if (challengeError) {
        return { success: false, error: challengeError.message }
      }
      
      // Verify the challenge
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: code.trim()
      })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      // Update admin user MFA status
      await supabase
        .from('admin_users')
        .update({ 
          mfa_enabled: true,
          mfa_verified_at: new Date().toISOString()
        })
        .eq('id', user.value.id)
      
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Unenroll MFA factor
   * @param {string} factorId 
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async function unenrollMfa(factorId) {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      // Update admin user MFA status
      await supabase
        .from('admin_users')
        .update({ mfa_enabled: false })
        .eq('id', user.value.id)
      
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get list of MFA factors
   * @returns {Promise<{factors: Array, error: string|null}>}
   */
  async function listMfaFactors() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      
      if (error) {
        return { factors: [], error: error.message }
      }
      
      return { factors: data.totp || [], error: null }
    } catch (error) {
      return { factors: [], error: error.message }
    }
  }

  /**
   * Sign out current user
   */
  async function signOut() {
    loading.value = true
    
    try {
      await supabase.auth.signOut()
      user.value = null
      session.value = null
      isAdmin.value = false
      mfaRequired.value = false
      mfaFactorId.value = null
      mfaChallengeId.value = null
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Update last login time
   */
  async function updateLastLogin() {
    if (!user.value) return
    
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.value.id)
  }

  return {
    // State
    user: readonly(user),
    session: readonly(session),
    loading: readonly(loading),
    mfaRequired: readonly(mfaRequired),
    isAdmin: readonly(isAdmin),
    
    // Computed
    isAuthenticated: computed(() => !!session.value && !!user.value),
    isFullyAuthenticated: computed(() => !!session.value && !!user.value && !mfaRequired.value && isAdmin.value),
    
    // Methods
    initialize,
    signIn,
    verifyMfa,
    enrollMfa,
    verifyMfaEnrollment,
    unenrollMfa,
    listMfaFactors,
    signOut,
    checkAdminStatus,
    updateLastLogin,
  }
}

