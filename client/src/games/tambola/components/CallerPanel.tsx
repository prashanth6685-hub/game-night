// Shared number-caller panel: big current number, previous numbers, called
// count, Call button, auto-call controls, and the 1–90 board.
// Used by the same-device GameScreen and the multi-phone HostPlayScreen.

import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card } from '../../../shared/ui/index.ts';

const AUTO_INTERVALS = [3, 5, 10, 15];

interface CallerPanelProps {
  called: number[];
  auto: boolean;
  paused: boolean;
  intervalSec: number;
  onCall: () => void;
  onToggleAuto: () => void;
  onTogglePause: () => void;
  onIntervalChange: (s: number) => void;
  /** Extra buttons rendered under the auto-call row (reset/claim/end …). */
  actionRow?: ReactNode;
}

export function CallerPanel({
  called,
  auto,
  paused,
  intervalSec,
  onCall,
  onToggleAuto,
  onTogglePause,
  onIntervalChange,
  actionRow,
}: CallerPanelProps): JSX.Element {
  const { t } = useI18n();
  const current = called.length > 0 ? called[called.length - 1] : null;
  const previous = called.slice(-6, -1).reverse();
  const allCalled = called.length >= 90;
  const calledSet = new Set(called);

  return (
    <>
      <Card>
        <div className="tm-current" key={current ?? 'none'} aria-live="polite">
          {current === null ? (
            <span className="tm-current__waiting">{t('tambola.waitingFirstCall')}</span>
          ) : (
            <span className="tm-current__num tm-pop">{current}</span>
          )}
        </div>
        <div className="tm-meta">
          <div className="tm-prev">
            <span className="tm-prev__label">{t('tambola.previousLabel')}</span>
            {previous.map((n) => (
              <span className="tm-prev__chip" key={n}>
                {n}
              </span>
            ))}
          </div>
          <div className="tm-count">
            {t('tambola.numbersCalledLabel')}:{' '}
            <strong>
              {t('tambola.calledCount').replace('{called}', String(called.length))}
            </strong>
          </div>
        </div>
        <div className="tm-actions">
          <Button variant="primary" size="lg" fullWidth disabled={allCalled} onClick={onCall}>
            {t('tambola.callNumber')}
          </Button>
          {allCalled ? <p className="tm-center">{t('tambola.allNumbersCalled')}</p> : null}
        </div>
        <div className="tm-autocall">
          <Button variant={auto ? 'primary' : 'secondary'} size="sm" onClick={onToggleAuto}>
            {t('tambola.autoCall')}: {auto ? t('settings.on') : t('settings.off')}
          </Button>
          <select
            className="tm-select tm-select--sm"
            aria-label={t('tambola.intervalLabel')}
            value={intervalSec}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
          >
            {AUTO_INTERVALS.map((s) => (
              <option key={s} value={s}>
                {t('tambola.intervalSeconds').replace('{n}', String(s))}
              </option>
            ))}
          </select>
          {auto ? (
            <Button variant="secondary" size="sm" onClick={onTogglePause}>
              {paused ? t('tambola.resume') : t('tambola.pause')}
            </Button>
          ) : null}
        </div>
        {actionRow}
      </Card>

      <Card title={t('tambola.boardLabel')}>
        <div className="tm-board" aria-label={t('tambola.boardLabel')}>
          {Array.from({ length: 90 }, (_, i) => {
            const n = i + 1;
            const isCalled = calledSet.has(n);
            return (
              <span
                key={n}
                className={'tm-board__cell' + (isCalled ? ' tm-board__cell--called' : '')}
              >
                {n}
              </span>
            );
          })}
        </div>
      </Card>
    </>
  );
}
