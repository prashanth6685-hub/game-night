import { useI18n } from '../../i18n/index.ts';

export function Spinner() {
  const { t } = useI18n();
  return <span className="ui-spinner" role="status" aria-label={t('common.loading')} />;
}
