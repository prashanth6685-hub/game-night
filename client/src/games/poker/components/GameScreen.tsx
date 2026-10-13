// Poker Practice Mode — Texas Hold'em vs bots.
// Setup phase (name, bot count, stack) then play phase (table + action
// panel). All poker rules live in shared/poker/engine.ts; this file is UI only.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import {
  Button,
  Card,
  ConfirmDialog,
  GameHeader,
  Modal,
  Spinner,
  useToast,
} from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { randomExampleName, randomExampleNames } from '../../../shared/names.ts';
import {
  applyAction,
  createTable,
  legalActions,
  potTotal,
  rebuy,
  startHand,
} from '../../../../../shared/poker/engine.ts';
import type {
  LegalAction,
  PokerAction,
  PokerEvent,
  PokerState,
  PotResult,
} from '../../../../../shared/poker/engine.ts';
import { chooseBotAction } from '../logic/bots.ts';
import type { BotPersonality } from '../logic/bots.ts';
import { cardName } from '../../../../../shared/poker/cards.ts';
import { PokerTable } from './PokerTable.tsx';
import { ActionPanel } from './ActionPanel.tsx';
import './poker.css';

type Phase = 'setup' | 'play';

const SMALL_BLIND = 5;
const BIG_BLIND = 10;
const STACKS = [500, 1000, 2000];
const BOT_COUNTS = [2, 3, 4, 5, 6, 7];
const PERSONALITIES: readonly BotPersonality[] = [
  'conservative',
  'aggressive',
  'balanced',
  'beginner',
];
const MultiplayerPoker = lazy(() => import('./MultiplayerPoker.tsx'));

const RANK_ORDER = [
  'royal-flush',
  'straight-flush',
  'four-of-a-kind',
  'full-house',
  'flush',
  'straight',
  'three-of-a-kind',
  'two-pair',
  'one-pair',
  'high-card',
];

/** Fill {placeholders} in a translated template (i18n has no interpolation). */
function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export default function GameScreen({ onFinish, onExit }: GameScreenProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  // ---- setup state ----
  const [phase, setPhase] = useState<Phase>('setup');
  const [friendsMode, setFriendsMode] = useState(false);
  const [name, setName] = useState('');
  const [botCount, setBotCount] = useState(3);
  const [stack, setStack] = useState(1000);
  const namePh = useMemo(() => randomExampleName(), []);
  const botPreview = useMemo(() => randomExampleNames(botCount), [botCount]);
  const [onboard, setOnboard] = useState<boolean>(() => {
    try {
      return localStorage.getItem('poker-onboarded') !== '1';
    } catch {
      return true;
    }
  });

  // ---- table state ----
  const [table, setTable] = useState<PokerState | null>(null);
  const [events, setEvents] = useState<PokerEvent[]>([]);
  const [sbSeat, setSbSeat] = useState<number | null>(null);
  const [bbSeat, setBbSeat] = useState<number | null>(null);
  const [stats, setStats] = useState({ hands: 0, biggestPot: 0 });

  // ---- ui state ----
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showRanks, setShowRanks] = useState(false);
  const [askRebuy, setAskRebuy] = useState(false);

  // Refs mirror latest values for the bot-turn timeout callback.
  const tableRef = useRef<PokerState | null>(null);
  tableRef.current = table;
  const personalitiesRef = useRef<BotPersonality[]>([]);
  const afterRef = useRef<(s: PokerState, e: PokerEvent[]) => void>(() => {});
  /** Guards against the same bot acting twice for one turn. */
  const actedRef = useRef('');

  // ---- derived (all null-safe; hooks stay above every return) ----
  const human = table?.players[0];
  const actorSeat = table?.actorSeat ?? -1;
  const actor = actorSeat >= 0 ? table?.players[actorSeat] : undefined;
  const street = table?.street;
  const complete = street === 'complete';
  const isBotTurn = !!table && !complete && !!actor && actor.isBot;
  const thinkingSeat = isBotTurn ? actorSeat : null;
  const humanLegal: LegalAction[] =
    table && !complete && actorSeat === 0 ? legalActions(table, 0) : [];
  const pot = table ? potTotal(table) : 0;
  const humanOut = !!human?.eliminated;

  function rankName(handName: string): string {
    return handName === 'fold' ? t('poker.action_fold') : t(`poker.rankNames.${handName}`);
  }

  function nameOf(seat: number): string {
    return table?.players[seat]?.name ?? `${t('poker.player')} ${seat + 1}`;
  }

  function afterEvents(next: PokerState, evs: PokerEvent[]): void {
    setTable(next);
    setEvents((prev) => [...prev, ...evs]);
    for (const e of evs) {
      if (e.kind === 'deal') playSound('pop');
      else if (e.kind === 'action') playSound(e.action.type === 'fold' ? 'skip' : 'move');
    }
    if (next.street === 'complete') {
      let big = 0;
      for (const w of next.winners) big = Math.max(big, w.amount);
      const humanWon = next.winners.some((w) => w.winnerSeats.includes(0));
      setStats((prev) => ({
        hands: prev.hands + 1,
        biggestPot: Math.max(prev.biggestPot, big),
      }));
      if (humanWon) playSound('win');
    }
  }
  afterRef.current = afterEvents;

  function dealFrom(s: PokerState): void {
    const res = startHand(s);
    if (!res.ok) {
      toast(t('poker.needPlayers'), 'error');
      return;
    }
    let sb: number | null = null;
    let bb: number | null = null;
    for (const e of res.events) {
      if (e.kind === 'blind') {
        if (e.blind === 'small') sb = e.seat;
        else bb = e.seat;
      }
    }
    setSbSeat(sb);
    setBbSeat(bb);
    actedRef.current = '';
    afterRef.current(res.state, res.events);
  }

  function startTable(): void {
    const raw = name.trim();
    const humanName = raw === '' ? `${t('poker.player')} 1` : raw;
    const botNames = randomExampleNames(botCount);
    const names = [humanName, ...botNames];
    const pers = botNames.map(
      (_, i) => PERSONALITIES[i % PERSONALITIES.length] ?? 'balanced',
    );
    personalitiesRef.current = pers;
    const fresh = createTable({
      names,
      isBot: names.map((_, i) => i !== 0),
      startingStack: stack,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
    });
    setStats({ hands: 0, biggestPot: 0 });
    setPhase('play');
    track('game_started', { game: 'poker', players: botCount + 1 });
    playSound('click');
    dealFrom(fresh);
  }

  function doHumanAction(a: PokerAction): void {
    const s = tableRef.current;
    if (!s || s.actorSeat !== 0) {
      toast(t('poker.notYourTurn'), 'error');
      return;
    }
    const res = applyAction(s, 0, a);
    if (!res.ok) {
      toast(fmt(t('poker.actionFailed'), { error: res.error }), 'error');
      return;
    }
    afterRef.current(res.state, res.events);
  }

  function nextHand(): void {
    const s = tableRef.current;
    if (!s) return;
    if (s.players[0]?.eliminated) {
      setAskRebuy(true);
      return;
    }
    playSound('click');
    dealFrom(s);
  }

  function confirmRebuy(): void {
    const s = tableRef.current;
    setAskRebuy(false);
    if (!s) return;
    const res = rebuy(s, 0, stack);
    if (!res.ok) {
      toast(fmt(t('poker.actionFailed'), { error: res.error }), 'error');
      return;
    }
    playSound('click');
    dealFrom(res.state);
  }

  function endSession(): void {
    const s = tableRef.current;
    track('game_completed', { game: 'poker', hands: stats.hands });
    onFinish({
      title: t('poker.sessionDone'),
      lines: [
        { label: t('poker.handsPlayed'), value: String(stats.hands) },
        { label: t('poker.biggestPot'), value: String(stats.biggestPot) },
        { label: t('poker.yourChips'), value: String(s?.players[0]?.chips ?? 0) },
      ],
    });
  }

  function restartTable(): void {
    setConfirmRestart(false);
    actedRef.current = '';
    setTable(null);
    setEvents([]);
    setSbSeat(null);
    setBbSeat(null);
    setAskRebuy(false);
    setPhase('setup');
    playSound('click');
  }

  // Bot turns: when the actor is a bot, wait a beat (with a "thinking"
  // indicator on the table), then choose + apply its action. The guard is
  // set inside the timeout so React StrictMode's double-effect in dev can't
  // wedge the bot; the tableRef re-check drops any stale firing.
  useEffect(() => {
    if (!isBotTurn || !table) return;
    const key = `${table.handNumber}:${table.actorSeat}:${table.street}`;
    const id = window.setTimeout(
      () => {
        if (actedRef.current === key) return;
        const s = tableRef.current;
        if (!s) return;
        const p = s.players[s.actorSeat];
        if (!p || !p.isBot || s.street === 'complete' || s.street === 'showdown') return;
        actedRef.current = key;
        const personality = personalitiesRef.current[s.actorSeat - 1] ?? 'balanced';
        const action = chooseBotAction(s, s.actorSeat, personality);
        const res = applyAction(s, s.actorSeat, action);
        if (!res.ok) {
          actedRef.current = '';
          toast(fmt(t('poker.actionFailed'), { error: res.error }), 'error');
          return;
        }
        afterRef.current(res.state, res.events);
      },
      800 + Math.random() * 600,
    );
    return () => window.clearTimeout(id);
  }, [isBotTurn, table, toast]);

  // ---- hand history text ----
  function eventText(ev: PokerEvent): ReactNode[] {
    const out: ReactNode[] = [];
    switch (ev.kind) {
      case 'blind':
        out.push(
          fmt(t('poker.histBlind'), {
            name: nameOf(ev.seat),
            blind: t(ev.blind === 'small' ? 'poker.smallBlind' : 'poker.bigBlind'),
            amount: ev.amount,
          }),
        );
        break;
      case 'deal':
        out.push(t('poker.histDeal'));
        break;
      case 'action': {
        const nm = nameOf(ev.seat);
        switch (ev.action.type) {
          case 'fold':
            out.push(fmt(t('poker.histFold'), { name: nm }));
            break;
          case 'check':
            out.push(fmt(t('poker.histCheck'), { name: nm }));
            break;
          case 'call':
            out.push(fmt(t('poker.histCall'), { name: nm, amount: ev.chips }));
            break;
          case 'bet':
            out.push(fmt(t('poker.histBet'), { name: nm, amount: ev.chips }));
            break;
          case 'raise':
            out.push(fmt(t('poker.histRaise'), { name: nm, amount: ev.action.amount }));
            break;
          case 'all-in':
            out.push(fmt(t('poker.histAllin'), { name: nm, amount: ev.chips }));
            break;
        }
        break;
      }
      case 'street':
        out.push(fmt(t('poker.histStreet'), { street: t(`poker.street_${ev.street}`) }));
        break;
      case 'showdown':
        for (const p of ev.players) {
          out.push(
            fmt(t('poker.histShowdown'), {
              name: p.name,
              cards: p.hole.map(cardName).join(' '),
              hand: rankName(p.handName),
            }),
          );
        }
        break;
      case 'pot': {
        const r: PotResult = ev.result;
        const names = r.winnerSeats.map(nameOf).join(', ');
        out.push(
          fmt(t('poker.histPot'), {
            names,
            s: r.winnerSeats.length > 1 ? '' : 's',
            amount: r.amount,
            hand: rankName(r.handName),
          }),
        );
        break;
      }
      case 'hand-end':
        out.push(t('poker.histHandEnd'));
        break;
      case 'eliminated':
        out.push(fmt(t('poker.eliminatedMsg'), { name: nameOf(ev.seat) }));
        break;
    }
    return out;
  }

  function potLine(w: PotResult): string {
    const names = w.winnerSeats.map(nameOf).join(', ');
    const humanWon = w.winnerSeats.includes(0);
    if (w.handName === 'fold') {
      return fmt(t(humanWon ? 'poker.youWinUncontested' : 'poker.winsUncontested'), {
        name: names,
        amount: w.amount,
      });
    }
    return fmt(t(humanWon ? 'poker.youWinPot' : 'poker.winsPot'), {
      name: names,
      amount: w.amount,
      hand: rankName(w.handName),
    });
  }

  function closeOnboard(): void {
    try {
      localStorage.setItem('poker-onboarded', '1');
    } catch {
      // ignore
    }
    setOnboard(false);
  }

  const rulesBody = (
    <div className="pk-rules">
      <p>{t('poker.rules1')}</p>
      <p>{t('poker.rules2')}</p>
      <p>{t('poker.rules3')}</p>
      <p>{fmt(t('poker.rules4'), { bb: BIG_BLIND })}</p>
      <p>{t('poker.rules5')}</p>
      <Button
        variant="secondary"
        size="md"
        fullWidth
        onClick={() => {
          setShowRules(false);
          setShowRanks(true);
        }}
      >
        {t('poker.ranksTitle')}
      </Button>
    </div>
  );

  const ranksBody = (
    <ul className="pk-ranks">
      {RANK_ORDER.map((r) => (
        <li key={r} className="pk-rank">
          <div className="pk-rank-head">
            <strong>{t(`poker.rankNames.${r}`)}</strong>
            <span className="pk-rank-example">{t(`poker.rankExample.${r}`)}</span>
          </div>
          <p>{t(`poker.rankDesc.${r}`)}</p>
        </li>
      ))}
    </ul>
  );

  // ---- friends (private multiplayer) mode ----
  // Rendered instead of practice setup/play; practice state is untouched.
  if (friendsMode) {
    return (
      <div className="pk-wrap">
        <Suspense fallback={<Spinner />}>
          <MultiplayerPoker onExit={() => setFriendsMode(false)} />
        </Suspense>
      </div>
    );
  }

  // ---- setup phase ----
  if (phase === 'setup' || !table) {
    return (
      <div className="pk-wrap">
        <Card title={t('poker.setupTitle')}>
          <div className="pk-setup">
            <div className="pk-field">
              <label className="pk-label" htmlFor="pk-name">
                {t('poker.yourName')}
              </label>
              <input
                id="pk-name"
                value={name}
                placeholder={namePh}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="pk-field">
              <span className="pk-label">{t('poker.botCount')}</span>
              <div className="pk-count-row" role="group" aria-label={t('poker.botCount')}>
                {BOT_COUNTS.map((n) => (
                  <Button
                    key={n}
                    variant={botCount === n ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => setBotCount(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <span className="pk-hint">{fmt(t('poker.totalPlayers'), { n: botCount + 1 })}</span>
              <div className="pk-bots">
                {botPreview.map((b) => (
                  <span key={b} className="pk-chip">
                    🤖 {b}
                  </span>
                ))}
              </div>
            </div>
            <div className="pk-field">
              <span className="pk-label">{t('poker.startingStack')}</span>
              <div className="pk-count-row" role="group" aria-label={t('poker.startingStack')}>
                {STACKS.map((s) => (
                  <Button
                    key={s}
                    variant={stack === s ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => setStack(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="pk-field">
              <span className="pk-label">{t('poker.blinds')}</span>
              <span className="pk-hint">
                {fmt(t('poker.blindsValue'), { sb: SMALL_BLIND, bb: BIG_BLIND })}
              </span>
            </div>
            <div className="pk-count-row">
              <Button variant="secondary" size="md" onClick={() => setShowRules(true)}>
                {t('poker.howToPlay')}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setShowRanks(true)}>
                {t('poker.ranksTitle')}
              </Button>
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={startTable}>
              {t('poker.startGame')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => {
                playSound('click');
                setFriendsMode(true);
              }}
            >
              {t('poker.mpPlayWithFriends')}
            </Button>
          </div>
        </Card>

        <Modal open={onboard} onClose={closeOnboard} title={t('poker.onboardTitle')}>
          <div className="pk-rules">
            <p>{t('poker.onboard1')}</p>
            <p>{t('poker.onboard2')}</p>
            <p>{fmt(t('poker.onboard3'), { sb: SMALL_BLIND, bb: BIG_BLIND })}</p>
            <Button variant="primary" size="lg" fullWidth onClick={closeOnboard}>
              {t('poker.gotIt')}
            </Button>
          </div>
        </Modal>
        <Modal open={showRules} onClose={() => setShowRules(false)} title={t('poker.rulesTitle')}>
          {rulesBody}
        </Modal>
        <Modal open={showRanks} onClose={() => setShowRanks(false)} title={t('poker.ranksTitle')}>
          <p className="pk-hint">{t('poker.ranksSubtitle')}</p>
          {ranksBody}
        </Modal>
      </div>
    );
  }

  // ---- play phase ----
  const callLegal = humanLegal.find((a) => a.type === 'call');
  let turnText = '';
  if (complete) {
    turnText = fmt(t('poker.handComplete'), { n: table.handNumber });
  } else if (isBotTurn && actor) {
    turnText = fmt(t('poker.botThinking'), { name: actor.name });
  } else if (actorSeat === 0 && actor) {
    turnText = callLegal
      ? fmt(t('poker.yourTurnCall'), { name: actor.name, amount: callLegal.amount })
      : fmt(t('poker.yourTurnFree'), { name: actor.name });
  }
  const turnSub =
    street && street !== 'complete'
      ? `${fmt(t('poker.handNumber'), { n: table.handNumber })} · ${t(`poker.street_${street}`)}`
      : fmt(t('poker.handNumber'), { n: table.handNumber });

  return (
    <div className="pk-wrap">
      <GameHeader
        title={t('poker.playTitle')}
        onBack={onExit}
        onRestart={() => setConfirmRestart(true)}
      />

      <div className="pk-turn" aria-live="polite">
        <div className="pk-turn-main">{turnText}</div>
        <div className="pk-turn-sub">{turnSub}</div>
      </div>

      <PokerTable
        state={table}
        sbSeat={sbSeat}
        bbSeat={bbSeat}
        thinkingSeat={thinkingSeat}
        rankName={rankName}
      />

      {complete ? (
        <Card title={fmt(t('poker.handComplete'), { n: table.handNumber })}>
          <ul className="pk-result-list">
            {table.winners.map((w) => (
              <li key={w.potIndex}>{potLine(w)}</li>
            ))}
          </ul>
          <div className="pk-result-btns">
            <Button variant="primary" size="lg" onClick={nextHand}>
              {t('poker.nextHand')}
            </Button>
            <Button variant="secondary" size="lg" onClick={endSession}>
              {t('poker.endSession')}
            </Button>
            <Button variant="ghost" size="lg" onClick={onExit}>
              {t('poker.leaveTable')}
            </Button>
          </div>
          {humanOut && (
            <p className="pk-hint">{fmt(t('poker.eliminatedMsg'), { name: human?.name ?? '' })}</p>
          )}
        </Card>
      ) : actorSeat === 0 ? (
        <ActionPanel legal={humanLegal} onAction={doHumanAction} pot={pot} />
      ) : null}

      <details className="pk-history">
        <summary>{t('poker.history')}</summary>
        <ul>
          {events.map((ev, i) =>
            eventText(ev).map((line, j) => <li key={`${i}-${j}`}>{line}</li>),
          )}
        </ul>
      </details>

      <div className="pk-count-row">
        <Button variant="ghost" size="sm" onClick={() => setShowRules(true)}>
          {t('poker.showRules')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowRanks(true)}>
          {t('poker.showGuide')}
        </Button>
      </div>

      <Modal open={showRules} onClose={() => setShowRules(false)} title={t('poker.rulesTitle')}>
        {rulesBody}
      </Modal>
      <Modal open={showRanks} onClose={() => setShowRanks(false)} title={t('poker.ranksTitle')}>
        <p className="pk-hint">{t('poker.ranksSubtitle')}</p>
        {ranksBody}
      </Modal>
      <ConfirmDialog
        open={confirmRestart}
        title={t('poker.restartTitle')}
        message={t('poker.restartMessage')}
        confirmLabel={t('poker.restartConfirm')}
        cancelLabel={t('poker.cancel')}
        onConfirm={restartTable}
        onCancel={() => setConfirmRestart(false)}
        danger
      />
      <Modal open={askRebuy} onClose={() => setAskRebuy(false)} title={t('poker.rebuyTitle')}>
        <p className="pk-hint">{fmt(t('poker.rebuyMessage'), { amount: stack })}</p>
        <div className="pk-result-btns">
          <Button variant="primary" size="lg" onClick={confirmRebuy}>
            {fmt(t('poker.rebuyConfirm'), { amount: stack })}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setAskRebuy(false)}>
            {t('poker.cancel')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
