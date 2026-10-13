// Private room creation: full config form with client-side validation
// (mirroring the server rules), then the share screen with the big room
// code + invite link + copy buttons.
import { useMemo, useState } from 'react';
import { useI18n } from '../../../../i18n/index.ts';
import { Button, Card, Spinner, useToast } from '../../../../shared/ui/index.ts';
import { playSound } from '../../../../shared/sound.ts';
import { track } from '../../../../shared/analytics.ts';
import { randomExampleName } from '../../../../shared/names.ts';
import { PokerRoomsApi } from '../../logic/pokerRooms.ts';
import type {
  CreatedRoom,
  PokerRoomConfig,
  PokerRoomSummary,
} from '../../logic/pokerRooms.ts';
import { copyToClipboard, pokerJoinUrl } from '../../logic/share.ts';

export interface CreatedInfo {
  code: string;
  /** Host token — x-host-token header for start/pause/remove/close. */
  hostToken: string;
  /** Player token — x-poker-token header for state/action/rebuy. */
  playerToken: string;
  seat: number;
  summary: PokerRoomSummary;
  hostName: string;
}

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

const STACK_PRESETS = [500, 1000, 2000, 5000];

export interface CreateRoomProps {
  /** Prefill for the host "Edit rules" flow (recreate). */
  initial?: Partial<PokerRoomConfig> | null;
  onCreated: (info: CreatedInfo) => void;
  onBack: () => void;
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="pk-field">
      <span className="pk-label">{label}</span>
      <div className="pk-stepper" role="group" aria-label={label}>
        <Button
          variant="secondary"
          size="md"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          ariaLabel="−"
        >
          −
        </Button>
        <span className="pk-stepper-val" aria-live="polite">
          {value}
        </span>
        <Button
          variant="secondary"
          size="md"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          ariaLabel="+"
        >
          +
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="pk-toggle-row">
      <div>
        <div className="pk-label">{label}</div>
        {hint ? <div className="pk-hint">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`pk-switch${on ? ' on' : ''}`}
        onClick={() => onChange(!on)}
      >
        <span className="pk-switch-knob" />
      </button>
    </div>
  );
}

export function CreateRoomForm({ initial, onCreated, onBack }: CreateRoomProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const namePh = useMemo(() => randomExampleName(), []);

  const [roomName, setRoomName] = useState(initial?.roomName ?? '');
  const [hostName, setHostName] = useState(initial?.hostName ?? '');
  const [maxPlayers, setMaxPlayers] = useState(initial?.maxPlayers ?? 6);
  const [stack, setStack] = useState(initial?.startingStack ?? 1000);
  const [customStack, setCustomStack] = useState('');
  const [minBuyIn, setMinBuyIn] = useState(initial?.minBuyIn ?? 500);
  const [maxBuyIn, setMaxBuyIn] = useState(initial?.maxBuyIn ?? 0);
  const [smallBlind, setSmallBlind] = useState(initial?.smallBlind ?? 5);
  const [bigBlind, setBigBlind] = useState(initial?.bigBlind ?? 10);
  const [rebuyMin, setRebuyMin] = useState(initial?.rebuyMin ?? 500);
  const [rebuyMax, setRebuyMax] = useState(initial?.rebuyMax ?? 2000);
  const [maxRebuys, setMaxRebuys] = useState(initial?.maxRebuys ?? 3);
  const [unlimitedRebuys, setUnlimitedRebuys] = useState(
    (initial?.maxRebuys ?? 3) < 0,
  );
  const [rebuysMidHand, setRebuysMidHand] = useState(initial?.rebuysMidHand ?? false);
  const [allowLateJoin, setAllowLateJoin] = useState(initial?.allowLateJoin ?? true);
  const [openEnded, setOpenEnded] = useState((initial?.durationMin ?? 0) === 0);
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 120);
  const [password, setPassword] = useState('');
  const [houseRules, setHouseRules] = useState(initial?.houseRules ?? '');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function num(v: string, fallback: number): number {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : fallback;
  }

  function validate(): string | null {
    if (roomName.trim() === '') return t('poker.mpErrRoomName');
    if (hostName.trim() === '') return t('poker.mpErrHostName');
    if (smallBlind <= 0 || bigBlind <= 0) return t('poker.mpErrBlindsPositive');
    if (bigBlind <= smallBlind) return t('poker.mpErrBlindOrder');
    if (minBuyIn < smallBlind) return t('poker.mpErrBuyInBlind');
    if (maxBuyIn < 0) return t('poker.mpErrBuyInPositive');
    if (maxBuyIn > 0 && maxBuyIn < minBuyIn) return t('poker.mpErrBuyInOrder');
    if (rebuyMin <= 0 || rebuyMax <= 0) return t('poker.mpErrRebuyPositive');
    if (rebuyMax < rebuyMin) return t('poker.mpErrRebuyOrder');
    if (stack < 100) return t('poker.mpErrStackMin');
    if (stack < minBuyIn) return t('poker.mpErrStackBelowMin');
    if (maxBuyIn > 0 && stack > maxBuyIn) return t('poker.mpErrStackAboveMax');
    if (!openEnded && (durationMin <= 0 || durationMin > 1440))
      return t('poker.mpErrDuration');
    return null;
  }

  async function create(): Promise<void> {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setCreating(true);
    const cfg: PokerRoomConfig = {
      roomName: roomName.trim(),
      hostName: hostName.trim(),
      maxPlayers,
      startingStack: stack,
      minBuyIn,
      maxBuyIn,
      smallBlind,
      bigBlind,
      rebuyMin,
      rebuyMax,
      maxRebuys: unlimitedRebuys ? -1 : maxRebuys,
      rebuysMidHand,
      allowLateJoin,
      durationMin: openEnded ? 0 : durationMin,
      houseRules: houseRules.trim() === '' ? undefined : houseRules.trim(),
    };
    if (password.trim() !== '') cfg.password = password;
    try {
      const created: CreatedRoom = await PokerRoomsApi.createRoom(cfg);
      playSound('click');
      track('game_started', { game: 'poker', mode: 'multiplayer', maxPlayers });
      onCreated({
        code: created.code,
        hostToken: created.hostToken,
        playerToken: created.playerToken,
        seat: created.seat,
        summary: created.summary,
        hostName: cfg.hostName,
      });
    } catch {
      setError(t('poker.mpCreateFailed'));
    } finally {
      setCreating(false);
    }
  }

  const stackCustomActive =
    customStack !== '' && !STACK_PRESETS.includes(stack);

  return (
    <div className="pk-wrap">
      <Card title={t('poker.mpCreateTitle')}>
        <div className="pk-setup">
          <div className="pk-field">
            <label className="pk-label" htmlFor="pkmp-room">
              {t('poker.mpRoomName')}
            </label>
            <input
              id="pkmp-room"
              type="text"
              value={roomName}
              maxLength={40}
              autoComplete="off"
              placeholder={t('poker.mpRoomNamePh')}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
          <div className="pk-field">
            <label className="pk-label" htmlFor="pkmp-host">
              {t('poker.mpHostName')}
            </label>
            <input
              id="pkmp-host"
              type="text"
              value={hostName}
              maxLength={20}
              autoComplete="off"
              placeholder={namePh}
              onChange={(e) => setHostName(e.target.value)}
            />
          </div>

          <Stepper
            label={t('poker.mpMaxPlayers')}
            value={maxPlayers}
            min={2}
            max={8}
            onChange={setMaxPlayers}
          />

          <div className="pk-field">
            <span className="pk-label">{t('poker.mpStartingStack')}</span>
            <div className="pk-count-row" role="group" aria-label={t('poker.mpStartingStack')}>
              {STACK_PRESETS.map((s) => (
                <Button
                  key={s}
                  variant={stack === s && !stackCustomActive ? 'primary' : 'secondary'}
                  size="md"
                  onClick={() => {
                    setStack(s);
                    setCustomStack('');
                  }}
                >
                  {s}
                </Button>
              ))}
              <input
                type="number"
                className="pk-number"
                min={1}
                aria-label={t('poker.mpCustomStack')}
                placeholder={t('poker.mpCustom')}
                value={customStack}
                onChange={(e) => {
                  setCustomStack(e.target.value);
                  const n = num(e.target.value, 0);
                  if (n > 0) setStack(n);
                }}
              />
            </div>
          </div>

          <div className="pk-form-row2">
            <div className="pk-field">
              <label className="pk-label" htmlFor="pkmp-minbuy">
                {t('poker.mpMinBuyIn')}
              </label>
              <input
                id="pkmp-minbuy"
                type="number"
                className="pk-number"
                min={0}
                value={minBuyIn}
                onChange={(e) => setMinBuyIn(num(e.target.value, 0))}
              />
            </div>
            <div className="pk-field">
              <label className="pk-label" htmlFor="pkmp-maxbuy">
                {t('poker.mpMaxBuyIn')}
              </label>
              <input
                id="pkmp-maxbuy"
                type="number"
                className="pk-number"
                min={0}
                value={maxBuyIn}
                onChange={(e) => setMaxBuyIn(num(e.target.value, 0))}
              />
              <span className="pk-hint">{t('poker.mpMaxBuyInHint')}</span>
            </div>
          </div>

          <div className="pk-form-row2">
            <div className="pk-field">
              <label className="pk-label" htmlFor="pkmp-sb">
                {t('poker.mpSmallBlind')}
              </label>
              <input
                id="pkmp-sb"
                type="number"
                className="pk-number"
                min={1}
                value={smallBlind}
                onChange={(e) => setSmallBlind(num(e.target.value, 1))}
              />
            </div>
            <div className="pk-field">
              <label className="pk-label" htmlFor="pkmp-bb">
                {t('poker.mpBigBlind')}
              </label>
              <input
                id="pkmp-bb"
                type="number"
                className="pk-number"
                min={1}
                value={bigBlind}
                onChange={(e) => setBigBlind(num(e.target.value, 1))}
              />
            </div>
          </div>

          <div className="pk-form-row2">
            <div className="pk-field">
              <label className="pk-label" htmlFor="pkmp-rmin">
                {t('poker.mpRebuyMin')}
              </label>
              <input
                id="pkmp-rmin"
                type="number"
                className="pk-number"
                min={1}
                value={rebuyMin}
                onChange={(e) => setRebuyMin(num(e.target.value, 1))}
              />
            </div>
            <div className="pk-field">
              <label className="pk-label" htmlFor="pkmp-rmax">
                {t('poker.mpRebuyMax')}
              </label>
              <input
                id="pkmp-rmax"
                type="number"
                className="pk-number"
                min={1}
                value={rebuyMax}
                onChange={(e) => setRebuyMax(num(e.target.value, 1))}
              />
            </div>
          </div>

          <div className="pk-field">
            <span className="pk-label">{t('poker.mpMaxRebuys')}</span>
            <div className="pk-count-row">
              <div className="pk-stepper" role="group" aria-label={t('poker.mpMaxRebuys')}>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={unlimitedRebuys || maxRebuys <= 0}
                  onClick={() => setMaxRebuys(maxRebuys - 1)}
                  ariaLabel="−"
                >
                  −
                </Button>
                <span className="pk-stepper-val">
                  {unlimitedRebuys ? t('poker.mpUnlimited') : maxRebuys}
                </span>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={unlimitedRebuys}
                  onClick={() => setMaxRebuys(maxRebuys + 1)}
                  ariaLabel="+"
                >
                  +
                </Button>
              </div>
              <Button
                variant={unlimitedRebuys ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setUnlimitedRebuys(!unlimitedRebuys)}
              >
                {t('poker.mpUnlimited')}
              </Button>
            </div>
          </div>

          <ToggleRow
            label={t('poker.mpRebuysMidHand')}
            hint={t('poker.mpRebuysMidHandHint')}
            on={rebuysMidHand}
            onChange={setRebuysMidHand}
          />
          <ToggleRow
            label={t('poker.mpAllowLateJoin')}
            hint={t('poker.mpAllowLateJoinHint')}
            on={allowLateJoin}
            onChange={setAllowLateJoin}
          />

          <div className="pk-field">
            <span className="pk-label">{t('poker.mpDuration')}</span>
            <div className="pk-count-row">
              <Button
                variant={openEnded ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setOpenEnded(true)}
              >
                {t('poker.mpOpenEnded')}
              </Button>
              <input
                type="number"
                className="pk-number"
                min={1}
                disabled={openEnded}
                aria-label={t('poker.mpDurationMin')}
                value={durationMin}
                onChange={(e) => {
                  setDurationMin(num(e.target.value, 1));
                  setOpenEnded(false);
                }}
              />
              {!openEnded && <span className="pk-hint">{t('poker.mpMinutes')}</span>}
            </div>
          </div>

          <div className="pk-field">
            <label className="pk-label" htmlFor="pkmp-pass">
              {t('poker.mpPassword')}
            </label>
            <input
              id="pkmp-pass"
              type="password"
              value={password}
              maxLength={40}
              autoComplete="new-password"
              placeholder={t('poker.mpPasswordHint')}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pk-field">
            <label className="pk-label" htmlFor="pkmp-rules">
              {t('poker.mpHouseRules')}
            </label>
            <textarea
              id="pkmp-rules"
              className="pk-textarea"
              rows={3}
              maxLength={500}
              value={houseRules}
              placeholder={t('poker.mpHouseRulesPh')}
              onChange={(e) => setHouseRules(e.target.value)}
            />
          </div>

          {error && (
            <p className="pk-error" role="alert">
              {error}
            </p>
          )}

          <div className="pk-result-btns">
            <Button variant="ghost" size="lg" onClick={onBack} disabled={creating}>
              {t('poker.mpBack')}
            </Button>
            <Button variant="primary" size="lg" onClick={create} disabled={creating}>
              {creating ? <Spinner /> : t('poker.mpCreateRoomBtn')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Share screen shown right after creation: big code + invite link + copy. */
export function RoomCreatedShare({
  info,
  onEnterLobby,
}: {
  info: CreatedInfo;
  onEnterLobby: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const link = pokerJoinUrl(info.code);

  async function copy(text: string): Promise<void> {
    const ok = await copyToClipboard(text);
    toast(ok ? t('poker.mpCopied') : t('poker.mpCopyFailed'), ok ? 'success' : 'error');
    if (ok) playSound('click');
  }

  return (
    <div className="pk-wrap">
      <Card title={t('poker.mpRoomCreated')}>
        <div className="pk-setup pk-center-col">
          <p className="pk-hint">{t('poker.mpShareHint')}</p>
          <div className="pk-code-label">{t('poker.mpYourCode')}</div>
          <div className="pk-code-big" aria-live="polite">
            {info.code}
          </div>
          <div className="pk-result-btns">
            <Button variant="secondary" size="md" onClick={() => void copy(info.code)}>
              {t('poker.mpCopyCode')}
            </Button>
          </div>
          <div className="pk-field" style={{ width: '100%' }}>
            <span className="pk-label">{t('poker.mpInviteLink')}</span>
            <div className="pk-invite-row">
              <span className="pk-invite-link">{link}</span>
              <Button variant="secondary" size="md" onClick={() => void copy(link)}>
                {t('poker.mpCopyLink')}
              </Button>
            </div>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={onEnterLobby}>
            {t('poker.mpEnterLobby')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
