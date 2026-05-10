import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="font-medium text-red-400">Something went wrong</p>
            <p className="mt-1 text-sm text-dim">Try refreshing the page</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
