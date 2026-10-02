// Waiting room shown on player phones after joining, until the host starts.
// Also used by the host's own phone if it lands here before starting.

import { useI18n } from '../../i18n/index.ts';
import { Button, Card, Spinner } from '../ui/index.ts';
import type { UseMpRoom } from './useMpRoom.ts';
import './mp.css';

export function MpWaitingRoom({
  room,
  onExit,
}: {
  room: UseMpRoom;
  onExit: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mp-wrap">
      <Card>
        <div className="mp-qr">
          <strong>{t('mp.waitingForHost')}</strong>
          <Spinner />
          <span className="mp-muted">
            {t('mp.roomCode')}: <strong>{room.session.code}</strong>
          </span>
        </div>
      </Card>
      <Card title={`${t('mp.players')} (${room.players.length})`}>
        <div className="mp-players">
          {room.players.map((p) => (
            <div className="mp-player" key={p.id}>
              <span>{p.seat === room.session.seat ? '⭐' : '👤'}</span>
              <span>
                {p.name}
                {p.seat === room.session.seat && (
                  <span className="mp-you"> ({t('mp.you')})</span>
                )}
              </span>
              {p.isHost && <em className="mp-host-badge">{t('mp.host')}</em>}
            </div>
          ))}
        </div>
      </Card>
      <Button variant="ghost" fullWidth onClick={onExit}>
        {t('mp.leave')}
      </Button>
    </div>
  );
}
