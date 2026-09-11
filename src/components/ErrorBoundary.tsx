import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, HelpCircle, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { logSystemError } from '../lib/analyticsEngine';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onNavigateHome?: () => void;
  onOpenHelp?: () => void;
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Velcora Workspace ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    logSystemError(error, errorInfo?.componentStack || 'React Error Boundary');
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';

      return (
        <div className="w-full min-h-[420px] h-full flex items-center justify-center p-6 select-none">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F1424] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center relative overflow-hidden transition-all">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title & Message */}
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight mb-2">
              Workspace View Recovered
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] font-medium max-w-md mx-auto mb-6 leading-relaxed">
              A temporary issue interrupted this view. Your business data and cloud state remain safe. You can easily reset this view or return to the overview.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.resetError}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset View
              </button>

              {this.props.onNavigateHome && (
                <button
                  type="button"
                  onClick={() => {
                    this.resetError();
                    this.props.onNavigateHome?.();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Overview
                </button>
              )}

              {this.props.onOpenHelp && (
                <button
                  type="button"
                  onClick={this.props.onOpenHelp}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Help
                </button>
              )}
            </div>

            {/* Collapsible Details */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-left">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mx-auto transition-colors cursor-pointer"
              >
                <span>{this.state.showDetails ? 'Hide technical summary' : 'Show technical summary'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 max-h-36 overflow-y-auto break-all">
                  <div className="font-bold text-rose-600 dark:text-rose-400 mb-1">{errorMessage}</div>
                  {this.state.errorInfo?.componentStack && (
                    <div className="text-[10px] text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack.slice(0, 400)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
