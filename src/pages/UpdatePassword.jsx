import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { IothincLogo } from '../assets/IothincLogo'

const UpdatePassword = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Title Setup
  useEffect(() => {
    document.title = "IOTHINC | Update Password"
  }, [])

  // Listen for auth state change to ensure we have a session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If they arrive here without a session, they either didn't come from a reset link
        // or the link expired. Wait a bit for Supabase to parse the URL hash just in case.
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: checkSession } }) => {
             if (!checkSession) {
               navigate('/login')
             }
          })
        }, 1000)
      }
    })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccess(false)

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0C] text-white p-8 select-none">
      <div className="absolute inset-0 grid-overlay pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="max-w-md w-full relative z-10">
        
        <div className="mb-10 flex flex-col items-center text-center">
          <IothincLogo alt="IOTHINC Logo" className="w-[180px] h-auto text-white mb-8" />
          <h2 className="font-syne font-bold text-[28px] text-white mb-2">
            Reset Password
          </h2>
          <p className="text-[13px] text-muted">
            Enter your new password below.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div className="relative flex items-center bg-[#111116] border border-white/10 rounded-base h-[46px] px-4 input-focus-ring transition-all group">
              <span className="material-symbols-outlined text-muted text-xl mr-3 group-focus-within:text-primary">lock</span>
              <input 
                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-muted/50 text-white" 
                placeholder="New Password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative flex items-center bg-[#111116] border border-white/10 rounded-base h-[46px] px-4 input-focus-ring transition-all group">
              <span className="material-symbols-outlined text-muted text-xl mr-3 group-focus-within:text-primary">lock_reset</span>
              <input 
                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-muted/50 text-white" 
                placeholder="Confirm New Password" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-error font-medium text-center bg-error/10 py-2 rounded">
              ⚠️ {errorMsg}
            </p>
          )}

          {success && (
            <div className="bg-success/15 border border-success/30 rounded-base p-4 flex items-center justify-center gap-2 success-shadow text-success text-sm font-bold animate-pulse">
              <span className="material-symbols-outlined text-xl">check_circle</span>
              <span>Password updated! Redirecting...</span>
            </div>
          )}

          <div className="pt-4 space-y-4">
            {loading ? (
              <button className="w-full h-[48px] bg-primary/70 text-white font-bold rounded-base cursor-not-allowed flex items-center justify-center gap-3" disabled>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                </svg>
                <span>Updating...</span>
              </button>
            ) : (
              <button className="w-full h-[48px] bg-primary text-white font-bold rounded-base btn-shadow hover:brightness-110 active:scale-[0.99] transition-all" type="submit">
                Update Password
              </button>
            )}
            
            <button 
              className="w-full h-[48px] bg-transparent border border-white/10 text-muted font-medium rounded-base hover:bg-white/5 active:scale-[0.99] transition-all" 
              type="button"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default UpdatePassword;
