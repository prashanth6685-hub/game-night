// End-of-session report: full summary + per-player table ranked by net,
// with the "Saved to your history ✓" confirmation, copy-text summary and
// print as secondary options. Read-only when opened from Past Games.
// (No CSV download — persistent history + room-code lookup instead.)
import { useState } from 'react';
import { useI18n } from '../../../../i18n/index.ts';
import { Button, Card, useToast } from '../../../../shared/ui/index.ts';
import { copyToClipboard } from '../../logic/share.ts';
import { playSound } from '../../../../shared/sound.ts';
import type { PokerReport, PokerReportPlayer } from '../../logic/pokerRooms.ts';
import {
  biggestLossName,
  formatDateTime,
  formatDuration,
  netLabel,
  playersByNet,
  reportSummaryText,
  topWinnerName,
  totalInvested,
  totalRebuyAmount,
  totalsLabel,
} from '../../logic/reportUtils.ts';

export interface ReportScreenProps {
  report: PokerReport;
  /** True when this report was persisted to this device's history. */
  saved: boolean;
  onBack: () => void;
  onPastGames: () => void;
}

function PlayerRow({
  p,
  rank,
  isTop,
  isWorst,
}: {
  p: PokerReportPlayer;
  rank: number;
  isTop: boolean;
  isWorst: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const netCls = p.net > 0 ? 'pk-net-pos' : p.net < 0 ? 'pk-net-neg' : 'pk-net-zero';
  const flag = isTop ? (
    <span className="pk-flag" title={t('poker.mpTopWinner')}>
      🏆
    </span>
  ) : isWorst ? (
    <span className="pk-flag" title={t('poker.mpBiggestLoss')}>
      📉
    </span>
  ) : null;

  return (
    <div className="pk-rep-player">
      <button
        type="button"
        className="pk-rep-head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="pk-rep-rank">#{rank}</span>
        <span className="pk-rep-name">
          {p.name} {flag}
        </span>
        <span className={`pk-rep-net ${netCls}`}>{netLabel(p.net)}</span>
        <span className="pk-rep-caret" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <dl className="pk-rep-detail">
          <div>
            <dt>{t('poker.mpBuyInCol')}</dt>
            <dd>{p.initialBuyIn}</dd>
          </div>
          <div>
            <dt>{t('poker.mpRebuysTotalCol')}</dt>
            <dd>{totalRebuyAmount(p)}</dd>
          </div>
          <div>
            <dt>{t('poker.mpInvestedCol')}</dt>
            <dd>{totalInvested(p)}</dd>
          </div>
          <div>
            <dt>{t('poker.mpContributedCol')}</dt>
            <dd>{p.contributed}</dd>
          </div>
          <div>
            <dt>{t('poker.mpFinalChipsCol')}</dt>
            <dd>{p.finalChips}</dd>
          </div>
          <div>
            <dt>{t('poker.mpHandsCol')}</dt>
            <dd>
              {p.handsWon}/{p.handsPlayed}
            </dd>
          </div>
          <div>
            <dt>{t('poker.mpNetCol')}</dt>
            <dd className={netCls}>{netLabel(p.net)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export function ReportScreen({ report, saved, onBack, onPastGames }: ReportScreenProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const ranked = playersByNet(report.players);
  const top = topWinnerName(report);
  const worst = biggestLossName(report);

  async function copySummary(): Promise<void> {
    const ok = await copyToClipboard(reportSummaryText(report));
    toast(ok ? t('poker.mpCopied') : t('poker.mpCopyFailed'), ok ? 'success' : 'error');
    if (ok) playSound('click');
  }

  return (
    <div className="pk-wrap">
      <div className="pk-report" id="pk-report">
        <Card title={t('poker.mpReportTitle')}>
          <div className="pk-setup">
            {saved && (
              <div className="pk-saved-banner" role="status">
                ✓ {t('poker.mpSavedHistory')}
              </div>
            )}

            <div className="pk-rep-summary">
              <div className="pk-rep-room">
                <strong>{report.roomName || t('poker.playTitle')}</strong>
                <span className="pk-hint"> · {report.code}</span>
              </div>
              <dl className="pk-rep-facts">
                <div>
                  <dt>{t('poker.mpDurationCol')}</dt>
                  <dd>{formatDuration(report.durationSec)}</dd>
                </div>
                <div>
                  <dt>{t('poker.mpHandsPlayedCol')}</dt>
                  <dd>{report.handsPlayed}</dd>
                </div>
                <div>
                  <dt>{t('poker.mpTotalsCol')}</dt>
                  <dd>{totalsLabel(report.totals)}</dd>
                </div>
                <div>
                  <dt>{t('poker.mpAccountingCol')}</dt>
                  <dd
                    className={report.balanced ? 'pk-net-pos' : 'pk-net-neg'}
                  >
                    {report.balanced
                      ? t('poker.mpBalanced')
                      : t('poker.mpUnbalanced')}
                  </dd>
                </div>
              </dl>
              {(report.startedAt > 0 || report.endedAt > 0) && (
                <p className="pk-hint">
                  {formatDateTime(report.startedAt)}
                  {report.endedAt > 0 && ` → ${formatDateTime(report.endedAt)}`}
                </p>
              )}
            </div>

            {ranked.length === 0 ? (
              <p className="pk-hint">{t('poker.mpNoPlayers')}</p>
            ) : (
              <div className="pk-rep-players" role="table" aria-label={t('poker.mpReportTitle')}>
                {ranked.map((p, i) => (
                  <PlayerRow
                    key={`${p.name}-${i}`}
                    p={p}
                    rank={i + 1}
                    isTop={top !== null && top === p.name}
                    isWorst={worst !== null && worst === p.name}
                  />
                ))}
              </div>
            )}

            <div className="pk-legend pk-hint">
              <span>
                <span className="pk-net-pos">+n</span> {t('poker.mpProfit')}
              </span>
              <span>
                <span className="pk-net-neg">−n</span> {t('poker.mpLoss')}
              </span>
              <span>
                <span className="pk-net-zero">±0</span> {t('poker.mpBreakEven')}
              </span>
            </div>

            <div className="pk-result-btns pk-no-print">
              <Button variant="secondary" size="md" onClick={() => void copySummary()}>
                {t('poker.mpCopySummary')}
              </Button>
              <Button variant="secondary" size="md" onClick={() => window.print()}>
                {t('poker.mpPrint')}
              </Button>
            </div>
            <div className="pk-result-btns pk-no-print">
              <Button variant="ghost" size="lg" onClick={onPastGames}>
                {t('poker.mpPastGames')}
              </Button>
              <Button variant="primary" size="lg" onClick={onBack}>
                {t('poker.mpBackToPoker')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
