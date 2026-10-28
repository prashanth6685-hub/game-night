import{b as B,c as pn,e as T,f as M,g as C,m as U}from"./chunk-XTV564HM.js";var ln=`/* Poker Practice Mode \u2014 bright, mobile-first styles.
   Emerald/teal felt, light page background, white cards, gold accents.
   Table scales to screen width; action panel sticks to the bottom on mobile. */

.pk-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  padding-bottom: 8px;
}

/* ---------- setup ---------- */
.pk-setup {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pk-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pk-label {
  font-weight: 700;
  font-size: 0.95rem;
}
.pk-hint {
  font-size: 0.85rem;
  color: #4b6b5e;
}
.pk-field input[type='text'],
.pk-field input:not([type]) {
  font-size: 1rem;
  padding: 10px 12px;
  border: 2px solid #cfe6da;
  border-radius: 10px;
  background: #fff;
  min-height: 44px;
}
.pk-count-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pk-bots {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pk-chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e8f6ef;
  border: 1px solid #bfe3d2;
  font-size: 0.85rem;
}
.pk-rules {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pk-rules p {
  margin: 0;
  line-height: 1.45;
}
.pk-ranks {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
}
.pk-rank-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.pk-rank-example {
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  white-space: nowrap;
}
.pk-rank p {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #4b6b5e;
}

/* ---------- turn banner ---------- */
.pk-turn {
  text-align: center;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #d9efe4;
  border-radius: 12px;
}
.pk-turn-main {
  font-weight: 700;
  font-size: 1.05rem;
}
.pk-turn-sub {
  font-size: 0.85rem;
  color: #4b6b5e;
}

/* ---------- table ---------- */
.pk-table-wrap {
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
}
.pk-felt {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3.4;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 38%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 55%),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.025) 0 6px, rgba(0, 0, 0, 0.02) 6px 12px),
    radial-gradient(ellipse at 50% 45%, #34c68f 0%, #22a176 48%, #177e5b 100%);
  border: 10px solid #b07a3f;
  outline: 2px solid #8a5f2c;
  box-shadow:
    inset 0 4px 18px rgba(0, 0, 0, 0.25),
    0 10px 28px rgba(20, 90, 60, 0.25);
}
.pk-center {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 78%;
}
.pk-pot {
  min-height: 1.6em;
  text-align: center;
  color: #fff;
  font-size: 0.95rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}
.pk-pot-current strong {
  color: #ffe9a8;
}
.pk-pot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85rem;
}
.pk-pot-win {
  background: rgba(0, 0, 0, 0.28);
  border-radius: 8px;
  padding: 2px 10px;
}
.pk-pot-hand {
  opacity: 0.9;
}
.pk-community {
  display: flex;
  gap: 6px;
  justify-content: center;
}

/* ---------- cards ---------- */
.pk-card {
  width: 46px;
  height: 64px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d5e2db;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
  position: relative;
  font-weight: 700;
  animation: pk-deal 0.35s ease;
}
.pk-card-sm {
  width: 34px;
  height: 48px;
  border-radius: 6px;
}
.pk-card-red {
  color: #d63b3b;
}
.pk-card-black {
  color: #232a30;
}
.pk-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.05;
  font-size: 0.72rem;
}
.pk-card-sm .pk-corner {
  font-size: 0.58rem;
}
.pk-corner-tl {
  top: 3px;
  left: 4px;
}
.pk-corner-br {
  bottom: 3px;
  right: 4px;
  transform: rotate(180deg);
}
.pk-pip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  opacity: 0.9;
}
.pk-card-sm .pk-pip {
  font-size: 1.15rem;
}
.pk-card-back {
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.14) 0 18%, rgba(255, 255, 255, 0) 19%),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.12) 0 5px, rgba(255, 255, 255, 0) 5px 10px),
    linear-gradient(135deg, #0f9d76 0%, #0b7d5e 100%);
  border: 2px solid #eaf7f1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pk-back-motif {
  color: rgba(255, 255, 255, 0.55);
  font-size: 1.3rem;
}
.pk-card-empty {
  background: rgba(255, 255, 255, 0.12);
  border: 2px dashed rgba(255, 255, 255, 0.55);
  box-shadow: none;
  animation: none;
}

@keyframes pk-deal {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ---------- seats ---------- */
.pk-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 92px;
  padding: 6px 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.pk-seat-active {
  border-color: #d4a017;
  box-shadow: 0 0 0 3px rgba(212, 160, 23, 0.45), 0 2px 8px rgba(0, 0, 0, 0.2);
}
.pk-seat-folded {
  opacity: 0.45;
}
.pk-seat-out {
  opacity: 0.4;
  filter: grayscale(0.6);
}
.pk-seat-winner {
  border-color: #d4a017;
  animation: pk-winpulse 1.2s ease-in-out infinite;
}
@keyframes pk-winpulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(212, 160, 23, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(212, 160, 23, 0.75), 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}
.pk-seat-badges {
  position: absolute;
  top: -11px;
  left: 4px;
  display: flex;
  gap: 3px;
}
.pk-badge {
  font-size: 0.62rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 1px 6px;
  color: #fff;
}
.pk-badge-dealer {
  background: #d4a017;
  border: 1px solid #a67c0e;
}
.pk-badge-blind {
  background: #118ab2;
  border: 1px solid #0c6a89;
}
.pk-seat-name {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.78rem;
  font-weight: 700;
  max-width: 100%;
}
.pk-seat-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pk-bot-badge {
  font-size: 0.72rem;
  background: #e0f2f8;
  border-radius: 999px;
  padding: 0 5px;
  line-height: 1.5;
}
.pk-seat-chips {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0b6e4f;
}
.pk-seat-bet {
  font-size: 0.72rem;
  font-weight: 700;
  background: #fff7dd;
  border: 1px solid #e8c95a;
  border-radius: 999px;
  padding: 0 8px;
  color: #7a5c06;
}
.pk-seat-cards {
  display: flex;
  gap: 3px;
}
.pk-seat-cards .pk-card + .pk-card {
  margin-left: -14px;
}
.pk-thinking {
  font-size: 0.7rem;
  font-style: italic;
  color: #0b6e4f;
}
.pk-seat-hand {
  font-size: 0.68rem;
  font-weight: 700;
  color: #7a5c06;
  background: #fff7dd;
  border-radius: 6px;
  padding: 0 6px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- action panel ---------- */
.pk-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #d9efe4;
  border-radius: 14px;
  padding: 12px;
}
.pk-tocall {
  text-align: center;
  font-weight: 700;
  color: #0b6e4f;
}
.pk-btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pk-btn-row > * {
  flex: 1 1 0;
  min-height: 48px;
}
.pk-amount {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #e3f2ea;
  padding-top: 10px;
}
.pk-amount-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.pk-amount-label {
  font-weight: 700;
}
.pk-amount-range {
  font-size: 0.8rem;
  color: #4b6b5e;
}
.pk-amount-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pk-slider {
  flex: 1 1 auto;
  min-height: 44px;
  accent-color: #0f9d76;
}
.pk-number {
  width: 84px;
  font-size: 1rem;
  padding: 8px;
  border: 2px solid #cfe6da;
  border-radius: 10px;
  min-height: 44px;
}

/* ---------- result / history ---------- */
.pk-result-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
}
.pk-result-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pk-result-btns > * {
  flex: 1 1 0;
}
.pk-history {
  background: #ffffff;
  border: 1px solid #d9efe4;
  border-radius: 12px;
  padding: 8px 12px;
}
.pk-history summary {
  cursor: pointer;
  font-weight: 700;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.pk-history ul {
  margin: 8px 0 4px;
  padding-left: 20px;
  font-size: 0.88rem;
  color: #33544a;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 220px;
  overflow-y: auto;
}

/* ---------- responsive ---------- */
@media (max-width: 420px) {
  .pk-felt {
    border-width: 7px;
  }
  .pk-card {
    width: 38px;
    height: 54px;
  }
  .pk-pip {
    font-size: 1.3rem;
  }
  .pk-seat {
    width: 76px;
    padding: 4px 2px;
  }
  .pk-seat-name,
  .pk-seat-chips {
    font-size: 0.68rem;
  }
}
@media (max-width: 640px) {
  .pk-actions {
    position: sticky;
    /* Sit above the app's fixed bottom nav, not under it. */
    bottom: calc(78px + env(safe-area-inset-bottom));
    z-index: 5;
    box-shadow: 0 -4px 16px rgba(20, 90, 60, 0.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pk-card,
  .pk-seat,
  .pk-seat-winner {
    animation: none;
    transition: none;
  }
}

/* ---------- private multiplayer ---------- */
.pk-center-col {
  align-items: stretch;
  text-align: left;
}
.pk-center-text {
  text-align: center;
}
.pk-error {
  color: #b3261e;
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0;
}
.pk-code-label {
  font-size: 0.85rem;
  color: #4b6b5e;
  font-weight: 700;
}
.pk-code-big {
  font-family: ui-monospace, monospace;
  font-size: 2.6rem;
  font-weight: 800;
  letter-spacing: 0.35em;
  text-indent: 0.35em;
  color: #0b6e4f;
  background: #e8f6ef;
  border: 2px dashed #0f9d76;
  border-radius: 14px;
  padding: 10px 16px;
  text-align: center;
}
.pk-code-med {
  font-family: ui-monospace, monospace;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: #0b6e4f;
}
.pk-invite-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pk-invite-row input[type='text'] {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 1rem;
  padding: 10px 12px;
  border: 2px solid #cfe6da;
  border-radius: 10px;
  background: #fff;
  min-height: 44px;
}
.pk-invite-link {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.8rem;
  font-family: ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f2faf6;
  border: 1px solid #d9efe4;
  border-radius: 10px;
  padding: 10px;
}
.pk-stepper {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.pk-stepper-val {
  min-width: 3.5ch;
  text-align: center;
  font-size: 1.15rem;
  font-weight: 800;
}
.pk-form-row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pk-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #f2faf6;
  border: 1px solid #d9efe4;
  border-radius: 12px;
  padding: 10px 12px;
}
.pk-switch {
  flex: 0 0 auto;
  width: 52px;
  height: 30px;
  border-radius: 999px;
  border: 2px solid #bfe3d2;
  background: #e8f6ef;
  position: relative;
  cursor: pointer;
  padding: 0;
}
.pk-switch .pk-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: left 0.18s ease;
}
.pk-switch.on {
  background: #0f9d76;
  border-color: #0f9d76;
}
.pk-switch.on .pk-switch-knob {
  left: 24px;
}
.pk-textarea {
  font-size: 1rem;
  padding: 10px 12px;
  border: 2px solid #cfe6da;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  resize: vertical;
}
.pk-field textarea {
  width: 100%;
}

/* room card (join flow) */
.pk-roomcard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f2faf6;
  border: 1px solid #d9efe4;
  border-radius: 12px;
  padding: 12px;
}
.pk-roomcard-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.pk-occupancy {
  font-weight: 800;
  color: #0b6e4f;
}
.pk-houserules {
  border-top: 1px solid #d9efe4;
  padding-top: 8px;
}
.pk-houserules p {
  margin: 4px 0 0;
  font-size: 0.9rem;
  white-space: pre-wrap;
}
.pk-buyin-selected {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0b6e4f;
  text-align: center;
  background: #e8f6ef;
  border-radius: 10px;
  padding: 8px;
}

/* lobby */
.pk-lobby-code-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.pk-lobby-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pk-lobby-list-compact {
  margin-top: 4px;
}
.pk-player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #d9efe4;
  border-radius: 10px;
  padding: 6px 10px;
}
.pk-player-name {
  flex: 1 1 auto;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pk-conn {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.pk-conn.on {
  background: #16a34a;
}
.pk-conn.off {
  background: #d63b3b;
}
.pk-ready {
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}
.pk-ready.yes {
  color: #0b6e4f;
}
.pk-ready.no {
  color: #8a9a92;
}

/* table extras */
.pk-reconnect,
.pk-sitout,
.pk-paused-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  padding: 10px;
  font-weight: 700;
}
.pk-reconnect {
  background: #fff7dd;
  border: 1px solid #e8c95a;
  color: #7a5c06;
}
.pk-sitout {
  background: #eef2f1;
  border: 1px solid #cfd8d4;
  color: #4b5a54;
}
.pk-paused-banner {
  background: #e0f2f8;
  border: 1px solid #9ed3e8;
  color: #0c6a89;
}
.pk-timer {
  font-weight: 800;
  color: #b3541e;
}

/* compact seats for 7\u20138 player tables */
.pk-many .pk-seat {
  width: 76px;
  padding: 4px 2px;
}
.pk-many .pk-seat-name,
.pk-many .pk-seat-chips {
  font-size: 0.68rem;
}
.pk-many .pk-seat-bet {
  font-size: 0.64rem;
}

/* ---------- report ---------- */
.pk-saved-banner {
  background: #e8f6ef;
  border: 1px solid #0f9d76;
  color: #0b6e4f;
  font-weight: 800;
  border-radius: 12px;
  padding: 10px 14px;
  text-align: center;
}
.pk-rep-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pk-rep-room {
  font-size: 1.05rem;
}
.pk-rep-facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
}
.pk-rep-facts > div {
  background: #f2faf6;
  border: 1px solid #d9efe4;
  border-radius: 10px;
  padding: 8px 10px;
}
.pk-rep-facts dt {
  font-size: 0.75rem;
  color: #4b6b5e;
  font-weight: 700;
}
.pk-rep-facts dd {
  margin: 2px 0 0;
  font-size: 1.05rem;
  font-weight: 800;
}
.pk-rep-players {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pk-rep-player {
  border: 1px solid #d9efe4;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}
.pk-rep-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: none;
  border: 0;
  cursor: pointer;
  font-size: 1rem;
  text-align: left;
  min-height: 52px;
}
.pk-rep-rank {
  font-weight: 800;
  color: #8a9a92;
  min-width: 2.2ch;
}
.pk-rep-name {
  flex: 1 1 auto;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pk-rep-net {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.pk-net-pos {
  color: #0b7a3e;
}
.pk-net-neg {
  color: #b3261e;
}
.pk-net-zero {
  color: #5a6b64;
}
.pk-rep-caret {
  color: #8a9a92;
}
.pk-flag {
  font-size: 1rem;
}
.pk-rep-detail {
  margin: 0;
  padding: 4px 12px 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  border-top: 1px solid #eef5f1;
}
.pk-rep-detail dt {
  font-size: 0.75rem;
  color: #4b6b5e;
  font-weight: 700;
}
.pk-rep-detail dd {
  margin: 2px 0 0;
  font-weight: 700;
}
.pk-rep-rebuys {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
}
.pk-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}
.pk-past-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  text-align: left;
  background: #fff;
  border: 1px solid #d9efe4;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.95rem;
  min-height: 56px;
}
.pk-past-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* desktop: roomier report facts */
@media (min-width: 640px) {
  .pk-rep-facts {
    grid-template-columns: repeat(4, 1fr);
  }
  .pk-rep-detail {
    grid-template-columns: repeat(5, 1fr);
  }
}

/* print: just the report */
@media print {
  .gh-topbar,
  .gh-bottomnav,
  .pk-no-print {
    display: none !important;
  }
  .pk-wrap {
    display: block;
  }
  .pk-report {
    max-width: 100%;
  }
}

/* ---------- voice chat ---------- */
.pk-voicebar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: #ffffff;
  border: 2px solid #cfe6da;
  border-radius: 12px;
  padding: 8px 10px;
}
.pk-voice-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
  background: #b9c6c0;
}
.pk-voice-dot-on {
  background: #1d9e57;
}
.pk-voice-dot-joining {
  background: #d4a017;
  animation: pk-voicedotpulse 1s ease-in-out infinite;
}
.pk-voice-dot-err {
  background: #d64545;
}
@keyframes pk-voicedotpulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
.pk-voice-count {
  font-weight: 700;
  font-size: 0.9rem;
  color: #2f4a3f;
  margin-right: auto;
}
.pk-voice-btn {
  min-height: 44px;
  padding: 8px 14px;
  border: 2px solid #cfe6da;
  border-radius: 12px;
  background: #ffffff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  color: #1e3a2e;
}
.pk-voice-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.pk-voice-join {
  background: #1d9e57;
  border-color: #157a43;
  color: #ffffff;
}
.pk-voice-leave {
  color: #8a5a12;
}
.pk-voice-icon {
  padding: 8px 10px;
  font-size: 1.15rem;
  line-height: 1;
}
.pk-voice-off {
  background: #fdeeee;
  border-color: #f0b9b9;
}
.pk-voice-live {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1d9e57;
}
.pk-voice-settings {
  flex: 1 1 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px dashed #cfe6da;
  padding-top: 8px;
}
.pk-voice-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 140px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #2f4a3f;
}
.pk-voice-field select {
  min-height: 44px;
  border: 2px solid #cfe6da;
  border-radius: 10px;
  background: #fff;
  font-size: 0.95rem;
  padding: 6px 8px;
}
.pk-voice-settings .pk-hint {
  flex: 1 1 100%;
  margin: 0;
}
.pk-voice-error {
  flex: 1 1 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fdeeee;
  border: 1px solid #f0b9b9;
  border-radius: 10px;
  padding: 10px;
  font-weight: 700;
  color: #8c2f2f;
}
.pk-voice-error .pk-voice-btn {
  align-self: flex-start;
}

/* mic badges on the table avatars */
.pk-mic-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #bfe3d2;
  font-size: 0.72rem;
  line-height: 1;
  padding: 0 3px;
}
.pk-mic-speaking {
  border-color: #1d9e57;
  animation: pk-micring 1.1s ease-in-out infinite;
}
@keyframes pk-micring {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(29, 158, 87, 0.55);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(29, 158, 87, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pk-mic-speaking,
  .pk-voice-dot-joining {
    animation: none;
  }
}

/* Form controls must stay readable in both themes: theme background +
   theme text \u2014 never a hardcoded white box with inherited light text
   (which becomes invisible in dark mode). Range sliders excluded. */
.pk-field input:not([type='range']):not([type='checkbox']):not([type='radio']),
.pk-field select,
.pk-field textarea,
.pk-label + input,
.pk-invite-row input,
.pk-voice-field select {
  background-color: var(--surface);
  color: var(--text);
}
`,Y=document.createElement("style");Y.textContent=ln;document.head.appendChild(Y);var dn=["spades","hearts","diamonds","clubs"],cn=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];function q(){let n=[];for(let t of dn)for(let e=2;e<=14;e++)n.push({rank:e,suit:t});return n}function J(n,t=Math.random){let e=n.slice();for(let r=e.length-1;r>0;r--){let a=Math.floor(t()*(r+1)),i=e[r],d=e[a];e[r]=d,e[a]=i}return e}function D(n){return cn[n-2]??String(n)}function Q(n){switch(n){case"spades":return"\u2660";case"hearts":return"\u2665";case"diamonds":return"\u2666";case"clubs":return"\u2663"}}function W(n){return n==="hearts"||n==="diamonds"}function X(n){let t={spades:"s",hearts:"h",diamonds:"d",clubs:"c"};return`${n.rank===10?"T":D(n.rank)}${t[n.suit]}`}var fn={"high-card":0,"one-pair":1,"two-pair":2,"three-of-a-kind":3,straight:4,flush:5,"full-house":6,"four-of-a-kind":7,"straight-flush":8,"royal-flush":8};function P(n,t,e){return{category:fn[n],name:n,tiebreak:t,best:e}}function Z(n){let t=[...n];t[0]===14&&t.push(1);let e=1;for(let r=1;r<t.length;r++){let a=t[r-1],i=t[r];if(i===a-1){if(e++,e===5)return a+3}else i!==a&&(e=1)}return 0}function un(n,t){let e=[];for(let r of t){let a=n.get(r===1?14:r);a&&a.length>0&&e.push(a[0])}return e}function nn(n,t){let e=t===5?[5,4,3,2,14]:[t,t-1,t-2,t-3,t-4];return un(n,e)}function L(n,t,e){let r=[];for(let a of n){if(r.length>=e)break;t.has(a.rank)||r.push(a)}return r}function en(n){let t=[];if(Array.isArray(n))for(let o of n)o&&typeof o.rank=="number"&&typeof o.suit=="string"&&t.push(o);if(t.length===0)return P("high-card",[],[]);let e=[...t].sort((o,l)=>l.rank-o.rank);if(t.length<5)return P("high-card",e.map(o=>o.rank),e);let r=new Map;for(let o of e){let l=r.get(o.rank);l?l.push(o):r.set(o.rank,[o])}let a=[...r.entries()].map(([o,l])=>({rank:o,cards:l})).sort((o,l)=>l.cards.length-o.cards.length||l.rank-o.rank),i=new Map;for(let o of e){let l=i.get(o.suit);l?l.push(o):i.set(o.suit,[o])}let d=[...i.values()].find(o=>o.length>=5),s=[...r.keys()].sort((o,l)=>l-o);if(d){let o=[...new Set(d.map(m=>m.rank))].sort((m,y)=>y-m),l=Z(o);if(l>0){let m=new Map;for(let w of d){let x=m.get(w.rank);x?x.push(w):m.set(w.rank,[w])}let y=nn(m,l);return l===14?P("royal-flush",[14],y):P("straight-flush",[l],y)}}let h=a.find(o=>o.cards.length>=4);if(h){let o=L(e,new Set([h.rank]),1),l=[...h.cards.slice(0,4),...o],m=[h.rank,...o[0]?[o[0].rank]:[]];return P("four-of-a-kind",m,l)}let b=a.find(o=>o.cards.length>=3),f=b?a.find(o=>o!==b&&o.cards.length>=2):void 0;if(b&&f){let o=[...b.cards.slice(0,3),...f.cards.slice(0,2)];return P("full-house",[b.rank,f.rank],o)}if(d){let o=d.slice(0,5);return P("flush",o.map(l=>l.rank),o)}let c=Z(s);if(c>0)return P("straight",[c],nn(r,c));if(b){let o=L(e,new Set([b.rank]),2),l=[...b.cards.slice(0,3),...o];return P("three-of-a-kind",[b.rank,...o.map(m=>m.rank)],l)}let k=a.filter(o=>o.cards.length>=2).sort((o,l)=>l.rank-o.rank);if(k.length>=2){let o=k[0],l=k[1],m=L(e,new Set([o.rank,l.rank]),1),y=[...o.cards.slice(0,2),...l.cards.slice(0,2),...m];return P("two-pair",[o.rank,l.rank,...m[0]?[m[0].rank]:[]],y)}if(k.length===1){let o=k[0],l=L(e,new Set([o.rank]),3),m=[...o.cards.slice(0,2),...l];return P("one-pair",[o.rank,...l.map(y=>y.rank)],m)}let p=e.slice(0,5);return P("high-card",p.map(o=>o.rank),p)}function F(n,t){if(n.category!==t.category)return n.category>t.category?1:-1;let e=Math.min(n.tiebreak.length,t.tiebreak.length);for(let r=0;r<e;r++){let a=n.tiebreak[r],i=t.tiebreak[r];if(a!==i)return a>i?1:-1}return 0}function A(n,t){return t>=0&&t<n.length?n[t]:void 0}function j(n){return!n.eliminated&&n.chips>0}function z(n){return!n.folded&&!n.eliminated&&!n.allIn&&n.chips>0}function R(n,t,e){let r=n.length;for(let a=1;a<=r;a++){let i=(t+a)%r,d=n[i];if(d!==void 0&&e(d))return i}return-1}function mn(n){let t=0;for(let e of n)z(e)&&t++;return t}function tn(n,t,e){return((t-n)%e+e)%e}function kn(n){return{...n,hole:[...n.hole]}}function G(n){return{...n,players:n.players.map(kn),community:[...n.community],deck:[...n.deck],winners:n.winners.map(t=>({...t,winnerSeats:[...t.winnerSeats]})),showdown:n.showdown?n.showdown.map(t=>({...t,hole:[...t.hole],best:[...t.best]})):null}}function K(n,t){let e=Math.min(Math.max(0,t),n.chips);return n.chips-=e,n.bet+=e,n.handCommitted+=e,n.acted=!0,n.chips===0&&(n.allIn=!0),e}function Sn(n){let t=n.names.length;if(!Number.isInteger(t)||t<2||t>8)throw new Error(`poker: need 2-8 players, got ${t}`);if(n.isBot.length!==t)throw new Error("poker: names and isBot must have the same length");let{startingStack:e,smallBlind:r,bigBlind:a}=n;if(!(e>0)||!(r>0)||!(r<a)||!(a<=e))throw new Error("poker: need 0 < smallBlind < bigBlind <= startingStack");return{players:n.names.map((d,s)=>({seat:s,name:d,isBot:n.isBot[s]===!0,chips:e,bet:0,handCommitted:0,hole:[],folded:!1,allIn:!1,eliminated:!1,acted:!1})),button:-1,handNumber:0,street:"complete",community:[],deck:[],toCall:0,minRaiseTo:0,lastIncrement:0,actorSeat:-1,smallBlind:r,bigBlind:a,winners:[],showdown:null,random:n.random??Math.random}}function rn(n,t,e,r,a){let i=A(n.players,t);if(!i||i.chips<=0)return;let d=Math.min(e,i.chips);i.chips-=d,i.bet+=d,i.handCommitted+=d,i.chips===0&&(i.allIn=!0),a.push({kind:"blind",seat:i.seat,amount:d,blind:r})}function Pn(n){if(n.street!=="complete")return{ok:!1,error:"a hand is already in progress"};let t=n.players.filter(j);if(t.length<2)return{ok:!1,error:"need at least 2 players with chips to start a hand"};let e=G(n);if(e.handNumber+=1,e.button<0){let c=t[0];e.button=c?c.seat:0}else e.button=R(e.players,e.button,j);for(let c of e.players)c.bet=0,c.handCommitted=0,c.hole=[],c.folded=!1,c.allIn=!1,c.acted=!1;e.community=[],e.deck=J(q(),e.random),e.winners=[],e.showdown=null;let r=[],a=e.button;for(let c=0;c<t.length&&(a=R(e.players,a,j),!(a<0));c++)r.push(a);for(let c=0;c<2;c++)for(let k of r){let p=A(e.players,k),o=e.deck.pop();p&&o&&p.hole.push(o)}let i=[],d=t.length===2,s=d?e.button:R(e.players,e.button,j),h=R(e.players,s,j);rn(e,s,e.smallBlind,"small",i),rn(e,h,e.bigBlind,"big",i);let b=0;for(let c of e.players)b=Math.max(b,c.bet);e.toCall=b,e.lastIncrement=e.bigBlind,e.minRaiseTo=e.toCall+e.lastIncrement,e.street="preflop",i.push({kind:"deal"}),i.push({kind:"street",street:"preflop"});let f=A(e.players,e.button);return e.actorSeat=d&&f&&z(f)?e.button:R(e.players,d?e.button:h,z),e.actorSeat<0&&(on(e,i),_(e,i)),{ok:!0,state:e,events:i}}function Cn(n,t){if(n.street==="complete"||n.street==="showdown")return[];let e=A(n.players,t);if(!e||!z(e))return[];let r=[{type:"fold"}],a=n.toCall-e.bet;if(a<=0?r.push({type:"check"}):r.push({type:"call",amount:Math.min(a,e.chips)}),n.toCall===0)e.chips>=n.bigBlind&&r.push({type:"bet",min:n.bigBlind,max:e.chips});else{let i=e.bet+e.chips;i>=n.minRaiseTo&&e.chips>a&&r.push({type:"raise",minTo:n.minRaiseTo,maxTo:i,toCall:a})}return r.push({type:"all-in",amount:e.chips}),r}function zn(n,t,e){if(n.street==="complete"||n.street==="showdown")return{ok:!1,error:"no hand in progress"};if(t!==n.actorSeat)return{ok:!1,error:`seat ${t} is not the actor (actor is ${n.actorSeat})`};let r=G(n),a=A(r.players,t);if(!a||!z(a))return{ok:!1,error:`seat ${t} cannot act`};let i=[],d=r.toCall,s=d-a.bet;switch(e.type){case"fold":{a.folded=!0,a.acted=!0,i.push({kind:"action",seat:t,action:e,chips:0});break}case"check":{if(a.bet!==d)return{ok:!1,error:"cannot check facing a bet"};a.acted=!0,i.push({kind:"action",seat:t,action:e,chips:0});break}case"call":{if(s<=0)return{ok:!1,error:"nothing to call"};let f=K(a,Math.min(s,a.chips));i.push({kind:"action",seat:t,action:e,chips:f});break}case"bet":{if(d!==0)return{ok:!1,error:"cannot bet into an existing bet; raise instead"};let f=e.amount;if(!Number.isFinite(f)||f<r.bigBlind)return{ok:!1,error:`opening bet must be at least the big blind (${r.bigBlind})`};let c=f-a.bet;if(c<=0||c>a.chips)return{ok:!1,error:"invalid bet amount"};let k=K(a,c);i.push({kind:"action",seat:t,action:e,chips:k});break}case"raise":{if(d<=0)return{ok:!1,error:"nothing to raise; bet instead"};let f=e.amount;if(!Number.isFinite(f)||f<r.minRaiseTo)return{ok:!1,error:`raise must be to at least ${r.minRaiseTo}`};let c=f-a.bet;if(c<=0||c>a.chips)return{ok:!1,error:"invalid raise amount"};let k=K(a,c);i.push({kind:"action",seat:t,action:e,chips:k});break}case"all-in":{if(a.chips<=0)return{ok:!1,error:"no chips to go all-in with"};let f=K(a,a.chips);i.push({kind:"action",seat:t,action:e,chips:f});break}}if(!a.folded){let f=a.bet;if(f>d){let c=f-d;if(r.toCall=f,c>=r.lastIncrement){r.lastIncrement=c;for(let k of r.players)k.seat!==t&&z(k)&&(k.acted=!1)}r.minRaiseTo=r.toCall+r.lastIncrement}}let h=r.players.filter(f=>!f.folded&&!f.eliminated);if(h.length===1){let f=h[0];if(f)return sn(r,f,i),{ok:!0,state:r,events:i}}let b=R(r.players,t,f=>z(f)&&(!f.acted||f.bet<r.toCall));return b>=0?(r.actorSeat=b,{ok:!0,state:r,events:i}):(bn(r,i),{ok:!0,state:r,events:i})}function an(n,t){let e=n.street==="preflop"?"flop":n.street==="flop"?"turn":"river";n.deck.pop();let r=e==="flop"?3:1;for(let a=0;a<r;a++){let i=n.deck.pop();i&&n.community.push(i)}n.street=e,t.push({kind:"street",street:e})}function on(n,t){for(;n.street!=="river";)an(n,t)}function bn(n,t){if(n.street==="river"){_(n,t);return}for(let r of n.players)r.bet=0,r.acted=!1;n.toCall=0,n.lastIncrement=n.bigBlind,n.minRaiseTo=n.bigBlind,an(n,t);let e=n.players.filter(r=>!r.folded&&!r.eliminated);if(e.length===1){let r=e[0];r&&sn(n,r,t);return}if(mn(n.players)<=1){on(n,t),_(n,t);return}n.actorSeat=R(n.players,n.button,z)}function sn(n,t,e){let r=O(n);t.chips+=r;let a={potIndex:0,amount:r,winnerSeats:[t.seat],each:r,handName:"fold"};n.winners=[a],n.street="complete",n.actorSeat=-1;for(let i of n.players)i.bet=0,i.handCommitted=0;e.push({kind:"pot",result:a}),e.push({kind:"hand-end"})}function _(n,t){let e=[];for(let s of n.players)s.folded||s.eliminated||e.push({player:s,hand:en([...s.hole,...n.community])});let r=e.map(s=>({seat:s.player.seat,name:s.player.name,hole:[...s.player.hole],handName:s.hand.name,best:[...s.hand.best]}));t.push({kind:"showdown",players:r});let a=Array.from(new Set(n.players.map(s=>s.handCommitted).filter(s=>s>0))).sort((s,h)=>s-h),i=[],d=0;for(let s of a){let h=s-d;d=s;let b=0;for(let v of n.players)v.handCommitted>=s&&b++;let f=h*b;if(f<=0)continue;let c=e.filter(v=>v.player.handCommitted>=s),k=c[0];if(!k)continue;let p=k;for(let v of c)F(v.hand,p.hand)>0&&(p=v);let o=c.filter(v=>F(v.hand,p.hand)===0),l=Math.floor(f/o.length),m=f-l*o.length,y=[...o].sort((v,S)=>tn(n.button,v.player.seat,n.players.length)-tn(n.button,S.player.seat,n.players.length)),w=y.map(v=>v.player.seat);for(let v of y){let S=l;m>0&&(S+=1,m-=1),v.player.chips+=S}let x={potIndex:i.length,amount:f,winnerSeats:w,each:l,handName:p.hand.name};i.push(x),t.push({kind:"pot",result:x})}for(let s of n.players)!s.eliminated&&s.chips===0&&(s.eliminated=!0,t.push({kind:"eliminated",seat:s.seat}));n.winners=i,n.showdown=r,n.street="complete",n.actorSeat=-1;for(let s of n.players)s.bet=0,s.handCommitted=0;t.push({kind:"hand-end"})}function Nn(n,t,e){if(n.street!=="complete")return{ok:!1,error:"rebuys are only allowed between hands"};let r=A(n.players,t);if(!r)return{ok:!1,error:`no player at seat ${t}`};if(!r.eliminated)return{ok:!1,error:"player is not eliminated"};if(!(e>0))return{ok:!1,error:"rebuy amount must be positive"};let a=G(n),i=A(a.players,t);return i?(i.chips=e,i.eliminated=!1,{ok:!0,state:a}):{ok:!1,error:`no player at seat ${t}`}}function O(n){let t=0;for(let e of n.players)t+=e.handCommitted;return t}var N=B(M());function E({card:n,faceDown:t=!1,small:e=!1}){let{t:r}=T(),a=`pk-card${e?" pk-card-sm":""}`;if(t||!n)return(0,N.jsx)("div",{className:`${a} pk-card-back`,"aria-label":r("poker.faceDownCard"),children:(0,N.jsx)("span",{className:"pk-back-motif","aria-hidden":"true",children:"\u2660"})});let i=W(n.suit),d=D(n.rank),s=Q(n.suit);return(0,N.jsxs)("div",{className:`${a}${i?" pk-card-red":" pk-card-black"}`,"aria-label":X(n),role:"img",children:[(0,N.jsxs)("span",{className:"pk-corner pk-corner-tl","aria-hidden":"true",children:[d,s]}),(0,N.jsx)("span",{className:"pk-pip","aria-hidden":"true",children:s}),(0,N.jsxs)("span",{className:"pk-corner pk-corner-br","aria-hidden":"true",children:[d,s]})]})}var u=B(M());function H(n,t){let e=n;for(let[r,a]of Object.entries(t))e=e.split(`{${r}}`).join(String(a));return e}function gn(n,t){let e=(90+n*360/t)*Math.PI/180,r=50+41*Math.cos(e),a=52+39*Math.sin(e);return{left:`${r.toFixed(2)}%`,top:`${a.toFixed(2)}%`}}function jn({state:n,sbSeat:t,bbSeat:e,thinkingSeat:r,rankName:a,micBadges:i}){let{t:d}=T(),s=n.street==="complete",h=O(n),b=n.players.length,f=new Set;for(let p of n.winners)for(let o of p.winnerSeats)f.add(o);function c(p,o){switch(p){case"speaking":return H(d("poker.mpVoiceBadgeSpeaking"),{name:o});case"muted":return H(d("poker.mpVoiceBadgeMuted"),{name:o});case"error":return H(d("poker.mpVoiceBadgeError"),{name:o});case"on":default:return H(d("poker.mpVoiceBadgeOn"),{name:o})}}function k(p){switch(p){case"muted":return"\u{1F507}";case"error":return"\u26A0\uFE0F";case"speaking":case"on":default:return"\u{1F399}\uFE0F"}}return(0,u.jsx)("div",{className:`pk-table-wrap${b>6?" pk-many":""}`,children:(0,u.jsxs)("div",{className:"pk-felt",role:"img","aria-label":d("poker.playTitle"),children:[(0,u.jsxs)("div",{className:"pk-center",children:[(0,u.jsx)("div",{className:"pk-pot","aria-live":"polite",children:s&&n.winners.length>0?(0,u.jsx)("ul",{className:"pk-pot-list",children:n.winners.map(p=>{let o=p.winnerSeats.map(m=>n.players[m]?.name??"").filter(m=>m!=="").join(", "),l=n.winners.length>1?H(d("poker.sidePot"),{n:p.potIndex+1}):d("poker.pot");return(0,u.jsxs)("li",{className:"pk-pot-win",children:["\u{1F3C6} ",l,": ",o," +",p.amount," ",(0,u.jsxs)("span",{className:"pk-pot-hand",children:["(",a(p.handName),")"]})]},p.potIndex)})}):(0,u.jsxs)("span",{className:"pk-pot-current",children:[d("poker.pot"),": ",(0,u.jsx)("strong",{children:h})]})}),(0,u.jsx)("div",{className:"pk-community",children:Array.from({length:5},(p,o)=>{let l=n.community[o];return l?(0,u.jsx)(E,{card:l},`${o}-${l.rank}-${l.suit}`):(0,u.jsx)("div",{className:"pk-card pk-card-empty","aria-hidden":"true"},o)})})]}),n.players.map(p=>{let o=gn(p.seat,b),l=!s&&n.actorSeat===p.seat,m=s&&f.has(p.seat),y=s&&!p.folded&&p.hole.length===2,w=["pk-seat",l?"pk-seat-active":"",p.folded?"pk-seat-folded":"",m?"pk-seat-winner":"",p.eliminated?"pk-seat-out":""].filter(x=>x!=="").join(" ");return(0,u.jsxs)("div",{className:w,style:o,children:[(0,u.jsxs)("div",{className:"pk-seat-badges",children:[p.seat===n.button&&(0,u.jsx)("span",{className:"pk-badge pk-badge-dealer",title:d("poker.dealer"),children:"D"}),p.seat===t&&(0,u.jsx)("span",{className:"pk-badge pk-badge-blind",children:"SB"}),p.seat===e&&(0,u.jsx)("span",{className:"pk-badge pk-badge-blind",children:"BB"}),(()=>{let x=i?.get(p.seat);return x?(0,u.jsx)("span",{className:`pk-mic-badge${x==="speaking"?" pk-mic-speaking":""}`,title:c(x,p.name),"aria-label":c(x,p.name),role:"img",children:k(x)}):null})()]}),(0,u.jsx)(U,{name:p.name,size:38}),(0,u.jsxs)("div",{className:"pk-seat-name",children:[p.isBot&&(0,u.jsx)("span",{className:"pk-bot-badge",children:"\u{1F916}"}),(0,u.jsx)("span",{className:"pk-seat-name-text",children:p.name})]}),(0,u.jsxs)("div",{className:"pk-seat-chips",children:["\u26C1 ",p.chips]}),p.bet>0&&(0,u.jsxs)("div",{className:"pk-seat-bet",children:["\u{1FA99} ",p.bet]}),(0,u.jsx)("div",{className:"pk-seat-cards",children:p.hole.length===2?p.seat===0||y?(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(E,{card:p.hole[0],small:!0}),(0,u.jsx)(E,{card:p.hole[1],small:!0})]}):(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(E,{faceDown:!0,small:!0}),(0,u.jsx)(E,{faceDown:!0,small:!0})]}):null}),r===p.seat&&(0,u.jsx)("div",{className:"pk-thinking","aria-live":"polite",children:d("poker.thinking")}),m&&y&&(0,u.jsx)("div",{className:"pk-seat-hand",children:a(n.showdown?.find(x=>x.seat===p.seat)?.handName??"high-card")})]},p.seat)})]})})}var V=B(pn());var g=B(M());function I(n,t){let e=n;for(let[r,a]of Object.entries(t))e=e.split(`{${r}}`).join(String(a));return e}function $(n,t){for(let e of n)if(e.type===t)return e}function Dn({legal:n,onAction:t,pot:e,disabled:r=!1}){let{t:a}=T(),[i,d]=(0,V.useState)(null),[s,h]=(0,V.useState)(0),b=$(n,"fold"),f=$(n,"check"),c=$(n,"call"),k=$(n,"bet"),p=$(n,"raise"),o=$(n,"all-in"),l=i==="bet"?k?.min??0:p?.minTo??0,m=i==="bet"?k?.max??0:p?.maxTo??0;function y(S){d(S),h(S==="bet"?k?.min??0:p?.minTo??0)}function w(S){return Number.isFinite(S)?Math.min(m,Math.max(l,Math.round(S))):l}function x(S){h(w(e*S))}function v(){i==="bet"?t({type:"bet",amount:w(s)}):i==="raise"&&t({type:"raise",amount:w(s)}),d(null)}return(0,g.jsxs)("div",{className:"pk-actions","aria-label":a("poker.playTitle"),children:[c&&(0,g.jsx)("div",{className:"pk-tocall",children:I(a("poker.toCall"),{amount:c.amount})}),(0,g.jsxs)("div",{className:"pk-btn-row",children:[b&&(0,g.jsx)(C,{variant:"ghost",size:"lg",disabled:r,onClick:()=>t({type:"fold"}),children:a("poker.action_fold")}),f?(0,g.jsx)(C,{variant:"primary",size:"lg",disabled:r,onClick:()=>t({type:"check"}),children:a("poker.action_check")}):c&&(0,g.jsx)(C,{variant:"primary",size:"lg",disabled:r,onClick:()=>t({type:"call"}),children:I(a("poker.action_call"),{amount:c.amount})}),k?(0,g.jsx)(C,{variant:"secondary",size:"lg",disabled:r,onClick:()=>i==="bet"?d(null):y("bet"),children:a("poker.action_bet")}):p&&(0,g.jsx)(C,{variant:"secondary",size:"lg",disabled:r,onClick:()=>i==="raise"?d(null):y("raise"),children:a("poker.action_raise")}),o&&(0,g.jsx)(C,{variant:"danger",size:"lg",disabled:r,onClick:()=>t({type:"all-in"}),children:a("poker.action_allin")})]}),i&&(0,g.jsxs)("div",{className:"pk-amount",children:[(0,g.jsxs)("div",{className:"pk-amount-head",children:[(0,g.jsx)("span",{className:"pk-amount-label",children:a(i==="bet"?"poker.betAmount":"poker.raiseAmount")}),(0,g.jsxs)("span",{className:"pk-amount-range",children:[I(a("poker.minLabel"),{amount:l})," \xB7 ",I(a("poker.maxLabel"),{amount:m})]})]}),(0,g.jsxs)("div",{className:"pk-amount-row",children:[(0,g.jsx)("input",{type:"range",className:"pk-slider",min:l,max:m,step:1,value:w(s),disabled:r,"aria-label":a(i==="bet"?"poker.betAmount":"poker.raiseAmount"),onChange:S=>h(Number(S.target.value))}),(0,g.jsx)("input",{type:"number",className:"pk-number",min:l,max:m,value:w(s),disabled:r,"aria-label":a(i==="bet"?"poker.betAmount":"poker.raiseAmount"),onChange:S=>h(w(Number(S.target.value)))})]}),(0,g.jsxs)("div",{className:"pk-amount-row",children:[(0,g.jsx)(C,{variant:"secondary",size:"sm",disabled:r,onClick:()=>x(.5),children:a("poker.halfPot")}),(0,g.jsx)(C,{variant:"secondary",size:"sm",disabled:r,onClick:()=>x(1),children:a("poker.fullPot")}),(0,g.jsx)(C,{variant:"primary",size:"md",disabled:r,onClick:v,children:i==="bet"?I(a("poker.confirmBet"),{amount:w(s)}):I(a("poker.confirmRaise"),{amount:w(s)})})]})]})]})}export{X as a,en as b,Sn as c,Pn as d,Cn as e,zn as f,Nn as g,O as h,jn as i,Dn as j};
