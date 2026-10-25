import { Component, type ErrorInfo, type ReactNode } from "react";
import { Beaker, RotateCcw } from "lucide-react";
import { lock } from "@/lib/auth";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

/** A last-resort recovery screen; fixing the store, not this boundary, cures #185. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("MicroTrace render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-viewport safe-area-page bg-navy-50 p-4 flex items-center justify-center">
        <section className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4" role="alert">
          <Beaker className="text-navy" size={32} />
          <h1 className="text-xl font-extrabold text-ink">MicroTrace needs to reload</h1>
          <p className="text-sm text-slate-600">An unexpected screen error occurred. Your saved inventory has not been deleted.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="min-h-11 rounded-xl bg-navy text-white px-4 font-semibold inline-flex items-center gap-2"
              onClick={() => window.location.reload()}><RotateCcw size={16} /> Reload app</button>
            <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold text-ink"
              onClick={() => { lock(); window.location.reload(); }}>Return to sign-in</button>
          </div>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer">Technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
          </details>
        </section>
      </main>
    );
  }
}
