var a="/api/mp/rooms";async function i(e,n,t){let s={"Content-Type":"application/json"};t&&(s["x-host-token"]=t);let o;try{o=await fetch(e,{method:"POST",headers:s,body:JSON.stringify(n??{})})}catch{throw new Error("network-error")}let r={};try{r=await o.json()}catch{}if(!o.ok)throw new Error(typeof r.error=="string"?r.error:`request-failed-${o.status}`);return r}async function g(e){let n;try{n=await fetch(e)}catch{throw new Error("network-error")}let t={};try{t=await n.json()}catch{}if(!n.ok)throw new Error(typeof t.error=="string"?t.error:`request-failed-${n.status}`);return t}var b={createRoom(e,n,t,s){return i(a,{gameId:e,hostName:n,config:t,maxPlayers:s})},getRoomInfo(e){return g(`${a}/${encodeURIComponent(e)}`)},joinRoom(e,n){return i(`${a}/${encodeURIComponent(e)}/join`,{name:n})},startGame(e,n,t){return i(`${a}/${encodeURIComponent(e)}/start`,{state:t},n)},postState(e,n,t,s,o){return i(`${a}/${encodeURIComponent(e)}/state`,{playerId:n,playerToken:t,state:s,baseVersion:o})},sendIntent(e,n,t,s,o,r){return i(`${a}/${encodeURIComponent(e)}/intent`,{playerId:n,playerToken:t,type:s,payload:o??null,toPlayerId:r})},endGame(e,n,t){return i(`${a}/${encodeURIComponent(e)}/end`,{results:t??null},n)},getSnapshot(e,n){let t="hostToken"in n?`hostToken=${encodeURIComponent(n.hostToken)}`:`playerId=${encodeURIComponent(n.playerId)}&playerToken=${encodeURIComponent(n.playerToken)}`;return g(`${a}/${encodeURIComponent(e)}/state?${t}`)}},w=["hello","players","started","state","intent","ended"];function h(e,n,t,s){let o=!1,r=null,p=1e3,d=null,y=n.role==="host"?`role=host&token=${encodeURIComponent(n.token)}`:`role=player&playerId=${encodeURIComponent(n.playerId)}&token=${encodeURIComponent(n.token)}`,m=()=>{if(!o){r=new EventSource(`${a}/${encodeURIComponent(e)}/events?${y}`);for(let l of w)r.addEventListener(l,f=>{let k=f;try{let c=JSON.parse(k.data);t(l==="hello"?{type:"hello",snapshot:c}:l==="intent"?{type:"intent",intent:c}:{type:l,...c})}catch{}});r.onerror=()=>{r?.close(),r=null,!o&&(s?.(new Error("stream-error")),d=window.setTimeout(()=>{p=Math.min(p*2,15e3),m()},p))},r.onopen=()=>{p=1e3}}};return m(),()=>{o=!0,d!==null&&window.clearTimeout(d),r?.close(),r=null}}function I(e){return`${window.location.origin}/#/join/${e}`}var x=`/* Shared multi-phone (QR) multiplayer styles. */
.mp-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mp-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.mp-qr img {
  width: 220px;
  height: 220px;
  border-radius: 12px;
  background: #fff;
  padding: 8px;
}
.mp-code {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.3em;
  text-align: center;
}
.mp-players {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mp-player {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
}
.mp-player .mp-you {
  font-size: 0.8rem;
  opacity: 0.75;
}
.mp-host-badge {
  font-size: 0.72rem;
  font-style: normal;
  background: #4f46e5;
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
}
.mp-turn-banner {
  text-align: center;
  font-weight: 700;
  padding: 10px;
  border-radius: 12px;
  background: #eef2ff;
}
.mp-turn-banner.mine {
  background: #dcfce7;
}
.mp-banner {
  text-align: center;
  padding: 10px;
  border-radius: 12px;
  background: #fef9c3;
  font-weight: 600;
}
.mp-error {
  color: #b91c1c;
  text-align: center;
}
.mp-muted {
  opacity: 0.75;
  text-align: center;
}
.mp-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.mp-row > * {
  flex: 1;
}
`,u=document.createElement("style");u.textContent=x;document.head.appendChild(u);export{b as a,h as b,I as c};
