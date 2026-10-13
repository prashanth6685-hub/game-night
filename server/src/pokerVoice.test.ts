// Tests for poker voice chat (WebRTC audio-only mesh; server relays signaling).
// Run: node --test server/src/pokerVoice.test.ts (from repo root)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import {
  broadcastPokerVoiceState,
  clearPokerRooms,
  closePokerRoom,
  createPokerRoom,
  joinPokerRoom,
  joinPokerVoice,
  leavePokerVoice,
  playerBySeat,
  pokerStateHandler,
  pokerVoiceJoinHandler,
  pokerVoiceLeaveHandler,
  pokerVoiceSignalHandler,
  pokerVoiceStatusHandler,
  publicTableState,
  publicVoiceState,
  releasePokerVoiceOnDisconnect,
  sendPokerToSeat,
  setPokerVoiceStatus,
  signalPokerVoice,
  type PokerClient,
  type PokerRoom,
} from './pokerRooms.ts';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function fakeReq(opts: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}): Request {
  return {
    params: opts.params ?? {},
    query: opts.query ?? {},
    headers: opts.headers ?? {},
    body: opts.body ?? {},
    ip: '127.0.0.1',
    on: () => {},
  } as unknown as Request;
}

interface Captured {
  status: number;
  body: unknown;
}

function fakeRes(): { res: Response; cap: Captured } {
  const cap: Captured = { status: 200, body: undefined };
  const res = {
    status(code: number) {
      cap.status = code;
      return res;
    },
    json(obj: unknown) {
      cap.body = obj;
      return res;
    },
  } as unknown as Response;
  return { res, cap };
}

function fakeClient(
  seat: number | undefined,
  isHost: boolean,
): { client: PokerClient; chunks: string[] } {
  const chunks: string[] = [];
  const client: PokerClient = {
    write: (chunk: string) => {
      chunks.push(chunk);
    },
    on: () => {},
    seat,
    isHost,
  };
  return { client, chunks };
}

interface SseFrame {
  type: string;
  data: unknown;
}

function lastFrame(chunks: string[]): SseFrame | null {
  const last = chunks[chunks.length - 1];
  if (!last) return null;
  const lines = last.split('\n');
  const typeLine = lines.find((l) => l.startsWith('event: '));
  const dataLine = lines.find((l) => l.startsWith('data: '));
  if (!typeLine || !dataLine) return null;
  return {
    type: typeLine.slice('event: '.length),
    data: JSON.parse(dataLine.slice('data: '.length)) as unknown,
  };
}

function framesOfType(chunks: string[], type: string): unknown[] {
  const out: unknown[] = [];
  for (const c of chunks) {
    const lines = c.split('\n');
    const typeLine = lines.find((l) => l.startsWith('event: '));
    if (typeLine !== `event: ${type}`) continue;
    const dataLine = lines.find((l) => l.startsWith('data: '));
    if (dataLine) out.push(JSON.parse(dataLine.slice('data: '.length)) as unknown);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_CONFIG: Record<string, unknown> = {
  roomName: 'Voice Night',
  hostName: 'Host',
  maxPlayers: 8,
  startingStack: 1000,
  smallBlind: 10,
  bigBlind: 20,
  minBuyIn: 1000,
  maxBuyIn: 0,
  rebuyMin: 100,
  rebuyMax: 500,
  maxRebuys: 5,
  rebuysMidHand: false,
  allowLateJoin: true,
  durationMin: 0,
};

function twoSeats(): {
  room: PokerRoom;
  hostToken: string;
  p1: { seat: number; token: string };
} {
  const r = createPokerRoom({ ...BASE_CONFIG });
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('room setup failed');
  const j = joinPokerRoom(r.room, { name: 'Guest', buyIn: 1000 });
  assert.equal(j.ok, true);
  if (!j.ok) throw new Error('join failed');
  return {
    room: r.room,
    hostToken: r.room.hostToken,
    p1: { seat: j.seat, token: j.playerToken },
  };
}

// ---------------------------------------------------------------------------
// join / leave / status
// ---------------------------------------------------------------------------

test('voice-join marks the seat joined, muted by default, and broadcasts', () => {
  const { room, hostToken } = twoSeats();
  const a = fakeClient(0, true);
  const b = fakeClient(1, false);
  room.clients.add(a.client);
  room.clients.add(b.client);
  const r = joinPokerVoice(room, 0);
  assert.equal(r.ok, true);
  const entry = room.voice.get(0);
  assert.ok(entry);
  assert.equal(entry.joined, true);
  assert.equal(entry.muted, true); // safer default: no surprise hot-mic
  assert.equal(entry.speaking, false);
  assert.equal(entry.name, 'Host');
  const fa = lastFrame(a.chunks);
  const fb = lastFrame(b.chunks);
  assert.equal(fa?.type, 'voice-state');
  assert.equal(fb?.type, 'voice-state');
  const voice = (fa?.data as { voice: Record<string, { muted: boolean }> }).voice;
  assert.equal(voice['0']?.muted, true);
  void hostToken;
  clearPokerRooms();
});

test('voice-join is idempotent and rejects unknown seats', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 1).ok, true);
  assert.equal(joinPokerVoice(room, 1).ok, true);
  assert.equal(room.voice.size, 1);
  const bad = joinPokerVoice(room, 7);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.status, 404);
  clearPokerRooms();
});

test('voice-leave removes the entry and broadcasts; leaving twice is fine', () => {
  const { room } = twoSeats();
  const a = fakeClient(0, true);
  room.clients.add(a.client);
  assert.equal(joinPokerVoice(room, 0).ok, true);
  assert.equal(leavePokerVoice(room, 0).ok, true);
  assert.equal(room.voice.has(0), false);
  assert.equal(leavePokerVoice(room, 0).ok, true); // idempotent
  const f = lastFrame(a.chunks);
  assert.equal(f?.type, 'voice-state');
  const voice = (f?.data as { voice: Record<string, unknown> }).voice;
  assert.deepEqual(voice, {});
  clearPokerRooms();
});

test('voice-status updates muted/speaking; muting clears speaking', () => {
  const { room } = twoSeats();
  const a = fakeClient(0, true);
  room.clients.add(a.client);
  assert.equal(joinPokerVoice(room, 0).ok, true);
  const unmuted = setPokerVoiceStatus(room, 0, { muted: false });
  assert.equal(unmuted.ok, true);
  assert.equal(room.voice.get(0)?.muted, false);
  const speaking = setPokerVoiceStatus(room, 0, { speaking: true });
  assert.equal(speaking.ok, true);
  assert.equal(room.voice.get(0)?.speaking, true);
  const remute = setPokerVoiceStatus(room, 0, { muted: true });
  assert.equal(remute.ok, true);
  assert.equal(room.voice.get(0)?.speaking, false); // muted => not speaking
  const f = lastFrame(a.chunks);
  assert.equal(f?.type, 'voice-state');
  clearPokerRooms();
});

test('voice-status rejects bad input and non-members', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 0).ok, true);
  const badType = setPokerVoiceStatus(room, 0, { muted: 'yes' });
  assert.equal(badType.ok, false);
  if (!badType.ok) assert.equal(badType.status, 400);
  const notInVoice = setPokerVoiceStatus(room, 1, { muted: true });
  assert.equal(notInVoice.ok, false);
  if (!notInVoice.ok) assert.equal(notInVoice.status, 404);
  const unknownSeat = setPokerVoiceStatus(room, 7, { muted: true });
  assert.equal(unknownSeat.ok, false);
  if (!unknownSeat.ok) assert.equal(unknownSeat.status, 404);
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// signaling: DM only to the target seat
// ---------------------------------------------------------------------------

test('voice-signal DM reaches ONLY the target seat client', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 0).ok, true);
  assert.equal(joinPokerVoice(room, 1).ok, true);
  const sender = fakeClient(0, true);
  const target = fakeClient(1, false);
  const bystander = fakeClient(0, false); // same seat as sender, different conn
  room.clients.add(sender.client);
  room.clients.add(target.client);
  room.clients.add(bystander.client);
  const r = signalPokerVoice(room, 0, {
    toSeat: 1,
    kind: 'offer',
    payload: { sdp: 'v=0\r\no=- fake sdp' },
  });
  assert.equal(r.ok, true);
  assert.equal(target.chunks.length, 1);
  const f = lastFrame(target.chunks);
  assert.equal(f?.type, 'voice-signal');
  const data = f?.data as {
    fromSeat: number;
    kind: string;
    payload: Record<string, string>;
  };
  assert.equal(data.fromSeat, 0);
  assert.equal(data.kind, 'offer');
  assert.equal(data.payload.sdp, 'v=0\r\no=- fake sdp');
  // Nobody else got it — not even the sender's other connection.
  assert.equal(sender.chunks.length, 0);
  assert.equal(bystander.chunks.length, 0);
  clearPokerRooms();
});

test('sendPokerToSeat returns false when the seat has no live clients', () => {
  const { room } = twoSeats();
  assert.equal(sendPokerToSeat(room, 1, 'voice-signal', {}), false);
  const t = fakeClient(1, false);
  room.clients.add(t.client);
  assert.equal(sendPokerToSeat(room, 1, 'voice-signal', {}), true);
  clearPokerRooms();
});

test('voice-signal validation: targets, kinds, payloads', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 0).ok, true);
  // Target is a member but not in voice -> 409.
  const notInVoice = signalPokerVoice(room, 0, {
    toSeat: 1,
    kind: 'offer',
    payload: { sdp: 'x' },
  });
  assert.equal(notInVoice.ok, false);
  if (!notInVoice.ok) assert.equal(notInVoice.status, 409);
  // Unknown seat -> 404.
  const unknown = signalPokerVoice(room, 0, {
    toSeat: 7,
    kind: 'offer',
    payload: { sdp: 'x' },
  });
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.status, 404);
  assert.equal(joinPokerVoice(room, 1).ok, true);
  // Bad kinds -> 400.
  for (const kind of ['prank', '', null, 42]) {
    const r = signalPokerVoice(room, 0, {
      toSeat: 1,
      kind,
      payload: { sdp: 'x' },
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 400);
  }
  // Payload must be an object of strings.
  for (const payload of [null, 'sdp', 42, ['sdp'], { sdp: 42 }, { sdp: { nested: 1 } }]) {
    const r = signalPokerVoice(room, 0, {
      toSeat: 1,
      kind: 'offer',
      payload,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 400);
  }
  // Oversize payload -> 400.
  const big = signalPokerVoice(room, 0, {
    toSeat: 1,
    kind: 'offer',
    payload: { sdp: 'x'.repeat(9000) },
  });
  assert.equal(big.ok, false);
  if (!big.ok) assert.equal(big.status, 400);
  // Cannot signal yourself -> 400.
  const self = signalPokerVoice(room, 0, {
    toSeat: 0,
    kind: 'offer',
    payload: { sdp: 'x' },
  });
  assert.equal(self.ok, false);
  if (!self.ok) assert.equal(self.status, 400);
  // Valid kinds all pass validation.
  for (const kind of ['offer', 'answer', 'ice'] as const) {
    const r = signalPokerVoice(room, 0, {
      toSeat: 1,
      kind,
      payload: { sdp: 'x' },
    });
    assert.equal(r.ok, true);
  }
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// HTTP handlers: auth + room state codes
// ---------------------------------------------------------------------------

test('voice-signal handler: bad token -> 403, unknown room -> 404', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 0).ok, true);
  assert.equal(joinPokerVoice(room, 1).ok, true);
  const { res, cap } = fakeRes();
  pokerVoiceSignalHandler(
    fakeReq({
      params: { code: room.code },
      headers: { 'x-poker-token': 'nope' },
      body: { toSeat: 1, kind: 'offer', payload: { sdp: 'x' } },
    }),
    res,
  );
  assert.equal(cap.status, 403);
  const { res: res2, cap: cap2 } = fakeRes();
  pokerVoiceSignalHandler(
    fakeReq({
      params: { code: 'ZZZZZ' },
      headers: { 'x-poker-token': 'nope' },
      body: { toSeat: 1, kind: 'offer', payload: { sdp: 'x' } },
    }),
    res2,
  );
  assert.equal(cap2.status, 404);
  clearPokerRooms();
});

test('voice-join handler: token in body works; closed room -> 410', () => {
  const { room, hostToken, p1 } = twoSeats();
  const { res, cap } = fakeRes();
  pokerVoiceJoinHandler(
    fakeReq({ params: { code: room.code }, body: { token: p1.token } }),
    res,
  );
  assert.equal(cap.status, 200);
  assert.deepEqual(cap.body, { ok: true, seat: p1.seat });
  assert.equal(room.voice.get(p1.seat)?.joined, true);
  // Bad token -> 403.
  const { res: res2, cap: cap2 } = fakeRes();
  pokerVoiceJoinHandler(
    fakeReq({ params: { code: room.code }, body: { token: 'bogus' } }),
    res2,
  );
  assert.equal(cap2.status, 403);
  // Close the room -> voice-join is 410 now.
  closePokerRoom(room, 'host');
  const { res: res3, cap: cap3 } = fakeRes();
  pokerVoiceJoinHandler(
    fakeReq({
      params: { code: room.code },
      headers: { 'x-poker-token': p1.token },
    }),
    res3,
  );
  assert.equal(cap3.status, 410);
  void hostToken;
  clearPokerRooms();
});

test('voice-status / voice-leave handlers round-trip through HTTP', () => {
  const { room, p1 } = twoSeats();
  const join = fakeRes();
  pokerVoiceJoinHandler(
    fakeReq({ params: { code: room.code }, body: { token: p1.token } }),
    join.res,
  );
  assert.equal(join.cap.status, 200);
  const st = fakeRes();
  pokerVoiceStatusHandler(
    fakeReq({
      params: { code: room.code },
      headers: { 'x-poker-token': p1.token },
      body: { muted: false, speaking: true },
    }),
    st.res,
  );
  assert.equal(st.cap.status, 200);
  assert.equal(room.voice.get(p1.seat)?.muted, false);
  assert.equal(room.voice.get(p1.seat)?.speaking, true);
  const lv = fakeRes();
  pokerVoiceLeaveHandler(
    fakeReq({
      params: { code: room.code },
      headers: { 'x-poker-token': p1.token },
      body: {},
    }),
    lv.res,
  );
  assert.equal(lv.cap.status, 200);
  assert.equal(room.voice.has(p1.seat), false);
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// lifecycle: disconnect + close
// ---------------------------------------------------------------------------

test('releasePokerVoiceOnDisconnect: keeps the entry while a conn is alive', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 1).ok, true);
  const c1 = fakeClient(1, false);
  const c2 = fakeClient(1, false); // e.g. table stream + voice stream
  room.clients.add(c1.client);
  room.clients.add(c2.client);
  room.clients.delete(c1.client); // first conn drops
  assert.equal(releasePokerVoiceOnDisconnect(room, 1), false);
  assert.equal(room.voice.has(1), true); // still alive on the other conn
  room.clients.delete(c2.client); // last conn drops
  const watcher = fakeClient(0, true);
  room.clients.add(watcher.client);
  assert.equal(releasePokerVoiceOnDisconnect(room, 1), true);
  assert.equal(room.voice.has(1), false);
  const f = lastFrame(watcher.chunks);
  assert.equal(f?.type, 'voice-state');
  clearPokerRooms();
});

test('closePokerRoom clears voice state and broadcasts it', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 0).ok, true);
  assert.equal(joinPokerVoice(room, 1).ok, true);
  const a = fakeClient(0, true);
  const b = fakeClient(1, false);
  room.clients.add(a.client);
  room.clients.add(b.client);
  closePokerRoom(room, 'host');
  assert.equal(room.voice.size, 0);
  const frames = framesOfType(a.chunks, 'voice-state');
  assert.ok(frames.length >= 1);
  const last = frames[frames.length - 1] as { voice: Record<string, unknown> };
  assert.deepEqual(last.voice, {});
  const framesB = framesOfType(b.chunks, 'voice-state');
  assert.ok(framesB.length >= 1);
  clearPokerRooms();
});

test('publicTableState and GET /state include the compact voice summary', () => {
  const { room, p1 } = twoSeats();
  assert.equal(joinPokerVoice(room, 0).ok, true);
  const summary = publicVoiceState(room);
  assert.equal(summary['0']?.joined, true);
  assert.equal(summary['0']?.muted, true);
  assert.equal(summary['0']?.name, 'Host');
  const table = publicTableState(room) as {
    voice: Record<string, { seat: number; name: string }>;
  };
  assert.equal(table.voice['0']?.seat, 0);
  // Through the HTTP state handler too.
  const { res, cap } = fakeRes();
  pokerStateHandler(
    fakeReq({
      params: { code: room.code },
      headers: { 'x-poker-token': p1.token },
    }),
    res,
  );
  assert.equal(cap.status, 200);
  const body = cap.body as {
    voice: Record<string, { joined: boolean; muted: boolean }>;
  };
  assert.equal(body.voice['0']?.joined, true);
  assert.equal(body.voice['0']?.muted, true);
  clearPokerRooms();
});

test('broadcastPokerVoiceState reaches every client', () => {
  const { room } = twoSeats();
  const a = fakeClient(0, true);
  const b = fakeClient(1, false);
  room.clients.add(a.client);
  room.clients.add(b.client);
  broadcastPokerVoiceState(room);
  assert.equal(lastFrame(a.chunks)?.type, 'voice-state');
  assert.equal(lastFrame(b.chunks)?.type, 'voice-state');
  clearPokerRooms();
});

test('playerBySeat still finds voice members (sanity)', () => {
  const { room } = twoSeats();
  assert.equal(joinPokerVoice(room, 1).ok, true);
  assert.equal(playerBySeat(room, 1)?.name, 'Guest');
  clearPokerRooms();
});
