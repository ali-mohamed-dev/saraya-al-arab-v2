'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8" dir="rtl">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">
              {this.props.fallbackTitle || 'حدث خطأ غير متوقع'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {this.props.fallbackMessage || 'نأسف للإزعاج. يرجى المحاولة مرة أخرى.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                تحديث الصفحة
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
