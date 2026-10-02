// Error boundary for lazily-loaded game screens: if a game chunk fails to
// load (stale cached page after a new deploy is the classic cause on
// phones), show a friendly retry/reload panel instead of a blank screen.
// The underlying error message is shown in small text so a failure can be
// reported and diagnosed instead of guessed at.

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useI18n } from '../../i18n/index.ts';
import { Button, Card } from './index.ts';

interface InnerProps {
  children: ReactNode;
  fallback: (error: Error | null) => ReactNode;
}

interface InnerState {
  error: Error | null;
}

class BoundaryInner extends Component<InnerProps, InnerState> {
  state: InnerState = { error: null };

  static getDerivedStateFromError(error: Error): InnerState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // Surface in console for diagnosis; the UI fallback is what users see.
    console.error('[game-night] game screen failed to load', error);
  }

  render(): ReactNode {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}

export function GameErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <BoundaryInner
      fallback={(error) => (
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
          {error && (
            <p
              style={{
                textAlign: 'center',
                color: '#b0a89f',
                fontSize: '0.72rem',
                marginTop: '0.6rem',
                wordBreak: 'break-word',
              }}
            >
              {error.name}: {error.message}
            </p>
          )}
        </Card>
      )}
    >
      {children}
    </BoundaryInner>
  );
}
