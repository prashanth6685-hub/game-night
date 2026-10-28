import{a as en,b as tn}from"./chunk-NJDPCJSV.js";import{b as j,e as nn}from"./chunk-MWJMEOZX.js";import{b as N}from"./chunk-AF66K5QL.js";import{b as L,c as yn,e as X,f as Y,g as v,h as C,q as Z}from"./chunk-XTV564HM.js";var l=L(yn());function kn(i,c){return c<=0?0:(i+1)%c}function Sn(i,c){return c<=0?0:Math.floor(i/c)}function In(i,c,d){return d===null?!1:Sn(i,c)>=d}function q(i){let c=0;for(let d=1;d<i.length;d++)(i[d]??0)>(i[c]??0)&&(c=d);return c}function an(i){if(i.length===0)return!1;let c=i[q(i)]??0;return i.filter(d=>d===c).length>1}var Cn=`/* Dumb Charades \u2014 mobile-first, portrait-friendly. Uses global CSS vars. */

.ch-screen {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 12px;
}

.ch-title {
  margin: 4px 0 0;
  font-size: 1.35rem;
  font-weight: 800;
  text-align: center;
}

.ch-section-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 2px 0 8px;
}

/* Segmented option rows (language, difficulty, timer, teams, rounds) */
.ch-segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ch-seg {
  flex: 1 1 auto;
  min-width: 0;
  min-height: var(--tap);
  padding: 10px 12px;
  border: 2px solid var(--surface-2);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.ch-seg[aria-pressed='true'] {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-ink);
}

/* Category grid */
.ch-catgrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.ch-cat {
  min-height: 76px;
  border: 2px solid var(--surface-2);
  border-radius: var(--radius);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
}

.ch-cat .ch-cat-icon {
  font-size: 1.7rem;
  line-height: 1;
}

.ch-cat[aria-pressed='true'] {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-ink);
}

/* Team name inputs */
.ch-teams-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ch-team-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ch-team-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex: none;
}

.ch-team-row input {
  flex: 1;
  min-height: var(--tap);
  border: 2px solid var(--surface-2);
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 10px 12px;
  font-size: 1rem;
  font-weight: 600;
}

/* Play phase */
.ch-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--surface);
  border-radius: var(--radius);
  padding: 12px 14px;
  box-shadow: var(--shadow);
}

.ch-banner-team {
  font-size: 1.15rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ch-chip {
  flex: none;
  background: var(--surface-2);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
}

.ch-wordcard {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px 16px;
  text-align: center;
}

.ch-word-hidden {
  min-height: var(--tap);
  padding: 12px 20px;
  border: 2px dashed var(--muted);
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 1.05rem;
  font-weight: 700;
}

.ch-word-hint {
  font-size: 0.85rem;
  color: var(--muted);
}

.ch-word-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ch-word-main {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.ch-word-sub {
  font-size: 1.1rem;
  color: var(--muted);
  font-weight: 600;
}

.ch-word-hide {
  margin-top: 4px;
  min-height: var(--tap);
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-weight: 700;
}

.ch-timeup {
  font-size: 1.6rem;
  font-weight: 800;
  animation: ch-pop 0.5s ease;
}

@keyframes ch-pop {
  0% { transform: scale(0.7); }
  60% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.ch-timerwrap {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ch-timer {
  font-size: 2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  min-width: 3.2em;
  text-align: center;
}

.ch-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ch-actions .ui-btn {
  min-height: 56px;
  font-size: 1.05rem;
}

.ch-turnrow {
  display: flex;
  gap: 10px;
}

.ch-turnrow .ui-btn {
  flex: 1;
  min-height: var(--tap);
}

.ch-endgame {
  margin-top: 2px;
}

.ch-empty {
  text-align: center;
  color: var(--muted);
  padding: 32px 16px;
  font-size: 1rem;
}

/* AI custom category */
.ch-custom-row {
  display: flex;
  gap: 8px;
}

.ch-custom-input {
  flex: 1;
  min-width: 0;
  min-height: var(--tap);
  border: 2px solid var(--surface-2);
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 10px 12px;
  font-size: 1rem;
}

.ch-custom-input:focus {
  outline: none;
  border-color: var(--primary);
}

.ch-generating {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-weight: 600;
  color: var(--muted);
}

.ch-custom-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--primary-soft, #eef2ff);
  border: 2px dashed var(--primary);
  font-weight: 700;
}

.ch-custom-clear {
  flex: none;
  min-width: var(--tap);
  min-height: var(--tap);
  border: none;
  border-radius: 50%;
  background: transparent;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--muted);
}

/* Config dialog (opened from START): stacked option groups. */
.ch-dialog {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ch-dialog .ch-segmented {
  margin-bottom: 8px;
}

.ch-dialog .ch-teams-list {
  margin: 2px 0 8px;
}

.ch-gen-error {
  margin: 4px 0 8px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  font-weight: 600;
  font-size: 0.9rem;
}
`,rn=document.createElement("style");rn.textContent=Cn;document.head.appendChild(rn);var n=L(Y()),P=["#4f46e5","#16a34a","#f59e0b","#dc2626"],Tn=["A","B","C","D"];function Gn(i,c,d){let a=Math.max(1,c.teamCount),f=Array.from({length:a},(r,t)=>({name:d[t]??`Team ${Tn[t]??String(t+1)}`,score:0,seats:[]}));return[...i].sort((r,t)=>r.seat-t.seat).forEach((r,t)=>{let p=f[t%a];p&&p.seats.push(r.seat)}),{teams:f,currentTeam:0,actorSeat:null,actorIdxPerTeam:f.map(()=>0),turnsPlayedPerTeam:f.map(()=>0),phase:"between",turnEndsAt:null,lastResult:null}}function Mn(i,c){let d=i;for(let[a,f]of Object.entries(c))d=d.split(`{${a}}`).join(String(f));return d}function Nn({code:i,onFinish:c,onExit:d}){return j(i)?(0,n.jsx)(Pn,{code:i,onFinish:c,onExit:d}):null}function Pn({code:i,onFinish:c,onExit:d}){let{t:a}=X(),f=j(i);if(!f)return null;let r=en(f),t=r.state,p=r.config,[sn,B]=(0,l.useState)(null),[w,on]=(0,l.useState)(0),[D,G]=(0,l.useState)(0),[cn,k]=(0,l.useState)(null),[dn,ln]=(0,l.useState)(()=>Date.now()),[pn,I]=(0,l.useState)(!1),O=(0,l.useRef)(!1),U=(0,l.useRef)(0),m=(0,l.useRef)(!1),b=(0,l.useRef)(null);b.current=t;let z=(0,l.useRef)(null);z.current=p;let _=`mp-charades-wordidx-${i.toUpperCase()}`,F=()=>{let e=nn(i)??[];if(e.length===0)return null;let s=0;try{s=Number(sessionStorage.getItem(_)??"0")||0}catch{s=0}let o=e[s%e.length]??null;try{sessionStorage.setItem(_,String(s+1))}catch{}return o},K=(e,s)=>{let o=e.teams[s];if(!o||o.seats.length===0)return null;let u=e.actorIdxPerTeam[s]??0;return o.seats[u%o.seats.length]??null},R=async(e,s)=>{let o=b.current,u=z.current;if(!(!o||!u||o.phase!=="acting"||m.current)){m.current=!0;try{let x=o.currentTeam,H=o.teams.map((h,S)=>S===x&&s?{...h,score:h.score+1}:h),W=o.actorIdxPerTeam.map((h,S)=>S===x?h+1:h),y=o.turnsPlayedPerTeam.map((h,S)=>S===x?h+1:h),g=u.rounds!==null&&y.every(h=>h>=(u.rounds??0));await r.postState({...o,teams:H,actorIdxPerTeam:W,turnsPlayedPerTeam:y,currentTeam:g?x:(x+1)%Math.max(1,o.teams.length),actorSeat:null,phase:g?"finished":"between",turnEndsAt:null,lastResult:e})}finally{m.current=!1}}},V=async()=>{let e=b.current;if(!(!e||e.phase!=="acting"||e.actorSeat===null)&&!m.current){m.current=!0;try{let s=F();if(!s)return;k(s),await r.sendIntent("charades-word",{word:s},e.actorSeat),await r.postState({...e,lastResult:"pass"})}finally{m.current=!1}}},mn=async()=>{let e=b.current,s=z.current;if(!e||!s||e.phase!=="between"||m.current)return;let o=K(e,e.currentTeam);if(o===null)return;let u=F();if(u){m.current=!0;try{k(u),await r.sendIntent("charades-word",{word:u},o),await r.postState({...e,phase:"acting",actorSeat:o,turnEndsAt:Date.now()+s.timerSecs*1e3,lastResult:null})}finally{m.current=!1}}},un=async()=>{let e=b.current;if(!(!e||e.phase==="finished"||m.current)){m.current=!0;try{await r.postState({...e,phase:"finished",actorSeat:null,turnEndsAt:null})}finally{m.current=!1}}};(0,l.useEffect)(()=>{if(!t||t.phase!=="finished"||O.current)return;O.current=!0,N("win"),r.isHost&&r.endGame({teams:t.teams.map(g=>g.name)});let e=t.teams.map(g=>g.score),s=an(e),o=q(e),u=t.teams[o],x=a("charades.pts"),H=s?`\u{1F91D} ${a("charades.tie")}`:`\u{1F389} ${u?.name??""} ${a("charades.wins")}`,W=s?void 0:`${u?.name??""} \xB7 ${e[o]??0} ${x}`,y=t.teams.map(g=>({label:g.name,value:`${g.score} ${x}`}));p&&p.rounds!==null&&y.push({label:a("charades.rounds"),value:String(Math.min(...t.turnsPlayedPerTeam))}),c({title:H,winner:W,lines:y})},[t,p,c,r,a]),(0,l.useEffect)(()=>{let e=r.lastIntent;if(!e||e.seq<=U.current)return;if(U.current=e.seq,e.type==="charades-word"){let o=e.payload;o&&typeof o.word=="string"&&(B(o.word),on(e.seq));return}if(!r.isHost)return;let s=b.current;!s||s.phase!=="acting"||e.fromSeat!==s.actorSeat||(e.type==="charades-got"?R("got",!0):e.type==="charades-pass"&&V())},[r.lastIntent,r.isHost]);let A=t?.phase==="acting"?t.turnEndsAt:null;if((0,l.useEffect)(()=>{if(!r.isHost||A===null)return;let e=window.setInterval(()=>{Date.now()>=A&&(window.clearInterval(e),R("timeout",!1))},250);return()=>window.clearInterval(e)},[r.isHost,A,r.stateVersion]),(0,l.useEffect)(()=>{if(!t||t.phase!=="acting")return;let e=window.setInterval(()=>ln(Date.now()),500);return()=>window.clearInterval(e)},[t?.phase]),(0,l.useEffect)(()=>{t?.phase==="between"&&(B(null),k(null))},[t?.phase]),r.status==="lobby"||!t||!p)return(0,n.jsx)(tn,{room:r,onExit:d});let J=f.seat,E=t.teams[t.currentTeam],$=e=>r.players.find(s=>s.seat===e)?.name??"",hn=t.actorSeat!==null?$(t.actorSeat):"",fn=t.actorSeat!==null&&t.actorSeat===J,T=r.isHost?cn:sn,gn=t.phase==="acting"&&t.turnEndsAt!==null?Math.max(0,Math.ceil((t.turnEndsAt-dn)/1e3)):p.timerSecs,xn=t.turnsPlayedPerTeam.reduce((e,s)=>e+s,0),wn=p.rounds===null?`${a("charades.turn")} ${xn+1}`:`${a("charades.round")} ${Math.min(Math.min(...t.turnsPlayedPerTeam)+1,p.rounds)}/${p.rounds}`,Q=t.phase==="between"?K(t,t.currentTeam):null,bn=()=>{N("correct"),G(w),r.isHost?R("got",!0):r.sendIntent("charades-got")},vn=()=>{N("skip"),G(w),r.isHost?V():r.sendIntent("charades-pass")},M=t.lastResult==="got"?a("charades.mpLastGot"):t.lastResult==="timeout"?`\u23F0 ${a("charades.timeUp")}`:t.lastResult==="pass"?a("charades.mpLastPass"):null;return(0,n.jsxs)("div",{className:"ch-screen",children:[(0,n.jsxs)("div",{className:"ch-banner",children:[(0,n.jsxs)("span",{className:"ch-banner-team",children:[(0,n.jsx)("span",{className:"ch-team-dot",style:{background:P[t.currentTeam%P.length]}}),E?.name??""]}),(0,n.jsx)("span",{className:"ch-chip",children:wn})]}),(0,n.jsxs)("div",{className:"ch-turnrow",children:[(0,n.jsxs)("span",{className:"ch-chip",children:["\u2728 ",p.category]}),!r.connected&&(0,n.jsxs)("span",{className:"ch-chip",children:["\xB7 ",a("mp.reconnecting")]})]}),t.phase==="between"&&(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(C,{children:(0,n.jsxs)("div",{className:"ch-wordcard",children:[M&&t.lastResult!=="pass"&&(0,n.jsx)("span",{className:"ch-word-label",children:M}),(0,n.jsx)("span",{className:"ch-word-label",children:a("charades.mpNextUp")}),(0,n.jsxs)("span",{className:"ch-word-main",children:["\u{1F3AD} ",Q!==null?$(Q):""]}),(0,n.jsx)("span",{className:"ch-word-hint",children:E?.name??""})]})}),r.isHost?(0,n.jsx)(v,{variant:"primary",size:"lg",fullWidth:!0,onClick:()=>void mn(),children:a("charades.mpStartTurn")}):(0,n.jsx)("p",{className:"ch-word-hint",style:{textAlign:"center"},children:a("charades.mpWaitingStart")})]}),t.phase==="acting"&&(0,n.jsxs)(n.Fragment,{children:[fn?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(C,{children:(0,n.jsxs)("div",{className:"ch-wordcard",children:[(0,n.jsx)("span",{className:"ch-word-label",children:a("charades.yourWord")}),T?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)("span",{className:"ch-word-main",children:T}),(0,n.jsx)("span",{className:"ch-word-hint",children:a("charades.mpActNow")})]}):(0,n.jsx)("span",{className:"ch-word-hint",children:a("charades.mpWordIncoming")})]})}),(0,n.jsxs)("div",{className:"ch-actions",children:[(0,n.jsx)(v,{variant:"success",size:"lg",disabled:!T||w>0&&D>=w,onClick:bn,children:a("charades.mpGotIt")}),(0,n.jsx)(v,{variant:"secondary",size:"lg",disabled:!T||w>0&&D>=w,onClick:vn,children:a("charades.mpPassWord")})]})]}):(0,n.jsx)(C,{children:(0,n.jsxs)("div",{className:"ch-wordcard",children:[(0,n.jsx)("span",{className:"ch-word-main",style:{fontSize:"1.4rem"},children:Mn(a("charades.mpActing"),{actor:hn,team:E?.name??""})}),M&&t.lastResult==="pass"&&(0,n.jsx)("span",{className:"ch-word-label",children:M})]})}),(0,n.jsx)("div",{className:"ch-timerwrap",children:(0,n.jsxs)("span",{className:"ch-timer",children:[gn,a("charades.seconds")]})})]}),(0,n.jsx)(C,{title:a("charades.teams"),children:(0,n.jsx)("div",{className:"ch-teams-list",children:t.teams.map((e,s)=>(0,n.jsxs)("div",{children:[(0,n.jsxs)("div",{className:"ch-team-row",children:[(0,n.jsx)("span",{className:"ch-team-dot",style:{background:P[s%P.length]}}),(0,n.jsxs)("strong",{children:[e.name,s===t.currentTeam&&t.phase!=="finished"?" \u{1F3AD}":""]}),(0,n.jsxs)("span",{style:{marginLeft:"auto",fontWeight:700},children:[e.score," ",a("charades.pts")]})]}),(0,n.jsx)("div",{className:"ch-word-hint",style:{paddingLeft:24,textAlign:"left"},children:e.seats.map(o=>`${$(o)}${o===t.actorSeat?" \u{1F3AD}":""}${o===J?` (${a("mp.you")})`:""}`).join(", ")})]},e.name))})}),r.isHost&&p.rounds===null&&(0,n.jsx)("div",{className:"ch-endgame",children:(0,n.jsx)(v,{variant:"danger",fullWidth:!0,onClick:()=>I(!0),children:a("charades.finishGame")})}),(0,n.jsx)(v,{variant:"ghost",fullWidth:!0,onClick:d,children:a("mp.leave")}),(0,n.jsx)(Z,{open:pn,title:a("charades.confirmEndTitle"),message:a("charades.confirmEndMsg"),confirmLabel:a("charades.finishGame"),cancelLabel:a("common.cancel"),onConfirm:()=>{I(!1),un()},onCancel:()=>I(!1)})]})}export{kn as a,Sn as b,In as c,q as d,an as e,Gn as f,Nn as g};
