'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Render an inline card instead of full-screen fallback */
  inline?: boolean
  /** Custom fallback component */
  fallback?: ReactNode
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, showDetails: false }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error)
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }

    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const { error, showDetails } = this.state
    const errorMessage = error?.message || 'An unexpected error occurred'

    if (this.props.inline) {
      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
          <h3 className="text-base font-semibold text-gray-100 mb-1">Something went wrong</h3>
          <p className="text-sm text-gray-400 text-center mb-4 line-clamp-2">{errorMessage}</p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )
    }

    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center p-8 bg-navy-900">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>

          <h2 className="text-xl font-bold text-gray-100 mb-2">Something Went Wrong</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-7">
            The app encountered an unexpected error. Please try reloading.
          </p>

          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-7 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Reload
          </button>

          {process.env.NODE_ENV === 'development' && (
            <>
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="flex items-center gap-1 mt-5 px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <pre className="mt-2 w-full max-h-48 overflow-auto p-3 rounded-lg bg-black/30 text-[11px] text-gray-500 font-mono text-left">
                  {error?.stack || errorMessage}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
}

export function ScreenErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary inline>{children}</ErrorBoundary>
}

export default ErrorBoundary
