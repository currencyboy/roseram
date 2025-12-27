'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class CodeBuilderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    console.error('CodeBuilder Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-lg shadow-xl border-l-4 border-red-500 p-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Something went wrong
                  </h1>
                  <p className="text-gray-600 mb-4">
                    The code editor encountered an error and needs to be restarted.
                  </p>

                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                      <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                        Error details (development only)
                      </summary>
                      <pre className="mt-3 text-xs text-red-700 overflow-auto max-h-48 bg-gray-100 p-3 rounded font-mono">
                        {this.state.error.toString()}
                        {'\n\n'}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </details>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={this.handleReset}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Restart Editor
                    </button>
                    <button
                      onClick={() => window.history.back()}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Go Back
                    </button>
                  </div>

                  {this.state.errorCount > 3 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Repeated errors detected</p>
                      <p>
                        If this error continues, please try clearing your browser cache or contacting support.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CodeBuilderErrorBoundary;
