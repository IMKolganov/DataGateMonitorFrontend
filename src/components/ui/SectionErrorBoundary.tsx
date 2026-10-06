import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Keeps a single page section usable when a child throws during render
 * (e.g. a malformed notification row), instead of blanking the whole app.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[SectionErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="error-message" role="alert" style={{ margin: "12px 0" }}>
          <strong>{this.props.title ?? "This section failed to render."}</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>{this.state.error.message}</div>
          <button
            type="button"
            className="btn secondary"
            style={{ marginTop: 12 }}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default SectionErrorBoundary;
