import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 max-w-lg w-full bg-[#121216] border border-amber-500/20 rounded-xl p-8 shadow-2xl text-center">
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-amber-400 text-3xl">warning</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>500 | RUNTIME_EXCEPTION</span>
            </div>

            <h1 className="font-syne font-bold text-3xl text-white mb-3">
              Application Malfunction
            </h1>
            <p className="text-muted text-sm leading-relaxed mb-6">
              An unexpected render anomaly occurred in this section. Our system logged the exception to prevent full circuit failure.
            </p>

            {/* Error Detail Stack */}
            <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-4 text-left font-mono text-xs text-amber-300/80 mb-6 overflow-x-auto max-h-36 no-scrollbar">
              <div className="text-error font-bold mb-1">Error: {this.state.error?.message || 'Unknown Exception'}</div>
              {this.state.errorInfo?.componentStack && (
                <div className="text-muted/60 text-[11px] whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack.slice(0, 300)}...
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button 
                onClick={this.handleReset} 
                className="w-full sm:w-auto px-6 h-11 bg-primary text-black font-bold rounded-lg btn-shadow hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">space_dashboard</span>
                <span>Return to Dashboard</span>
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full sm:w-auto px-6 h-11 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                <span>Reload Circuit</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
