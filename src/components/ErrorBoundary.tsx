import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to logging service in production
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-8" 
          style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)' }}>
          <div className="glass-card p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-400">
                  We're sorry for the inconvenience. The application encountered an unexpected error.
                </p>
              </div>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h3 className="font-semibold text-red-400 mb-2">Error Details:</h3>
                <p className="text-sm text-gray-300 font-mono mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 overflow-auto max-h-48">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                className="glass-button flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="glass-button flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </div>

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400">
                If this problem persists, please contact support or check the console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for error boundary with hooks support
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
