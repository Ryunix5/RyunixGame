import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // TODO: Send error to logging service in production
        // Example: logErrorToService(error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
                    <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 border-2 border-red-500">
                        <div className="text-center space-y-4">
                            <div className="text-6xl">⚠️</div>
                            <h1 className="text-2xl font-bold text-red-500">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-gray-400">
                                An unexpected error occurred. Please try refreshing the page.
                            </p>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-4 text-left">
                                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-300">
                                        Error Details (Dev Only)
                                    </summary>
                                    <div className="mt-2 p-4 bg-gray-900 rounded text-xs font-mono overflow-auto max-h-48">
                                        <div className="text-red-400 mb-2">
                                            {this.state.error.toString()}
                                        </div>
                                        {this.state.errorInfo && (
                                            <div className="text-gray-500">
                                                {this.state.errorInfo.componentStack}
                                            </div>
                                        )}
                                    </div>
                                </details>
                            )}

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-bold transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold transition-colors"
                                >
                                    Go Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
