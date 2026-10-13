// Past Games: (a) the list of sessions this client participated in — from
// localStorage only, since the server exposes no list endpoint — and
// (b) a room-code lookup field. Lookup hits the server first (authoritative,
// works on any device) and falls back to the local entry; otherwise a clear
// "not found" message.
import { useState } from 'react';
import { useI18n } from '../../../../i18n/index.ts';
import { Button, Card, Spinner } from '../../../../shared/ui/index.ts';
import { playSound } from '../../../../shared/sound.ts';
import { PokerRoomsApi } from '../../logic/pokerRooms.ts';
import type { PokerReport } from '../../logic/pokerRooms.ts';
import {
  formatDateTime,
  formatDuration,
  getLocalReport,
  listSavedReports,
  netLabel,
  playersByNet,
  saveReport,
} from '../../logic/reportUtils.ts';

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export interface PastGamesProps {
  onOpenReport: (report: PokerReport, saved: boolean) => void;
  onBack: () => void;
}

export function PastGames({ onOpenReport, onBack }: PastGamesProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState(() => listSavedReports());
  const [code, setCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function lookup(): Promise<void> {
    const c = code.trim().toUpperCase();
    if (c === '') {
      setLookupError(t('poker.mpErrCode'));
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    try {
      // Authoritative first: works on any device, even if this one never
      // joined the room on this browser.
      const report = await PokerRoomsApi.getReport(c);
      saveReport(c, report);
      setEntries(listSavedReports());
      playSound('click');
      onOpenReport(report, true);
    } catch {
      // Fall back to this device's cache.
      const local = getLocalReport(c);
      if (local) {
        playSound('click');
        onOpenReport(local.report, true);
      } else {
        setLookupError(t('poker.mpReportNotFound'));
      }
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <div className="pk-wrap">
      <Card title={t('poker.mpPastGames')}>
        <div className="pk-setup">
          <div className="pk-field">
            <label className="pk-label" htmlFor="pkmp-lookup">
              {t('poker.mpLookupLabel')}
            </label>
            <div className="pk-invite-row">
              <input
                id="pkmp-lookup"
                type="text"
                value={code}
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={12}
                placeholder={t('poker.mpCodePh')}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void lookup();
                }}
              />
              <Button
                variant="primary"
                size="md"
                disabled={lookingUp}
                onClick={() => void lookup()}
              >
                {lookingUp ? <Spinner /> : t('poker.mpLookup')}
              </Button>
            </div>
            {lookupError && (
              <p className="pk-error" role="alert">
                {lookupError}
              </p>
            )}
          </div>

          <div className="pk-label">{t('poker.mpOnThisDevice')}</div>
          {entries.length === 0 ? (
            <p className="pk-hint">{t('poker.mpNoPast')}</p>
          ) : (
            <div className="pk-lobby-list" role="list">
              {entries.map((e) => {
                const ranked = playersByNet(e.report.players);
                const best = ranked[0];
                return (
                  <button
                    key={e.code}
                    type="button"
                    className="pk-past-row"
                    role="listitem"
                    onClick={() => {
                      playSound('click');
                      onOpenReport(e.report, true);
                    }}
                  >
                    <span className="pk-past-main">
                      <strong>{e.report.roomName || e.code}</strong>
                      <span className="pk-hint">
                        {e.code} · {formatDateTime(e.savedAt)} ·{' '}
                        {fmt(t('poker.mpHandsShort'), {
                          n: e.report.handsPlayed,
                        })}{' '}
                        · {formatDuration(e.report.durationSec)}
                      </span>
                    </span>
                    {best && (
                      <span
                        className={
                          best.net > 0
                            ? 'pk-net-pos'
                            : best.net < 0
                              ? 'pk-net-neg'
                              : 'pk-net-zero'
                        }
                      >
                        🏆 {best.name} {netLabel(best.net)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <Button variant="ghost" size="lg" fullWidth onClick={onBack}>
            {t('poker.mpBack')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
