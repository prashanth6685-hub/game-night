import{a as $t,b as At}from"./chunk-NJDPCJSV.js";import{b as Xe}from"./chunk-MWJMEOZX.js";import{b as Ee}from"./chunk-AF66K5QL.js";import{b as Ce,c as ys,e as wt,f as Fe,g as Je,i as Ct,q as Et}from"./chunk-XTV564HM.js";var B=Ce(ys());function xs(a){return a!==null?{comment:a,variations:[]}:{variations:[]}}function Ss(a,t,e,s,n){let i={move:a,variations:n};return t&&(i.suffix=t),e&&(i.nag=e),s!==null&&(i.comment=s),i}function ks(...a){let[t,...e]=a,s=t;for(let n of e)n!==null&&(s.variations=[n,...n.variations],n.variations=[],s=n);return t}function ws(a,t){if(t.marker&&t.marker.comment){let e=t.root;for(;;){let s=e.variations[0];if(!s){e.comment=t.marker.comment;break}e=s}}return{headers:a,root:t.root,result:(t.marker&&t.marker.result)??void 0}}function Cs(a,t){function e(){this.constructor=a}e.prototype=t.prototype,a.prototype=new e}function be(a,t,e,s){var n=Error.call(this,a);return Object.setPrototypeOf&&Object.setPrototypeOf(n,be.prototype),n.expected=t,n.found=e,n.location=s,n.name="SyntaxError",n}Cs(be,Error);function et(a,t,e){return e=e||" ",a.length>t?a:(t-=a.length,e+=e.repeat(t),a+e.slice(0,t))}be.prototype.format=function(a){var t="Error: "+this.message;if(this.location){var e=null,s;for(s=0;s<a.length;s++)if(a[s].source===this.location.source){e=a[s].text.split(/\r\n|\n|\r/g);break}var n=this.location.start,i=this.location.source&&typeof this.location.source.offset=="function"?this.location.source.offset(n):n,h=this.location.source+":"+i.line+":"+i.column;if(e){var f=this.location.end,u=et("",i.line.toString().length," "),d=e[n.line-1],_=n.line===f.line?f.column:d.length+1,w=_-n.column||1;t+=`
 --> `+h+`
`+u+` |
`+i.line+" | "+d+`
`+u+" | "+et("",n.column-1," ")+et("",w,"^")}else t+=`
 at `+h}return t};be.buildMessage=function(a,t){var e={literal:function(d){return'"'+n(d.text)+'"'},class:function(d){var _=d.parts.map(function(w){return Array.isArray(w)?i(w[0])+"-"+i(w[1]):i(w)});return"["+(d.inverted?"^":"")+_.join("")+"]"},any:function(){return"any character"},end:function(){return"end of input"},other:function(d){return d.description}};function s(d){return d.charCodeAt(0).toString(16).toUpperCase()}function n(d){return d.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\0/g,"\\0").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/[\x00-\x0F]/g,function(_){return"\\x0"+s(_)}).replace(/[\x10-\x1F\x7F-\x9F]/g,function(_){return"\\x"+s(_)})}function i(d){return d.replace(/\\/g,"\\\\").replace(/\]/g,"\\]").replace(/\^/g,"\\^").replace(/-/g,"\\-").replace(/\0/g,"\\0").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/[\x00-\x0F]/g,function(_){return"\\x0"+s(_)}).replace(/[\x10-\x1F\x7F-\x9F]/g,function(_){return"\\x"+s(_)})}function h(d){return e[d.type](d)}function f(d){var _=d.map(h),w,g;if(_.sort(),_.length>0){for(w=1,g=1;w<_.length;w++)_[w-1]!==_[w]&&(_[g]=_[w],g++);_.length=g}switch(_.length){case 1:return _[0];case 2:return _[0]+" or "+_[1];default:return _.slice(0,-1).join(", ")+", or "+_[_.length-1]}}function u(d){return d?'"'+n(d)+'"':"end of input"}return"Expected "+f(a)+" but "+u(t)+" found."};function Es(a,t){t=t!==void 0?t:{};var e={},s=t.grammarSource,n={pgn:bt},i=bt,h="[",f='"',u="]",d=".",_="O-O-O",w="O-O",g="0-0-0",p="0-0",C="$",$="{",D="}",Q=";",Y="(",T=")",ie="1-0",O="0-1",N="1/2-1/2",Z="*",oe=/^[a-zA-Z]/,Ne=/^[^"]/,pe=/^[0-9]/,ae=/^[.]/,le=/^[a-zA-Z1-8\-=]/,ge=/^[+#]/,z=/^[!?]/,de=/^[^}]/,J=/^[^\r\n]/,ee=/^[ \t\r\n]/,Qe=H("tag pair"),Te=L("[",!1),ye=L('"',!1),He=L("]",!1),ze=H("tag name"),xe=V([["a","z"],["A","Z"]],!1,!1),qe=H("tag value"),Oe=V(['"'],!0,!1),Me=H("move number"),te=V([["0","9"]],!1,!1),Ge=L(".",!1),Se=V(["."],!1,!1),We=H("standard algebraic notation"),Ve=L("O-O-O",!1),Ie=L("O-O",!1),Ye=L("0-0-0",!1),Le=L("0-0",!1),b=V([["a","z"],["A","Z"],["1","8"],"-","="],!1,!1),A=V(["+","#"],!1,!1),ce=H("suffix annotation"),I=V(["!","?"],!1,!1),W=H("NAG"),ke=L("$",!1),Rt=H("brace comment"),Kt=L("{",!1),pt=V(["}"],!0,!1),Ft=L("}",!1),Dt=H("rest of line comment"),Ut=L(";",!1),gt=V(["\r",`
`],!0,!1),Bt=H("variation"),jt=L("(",!1),Qt=L(")",!1),Ht=H("game termination marker"),zt=L("1-0",!1),Gt=L("0-1",!1),Wt=L("1/2-1/2",!1),Vt=L("*",!1),Yt=H("whitespace"),dt=V([" ","	","\r",`
`],!1,!1),Zt=function(r,l){return ws(r,l)},Jt=function(r){return Object.fromEntries(r)},Xt=function(r,l){return[r,l]},es=function(r,l){return{root:r,marker:l}},ts=function(r,l){return ks(xs(r),...l.flat())},ss=function(r,l,c,y,x){return Ss(r,l,c,y,x)},ns=function(r){return r},rs=function(r){return r.replace(/[\r\n]+/g," ")},is=function(r){return r.trim()},os=function(r){return r},as=function(r,l){return{result:r,comment:l}},o=t.peg$currPos|0,me=[{line:1,column:1}],G=o,Re=t.peg$maxFailExpected||[],m=t.peg$silentFails|0,we;if(t.startRule){if(!(t.startRule in n))throw new Error(`Can't start parsing from rule "`+t.startRule+'".');i=n[t.startRule]}function L(r,l){return{type:"literal",text:r,ignoreCase:l}}function V(r,l,c){return{type:"class",parts:r,inverted:l,ignoreCase:c}}function ls(){return{type:"end"}}function H(r){return{type:"other",description:r}}function mt(r){var l=me[r],c;if(l)return l;if(r>=me.length)c=me.length-1;else for(c=r;!me[--c];);for(l=me[c],l={line:l.line,column:l.column};c<r;)a.charCodeAt(c)===10?(l.line++,l.column=1):l.column++,c++;return me[r]=l,l}function _t(r,l,c){var y=mt(r),x=mt(l),P={source:s,start:{offset:r,line:y.line,column:y.column},end:{offset:l,line:x.line,column:x.column}};return P}function v(r){o<G||(o>G&&(G=o,Re=[]),Re.push(r))}function cs(r,l,c){return new be(be.buildMessage(r,l),r,l,c)}function bt(){var r,l,c;return r=o,l=hs(),c=ps(),r=Zt(l,c),r}function hs(){var r,l,c;for(r=o,l=[],c=vt();c!==e;)l.push(c),c=vt();return c=U(),r=Jt(l),r}function vt(){var r,l,c,y,x,P,he;return m++,r=o,U(),a.charCodeAt(o)===91?(l=h,o++):(l=e,m===0&&v(Te)),l!==e?(U(),c=fs(),c!==e?(U(),a.charCodeAt(o)===34?(y=f,o++):(y=e,m===0&&v(ye)),y!==e?(x=us(),a.charCodeAt(o)===34?(P=f,o++):(P=e,m===0&&v(ye)),P!==e?(U(),a.charCodeAt(o)===93?(he=u,o++):(he=e,m===0&&v(He)),he!==e?r=Xt(c,x):(o=r,r=e)):(o=r,r=e)):(o=r,r=e)):(o=r,r=e)):(o=r,r=e),m--,r===e&&m===0&&v(Qe),r}function fs(){var r,l,c;if(m++,r=o,l=[],c=a.charAt(o),oe.test(c)?o++:(c=e,m===0&&v(xe)),c!==e)for(;c!==e;)l.push(c),c=a.charAt(o),oe.test(c)?o++:(c=e,m===0&&v(xe));else l=e;return l!==e?r=a.substring(r,o):r=l,m--,r===e&&(l=e,m===0&&v(ze)),r}function us(){var r,l,c;for(m++,r=o,l=[],c=a.charAt(o),Ne.test(c)?o++:(c=e,m===0&&v(Oe));c!==e;)l.push(c),c=a.charAt(o),Ne.test(c)?o++:(c=e,m===0&&v(Oe));return r=a.substring(r,o),m--,l=e,m===0&&v(qe),r}function ps(){var r,l,c;return r=o,l=yt(),U(),c=vs(),c===e&&(c=null),U(),r=es(l,c),r}function yt(){var r,l,c,y;for(r=o,l=Ze(),l===e&&(l=null),c=[],y=xt();y!==e;)c.push(y),y=xt();return r=ts(l,c),r}function xt(){var r,l,c,y,x,P,he,Ke;if(r=o,U(),gs(),U(),l=ds(),l!==e){for(c=ms(),c===e&&(c=null),y=[],x=St();x!==e;)y.push(x),x=St();for(x=U(),P=Ze(),P===e&&(P=null),he=[],Ke=kt();Ke!==e;)he.push(Ke),Ke=kt();r=ss(l,c,y,P,he)}else o=r,r=e;return r}function gs(){var r,l,c,y,x,P;for(m++,r=o,l=[],c=a.charAt(o),pe.test(c)?o++:(c=e,m===0&&v(te));c!==e;)l.push(c),c=a.charAt(o),pe.test(c)?o++:(c=e,m===0&&v(te));if(a.charCodeAt(o)===46?(c=d,o++):(c=e,m===0&&v(Ge)),c!==e){for(y=U(),x=[],P=a.charAt(o),ae.test(P)?o++:(P=e,m===0&&v(Se));P!==e;)x.push(P),P=a.charAt(o),ae.test(P)?o++:(P=e,m===0&&v(Se));l=[l,c,y,x],r=l}else o=r,r=e;return m--,r===e&&(l=e,m===0&&v(Me)),r}function ds(){var r,l,c,y,x,P;if(m++,r=o,l=o,a.substr(o,5)===_?(c=_,o+=5):(c=e,m===0&&v(Ve)),c===e&&(a.substr(o,3)===w?(c=w,o+=3):(c=e,m===0&&v(Ie)),c===e&&(a.substr(o,5)===g?(c=g,o+=5):(c=e,m===0&&v(Ye)),c===e&&(a.substr(o,3)===p?(c=p,o+=3):(c=e,m===0&&v(Le)),c===e))))if(c=o,y=a.charAt(o),oe.test(y)?o++:(y=e,m===0&&v(xe)),y!==e){if(x=[],P=a.charAt(o),le.test(P)?o++:(P=e,m===0&&v(b)),P!==e)for(;P!==e;)x.push(P),P=a.charAt(o),le.test(P)?o++:(P=e,m===0&&v(b));else x=e;x!==e?(y=[y,x],c=y):(o=c,c=e)}else o=c,c=e;return c!==e?(y=a.charAt(o),ge.test(y)?o++:(y=e,m===0&&v(A)),y===e&&(y=null),c=[c,y],l=c):(o=l,l=e),l!==e?r=a.substring(r,o):r=l,m--,r===e&&(l=e,m===0&&v(We)),r}function ms(){var r,l,c;for(m++,r=o,l=[],c=a.charAt(o),z.test(c)?o++:(c=e,m===0&&v(I));c!==e;)l.push(c),l.length>=2?c=e:(c=a.charAt(o),z.test(c)?o++:(c=e,m===0&&v(I)));return l.length<1?(o=r,r=e):r=l,m--,r===e&&(l=e,m===0&&v(ce)),r}function St(){var r,l,c,y,x;if(m++,r=o,U(),a.charCodeAt(o)===36?(l=C,o++):(l=e,m===0&&v(ke)),l!==e){if(c=o,y=[],x=a.charAt(o),pe.test(x)?o++:(x=e,m===0&&v(te)),x!==e)for(;x!==e;)y.push(x),x=a.charAt(o),pe.test(x)?o++:(x=e,m===0&&v(te));else y=e;y!==e?c=a.substring(c,o):c=y,c!==e?r=ns(c):(o=r,r=e)}else o=r,r=e;return m--,r===e&&m===0&&v(W),r}function Ze(){var r;return r=_s(),r===e&&(r=bs()),r}function _s(){var r,l,c,y,x;if(m++,r=o,a.charCodeAt(o)===123?(l=$,o++):(l=e,m===0&&v(Kt)),l!==e){for(c=o,y=[],x=a.charAt(o),de.test(x)?o++:(x=e,m===0&&v(pt));x!==e;)y.push(x),x=a.charAt(o),de.test(x)?o++:(x=e,m===0&&v(pt));c=a.substring(c,o),a.charCodeAt(o)===125?(y=D,o++):(y=e,m===0&&v(Ft)),y!==e?r=rs(c):(o=r,r=e)}else o=r,r=e;return m--,r===e&&(l=e,m===0&&v(Rt)),r}function bs(){var r,l,c,y,x;if(m++,r=o,a.charCodeAt(o)===59?(l=Q,o++):(l=e,m===0&&v(Ut)),l!==e){for(c=o,y=[],x=a.charAt(o),J.test(x)?o++:(x=e,m===0&&v(gt));x!==e;)y.push(x),x=a.charAt(o),J.test(x)?o++:(x=e,m===0&&v(gt));c=a.substring(c,o),r=is(c)}else o=r,r=e;return m--,r===e&&(l=e,m===0&&v(Dt)),r}function kt(){var r,l,c,y;return m++,r=o,U(),a.charCodeAt(o)===40?(l=Y,o++):(l=e,m===0&&v(jt)),l!==e?(c=yt(),c!==e?(U(),a.charCodeAt(o)===41?(y=T,o++):(y=e,m===0&&v(Qt)),y!==e?r=os(c):(o=r,r=e)):(o=r,r=e)):(o=r,r=e),m--,r===e&&m===0&&v(Bt),r}function vs(){var r,l,c;return m++,r=o,a.substr(o,3)===ie?(l=ie,o+=3):(l=e,m===0&&v(zt)),l===e&&(a.substr(o,3)===O?(l=O,o+=3):(l=e,m===0&&v(Gt)),l===e&&(a.substr(o,7)===N?(l=N,o+=7):(l=e,m===0&&v(Wt)),l===e&&(a.charCodeAt(o)===42?(l=Z,o++):(l=e,m===0&&v(Vt))))),l!==e?(U(),c=Ze(),c===e&&(c=null),r=as(l,c)):(o=r,r=e),m--,r===e&&(l=e,m===0&&v(Ht)),r}function U(){var r,l;for(m++,r=[],l=a.charAt(o),ee.test(l)?o++:(l=e,m===0&&v(dt));l!==e;)r.push(l),l=a.charAt(o),ee.test(l)?o++:(l=e,m===0&&v(dt));return m--,l=e,m===0&&v(Yt),r}if(we=i(),t.peg$library)return{peg$result:we,peg$currPos:o,peg$FAILED:e,peg$maxFailExpected:Re,peg$maxFailPos:G};if(we!==e&&o===a.length)return we;throw we!==e&&o<a.length&&v(ls()),cs(Re,G<a.length?a.charAt(G):null,G<a.length?_t(G,G+1):_t(G,G))}var Ue=0xffffffffffffffffn;function tt(a,t){return(a<<t|a>>64n-t)&0xffffffffffffffffn}function Pt(a,t){return a*t&Ue}function $s(a){return function(){let t=BigInt(a&Ue),e=BigInt(a>>64n&Ue),s=Pt(tt(Pt(t,5n),7n),9n);return e^=t,t=(tt(t,24n)^e^e<<16n)&Ue,e=tt(e,37n),a=e<<64n|t,s}}var je=$s(0xa187eb39cdcaed8f31c4b365b102e01en),As=Array.from({length:2},()=>Array.from({length:6},()=>Array.from({length:128},()=>je()))),Ps=Array.from({length:8},()=>je()),Ns=Array.from({length:16},()=>je()),st=je(),F="w",j="b",q="p",at="n",Be="b",Ae="r",re="q",M="k",nt="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",_e=class{color;from;to;piece;captured;promotion;flags;san;lan;before;after;constructor(t,e){let{color:s,piece:n,from:i,to:h,flags:f,captured:u,promotion:d}=e,_=R(i),w=R(h);this.color=s,this.piece=n,this.from=_,this.to=w,this.san=t._moveToSan(e,t._moves({legal:!0})),this.lan=_+w,this.before=t.fen(),t._makeMove(e),this.after=t.fen(),t._undoMove(),this.flags="";for(let g in k)k[g]&f&&(this.flags+=fe[g]);u&&(this.captured=u),d&&(this.promotion=d,this.lan+=d)}isCapture(){return this.flags.indexOf(fe.CAPTURE)>-1}isPromotion(){return this.flags.indexOf(fe.PROMOTION)>-1}isEnPassant(){return this.flags.indexOf(fe.EP_CAPTURE)>-1}isKingsideCastle(){return this.flags.indexOf(fe.KSIDE_CASTLE)>-1}isQueensideCastle(){return this.flags.indexOf(fe.QSIDE_CASTLE)>-1}isBigPawn(){return this.flags.indexOf(fe.BIG_PAWN)>-1}},K=-1,fe={NORMAL:"n",CAPTURE:"c",BIG_PAWN:"b",EP_CAPTURE:"e",PROMOTION:"p",KSIDE_CASTLE:"k",QSIDE_CASTLE:"q",NULL_MOVE:"-"};var k={NORMAL:1,CAPTURE:2,BIG_PAWN:4,EP_CAPTURE:8,PROMOTION:16,KSIDE_CASTLE:32,QSIDE_CASTLE:64,NULL_MOVE:128},lt={Event:"?",Site:"?",Date:"????.??.??",Round:"?",White:"?",Black:"?",Result:"*"},Ts={WhiteTitle:null,BlackTitle:null,WhiteElo:null,BlackElo:null,WhiteUSCF:null,BlackUSCF:null,WhiteNA:null,BlackNA:null,WhiteType:null,BlackType:null,EventDate:null,EventSponsor:null,Section:null,Stage:null,Board:null,Opening:null,Variation:null,SubVariation:null,ECO:null,NIC:null,Time:null,UTCTime:null,UTCDate:null,TimeControl:null,SetUp:null,FEN:null,Termination:null,Annotator:null,Mode:null,PlyCount:null},qs={...lt,...Ts},S={a8:0,b8:1,c8:2,d8:3,e8:4,f8:5,g8:6,h8:7,a7:16,b7:17,c7:18,d7:19,e7:20,f7:21,g7:22,h7:23,a6:32,b6:33,c6:34,d6:35,e6:36,f6:37,g6:38,h6:39,a5:48,b5:49,c5:50,d5:51,e5:52,f5:53,g5:54,h5:55,a4:64,b4:65,c4:66,d4:67,e4:68,f4:69,g4:70,h4:71,a3:80,b3:81,c3:82,d3:83,e3:84,f3:85,g3:86,h3:87,a2:96,b2:97,c2:98,d2:99,e2:100,f2:101,g2:102,h2:103,a1:112,b1:113,c1:114,d1:115,e1:116,f1:117,g1:118,h1:119},rt={b:[16,32,17,15],w:[-16,-32,-17,-15]},Nt={n:[-18,-33,-31,-14,18,33,31,14],b:[-17,-15,17,15],r:[-16,1,16,-1],q:[-17,-16,-15,1,17,16,15,-1],k:[-17,-16,-15,1,17,16,15,-1]},Os=[20,0,0,0,0,0,0,24,0,0,0,0,0,0,20,0,0,20,0,0,0,0,0,24,0,0,0,0,0,20,0,0,0,0,20,0,0,0,0,24,0,0,0,0,20,0,0,0,0,0,0,20,0,0,0,24,0,0,0,20,0,0,0,0,0,0,0,0,20,0,0,24,0,0,20,0,0,0,0,0,0,0,0,0,0,20,2,24,2,20,0,0,0,0,0,0,0,0,0,0,0,2,53,56,53,2,0,0,0,0,0,0,24,24,24,24,24,24,56,0,56,24,24,24,24,24,24,0,0,0,0,0,0,2,53,56,53,2,0,0,0,0,0,0,0,0,0,0,0,20,2,24,2,20,0,0,0,0,0,0,0,0,0,0,20,0,0,24,0,0,20,0,0,0,0,0,0,0,0,20,0,0,0,24,0,0,0,20,0,0,0,0,0,0,20,0,0,0,0,24,0,0,0,0,20,0,0,0,0,20,0,0,0,0,0,24,0,0,0,0,0,20,0,0,20,0,0,0,0,0,0,24,0,0,0,0,0,0,20],Ms=[17,0,0,0,0,0,0,16,0,0,0,0,0,0,15,0,0,17,0,0,0,0,0,16,0,0,0,0,0,15,0,0,0,0,17,0,0,0,0,16,0,0,0,0,15,0,0,0,0,0,0,17,0,0,0,16,0,0,0,15,0,0,0,0,0,0,0,0,17,0,0,16,0,0,15,0,0,0,0,0,0,0,0,0,0,17,0,16,0,15,0,0,0,0,0,0,0,0,0,0,0,0,17,16,15,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,-15,-16,-17,0,0,0,0,0,0,0,0,0,0,0,0,-15,0,-16,0,-17,0,0,0,0,0,0,0,0,0,0,-15,0,0,-16,0,0,-17,0,0,0,0,0,0,0,0,-15,0,0,0,-16,0,0,0,-17,0,0,0,0,0,0,-15,0,0,0,0,-16,0,0,0,0,-17,0,0,0,0,-15,0,0,0,0,0,-16,0,0,0,0,0,-17,0,0,-15,0,0,0,0,0,0,-16,0,0,0,0,0,0,-17],Is={p:1,n:2,b:4,r:8,q:16,k:32},Ls="pnbrqkPNBRQK",Tt=[at,Be,Ae,re],Rs=7,Ks=6,Fs=1,Ds=0,De={[M]:k.KSIDE_CASTLE,[re]:k.QSIDE_CASTLE},se={w:[{square:S.a1,flag:k.QSIDE_CASTLE},{square:S.h1,flag:k.KSIDE_CASTLE}],b:[{square:S.a8,flag:k.QSIDE_CASTLE},{square:S.h8,flag:k.KSIDE_CASTLE}]},Us={b:Fs,w:Ks},it="--";function ue(a){return a>>4}function Pe(a){return a&15}function Ot(a){return"0123456789".indexOf(a)!==-1}function R(a){let t=Pe(a),e=ue(a);return"abcdefgh".substring(t,t+1)+"87654321".substring(e,e+1)}function $e(a){return a===F?j:F}function Bs(a){let t=a.split(/\s+/);if(t.length!==6)return{ok:!1,error:"Invalid FEN: must contain six space-delimited fields"};let e=parseInt(t[5],10);if(isNaN(e)||e<=0)return{ok:!1,error:"Invalid FEN: move number must be a positive integer"};let s=parseInt(t[4],10);if(isNaN(s)||s<0)return{ok:!1,error:"Invalid FEN: half move counter number must be a non-negative integer"};if(!/^(-|[abcdefgh][36])$/.test(t[3]))return{ok:!1,error:"Invalid FEN: en-passant square is invalid"};if(/[^kKqQ-]/.test(t[2]))return{ok:!1,error:"Invalid FEN: castling availability is invalid"};if(!/^(w|b)$/.test(t[1]))return{ok:!1,error:"Invalid FEN: side-to-move is invalid"};let n=t[0].split("/");if(n.length!==8)return{ok:!1,error:"Invalid FEN: piece data does not contain 8 '/'-delimited rows"};for(let h=0;h<n.length;h++){let f=0,u=!1;for(let d=0;d<n[h].length;d++)if(Ot(n[h][d])){if(u)return{ok:!1,error:"Invalid FEN: piece data is invalid (consecutive number)"};f+=parseInt(n[h][d],10),u=!0}else{if(!/^[prnbqkPRNBQK]$/.test(n[h][d]))return{ok:!1,error:"Invalid FEN: piece data is invalid (invalid piece)"};f+=1,u=!1}if(f!==8)return{ok:!1,error:"Invalid FEN: piece data is invalid (too many squares in rank)"}}if(t[3][1]=="3"&&t[1]=="w"||t[3][1]=="6"&&t[1]=="b")return{ok:!1,error:"Invalid FEN: illegal en-passant square"};let i=[{color:"white",regex:/K/g},{color:"black",regex:/k/g}];for(let{color:h,regex:f}of i){if(!f.test(t[0]))return{ok:!1,error:`Invalid FEN: missing ${h} king`};if((t[0].match(f)||[]).length>1)return{ok:!1,error:`Invalid FEN: too many ${h} kings`}}return Array.from(n[0]+n[7]).some(h=>h.toUpperCase()==="P")?{ok:!1,error:"Invalid FEN: some pawns are on the edge rows"}:{ok:!0}}function js(a,t){let e=a.from,s=a.to,n=a.piece,i=0,h=0,f=0;for(let u=0,d=t.length;u<d;u++){let _=t[u].from,w=t[u].to,g=t[u].piece;n===g&&e!==_&&s===w&&(i++,ue(e)===ue(_)&&h++,Pe(e)===Pe(_)&&f++)}return i>0?h>0&&f>0?R(e):f>0?R(e).charAt(1):R(e).charAt(0):""}function ne(a,t,e,s,n,i=void 0,h=k.NORMAL){let f=ue(s);if(n===q&&(f===Rs||f===Ds))for(let u=0;u<Tt.length;u++){let d=Tt[u];a.push({color:t,from:e,to:s,piece:n,captured:i,promotion:d,flags:h|k.PROMOTION})}else a.push({color:t,from:e,to:s,piece:n,captured:i,flags:h})}function qt(a){let t=a.charAt(0);return t>="a"&&t<="h"?a.match(/[a-h]\d.*[a-h]\d/)?void 0:q:(t=t.toLowerCase(),t==="o"?M:t)}function ot(a){return a.replace(/=/,"").replace(/[+#]?[?!]*$/,"")}var ve=class{_board=new Array(128);_turn=F;_header={};_kings={w:K,b:K};_epSquare=-1;_halfMoves=0;_moveNumber=0;_history=[];_comments={};_castling={w:0,b:0};_hash=0n;_positionCount=new Map;constructor(t=nt,{skipValidation:e=!1}={}){this.load(t,{skipValidation:e})}clear({preserveHeaders:t=!1}={}){this._board=new Array(128),this._kings={w:K,b:K},this._turn=F,this._castling={w:0,b:0},this._epSquare=K,this._halfMoves=0,this._moveNumber=1,this._history=[],this._comments={},this._header=t?this._header:{...qs},this._hash=this._computeHash(),this._positionCount=new Map,this._header.SetUp=null,this._header.FEN=null}load(t,{skipValidation:e=!1,preserveHeaders:s=!1}={}){let n=t.split(/\s+/);if(n.length>=2&&n.length<6){let f=["-","-","0","1"];t=n.concat(f.slice(-(6-n.length))).join(" ")}if(n=t.split(/\s+/),!e){let{ok:f,error:u}=Bs(t);if(!f)throw new Error(u)}let i=n[0],h=0;this.clear({preserveHeaders:s});for(let f=0;f<i.length;f++){let u=i.charAt(f);if(u==="/")h+=8;else if(Ot(u))h+=parseInt(u,10);else{let d=u<"a"?F:j;this._put({type:u.toLowerCase(),color:d},R(h)),h++}}this._turn=n[1],n[2].indexOf("K")>-1&&(this._castling.w|=k.KSIDE_CASTLE),n[2].indexOf("Q")>-1&&(this._castling.w|=k.QSIDE_CASTLE),n[2].indexOf("k")>-1&&(this._castling.b|=k.KSIDE_CASTLE),n[2].indexOf("q")>-1&&(this._castling.b|=k.QSIDE_CASTLE),this._epSquare=n[3]==="-"?K:S[n[3]],this._halfMoves=parseInt(n[4],10),this._moveNumber=parseInt(n[5],10),this._hash=this._computeHash(),this._updateSetup(t),this._incPositionCount()}fen({forceEnpassantSquare:t=!1}={}){let e=0,s="";for(let h=S.a8;h<=S.h1;h++){if(this._board[h]){e>0&&(s+=e,e=0);let{color:f,type:u}=this._board[h];s+=f===F?u.toUpperCase():u.toLowerCase()}else e++;h+1&136&&(e>0&&(s+=e),h!==S.h1&&(s+="/"),e=0,h+=8)}let n="";this._castling[F]&k.KSIDE_CASTLE&&(n+="K"),this._castling[F]&k.QSIDE_CASTLE&&(n+="Q"),this._castling[j]&k.KSIDE_CASTLE&&(n+="k"),this._castling[j]&k.QSIDE_CASTLE&&(n+="q"),n=n||"-";let i="-";if(this._epSquare!==K)if(t)i=R(this._epSquare);else{let h=this._epSquare+(this._turn===F?16:-16),f=[h+1,h-1];for(let u of f){if(u&136)continue;let d=this._turn;if(this._board[u]?.color===d&&this._board[u]?.type===q){this._makeMove({color:d,from:u,to:this._epSquare,piece:q,captured:q,flags:k.EP_CAPTURE});let _=!this._isKingAttacked(d);if(this._undoMove(),_){i=R(this._epSquare);break}}}}return[s,this._turn,n,i,this._halfMoves,this._moveNumber].join(" ")}_pieceKey(t){if(!this._board[t])return 0n;let{color:e,type:s}=this._board[t],n={w:0,b:1}[e],i={p:0,n:1,b:2,r:3,q:4,k:5}[s];return As[n][i][t]}_epKey(){return this._epSquare===K?0n:Ps[this._epSquare&7]}_castlingKey(){let t=this._castling.w>>5|this._castling.b>>3;return Ns[t]}_computeHash(){let t=0n;for(let e=S.a8;e<=S.h1;e++){if(e&136){e+=7;continue}this._board[e]&&(t^=this._pieceKey(e))}return t^=this._epKey(),t^=this._castlingKey(),this._turn==="b"&&(t^=st),t}_updateSetup(t){this._history.length>0||(t!==nt?(this._header.SetUp="1",this._header.FEN=t):(this._header.SetUp=null,this._header.FEN=null))}reset(){this.load(nt)}get(t){return this._board[S[t]]}findPiece(t){let e=[];for(let s=S.a8;s<=S.h1;s++){if(s&136){s+=7;continue}!this._board[s]||this._board[s]?.color!==t.color||this._board[s].color===t.color&&this._board[s].type===t.type&&e.push(R(s))}return e}put({type:t,color:e},s){return this._put({type:t,color:e},s)?(this._updateCastlingRights(),this._updateEnPassantSquare(),this._updateSetup(this.fen()),!0):!1}_set(t,e){this._hash^=this._pieceKey(t),this._board[t]=e,this._hash^=this._pieceKey(t)}_put({type:t,color:e},s){if(Ls.indexOf(t.toLowerCase())===-1||!(s in S))return!1;let n=S[s];if(t==M&&!(this._kings[e]==K||this._kings[e]==n))return!1;let i=this._board[n];return i&&i.type===M&&(this._kings[i.color]=K),this._set(n,{type:t,color:e}),t===M&&(this._kings[e]=n),!0}_clear(t){this._hash^=this._pieceKey(t),delete this._board[t]}remove(t){let e=this.get(t);return this._clear(S[t]),e&&e.type===M&&(this._kings[e.color]=K),this._updateCastlingRights(),this._updateEnPassantSquare(),this._updateSetup(this.fen()),e}_updateCastlingRights(){this._hash^=this._castlingKey();let t=this._board[S.e1]?.type===M&&this._board[S.e1]?.color===F,e=this._board[S.e8]?.type===M&&this._board[S.e8]?.color===j;(!t||this._board[S.a1]?.type!==Ae||this._board[S.a1]?.color!==F)&&(this._castling.w&=-65),(!t||this._board[S.h1]?.type!==Ae||this._board[S.h1]?.color!==F)&&(this._castling.w&=-33),(!e||this._board[S.a8]?.type!==Ae||this._board[S.a8]?.color!==j)&&(this._castling.b&=-65),(!e||this._board[S.h8]?.type!==Ae||this._board[S.h8]?.color!==j)&&(this._castling.b&=-33),this._hash^=this._castlingKey()}_updateEnPassantSquare(){if(this._epSquare===K)return;let t=this._epSquare+(this._turn===F?-16:16),e=this._epSquare+(this._turn===F?16:-16),s=[e+1,e-1];if(this._board[t]!==null||this._board[this._epSquare]!==null||this._board[e]?.color!==$e(this._turn)||this._board[e]?.type!==q){this._hash^=this._epKey(),this._epSquare=K;return}let n=i=>!(i&136)&&this._board[i]?.color===this._turn&&this._board[i]?.type===q;s.some(n)||(this._hash^=this._epKey(),this._epSquare=K)}_attacked(t,e,s){let n=[];for(let i=S.a8;i<=S.h1;i++){if(i&136){i+=7;continue}if(this._board[i]===void 0||this._board[i].color!==t)continue;let h=this._board[i],f=i-e;if(f===0)continue;let u=f+119;if(Os[u]&Is[h.type]){if(h.type===q){if(f>0&&h.color===F||f<=0&&h.color===j)if(s)n.push(R(i));else return!0;continue}if(h.type==="n"||h.type==="k")if(s){n.push(R(i));continue}else return!0;let d=Ms[u],_=i+d,w=!1;for(;_!==e;){if(this._board[_]!=null){w=!0;break}_+=d}if(!w)if(s){n.push(R(i));continue}else return!0}}return s?n:!1}attackers(t,e){return e?this._attacked(e,S[t],!0):this._attacked(this._turn,S[t],!0)}_isKingAttacked(t){let e=this._kings[t];return e===-1?!1:this._attacked($e(t),e)}hash(){return this._hash.toString(16)}isAttacked(t,e){return this._attacked(e,S[t])}isCheck(){return this._isKingAttacked(this._turn)}inCheck(){return this.isCheck()}isCheckmate(){return this.isCheck()&&this._moves().length===0}isStalemate(){return!this.isCheck()&&this._moves().length===0}isInsufficientMaterial(){let t={b:0,n:0,r:0,q:0,k:0,p:0},e=[],s=0,n=0;for(let i=S.a8;i<=S.h1;i++){if(n=(n+1)%2,i&136){i+=7;continue}let h=this._board[i];h&&(t[h.type]=h.type in t?t[h.type]+1:1,h.type===Be&&e.push(n),s++)}if(s===2)return!0;if(s===3&&(t[Be]===1||t[at]===1))return!0;if(s===t[Be]+2){let i=0,h=e.length;for(let f=0;f<h;f++)i+=e[f];if(i===0||i===h)return!0}return!1}isThreefoldRepetition(){return this._getPositionCount(this._hash)>=3}isDrawByFiftyMoves(){return this._halfMoves>=100}isDraw(){return this.isDrawByFiftyMoves()||this.isStalemate()||this.isInsufficientMaterial()||this.isThreefoldRepetition()}isGameOver(){return this.isCheckmate()||this.isDraw()}moves({verbose:t=!1,square:e=void 0,piece:s=void 0}={}){let n=this._moves({square:e,piece:s});return t?n.map(i=>new _e(this,i)):n.map(i=>this._moveToSan(i,n))}_moves({legal:t=!0,piece:e=void 0,square:s=void 0}={}){let n=s?s.toLowerCase():void 0,i=e?.toLowerCase(),h=[],f=this._turn,u=$e(f),d=S.a8,_=S.h1,w=!1;if(n)if(n in S)d=_=S[n],w=!0;else return[];for(let p=d;p<=_;p++){if(p&136){p+=7;continue}if(!this._board[p]||this._board[p].color===u)continue;let{type:C}=this._board[p],$;if(C===q){if(i&&i!==C)continue;$=p+rt[f][0],this._board[$]||(ne(h,f,p,$,q),$=p+rt[f][1],Us[f]===ue(p)&&!this._board[$]&&ne(h,f,p,$,q,void 0,k.BIG_PAWN));for(let D=2;D<4;D++)$=p+rt[f][D],!($&136)&&(this._board[$]?.color===u?ne(h,f,p,$,q,this._board[$].type,k.CAPTURE):$===this._epSquare&&ne(h,f,p,$,q,q,k.EP_CAPTURE))}else{if(i&&i!==C)continue;for(let D=0,Q=Nt[C].length;D<Q;D++){let Y=Nt[C][D];for($=p;$+=Y,!($&136);){if(!this._board[$])ne(h,f,p,$,C);else{if(this._board[$].color===f)break;ne(h,f,p,$,C,this._board[$].type,k.CAPTURE);break}if(C===at||C===M)break}}}}if((i===void 0||i===M)&&(!w||_===this._kings[f])){if(this._castling[f]&k.KSIDE_CASTLE){let p=this._kings[f],C=p+2;!this._board[p+1]&&!this._board[C]&&!this._attacked(u,this._kings[f])&&!this._attacked(u,p+1)&&!this._attacked(u,C)&&ne(h,f,this._kings[f],C,M,void 0,k.KSIDE_CASTLE)}if(this._castling[f]&k.QSIDE_CASTLE){let p=this._kings[f],C=p-2;!this._board[p-1]&&!this._board[p-2]&&!this._board[p-3]&&!this._attacked(u,this._kings[f])&&!this._attacked(u,p-1)&&!this._attacked(u,C)&&ne(h,f,this._kings[f],C,M,void 0,k.QSIDE_CASTLE)}}if(!t||this._kings[f]===-1)return h;let g=[];for(let p=0,C=h.length;p<C;p++)this._makeMove(h[p]),this._isKingAttacked(f)||g.push(h[p]),this._undoMove();return g}move(t,{strict:e=!1}={}){let s=null;if(typeof t=="string")s=this._moveFromSan(t,e);else if(t===null)s=this._moveFromSan(it,e);else if(typeof t=="object"){let i=this._moves();for(let h=0,f=i.length;h<f;h++)if(t.from===R(i[h].from)&&t.to===R(i[h].to)&&(!("promotion"in i[h])||t.promotion===i[h].promotion)){s=i[h];break}}if(!s)throw typeof t=="string"?new Error(`Invalid move: ${t}`):new Error(`Invalid move: ${JSON.stringify(t)}`);if(this.isCheck()&&s.flags&k.NULL_MOVE)throw new Error("Null move not allowed when in check");let n=new _e(this,s);return this._makeMove(s),this._incPositionCount(),n}_push(t){this._history.push({move:t,kings:{b:this._kings.b,w:this._kings.w},turn:this._turn,castling:{b:this._castling.b,w:this._castling.w},epSquare:this._epSquare,halfMoves:this._halfMoves,moveNumber:this._moveNumber})}_movePiece(t,e){this._hash^=this._pieceKey(t),this._board[e]=this._board[t],delete this._board[t],this._hash^=this._pieceKey(e)}_makeMove(t){let e=this._turn,s=$e(e);if(this._push(t),t.flags&k.NULL_MOVE){e===j&&this._moveNumber++,this._halfMoves++,this._turn=s,this._epSquare=K;return}if(this._hash^=this._epKey(),this._hash^=this._castlingKey(),t.captured&&(this._hash^=this._pieceKey(t.to)),this._movePiece(t.from,t.to),t.flags&k.EP_CAPTURE&&(this._turn===j?this._clear(t.to-16):this._clear(t.to+16)),t.promotion&&(this._clear(t.to),this._set(t.to,{type:t.promotion,color:e})),this._board[t.to].type===M){if(this._kings[e]=t.to,t.flags&k.KSIDE_CASTLE){let n=t.to-1,i=t.to+1;this._movePiece(i,n)}else if(t.flags&k.QSIDE_CASTLE){let n=t.to+1,i=t.to-2;this._movePiece(i,n)}this._castling[e]=0}if(this._castling[e]){for(let n=0,i=se[e].length;n<i;n++)if(t.from===se[e][n].square&&this._castling[e]&se[e][n].flag){this._castling[e]^=se[e][n].flag;break}}if(this._castling[s]){for(let n=0,i=se[s].length;n<i;n++)if(t.to===se[s][n].square&&this._castling[s]&se[s][n].flag){this._castling[s]^=se[s][n].flag;break}}if(this._hash^=this._castlingKey(),t.flags&k.BIG_PAWN){let n;e===j?n=t.to-16:n=t.to+16,!(t.to-1&136)&&this._board[t.to-1]?.type===q&&this._board[t.to-1]?.color===s||!(t.to+1&136)&&this._board[t.to+1]?.type===q&&this._board[t.to+1]?.color===s?(this._epSquare=n,this._hash^=this._epKey()):this._epSquare=K}else this._epSquare=K;t.piece===q?this._halfMoves=0:t.flags&(k.CAPTURE|k.EP_CAPTURE)?this._halfMoves=0:this._halfMoves++,e===j&&this._moveNumber++,this._turn=s,this._hash^=st}undo(){let t=this._hash,e=this._undoMove();if(e){let s=new _e(this,e);return this._decPositionCount(t),s}return null}_undoMove(){let t=this._history.pop();if(t===void 0)return null;this._hash^=this._epKey(),this._hash^=this._castlingKey();let e=t.move;this._kings=t.kings,this._turn=t.turn,this._castling=t.castling,this._epSquare=t.epSquare,this._halfMoves=t.halfMoves,this._moveNumber=t.moveNumber,this._hash^=this._epKey(),this._hash^=this._castlingKey(),this._hash^=st;let s=this._turn,n=$e(s);if(e.flags&k.NULL_MOVE)return e;if(this._movePiece(e.to,e.from),e.piece&&(this._clear(e.from),this._set(e.from,{type:e.piece,color:s})),e.captured)if(e.flags&k.EP_CAPTURE){let i;s===j?i=e.to-16:i=e.to+16,this._set(i,{type:q,color:n})}else this._set(e.to,{type:e.captured,color:n});if(e.flags&(k.KSIDE_CASTLE|k.QSIDE_CASTLE)){let i,h;e.flags&k.KSIDE_CASTLE?(i=e.to+1,h=e.to-1):(i=e.to-2,h=e.to+1),this._movePiece(h,i)}return e}pgn({newline:t=`
`,maxWidth:e=0}={}){let s=[],n=!1;for(let g in this._header)this._header[g]&&s.push(`[${g} "${this._header[g]}"]`+t),n=!0;n&&this._history.length&&s.push(t);let i=g=>{let p=this._comments[this.fen()];if(typeof p<"u"){let C=g.length>0?" ":"";g=`${g}${C}{${p}}`}return g},h=[];for(;this._history.length>0;)h.push(this._undoMove());let f=[],u="";for(h.length===0&&f.push(i(""));h.length>0;){u=i(u);let g=h.pop();if(!g)break;if(!this._history.length&&g.color==="b"){let p=`${this._moveNumber}. ...`;u=u?`${u} ${p}`:p}else g.color==="w"&&(u.length&&f.push(u),u=this._moveNumber+".");u=u+" "+this._moveToSan(g,this._moves({legal:!0})),this._makeMove(g)}if(u.length&&f.push(i(u)),f.push(this._header.Result||"*"),e===0)return s.join("")+f.join(" ");let d=function(){return s.length>0&&s[s.length-1]===" "?(s.pop(),!0):!1},_=function(g,p){for(let C of p.split(" "))if(C){if(g+C.length>e){for(;d();)g--;s.push(t),g=0}s.push(C),g+=C.length,s.push(" "),g++}return d()&&g--,g},w=0;for(let g=0;g<f.length;g++){if(w+f[g].length>e&&f[g].includes("{")){w=_(w,f[g]);continue}w+f[g].length>e&&g!==0?(s[s.length-1]===" "&&s.pop(),s.push(t),w=0):g!==0&&(s.push(" "),w++),s.push(f[g]),w+=f[g].length}return s.join("")}header(...t){for(let e=0;e<t.length;e+=2)typeof t[e]=="string"&&typeof t[e+1]=="string"&&(this._header[t[e]]=t[e+1]);return this._header}setHeader(t,e){return this._header[t]=e??lt[t]??null,this.getHeaders()}removeHeader(t){return t in this._header?(this._header[t]=lt[t]||null,!0):!1}getHeaders(){let t={};for(let[e,s]of Object.entries(this._header))s!==null&&(t[e]=s);return t}loadPgn(t,{strict:e=!1,newlineChar:s=`\r?
`}={}){s!==`\r?
`&&(t=t.replace(new RegExp(s,"g"),`
`));let n=Es(t);this.reset();let i=n.headers,h="";for(let d in i)d.toLowerCase()==="fen"&&(h=i[d]),this.header(d,i[d]);if(!e)h&&this.load(h,{preserveHeaders:!0});else if(i.SetUp==="1"){if(!("FEN"in i))throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");this.load(i.FEN,{preserveHeaders:!0})}let f=n.root;for(;f;){if(f.move){let d=this._moveFromSan(f.move,e);if(d==null)throw new Error(`Invalid move in PGN: ${f.move}`);this._makeMove(d),this._incPositionCount()}f.comment!==void 0&&(this._comments[this.fen()]=f.comment),f=f.variations[0]}let u=n.result;u&&Object.keys(this._header).length&&this._header.Result!==u&&this.setHeader("Result",u)}_moveToSan(t,e){let s="";if(t.flags&k.KSIDE_CASTLE)s="O-O";else if(t.flags&k.QSIDE_CASTLE)s="O-O-O";else{if(t.flags&k.NULL_MOVE)return it;if(t.piece!==q){let n=js(t,e);s+=t.piece.toUpperCase()+n}t.flags&(k.CAPTURE|k.EP_CAPTURE)&&(t.piece===q&&(s+=R(t.from)[0]),s+="x"),s+=R(t.to),t.promotion&&(s+="="+t.promotion.toUpperCase())}return this._makeMove(t),this.isCheck()&&(this.isCheckmate()?s+="#":s+="+"),this._undoMove(),s}_moveFromSan(t,e=!1){let s=ot(t);if(e||(s==="0-0"?s="O-O":s==="0-0-0"&&(s="O-O-O")),s==it)return{color:this._turn,from:0,to:0,piece:"k",flags:k.NULL_MOVE};let n=qt(s),i=this._moves({legal:!0,piece:n});for(let g=0,p=i.length;g<p;g++)if(s===ot(this._moveToSan(i[g],i)))return i[g];if(e)return null;let h,f,u,d,_,w=!1;if(f=s.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/),f?(h=f[1],u=f[2],d=f[3],_=f[4],u.length==1&&(w=!0)):(f=s.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/),f&&(h=f[1],u=f[2],d=f[3],_=f[4],u.length==1&&(w=!0))),n=qt(s),i=this._moves({legal:!0,piece:h||n}),!d)return null;for(let g=0,p=i.length;g<p;g++)if(u){if((!h||h.toLowerCase()==i[g].piece)&&S[u]==i[g].from&&S[d]==i[g].to&&(!_||_.toLowerCase()==i[g].promotion))return i[g];if(w){let C=R(i[g].from);if((!h||h.toLowerCase()==i[g].piece)&&S[d]==i[g].to&&(u==C[0]||u==C[1])&&(!_||_.toLowerCase()==i[g].promotion))return i[g]}}else if(s===ot(this._moveToSan(i[g],i)).replace("x",""))return i[g];return null}ascii(){let t=`   +------------------------+
`;for(let e=S.a8;e<=S.h1;e++){if(Pe(e)===0&&(t+=" "+"87654321"[ue(e)]+" |"),this._board[e]){let s=this._board[e].type,i=this._board[e].color===F?s.toUpperCase():s.toLowerCase();t+=" "+i+" "}else t+=" . ";e+1&136&&(t+=`|
`,e+=8)}return t+=`   +------------------------+
`,t+="     a  b  c  d  e  f  g  h",t}perft(t){let e=this._moves({legal:!1}),s=0,n=this._turn;for(let i=0,h=e.length;i<h;i++)this._makeMove(e[i]),this._isKingAttacked(n)||(t-1>0?s+=this.perft(t-1):s++),this._undoMove();return s}setTurn(t){return this._turn==t?!1:(this.move("--"),!0)}turn(){return this._turn}board(){let t=[],e=[];for(let s=S.a8;s<=S.h1;s++)this._board[s]==null?e.push(null):e.push({square:R(s),type:this._board[s].type,color:this._board[s].color}),s+1&136&&(t.push(e),e=[],s+=8);return t}squareColor(t){if(t in S){let e=S[t];return(ue(e)+Pe(e))%2===0?"light":"dark"}return null}history({verbose:t=!1}={}){let e=[],s=[];for(;this._history.length>0;)e.push(this._undoMove());for(;;){let n=e.pop();if(!n)break;t?s.push(new _e(this,n)):s.push(this._moveToSan(n,this._moves())),this._makeMove(n)}return s}_getPositionCount(t){return this._positionCount.get(t)??0}_incPositionCount(){this._positionCount.set(this._hash,(this._positionCount.get(this._hash)??0)+1)}_decPositionCount(t){let e=this._positionCount.get(t)??0;e===1?this._positionCount.delete(t):this._positionCount.set(t,e-1)}_pruneComments(){let t=[],e={},s=n=>{n in this._comments&&(e[n]=this._comments[n])};for(;this._history.length>0;)t.push(this._undoMove());for(s(this.fen());;){let n=t.pop();if(!n)break;this._makeMove(n),s(this.fen())}this._comments=e}getComment(){return this._comments[this.fen()]}setComment(t){this._comments[this.fen()]=t.replace("{","[").replace("}","]")}deleteComment(){return this.removeComment()}removeComment(){let t=this._comments[this.fen()];return delete this._comments[this.fen()],t}getComments(){return this._pruneComments(),Object.keys(this._comments).map(t=>({fen:t,comment:this._comments[t]}))}deleteComments(){return this.removeComments()}removeComments(){return this._pruneComments(),Object.keys(this._comments).map(t=>{let e=this._comments[t];return delete this._comments[t],{fen:t,comment:e}})}setCastlingRights(t,e){for(let n of[M,re])e[n]!==void 0&&(e[n]?this._castling[t]|=De[n]:this._castling[t]&=~De[n]);this._updateCastlingRights();let s=this.getCastlingRights(t);return(e[M]===void 0||e[M]===s[M])&&(e[re]===void 0||e[re]===s[re])}getCastlingRights(t){return{[M]:(this._castling[t]&De[M])!==0,[re]:(this._castling[t]&De[re])!==0}}moveNumber(){return this._moveNumber}};var ct={k:"\u265A",q:"\u265B",r:"\u265C",b:"\u265D",n:"\u265E",p:"\u265F"};function Mt(a){return ct[a]??""}function It(a){let t=a.turn(),e=a.isCheckmate(),s=a.isStalemate(),n=a.isDraw(),i=a.isGameOver(),h=null;return e?h=t==="b"?"white":"black":i&&(s||n)&&(h="draw"),{turn:t,inCheck:a.isCheck(),checkmate:e,stalemate:s,draw:n,gameOver:i,resultText:h}}var X=Ce(Fe()),ht=["a","b","c","d","e","f","g","h"];function ft({board:a,orientation:t,selected:e,targets:s,lastMove:n,checkSquare:i,disabled:h,onSquareTap:f}){let u=new Map;for(let p of a)for(let C of p)C&&u.set(C.square,{type:C.type,color:C.color});let d=new Map;for(let p of s)d.set(p.to,p.capture);let _=t==="w"?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8],w=t==="w"?ht:[...ht].reverse(),g=[];return _.forEach((p,C)=>{w.forEach(($,D)=>{let Q=`${$}${p}`,T=(ht.indexOf($)+(p-1))%2===0;g.push({square:Q,piece:u.get(Q),dark:T,showRank:D===0,showFile:C===_.length-1,rankLabel:String(p),fileLabel:$})})}),(0,X.jsx)("div",{className:"chess-board-wrap",children:(0,X.jsx)("div",{className:"chess-board",role:"grid","aria-label":"Chess board",children:g.map(p=>{let C=e===p.square,$=n!==null&&(n.from===p.square||n.to===p.square),D=i===p.square,Q=d.get(p.square),Y=["chess-square",p.dark?"sq-dark":"sq-light",C?"sq-selected":"",$?"sq-lastmove":"",D?"sq-check":"",Q===!0?"sq-capture":""].filter(Boolean).join(" "),T=p.piece?ct[p.piece.type]:null;return(0,X.jsxs)("button",{type:"button",role:"gridcell","aria-label":p.square,className:Y,disabled:h,onClick:()=>f(p.square),children:[p.showRank&&(0,X.jsx)("span",{className:"chess-coord coord-rank",children:p.rankLabel}),p.showFile&&(0,X.jsx)("span",{className:"chess-coord coord-file",children:p.fileLabel}),T&&(0,X.jsx)("span",{className:`chess-piece piece-${p.piece?.color}`,children:T}),d.has(p.square)&&Q!==!0&&(0,X.jsx)("span",{className:"chess-dot"})]},p.square)})})})}var Qs=`/* Chess game styles \u2014 mobile-first, touch-friendly. */

/* \u{1F4A1} Hints toggle: shows/hides the suggested moves for the selected piece. */
.chess-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 2px 2px 8px;
}

.chess-hint-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 6px 4px;
  font-size: 0.9rem;
  font-weight: 600;
  color: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  min-height: 44px;
}

.chess-hint-toggle .toggle-pill {
  width: 44px;
  height: 25px;
  border-radius: 999px;
  background: #b9c2cc;
  position: relative;
  transition: background 0.2s ease;
  flex: none;
}

.chess-hint-toggle .toggle-pill::after {
  content: '';
  position: absolute;
  top: 2.5px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: left 0.2s ease;
}

.chess-hint-toggle.on .toggle-pill {
  background: #2f9e44;
}

.chess-hint-toggle.on .toggle-pill::after {
  left: 21px;
}

.chess-setup {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.chess-setup label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

.chess-setup input {
  font-size: 1rem;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border, #ccc);
  background: var(--surface);
  color: inherit;
  min-height: 48px;
}

.chess-mode-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chess-mode-row > * {
  flex: 1 1 auto;
}

.chess-mp-note {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.85;
}

/* ---- Board ---- */

.chess-board-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.chess-board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  width: min(100%, 480px);
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.chess-square {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  cursor: pointer;
  container-type: inline-size;
  font-family: inherit;
}

.chess-square.sq-light {
  background-color: #f0d9b5;
}

.chess-square.sq-dark {
  background-color: #b58863;
}

.chess-square.sq-selected {
  box-shadow: inset 0 0 0 4px #2f9e44;
}

.chess-square.sq-lastmove {
  box-shadow: inset 0 0 0 999px rgba(205, 230, 90, 0.45);
}

.chess-square.sq-selected.sq-lastmove {
  box-shadow:
    inset 0 0 0 999px rgba(205, 230, 90, 0.45),
    inset 0 0 0 4px #2f9e44;
}

.chess-square.sq-check {
  box-shadow: inset 0 0 0 999px rgba(255, 70, 70, 0.55);
}

/* One shared glyph set for both colors \u2014 only the color treatment differs,
   so white and black pieces are always the same size and shape. */
.chess-piece {
  /* Fallback, then exactly ~70% of the square via container query units. */
  font-size: 34px;
  font-size: 70cqi;
  line-height: 1;
  pointer-events: none;
  transition: transform 0.18s ease;
}

/* White pieces: bright fill with a crisp dark outline + soft depth shadow. */
.chess-piece.piece-w {
  color: #fdfdfd;
  -webkit-text-stroke: 0.055em #243044;
  text-shadow:
    0 1px 1px rgba(20, 28, 44, 0.55),
    0 3px 5px rgba(20, 28, 44, 0.35);
}

/* Black pieces: deep fill with a hairline light edge so they stay crisp on
   dark squares. Same glyph metrics as white \u2014 color is the only difference. */
.chess-piece.piece-b {
  color: #141a26;
  -webkit-text-stroke: 0.045em rgba(240, 244, 250, 0.5);
  text-shadow:
    0 1px 1px rgba(0, 0, 0, 0.5),
    0 3px 6px rgba(0, 0, 0, 0.45);
}

/* A selected piece lifts slightly off the square \u2014 modern tactile feel. */
.chess-square.sq-selected .chess-piece {
  transform: scale(1.14);
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35));
}

.chess-coord {
  position: absolute;
  font-size: 10px;
  font-weight: 700;
  opacity: 0.65;
  pointer-events: none;
  line-height: 1;
}

.chess-coord.coord-rank {
  top: 3px;
  left: 4px;
}

.chess-coord.coord-file {
  bottom: 3px;
  right: 4px;
}

.sq-light .chess-coord {
  color: #b58863;
}

.sq-dark .chess-coord {
  color: #f0d9b5;
}

.chess-dot {
  position: absolute;
  width: 26%;
  height: 26%;
  border-radius: 50%;
  background: rgba(20, 60, 20, 0.35);
  pointer-events: none;
}

.chess-square.sq-capture {
  box-shadow: inset 0 0 0 4px rgba(200, 30, 30, 0.75);
}

.chess-square.sq-capture.sq-selected {
  box-shadow:
    inset 0 0 0 4px rgba(200, 30, 30, 0.75),
    inset 0 0 0 8px #2f9e44;
}

/* ---- Side panel ---- */

.chess-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.chess-turn {
  font-size: 1.05rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chess-turn .turn-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #888;
  flex: none;
}

.chess-turn .turn-dot.w {
  background: #fff;
}

.chess-turn .turn-dot.b {
  background: #222;
}

.chess-check-badge {
  background: #d6336c;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
}

.chess-result-banner {
  font-size: 1.15rem;
  font-weight: 800;
  text-align: center;
  padding: 10px;
  border-radius: 10px;
  background: rgba(47, 158, 68, 0.15);
  border: 1px solid #2f9e44;
}

.chess-captured {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
}

.chess-captured-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.chess-captured-row .cap-label {
  font-weight: 600;
  opacity: 0.75;
  min-width: 52px;
}

.chess-captured-row .cap-pieces {
  font-size: 1.35rem;
  line-height: 1;
  letter-spacing: 1px;
}

.cap-pieces .cap-glyph-w {
  color: #fdfdfd;
  -webkit-text-stroke: 0.06em #243044;
  text-shadow:
    0 1px 1px rgba(20, 28, 44, 0.55),
    0 2px 4px rgba(20, 28, 44, 0.3);
}

.cap-pieces .cap-glyph-b {
  color: #141a26;
  -webkit-text-stroke: 0.05em rgba(240, 244, 250, 0.5);
  text-shadow:
    0 1px 1px rgba(0, 0, 0, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.chess-moves {
  font-size: 0.9rem;
}

.chess-moves .moves-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.chess-move-list {
  max-height: 120px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 8px 10px;
  line-height: 1.7;
  -webkit-overflow-scrolling: touch;
}

.chess-move-list .move-num {
  opacity: 0.55;
  margin-right: 2px;
}

.chess-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chess-controls > * {
  flex: 1 1 0;
  min-width: 0;
}

/* ---- Promotion modal ---- */

.chess-promo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 8px 0;
}

.chess-promo-btn {
  font-size: 2.6rem;
  line-height: 1.2;
  padding: 10px 0;
  border-radius: 12px;
  border: 2px solid var(--border, #ccc);
  background: var(--input-bg, #fff);
  cursor: pointer;
  min-height: 64px;
  touch-action: manipulation;
}

.chess-promo-btn:active {
  transform: scale(0.94);
}

/* Promotion choices reuse the board piece styling at dialog size. */
.chess-promo-btn .chess-piece {
  font-size: 2.6rem;
  transform: none;
}
`,Lt=document.createElement("style");Lt.textContent=Qs;document.head.appendChild(Lt);var E=Ce(Fe());function dn(){return{fen:new ve().fen(),moves:[],resignedSeat:null}}var Hs=["q","r","b","n"],zs={p:8,n:2,b:2,r:2,q:1,k:1},Gs=["q","r","b","n","p"];function ut(a,t){return Mt(t)}function Ws(a,t){let e=a;for(let[s,n]of Object.entries(t))e=e.split(`{${s}}`).join(String(n));return e}function Vs({code:a,onFinish:t,onExit:e}){return Xe(a)?(0,E.jsx)(Ys,{code:a,onFinish:t,onExit:e}):null}function Ys({code:a,onFinish:t,onExit:e}){let{t:s}=wt(),n=Xe(a);if(!n)return null;let i=$t(n),[h,f]=(0,B.useState)(null),[u,d]=(0,B.useState)(null),[_,w]=(0,B.useState)(!1),[g,p]=(0,B.useState)(!1),[C,$]=(0,B.useState)(()=>{try{return localStorage.getItem("chess-hints")!=="off"}catch{return!0}}),D=()=>{$(b=>{try{localStorage.setItem("chess-hints",b?"off":"on")}catch{}return!b})},Q=(0,B.useRef)(!1),Y=(0,B.useRef)(null),T=i.state,ie=T?.fen??null,O=(0,B.useMemo)(()=>{if(!ie)return null;try{return new ve(ie)}catch{return new ve}},[ie]),N=O?It(O):null,Z=n.seat,oe=Z===0?"w":"b",Ne=i.players.find(b=>b.seat===0),pe=i.players.find(b=>b.seat===1),ae=Ne?.name??s("chess.player1"),le=pe?.name??s("chess.player2"),ge=T?.resignedSeat??null,z=ge!==null||N!==null&&N.gameOver,de=ge!==null?ge===0?1:0:N?.resultText==="white"?0:N?.resultText==="black"?1:null,J=de===0?ae:de===1?le:null,ee=!z&&N!==null&&(N.turn==="w"&&Z===0||N.turn==="b"&&Z===1);(0,B.useEffect)(()=>{f(null),d(null)},[ie]),(0,B.useEffect)(()=>{let b=Y.current;b&&(b.scrollTop=b.scrollHeight)},[T?.moves.length]);let Qe=(b,A)=>A.stalemate?s("chess.stalemate"):b.isInsufficientMaterial()?s("chess.insufficient"):b.isThreefoldRepetition()?s("chess.threefold"):b.isDrawByFiftyMoves()?s("chess.fiftyMove"):s("chess.draw");if((0,B.useEffect)(()=>{if(!z||!O||!N||!T||Q.current)return;Q.current=!0,Ee("win");let b=ge!==null?s("chess.resign"):N.checkmate?s("chess.checkmate"):Qe(O,N);i.isHost&&i.endGame({winnerSeat:de}),t({title:J?s("chess.youWin").replace("{name}",J):s("chess.gameDraw"),...J?{winner:J}:{},lines:[{label:s("chess.result"),value:b},{label:s("chess.moves"),value:String(T.moves.length)}]})},[z,O,N,T,t,i.isHost,s]),i.status==="lobby"||!T||!O||!N)return(0,E.jsx)(At,{room:i,onExit:e});let Te=b=>O.moves({square:b,verbose:!0}).map(A=>({to:A.to,capture:A.flags.includes("c")||A.flags.includes("e")})),ye=async(b,A,ce)=>{if(!(!ee||g))try{let I=O.move({from:b,to:A,promotion:ce});Ee("move"),f(null),p(!0),await i.postState({fen:O.fen(),moves:[...T.moves,I.san],resignedSeat:null})}catch{f(null)}finally{p(!1)}},He=b=>{if(!ee||g||u)return;if(h&&b!==h&&Te(h).find(I=>I.to===b)){let I=O.get(h),W=b[1];if(I?.type==="p"&&(I.color==="w"&&W==="8"||I.color==="b"&&W==="1")&&I){Ee("click"),d({from:h,to:b,color:I.color});return}ye(h,b);return}if(b===h){f(null);return}let A=O.get(b);A&&A.color===O.turn()&&A.color===oe?(Ee("click"),f(b)):f(null)},ze=b=>{let A=u;d(null),A&&ye(A.from,A.to,b)},xe=async()=>{w(!1),!(z||g)&&(p(!0),await i.postState({fen:T.fen,moves:T.moves,resignedSeat:Z}),p(!1))},qe=b=>{let A={p:0,n:0,b:0,r:0,q:0,k:0};for(let I of O.board())for(let W of I)W&&W.color!==b&&(A[W.type]+=1);let ce=[];for(let I of Gs){let W=zs[I]-A[I];for(let ke=0;ke<W;ke++)ce.push(I)}return ce},Oe=()=>{if(!N.inCheck)return null;for(let b of O.board())for(let A of b)if(A&&A.type==="k"&&A.color===N.turn)return A.square;return null},Me=O.history({verbose:!0}),te=Me[Me.length-1],Ge=te?{from:te.from,to:te.to}:null,Se=[];for(let b=0;b<T.moves.length;b+=2)Se.push({num:b/2+1,white:T.moves[b]??"",black:T.moves[b+1]});let We=qe("w"),Ve=qe("b"),Ie=N.turn==="w"?ae:le,Ye=Z===0?ae:le,Le=J?s("chess.youWin").replace("{name}",J):s("chess.gameDraw");return(0,E.jsxs)("div",{className:"chess-game",children:[(0,E.jsxs)("div",{className:`mp-turn-banner${ee?" mine":""}`,children:[z?Le:ee?`\u265F\uFE0F ${s("mp.yourTurn")}`:Ws(s("mp.waitingForTurn"),{name:Ie}),!i.connected&&(0,E.jsxs)("span",{children:[" \xB7 ",s("mp.reconnecting")]})]}),(0,E.jsx)("div",{className:"chess-toolbar",children:(0,E.jsxs)("button",{type:"button",className:`chess-hint-toggle${C?" on":""}`,onClick:D,"aria-pressed":C,children:[(0,E.jsx)("span",{className:"toggle-pill","aria-hidden":"true"}),s(C?"chess.hintsOn":"chess.hintsOff")]})}),(0,E.jsx)(ft,{board:O.board(),orientation:oe,selected:h,targets:C&&h?Te(h):[],lastMove:Ge,checkSquare:Oe(),disabled:!ee||g||z,onSquareTap:He}),(0,E.jsxs)("div",{className:"chess-panel",children:[z?(0,E.jsx)("div",{className:"chess-result-banner",children:Le}):(0,E.jsxs)("div",{className:"chess-turn",children:[(0,E.jsx)("span",{className:`turn-dot ${N.turn}`}),(0,E.jsxs)("span",{children:[N.turn==="w"?s("chess.whiteToMove"):s("chess.blackToMove")," \u2014 ",Ie,N.turn===oe&&` (${s("mp.you")})`]}),N.inCheck&&(0,E.jsx)("span",{className:"chess-check-badge",children:s("chess.check")})]}),(0,E.jsxs)("div",{className:"chess-captured",children:[(0,E.jsx)("div",{className:"moves-title",children:s("chess.captured")}),(0,E.jsxs)("div",{className:"chess-captured-row",children:[(0,E.jsxs)("span",{className:"cap-label",children:["\u2654 ",ae,Z===0?` (${s("mp.you")})`:""]}),(0,E.jsx)("span",{className:"cap-pieces",children:We.map((b,A)=>(0,E.jsx)("span",{className:"cap-glyph-b",children:ut("b",b)},`w${A}`))})]}),(0,E.jsxs)("div",{className:"chess-captured-row",children:[(0,E.jsxs)("span",{className:"cap-label",children:["\u265A ",le,Z===1?` (${s("mp.you")})`:""]}),(0,E.jsx)("span",{className:"cap-pieces",children:Ve.map((b,A)=>(0,E.jsx)("span",{className:"cap-glyph-w",children:ut("w",b)},`b${A}`))})]})]}),(0,E.jsxs)("div",{className:"chess-moves",children:[(0,E.jsx)("div",{className:"moves-title",children:s("chess.moves")}),(0,E.jsx)("div",{className:"chess-move-list",ref:Y,children:Se.map(b=>(0,E.jsxs)("span",{children:[(0,E.jsxs)("span",{className:"move-num",children:[b.num,"."]})," ",b.white,b.black?` ${b.black} `:" "]},b.num))})]}),(0,E.jsxs)("div",{className:"chess-controls",children:[(0,E.jsx)(Je,{variant:"danger",size:"sm",disabled:z||g,onClick:()=>w(!0),children:s("chess.resign")}),(0,E.jsx)(Je,{variant:"ghost",size:"sm",onClick:e,children:s("mp.leave")})]})]}),(0,E.jsxs)(Ct,{open:u!==null,onClose:()=>d(null),title:s("chess.promotion"),children:[(0,E.jsx)("p",{children:s("chess.choosePromotion")}),(0,E.jsx)("div",{className:"chess-promo-grid",children:Hs.map(b=>(0,E.jsx)("button",{type:"button",className:"chess-promo-btn",onClick:()=>ze(b),"aria-label":b,children:u&&(0,E.jsx)("span",{className:`chess-piece piece-${u.color}`,children:ut(u.color,b)})},b))})]}),(0,E.jsx)(Et,{open:_,title:s("chess.resign"),message:s("chess.confirmResign").replace("{name}",Ye),confirmLabel:s("chess.resign"),cancelLabel:s("chess.cancel"),onConfirm:()=>void xe(),onCancel:()=>w(!1),danger:!0})]})}export{ve as a,Mt as b,It as c,ft as d,dn as e,Vs as f};
/*! Bundled license information:

chess.js/dist/esm/chess.js:
  (**
   * @license
   * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice,
   *    this list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the documentation
   *    and/or other materials provided with the distribution.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   * POSSIBILITY OF SUCH DAMAGE.
   *)
*/
