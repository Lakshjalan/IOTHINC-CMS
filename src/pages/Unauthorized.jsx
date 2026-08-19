import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const Unauthorized = () => {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = "403 - Restricted Access | IOTHINC"
  }, [])

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      <div className="absolute inset-0 grid-overlay pointer-events-none opacity-40"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-red-500/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 max-w-xl w-full text-center">
        {/* Shield Icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <span className="material-symbols-outlined text-red-400 text-4xl">lock_person</span>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>403 :: ACCESS_DENIED</span>
        </div>

        <h1 className="font-syne font-extrabold text-4xl md:text-5xl text-white mb-4">
          Restricted Security Clear
        </h1>

        <p className="text-muted text-sm md:text-base leading-relaxed max-w-md mx-auto mb-8">
          Your active profile role does not hold the required privileges (Administrator / Coordinator) to operate this subsystem.
        </p>

        {/* Security Policy Box */}
        <div className="bg-[#121216]/90 border border-red-500/20 rounded-xl p-5 mb-8 text-left font-mono text-xs text-muted space-y-2 backdrop-blur-md">
          <div className="flex justify-between border-b border-white/10 pb-2 text-white font-bold">
            <span>ROLE POLICIES</span>
            <span className="text-red-400">UNAUTHORIZED_ATTEMPT</span>
          </div>
          <div className="flex justify-between">
            <span>Required Role:</span>
            <span className="text-amber-400 font-bold">Admin / Coordinator</span>
          </div>
          <div className="flex justify-between">
            <span>Access Rule:</span>
            <span>Row Level Security (RLS) Enforced</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-8 h-12 bg-primary text-black font-bold rounded-lg btn-shadow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">security</span>
            <span>Return to Safe Zone</span>
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 h-12 bg-transparent border border-white/10 text-white font-medium rounded-lg hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </main>
  )
}


export default Unauthorized;
