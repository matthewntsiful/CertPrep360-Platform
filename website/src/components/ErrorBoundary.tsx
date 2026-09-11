import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useExamStore } from '../store/useExamStore';

interface Props {
  children: ReactNode;
  /** Optional custom fallback. If omitted, the built-in recovery UI is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time exceptions in any child subtree and shows a recovery UI
 * instead of crashing the whole page. For exam-related crashes it also resets
 * the exam store so the user can start fresh without needing to log out.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
    // Reset the exam store so corrupted state is cleared immediately.
    // This is the programmatic equivalent of the logout/login fix the user had to do.
    try {
      useExamStore.getState().resetExam();
    } catch {
      // If the store itself is broken, ignore — the page reload below will fix it.
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-slate-900 border border-slate-800">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Something went wrong</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                The page ran into an unexpected error. Your exam progress has been cleared.
                Reload to start fresh or go back to your dashboard.
              </p>
            </div>
            {this.state.error && (
              <p className="text-[11px] font-mono text-slate-600 bg-slate-950 rounded-xl px-4 py-3 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
