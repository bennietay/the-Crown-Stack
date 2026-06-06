import React from "react";

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Duplios runtime error", error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-crown-navy px-4 text-center">
        <section className="max-w-xl rounded-lg border border-white/10 bg-crown-ink p-6 shadow-glow">
          <p className="text-xl font-semibold text-white">Duplios needs a refresh</p>
          <p className="mt-3 text-sm leading-6 text-crown-champagne">
            A workspace data item was missing while the page was rendering. Refresh the app after
            deploying the latest build. If this happens after login, confirm the user has an active
            profile row in Supabase.
          </p>
          <p className="mt-4 rounded-lg border border-crown-rose/25 bg-crown-rose/10 p-3 text-xs text-crown-rose">
            {this.state.error.message}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy"
            >
              Refresh App
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/?view=login";
              }}
              className="h-10 rounded-lg border border-white/10 px-4 text-sm font-semibold text-white"
            >
              Go To Login
            </button>
          </div>
        </section>
      </main>
    );
  }
}
