import{a as mn,b as fn}from"./chunk-NJDPCJSV.js";import{b as pn}from"./chunk-MWJMEOZX.js";import{b as C}from"./chunk-AF66K5QL.js";import{b as Y,c as Mn,e as un,f as cn,g as O,m as dn}from"./chunk-XTV564HM.js";var y=Y(Mn());var F=new Set([0,13,26,39,8,21,34,47]),X=[0,13,26,39],Cn=["#ef4444","#22c55e","#eab308","#3b82f6"];function A(r,a){return((X[r]??0)+a)%52}function q(r=Math.random){return 1+Math.floor(r()*6)}function gn(r,a=[],s=Math.random){if(r.length<2||r.length>4)throw new Error(`ludo needs 2-4 players, got ${r.length}`);let n=r.map((c,d)=>({name:c,color:Cn[d]??"#888888",isBot:a[d]??!1,tokens:[-1,-1,-1,-1]}));return{players:n,turn:Math.floor(s()*n.length),winner:null,consecutiveSixes:0}}function Q(r,a){return a===6&&r.consecutiveSixes>=2}function U(r,a,s){if(Q(r,s))return[];let n=r.players[a];if(!n)return[];let c=[];return n.tokens.forEach((d,b)=>{d===-1?s===6&&c.push({token:b,from:-1,to:0}):d>=0&&d<57&&d+s<=57&&c.push({token:b,from:d,to:d+s})}),c}function bn(r,a,s){if(s.to<0||s.to>50)return 0;let n=A(a,s.to);if(F.has(n))return 0;let c=0;return r.players.forEach((d,b)=>{b!==a&&d.tokens.forEach(h=>{h>=0&&h<=50&&A(b,h)===n&&(c+=1)})}),c}function hn(r,a){return a===-1||a===57||a>=51||a<0?!0:F.has(A(r,a))}function Fn(r,a,s){if(s<0||s>50)return!1;let n=A(a,s);return F.has(n)?!1:r.players.some((c,d)=>d===a?!1:c.tokens.some(b=>{if(b<0||b>50)return!1;let h=(n-A(d,b)+52)%52;return h>=1&&h<=6}))}function xn(r,a,s,n){let c=r.players[a];if(!c)return{state:r,events:[],extraTurn:!1,capturedPlayers:[]};let d=[],b=c.tokens.map((v,R)=>R===s.token?s.to:v);s.from===-1&&d.push("leave-base"),s.to===57?d.push("token-home"):s.to>=0&&s.to<=50&&F.has(A(a,s.to))&&d.push("safe-landing");let h=s.to>=0&&s.to<=50?A(a,s.to):-1,D=h>=0&&!F.has(h),H=0,L=[],T=r.players.map((v,R)=>{if(R===a)return{...v,tokens:b};if(!D)return v;let P=v.tokens.map(t=>t>=0&&t<=50&&A(R,t)===h?-1:t),f=0;return P.forEach((t,K)=>{t===-1&&v.tokens[K]!==-1&&(f+=1)}),f>0&&(H+=f,L.push(R)),{...v,tokens:P}});H>0&&d.push("capture");let k=(T[a]?.tokens??[]).every(v=>v===57);k&&d.push("win");let _=!k&&n===6;return{state:{players:T,turn:k||_?a:(a+1)%T.length,winner:k?a:null,consecutiveSixes:_?r.consecutiveSixes+1:0},events:d,extraTurn:_,capturedPlayers:L}}function V(r){return{...r,turn:(r.turn+1)%r.players.length,consecutiveSixes:0}}function N(r){return r.tokens.filter(a=>a===57).length}function z(r){return r.tokens.reduce((a,s)=>a+(s===-1?0:s),0)}var Nn=`/* Ludo styles \u2014 mobile-first, 15x15 classic board, large touch targets. */

.lu-wrap {
  display: grid;
  gap: 12px;
  max-width: 560px;
  margin: 0 auto;
  padding: 4px 2px 24px;
}

/* ---- setup ---- */

.lu-setup {
  display: grid;
  gap: 14px;
}

.lu-field {
  display: grid;
  gap: 6px;
}

.lu-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
}

.lu-count-row {
  display: flex;
  gap: 8px;
}

.lu-seat {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.lu-seat input {
  min-height: var(--tap);
  border-radius: var(--radius-sm);
  border: 1px solid var(--muted);
  padding: 0 12px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--surface);
  color: inherit;
  width: 100%;
  box-sizing: border-box;
}

.lu-seat__head {
  display: flex;
  align-items: center;
  gap: 8px;
  grid-column: 1 / -1;
}

.lu-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex: none;
}

.lu-seat__name {
  font-weight: 700;
}

.lu-kind {
  display: flex;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--muted);
}

.lu-kind button {
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
  min-height: var(--tap);
}

.lu-kind button.lu-kind--on {
  background: var(--primary);
  color: #fff;
}

/* ---- play topbar / dice ---- */

.lu-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lu-turn {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.lu-turn-text {
  font-weight: 800;
  font-size: 1.05rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lu-topbar__actions {
  display: flex;
  gap: 8px;
  flex: none;
}

.lu-dice-row {
  display: flex;
  justify-content: center;
}

.lu-dice {
  font-size: 3.2rem;
  line-height: 1;
  background: var(--surface);
  border: 3px solid var(--primary);
  border-radius: 18px;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  box-shadow: var(--shadow);
}

.lu-dice:disabled {
  opacity: 0.55;
  cursor: default;
}

.lu-dice--rolling {
  animation: lu-shake 0.12s linear infinite;
}

@keyframes lu-shake {
  0% { transform: rotate(-8deg) scale(1.05); }
  50% { transform: rotate(8deg) scale(0.97); }
  100% { transform: rotate(-8deg) scale(1.05); }
}

.lu-message {
  min-height: 1.6em;
  text-align: center;
  font-weight: 600;
}

/* ---- board ---- */

.lu-board {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  grid-template-rows: repeat(15, 1fr);
  aspect-ratio: 1 / 1;
  width: 100%;
  gap: 1px;
  background: var(--muted);
  border: 2px solid var(--muted);
  border-radius: 12px;
  overflow: hidden;
  touch-action: manipulation;
}

.lu-cell {
  position: relative;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
}

.lu-cell--hl {
  outline: 3px solid var(--accent);
  outline-offset: -3px;
  z-index: 5;
}

.lu-star {
  color: var(--accent);
  font-size: clamp(8px, 2.6vw, 15px);
  line-height: 1;
}

.lu-start-mark {
  width: 55%;
  height: 55%;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
}

/* base (6x6 corner) */

.lu-base {
  border-radius: 6px;
  padding: 12%;
  box-sizing: border-box;
}

.lu-base__inner {
  width: 100%;
  height: 100%;
  background: var(--surface);
  border-radius: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  place-items: center;
  padding: 10%;
  box-sizing: border-box;
}

.lu-spot {
  width: 78%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: var(--surface-2);
  border: 2px dashed var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* tokens */

.lu-token {
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  box-sizing: border-box;
}

.lu-spot .lu-token,
.lu-center-cell .lu-token {
  width: 88%;
  height: 88%;
  font-size: clamp(8px, 2.4vw, 14px);
}

.lu-cell .lu-token {
  width: 92%;
  height: 92%;
  max-width: 34px;
  max-height: 34px;
  font-size: clamp(7px, 2vw, 11px);
}

.lu-tokens {
  position: absolute;
  inset: 4%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.lu-tokens .lu-token {
  pointer-events: auto;
  flex: none;
}

.lu-tokens .lu-token + .lu-token {
  margin-left: -28%;
}

.lu-token--movable {
  cursor: pointer;
  animation: lu-pulse 0.9s ease-in-out infinite;
  border: none;
  padding: 0;
  font-family: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

@keyframes lu-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.9); transform: scale(1); }
  50% { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0); transform: scale(1.12); }
}

.lu-count {
  position: absolute;
  right: -2px;
  bottom: -2px;
  background: var(--primary-ink);
  color: var(--bg);
  border-radius: 999px;
  font-size: clamp(7px, 2vw, 10px);
  font-weight: 800;
  padding: 0 4px;
  line-height: 1.5;
  pointer-events: none;
}

/* center home cell */

.lu-center-cell {
  background: var(--surface-2);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  place-items: center;
  padding: 8%;
  box-sizing: border-box;
  gap: 2px;
}

.lu-center-deco {
  border-radius: 4px;
  opacity: 0.55;
}

/* ---- move options ---- */

.lu-moves {
  display: grid;
  gap: 8px;
}

.lu-standings {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lu-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 2px solid;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--surface);
}

.lu-chip i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
}
`,vn=document.createElement("style");vn.textContent=Nn;document.head.appendChild(vn);var l=Y(cn());function Yn(r){return{game:gn(r,r.map(()=>!1)),dice:null,phase:"roll"}}var Ln=["\u2680","\u2681","\u2682","\u2683","\u2684","\u2685"],kn=[[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]],Sn=[[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]],_n=[[0,0],[0,9],[9,9],[9,0]],Pn=new Set([8,21,34,47]),wn=new Map;kn.forEach(([r,a],s)=>wn.set(`${r},${a}`,s));var En=new Map;Sn.forEach((r,a)=>r.forEach(([s,n],c)=>En.set(`${s},${n}`,{player:a,step:c})));function g(r,a){let s=r;for(let[n,c]of Object.entries(a))s=s.split(`{${n}}`).join(String(c));return s}function yn(r,a,s){let n=r.players[a]?.tokens[s];if(n===void 0||n===-1||n===57)return null;if(n<=50){let d=kn[(X[a]+n)%52];return`${d[0]},${d[1]}`}let c=Sn[a][n-51];return`${c[0]},${c[1]}`}function $n({code:r,onFinish:a,onExit:s}){let n=pn(r);return n?(0,l.jsx)(Bn,{code:r,onFinish:a,onExit:s,session:n}):null}function Bn({onFinish:r,onExit:a,session:s}){let{t:n}=un(),c=mn(s),[d,b]=(0,y.useState)(!1),[h,D]=(0,y.useState)(!1),[H,L]=(0,y.useState)(null),[T,k]=(0,y.useState)(null),[_,v]=(0,y.useState)(null),R=(0,y.useRef)(!1),P=(0,y.useRef)(!1),f=c.state,t=f?.game??null;if((0,y.useEffect)(()=>{if(!T)return;let e=window.setTimeout(()=>k(null),3200);return()=>window.clearTimeout(e)},[T]),(0,y.useEffect)(()=>{if(!t||t.winner===null||R.current)return;R.current=!0,C("win");let e=t.players[t.winner],o=t.players.map((i,u)=>({p:i,i:u})).sort((i,u)=>N(u.p)-N(i.p)||z(u.p)-z(i.p));c.isHost&&c.endGame({winnerSeat:t.winner}),r({title:g(n("ludo.winner"),{name:e?.name??""}),winner:e?.name,lines:o.map(({p:i})=>({label:i.name,value:g(n("ludo.tokensHome"),{count:N(i)})}))})},[t,r,c,n]),c.status==="lobby"||!f||!t)return(0,l.jsx)(fn,{room:c,onExit:a});let K=s.seat,$=t.players[t.turn],S=t.turn===K&&t.winner===null,E=f.phase==="move",en=E&&f.dice!==null?U(t,t.turn,f.dice):[],tn=()=>{if(!S||E||d||P.current)return;P.current=!0,b(!0),k(null),v(null),C("dice");let e=window.setInterval(()=>L(q()),90);window.setTimeout(()=>{window.clearInterval(e);let o=q();L(o);let i=t.players[t.turn],u=()=>{b(!1),L(null),P.current=!1};if(!i){u();return}if(Q(t,o)){C("skip"),k(g(n("ludo.forfeit"),{name:i.name})),window.setTimeout(()=>{c.postState({game:V(t),dice:o,phase:"roll"}).then(u)},1e3);return}if(U(t,t.turn,o).length===0){C("skip"),k(g(n("ludo.noMoves"),{name:i.name})),window.setTimeout(()=>{c.postState({game:V(t),dice:o,phase:"roll"}).then(u)},1e3);return}c.postState({game:t,dice:o,phase:"move"}).then(u)},500)},on=e=>{if(!S||!E||f.dice===null||h)return;D(!0);let o=f.dice,i=t.players[t.turn],{state:u,events:p,extraTurn:m,capturedPlayers:x}=xn(t,t.turn,e,o),w=[];if(i)if(p.includes("capture")){C("correct");let j=x.map(J=>u.players[J]?.name??"").filter(J=>J!=="").join(", ");w.push(g(n("ludo.captured"),{name:i.name,victim:j}))}else p.includes("token-home")?(C("correct"),w.push(g(n("ludo.tokenHome"),{name:i.name}))):p.includes("leave-base")?w.push(g(n("ludo.leftBase"),{name:i.name})):p.includes("safe-landing")&&w.push(g(n("ludo.safeLanding"),{name:i.name}));m&&!p.includes("win")&&w.push(n("ludo.extraTurn")),k(w.join(" ")||null);let M=yn(u,t.turn,e.token);c.postState({game:u,dice:o,phase:"roll"}).then(()=>{D(!1),v(M),M&&window.setTimeout(()=>v(j=>j===M?null:j),1400)})};function rn(e,o){let i=e.from===-1?g(n("ludo.moveOut"),{token:e.token+1}):g(n("ludo.moveBy"),{token:e.token+1,roll:o}),u=[];return bn(t,t.turn,e)>0&&u.push(n("ludo.capturesTag")),e.to===57?u.push(n("ludo.finishesTag")):hn(t.turn,e.to)&&u.push(n("ludo.safeTag")),[i,...u].join(" ")}let an=new Map;S&&E&&en.forEach(e=>an.set(`${t.turn}:${e.token}`,e));let G=new Map,sn=t.players.map(()=>[]),I=t.players.map(()=>0);t.players.forEach((e,o)=>{e.tokens.forEach((i,u)=>{if(i===-1)sn[o].push(u);else if(i===57)I[o]+=1;else{let p=yn(t,o,u);if(p){let m=G.get(p);m?m.push({pi:o,ti:u}):G.set(p,[{pi:o,ti:u}])}}})});function W(e,o){let i=t.players[e],u=`${e}:${o}`,p=an.get(u)??null,m=`lu-token${p?" lu-token--movable":""}`;if(p&&f.dice!==null){let x=f.dice;return(0,l.jsx)("button",{type:"button",className:m,style:{backgroundColor:i.color},"aria-label":rn(p,x),disabled:h,onClick:()=>on(p),children:o+1},u)}return(0,l.jsx)("div",{className:m,style:{backgroundColor:i.color},title:i.name,children:o+1},u)}let B=[];wn.forEach((e,o)=>{let[i,u]=o.split(",").map(Number),p=X.indexOf(e),m=p>=0&&p<t.players.length?t.players[p].color:null,x=G.get(o)??[];B.push((0,l.jsxs)("div",{className:`lu-cell${_===o?" lu-cell--hl":""}`,style:{gridRow:i+1,gridColumn:u+1,backgroundColor:m??void 0},children:[m?(0,l.jsx)("span",{className:"lu-start-mark",style:{backgroundColor:m},"aria-hidden":!0}):Pn.has(e)?(0,l.jsx)("span",{className:"lu-star","aria-hidden":!0,children:"\u2605"}):null,x.length>0&&(0,l.jsxs)("div",{className:"lu-tokens",children:[x.slice(0,3).map(({pi:w,ti:M})=>W(w,M)),x.length>3&&(0,l.jsxs)("span",{className:"lu-count",children:["+",x.length-3]})]})]},o))}),En.forEach(({player:e,step:o},i)=>{if(e>=t.players.length)return;let[u,p]=i.split(",").map(Number),m=t.players[e].color,x=G.get(i)??[];B.push((0,l.jsxs)("div",{className:`lu-cell${_===i?" lu-cell--hl":""}`,style:{gridRow:u+1,gridColumn:p+1,backgroundColor:m,opacity:.92},children:[x.length>0&&(0,l.jsxs)("div",{className:"lu-tokens",children:[x.slice(0,3).map(({pi:w,ti:M})=>W(w,M)),x.length>3&&(0,l.jsxs)("span",{className:"lu-count",children:["+",x.length-3]})]}),o===5&&x.length===0&&(0,l.jsx)("span",{className:"lu-star",style:{color:"#fff"},"aria-hidden":!0,children:"\u2605"})]},i))}),B.push((0,l.jsx)("div",{className:"lu-cell lu-center-cell",style:{gridRow:8,gridColumn:8},children:t.players.map((e,o)=>(I[o]??0)>0?(0,l.jsx)("div",{className:"lu-token",style:{backgroundColor:e.color},title:`${e.name}: ${I[o]}`,children:I[o]},o):(0,l.jsx)("div",{className:"lu-center-deco",style:{backgroundColor:e.color,width:"55%",height:"55%"},"aria-hidden":!0},o))},"center")),[[6,6,0],[6,8,1],[8,8,2],[8,6,3]].forEach(([e,o,i])=>{i>=t.players.length||B.push((0,l.jsx)("div",{className:"lu-cell",style:{gridRow:e+1,gridColumn:o+1,backgroundColor:t.players[i].color,opacity:.35}},`corner-${e}-${o}`))}),t.players.forEach((e,o)=>{let[i,u]=_n[o],p=sn[o];B.push((0,l.jsx)("div",{className:"lu-cell lu-base",style:{gridRow:`${i+1} / span 6`,gridColumn:`${u+1} / span 6`,backgroundColor:e.color},children:(0,l.jsx)("div",{className:"lu-base__inner",children:[0,1,2,3].map(m=>(0,l.jsx)("div",{className:"lu-spot",children:p.includes(m)?W(o,m):null},m))})},`base-${o}`))});let Rn=t.players.map((e,o)=>({p:e,i:o})).sort((e,o)=>N(o.p)-N(e.p)||z(o.p)-z(e.p)),An=H??f.dice??6,ln=S&&!E&&!d&&t.winner===null,Tn=T??(E?S?n("ludo.chooseToken"):g(n("mp.waitingForTurn"),{name:$?.name??""}):d?n("ludo.rolling"):null);return(0,l.jsxs)("div",{className:"lu-wrap",children:[(0,l.jsxs)("div",{className:`mp-turn-banner${S?" mine":""}`,children:[S?`\u{1F3B2} ${n("mp.yourTurn")}`:g(n("ludo.turnOf"),{name:$?.name??""}),!c.connected&&(0,l.jsxs)("span",{children:[" \xB7 ",n("mp.reconnecting")]})]}),(0,l.jsxs)("div",{className:"lu-topbar",children:[(0,l.jsxs)("div",{className:"lu-turn",children:[(0,l.jsx)(dn,{name:$?.name??"?",color:$?.color??"#888",size:44}),(0,l.jsx)("span",{className:"lu-turn-text",children:g(n("ludo.turnOf"),{name:$?.name??""})})]}),(0,l.jsx)("div",{className:"lu-topbar__actions",children:(0,l.jsx)(O,{variant:"ghost",size:"sm",onClick:a,children:n("mp.leave")})})]}),(0,l.jsx)("div",{className:"lu-dice-row",children:(0,l.jsx)("button",{type:"button",className:`lu-dice${d?" lu-dice--rolling":""}`,disabled:!ln,onClick:tn,"aria-label":n("ludo.rollDice"),children:(0,l.jsx)("span",{"aria-hidden":!0,children:Ln[An-1]??"\u2685"})})}),(0,l.jsx)("div",{className:"lu-message","aria-live":"polite",children:Tn??" "}),(0,l.jsx)(O,{variant:"primary",size:"lg",fullWidth:!0,disabled:!ln&&!(S&&E),onClick:tn,children:S?n(E?"ludo.chooseToken":"ludo.rollDice"):g(n("mp.waitingForTurn"),{name:$?.name??""})}),S&&E&&f.dice!==null&&(0,l.jsx)("div",{className:"lu-moves",role:"group","aria-label":n("ludo.chooseToken"),children:en.map(e=>(0,l.jsx)(O,{variant:"secondary",size:"lg",fullWidth:!0,disabled:h,onClick:()=>on(e),children:rn(e,f.dice)},e.token))}),(0,l.jsx)("div",{className:"lu-board",role:"img","aria-label":n("ludo.setupTitle"),children:B}),(0,l.jsx)("div",{className:"lu-standings","aria-label":n("ludo.standings"),children:Rn.map(({p:e,i:o})=>(0,l.jsxs)("span",{className:"lu-chip",style:{borderColor:e.color},children:[(0,l.jsx)("i",{style:{backgroundColor:e.color},"aria-hidden":!0}),e.name,o===K?` (${n("mp.you")})`:"",":"," ",g(n("ludo.tokensHome"),{count:N(e)})]},`${o}-${e.name}`))}),(0,l.jsx)(O,{variant:"ghost",fullWidth:!0,onClick:a,children:n("mp.leave")})]})}export{F as a,X as b,Cn as c,A as d,q as e,gn as f,Q as g,U as h,bn as i,hn as j,Fn as k,xn as l,V as m,N as n,z as o,Yn as p,$n as q};
