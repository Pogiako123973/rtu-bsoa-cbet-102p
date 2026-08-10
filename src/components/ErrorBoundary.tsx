import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
          <div className="max-w-xl rounded-lg border bg-card p-6 shadow-soft">
            <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app crashed while rendering. Open the browser console (F12) for the full error.
            </p>
            <pre className="mt-4 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
            <button
              onClick={() => location.reload()}
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}