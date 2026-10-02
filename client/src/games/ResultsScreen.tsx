// Shared results screen — every game ends here via onFinish(result).
// Buttons: Play Again / Choose Another Game / Home. Ads allowed (postgame).
import { useI18n } from '../i18n/index.ts';
import { Button, Card, Scoreboard } from '../shared/ui/index.ts';
import { AdSlot } from '../shared/ads/Ads.tsx';
import type { GameResult } from './types.ts';

export function ResultsScreen({
  result,
  onPlayAgain,
  onChooseAnother,
  onHome,
}: {
  result: GameResult;
  onPlayAgain: () => void;
  onChooseAnother: () => void;
  onHome: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="gh-grid">
      <div className="gh-center gh-mt">
        <div style={{ fontSize: '4rem' }} aria-hidden>
          🏆
        </div>
        <h1 className="gh-page-title">{result.title || t('results.title')}</h1>
        {result.winner && <p className="gh-page-sub">👑 {result.winner}</p>}
      </div>
      {result.lines.length > 0 && (
        <Card>
          <Scoreboard
            entries={result.lines.map((l) => ({ name: l.label, score: l.value }))}
          />
        </Card>
      )}
      <div className="gh-grid">
        <Button variant="primary" fullWidth onClick={onPlayAgain}>
          {t('common.playAgain')}
        </Button>
        <Button variant="secondary" fullWidth onClick={onChooseAnother}>
          {t('common.chooseAnother')}
        </Button>
        <Button variant="ghost" fullWidth onClick={onHome}>
          {t('common.home')}
        </Button>
      </div>
      <AdSlot placement="postgame" />
    </div>
  );
}
