// Private multiplayer poker: phase machine owning the whole
// create → share → join → lobby → table → report → past-games flow.
// The server worker builds the matching endpoints in parallel; this file
// codes strictly to the documented API contract.
import { useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { CreateRoomForm, RoomCreatedShare } from './mp/CreateRoom.tsx';
import type { CreatedInfo } from './mp/CreateRoom.tsx';
import { JoinRoomFlow } from './mp/JoinRoom.tsx';
import { Lobby } from './mp/Lobby.tsx';
import { MpTable } from './mp/MpTable.tsx';
import { ReportScreen } from './mp/Report.tsx';
import { PastGames } from './mp/PastGames.tsx';
import { PokerRoomsApi } from '../logic/pokerRooms.ts';
import type {
  PokerReport,
  PokerRoomConfig,
  PokerRoomSummary,
  PokerTableState,
} from '../logic/pokerRooms.ts';
import type { PokerMpSession } from '../logic/pokerSession.ts';
import { savePokerSession } from '../logic/pokerSession.ts';
import './poker.css';

type Phase =
  | 'menu'
  | 'create'
  | 'created'
  | 'join'
  | 'lobby'
  | 'table'
  | 'report'
  | 'past';

export interface MultiplayerPokerProps {
  onExit: () => void;
  /** From the #/poker/join/:code invite link. */
  initialCode?: string;
}

function Menu({
  onCreate,
  onJoin,
  onPast,
  onExit,
}: {
  onCreate: () => void;
  onJoin: () => void;
  onPast: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="pk-wrap">
      <Card title={t('poker.mpMenuTitle')}>
        <div className="pk-setup pk-center-col">
          <p className="pk-hint pk-center-text">{t('poker.mpMenuSub')}</p>
          <Button variant="primary" size="lg" fullWidth onClick={onCreate}>
            {t('poker.mpCreate')}
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={onJoin}>
            {t('poker.mpJoin')}
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={onPast}>
            {t('poker.mpPastGames')}
          </Button>
          <Button variant="ghost" size="md" onClick={onExit}>
            {t('poker.mpBack')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function MultiplayerPoker({ onExit, initialCode }: MultiplayerPokerProps) {
  const [phase, setPhase] = useState<Phase>(initialCode ? 'join' : 'menu');
  const [session, setSession] = useState<PokerMpSession | null>(null);
  const [created, setCreated] = useState<CreatedInfo | null>(null);
  const [tableState, setTableState] = useState<PokerTableState | null>(null);
  const [report, setReport] = useState<{ report: PokerReport; saved: boolean } | null>(null);
  const [editInitial, setEditInitial] = useState<Partial<PokerRoomConfig> | null>(null);
  const [editingFrom, setEditingFrom] = useState<PokerMpSession | null>(null);

  function go(p: Phase): void {
    playSound('click');
    setPhase(p);
  }

  /** Host created a room: if this is an "Edit rules" recreate, close the
   *  old room first, then show the share screen for the new code. */
  async function handleCreated(info: CreatedInfo): Promise<void> {
    const old = editingFrom;
    setEditingFrom(null);
    setEditInitial(null);
    if (old) {
      try {
        // Host-only endpoint: needs the host token, not the player token.
        await PokerRoomsApi.closeRoom(old.code, old.hostToken ?? old.token);
      } catch {
        // old room stays closable by its guests; move on regardless
      }
    }
    // The host holds TWO tokens: playerToken for state/action calls and
    // hostToken for host-only endpoints (start/pause/remove/close).
    const s: PokerMpSession = {
      code: info.code,
      name: info.hostName,
      seat: info.seat,
      token: info.playerToken,
      isHost: true,
      hostToken: info.hostToken,
    };
    savePokerSession(s);
    setSession(s);
    setCreated(info);
    track('game_started', { game: 'poker', mode: 'multiplayer-host' });
    go('created');
  }

  function handleJoined(s: PokerMpSession): void {
    setSession(s);
    go('lobby');
  }

  function handleEditRules(summary: PokerRoomSummary): void {
    // No edit endpoint on the server: prefill the create form from the
    // public summary and recreate the room (new code) on confirm.
    setEditingFrom(session);
    setEditInitial({
      roomName: summary.roomName,
      hostName: summary.hostName,
      maxPlayers: summary.maxPlayers,
      startingStack: summary.startingStack,
      smallBlind: summary.blinds.small,
      bigBlind: summary.blinds.big,
      minBuyIn: summary.minBuyIn,
      maxBuyIn: summary.maxBuyIn,
      rebuyMin: summary.rebuyMin,
      rebuyMax: summary.rebuyMax,
      maxRebuys: summary.maxRebuys,
      rebuysMidHand: summary.rebuysMidHand,
      allowLateJoin: summary.allowLateJoin,
      houseRules: summary.houseRules,
    });
    go('create');
  }

  function handleRoomClosed(rep: PokerReport, saved: boolean): void {
    setReport({ report: rep, saved });
    setTableState(null);
    setPhase('report');
  }

  if (phase === 'menu') {
    return (
      <Menu
        onCreate={() => go('create')}
        onJoin={() => go('join')}
        onPast={() => go('past')}
        onExit={onExit}
      />
    );
  }
  if (phase === 'create') {
    return (
      <CreateRoomForm
        initial={editInitial}
        onCreated={(info) => void handleCreated(info)}
        onBack={() => go(editingFrom ? 'lobby' : 'menu')}
      />
    );
  }
  if (phase === 'created' && created) {
    return (
      <RoomCreatedShare
        info={created}
        onEnterLobby={() => go('lobby')}
      />
    );
  }
  if (phase === 'join') {
    return (
      <JoinRoomFlow
        initialCode={initialCode}
        onJoined={handleJoined}
        onBack={() => go('menu')}
      />
    );
  }
  if (phase === 'lobby' && session) {
    return (
      <Lobby
        session={session}
        onGameStart={(st) => {
          setTableState(st);
          go('table');
        }}
        onRoomClosed={handleRoomClosed}
        onLeave={() => {
          setSession(null);
          go('menu');
        }}
        onEditRules={handleEditRules}
      />
    );
  }
  if (phase === 'table' && session) {
    return (
      <MpTable
        session={session}
        initial={tableState}
        onRoomClosed={handleRoomClosed}
        onLeave={() => {
          setSession(null);
          setTableState(null);
          go('menu');
        }}
      />
    );
  }
  if (phase === 'report' && report) {
    return (
      <ReportScreen
        report={report.report}
        saved={report.saved}
        onBack={onExit}
        onPastGames={() => go('past')}
      />
    );
  }
  if (phase === 'past') {
    return (
      <PastGames
        onOpenReport={(rep, saved) => {
          setReport({ report: rep, saved });
          go('report');
        }}
        onBack={() => go(report ? 'report' : 'menu')}
      />
    );
  }
  // Defensive fallback — should never render.
  return (
    <Menu
      onCreate={() => go('create')}
      onJoin={() => go('join')}
      onPast={() => go('past')}
      onExit={onExit}
    />
  );
}
