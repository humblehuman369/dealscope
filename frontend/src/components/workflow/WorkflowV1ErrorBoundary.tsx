'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { capturePostHog } from '@/lib/posthog'

interface Props {
  children: ReactNode
  route: string
  onCaught: () => void
}

interface State {
  hasError: boolean
}

/**
 * A bug in a V1 card costs the redesign for this page load, not the product.
 * Captures to PostHog with layout=v1 and the route, then the parent renders
 * the legacy layout.
 */
export class WorkflowV1ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    capturePostHog('$exception', {
      layout: 'v1',
      route: this.props.route,
      message: error.message,
    })
    this.props.onCaught()
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export function WorkflowV1ThrowProbe({ label }: { label: string }): null {
  throw new Error(`workflow-v1 ${label}`)
}
