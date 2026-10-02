import { useI18n } from '../../i18n/index.ts';
import { Button } from './Button.tsx';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { t } = useI18n();
  return (
    <div className="ui-error" role="alert">
      <p className="ui-error-text">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
