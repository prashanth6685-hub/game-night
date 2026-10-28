import{a as X,b as Y}from"./chunk-NJDPCJSV.js";import{b as V}from"./chunk-MWJMEOZX.js";import{b as C}from"./chunk-AF66K5QL.js";import{b as H,c as xn,e as K,f as q,g as F,h as v,k as Q}from"./chunk-XTV564HM.js";var d=H(xn());var y=[{letter:"B",min:1,max:15},{letter:"I",min:16,max:30},{letter:"N",min:31,max:45},{letter:"G",min:46,max:60},{letter:"O",min:61,max:75}],P=2,I=2,f=75;function yn(e,t){return Math.floor(e()*t)}function Z(e,t){let o=e.slice();for(let a=o.length-1;a>0;a--){let n=yn(t,a+1),s=o[a];o[a]=o[n],o[n]=s}return o}function nn(e=Math.random){let t=[];for(let o of y)for(let a=o.min;a<=o.max;a+=1)t.push({n:a,letter:o.letter});return Z(t,e)}function en(e=Math.random){let t=[];for(let o=0;o<5;o+=1)t.push([null,null,null,null,null]);return y.forEach((o,a)=>{let n=[];for(let r=o.min;r<=o.max;r+=1)n.push(r);let s=Z(n,e).slice(0,5);for(let r=0;r<5;r+=1)r===P&&a===I||(t[r][a]=s[r])}),t}function tn(e,t,o,a){let n=e[t]?.[o];return n==null?!0:a.has(n)}var rn=(()=>{let e=[];for(let t=0;t<5;t+=1){let o=[],a=[];for(let n=0;n<5;n+=1)o.push([t,n]),a.push([n,t]);e.push(o,a)}return e.push([[0,0],[1,1],[2,2],[3,3],[4,4]]),e.push([[0,4],[1,3],[2,2],[3,1],[4,0]]),e})(),an=[[0,0],[0,4],[4,0],[4,4]];function $(e,t){let o=[],a=(s,r)=>tn(e,s,r,t);rn.some(s=>s.every(([r,g])=>a(r,g)))&&o.push("line"),an.every(([s,r])=>a(s,r))&&o.push("four-corners");let n=!0;for(let s=0;s<5&&n;s+=1)for(let r=0;r<5;r+=1)if(!a(s,r)){n=!1;break}return n&&o.push("blackout"),o}function on(e,t){let o=(r,g)=>tn(e,r,g,t),a=0;for(let r of rn){let g=r.filter(([S,M])=>o(S,M)).length;g>a&&(a=g)}let n=an.filter(([r,g])=>o(r,g)).length,s=0;for(let r=0;r<5;r+=1)for(let g=0;g<5;g+=1)o(r,g)&&(s+=1);return{line:a,corners:n,blackout:s}}function zn(e){return e.includes("blackout")?"blackout":e.includes("line")?"line":e.includes("four-corners")?"four-corners":null}var Sn=`/* Bingo: bingo-hall feel \u2014 bold column headers, ball display, daub pops. */

.bg-wrap {
  display: grid;
  gap: 12px;
  padding: 12px;
  max-width: 560px;
  margin: 0 auto;
}

.bg-desc {
  color: var(--muted);
  margin: 0 0 12px;
}

.bg-muted {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 8px 0 12px;
}

.bg-field {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.bg-label {
  font-weight: 700;
  font-size: 0.9rem;
}

.bg-field input {
  min-height: var(--tap);
  border-radius: var(--radius-sm);
  border: 2px solid var(--surface-2);
  padding: 0 12px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--surface);
  color: inherit;
}

.bg-count-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bg-seats {
  list-style: none;
  margin: 0 0 4px;
  padding: 0;
  display: grid;
  gap: 6px;
}

.bg-seat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-weight: 600;
}

.bg-seat__tag {
  margin-left: auto;
}

/* ---- Top bar ---- */

.bg-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bg-title {
  font-size: 1.2rem;
  font-weight: 800;
}

.bg-topbar__actions {
  display: flex;
  gap: 8px;
}

.bg-winbanner {
  padding: 12px 16px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  color: #fff;
  font-weight: 800;
  font-size: 1.1rem;
  text-align: center;
  box-shadow: var(--shadow);
  animation: bg-pop 0.3s ease-out;
}

/* ---- Caller ---- */

.bg-caller {
  display: flex;
  align-items: center;
  gap: 16px;
}

.bg-ball {
  flex: 0 0 auto;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 32% 30%, #fbbf24, #d97706 68%, #92400e);
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.45), inset 0 -6px 12px rgba(0, 0, 0, 0.2);
  animation: bg-pop 0.28s ease-out;
}

@keyframes bg-pop {
  0% { transform: scale(0.6); }
  55% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.bg-ball__letter {
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1;
}

.bg-ball__num {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1.1;
}

.bg-ball__waiting {
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  padding: 0 12px;
  line-height: 1.3;
}

.bg-caller__meta {
  flex: 1;
  display: grid;
  gap: 8px;
}

.bg-recent {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
}

.bg-chip {
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
}

.bg-count {
  font-size: 1rem;
  color: var(--muted);
}

/* ---- Human card ---- */

.bg-hint {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 0 0 10px;
}

.bg-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.bg-colhead {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 10px;
  font-size: 1.4rem;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.bg-colhead--B { background: #dc2626; }
.bg-colhead--I { background: #0ea5e9; }
.bg-colhead--N { background: #16a34a; }
.bg-colhead--G { background: #d97706; }
.bg-colhead--O { background: #7c3aed; }

.bg-cell {
  position: relative;
  min-height: 60px;
  border-radius: 12px;
  border: 2px solid var(--surface-2);
  background: var(--surface);
  font-family: inherit;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--primary-ink);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s ease;
}

.bg-cell:active {
  transform: scale(0.94);
}

.bg-cell--called {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.25);
}

.bg-cell:disabled {
  cursor: default;
}

.bg-cell--free {
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}

/* Daubed: filled bingo-dauber circle with a pop. */
.bg-cell--daubed {
  border-color: transparent;
  background: transparent;
}

.bg-cell__num {
  position: relative;
  z-index: 1;
  line-height: 1;
}

.bg-cell--daubed .bg-cell__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f472b6, #db2777 70%);
  color: #fff;
  font-size: 1.1rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 8px rgba(219, 39, 119, 0.5);
  animation: bg-pop 0.25s ease-out;
}

.bg-cell--free .bg-cell__num {
  width: auto;
  height: auto;
  border-radius: 999px;
  padding: 6px 10px;
  background: radial-gradient(circle at 35% 30%, #fbbf24, #d97706 70%);
  font-size: 0.65rem;
}

/* ---- Claim ---- */

.bg-claims {
  display: grid;
  gap: 8px;
}

.bg-claimhint {
  margin: 0;
  font-weight: 700;
  color: var(--success);
}

.bg-claim {
  animation: bg-pulse 1s ease-in-out infinite;
}

@keyframes bg-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.035); }
}

/* ---- Bot cards ---- */

.bg-bots {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.bg-bot {
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.bg-bot__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bg-bot__name {
  font-weight: 700;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bg-bot__count {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
}

.bg-minigrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
}

.bg-minicell {
  aspect-ratio: 1;
  border-radius: 4px;
  background: var(--surface);
  border: 1px solid var(--muted);
  opacity: 0.5;
}

.bg-minicell--on {
  background: var(--success);
  border-color: var(--success);
  opacity: 1;
}

.bg-bot__prog {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
}
`,ln=document.createElement("style");ln.textContent=Sn;document.head.appendChild(ln);var l=H(q());function Un(e){return{drawn:[],current:null,nextDrawAt:Date.now()+e*1e3,winnerSeat:null,winnerName:null}}var vn={line:5,"four-corners":4,blackout:25};function b(e,t){let o=e;for(let[a,n]of Object.entries(t))o=o.split(`{${a}}`).join(String(n));return o}function N(e){switch(e){case"line":return"bingo.patternLine";case"four-corners":return"bingo.patternFourCorners";case"blackout":return"bingo.patternBlackout"}}function sn(e){return e==="line"||e==="four-corners"||e==="blackout"}function k(e){return y.find(t=>e>=t.min&&e<=t.max)?.letter??""}function Cn(e){if(typeof e!="object"||e===null)return null;let t=e;if(!Array.isArray(t.drawn))return null;let o=[],a=new Set;for(let n of t.drawn){if(typeof n!="number"||!Number.isInteger(n)||n<1||n>f||a.has(n))return null;a.add(n),o.push(n)}return t.current!==null&&(typeof t.current!="number"||!a.has(t.current))||typeof t.nextDrawAt!="number"||!Number.isFinite(t.nextDrawAt)||t.winnerSeat!==null&&(typeof t.winnerSeat!="number"||!Number.isInteger(t.winnerSeat)||t.winnerSeat<0)||t.winnerName!==null&&typeof t.winnerName!="string"?null:{drawn:o,current:t.current,nextDrawAt:t.nextDrawAt,winnerSeat:t.winnerSeat,winnerName:t.winnerName}}function cn(e){if(!Array.isArray(e)||e.length!==5)return!1;let t=new Set;for(let o=0;o<5;o+=1){let a=e[o];if(!Array.isArray(a)||a.length!==5)return!1;for(let n=0;n<5;n+=1){let s=a[n];if(o===P&&n===I){if(s!==null)return!1;continue}let r=y[n];if(!r||typeof s!="number"||!Number.isInteger(s)||s<r.min||s>r.max||t.has(s))return!1;t.add(s)}}return t.size===24}function Nn(e){if(typeof e!="object"||e===null)return null;let t=e;return!sn(t.pattern)||!cn(t.card)?null:{card:t.card,pattern:t.pattern}}function kn(e){if(typeof e!="object"||e===null)return null;let t=e;return typeof t.seat!="number"||!Number.isInteger(t.seat)||t.seat<0?null:{seat:t.seat}}function Bn(e){return`mp-bingo-card-${e.toUpperCase()}`}function un(e){return`mp-bingo-daubs-${e.toUpperCase()}`}function _n(e){return`mp-bingo-order-${e.toUpperCase()}`}function Pn(e){let t=Bn(e);try{let a=localStorage.getItem(t);if(a){let n=JSON.parse(a);if(cn(n))return n}}catch{}let o=en();try{localStorage.setItem(t,JSON.stringify(o))}catch{}return o}function In(e){try{let t=localStorage.getItem(un(e));if(!t)return new Set;let o=JSON.parse(t);return Array.isArray(o)?new Set(o.filter(a=>typeof a=="number"&&Number.isInteger(a)&&a>=1&&a<=f)):new Set}catch{return new Set}}function Mn(e,t){try{localStorage.setItem(un(e),JSON.stringify([...t]))}catch{}}function Rn(e){if(!Array.isArray(e)||e.length!==f)return!1;let t=new Set;for(let o of e){if(typeof o!="object"||o===null)return!1;let a=o;if(typeof a.n!="number"||!Number.isInteger(a.n)||a.n<1||a.n>f||t.has(a.n)||a.letter!==k(a.n))return!1;t.add(a.n)}return t.size===f}function An(e){let t=_n(e);try{let a=localStorage.getItem(t);if(a){let n=JSON.parse(a);if(Rn(n))return n}}catch{}let o=nn();try{localStorage.setItem(t,JSON.stringify(o))}catch{}return o}function Dn({code:e,onFinish:t,onExit:o}){let a=V(e);return a?(0,l.jsx)(On,{code:e,onFinish:t,onExit:o,session:a}):null}function On({code:e,onFinish:t,onExit:o,session:a}){let{t:n}=K(),{toast:s}=Q(),r=X(a),[g]=(0,d.useState)(()=>Pn(e)),[S,M]=(0,d.useState)(()=>In(e)),[R,A]=(0,d.useState)(!1),[G,D]=(0,d.useState)(null),J=(0,d.useRef)(!1),O=(0,d.useRef)(!1),z=(0,d.useRef)(null),W=(0,d.useRef)(0),m=(0,d.useMemo)(()=>{let i=typeof r.config=="object"&&r.config!==null?r.config:{};return{pattern:sn(i.pattern)?i.pattern:"line",intervalSec:i.intervalSec===3||i.intervalSec===4||i.intervalSec===5?i.intervalSec:3}},[r.config]),c=(0,d.useMemo)(()=>Cn(r.state),[r.state]),j=(0,d.useRef)(null);(0,d.useEffect)(()=>{j.current=c},[c]);let w=(0,d.useMemo)(()=>new Set(c?.drawn??[]),[c?.drawn]),pn=(0,d.useMemo)(()=>$(g,w),[g,w]),B=c!==null&&c.winnerSeat===null&&pn.includes(m.pattern),E=(0,d.useMemo)(()=>on(g,w),[g,w]),dn=m.pattern==="line"?E.line:m.pattern==="four-corners"?E.corners:E.blackout;if((0,d.useEffect)(()=>{if(!r.isHost||r.status!=="playing")return;let i=window.setInterval(()=>{(async()=>{if(O.current)return;let u=j.current;if(!u||u.winnerSeat!==null||u.drawn.length>=f||Date.now()<u.nextDrawAt)return;z.current||(z.current=An(e));let p=z.current[u.drawn.length];if(p){O.current=!0;try{await r.postState({drawn:[...u.drawn,p.n],current:p.n,nextDrawAt:Date.now()+m.intervalSec*1e3,winnerSeat:null,winnerName:null}),C("pop")}finally{O.current=!1}}})()},500);return()=>window.clearInterval(i)},[e,m.intervalSec,r.isHost,r.postState,r.status]),(0,d.useEffect)(()=>{let i=r.lastIntent;if(!(!i||i.seq===W.current)){if(W.current=i.seq,i.type==="bingo-claim-rejected"){if(kn(i.payload)?.seat===a.seat){let p=n("bingo.mpClaimRejected");A(!1),D(p),s(p,"error")}return}!r.isHost||i.type!=="bingo-claim"||(async()=>{let u=j.current;if(!u||u.winnerSeat!==null)return;let p=Nn(i.payload),_=new Set(u.drawn);if(!(p!==null&&p.pattern===m.pattern&&$(p.card,_).includes(p.pattern))){await r.sendIntent("bingo-claim-rejected",{seat:i.fromSeat});return}await r.postState({...u,winnerSeat:i.fromSeat,winnerName:i.fromName})&&await r.endGame({winnerSeat:i.fromSeat})})()}},[m.pattern,r.endGame,r.isHost,r.lastIntent,r.postState,r.sendIntent,a.seat,n,s]),(0,d.useEffect)(()=>{if(!c||c.winnerSeat===null||J.current)return;J.current=!0,C("win");let i=c.winnerSeat,u=c.winnerName??r.players.find(p=>p.seat===i)?.name??a.name;r.isHost&&r.endGame({winnerSeat:i}),t({title:b(n("bingo.winner"),{name:u}),winner:u,lines:[{label:n("bingo.winPattern"),value:n(N(m.pattern))},{label:n("bingo.ballsToWin"),value:String(c.drawn.length)}]})},[m.pattern,c,t,r.endGame,r.isHost,r.players,a.name,n]),r.status==="lobby"||!c)return(0,l.jsx)(Y,{room:r,onExit:o});let h=c.current,gn=c.drawn.slice(Math.max(0,c.drawn.length-6),Math.max(0,c.drawn.length-1)).reverse(),mn=r.players.find(i=>i.isHost)?.name??n("mp.host"),U=c.winnerSeat!==null?c.winnerName??r.players.find(i=>i.seat===c.winnerSeat)?.name??"":null;function bn(i){if(c?.winnerSeat!==null||!w.has(i))return;let u=new Set(S);u.has(i)?u.delete(i):u.add(i),M(u),Mn(e,u),C("click")}function fn(i){return i===null?n("bingo.free"):S.has(i)?b(n("bingo.cellDaubed"),{n:i}):w.has(i)?b(n("bingo.cellCalled"),{n:i}):b(n("bingo.cellNotCalled"),{n:i})}async function wn(){if(!(!B||R)){A(!0),D(null),C("correct");try{await r.sendIntent("bingo-claim",{card:g,pattern:m.pattern})}catch{let i=n("bingo.mpClaimRejected");A(!1),D(i),s(i,"error")}}}return(0,l.jsxs)("div",{className:"bg-wrap",children:[(0,l.jsxs)("div",{className:"mp-turn-banner",children:[r.isHost?n("bingo.mpHostCaller"):b(n("bingo.mpCaller"),{name:mn}),!r.connected&&(0,l.jsxs)("span",{children:[" \xB7 ",n("mp.reconnecting")]})]}),U?(0,l.jsx)("div",{className:"bg-winbanner","aria-live":"polite",children:b(n("bingo.winner"),{name:U})}):null,(0,l.jsx)(v,{children:(0,l.jsxs)("div",{className:"bg-caller",children:[(0,l.jsx)("div",{className:"bg-ball","aria-live":"polite","aria-label":h!==null?`${k(h)} ${h}`:n("bingo.waitingFirstBall"),children:h!==null?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)("span",{className:"bg-ball__letter",children:k(h)}),(0,l.jsx)("span",{className:"bg-ball__num",children:h})]}):(0,l.jsx)("span",{className:"bg-ball__waiting",children:n("bingo.waitingFirstBall")})},h??"none"),(0,l.jsxs)("div",{className:"bg-caller__meta",children:[(0,l.jsx)("div",{className:"bg-recent","aria-label":n("bingo.recentBalls"),children:gn.map(i=>(0,l.jsxs)("span",{className:"bg-chip",children:[k(i),i]},i))}),(0,l.jsxs)("div",{className:"bg-count","aria-live":"polite",children:[(0,l.jsx)("strong",{children:c.drawn.length})," / ",f]}),(0,l.jsx)("div",{className:"bg-count",children:b(n("bingo.mpPatternGoal"),{pattern:n(N(m.pattern))})})]})]})}),(0,l.jsxs)(v,{title:n("bingo.yourCard"),children:[(0,l.jsx)("p",{className:"bg-hint",children:n("bingo.mpDaubHint")}),(0,l.jsxs)("div",{className:"bg-grid",role:"group","aria-label":n("bingo.yourCard"),children:[y.map(i=>(0,l.jsx)("div",{className:`bg-colhead bg-colhead--${i.letter}`,"aria-hidden":"true",children:i.letter},i.letter)),g.map((i,u)=>i.map((p,_)=>{let x=u===P&&_===I,T=p!==null&&w.has(p),L=p!==null&&S.has(p),hn="bg-cell"+(x||L?" bg-cell--daubed":"")+(x?" bg-cell--free":"")+(T&&!L?" bg-cell--called":"");return(0,l.jsx)("button",{type:"button",className:hn,disabled:x||!T||c.winnerSeat!==null,"aria-pressed":x||L,"aria-label":fn(p),onClick:()=>{p!==null&&bn(p)},children:(0,l.jsx)("span",{className:"bg-cell__num",children:x?n("bingo.free"):p})},`${u}-${_}`)}))]})]}),c.winnerSeat===null?(0,l.jsxs)("div",{className:"bg-claims",children:[B?(0,l.jsx)("p",{className:"bg-claimhint",children:b(n("bingo.claimHint"),{pattern:n(N(m.pattern))})}):(0,l.jsx)("p",{className:"bg-hint",children:b(n("bingo.mpProgress"),{covered:dn,total:vn[m.pattern],pattern:n(N(m.pattern))})}),(0,l.jsx)("div",{className:B?"bg-claim":void 0,children:(0,l.jsx)(F,{variant:"success",size:"lg",fullWidth:!0,disabled:!B||R,onClick:()=>void wn(),children:R?n("bingo.mpClaimSent"):b(n("bingo.claim"),{pattern:n(N(m.pattern))})})}),G?(0,l.jsx)("p",{className:"mp-error",role:"alert",children:G}):null]}):null,(0,l.jsxs)(v,{title:n("bingo.mpDrawnNumbers"),children:[c.drawn.length>0?(0,l.jsx)("div",{className:"bg-recent","aria-label":n("bingo.mpDrawnNumbers"),children:c.drawn.map(i=>(0,l.jsxs)("span",{className:"bg-chip",children:[k(i),i]},i))}):(0,l.jsx)("p",{className:"bg-hint",children:n("bingo.waitingFirstBall")}),c.drawn.length>=f?(0,l.jsx)("p",{className:"bg-hint",children:n("bingo.mpAllBallsDrawn")}):null]}),(0,l.jsx)(v,{title:`${n("mp.players")} (${r.players.length})`,children:(0,l.jsx)("div",{className:"mp-players",children:r.players.map(i=>(0,l.jsxs)("div",{className:"mp-player",children:[(0,l.jsx)("span",{children:i.seat===a.seat?"\u2B50":"\u{1F464}"}),(0,l.jsxs)("span",{children:[i.name,i.seat===a.seat&&(0,l.jsxs)("span",{className:"mp-you",children:[" (",n("mp.you"),")"]})]}),i.isHost&&(0,l.jsx)("em",{className:"mp-host-badge",children:n("mp.host")})]},i.id))})}),(0,l.jsx)(F,{variant:"ghost",fullWidth:!0,onClick:o,children:n("mp.leave")})]})}export{y as a,P as b,I as c,f as d,nn as e,en as f,$ as g,on as h,zn as i,Un as j,Dn as k};
