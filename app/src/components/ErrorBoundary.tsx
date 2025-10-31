import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="card max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-16 h-16 text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Something went wrong
            </h2>
            
            <p className="text-white/80 mb-6">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            {this.state.error && (
              <details className="text-left mb-6">
                <summary className="text-white/60 cursor-pointer text-sm mb-2">
                  Error details
                </summary>
                <pre className="text-xs text-red-400 bg-black/20 p-3 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Page</span>
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="btn btn-secondary"
              >
                Try Again
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