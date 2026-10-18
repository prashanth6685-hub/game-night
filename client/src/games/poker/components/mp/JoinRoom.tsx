// Guest join flow: enter code → room card → display name (+password) →
// chip-selection screen → join → lobby. Buy-in is enforced against the
// room's [minBuyIn, maxBuyIn] range.
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../../i18n/index.ts';
import { Avatar, Button, Card, Spinner } from '../../../../shared/ui/index.ts';
import { playSound } from '../../../../shared/sound.ts';
import { track } from '../../../../shared/analytics.ts';
import { randomExampleName, examplePlaceholder } from '../../../../shared/names.ts';
import { PokerApiError, PokerRoomsApi, newIdem } from '../../logic/pokerRooms.ts';
import { goToResolvedRoom, resolveRoomCode } from '../../../../shared/rooms/resolveRoom.ts';
import type { PokerRoomSummary } from '../../logic/pokerRooms.ts';
import type { PokerMpSession } from '../../logic/pokerSession.ts';
import { savePokerSession } from '../../logic/pokerSession.ts';

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

type Step = 'code' | 'summary' | 'chips';

export interface JoinRoomProps {
  initialCode?: string;
  onJoined: (session: PokerMpSession) => void;
  onBack: () => void;
}

function buyInText(
  t: (k: string) => string,
  min: number,
  max: number,
): string {
  return max > 0
    ? fmt(t('poker.mpBuyInRange'), { min, max })
    : fmt(t('poker.mpBuyInFrom'), { min });
}

export function JoinRoomFlow({ initialCode, onJoined, onBack }: JoinRoomProps) {
  const { t } = useI18n();
  const namePh = useMemo(() => randomExampleName(), []);

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState(initialCode ?? '');
  const [summary, setSummary] = useState<PokerRoomSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [buyIn, setBuyIn] = useState(0);
  const [customBuyIn, setCustomBuyIn] = useState('');
  const [joining, setJoining] = useState(false);

  // Invite deep-link: code is prefilled, fetch the summary immediately.
  useEffect(() => {
    if (initialCode && initialCode.trim() !== '') {
      void fetchSummary(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSummary(rawCode: string): Promise<void> {
    const c = rawCode.trim().toUpperCase();
    if (c === '') {
      setError(t('poker.mpErrCode'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await PokerRoomsApi.getSummary(c);
      if (s.status === 'closed') {
        setError(t('poker.mpRoomClosed'));
        setLoading(false);
        return;
      }
      setSummary(s);
      setCode(c);
      // Default buy-in: clamp the starting stack into the room's range.
      const lo = s.minBuyIn;
      const hi = s.maxBuyIn > 0 ? s.maxBuyIn : Math.max(lo, 5000);
      setBuyIn(Math.min(hi, Math.max(lo, 1000)));
      setCustomBuyIn('');
      setStep('summary');
      playSound('click');
    } catch (e) {
      // Not a poker room? It may belong to another game — resolve the code
      // and send the player to that game's join screen instead of failing.
      const resolved = await resolveRoomCode(c);
      if (resolved && resolved.kind !== 'poker') {
        goToResolvedRoom(resolved);
        return;
      }
      setError(
        e instanceof PokerApiError && e.status === 410
          ? t('poker.mpRoomClosed')
          : t('poker.mpRoomNotFound'),
      );
    } finally {
      setLoading(false);
    }
  }

  function clampBuyIn(v: number): number {
    if (!summary) return v;
    const lo = summary.minBuyIn;
    const hi = summary.maxBuyIn > 0 ? summary.maxBuyIn : Number.MAX_SAFE_INTEGER;
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, Math.floor(v)));
  }

  const presets = useMemo(() => {
    if (!summary) return [];
    const lo = summary.minBuyIn;
    const hi = summary.maxBuyIn > 0 ? summary.maxBuyIn : lo * 10;
    const cands = [lo, Math.round((lo + hi) / 2), hi];
    return [...new Set(cands)].filter((v) => v >= lo && v <= hi);
  }, [summary]);

  async function join(): Promise<void> {
    if (!summary) return;
    if (name.trim() === '') {
      setError(t('poker.mpErrName'));
      return;
    }
    setError(null);
    setJoining(true);
    try {
      const res = await PokerRoomsApi.joinRoom(summary.code, {
        name: name.trim().slice(0, 20),
        password: summary.hasPassword ? password : undefined,
        buyIn: clampBuyIn(buyIn),
        idem: newIdem(),
      });
      const session: PokerMpSession = {
        code: summary.code,
        name: name.trim().slice(0, 20),
        seat: res.seat,
        token: res.playerToken,
        isHost: false,
      };
      savePokerSession(session);
      playSound('click');
      track('game_joined', { game: 'poker', mode: 'multiplayer' });
      onJoined(session);
    } catch (e) {
      if (e instanceof PokerApiError) {
        const msg = e.message;
        if (/password/i.test(msg)) setError(t('poker.mpWrongPassword'));
        else if (/room is full/i.test(msg)) setError(t('poker.mpRoomFull'));
        else if (/late join/i.test(msg)) setError(t('poker.mpLateJoinDenied'));
        else if (/already taken/i.test(msg)) setError(msg);
        else if (e.status === 410) setError(t('poker.mpRoomClosed'));
        else setError(t('poker.mpJoinFailed'));
      } else {
        setError(t('poker.mpJoinFailed'));
      }
    } finally {
      setJoining(false);
    }
  }

  if (step === 'code') {
    return (
      <div className="pk-wrap">
        <Card title={t('poker.mpJoinTitle')}>
          <div className="pk-setup">
            <div className="pk-field">
              <label className="pk-label" htmlFor="pkmp-code">
                {t('poker.mpCodeLabel')}
              </label>
              <input
                id="pkmp-code"
                type="text"
                value={code}
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={12}
                placeholder={t('poker.mpCodePh')}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void fetchSummary(code);
                }}
              />
            </div>
            {error && (
              <p className="pk-error" role="alert">
                {error}
              </p>
            )}
            <div className="pk-result-btns">
              <Button variant="ghost" size="lg" onClick={onBack}>
                {t('poker.mpBack')}
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={loading}
                onClick={() => void fetchSummary(code)}
              >
                {loading ? <Spinner /> : t('poker.mpFindRoom')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="pk-wrap">
        <Card title={t('poker.mpJoinTitle')}>
          <Spinner />
        </Card>
      </div>
    );
  }

  const rebuyRule =
    summary.maxRebuys < 0
      ? t('poker.mpRebuysUnlimited')
      : fmt(t('poker.mpRebuyRules'), {
          min: summary.rebuyMin,
          max: summary.rebuyMax,
          n: summary.maxRebuys,
        });

  return (
    <div className="pk-wrap">
      <Card title={summary.roomName}>
        <div className="pk-setup">
          {/* Room card */}
          <div className="pk-roomcard">
            <div className="pk-roomcard-row">
              <span className="pk-hint">{t('poker.mpHostedBy')}</span>
              <strong>
                👑 {summary.hostName}
              </strong>
            </div>
            <div className="pk-roomcard-row">
              <span className="pk-occupancy">
                {fmt(t('poker.mpOccupancy'), {
                  a: summary.playerCount,
                  b: summary.maxPlayers,
                })}
              </span>
              <span className="pk-hint">
                {fmt(t('poker.mpBlindsValue'), {
                  sb: summary.blinds.small,
                  bb: summary.blinds.big,
                })}
              </span>
            </div>
            <div className="pk-roomcard-row">
              <span className="pk-hint">{buyInText(t, summary.minBuyIn, summary.maxBuyIn)}</span>
              <span className="pk-hint">{rebuyRule}</span>
            </div>
            {summary.allowLateJoin && (
              <div className="pk-roomcard-row">
                <span className="pk-hint">✅ {t('poker.mpLateJoinOk')}</span>
              </div>
            )}
            {summary.houseRules && (
              <div className="pk-houserules">
                <div className="pk-label">{t('poker.mpHouseRules')}</div>
                <p>{summary.houseRules}</p>
              </div>
            )}
            {summary.players.length > 0 && (
              <div className="pk-lobby-list pk-lobby-list-compact">
                {summary.players.map((p) => (
                  <div key={p.seat} className="pk-player-row">
                    <Avatar name={p.name} size={30} />
                    <span className="pk-player-name">{p.name}</span>
                    {p.isHost && <span aria-label={t('poker.mpHost')}>👑</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {step === 'summary' && (
            <>
              <div className="pk-field">
                <label className="pk-label" htmlFor="pkmp-name">
                  {t('poker.mpYourName')}
                </label>
                <input
                  id="pkmp-name"
                  type="text"
                  value={name}
                  maxLength={20}
                  autoComplete="off"
                  placeholder={examplePlaceholder(namePh)}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {summary.hasPassword && (
                <div className="pk-field">
                  <label className="pk-label" htmlFor="pkmp-pass">
                    {t('poker.mpPasswordLabel')}
                  </label>
                  <input
                    id="pkmp-pass"
                    type="password"
                    value={password}
                    maxLength={40}
                    autoComplete="off"
                    placeholder={t('poker.mpPasswordNeeded')}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              {error && (
                <p className="pk-error" role="alert">
                  {error}
                </p>
              )}
              <div className="pk-result-btns">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setStep('code');
                    setSummary(null);
                    setError(null);
                  }}
                >
                  {t('poker.mpBack')}
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    if (name.trim() === '') {
                      setError(t('poker.mpErrName'));
                      return;
                    }
                    setError(null);
                    setStep('chips');
                    playSound('click');
                  }}
                >
                  {t('poker.mpContinue')}
                </Button>
              </div>
            </>
          )}

          {step === 'chips' && (
            <>
              <div className="pk-field">
                <span className="pk-label">{t('poker.mpChooseChips')}</span>
                <span className="pk-hint">
                  {buyInText(t, summary.minBuyIn, summary.maxBuyIn)}
                </span>
                <div className="pk-count-row" role="group" aria-label={t('poker.mpChooseChips')}>
                  {presets.map((p) => (
                    <Button
                      key={p}
                      variant={buyIn === p && customBuyIn === '' ? 'primary' : 'secondary'}
                      size="lg"
                      onClick={() => {
                        setBuyIn(p);
                        setCustomBuyIn('');
                        playSound('click');
                      }}
                    >
                      🪙 {p}
                    </Button>
                  ))}
                </div>
                <div className="pk-amount-row">
                  <input
                    type="number"
                    className="pk-number"
                    style={{ width: 140 }}
                    min={summary.minBuyIn}
                    max={summary.maxBuyIn > 0 ? summary.maxBuyIn : undefined}
                    aria-label={t('poker.mpCustomBuyIn')}
                    placeholder={t('poker.mpCustom')}
                    value={customBuyIn}
                    onChange={(e) => {
                      setCustomBuyIn(e.target.value);
                      const n = Math.floor(Number(e.target.value));
                      if (Number.isFinite(n)) setBuyIn(clampBuyIn(n));
                    }}
                  />
                </div>
                <div className="pk-buyin-selected" aria-live="polite">
                  {fmt(t('poker.mpSelectedAmount'), { n: clampBuyIn(buyIn) })}
                </div>
              </div>
              {error && (
                <p className="pk-error" role="alert">
                  {error}
                </p>
              )}
              <div className="pk-result-btns">
                <Button variant="ghost" size="lg" onClick={() => setStep('summary')} disabled={joining}>
                  {t('poker.mpBack')}
                </Button>
                <Button variant="primary" size="lg" onClick={() => void join()} disabled={joining}>
                  {joining ? <Spinner /> : t('poker.mpJoinRoomBtn')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
