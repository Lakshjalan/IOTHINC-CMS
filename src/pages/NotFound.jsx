import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = "404 - Signal Lost | IOTHINC"
  }, [])

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Circuit Background Overlays & Radial Glow */}
      <div className="absolute inset-0 grid-overlay pointer-events-none opacity-40"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>

      <div className="relative z-10 max-w-xl w-full text-center">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span>SYSTEM_ERROR :: SIGNAL_LOST</span>
        </div>

        {/* 404 Display */}
        <h1 className="font-syne font-extrabold text-8xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-primary to-amber-600 mb-2 tracking-tighter shadow-sm">
          404
        </h1>

        <h2 className="font-syne font-bold text-2xl md:text-3xl text-white mb-4">
          Target Node Disconnected
        </h2>

        <p className="text-muted text-sm md:text-base leading-relaxed max-w-md mx-auto mb-8">
          The node or route you requested has disconnected from the IOTHINC network cluster. Check your URL coordinates or return to mission control.
        </p>

        {/* Interactive Telemetry Widget */}
        <div className="bg-[#121216]/90 border border-white/10 rounded-xl p-5 mb-8 text-left grid grid-cols-2 md:grid-cols-4 gap-4 backdrop-blur-md shadow-xl">
          <div>
            <div className="text-[10px] uppercase font-mono text-muted tracking-wider mb-1">Latency</div>
            <div className="text-error font-mono text-sm font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">rss_feed</span>
              <span>N/A</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-muted tracking-wider mb-1">Packet Loss</div>
            <div className="text-error font-mono text-sm font-bold">100%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-muted tracking-wider mb-1">Signal Strength</div>
            <div className="text-warning font-mono text-sm font-bold">0 dBm</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-muted tracking-wider mb-1">Node Status</div>
            <div className="text-muted font-mono text-sm font-bold">OFFLINE</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-8 h-12 bg-primary text-black font-bold rounded-lg btn-shadow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">home</span>
            <span>Back to Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 h-12 bg-transparent border border-white/10 text-white font-medium rounded-lg hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span>Previous Screen</span>
          </button>
        </div>
      </div>
    </main>
  )
}


export default NotFound;
