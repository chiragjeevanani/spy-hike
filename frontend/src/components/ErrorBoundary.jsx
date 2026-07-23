import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import AppLogo from './AppLogo';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    const path = window.location.pathname;

    if (path.startsWith('/organizer') || localStorage.getItem('trekigo_org_user')) {
      window.location.href = '/organizer/dashboard';
    } else if (path.startsWith('/admin') || localStorage.getItem('trekigo_admin_user')) {
      window.location.href = '/admin/dashboard';
    } else if (path.startsWith('/app') || localStorage.getItem('trekigo_user')) {
      window.location.href = '/app/';
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Safely check dark class
      const isDarkMode = document.documentElement.classList.contains('dark') || 
                         window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      return (
        <div className={`w-full h-full min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans ${
          isDarkMode ? 'bg-zinc-950 text-white' : 'bg-[#FAF8F2] text-zinc-800'
        }`}>
          <div className={`max-w-md w-full space-y-6 p-8 rounded-3xl border backdrop-blur-md shadow-xl transition-all duration-300 ${
            isDarkMode 
              ? 'bg-zinc-900/40 border-forest-300/20 shadow-forest-900/10' 
              : 'bg-white/60 border-forest-500/20 shadow-forest-950/5'
          }`}>
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <AppLogo size={64} showText={true} />
            </div>

            {/* Error Icon */}
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle size={32} />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-display font-black tracking-tight leading-none text-rose-500">
                Expedition Interrupted
              </h1>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-650'}`}>
                A minor storm (rendering glitch) crossed our path. The guides are working to secure the route.
              </p>
            </div>

            {/* Technical Detail */}
            {this.state.error && (
              <div className="text-left bg-black/35 rounded-xl p-3 border border-white/5 overflow-x-auto max-h-[120px] no-scrollbar">
                <code className="text-[10px] font-mono text-rose-400/80 leading-normal block whitespace-pre-wrap">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-5 py-3 rounded-xl bg-forest-500 hover:bg-forest-600 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-forest-500/15"
              >
                <RefreshCw size={13} />
                Try Again
              </button>
              
              <button
                type="button"
                onClick={this.handleGoHome}
                className={`flex-1 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 border ${
                  isDarkMode 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-white/5' 
                    : 'bg-gray-100 hover:bg-gray-200 text-zinc-700 hover:text-zinc-800 border-zinc-200'
                }`}
              >
                <Home size={13} />
                Go Back Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
