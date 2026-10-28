import{b as f,f as x}from"./chunk-XTV564HM.js";var E={1:38,4:14,9:31,21:42,28:84,36:44,51:67,71:91,80:100},D={16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,98:78},m={easy:{ladders:{2:23,6:45,11:28,15:34,17:52,22:58,25:68,36:44,42:63,62:85,74:92,81:98},snakes:{27:5,40:3,54:31,79:43,95:75}},medium:{ladders:E,snakes:D},hard:{ladders:{9:27,28:51,60:82},snakes:{16:6,24:8,32:10,38:12,47:26,49:11,56:53,62:19,64:36,71:29,78:33,87:24,93:73,98:78}}};function y(n){return m[n]}function B(n=Math.random){return 1+Math.floor(n()*6)}function b(n,e,t=m.medium){let r=n+e;if(r>100)return{pos:n,event:null,from:n};let l=t.ladders[r];if(l!==void 0)return{pos:l,event:"ladder",from:r};let o=t.snakes[r];return o!==void 0?{pos:o,event:"snake",from:r}:{pos:r,event:null,from:r}}function g(n){let e=9-Math.floor((n-1)/10),t=(n-1)%10,r=e%2===1?t:9-t;return{row:e,col:r}}var i=f(x());function d(n){let{row:e,col:t}=g(n);return{x:t*10+5,y:e*10+5}}function h(n,e){return{x:n.x-e.x,y:n.y-e.y}}function v(n){return Math.hypot(n.x,n.y)}function S(n){let e=v(n)||1;return{x:-n.y/e,y:n.x/e}}function w(n,e,t){return{x:n.x+(e.x-n.x)*t,y:n.y+(e.y-n.y)*t}}function z(n,e){return{x:n.x+e.x,y:n.y+e.y}}function k(n,e){return{x:n.x*e,y:n.y*e}}function C({from:n,to:e}){let t=d(n),r=d(e),l=h(r,t),o=k(S(l),1.7),s=Math.max(2,Math.round(v(l)/9)),c=[];for(let u=1;u<=s;u+=1){let a=u/(s+1),p=w(t,r,a);c.push((0,i.jsx)("line",{x1:p.x-o.x,y1:p.y-o.y,x2:p.x+o.x,y2:p.y+o.y,stroke:"#b45309",strokeWidth:.55,strokeLinecap:"round"},u))}return(0,i.jsxs)("g",{"aria-hidden":!0,children:[(0,i.jsx)("line",{x1:t.x-o.x,y1:t.y-o.y,x2:r.x-o.x,y2:r.y-o.y,stroke:"#92400e",strokeWidth:.85,strokeLinecap:"round"}),(0,i.jsx)("line",{x1:t.x+o.x,y1:t.y+o.y,x2:r.x+o.x,y2:r.y+o.y,stroke:"#92400e",strokeWidth:.85,strokeLinecap:"round"}),c]})}function L({from:n,to:e}){let t=d(n),r=d(e),l=h(r,t),o=S(l),s=[],c=14;for(let a=0;a<=c;a+=1){let p=a/c,T=Math.sin(p*Math.PI*2.4)*2.1*(1-p*.35);s.push(z(w(t,r,p),k(o,T)))}let u=s.map((a,p)=>`${p===0?"M":"L"}${a.x.toFixed(1)},${a.y.toFixed(1)}`).join(" ");return(0,i.jsxs)("g",{"aria-hidden":!0,children:[(0,i.jsx)("path",{d:u,fill:"none",stroke:"#16a34a",strokeWidth:1.15,strokeLinecap:"round",opacity:.9}),(0,i.jsx)("circle",{cx:t.x,cy:t.y,r:2.1,fill:"#15803d"}),(0,i.jsx)("circle",{cx:t.x-.7,cy:t.y-.6,r:.38,fill:"#fff"}),(0,i.jsx)("circle",{cx:t.x+.7,cy:t.y-.6,r:.38,fill:"#fff"})]})}function q({set:n}){return(0,i.jsxs)("svg",{className:"sl-overlay",viewBox:"0 0 100 100","aria-hidden":!0,focusable:"false",children:[Object.entries(n.ladders).map(([e,t])=>(0,i.jsx)(C,{from:Number(e),to:t},`l${e}`)),Object.entries(n.snakes).map(([e,t])=>(0,i.jsx)(L,{from:Number(e),to:t},`s${e}`))]})}function A(n){if(n<=0)return{left:"5%",top:"95%"};let e=d(n);return{left:`${e.x}%`,top:`${e.y}%`}}var M=["#ef4444","#3b82f6","#22c55e","#f59e0b"];function P(n,e,t="medium"){return{players:n.map((r,l)=>({name:r,color:M[l%M.length]??"#9ca3af",pos:0})),turn:0,winner:null,extraTurnOnSix:e,difficulty:t}}function W(n,e){let t=n.turn;if(t<0||t>=n.players.length)throw new RangeError(`invalid turn index ${t}`);let r=n.players.map(a=>({...a})),l=r[t],o=b(l.pos,e,y(n.difficulty));l.pos=o.pos;let s=n.winner;s===null&&o.pos===100&&(s=t);let c=n.extraTurnOnSix&&e===6&&s===null,u=s!==null||c?t:(t+1)%r.length;return{state:{players:r,turn:u,winner:s,extraTurnOnSix:n.extraTurnOnSix,difficulty:n.difficulty},event:o.event,extraTurn:c}}var O=`/* Snake & Ladder \u2014 mobile-first styles.
   The board scales to screen width (CSS grid, 1/1 aspect, max 520px).
   Move animation: the destination square pulses and the token appears
   there (snappy by design \u2014 smooth path animation is a future
   enhancement). */

.sl-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

/* ---------- setup ---------- */
.sl-setup {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sl-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sl-label {
  font-weight: 700;
  font-size: 0.95rem;
}
.sl-field input[type='text'],
.sl-field input:not([type]) {
  min-height: 48px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface-2);
  background: var(--surface);
  width: 100%;
}
.sl-count-row {
  display: flex;
  gap: 8px;
}
.sl-count-row .ui-btn {
  flex: 1;
  min-height: 48px;
}
.sl-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  font-weight: 600;
  cursor: pointer;
}
.sl-toggle input {
  width: 24px;
  height: 24px;
  accent-color: var(--primary);
  flex: none;
}

/* ---------- play ---------- */
.sl-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sl-turn {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.sl-turn-text {
  font-weight: 800;
  font-size: 1.05rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sl-dice-row {
  display: flex;
  justify-content: center;
}
.sl-dice {
  font-size: 3.5rem;
  line-height: 1;
}
/* The dice is a tap target: tap it to roll (same action as the Roll button). */
.sl-dice-btn {
  background: none;
  border: none;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.sl-dice-btn:disabled {
  cursor: default;
  opacity: 0.85;
}
.sl-dice-btn:not(:disabled):active {
  transform: scale(0.92);
}
.sl-dice-rolling {
  display: inline-block;
  animation: sl-spin 0.55s linear infinite;
}
@keyframes sl-spin {
  from { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.2); }
  to { transform: rotate(360deg) scale(1); }
}

.sl-message {
  min-height: 1.75em;
  text-align: center;
  font-weight: 600;
}

.sl-board {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
  border: 2px solid var(--surface-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface);
  position: relative;
}
.sl-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}
.sl-tokens {
  z-index: 3;
}
.sl-anim-token {
  position: absolute;
  width: 9%;
  aspect-ratio: 1 / 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: clamp(10px, 3vw, 16px);
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  z-index: 4;
  pointer-events: none;
}
.sl-anim-token.glide {
  transition:
    left 0.7s ease-in-out,
    top 0.7s ease-in-out;
}
.sl-anim-token.hop {
  transition:
    left 0.16s ease,
    top 0.16s ease;
}
.sl-cell {
  position: relative;
  border: 1px solid var(--surface-2);
  min-width: 0;
}
.sl-cell-alt {
  background: var(--surface-2);
}
.sl-num {
  position: absolute;
  top: 1px;
  left: 3px;
  font-size: clamp(7px, 1.8vw, 10px);
  color: var(--muted);
  font-weight: 600;
}
.sl-mark {
  position: absolute;
  right: 2px;
  bottom: 0;
  font-size: clamp(8px, 2vw, 12px);
  line-height: 1.2;
}
.sl-tokens {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.sl-token {
  width: 58%;
  aspect-ratio: 1 / 1;
  flex: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: clamp(8px, 2.4vw, 14px);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.sl-cell-hl {
  animation: sl-pulse 1s ease;
}
@keyframes sl-pulse {
  0% { box-shadow: inset 0 0 0 3px var(--accent); }
  100% { box-shadow: inset 0 0 0 0 transparent; }
}

.sl-standings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.sl-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 2px solid;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  background: var(--surface);
}
.sl-chip i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

/* ---- Vs Computer mode ---- */
.sl-bots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
`,R=document.createElement("style");R.textContent=O;document.head.appendChild(R);function V(n,e){return{game:P(n,e.extraTurnOnSix,e.difficulty),dice:6,lastRoll:null,lastEvent:null,lastMoverSeat:null,lastFrom:null}}export{y as a,B as b,b as c,g as d,q as e,A as f,P as g,W as h,V as i};
