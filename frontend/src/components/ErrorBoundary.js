import React from "react";

/**
 * ErrorBoundary — catches render/lifecycle errors in its subtree.
 *
 * Props:
 *  - pageName   {string}  Human label shown in the error card (e.g. "Dashboard")
 *  - resetKey   {any}     Change this value to programmatically reset the boundary
 *                         (App.js passes the route pathname so navigating auto-resets)
 *  - children   {node}    The subtree to protect
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Auto-reset when resetKey changes (e.g. user navigates to a different route)
  static getDerivedStateFromProps(props, state) {
    if (state.hasError && props.resetKey !== state.lastResetKey) {
      return { hasError: false, error: null, lastResetKey: props.resetKey };
    }
    return { lastResetKey: props.resetKey };
  }

  componentDidCatch(error, errorInfo) {
    const page = this.props.pageName || "Unknown Page";
    console.error(`[ErrorBoundary] Caught on "${page}":`, error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const pageName = this.props.pageName || "This page";
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 transition-colors">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-2xl rounded-3xl p-10 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-6 transform hover:scale-110 transition-transform duration-300">⚠️</div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
              {pageName} Failed to Load
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              An unexpected error occurred on this page. Your data is safe.
              Try again, or go back to a working section of the app.
            </p>

            {process.env.NODE_ENV !== "production" && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-8 text-left border border-red-100 dark:border-red-900/30 overflow-auto max-h-40">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                  Developer Error Info:
                </p>
                <code className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
                  {this.state.error?.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* Try Again: resets boundary state — no full page reload */}
              <button
                id="error-boundary-retry-btn"
                onClick={this.handleReset}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-all transform active:scale-95 uppercase tracking-widest"
              >
                Try Again
              </button>
              <button
                id="error-boundary-reload-btn"
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-4 px-8 rounded-2xl transition-all uppercase tracking-widest text-sm"
              >
                Reload App
              </button>
              <button
                id="error-boundary-home-btn"
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full bg-transparent border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold py-3 px-8 rounded-2xl transition-all uppercase tracking-widest text-xs"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


