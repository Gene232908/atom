import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-6">
        <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center">
          <p className="text-4xl">😕</p>
          <h1 className="mt-3 text-lg font-semibold text-ink">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted">Please reload the page. Your data is safe.</p>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '/';
              window.location.reload();
            }}
            className="mt-5 h-11 w-full rounded-full bg-ink font-semibold text-white active:scale-[0.98]"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
