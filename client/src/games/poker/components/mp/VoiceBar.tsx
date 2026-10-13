// VoiceBar: compact voice-chat control bar for private poker rooms.
// Sits near the table (never over cards or betting buttons), mobile-safe.
// All strings via t(); bright styling in poker.css (.pk-voicebar …).
import { useState } from 'react';
import { useI18n } from '../../../../i18n/index.ts';
import type { UsePokerVoice } from '../../logic/usePokerVoice.ts';

export interface VoiceBarProps {
  voice: UsePokerVoice;
}

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export function VoiceBar({ voice }: VoiceBarProps) {
  const { t } = useI18n();
  const [showSettings, setShowSettings] = useState(false);

  const joining = voice.micState === 'joining';
  const inVoice = voice.joined;
  const dotCls =
    voice.micState === 'error'
      ? 'err'
      : joining
        ? 'joining'
        : inVoice
          ? 'on'
          : 'idle';

  return (
    <div className="pk-voicebar" role="group" aria-label={t('poker.mpVoiceTitle')}>
      <span className={`pk-voice-dot pk-voice-dot-${dotCls}`} aria-hidden="true" />
      <span className="pk-voice-count">
        {fmt(t('poker.mpVoiceCount'), { n: voice.voiceCount, max: voice.maxVoice })}
      </span>

      {!inVoice && voice.micState !== 'error' && (
        <button
          type="button"
          className="pk-voice-btn pk-voice-join"
          onClick={voice.join}
          disabled={joining}
        >
          {joining ? t('poker.mpVoiceJoining') : t('poker.mpVoiceJoin')}
        </button>
      )}

      {inVoice && (
        <>
          <button
            type="button"
            className={`pk-voice-btn pk-voice-icon${voice.muted ? ' pk-voice-off' : ''}`}
            onClick={voice.toggleMute}
            aria-pressed={!voice.muted}
            title={voice.muted ? t('poker.mpVoiceUnmute') : t('poker.mpVoiceMute')}
            aria-label={voice.muted ? t('poker.mpVoiceUnmute') : t('poker.mpVoiceMute')}
          >
            {voice.muted ? '🔇' : '🎙️'}
          </button>
          <button
            type="button"
            className={`pk-voice-btn pk-voice-icon${voice.speakerOn ? '' : ' pk-voice-off'}`}
            onClick={() => voice.setAudioEnabled(!voice.speakerOn)}
            aria-pressed={voice.speakerOn}
            title={
              voice.speakerOn ? t('poker.mpVoiceSpeakerOff') : t('poker.mpVoiceSpeakerOn')
            }
            aria-label={
              voice.speakerOn ? t('poker.mpVoiceSpeakerOff') : t('poker.mpVoiceSpeakerOn')
            }
          >
            {voice.speakerOn ? '🔊' : '🔈'}
          </button>
          <button
            type="button"
            className="pk-voice-btn pk-voice-leave"
            onClick={voice.leave}
          >
            {t('poker.mpVoiceLeave')}
          </button>
          {voice.speaking && !voice.muted && (
            <span className="pk-voice-live" aria-live="polite">
              {t('poker.mpVoiceYouSpeaking')}
            </span>
          )}
        </>
      )}

      <button
        type="button"
        className="pk-voice-btn pk-voice-icon"
        onClick={() => setShowSettings((s) => !s)}
        aria-expanded={showSettings}
        title={t('poker.mpVoiceSettings')}
        aria-label={t('poker.mpVoiceSettings')}
      >
        ⚙️
      </button>

      {showSettings && (
        <div className="pk-voice-settings">
          <label className="pk-voice-field">
            <span>{t('poker.mpVoiceMicLabel')}</span>
            <select
              value={voice.selectedMic}
              onChange={(e) => voice.selectMic(e.target.value)}
              disabled={!inVoice}
            >
              <option value="">{t('poker.mpVoiceDefault')}</option>
              {voice.micDevices.map((d, i) => (
                <option key={`${d.deviceId}-${i}`} value={d.deviceId}>
                  {d.label !== '' ? d.label : fmt(t('poker.mpVoiceMicFallback'), { n: i + 1 })}
                </option>
              ))}
            </select>
          </label>
          <label className="pk-voice-field">
            <span>{t('poker.mpVoiceSpeakerLabel')}</span>
            <select
              value={voice.selectedSpeaker}
              onChange={(e) => voice.selectSpeaker(e.target.value)}
              disabled={!inVoice}
            >
              <option value="">{t('poker.mpVoiceDefault')}</option>
              {voice.speakerDevices.map((d, i) => (
                <option key={`${d.deviceId}-${i}`} value={d.deviceId}>
                  {d.label !== '' ? d.label : fmt(t('poker.mpVoiceSpeakerFallback'), { n: i + 1 })}
                </option>
              ))}
            </select>
          </label>
          <p className="pk-hint">{t('poker.mpVoiceStunNote')}</p>
        </div>
      )}

      {voice.micState === 'error' && voice.error !== null && (
        <div className="pk-voice-error" role="alert">
          <div>{voice.error}</div>
          {voice.errorKind === 'denied' && (
            <div className="pk-hint">{t('poker.mpVoiceMicDeniedHint')}</div>
          )}
          <button
            type="button"
            className="pk-voice-btn pk-voice-join"
            onClick={voice.join}
          >
            {t('poker.mpRetry')}
          </button>
        </div>
      )}
    </div>
  );
}
