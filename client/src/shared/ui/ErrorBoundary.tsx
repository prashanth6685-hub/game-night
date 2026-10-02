// Error boundary for lazily-loaded game screens: if a game chunk fails to
// load (stale cached page after a new deploy is the classic cause on
// phones), show a friendly retry/reload panel instead of a blank screen.

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useI18n } from '../../i18n/index.ts';
import { Button, Card } from './index.ts';

interface InnerProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface InnerState {
  hasError: boolean;
}

class BoundaryInner extends Component<InnerProps, InnerState> {
  state: InnerState = { hasError: false };

  static getDerivedStateFromError(): InnerState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // Surface in console for diagnosis; the UI fallback is what users see.
    console.error('[game-night] game screen failed to load', error);
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function GameErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const fallback = (
    <Card>
      <p style={{ textAlign: 'center', fontWeight: 700 }}>
        {t('errors.gameLoad')}
      </p>
      <Button
        variant="primary"
        fullWidth
        onClick={() => window.location.reload()}
      >
        {t('common.retry')}
      </Button>
    </Card>
  );
  return <BoundaryInner fallback={fallback}>{children}</BoundaryInner>;
}
