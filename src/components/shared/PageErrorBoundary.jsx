import React from "react";

export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PageErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl mx-auto mt-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-4">
              {this.state.error?.message || "An unexpected error occurred while loading this page."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm hover:bg-slate-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}