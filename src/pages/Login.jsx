import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import { IothincLogo } from '../assets/IothincLogo'

export const Login = () => {
  const navigate = useNavigate()
  const { signIn, signUp, signOut, user, profile, refreshProfile } = useAuth()
  const [isApproved, setIsApproved] = useState(false)
  
  // Title Setup
  useEffect(() => {
    document.title = "IOTHINC | Sign In"
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile && !profile.needs_approval) {
      navigate('/dashboard')
    }
  }, [user, profile, navigate])

  // Listen for admin approval via Supabase Realtime
  useEffect(() => {
    let subscription;
    if (user && profile && profile.needs_approval) {
      subscription = supabase
        .channel(`public:profiles:id=eq.${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          if (payload.new && payload.new.needs_approval === false) {
            setIsApproved(true);
            refreshProfile();
          }
        })
        .subscribe()
    }
    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [user, profile, refreshProfile])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [fullName, setFullName] = useState('')
  
  // Status states
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccess(false)

    try {
      if (isRegisterMode) {
        // Sign Up Mode
        if (!fullName.trim()) throw new Error("Full name is required")
        await signUp(email, password, fullName)
        // UI will automatically transition to the waiting screen because user & profile will be set
      } else {
        // Sign In Mode
        await signIn(email, password)
        setSuccess(true)
        setTimeout(() => {
          navigate('/dashboard')
        }, 1000)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Authentication failed. Please verify your inputs.')
    } finally {
      setLoading(false)
    }
  }

  if (user && profile && profile.needs_approval) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0C] text-white p-8">
        <div className="absolute inset-0 grid-overlay pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-md w-full text-center relative z-10">
          <div className="mb-12 flex justify-center">
            <IothincLogo alt="IOTHINC Logo" className="w-[180px] h-auto text-white" />
          </div>
          
          {isApproved ? (
            <div className="bg-success/10 border border-success/30 rounded-base p-8 success-shadow">
              <span className="material-symbols-outlined text-5xl text-success mb-4">check_circle</span>
              <h2 className="text-2xl font-bold mb-3 font-syne">Account Approved!</h2>
              <p className="text-muted mb-8 text-sm">Your account has been approved by the administrator. You can log in now.</p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full h-[48px] bg-primary text-white font-bold rounded-base btn-shadow hover:brightness-110 active:scale-[0.99] transition-all"
              >
                Continue to Dashboard
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-high border border-white/10 rounded-base p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/50">
                <div className="h-full bg-amber-500 w-1/3 animate-[slide_2s_ease-in-out_infinite_alternate]"></div>
              </div>
              <span className="material-symbols-outlined text-5xl text-amber-500 mb-4 animate-pulse">pending</span>
              <h2 className="text-2xl font-bold mb-3 font-syne">Request Sent</h2>
              <p className="text-muted text-sm leading-relaxed mb-8">
                Your request is sent to the admin and you will be log in when the admin approves.
              </p>
              <div className="flex justify-center mb-6">
                <div className="w-8 h-8 border-3 border-white/10 border-t-amber-500 rounded-full animate-spin"></div>
              </div>
              <button 
                onClick={signOut}
                className="text-xs text-muted hover:text-white transition-colors"
              >
                Sign out or use a different account
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#0A0A0C] text-white select-none">
      {/* LEFT PANEL: Brand & Impact */}
      <section className="w-full md:w-[45%] relative overflow-hidden flex flex-col justify-between p-12 min-h-[40vh] md:min-h-screen">
        <div className="absolute inset-0 grid-overlay pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full glow-pulse pointer-events-none"></div>
        
        {/* Logo */}
        <div className="z-10 mb-8 md:mb-12">
          <IothincLogo
            alt="IOTHINC Logo" 
            className="w-[220px] h-auto block text-white"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md">
          <h1 className="font-syne font-extrabold text-4xl md:text-5xl leading-tight mb-6">
            Together we learn.<br />
            <span className="text-primary-fixed-dim">Together we build.
                                 Together we grow.</span>
          </h1>
          <p className="text-muted text-base mb-10 leading-relaxed">
            Learn new skills,build impactful projects,collaborate with like-minded peers,and grow into the next generation of innovators.
          </p>
          
          {/* Stat Chips */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface-container-high border border-white/10 rounded-base p-4 flex items-center gap-4 w-fit pr-8">
              <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(62,207,142,0.8)]"></div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">85</span>
                <span className="text-muted text-sm">Active members</span>
              </div>
            </div>
            <div className="bg-surface-container-high border border-white/10 rounded-base p-4 flex items-center gap-4 w-fit pr-8">
              <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,92,252,0.8)]"></div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">12</span>
                <span className="text-muted text-sm">Projects in progress</span>
              </div>
            </div>
            <div className="bg-surface-container-high border border-white/10 rounded-base p-4 flex items-center gap-4 w-fit pr-8">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">3</span>
                <span className="text-muted text-sm">Upcoming events</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-8">
          <p className="text-xs text-muted/50 font-medium">
            © 2026 IOTHINC Management System.
          </p>
        </div>
      </section>

      {/* RIGHT PANEL: Authentication */}
      <section className="w-full md:w-[55%] flex flex-col items-center justify-center p-8 md:p-12 relative overflow-y-auto min-h-[60vh] md:min-h-screen">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="w-full max-w-[420px] relative z-10">
          
          {/* Header */}
          <div className="mb-10 text-center">
            <h2 className="font-syne font-bold text-[28px] text-white mb-2">
              {isRegisterMode ? "Create Account" : "Welcome back"}
            </h2>
            <p className="text-[13px] text-muted">
              {isRegisterMode ? "Register a new member profile" : "Sign in to your IOTHINC account"}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegisterMode && (
              <div className="space-y-2">
                <div className="relative flex items-center bg-[#111116] border border-white/10 rounded-base h-[46px] px-4 input-focus-ring transition-all group">
                  <span className="material-symbols-outlined text-muted text-xl mr-3 group-focus-within:text-primary">badge</span>
                  <input 
                    className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-muted/50 text-white" 
                    placeholder="Full Name" 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <div className="relative flex items-center bg-[#111116] border border-white/10 rounded-base h-[46px] px-4 input-focus-ring transition-all group">
                <span className="material-symbols-outlined text-muted text-xl mr-3 group-focus-within:text-primary">mail</span>
                <input 
                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-muted/50 text-white" 
                  placeholder="name@nexusclub.com" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="relative flex items-center bg-[#111116] border border-white/10 rounded-base h-[46px] px-4 input-focus-ring transition-all group">
                <span className="material-symbols-outlined text-muted text-xl mr-3 group-focus-within:text-primary">lock</span>
                <input 
                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-muted/50 text-white" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  className="ml-2 text-muted hover:text-white transition-colors focus:outline-none" 
                  onClick={() => setShowPassword(!showPassword)} 
                  type="button"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Row: Options (Only in sign-in mode) */}
            {!isRegisterMode && (
              <div className="flex items-center justify-between text-[13px]">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input className="w-4 h-4 rounded border-white/20 bg-[#111116] text-primary focus:ring-primary focus:ring-offset-0" type="checkbox" />
                  <span className="text-muted group-hover:text-white transition-colors">Remember me</span>
                </label>
                <a className="text-primary hover:text-primary-muted font-medium" href="#forgot">Forgot password?</a>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs text-error font-medium text-center bg-error/10 py-2 rounded">
                ⚠️ {errorMsg}
              </p>
            )}

            {/* Success Loading Trigger */}
            {success && !isRegisterMode && (
              <div className="bg-success/15 border border-success/30 rounded-base p-4 flex items-center justify-center gap-2 success-shadow text-success text-sm font-bold animate-pulse">
                <span className="material-symbols-outlined text-xl">check_circle</span>
                <span>✓ Welcome back! Redirecting...</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 space-y-4">
              {loading ? (
                <button className="w-full h-[48px] bg-primary/70 text-white font-bold rounded-base cursor-not-allowed flex items-center justify-center gap-3" disabled>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                  </svg>
                  <span>Authenticating...</span>
                </button>
              ) : (
                <button className="w-full h-[48px] bg-primary text-white font-bold rounded-base btn-shadow hover:brightness-110 active:scale-[0.99] transition-all" type="submit">
                  {isRegisterMode ? "Submit Registration Request" : "Sign In"}
                </button>
              )}

              <button 
                className="w-full h-[48px] bg-transparent border border-white/10 text-muted font-medium rounded-base hover:bg-white/5 active:scale-[0.99] transition-all" 
                type="button"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
              >
                {isRegisterMode ? "Already have an account? Sign In" : "Request Account Access"}
              </button>
            </div>
          </form>

          {/* Role Strip */}
          <div className="mt-8 flex items-center justify-center gap-6 py-4 border-t border-white/5">
            <span className="text-[12px] uppercase tracking-wider text-muted font-bold">Roles:</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[12px] text-muted font-medium">Admin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[12px] text-muted font-medium">Coordinator</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-[12px] text-muted font-medium">Member</span>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  )
}
