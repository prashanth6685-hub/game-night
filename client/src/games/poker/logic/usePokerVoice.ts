// usePokerVoice: WebRTC audio-only voice chat for private poker rooms.
//
// Mesh topology: one RTCPeerConnection per pair of voice-joined seats (8
// seats max, so at most 7 PCs per client). The server NEVER sees audio —
// it only tracks voice presence and relays opaque signaling payloads
// (offer/answer/ICE) between seats via POST /voice-signal, delivered as
// `voice-signal` SSE events to the target seat only.
//
// Signaling flow:
//   1. join() — user gesture only: getUserMedia (echo cancellation, noise
//      suppression, auto gain), then POST /voice-join (lands muted).
//   2. On `voice-state` showing another joined seat: the HIGHER seat number
//      creates the offer (glare-free by construction); the lower seat waits
//      and answers. ICE candidates trickle via kind:'ice'.
//   3. Remote streams play through hidden <audio autoplay> elements. The
//      local mic is NEVER attached to an audio element (no echo of self).
//   4. Speaking detection (AnalyserNode on the local stream, RMS threshold)
//      throttles POST /voice-status {speaking} to ~2/sec; the server
//      rebroadcasts `voice-state` so every client renders mic badges.
//   5. leave()/unmount/room-closed: stop tracks, close PCs, POST
//      /voice-leave (idempotent; the server also clears the entry when the
//      seat's last SSE connection drops).
//
// Joining/leaving/muting voice NEVER affects the poker hand — voice state
// lives in a separate server map and this module.
//
// Honest limits: STUN only (stun:stun.l.google.com:19302), no TURN —
// symmetric-NAT pairs may fail to connect, surfaced per-peer as an error
// badge. Audio quality across networks cannot be automated-tested.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { PokerRoomsApi, openPokerEvents } from './pokerRooms.ts';
import type {
  PokerVoicePeerState,
  PokerVoiceSignal,
} from './pokerRooms.ts';
import type { PokerMpSession } from './pokerSession.ts';
import { VOICE_MIC_INITIAL, voiceMicJoined, voiceMicNext } from './voiceState.ts';
import type { VoiceMic, VoiceMicEvent } from './voiceState.ts';

/** Public STUN only — no TURN (documented limitation, see above). */
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
/** Matches the room cap (maxPlayers 2-8). */
export const MAX_VOICE_PEERS = 8;
/** RMS of the mic time-domain signal above this counts as speaking. */
const SPEAK_RMS_THRESHOLD = 0.02;
const SPEAK_CHECK_MS = 250;
/** Min gap between speaking POSTs (~2/sec max, per the server contract). */
const SPEAK_POST_MIN_MS = 500;
/** Max offer attempts per peer (initial + one ICE-restart retry). */
const MAX_OFFER_ATTEMPTS = 2;

export interface UsePokerVoiceOptions {
  session: PokerMpSession;
  /** Seed from GET /state (which now includes the voice summary). */
  initialVoice?: Record<string, PokerVoicePeerState>;
}

export interface UsePokerVoice {
  /** Server voice presence by seat. */
  voiceState: Map<number, PokerVoicePeerState>;
  joined: boolean;
  muted: boolean;
  /** Local speaking detection (drives the "you're live" hint). */
  speaking: boolean;
  micState: VoiceMic['state'];
  error: string | null;
  /** 'denied' -> show the browser-settings recovery hint. */
  errorKind: 'denied' | 'other' | null;
  /** Joined seats (including me). */
  voiceCount: number;
  maxVoice: number;
  /** Seats whose peer connection failed locally (badge 'error'). */
  peerErrors: ReadonlyMap<number, string>;
  speakerOn: boolean;
  micDevices: MediaDeviceInfo[];
  speakerDevices: MediaDeviceInfo[];
  selectedMic: string;
  selectedSpeaker: string;
  join: () => void;
  leave: () => void;
  toggleMute: () => void;
  /** Master speaker toggle: mutes/unmutes every remote <audio>. */
  setAudioEnabled: (on: boolean) => void;
  selectMic: (deviceId: string) => void;
  selectSpeaker: (deviceId: string) => void;
}

interface SpeakMonitor {
  ctx: AudioContext;
  analyser: AnalyserNode;
  timer: number;
}

/** Hidden container for the remote <audio> elements (never the local mic). */
function ensureAudioHost(): HTMLDivElement {
  const found = document.getElementById('pk-voice-audio');
  if (found instanceof HTMLDivElement) return found;
  const host = document.createElement('div');
  host.id = 'pk-voice-audio';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);';
  document.body.appendChild(host);
  return host;
}

function audioConstraints(micId: string): MediaTrackConstraints {
  const c: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (micId !== '') c.deviceId = { exact: micId };
  return c;
}

export function usePokerVoice({
  session,
  initialVoice,
}: UsePokerVoiceOptions): UsePokerVoice {
  const { t } = useI18n();
  const code = session.code;
  const token = session.token;
  const mySeat = session.seat;
  const sseToken = session.isHost ? (session.hostToken ?? session.token) : session.token;
  const sseRole = session.isHost ? 'host' : 'player';

  const [mic, setMic] = useState<VoiceMic>(VOICE_MIC_INITIAL);
  const [errorKind, setErrorKind] = useState<'denied' | 'other' | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceState, setVoiceState] = useState<Map<number, PokerVoicePeerState>>(
    () => new Map(),
  );
  const [peerErrors, setPeerErrors] = useState<Map<number, string>>(new Map());
  const [speakerOn, setSpeakerOn] = useState(true);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');

  const micRef = useRef(mic);
  const voiceStateRef = useRef(voiceState);
  const speakerOnRef = useRef(speakerOn);
  const selectedMicRef = useRef(selectedMic);
  const selectedSpeakerRef = useRef(selectedSpeaker);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef(new Map<number, RTCPeerConnection>());
  const audioElsRef = useRef(new Map<number, HTMLAudioElement>());
  const speakMonRef = useRef<SpeakMonitor | null>(null);
  const offerAttemptsRef = useRef(new Map<number, number>());
  const joinSeqRef = useRef(0);
  const mountedRef = useRef(false);
  const initialVoiceRef = useRef(initialVoice);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    micRef.current = mic;
  }, [mic]);
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);
  useEffect(() => {
    speakerOnRef.current = speakerOn;
  }, [speakerOn]);
  useEffect(() => {
    selectedMicRef.current = selectedMic;
  }, [selectedMic]);
  useEffect(() => {
    selectedSpeakerRef.current = selectedSpeaker;
  }, [selectedSpeaker]);

  const dispatchMic = useCallback((ev: VoiceMicEvent): void => {
    setMic((m) => voiceMicNext(m, ev));
  }, []);

  const refreshDevices = useCallback(async (): Promise<void> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicDevices(devices.filter((d) => d.kind === 'audioinput'));
      setSpeakerDevices(devices.filter((d) => d.kind === 'audiooutput'));
    } catch {
      // Device labels stay empty; the selects just show nothing.
    }
  }, []);

  // ------------------------------------------------------------ teardown ---

  const stopSpeakingMonitor = useCallback((): void => {
    const mon = speakMonRef.current;
    speakMonRef.current = null;
    if (!mon) return;
    window.clearInterval(mon.timer);
    try {
      mon.analyser.disconnect();
    } catch {
      // already torn down
    }
    void mon.ctx.close().catch(() => {});
  }, []);

  const closePeer = useCallback((seat: number): void => {
    const pc = pcsRef.current.get(seat);
    if (pc) {
      pcsRef.current.delete(seat);
      try {
        pc.close();
      } catch {
        // already closed
      }
    }
    const audio = audioElsRef.current.get(seat);
    if (audio) {
      audioElsRef.current.delete(seat);
      try {
        audio.srcObject = null;
      } catch {
        // ignore
      }
      audio.remove();
    }
    offerAttemptsRef.current.delete(seat);
  }, []);

  /** Full local teardown: tracks, PCs, audio elements, monitors. */
  const teardownMedia = useCallback((): void => {
    stopSpeakingMonitor();
    for (const seat of [...pcsRef.current.keys()]) closePeer(seat);
    const stream = localStreamRef.current;
    localStreamRef.current = null;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
    }
    setPeerErrors(new Map());
  }, [stopSpeakingMonitor, closePeer]);

  // ------------------------------------------------------- peer handling ---

  const attachRemoteAudio = useCallback(
    (remoteSeat: number, stream: MediaStream): void => {
      let audio = audioElsRef.current.get(remoteSeat);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', '');
        ensureAudioHost().appendChild(audio);
        audioElsRef.current.set(remoteSeat, audio);
      }
      audio.srcObject = stream;
      audio.muted = !speakerOnRef.current;
      const sinkId = selectedSpeakerRef.current;
      const withSink = audio as HTMLAudioElement & {
        setSinkId?: (id: string) => Promise<void>;
      };
      if (sinkId !== '' && typeof withSink.setSinkId === 'function') {
        withSink.setSinkId(sinkId).catch(() => {
          // output device unsupported here; default output stays
        });
      }
      void audio.play().catch(() => {
        // Autoplay policies: the join tap is a user gesture, so this is
        // rare; the next remote track event retries.
      });
    },
    [],
  );

  const getOrCreatePc = useCallback(
    (remoteSeat: number): RTCPeerConnection | null => {
      const existing = pcsRef.current.get(remoteSeat);
      if (existing) return existing;
      if (typeof RTCPeerConnection === 'undefined') return null;
      const stream = localStreamRef.current;
      if (!stream) return null; // not joined yet; reconcile retries after join
      let pc: RTCPeerConnection;
      try {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      } catch {
        return null;
      }
      for (const track of stream.getAudioTracks()) {
        try {
          pc.addTrack(track, stream);
        } catch {
          // track already added
        }
      }
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          const payload = { candidate: JSON.stringify(ev.candidate.toJSON()) };
          void PokerRoomsApi.voiceSignal(code, token, remoteSeat, 'ice', payload).catch(
            () => {},
          );
        }
      };
      pc.ontrack = (ev) => {
        const remote = ev.streams[0];
        if (remote) attachRemoteAudio(remoteSeat, remote);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          const attempts = offerAttemptsRef.current.get(remoteSeat) ?? 0;
          if (mySeat > remoteSeat && attempts < MAX_OFFER_ATTEMPTS) {
            // We are the initiator: one ICE-restart attempt.
            offerAttemptsRef.current.set(remoteSeat, attempts + 1);
            void makeOfferRef.current(remoteSeat);
          } else {
            setPeerErrors((m) => new Map(m).set(remoteSeat, 'failed'));
          }
        } else if (pc.connectionState === 'connected') {
          setPeerErrors((m) => {
            if (!m.has(remoteSeat)) return m;
            const next = new Map(m);
            next.delete(remoteSeat);
            return next;
          });
        }
      };
      pcsRef.current.set(remoteSeat, pc);
      return pc;
    },
    [code, token, mySeat, attachRemoteAudio],
  );

  const makeOffer = useCallback(
    async (remoteSeat: number): Promise<void> => {
      const pc = getOrCreatePc(remoteSeat);
      if (!pc) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sdp = pc.localDescription?.sdp ?? offer.sdp;
        if (!sdp) return;
        await PokerRoomsApi.voiceSignal(code, token, remoteSeat, 'offer', { sdp });
      } catch {
        setPeerErrors((m) => new Map(m).set(remoteSeat, 'offer-failed'));
      }
    },
    [code, token, getOrCreatePc],
  );
  const makeOfferRef = useRef(makeOffer);
  useEffect(() => {
    makeOfferRef.current = makeOffer;
  }, [makeOffer]);

  const handleSignal = useCallback(
    async (sig: PokerVoiceSignal): Promise<void> => {
      const { fromSeat, kind, payload } = sig;
      if (fromSeat === mySeat) return;
      if (!voiceStateRef.current.has(fromSeat)) return; // not in voice
      const pc =
        kind === 'offer' ? getOrCreatePc(fromSeat) : pcsRef.current.get(fromSeat);
      if (!pc) return;
      try {
        if (kind === 'offer') {
          const sdp = payload.sdp;
          if (!sdp) return;
          // Glare-free by construction: only the higher seat initiates.
          await pc.setRemoteDescription({ type: 'offer', sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          const asdp = pc.localDescription?.sdp ?? answer.sdp;
          if (!asdp) return;
          await PokerRoomsApi.voiceSignal(code, token, fromSeat, 'answer', {
            sdp: asdp,
          });
        } else if (kind === 'answer') {
          const sdp = payload.sdp;
          if (!sdp) return;
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription({ type: 'answer', sdp });
          }
        } else {
          const cand = payload.candidate;
          if (!cand) return;
          const init = JSON.parse(cand) as RTCIceCandidateInit;
          await pc.addIceCandidate(init);
        }
      } catch {
        // Transient SDP/ICE races are normal on phones; the failed-state
        // handler retries the offer once for initiators.
      }
    },
    [code, token, mySeat, getOrCreatePc],
  );

  /** Close PCs for departed seats; open PCs for new ones (post-join). */
  const reconcilePeers = useCallback(
    (peers: Map<number, PokerVoicePeerState>): void => {
      for (const seat of [...pcsRef.current.keys()]) {
        if (!peers.has(seat)) {
          closePeer(seat);
          setPeerErrors((m) => {
            if (!m.has(seat)) return m;
            const next = new Map(m);
            next.delete(seat);
            return next;
          });
        }
      }
      if (!voiceMicJoined(micRef.current)) return;
      for (const seat of peers.keys()) {
        if (seat === mySeat) continue;
        if (mySeat > seat) {
          if (!pcsRef.current.has(seat)) void makeOffer(seat);
        } else {
          // Lower seat waits for the offer, but still needs a PC ready.
          getOrCreatePc(seat);
        }
      }
    },
    [mySeat, makeOffer, getOrCreatePc, closePeer],
  );

  const applyVoiceState = useCallback(
    (raw: Record<string, PokerVoicePeerState> | undefined): void => {
      if (raw === undefined) return; // malformed frame: keep last known state
      const next = new Map<number, PokerVoicePeerState>();
      for (const [k, v] of Object.entries(raw)) {
        const seat = Number(k);
        if (!Number.isInteger(seat) || v === null || typeof v !== 'object') continue;
        next.set(seat, {
          seat,
          name: typeof v.name === 'string' ? v.name : '',
          joined: v.joined === true,
          muted: v.muted === true,
          speaking: v.speaking === true,
          error: typeof v.error === 'string' ? v.error : undefined,
        });
      }
      voiceStateRef.current = next;
      setVoiceState(next);
      reconcilePeers(next);
    },
    [reconcilePeers],
  );

  // --------------------------------------------------- speaking monitor ---

  const startSpeakingMonitor = useCallback(
    (stream: MediaStream): void => {
      stopSpeakingMonitor();
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      let ctx: AudioContext;
      try {
        ctx = new AC();
      } catch {
        return;
      }
      void ctx.resume().catch(() => {});
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const timer = window.setInterval(() => {
        if (!mountedRef.current) return;
        // Only the live mic counts — never while muted.
        if (micRef.current.state !== 'joined') return;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i] ?? 0;
          sum += v * v;
        }
        const isSpeaking = Math.sqrt(sum / buf.length) > SPEAK_RMS_THRESHOLD;
        setSpeaking((s) => (s === isSpeaking ? s : isSpeaking));
        const now = Date.now();
        if (
          isSpeaking !== lastSpeakSentRef.current &&
          now - lastSpeakPostRef.current >= SPEAK_POST_MIN_MS
        ) {
          lastSpeakSentRef.current = isSpeaking;
          lastSpeakPostRef.current = now;
          void PokerRoomsApi.voiceStatus(code, token, {
            speaking: isSpeaking,
          }).catch(() => {});
        }
      }, SPEAK_CHECK_MS);
      speakMonRef.current = { ctx, analyser, timer };
    },
    [code, token, stopSpeakingMonitor],
  );
  const lastSpeakSentRef = useRef(false);
  const lastSpeakPostRef = useRef(0);

  // ------------------------------------------------------------------ api ---

  const describeMicError = useCallback(
    (e: unknown): { message: string; kind: 'denied' | 'other' } => {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        return { message: tRef.current('poker.mpVoiceMicDenied'), kind: 'denied' };
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        return { message: tRef.current('poker.mpVoiceNoMic'), kind: 'other' };
      }
      return { message: tRef.current('poker.mpVoiceJoinFailed'), kind: 'other' };
    },
    [],
  );

  /** User gesture only: acquire the mic, then join the voice mesh. */
  const join = useCallback((): void => {
    const cur = micRef.current;
    if (cur.state === 'joining' || voiceMicJoined(cur)) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorKind('other');
      dispatchMic({ type: 'join-fail', error: tRef.current('poker.mpVoiceJoinFailed') });
      return;
    }
    const seq = ++joinSeqRef.current;
    setErrorKind(null);
    dispatchMic({ type: 'join' });
    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints(selectedMicRef.current),
        });
      } catch (e) {
        if (seq !== joinSeqRef.current || !mountedRef.current) return;
        const d = describeMicError(e);
        setErrorKind(d.kind);
        dispatchMic({ type: 'join-fail', error: d.message });
        return;
      }
      if (seq !== joinSeqRef.current || !mountedRef.current) {
        for (const tr of stream.getTracks()) tr.stop();
        return;
      }
      // Start muted locally (matches the server default — no hot-mic).
      for (const tr of stream.getAudioTracks()) tr.enabled = false;
      localStreamRef.current = stream;
      try {
        await PokerRoomsApi.voiceJoin(code, token);
      } catch {
        for (const tr of stream.getTracks()) tr.stop();
        localStreamRef.current = null;
        if (seq !== joinSeqRef.current || !mountedRef.current) return;
        setErrorKind('other');
        dispatchMic({
          type: 'join-fail',
          error: tRef.current('poker.mpVoiceJoinFailed'),
        });
        return;
      }
      if (seq !== joinSeqRef.current || !mountedRef.current) {
        void PokerRoomsApi.voiceLeave(code, token).catch(() => {});
        for (const tr of stream.getTracks()) tr.stop();
        localStreamRef.current = null;
        return;
      }
      startSpeakingMonitor(stream);
      void refreshDevices();
      dispatchMic({ type: 'join-ok' }); // -> 'muted'
      reconcilePeers(voiceStateRef.current);
    })();
  }, [
    code,
    token,
    dispatchMic,
    describeMicError,
    startSpeakingMonitor,
    refreshDevices,
    reconcilePeers,
  ]);

  const leave = useCallback((): void => {
    joinSeqRef.current += 1; // invalidate any in-flight join
    void PokerRoomsApi.voiceLeave(code, token).catch(() => {});
    teardownMedia();
    lastSpeakSentRef.current = false;
    setSpeaking(false);
    setErrorKind(null);
    dispatchMic({ type: 'leave' });
  }, [code, token, teardownMedia, dispatchMic]);

  const toggleMute = useCallback((): void => {
    const cur = micRef.current;
    const stream = localStreamRef.current;
    if (cur.state === 'joined') {
      for (const tr of stream?.getAudioTracks() ?? []) tr.enabled = false;
      lastSpeakSentRef.current = false;
      setSpeaking(false);
      dispatchMic({ type: 'mute' });
      void PokerRoomsApi.voiceStatus(code, token, {
        muted: true,
        speaking: false,
      }).catch(() => {});
    } else if (cur.state === 'muted') {
      for (const tr of stream?.getAudioTracks() ?? []) tr.enabled = true;
      dispatchMic({ type: 'unmute' });
      void PokerRoomsApi.voiceStatus(code, token, { muted: false }).catch(
        () => {},
      );
    }
  }, [code, token, dispatchMic]);

  const setAudioEnabled = useCallback((on: boolean): void => {
    speakerOnRef.current = on;
    setSpeakerOn(on);
    for (const audio of audioElsRef.current.values()) audio.muted = !on;
  }, []);

  const selectMic = useCallback(
    (deviceId: string): void => {
      selectedMicRef.current = deviceId;
      setSelectedMic(deviceId);
      // Hot-swap the mic without dropping peer connections.
      const stream = localStreamRef.current;
      if (!stream || !voiceMicJoined(micRef.current)) return;
      void (async () => {
        let next: MediaStream;
        try {
          next = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints(deviceId),
          });
        } catch {
          return; // keep the old mic
        }
        const newTrack = next.getAudioTracks()[0];
        if (!newTrack) {
          for (const tr of next.getTracks()) tr.stop();
          return;
        }
        newTrack.enabled = micRef.current.state === 'joined';
        for (const pc of pcsRef.current.values()) {
          const sender = pc
            .getSenders()
            .find((s) => s.track !== null && s.track.kind === 'audio');
          if (sender) {
            try {
              await sender.replaceTrack(newTrack);
            } catch {
              // keep going; the old track still works on other PCs
            }
          }
        }
        for (const tr of stream.getAudioTracks()) tr.stop();
        const combined = new MediaStream([newTrack]);
        localStreamRef.current = combined;
        startSpeakingMonitor(combined);
        void refreshDevices();
      })();
    },
    [startSpeakingMonitor, refreshDevices],
  );

  const selectSpeaker = useCallback((deviceId: string): void => {
    selectedSpeakerRef.current = deviceId;
    setSelectedSpeaker(deviceId);
    for (const audio of audioElsRef.current.values()) {
      const withSink = audio as HTMLAudioElement & {
        setSinkId?: (id: string) => Promise<void>;
      };
      if (deviceId !== '' && typeof withSink.setSinkId === 'function') {
        withSink.setSinkId(deviceId).catch(() => {
          // output device unsupported here; default output stays
        });
      }
    }
  }, []);

  // ------------------------------------------------------- event stream ---

  useEffect(() => {
    mountedRef.current = true;
    if (initialVoiceRef.current) applyVoiceState(initialVoiceRef.current);
    void refreshDevices();
    const stop = openPokerEvents(
      code,
      { role: sseRole, token: sseToken },
      (ev) => {
        if (ev.type === 'voice-state') {
          applyVoiceState(ev.voice);
        } else if (ev.type === 'voice-signal') {
          const sig: PokerVoiceSignal = {
            fromSeat: ev.fromSeat,
            kind: ev.kind,
            payload: ev.payload,
          };
          void handleSignal(sig);
        } else if (ev.type === 'room-closed') {
          teardownMedia();
          dispatchMic({ type: 'reset' });
          setSpeaking(false);
        }
      },
    );
    return () => {
      mountedRef.current = false;
      stop();
      // Best-effort server-side leave if we were actually in voice; the
      // server also clears the entry when the last SSE conn drops.
      if (voiceMicJoined(micRef.current)) {
        void PokerRoomsApi.voiceLeave(code, token).catch(() => {});
      }
      teardownMedia();
    };
    // Mount-once: the session identity never changes for the hook's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joined = voiceMicJoined(mic);
  const voiceCount = [...voiceState.values()].filter((v) => v.joined).length;

  return {
    voiceState,
    joined,
    muted: mic.state === 'muted' || mic.state === 'joining',
    speaking,
    micState: mic.state,
    error: mic.error,
    errorKind,
    voiceCount,
    maxVoice: MAX_VOICE_PEERS,
    peerErrors,
    speakerOn,
    micDevices,
    speakerDevices,
    selectedMic,
    selectedSpeaker,
    join,
    leave,
    toggleMute,
    setAudioEnabled,
    selectMic,
    selectSpeaker,
  };
}
