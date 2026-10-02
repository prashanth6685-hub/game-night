import { useI18n } from '../../i18n/index.ts';

export interface GameHeaderProps {
  title: string;
  onBack: () => void;
  onRestart?: () => void;
}

export function GameHeader({ title, onBack, onRestart }: GameHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="ui-game-header">
      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-game-back" onClick={onBack} aria-label={t('common.back')}>
        ← {t('common.back')}
      </button>
      <h1 className="ui-game-title">{title}</h1>
      {onRestart ? (
        <button
          type="button"
          className="ui-btn ui-btn-ghost ui-btn-sm ui-game-restart"
          onClick={onRestart}
          aria-label={t('common.restart')}
        >
          ↻
        </button>
      ) : (
        <span className="ui-game-restart-spacer" aria-hidden="true" />
      )}
    </header>
  );
}
